# Contextual Hashie agent chat: backend and mobile integration

## Goal

Replace the mobile `Ask Hashie` placeholder with a safe, accessible, English text chat connected to the existing server-owned streaming agent. Every generated response will receive a minimal, explicit server-derived user context so its vocabulary, structure, and accessibility accommodations can adapt to the person without exposing account identifiers or gateway credentials.

## Skills and references

- `ai-sdk` — preserve the existing AI SDK gateway adapter and server-only model boundary.
- `expo:native-data-fetching` — implement cancellation-aware streamed fetches, authenticated requests, errors, and offline behavior with native `fetch`.
- `expo:building-native-ui` — use Expo Router and safe-area-aware native layout patterns.
- `argent-react-native-app-workflow` and `argent-test-ui-flow` — validate the live mobile flow with Argent after implementation.
- Expo SDK 57 reference — the project uses Expo 57 / React Native 0.86, verified in the official versioned documentation.
- WhatsApp reference image supplied by the user — use only the conversational rhythm, clear header, readable bubbles, and anchored composer as inspiration. Do not copy WhatsApp branding, wallpaper, iconography, controls, or visual design.

## Inspected context

- `apps/hashie/app/(tabs)/ask.tsx` is currently a disabled placeholder UI.
- `apps/hashie/lib/hashie-api.ts` already owns client-safe guest/Clerk credential handling, SecureStore guest token access, timeout/error mapping, and the public API base URL.
- Onboarding persists only `nickname`, `ageGroup`, `language`, and `accessibilityPreferences` through the backend.
- `apps/backend/src/app.ts` already authenticates a guest or Clerk actor and exposes `POST /v1/agent/stream`; `apps/backend/src/store.ts` can retrieve the actor-owned preferences.
- `apps/backend/src/agent.ts` is English-only, retrieves approved knowledge, streams through the gateway, and does not persist Hashie conversations. Gateway documentation says it persists every request.
- Hashie’s established visual system uses airy blue surfaces, white/mint cards, gold actions, Plus Jakarta Sans, and 44pt-or-larger touch controls.

## Product decisions

### Equal access with verified session boundaries

Guests and signed-in users receive the same agent capabilities: English streaming chat, reviewed-knowledge grounding, profile-aware readability/accessibility adaptation, stop/retry behavior, and the same safety limits. Neither group is denied agent access or receives a deliberately weaker model experience.

The difference is only how the backend authorizes the request:

- **Guest:** a valid, unexpired opaque Hashie guest token is resolved to an active guest session before streaming begins.
- **Signed-in:** a valid Clerk bearer token is verified server-side and resolved to its authenticated actor before streaming begins.

The mobile app sends exactly one credential type. The backend rejects missing, expired, revoked, malformed, or conflicting credentials before reading preferences, retrieving knowledge, or calling the gateway. Actor- and IP-based rate limits apply equally to both groups, so agent access is inclusive without becoming an unauthenticated public relay. Guest preferences remain owned by that guest session and are migrated only through the existing explicit guest-upgrade flow.

### Server-derived user context on every turn

For every authenticated `/v1/agent/stream` request, the backend—not the mobile client—will load the resolved guest or signed-in actor’s preferences and add a clearly delimited `USER CONTEXT (server supplied)` block immediately before the latest user question.

Included values, only when set:

- **Name:** the onboarding nickname only. Do not use a Clerk name/email or any account/session identifier. If no nickname is set, say `Not provided`.
- **Age group:** the selected age band, or `Not provided`.
- **Preferred language:** retained as a preference. This phase remains English-only; `akan-twi` means the agent should state that English is currently used rather than pretend to respond in Twi.
- **Accessibility preferences:** the selected app-level needs, or `None stated`.
- **Conversation mode:** guest/signed-in can shape privacy wording but must never be sent as an ID.

Excluded values: user IDs, session IDs, Clerk data, guest tokens, device data, precise location, raw database records, and any inferred disability or health condition.

Because the gateway persists requests, the nickname is the only identifying preference sent to it. The chat UI will state that preferences help tailor the reply and users should avoid putting private identifiers into messages. The backend must never send the full account name or email.

### Readability and accessibility behavior

The server guidance will map age bands to response style without patronizing the user:

| Age group | Response approach |
| --- | --- |
| Under 13 | Short sentences; one idea at a time; immediately explain unfamiliar health words; gentle, age-appropriate detail; encourage a trusted adult where needed. |
| 13–15 | Plain language, defined terms, short paragraphs, concrete next steps. |
| 16–17 | Clear teen-friendly language; explain technical terms when first used. |
| 18–24 / 25+ | Plain language first, with more detail available when asked. |
| Not provided | Clear, neutral plain English with defined terms. |

Accessibility settings inform output structure, not medical assumptions: concise paragraphs and clear headings for everyone; extra explicit text descriptions when `visual-details` is selected; text-first, transcript-friendly responses for `captions` or `hearing-audio`; and app UI honoring system font scaling, large touch targets, contrast, and screen-reader labels. `larger-text` and `higher-contrast` also affect the client layout, not merely the model prompt.

### Chat experience

Turn Ask into an in-session chat screen while retaining Hashie’s own visual identity:

