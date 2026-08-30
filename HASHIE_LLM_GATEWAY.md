# Hashie LLM Gateway Reference

Canonical provider reference for Hashie intelligence-layer work.

- Gateway: [Hashie LLM Gateway](https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/)
- OpenAPI: `https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/openapi.json`
- Swagger UI: `https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/docs`
- Audit date: 2026-08-30

## Status

The gateway is a FastAPI, OpenAI-compatible service. English chat and SSE streaming were verified live. Akan/Twi is documented but was not production-ready during the audit: requests with `language: "akh"` returned no bytes within a 10-second bounded request. No speech-to-text or text-to-speech routes are exposed.

Use this gateway only behind a provider-neutral `hashie-api` adapter. Do not call it directly from Expo or browser clients.

Production integration is blocked until the Clerk/authentication contract, Akan reliability and quality, provider data-retention terms, and separate speech providers are resolved.

## Text chat

OpenAI SDK base URL:

```text
https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/v1
```

Chat endpoint: `POST /v1/chat/completions`

Required fields:

```json
{
  "model": "hashie-medgemma",
  "messages": [{"role": "user", "content": "..."}]
}
```

Gateway fields:

- `language`: `eng | swa | lug | akh | amh`; defaults to `eng`.
- `country`: `Uganda | Kenya | Ghana | Ethiopia`; optional localization field.
- `store`: persist registered-user turns when `true`.
- `conversation_id`: append to an existing stored conversation.
- `stream`: return SSE chunks when `true`.
- `temperature`, `max_tokens`: forwarded sampling controls.

Unknown OpenAI fields such as `top_p`, `tools`, and `response_format` are accepted and forwarded according to the published contract. Structured output and tool calling were not certified and must not be used in production without dedicated tests.

Important behavior:

- `language` selects the model and is stripped before the upstream call.
- `language` overrides the supplied `model`; `model` is still required.
- If no leading `system` message is supplied, the gateway injects its own Hashie sexual/reproductive-health system prompt and may localize it using `country`.
- If a leading `system` message is supplied, `country` is ignored for prompting. This conflicts with Hashie's need for its own safety, age, accessibility, and cultural policy prompt.
- The request-history API is stateless unless the client sends the full `messages` history or uses `store:true` and `conversation_id`.

Non-streaming responses follow the OpenAI shape:

```json
{
  "object": "chat.completion",
  "model": "hashie-medgemma",
  "choices": [{
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

Successful chat responses include an `X-Conversation-Id` response header. Live English responses also included `system_fingerprint: vllm-0.23.0-5fda5239`; treat it as diagnostic metadata only.

### Streaming

`stream:true` was verified live. The response is `text/event-stream` with `chat.completion.chunk` objects followed by `data: [DONE]`. The adapter must parse incrementally, append non-null `choices[0].delta.content`, handle role-only and finish chunks, preserve `X-Conversation-Id`, and handle aborts/disconnects without duplicating text.

## Hashie language map

| Hashie UI | Gateway `language` | Gateway model | Status |
| --- | --- | --- | --- |
| `en` | `eng` | `hashie-medgemma` | English generation verified live |
| `tw` | `akh` | `hashie-sunflower` | Documented; live request timed out after 10 seconds |

The current mobile app uses `en` and `tw`. Translate these only in the backend adapter; never send `tw` to the gateway. The gateway field routes a model but does not itself guarantee the response language because the field is removed upstream. Hashie should include an explicit, reviewed language instruction in its own policy prompt.

Additional documented mappings, outside current Hashie scope:

- `swa` -> `hashie-medgemma`
- `lug` -> `hashie-sunflower`
- `amh` -> `hashie-sunflower`

## Authentication

### Gateway-local account flow

1. `POST /auth/register` with `{email,password}`; password minimum 8 characters; returns `201 {id,email}`.
2. `POST /auth/login` returns `{access_token,token_type,expires_at,refresh_token}`.
3. Send `Authorization: Bearer <access_token>` to protected routes.
4. `POST /auth/refresh` with `{refresh_token}` returns a new pair.
5. Refresh tokens rotate and the submitted token becomes invalid. Always persist the newest pair.
6. Replaying an old refresh token returned `401 invalid_refresh_token` in live testing and revoked the refresh chain.
7. `DELETE /api/v1/me` permanently deletes the gateway account and its data.

Observed registered access-token lifetime was 14 days. Guest tokens had a one-day expiry and no refresh token.

### Guest flow

- `POST /auth/guest` returns a bearer access token without a refresh token.
- Guest chat is allowed.
- Guest profile and conversation endpoints return `403 guest_forbidden` or are otherwise unavailable.
- Guest turns are always recorded server-side for auditing even when `store:false`; the published docs state that stored copies are PII-scrubbed and not retrievable through the API.

### Clerk decision

The gateway has no documented Clerk, JWKS, OIDC, or token-exchange integration. Do not create gateway accounts per Hashie user, store gateway passwords, or expose gateway tokens in clients.

Before production use, obtain one of:

1. a server-to-server credential with per-user/tenant isolation;
2. verified acceptance of Clerk-signed tokens with issuer, audience, and JWKS validation; or
3. a backend token-exchange contract that maps Clerk users to isolated gateway identities without a second user password.

Hashie remains responsible for Clerk authorization, age context, safety policy, privacy, and user-owned records keyed by Clerk user ID.

## Available routes

From the public OpenAPI contract:

- Auth: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/reset-password`, `/auth/guest`.
- OpenAI: `/v1/models`, `/v1/chat/completions`.
- Conversations: list/delete all, get/patch/delete one.
- Feedback: `POST /api/v1/messages/{message_id}/feedback`.
- Facilities: public Ghana/Uganda/Kenya/Ethiopia list/detail directory.
- Profile: get/patch/delete `/api/v1/me`; avatar upload/delete.
- Documented health route: `GET /healthz`.

