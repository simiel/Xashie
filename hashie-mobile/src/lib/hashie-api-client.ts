import type { AgeGroup } from '@/auth/types';
import type { SupportedLanguage } from '@/content/copy';

const baseUrl = process.env.EXPO_PUBLIC_HASHIE_API_URL?.replace(/\/$/, '');

export class HashieApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = 'request_failed',
  ) {
    super(message);
    this.name = 'HashieApiError';
  }
}

export type ServerConversation = { id: string; userId: string; title: string | null; language: SupportedLanguage; createdAt: string; updatedAt: string };
export type ServerMessage = { id: string; conversationId: string; role: 'user' | 'assistant'; content: string; language: SupportedLanguage; safetyResult?: { decision: string; reasons: string[] } | null; createdAt: string };
export type ServerConversationDetail = ServerConversation & { messages: ServerMessage[] };
export type StreamEvent =
  | { type: 'started'; requestId?: string }
  | { type: 'delta'; text: string }
  | { type: 'completed'; messageId?: string; safety?: string; persisted?: boolean }
  | { type: 'error'; code: string; message?: string };

function assertBaseUrl() {
  if (!baseUrl) throw new HashieApiError('Hashie is not connected in this build.', 0, 'configuration');
  return baseUrl;
}

async function readError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
  return new HashieApiError(body?.error?.message ?? 'Hashie could not complete that request.', response.status, body?.error?.code ?? 'request_failed');
}

async function request<T>(path: string, token: string, init: RequestInit = {}, retries = 2): Promise<T> {
  const url = `${assertBaseUrl()}${path}`;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await readError(response);
        if (error.status === 401 || error.status === 404 || error.status < 500 || attempt === retries) throw error;
        lastError = error;
      } else {
        return await response.json() as T;
      }
    } catch (error) {
      if (error instanceof HashieApiError && error.status < 500) throw error;
      lastError = error;
      if (attempt === retries) break;
    }
    await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw lastError instanceof HashieApiError ? lastError : new HashieApiError('Hashie could not be reached. Check your connection and try again.', 0, 'network_error');
}

export const hashieApi = {
  listConversations: (token: string) => request<ServerConversation[]>('/v1/conversations', token),
  getConversation: (token: string, id: string) => request<ServerConversationDetail>(`/v1/conversations/${encodeURIComponent(id)}`, token),
  createConversation: (token: string, language: SupportedLanguage) => request<ServerConversation>('/v1/conversations', token, { method: 'POST', body: JSON.stringify({ language }) }),
  sendMessage: async (token: string, conversationId: string, content: string, language: SupportedLanguage, ageGroup: AgeGroup, options: { signal: AbortSignal; onEvent: (event: StreamEvent) => void }) => {
    const response = await fetch(`${assertBaseUrl()}/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, language, ageGroup }),
      signal: options.signal,
    });
    if (!response.ok) throw await readError(response);
    if (!response.body) throw new HashieApiError('The response stream was disconnected.', 0, 'disconnected');
    await parseSse(response.body, options.onEvent, options.signal);
  },
  sendFeedback: (token: string, messageId: string, feedback: 'helpful' | 'not_helpful') => request<{ id: string }>(`/v1/messages/${encodeURIComponent(messageId)}/feedback`, token, { method: 'POST', body: JSON.stringify({ rating: feedback === 'helpful' ? 5 : 1 }) }, 0),
};

export async function parseSse(stream: ReadableStream<Uint8Array>, onEvent: (event: StreamEvent) => void, signal?: AbortSignal) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) emitSseFrame(frame, onEvent);
    }
    buffer += decoder.decode();
    if (buffer.trim()) emitSseFrame(buffer, onEvent);
  } finally {
    reader.releaseLock();
  }
}

function emitSseFrame(frame: string, onEvent: (event: StreamEvent) => void) {
  let eventName = 'message';
  const data: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  const raw = data.join('\n');
  if (!raw || raw === '[DONE]') return;
  const payload = JSON.parse(raw) as Record<string, unknown>;
  if (eventName === 'message.started') onEvent({ type: 'started', requestId: typeof payload.requestId === 'string' ? payload.requestId : undefined });
  else if (eventName === 'message.delta' && typeof payload.text === 'string') onEvent({ type: 'delta', text: payload.text });
  else if (eventName === 'message.completed') onEvent({ type: 'completed', messageId: typeof payload.messageId === 'string' ? payload.messageId : undefined, persisted: payload.persisted === true, safety: typeof payload.safety === 'string' ? payload.safety : undefined });
  else if (eventName === 'message.error') onEvent({ type: 'error', code: typeof payload.code === 'string' ? payload.code : 'stream_error', message: typeof payload.message === 'string' ? payload.message : undefined });
}
