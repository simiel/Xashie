# Hashie backend

This package is the server-owned API boundary for Hashie guest sessions, Clerk-authenticated actors, onboarding preferences, reviewed knowledge retrieval, and the text-only Hashie support agent. It does not act as a medical or emergency service.

## Routes

- `GET /healthz` — process health only.
- `POST /v1/guest-sessions` — creates a 24-hour guest session and returns its opaque token once.
- `GET /v1/session` — resolves the current guest, Clerk user, or signed-out state.
- `GET|PATCH|DELETE /v1/me/preferences` — reads, validates, updates, or deletes preferences owned by the current actor.
- `POST /v1/guest-sessions/upgrade` — requires both guest and Clerk credentials, explicit `{ "consent": true }`, and an `Idempotency-Key`.
- `POST /v1/agent/stream` — requires a guest or Clerk actor and returns a plain UTF-8 text stream. Accepts `{ "message": "...", "history": [{ "role": "user" | "assistant", "content": "..." }] }`; the current message is 2–1200 characters and history is restricted to eight bounded messages. The client cannot supply a system message, model, language, or gateway credential.

Use `X-Hashie-Guest-Token` for guest requests or `Authorization: Bearer <Clerk session token>` for signed-in requests. Do not send both except for the upgrade route. The API never accepts an owner id from the client.

## Configuration

Copy `.env.example` to a local environment and replace the obvious placeholders. The backend reads these variables:

- `NODE_ENV`, `PORT` — local process mode and HTTP port.
- `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`, plus optional `CLERK_PUBLISHABLE_KEY` and `CLERK_AUTHORIZED_PARTIES` — server-side Clerk request verification.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — server-only persistence access. Never put the service-role key in the mobile app.
- `HASHIE_DATA_STORE` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE` — explicit local memory-store controls.
- `OPENAI_API_KEY` and optional `HASHIE_EMBEDDING_MODEL` — server-only embeddings for reviewed knowledge ingestion and future agent retrieval. Never expose either to the mobile app.
- `MEDGEMMA_BASE_URL`, `MEDGEMMA_ACCESS_KEY`, and `MEDGEMMA_REFRESH_KEY` — server-only Hashie LLM Gateway configuration. The access JWT is sent only from the backend; refresh tokens are exchanged at the gateway's `/auth/refresh` endpoint.
- `HASHIE_GATEWAY_TOKEN_FILE` — optional path for the locally persisted rotated gateway token pair. The default is `.hashie-gateway-tokens.local.json` in the backend working directory and is gitignored with restrictive permissions. This is for one local backend process only; production needs an encrypted, managed, single-writer secret store before horizontal scaling.

The mobile app uses separate client-safe values documented in [`apps/hashie/README.md`](../hashie/README.md). Do not add Google OAuth client IDs or secrets to source or mobile env files; configure Google as a provider in the Clerk Dashboard. Keep any OpenAI key in the backend's managed server environment only.

The default data store is deliberately unavailable and returns a safe `503` until persistence is configured. For local-only development, memory storage requires both `HASHIE_DATA_STORE=memory` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE=true` while `NODE_ENV` is not `production`. It is process-local and must not be used for production or sensitive testing.

The approved Supabase schema and transactional guest-upgrade function are specified in [`supabase/migrations/20260916_hashie_auth_persistence.sql`](../../supabase/migrations/20260916_hashie_auth_persistence.sql). The reviewed knowledge-vector schema is specified in [`supabase/migrations/20260916060624_hashie_knowledge_retrieval.sql`](../../supabase/migrations/20260916060624_hashie_knowledge_retrieval.sql). The connected project must have the applicable migration applied before the configured adapter can use it. Until the live schema is applied, the adapter remains fail-closed and returns `503` rather than pretending the operation is atomic.

Run `npm run ingest:knowledge` only in a server environment after applying the knowledge migration and configuring the three server-only variables above. It regenerates the mobile library from the canonical source, then embeds only new or changed complete entries. It does not log questions, answers, credentials, or user information.

The agent uses AI SDK with the OpenAI-compatible Hashie gateway. It currently sends `language: "eng"` and a Ghana context, streams plain text, and grounds relevant answers with up to three reviewed knowledge matches. Every accepted agent request loads only the active actor's onboarding preferences on the server: nickname, age group, preferred language, and accessibility preferences. It adds an explicit guest/signed-in session label, but never sends an owner id, session id, token, email, location, or raw database record to the model. The age group controls server guidance for plain-language readability; accessibility preferences request useful text descriptions without inferring medical information. The deployed gateway returned an empty stream when supplied a custom system message, so Hashie deliberately uses the gateway's Ghana-localized default system prompt and puts its own server-controlled safety/retrieval guidance before the current user question. It does not use the gateway's conversation IDs or history endpoints, and Hashie does not yet persist chat history. The gateway documents that it records every turn, so never send credentials or avoidable identifying information in its request body. Other documented gateway languages are intentionally not exposed in the app until separate Ghanaian-language quality and safety approval.

Run `npm run smoke:gateway-languages` only against a configured non-production/test gateway credential. It uses short synthetic, non-sensitive probes and logs only status, selected model, and whether output arrived. For slow providers, `HASHIE_GATEWAY_ONLY_STREAM=true HASHIE_GATEWAY_SMOKE_TIMEOUT_MS=60000 npm run smoke:gateway-languages` isolates the English streaming check.

`npm run smoke:agent-stream` makes the equivalent synthetic check through Hashie's AI SDK adapter. It intentionally disables retrieval and does not log generated text.

## Local checks

```sh
npm install
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke:gateway-languages
npm run smoke:agent-stream
```

`npm run dev` starts the Node HTTP adapter on `PORT` (default `3000`). The in-process rate limiter is suitable for tests and local development only; production needs a managed distributed limiter and operational monitoring.

Errors are JSON, include a request id, avoid sensitive details, and are marked `no-store`. Guest tokens are random opaque values and only their SHA-256 hashes are persisted. Do not log tokens, Clerk credentials, preference contents, or health information.
