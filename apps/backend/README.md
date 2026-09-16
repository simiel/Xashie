# Hashie backend

This package is the server-owned API boundary for Hashie guest sessions, Clerk-authenticated actors, and onboarding preferences. It does not call an AI model, accept privileged client writes, or act as a medical or emergency service.

## Routes

- `GET /healthz` — process health only.
- `POST /v1/guest-sessions` — creates a 24-hour guest session and returns its opaque token once.
- `GET /v1/session` — resolves the current guest, Clerk user, or signed-out state.
- `GET|PATCH|DELETE /v1/me/preferences` — reads, validates, updates, or deletes preferences owned by the current actor.
- `POST /v1/guest-sessions/upgrade` — requires both guest and Clerk credentials, explicit `{ "consent": true }`, and an `Idempotency-Key`.

Use `X-Hashie-Guest-Token` for guest requests or `Authorization: Bearer <Clerk session token>` for signed-in requests. Do not send both except for the upgrade route. The API never accepts an owner id from the client.

## Configuration

Copy `.env.example` to a local environment and replace the obvious placeholders. The backend reads these variables:

- `NODE_ENV`, `PORT` — local process mode and HTTP port.
- `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`, plus optional `CLERK_PUBLISHABLE_KEY` and `CLERK_AUTHORIZED_PARTIES` — server-side Clerk request verification.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — server-only persistence access. Never put the service-role key in the mobile app.
- `HASHIE_DATA_STORE` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE` — explicit local memory-store controls.
- `OPENAI_API_KEY` and optional `HASHIE_EMBEDDING_MODEL` — server-only embeddings for reviewed knowledge ingestion and future agent retrieval. Never expose either to the mobile app.

The mobile app uses separate client-safe values documented in [`apps/hashie/README.md`](../hashie/README.md). Do not add Google OAuth client IDs or secrets to source or mobile env files; configure Google as a provider in the Clerk Dashboard. Keep any OpenAI key in the backend's managed server environment only.

The default data store is deliberately unavailable and returns a safe `503` until persistence is configured. For local-only development, memory storage requires both `HASHIE_DATA_STORE=memory` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE=true` while `NODE_ENV` is not `production`. It is process-local and must not be used for production or sensitive testing.

The approved Supabase schema and transactional guest-upgrade function are specified in [`supabase/migrations/20260916_hashie_auth_persistence.sql`](../../supabase/migrations/20260916_hashie_auth_persistence.sql). The reviewed knowledge-vector schema is specified in [`supabase/migrations/20260916060624_hashie_knowledge_retrieval.sql`](../../supabase/migrations/20260916060624_hashie_knowledge_retrieval.sql). The connected project must have the applicable migration applied before the configured adapter can use it. Until the live schema is applied, the adapter remains fail-closed and returns `503` rather than pretending the operation is atomic.

Run `npm run ingest:knowledge` only in a server environment after applying the knowledge migration and configuring the three server-only variables above. It regenerates the mobile library from the canonical source, then embeds only new or changed complete entries. It does not log questions, answers, credentials, or user information.

## Local checks

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run dev` starts the Node HTTP adapter on `PORT` (default `3000`). The in-process rate limiter is suitable for tests and local development only; production needs a managed distributed limiter and operational monitoring.

Errors are JSON, include a request id, avoid sensitive details, and are marked `no-store`. Guest tokens are random opaque values and only their SHA-256 hashes are persisted. Do not log tokens, Clerk credentials, preference contents, or health information.
