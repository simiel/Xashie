# Offline learning library and Supabase retrieval

## Goal

Turn `artifacts/data/healthQAdata.json` into a calm, accessible, offline-first learning library in Hashie, while creating a server-owned Supabase vector knowledge base that future agent requests can query for grounded context. The original source dataset and every valid question and answer string must remain unchanged.

## Inspected context

- `artifacts/data/healthQAdata.json` contains 5,536 objects using the consistent fields `TOPIC`, `SUBTOPIC`, `questions_text`, and `Answers`.
- It has 18 non-empty topic names. `Puberty Education` contains 324 entries. Eleven rows have all required content fields empty and one row has a question with an empty answer. Source content will not be edited to “fix” them.
- `apps/hashie/app/(tabs)/learn.tsx` is a placeholder and explicitly avoids inventing health content.
- The mobile app is Expo SDK 57 / React Native and already has Hashie design tokens and reusable accessible UI components.
- `apps/backend` is a TypeScript, server-owned API boundary with a fail-closed Supabase REST data store. It has no agent/retrieval route or embedding provider configured yet.
- `supabase/migrations/20260916_hashie_auth_persistence.sql` uses public tables with RLS forced and no client privileges. The backend uses a service-role secret only on the server.

## Skills and references

- Expo native networking: use bundled content for the library; do not make the library dependent on a network request. Any backend request follows the existing fetch, timeout, typed-error, and secret-boundary patterns.
- Supabase: confirm current vector/pgvector documentation and breaking changes before implementation; create and verify a migration, force RLS, and keep client roles denied.
- Supabase Postgres practices: use an index appropriate to the selected vector distance operator and parameterized, bounded similarity queries.
- Argent: use it for mobile launch, accessibility inspection, and the complete learning flow once implementation is approved.

## Proposed product experience

### Learning tab

- A compact welcome area explains that this is educational information and does not replace a health professional or urgent care.
- A search field filters locally by question, topic, and subtopic. It works without an account and without connectivity.
- A short “Browse a topic” list shows topic title, number of questions, and a restrained visual accent from the existing Hashie system. It avoids rendering 5,525 questions at once.
- A topic screen lists its subtopics with question counts; a subtopic screen lists question cards; a detail screen shows the original question and original answer verbatim, with a clear back path.
- Search results are capped and virtualized/paginated as appropriate, with empty and no-results states. No diagnostic, personalized, or clinical claims are added by the presentation layer.
- Every control has an accessible role, label, hint where useful, logical focus order, sufficient hit target, selectable answer text, scalable layout, and no color-only meaning. The experience relies on text and hierarchy, not audio, so it remains usable offline and for Deaf/hard-of-hearing users.

### Packaged offline content

- Add a repeatable, checked-in build script that validates the source file without mutating it and generates a compact app-owned library index/artifact from valid rows.
- Preserve the exact original strings for `topic`, `subtopic`, `question`, and `answer`; add only deterministic IDs, ordering/index metadata, and derived counts.
- Bundle the generated artifact with the mobile app so browse, search, and reading work on first launch and offline. The source JSON stays the canonical supplied artifact.
- Validation writes a non-sensitive import report for the 11 blank rows and the one incomplete question/answer row. They are not displayed or embedded because there is no complete educational content to present; this is not a modification of the input data.
- The import must fail on any non-blank invalid row, duplicate deterministic identifier, malformed JSON, or accidental change to a valid QA string.

### Server-owned retrieval knowledge base

- Add a Supabase migration that enables `vector`, creates a `hashie_knowledge_documents` table containing source identity, topic, subtopic, exact question, exact answer, derived retrieval text, content hash, embedding vector, embedding-model/version metadata, status, and timestamps.
- Keep the table and any similarity RPC unavailable to `anon` and `authenticated` roles; force RLS and use no client policies. Only the backend service credential may access it.
- Add a cosine-distance vector index selected for the final embedding dimension and a bounded retrieval function/query that returns only approved document fields and similarity score. Retrieval must include a minimum similarity threshold and a small result limit.
- Add a backend repository and route/service interface for ingestion and search. The client does not access Supabase, the embedding provider, or the vector data directly.
- Add a non-interactive ingestion command that reads the same canonical dataset, validates it, computes a content hash, embeds only new/changed valid records, and upserts safely. It reports counts without logging QA content, credentials, or user data.
- Keep the embedding provider behind a small server interface. The implementation will use the project’s chosen server-side model credential and record its model and embedding dimension. No secret is placed in Expo environment variables or the repository.
- Retrieval only supplies contextual source material to the eventual agent orchestration layer; it does not make unsupervised clinical decisions, bypass the existing safety boundary, or expose similarity results to mobile clients.

