# Backend agent gateway and streamed text support

## Goal

Add a server-owned, English-first Hashie text agent using the Hashie LLM Gateway through Vercel AI SDK. The backend will stream responses, ground appropriate answers in the reviewed Supabase knowledge library, keep gateway credentials private, and refresh the gateway token safely. This phase does not change the mobile client, create a production deployment, or implement voice.

## Skills and references

- `ai-sdk` — use the AI SDK only after installing its current package and reading the installed version's documentation.
- `supabase:supabase` and `supabase:supabase-postgres-best-practices` — preserve the existing server-only retrieval boundary and vector schema.
- `openai-developers:agents` — apply a server-owned, bounded agent design and safe streaming practices.
- Gateway documentation supplied by the user: `https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/#auth`.

## Inspected project context

- `apps/backend/src/app.ts` owns authenticated HTTP routes and consistently returns request IDs and `no-store` responses.
- `apps/backend/src/server.ts` currently buffers every `Response`, so it must be adjusted to preserve a streamed response body.
- `apps/backend/src/knowledge.ts` provides bounded semantic retrieval from the reviewed Supabase knowledge base. It uses `OPENAI_API_KEY` exclusively for embeddings.
- `apps/backend/package.json` has no AI SDK dependency yet.
- The backend local environment has only server-side gateway variables: `MEDGEMMA_ACCESS_KEY`, `MEDGEMMA_REFRESH_KEY`, and `MEDGEMMA_BASE_URL`. Their values will never be read into source, logs, tests, or user-facing output.

## Gateway facts verified from its documentation

- It is OpenAI-compatible at `<base-url>/v1`; chat is `POST /v1/chat/completions` and token streaming is OpenAI-style SSE.
- `MEDGEMMA_ACCESS_KEY` is a short-lived bearer JWT (14 days by default). `POST /auth/refresh` accepts `refresh_token` and returns a new access and refresh pair.
- Refresh tokens rotate and are single-use. Reusing one can revoke the whole refresh chain.
- The available routes/models are `hashie-medgemma` for English (`eng`) and Swahili (`swa`), and `hashie-sunflower` for Akan (`akh`), Luganda (`lug`), and Amharic (`amh`). Omitted language is English; other values produce 422.
- `country: "Ghana"` enables the gateway's Ghana localization when the request has no system message. Every request is persisted by the gateway, including when `store` is supplied; guest copies are PII-scrubbed only after the model receives the original input.

## Implementation decisions

1. Add the current `ai` package and the smallest official AI SDK OpenAI-compatible provider dependency required by the installed AI SDK version. Use a custom `fetch` wrapper so authorization always comes from the token manager and is never visible to clients.
2. Implement an `GatewayTokenManager` with an injected clock/fetcher and one in-process refresh lock. Refresh before expiry using a conservative skew. It will atomically persist the new token pair to a server-only local secret file supplied by configuration, with restrictive permissions; failure to persist means the new refresh token is not used for a subsequent request. The initial `.env.local` tokens remain the bootstrap fallback only. Document the production requirement to replace this file adapter with a managed, encrypted, single-writer secret store before horizontally scaling.
3. Add an `AgentService` that accepts one bounded current user message plus a short bounded client-supplied history. It will retrieve up to a small number of reviewed knowledge matches, build a server-controlled English safety/system instruction, and call the gateway with `language: "eng"`, `country: "Ghana"`, streaming enabled, and explicit conservative generation limits.
4. The system instruction will identify Hashie as educational support rather than a doctor; avoid diagnosis, prescriptions, certainty, and crisis/emergency substitution; encourage qualified care where appropriate; and distinguish retrieved reviewed material from model wording. It will never ask the gateway to manage the user account or perform external actions.
5. Add `POST /v1/agent/stream`. It requires a valid guest or Clerk actor, validates a small JSON request, applies per-actor and per-IP rate limits, and relays AI SDK text using an explicit streaming protocol with `no-store`, `x-request-id`, and no gateway credential/conversation headers. Reject overly long messages/history and unsafe request shapes before retrieval or model calls.
6. Do not send the gateway's `conversation_id`, do not expose or use the gateway's persisted conversation APIs, and do not persist user prompts or replies in Hashie during this phase. This avoids creating a second uncontrolled history system while mobile conversation persistence and retention policy are still unapproved.
7. Preserve the existing OpenAI embedding integration: it is used only to embed the request for retrieval, never for model generation.
8. Add focused unit tests for request validation, retrieval-context construction, refresh rotation and concurrent refresh serialization, response/error mapping, and the streamed route. Add a smoke script that is opt-in and sends only synthetic non-sensitive probes.

