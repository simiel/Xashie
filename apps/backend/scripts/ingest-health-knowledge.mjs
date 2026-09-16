import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, '../../..');
const libraryPath = resolve(repositoryRoot, 'apps/hashie/data/learning-library.json');
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAiKey = process.env.OPENAI_API_KEY;
const model = process.env.HASHIE_EMBEDDING_MODEL || 'text-embedding-3-small';
const dimensions = 1536;

if (!supabaseUrl || !serviceRoleKey || !openAiKey) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY must be configured server-side before ingestion.');
  process.exitCode = 1;
} else {
  await execFileAsync('node', ['scripts/generate-learning-library.mjs'], { cwd: repositoryRoot });
  const library = JSON.parse(await readFile(libraryPath, 'utf8'));
  const existing = await supabaseRequest('hashie_knowledge_documents?select=source_id,content_hash');
  if (!Array.isArray(existing)) throw new Error('Knowledge document index returned an invalid response.');
  const hashes = new Map(existing.map((row) => [row.source_id, row.content_hash]));
  const changed = library.entries.filter((entry) => hashes.get(entry.id) !== contentHash(entry));
  let embedded = 0;
  for (const entry of changed) {
    const retrievalText = `Topic: ${entry.topic}\nSubtopic: ${entry.subtopic}\nQuestion: ${entry.question}\nAnswer: ${entry.answer}`;
    const embedding = await embed(retrievalText);
    await supabaseRequest('hashie_knowledge_documents?on_conflict=source_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ source_id: entry.id, content_hash: contentHash(entry), topic: entry.topic, subtopic: entry.subtopic, question: entry.question, answer: entry.answer, retrieval_text: retrievalText, embedding, embedding_model: model, embedding_dimensions: dimensions, status: 'approved', updated_at: new Date().toISOString() }) });
    embedded += 1;
  }
  console.log(JSON.stringify({ sourceRows: library.counts.sourceRows, usableEntries: library.counts.usableEntries, skippedBlankRows: library.counts.skippedBlankRows, skippedIncompleteRows: library.counts.skippedIncompleteRows, unchanged: library.entries.length - changed.length, embedded }, null, 2));
}

function contentHash(entry) { return createHash('sha256').update(`${entry.topic}\u0000${entry.subtopic}\u0000${entry.question}\u0000${entry.answer}`).digest('hex'); }
async function supabaseRequest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error('Knowledge ingestion could not reach the configured Supabase service.');
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
async function embed(input) {
  const response = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input, dimensions, encoding_format: 'float' }) });
  if (!response.ok) throw new Error('Embedding provider did not return a usable embedding.');
  const payload = await response.json();
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== dimensions || vector.some((value) => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Embedding provider returned an invalid embedding.');
  return vector;
}
