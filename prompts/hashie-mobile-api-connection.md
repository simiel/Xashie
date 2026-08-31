# Connect Hashie mobile chat to the API

## Goal

Replace the mobile `streamMockResponse` path with the existing Hashie API boundary. Keep provider credentials and provider-specific behavior out of the Expo bundle.

## Inspected files

- `hashie-mobile/src/hooks/use-hashie-chat.ts`
- `hashie-mobile/src/lib/chat-state.ts`
- `hashie-mobile/src/lib/chat-storage.ts`
- `hashie-mobile/src/auth/auth-context.tsx`
- `hashie-mobile/src/app/(tabs)/chat.tsx`
- `hashie-api/src/modules/conversations/routes.ts`
- `hashie-api/src/modules/feedback/routes.ts`
- `HASHIE_LLM_GATEWAY.md`

## Decisions and assumptions

- Use Clerk's short-lived `getToken()` result as the only mobile bearer credential.
- Call only the Hashie API URL (`EXPO_PUBLIC_HASHIE_API_URL`); never call the LLM gateway from mobile.
- Use the API's SSE event contract (`message.started`, `message.delta`, `message.completed`, `message.error`) and parse `Response.body` incrementally for Expo/React Native.
- Restore the most recently updated server conversation for account sessions. Preserve a bounded local cache as an offline/read-only fallback.
- Persist drafts locally with SecureStore; do not queue unsent health content for automatic transmission.
- Guest mode remains local until the API provides a reviewed guest-token contract.
- A new conversation creates a new server conversation because the current API has no delete-conversation endpoint.
- Map helpful/not-helpful to API ratings 5/1.

## Safety and privacy

- Handle 401 as an expired Clerk session and route through the existing session-expired flow.
- Do not log request bodies, tokens, transcripts, medical content, or provider errors.
- Preserve server safety escalation text and expose it as a completed assistant message, not as a generic network error.
- Cancel streams with `AbortController`; do not retry an explicitly cancelled request.
- Retry only bounded transient request failures, and never retry malformed requests or safety decisions.

## Acceptance criteria

- No production hook imports or calls `streamMockResponse`.
- Account chat sends `language` and `ageGroup` to `/v1/conversations/:id/messages` with a Clerk bearer token.
- SSE deltas append exactly once; completion stores the server message ID.
- Conversation restoration uses server messages and falls back to local cache when unavailable.
- Draft text survives app restarts and is cleared only after a message is accepted for sending.
- Timeout, disconnection, safety escalation, and expired-session states are distinguishable and retryable where appropriate.
- Feedback is sent to `/v1/messages/:messageId/feedback` after the user selects a rating.
- Mobile configuration contains only a public API URL and Clerk publishable key; no provider credential is added.

## Verification

- Run mobile lint, typecheck, and Vitest.
- Run API typecheck, lint, tests, and build because the client consumes its live contract.
- Manually verify an authenticated stream, cancellation, session expiry, offline draft restoration, server restoration, and feedback request without retaining sensitive artifacts.
