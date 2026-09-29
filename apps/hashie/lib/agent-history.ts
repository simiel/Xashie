export type AgentHistoryRole = 'user' | 'assistant';
export type AgentHistoryItem = { role: AgentHistoryRole; content: string };

export const agentHistoryLimits = {
  maxItems: 8,
  maxItemCharacters: 1_200,
  maxTotalCharacters: 4_800,
} as const;

/**
 * Keeps recent conversation context within the API contract. The active user
 * question is intentionally not part of this helper and is never truncated.
 */
export function compactAgentHistory(items: readonly AgentHistoryItem[]): AgentHistoryItem[] {
  const compacted: AgentHistoryItem[] = [];
  let remainingCharacters = agentHistoryLimits.maxTotalCharacters;

  for (let index = items.length - 1; index >= 0 && compacted.length < agentHistoryLimits.maxItems; index -= 1) {
    const item = items[index];
    const content = item.content.trim();
    if (content.length < 2 || remainingCharacters < 2) continue;

    const allowedCharacters = Math.min(agentHistoryLimits.maxItemCharacters, remainingCharacters);
    const boundedContent = content.slice(0, allowedCharacters).trim();
    if (boundedContent.length < 2) continue;

    compacted.unshift({ role: item.role, content: boundedContent });
    remainingCharacters -= boundedContent.length;
  }

  return compacted;
}
