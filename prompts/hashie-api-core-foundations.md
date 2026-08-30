# Hashie API core foundations

## Goal

Finish the production request foundations in `hashie-api`: Clerk bearer-token verification and user synchronization, verified Clerk webhooks, bounded requests and rate limiting, consistent correlation-aware errors, repositories for user-owned conversations/messages, deletion and retention behavior, feedback/audit persistence, action idempotency, and resilient provider calls.

## Decisions

- Clerk remains the only application identity system; the external gateway is never called by clients.
- Rate limiting is behind a store interface with a bounded in-process default; multi-instance deployments must replace it with a shared store.
- Account deletion hard-deletes user-owned records through database cascades and leaves only a minimal deletion audit record without the Clerk identifier.
- Retention cleanup is explicit and injectable, not hidden inside request handlers.

## Security and acceptance

Never log auth headers, cookies, bodies, transcripts, audio, provider bodies, or raw provider errors. Verify webhook signatures before parsing. Scope idempotency to Clerk user IDs, hash request bodies, expire keys, and reject payload reuse. Provider calls require timeouts, cancellation, bounded transient retries, and sanitized errors. Verify with typecheck, lint, tests, build, and a final secret/log review.