- A simple Hashie header with privacy/status copy, no WhatsApp-like call, video, green branding, wallpaper, or duplicate product chrome.
- A scrollable, screen-reader-readable message list: distinct Hashie and user bubbles, timestamps omitted in this first phase to avoid implying durable history, and a calm typing/streaming state.
- A fixed bottom composer outside the scroll area. It respects safe areas and the keyboard, grows only to a bounded number of lines, has a 44pt send target, supports Enter/send correctly for the platform, and offers **Stop generating** while a stream is active.
- Short, non-sensitive starter questions only before the first reply. No starter prompt contains a user profile detail.
- Error/retry and offline states keep the typed draft intact. Learning remains offline; live agent replies require a connection and are never fabricated locally.
- Messages live only in the React app session for this phase. Leaving/restarting the app clears them; no new local chat storage, Supabase chat table, or gateway conversation ID will be used.

## Backend implementation scope

1. Add a typed `AgentUserContext` composer built from the server-owned `StoredPreferences` for the authenticated actor.
2. Preserve equal agent access for a verified guest session and a verified Clerk actor. Modify the streaming route to resolve exactly one valid credential type, read that actor's owned preferences, and pass only this bounded context into `AgentService`; do not accept user context in request JSON.
3. Update the controlled agent guidance to delimit user context, apply the readability mapping, support text accessibility preferences, and preserve existing health/safety limits and approved-knowledge grounding.
4. Keep gateway language routing at `eng` and country at `Ghana`. Do not enable Akan/Twi model routing or claim it is live.
5. Keep request bounds, gateway token rotation, no-store headers, and safe error responses. Never log messages, context, retrieved text, IDs, tokens, or raw gateway errors.
6. Extend backend unit tests for actor-owned preference lookup, null/default context, nickname-only exposure, age/readability guidance, and the agent route’s safe failure behavior.

## Mobile implementation scope

1. Add a streaming method to `HashieApiClient` that sends the current message and short in-memory history using existing guest/Clerk credentials; decodes the plain-text response incrementally; supports `AbortController`; and maps non-OK JSON errors through the existing safe error handling.
2. Add a session-only chat state/provider with message IDs, roles, partial assistant text, sending/error state, abort action, and a bounded history matching the backend limit. It must not write chat content to SecureStore or AsyncStorage.
3. Replace `ask.tsx` with a safe-area/keyboard-aware chat screen using existing Hashie tokens and reusable components where sensible. Use FlatList or an equivalent bounded message list so long chats, large type, dynamic streaming text, and keyboard changes do not overlap or clip the composer.
4. Add accessible labels/hints and announcements for send, stop, retry, partial response, errors, and the privacy/AI limit notice. Respect system font scale; test long messages and large text.
5. Update only client-safe documentation/configuration if necessary. No gateway credentials, model keys, refresh tokens, Supabase keys, or Clerk secrets enter the mobile app.

## Files expected to change

- `apps/backend/src/app.ts`, `apps/backend/src/agent.ts`, and new focused context helper/types/tests.
- `apps/backend/test/*.test.mjs` and backend README if the public route contract changes.
- `apps/hashie/lib/hashie-api.ts`, a new session-only chat provider/hook, and `apps/hashie/app/(tabs)/ask.tsx`.
- Existing design-system/components only if a small reusable chat primitive is appropriate.
- `apps/hashie/README.md` and this prompt; no database migration is expected.

## Security, safety, and privacy requirements

- The backend alone derives user context from a verified guest or Clerk actor's owned preferences; the client may never submit profile facts for model prompting.
- User identifiers and account data are excluded. Nickname is intentional, visible to the user, and the only identity-like preference supplied to the gateway.
- Clearly say the agent provides health education/support, not diagnosis, treatment, emergency help, or a replacement for qualified care.
- Preserve urgent-care/trusted-adult guidance and do not infer maturity, literacy, disability, or health facts beyond an explicit preference.
- Do not persist chat content locally or in Hashie’s database in this phase; acknowledge the gateway’s documented request persistence in UI privacy copy and product documentation.

## Acceptance criteria

- A completed onboarding guest or signed-in user has the same ability to open Ask, send an English message, see assistant text appear incrementally, stop a stream, retry a recoverable error, and retain a draft after an error.
- Missing, expired, revoked, malformed, or conflicting guest/Clerk credentials are rejected before any preference lookup, retrieval, or gateway request; both verified actor types receive identical rate-limit and safety enforcement.
- Every agent request contains server-derived context and no client-supplied profile context. The backend tests prove no IDs/emails/tokens pass to the agent context.
- The wording demonstrably changes by age band toward simpler language/defined terms and applies explicit visual/text accessibility guidance without disabling user control.
- UI works at large text, with keyboard open, with long streaming answers, empty/new/error/offline states, VoiceOver/TalkBack semantics, and iOS/Android safe areas—no hidden messages, overlapping composer, or unreachable send action.
- Knowledge retrieval remains server-side and OpenAI remains limited to embeddings.

## Checks and manual verification

1. Run backend `typecheck`, `lint`, tests, and build; run the synthetic gateway and AI-SDK smoke checks without logging text or sensitive data.
2. Run mobile TypeScript/build checks using the project’s Expo 57 scripts and configuration.
3. Start backend and Expo from the user’s Visual Studio Code terminals. Use Argent to run the Ask flow on an iOS simulator and Android emulator: guest send/stream/stop/retry, signed-in credential path if test credentials are available, no network, long answer, long draft, font scaling, and screen-reader component tree/labels.
4. Visually compare the connected chat against Hashie’s design tokens on a small phone and a large phone; ensure the composer remains visible above the keyboard and tab bar.

## Out of scope

- Twi/Akan generation, voice, video, attachments, calls, sharing, camera access, gateway conversation APIs, chat retention, notifications, or treatment-centre actions.
- New onboarding/profile fields, diagnosis, prescribing, crisis intervention, or any client-side model/provider call.