`GET /v1/models` with a valid token returned:

- `hashie-medgemma`, owned by `sunbird-ai`.
- `hashie-sunflower`, owned by `sunbird-ai`.

## Voice capability

No voice routes are documented or exposed. Live requests returned 404 for:

- `POST /v1/audio/transcriptions` - voice to text.
- `POST /v1/audio/speech` - text to voice.
- `POST /v1/responses` - not available as a multimodal substitute.

The gateway therefore cannot currently provide English or Akan speech. Hashie needs separate provider-neutral speech-to-text and text-to-speech adapters, with explicit consent, transcript/audio retention rules, captions, replay, cancellation, and native-speaker evaluation. Never infer Akan speech support from the Akan text-model claim.

## Operations and limitations

Verified live:

- Root docs: `200`.
- `/openapi.json`: `200`.
- Missing bearer token on `/v1/models`: `401` OpenAI-shaped `invalid_api_key` error.
- English chat: `200`.
- English streaming: SSE chunks plus `[DONE]`.
- Registered persistence: `store:true` created a conversation visible from `/api/v1/conversations`.
- Account deletion: `204`.

Issues and unknowns:

- `/health` and `/ready` returned 404.
- `/healthz` is in OpenAPI but returned a Google Frontend 404 HTML page.
- Published `429`, `502`, and `504` behavior exists, but exact rate limits, retry headers, timeout budgets, and health semantics were not published or verified.
- Provider retention, training use, deletion guarantees, model identity beyond the route names, safety behavior, and incident response require written confirmation.
- The published model scope is sexual/reproductive health, not the complete Hashie health-support scope.
- Akan latency, correctness, medical terminology, numbers, medicine names, emergency symptoms, and referral language require native-speaker and clinical evaluation.

## Required Hashie adapter responsibilities

The future `hashie-api` adapter must own:

- Clerk auth and authorization;
- `en`/`tw` -> `eng`/`akh` mapping;
- age, accessibility, cultural, emergency, and medical-safety policy;
- reviewed-content retrieval and source IDs;
- bounded timeouts, retries, abort signals, correlation IDs, and redacted errors;
- SSE parsing and client-safe streaming;
- conversation persistence under Clerk user IDs;
- feedback, action confirmation, audit events, and log redaction.

Do not couple web/mobile code to this gateway's JWT format, model IDs, response extensions, or custom request fields.

## Production acceptance gates

- Clerk-compatible or safe server-to-server auth contract is confirmed.
- Retention, training use, deletion, rate limits, timeouts, and incident response are documented.
- English passes the bilingual safety evaluation set.
- Akan meets an agreed latency budget and passes Ghanaian native-speaker/clinical review.
- Hashie system-prompt behavior is compatible with country localization.
- Structured output/tool calling is tested or explicitly excluded.
- A real monitored health/readiness route is restored.
- Separate English/Akan speech providers are selected and evaluated.
- Integration tests cover token refresh concurrency, stream failures, provider outages, language mismatch, guest restrictions, prompt injection, and log redaction.

## Repository note

At audit time, this repository contained `hashie-mobile/` but no `hashie-api/` or `hashie-web/`. Mobile chat still uses `streamMockResponse`, and read-aloud is a placeholder. The next provider implementation belongs in the backend boundary and must not call the gateway directly from mobile.
