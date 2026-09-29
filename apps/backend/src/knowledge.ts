import { StoreError, ValidationError } from './errors.js';

const embeddingDimensions = 1536;
const defaultEmbeddingModel = 'text-embedding-3-small';

// Agent generation must retrieve this small, server-owned evidence set before
// contacting the model. Keep this separate from the broader library-search
// defaults so product retrieval policy is deliberate and testable.
export const agentRetrievalPolicy = { threshold: 0.55, limit: 4 } as const;

export type KnowledgeDocument = {
  sourceId: string;
  contentHash: string;
  topic: string;
  subtopic: string;
  question: string;
  answer: string;
  retrievalText: string;
  embedding: number[];
  embeddingModel: string;
};

export type KnowledgeMatch = Pick<KnowledgeDocument, 'sourceId' | 'topic' | 'subtopic' | 'question' | 'answer'> & { similarity: number };
export interface KnowledgeStore { match(embedding: number[], threshold: number, limit: number): Promise<KnowledgeMatch[]>; }
export interface EmbeddingProvider { readonly model: string; embed(input: string): Promise<number[]>; }

export function parseKnowledgeQuery(input: unknown): { query: string; threshold: number; limit: number } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new ValidationError('Knowledge query must be an object.');
  const value = input as Record<string, unknown>;
  if (typeof value.query !== 'string' || value.query.trim().length < 2 || value.query.trim().length > 600) throw new ValidationError('Knowledge query must be 2–600 characters.');
  const thresholdValue = value.threshold === undefined ? 0.72 : value.threshold;
  const limitValue = value.limit === undefined ? 5 : value.limit;
  if (typeof thresholdValue !== 'number' || !Number.isFinite(thresholdValue) || thresholdValue < 0 || thresholdValue > 1) throw new ValidationError('Knowledge threshold must be between 0 and 1.');
  if (typeof limitValue !== 'number' || !Number.isInteger(limitValue) || limitValue < 1 || limitValue > 8) throw new ValidationError('Knowledge result limit must be 1–8.');
  return { query: value.query.trim(), threshold: thresholdValue, limit: limitValue };
}

export class KnowledgeService {
  constructor(private readonly store: KnowledgeStore, private readonly embeddings: EmbeddingProvider) {}
  async retrieve(input: unknown): Promise<KnowledgeMatch[]> {
    const { query, threshold, limit } = parseKnowledgeQuery(input);
    return this.store.match(await this.embeddings.embed(query), threshold, limit);
  }
}

type SupabaseKnowledgeConfig = { url: string; serviceRoleKey: string };
type MatchRow = { source_id: string; topic: string; subtopic: string; question: string; answer: string; similarity: number };

export class SupabaseKnowledgeStore implements KnowledgeStore {
  constructor(private readonly config: SupabaseKnowledgeConfig) {}
  async match(embedding: number[], threshold: number, limit: number): Promise<KnowledgeMatch[]> {
    assertEmbedding(embedding);
    let response: Response;
    try {
      response = await fetch(`${this.config.url.replace(/\/$/, '')}/rest/v1/rpc/hashie_match_knowledge_documents`, { method: 'POST', headers: { apikey: this.config.serviceRoleKey, Authorization: `Bearer ${this.config.serviceRoleKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_query_embedding: embedding, p_match_threshold: threshold, p_match_count: limit }) });
    } catch { throw new StoreError('unavailable', 'Knowledge retrieval is unavailable.'); }
    if (!response.ok) throw new StoreError('unavailable', 'Knowledge retrieval returned an unavailable response.');
    let rows: unknown;
    try { rows = await response.json(); } catch { throw new StoreError('unavailable', 'Knowledge retrieval returned an invalid response.'); }
    if (!Array.isArray(rows)) throw new StoreError('unavailable', 'Knowledge retrieval returned an invalid response.');
    return rows.map(toMatch);
  }
}

export class OpenAiEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  constructor(private readonly apiKey: string, model = defaultEmbeddingModel) { this.model = model; }
  async embed(input: string): Promise<number[]> {
    let response: Response;
    try { response = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: this.model, input, dimensions: embeddingDimensions, encoding_format: 'float' }) }); } catch { throw new StoreError('unavailable', 'Embedding service is unavailable.'); }
    if (!response.ok) throw new StoreError('unavailable', 'Embedding service returned an unavailable response.');
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new StoreError('unavailable', 'Embedding service returned an invalid response.'); }
    const vector = (payload as { data?: Array<{ embedding?: unknown }> })?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.some((value) => typeof value !== 'number')) throw new StoreError('unavailable', 'Embedding service returned an invalid response.');
    assertEmbedding(vector);
    return vector;
  }
}

export function createKnowledgeServiceFromEnv(env: NodeJS.ProcessEnv = process.env): KnowledgeService | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.OPENAI_API_KEY) return null;
  return new KnowledgeService(new SupabaseKnowledgeStore({ url: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY }), new OpenAiEmbeddingProvider(env.OPENAI_API_KEY, env.HASHIE_EMBEDDING_MODEL || defaultEmbeddingModel));
}

function assertEmbedding(value: number[]): void { if (value.length !== embeddingDimensions || value.some((number) => !Number.isFinite(number))) throw new StoreError('unavailable', 'Embedding dimensions are invalid.'); }
function toMatch(value: unknown): KnowledgeMatch {
  if (typeof value !== 'object' || value === null) throw new StoreError('unavailable', 'Knowledge retrieval returned an invalid response.');
  const row = value as Partial<MatchRow>;
  if (typeof row.source_id !== 'string' || typeof row.topic !== 'string' || typeof row.subtopic !== 'string' || typeof row.question !== 'string' || typeof row.answer !== 'string' || typeof row.similarity !== 'number' || !Number.isFinite(row.similarity)) throw new StoreError('unavailable', 'Knowledge retrieval returned an invalid response.');
  return { sourceId: row.source_id, topic: row.topic, subtopic: row.subtopic, question: row.question, answer: row.answer, similarity: row.similarity };
}