## Files expected to change

- `apps/hashie/app/(tabs)/learn.tsx` and new learning routes/components/data helpers.
- A generated, checked-in offline library artifact under `apps/hashie` plus a source-validation/generation script.
- `apps/backend/src/contracts.ts`, `apps/backend/src/store.ts`, a retrieval module, API route wiring, test fixtures/tests, and package configuration only as needed.
- A new migration in `supabase/migrations/` created using the Supabase CLI naming workflow.
- A server-only ingestion script and documented required secret names in an example/configuration document; no actual secrets.
- This prompt and any concise developer documentation needed to reproduce generation/ingestion.

## Security, privacy, and safety requirements

- Do not alter original valid questions or answers, fabricate citations, or silently claim medical review that has not happened.
- Do not store source QA content, embeddings, API keys, or service-role credentials in mobile secure storage or public Expo configuration.
- Reject client-provided topic, embedding, filter, or retrieval payloads unless they are validated server-side; bound all query parameters and result sizes.
- Use content-hash idempotency so reruns do not duplicate embeddings. Embedding failures must leave prior approved rows intact and be clearly reported.
- Treat legal, service-location, medication, crisis, and time-sensitive health claims as potentially stale in future agent use: retrieved material is context, not authority, and the agent safety layer must retain escalation/referral rules.
- No production Supabase mutation or external embedding request occurs until credentials are configured and the user explicitly approves the implementation.

## Acceptance criteria

1. The valid source strings appear verbatim in the library; source JSON remains byte-for-byte unchanged.
2. The Learn tab lets an offline user browse topic → subtopic → question/answer and locally search the library without login or network access.
3. The UI is calm with progressive disclosure, handles long text and large fonts, and has accessible labels/roles and meaningful empty/error states.
4. Dataset validation reports 5,524 valid usable entries, 11 skipped blank entries, and one skipped incomplete entry (or fails clearly if the source changes), with no content mutation.
5. A repeatable migration creates a protected vector document table and appropriate vector index; client roles cannot query it directly.
6. An idempotent server-only ingestion command produces embeddings only for valid new/changed documents and records source/model/hash metadata.
7. Backend retrieval is authenticated/authorized and bounded, has tests for validation, no-match behavior, and denied client access, and returns contextual source records only to server code.
8. Type checks, backend tests, mobile production build, and Argent-driven manual learning flow/accessibility checks are run and reported accurately.

## Manual test plan

1. Start the approved mobile app in the VS Code terminal and launch through Argent.
2. With airplane mode or no network, open Learn, browse a topic and subtopic, and read an answer.
3. Search for a word from a question and confirm matching results; search gibberish and confirm the no-results state.
4. Enable large text and navigate the longest displayed answer; confirm content is readable, scrollable, and controls stay reachable.
5. Use screen-reader/accessibility inspection to confirm labels, roles, focus order, and selected text.
6. Run dataset validation/generation twice and confirm identical output and the expected blank-row report.
7. Apply the database migration in the configured Supabase environment, run the ingestion twice, and confirm no duplicate documents/embeddings.
8. Exercise a server retrieval query with an allowed server request, a low-similarity query, invalid input, and an unauthenticated/client access attempt; confirm only intended behavior succeeds.

## Decisions requiring approval

- Implement the offline library now, using the existing English source exactly as supplied. Akan/Twi content will remain a future reviewed-content addition, rather than machine translation of health guidance.
- Exclude the 11 entirely blank records and one unanswered question from display and embeddings while keeping them untouched in the supplied source file and reporting them during validation.
- Add the schema, ingestion code, and retrieval boundary now, but do not execute production migration/embedding ingestion until server credentials and the selected embedding provider/model are configured.
