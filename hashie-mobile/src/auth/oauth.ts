export type OAuthBrowserResult = { type?: string | null } | null | undefined;

export function resolveOAuthOutcome(createdSessionId: string | null, result: OAuthBrowserResult) {
  if (createdSessionId) return 'success' as const;
  if (result?.type === 'cancel' || result?.type === 'dismiss') return 'cancelled' as const;
  return 'failed' as const;
}
