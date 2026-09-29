import { ValidationError } from './errors.js';

export type AgentHistoryMessage = { role: 'user' | 'assistant'; content: string };
export type AgentRequest = { message: string; history: AgentHistoryMessage[] };

const maxMessageLength = 1_200;
const maxHistoryMessages = 8;
const maxHistoryCharacters = 4_800;

export function parseAgentRequest(input: unknown): AgentRequest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new ValidationError('Agent request must be an object.');
  const value = input as Record<string, unknown>;
  const message = parseText(value.message, 'Message');
  const history = value.history === undefined ? [] : parseHistory(value.history);
  return { message, history };
}

function parseHistory(input: unknown): AgentHistoryMessage[] {
  if (!Array.isArray(input)) throw new ValidationError('History must be an array.');
  const validated = input.map((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new ValidationError('Each history item must be an object.');
    const value = item as Record<string, unknown>;
    if (value.role !== 'user' && value.role !== 'assistant') throw new ValidationError('History roles must be user or assistant.');
    if (typeof value.content !== 'string') throw new ValidationError('History content must be text.');
    const content = value.content.trim();
    return { role: value.role as AgentHistoryMessage['role'], content };
  });

  const history: AgentHistoryMessage[] = [];
  let remainingCharacters = maxHistoryCharacters;
  for (let index = validated.length - 1; index >= 0 && history.length < maxHistoryMessages; index -= 1) {
    const item = validated[index];
    if (item.content.length < 2 || remainingCharacters < 2) continue;
    const content = item.content.slice(0, Math.min(maxMessageLength, remainingCharacters)).trim();
    if (content.length < 2) continue;
    history.unshift({ role: item.role, content });
    remainingCharacters -= content.length;
  }
  return history;
}

function parseText(input: unknown, label: string): string {
  if (typeof input !== 'string') throw new ValidationError(`${label} must be text.`);
  const text = input.trim();
  if (text.length < 2 || text.length > maxMessageLength) throw new ValidationError(`${label} must be 2–${maxMessageLength} characters.`);
  return text;
}
