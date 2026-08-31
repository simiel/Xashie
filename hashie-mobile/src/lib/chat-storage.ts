import * as SecureStore from 'expo-secure-store';

import type { ChatMessage } from './chat-state';

const storagePrefix = 'hashie.mobile.chat.v1.owner-';
const maxMessages = 16;
const maxMessageCharacters = 1800;
const draftPrefix = 'hashie.mobile.chat-draft.v1.owner-';

function encodeOwner(owner: string) {
  return owner.split('').map(character => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
}

export function chatStorageKey(owner: string) {
  return `${storagePrefix}${encodeOwner(owner)}`;
}

export function chatDraftKey(owner: string) { return `${draftPrefix}${encodeOwner(owner)}`; }

export async function readChatDraft(owner: string) {
  try { return await SecureStore.getItemAsync(chatDraftKey(owner)) ?? ''; } catch { return ''; }
}

export async function writeChatDraft(owner: string, draft: string) {
  try {
    if (draft) await SecureStore.setItemAsync(chatDraftKey(owner), draft.slice(0, 4000));
    else await SecureStore.deleteItemAsync(chatDraftKey(owner));
  } catch { /* Draft persistence is best effort. */ }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === 'string'
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.text === 'string'
    && typeof message.createdAt === 'string'
    && ['sending', 'streaming', 'complete', 'failed', 'cancelled'].includes(message.status ?? '')
    && (message.language === 'en' || message.language === 'tw')
    && typeof message.isMock === 'boolean';
}

export function boundedMessages(messages: ChatMessage[]) {
  const completeMessages = messages
    .filter(message => message.status === 'complete' && message.text.trim().length > 0)
    .slice(-maxMessages)
    .map(message => ({ ...message, text: message.text.slice(0, maxMessageCharacters) }));
  if (completeMessages.at(-1)?.role === 'user') completeMessages.pop();
  return completeMessages;
}

export async function readChatHistory(owner: string): Promise<ChatMessage[]> {
  try {
    const raw = await SecureStore.getItemAsync(chatStorageKey(owner));
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? boundedMessages(value.filter(isChatMessage)) : [];
  } catch {
    return [];
  }
}

export async function writeChatHistory(owner: string, messages: ChatMessage[]) {
  try {
    await SecureStore.setItemAsync(chatStorageKey(owner), JSON.stringify(boundedMessages(messages)));
  } catch {
    // A storage failure should never make a sensitive chat screen unusable.
  }
}

export async function clearChatHistory(owner: string) {
  try {
    await SecureStore.deleteItemAsync(chatStorageKey(owner));
  } catch {
    // Clearing remains best effort because there is no safe UI recovery action.
  }
}