## Language investigation and controlled gateway checks

After implementation, query `GET /v1/models` and run the opt-in smoke script with tiny, non-sensitive educational probes. Verify status, selected response model, basic non-empty output, and streamed completion for:

- English (`eng`) — supported now and the only application language enabled in this phase.
- Akan (`akh`) — supported by the gateway but **not enabled in the product** until a Ghanaian-language quality and safety review is complete.
- Swahili (`swa`), Luganda (`lug`), and Amharic (`amh`) — supported by the gateway but out of Hashie's initial Ghanaian scope; report availability and basic routing only.
- An unsupported language code — verify the expected 422 validation behavior without retrying.

The smoke script will never include real health history, user identifiers, credentials, or knowledge-base source content. It will use the configured gateway credentials only for those authorized probes.

## Files expected to change

- `apps/backend/package.json` and lockfile — AI SDK dependencies and scripts.
- `apps/backend/src/gateway-token-manager.ts` — server-only rotating-token integration.
- `apps/backend/src/agent.ts` and `apps/backend/src/agent-validation.ts` — agent orchestration, retrieval grounding, safety bounds, and testable validation.
- `apps/backend/src/app.ts` and `apps/backend/src/server.ts` — authenticated streaming route and non-buffering Node response relay.
- `apps/backend/test/*.test.mjs` — unit and route coverage.
- `apps/backend/scripts/smoke-gateway-languages.mjs` — explicit synthetic-only integration check.
- `apps/backend/.env.example` and `apps/backend/README.md` — server-only configuration, rotation behavior, operational limitation, API contract, and manual checks.

## Security and privacy requirements

- No gateway, OpenAI, Supabase, Clerk, access, refresh, or session credential may appear in source, committed files, logs, API responses, exceptions, test fixtures, or client bundles.
- Only the backend contacts the gateway. The mobile client receives only Hashie's streamed API response.
- Avoid logging prompt, response, retrieved answer, token, gateway conversation ID, or raw upstream error body. Log only safe operational metadata such as request ID, HTTP class, and model/language identifier when needed.
- Maintain no-store caching headers; do not reveal whether a token refresh has occurred.
- Treat the in-process refresh lock plus local secret file as suitable only for one backend instance. Do not mark it production-ready for multiple instances.

## Acceptance criteria

- A valid guest or Clerk request can receive a token-by-token English response from `POST /v1/agent/stream` through the backend.
- The request is grounded using the reviewed knowledge service when relevant, but the knowledge source is never modified.
- Malformed, oversized, unauthorized, rate-limited, and unavailable-provider requests yield safe, non-sensitive errors with request IDs.
- The gateway access token is sent only in backend `Authorization` headers and refresh rotation retains the new pair exactly once under concurrent callers.
- OpenAI is used only by the existing embedding provider for retrieval.
- The language smoke report states what worked, selected model/routing, streaming status, and any quality/safety caveat; no other language is exposed in the application yet.

## Checks and manual verification

1. Install dependencies, then run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` in `apps/backend`.
2. Run the synthetic-only gateway smoke script against configured credentials; inspect results without printing secrets or generated text containing sensitive content.
3. Start the backend in the user's Visual Studio Code terminal, not the sandbox; verify a local authenticated guest session can open and cancel a streamed English request, and verify invalid payload/credentials/provider errors.
4. Review `git diff` for accidental secret inclusion and confirm the gateway's conversation ID is not relayed or retained.

## Explicitly out of scope

- Mobile chat UI and connection wiring.
- Voice, image, tool calling, payment, or treatment-centre actions.
- Storing Hashie chat history, gateway conversation management, deleting gateway records, or changing production infrastructure.
- Enabling Akan or other non-English interaction before a separate language-quality and safety approval.
