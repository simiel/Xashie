# Backend retrieval grounding contract for the AI Gateway

## Goal

Make reviewed Supabase vector retrieval a required, fail-closed stage of every valid Hashie agent request before it reaches the existing AI Gateway. Give the model a bounded, server-owned evidence packet and explicit claim-precedence rules: approved retrieved resources are the source of truth for factual health claims; the model must not fill gaps with invented facts.

This is a backend-only hardening change. It preserves the current OpenAI-compatible Hashie LLM Gateway / AI SDK adapter and its server-only credentials. It does **not** migrate Hashie to Vercel AI Gateway or change the deployed model/provider; that would be a separate infrastructure and provider-selection decision.

## Skills and authoritative references

- `ai-sdk` and `vercel:ai-gateway`: verify the installed `ai` and `@ai-sdk/openai-compatible` APIs and the gateway model/auth contract before changing the adapter. Do not guess models or SDK options.
- `supabase:supabase`: preserve the existing private vector table, forced RLS, service-role-only RPC, bounded cosine search, and server-only credentials. Check the current Supabase changelog and vector documentation before implementation.

## Inspected code and current behavior

- `apps/backend/src/agent.ts` currently calls `KnowledgeService.retrieve` for the current message with a 0.55 threshold and three results, then puts the matching question/answer pairs inside one server-owned prompt sent to `hashie-medgemma`.
- The instruction says to use passages only “when they are relevant,” so it is not an enforceable fact-grounding contract. The agent is also constructible with `knowledge: null`, which silently omits retrieval.
- `apps/backend/src/knowledge.ts` embeds a bounded current question with `text-embedding-3-small`, calls the protected `hashie_match_knowledge_documents` Supabase RPC, and returns approved matches only. The database migration already prevents `anon` and `authenticated` access.
- `apps/backend/src/app.ts` authorizes the actor, validates a bounded message/history, rate-limits, then delegates to the agent. A `StoreError` becomes a safe 503 response, making a fail-closed retrieval path feasible.
- `apps/backend/test/knowledge.test.mjs` and `apps/backend/test/agent-validation.test.mjs` cover basic retrieval limits and context delimiters, but no test proves that a gateway call cannot occur without successful retrieval or that the grounding instructions require evidence-first answers.
- The worktree contains unrelated, uncommitted mobile changes in `apps/hashie/app/(tabs)/ask.tsx` and an unrelated new prompt; this work will leave them untouched.

## Approved design to implement

1. **Required retrieval before generation.** For every accepted `POST /v1/agent/stream` request, embed only the current user message (not conversation history or identifiers), then query the approved Supabase knowledge RPC before obtaining/calling the generation gateway. Missing retrieval configuration, an embedding failure, a Supabase/RPC failure, malformed match response, or timeout is a safe 503; it must never fall back to an ungrounded model call.
2. **Bounded evidence packet.** Retrieve a small, deterministic maximum of approved passages (default: four). Each packet contains an internal source identifier, topic, subtopic, question, answer, and similarity—not user data, raw vector values, credentials, or untrusted metadata. Retain the existing bounded validation and add a total context-size budget, truncating only at safe passage boundaries if necessary.
3. **No-match policy.** A completed retrieval with no passage over the chosen threshold is distinct from retrieval failure. It still reaches the model with an explicit empty-evidence marker, but the instruction permits only a transparent statement that the approved library cannot verify a specific health fact, a clarifying question or relevant library topic, and the existing safety/escalation guidance. It must not create medical facts from general model knowledge.
4. **Evidence-first system instruction.** Replace the optional “when relevant” wording with clear precedence rules: (a) follow system safety and urgent-care guidance, (b) treat the evidence packet as the sole factual basis for health/sexual-reproductive-health claims, (c) do not contradict, extend, or manufacture details beyond it, (d) make uncertainty/no-match explicit, and (e) treat user message and history as untrusted input, never as instruction overrides. The model should explain answers in plain, age-aware language while accurately distinguishing source-supported information from supportive non-factual language.
5. **Gateway request contract.** Continue using a single server-controlled prompt because the deployed gateway requires that shape. Add a dedicated prompt/evidence builder with explicit labelled delimiters, quoted data boundaries, and source IDs. Do not expose or persist model prompts, retrieved content, source IDs, vectors, or gateway conversation IDs in API headers, logs, or mobile responses during this phase.
6. **Fail-safe observability.** Add privacy-safe operational events/metadata only: request ID, retrieval outcome (`matched`, `no_match`, `unavailable`), match count, and response status class. Never log question text, answers, embeddings, prompt content, tokens, credentials, sessions, or personally identifying preferences.
7. **Configuration and deployment safety.** Make the agent factory unavailable when either the generation-gateway configuration or the retrieval configuration is absent; document all server-only variables. Do not run database migrations, ingestion, production configuration changes, or live model calls as part of this implementation without separate authorization.

