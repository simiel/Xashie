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
  if (!Array.isArray(input) || input.length > maxHistoryMessages) throw new ValidationError(`History must contain at most ${maxHistoryMessages} messages.`);
  let characters = 0;
  const history = input.map((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) throw new ValidationError('Each history item must be an object.');
    const value = item as Record<string, unknown>;
    if (value.role !== 'user' && value.role !== 'assistant') throw new ValidationError('History roles must be user or assistant.');
    const content = parseText(value.content, 'History content');
    characters += content.length;
    return { role: value.role as AgentHistoryMessage['role'], content };
  });
  if (characters > maxHistoryCharacters) throw new ValidationError(`History must not exceed ${maxHistoryCharacters} characters.`);
  return history;
}

function parseText(input: unknown, label: string): string {
  if (typeof input !== 'string') throw new ValidationError(`${label} must be text.`);
  const text = input.trim();
  if (text.length < 2 || text.length > maxMessageLength) throw new ValidationError(`${label} must be 2–${maxMessageLength} characters.`);
  return text;
}
