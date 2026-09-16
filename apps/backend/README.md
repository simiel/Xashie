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

The mobile app uses separate client-safe values documented in [`apps/hashie/README.md`](../hashie/README.md). Do not add Google OAuth client IDs or secrets to source or env files for this slice; configure Google as a provider in the Clerk Dashboard. Do not add an OpenAI key: AI operations are outside this slice.

The default data store is deliberately unavailable and returns a safe `503` until persistence is configured. For local-only development, memory storage requires both `HASHIE_DATA_STORE=memory` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE=true` while `NODE_ENV` is not `production`. It is process-local and must not be used for production or sensitive testing.

The approved Supabase schema and transactional guest-upgrade function are specified in [`supabase/migrations/20260916_hashie_auth_persistence.sql`](../../supabase/migrations/20260916_hashie_auth_persistence.sql). The connected project must have that migration applied before the configured adapter can persist guest sessions, preferences, or upgrades. Until the live schema is applied, the adapter remains fail-closed and returns `503` rather than pretending the operation is atomic.

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