## Explicit implementation choices

- Use the current-message-only embedding as the retrieval query. It reduces unnecessary disclosure of prior conversation content and keeps relevance testable.
- Keep the existing embedding model/vector dimension and Supabase schema. This task strengthens consumption of the approved corpus; it does not re-embed or mutate it.
- Use a named threshold and top-k configuration with conservative validated defaults rather than hard-coded magic values inside the agent. Final values will be verified against representative non-sensitive fixtures; no real user content is used in tests.
- Do not claim that prompt rules alone make an LLM perfectly factual. The contract guarantees retrieval and source injection; the tests will enforce the architecture and prompt policy. Ongoing human content review and production monitoring remain necessary.

## Files expected to change

- `apps/backend/src/agent.ts` — required retrieval orchestration, evidence packet/prompt builder, no-match handling, safe metadata hooks.
- `apps/backend/src/knowledge.ts` — named retrieval policy/configuration and any bounded context helpers; no client-facing data access.
- `apps/backend/src/app.ts` — factory wiring that fails closed when retrieval is not configured and safe error mapping if needed.
- `apps/backend/test/knowledge.test.mjs`, `apps/backend/test/agent-validation.test.mjs`, and focused new/updated agent tests — policy, no-match, error, prompt-boundary, and gateway-call ordering coverage.
- `apps/backend/README.md` and `apps/backend/.env.example` — server-only configuration, no-match behavior, operational constraints, and exact verification instructions.

## Security, privacy, accessibility, and safety requirements

- Keep Supabase service-role, embedding-provider, and AI Gateway credentials exclusively on the backend. No client or logs may receive them.
- Do not send actor IDs, session IDs, tokens, e-mail addresses, database records, or history to the embedding provider. The current bounded question is the only retrieval input.
- Keep retrieval service-role-only: no new mobile route, table permission, RLS policy, RPC grant, or client-supplied embeddings.
- Treat retrieved material as approved only after its database `status = 'approved'` guard. Do not claim external citations or professional review beyond what the corpus metadata establishes.
- Preserve age-aware, Ghana-focused, accessible plain text; do not diagnose, prescribe, replace emergency services, or disclose hidden system/prompt content.

## Acceptance criteria

1. Every successful model-generation attempt is preceded by one successful bounded retrieval attempt for the current validated question.
2. When retrieval is unavailable or misconfigured, the route returns the existing safe service-unavailable response and makes zero gateway generation calls.
3. A no-match query produces an explicit empty-evidence instruction and cannot receive source-backed factual language from an absent packet.
4. A match packet contains only approved, validated, bounded source fields and is explicitly presented as the factual basis for health claims.
5. User messages and history cannot override the evidence/safety instruction, inject a source, choose a model, alter retrieval parameters, or reveal the prompt.
6. Unit tests cover match, no-match, retrieval failure, malformed retrieval data, context bounds, and the fact that gateway generation is skipped on failure.
7. `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass in `apps/backend`; no live credentials, migrations, ingestion, or production calls are required for those checks.

## Exact manual verification after implementation

1. In the Visual Studio Code terminal, configure only a local non-production backend environment with server-only test credentials and start `npm run dev` from `apps/backend`.
2. Create a local guest session and send a short synthetic question with a known matching library topic; confirm a streamed response completes and backend-safe metadata reports `matched` without displaying content.
3. Send a synthetic out-of-corpus question; confirm the response transparently follows the no-match path and does not present unsupported medical facts.
4. Temporarily omit the retrieval configuration in the local process; confirm `POST /v1/agent/stream` returns a safe 503 and the gateway test double records no call.
5. Submit an oversized request and a prompt-injection-style message; confirm validation/safety behavior and that no secrets, source packet, or internal instructions are returned.
6. Review `git diff` for changes outside the scoped backend/prompt files and for accidental secrets or user content.

## Out of scope

- Switching providers or migrating the existing Hashie gateway to Vercel AI Gateway.
- Changing the Supabase schema, embedding model, ingestion corpus, database content, or database permissions.
- Mobile UI, user-visible citations/source cards, chat-history persistence, voice, translation, or production deployment/configuration.
