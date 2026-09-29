# Relax conversation-history validation

## Goal

Keep the 1,200-character maximum for a newly submitted user question, while ensuring a long prior conversation never causes a valid new question to be rejected solely because the history payload is too large.

## Inspected code

- `apps/hashie/app/(tabs)/ask.tsx` limits the composer to 1,200 characters.
- `apps/hashie/components/support-chat-provider.tsx` currently forwards the last eight completed messages verbatim.
- `apps/backend/src/agent-validation.ts` currently rejects history when any item exceeds 1,200 characters or the combined history exceeds 4,800 characters.
- `apps/backend/src/app.ts` retains a 32 KB JSON-body ceiling and rate limits.

## Decision

The incoming `message` remains strictly validated at 2–1,200 trimmed characters. History becomes optional, best-effort context rather than an acceptance condition for a valid new question.

## Implementation

1. Add a shared, deterministic client-side history compaction helper that:
   - keeps the newest useful turns first;
   - clips individual history content to the backend-safe per-item size;
   - respects the total backend-safe character budget;
   - omits older content when necessary without altering the current user question.
2. Use the helper immediately before calling the agent API, so the serialized client request always fits the supported history contract.
3. Make backend history parsing resilient: if a history item or total history is oversized, compact/skip historical context instead of returning a validation error. Malformed JSON, invalid roles, non-text content, an oversized current message, and the 32 KB request-body limit remain rejected.
4. Add focused tests covering a long assistant reply followed by a valid question, several oversized prior turns, malformed history, and preservation of the 1,200-character current-message limit.
5. Add a visible character counter to the mobile composer, warning near the limit and making the intentional query constraint understandable.

## Safety and privacy

- No new storage, logging, telemetry, model settings, or external requests.
- No increase to the new-question cap or request-body cap.
- Only context is reduced; the active user question is never silently clipped.

## Acceptance criteria

- A valid 2–1,200 character current question is sent even after an arbitrarily long conversation.
- The backend does not reject a request merely because optional history is long.
- Current-message validation still rejects fewer than 2 or more than 1,200 trimmed characters.
- The mobile UI communicates the current-question limit before submission.
- Existing short-history requests retain their order and content.

## Checks

Run the backend test suite and backend typecheck. Run the existing mobile session tests and mobile TypeScript check. Device verification is deferred until the Argent mobile environment is available and explicitly selected.
