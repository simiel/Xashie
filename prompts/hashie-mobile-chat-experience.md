# Hashie mobile chat experience

## Goal

Build the complete local-only mobile chat experience in `hashie-mobile/` using
the existing Expo Router, NativeWind primitives, Clerk profile context, theme,
and SecureStore conventions. The experience must be calm, private, bilingual,
age-aware, accessible, keyboard-safe, and usable without a backend.

## Inspected context

- `hashie-mobile/src/app/(tabs)/chat.tsx` is currently a placeholder route.
- `hashie-mobile/src/app/(tabs)/_layout.tsx` gates the tabs through the existing
  `AuthProfileProvider`; no `HashieProvider` or chat hook exists yet.
- `hashie-mobile/src/auth/auth-context.tsx` exposes the selected profile,
  language, age group, accessibility preferences, and account/guest session.
- `hashie-mobile/src/auth/storage.ts` uses `expo-secure-store` with namespaced
  owner keys and graceful fallbacks for malformed data.
- `hashie-mobile/src/content/copy.ts` defines reviewed app language metadata and
  the supported `en`/`tw` codes; new Akan/Twi strings must be limited to the
  supplied/reviewed copy and otherwise remain English.
- `hashie-mobile/src/ui/primitives.tsx`, `src/constants/theme.ts`, and the
  existing auth components provide the styling and accessibility patterns to
  reuse.
- Expo SDK 57 documentation was checked for NativeTabs, keyboard handling, and
  `expo-clipboard`; `expo-clipboard@~57.0.1` is the only new dependency.

## Decisions and assumptions

- Keep the implementation mobile-only and local. Do not change the API, web
  app, authentication flow, database, or infrastructure.
- Use a small immutable chat state model and a `use-hashie-chat` hook. The hook
  owns sending, deterministic chunked streaming, cancellation, retry, feedback,
  and clear/reset behavior.
- Use a deterministic `mock-chat-responder` with bounded latency, chunked
  output, a test-only `[[mock-error]]` trigger, and explicit `isMock` metadata.
  Copy must never imply that a production model or provider generated it.
- Persist bounded completed account conversations under a key derived from the
  Clerk user ID. Keep guest conversations memory-only because the current auth
  context does not expose the guest session ID and guest data must not be shared
  across guest sessions. Corrupt/unavailable storage falls back to an empty
  conversation without blocking chat.
- Use `expo-clipboard` for copy. Listen/read-aloud is a clearly labeled local
  placeholder tied to the existing voice preference, with no audio or provider
  call.
- Use the existing `en` and reviewed `tw` copy. For unsupported translated UI
  text, use concise English rather than inventing an Akan/Twi translation.
- Younger age groups receive simpler mock wording, stronger referral language,
  age-appropriate suggestions, and no adult sexualized content. Exact age is
  never shown in chat.

## Privacy and safety

- Do not log drafts, messages, transcripts, health content, tokens, provider
  errors, or user identifiers.
- Mark every mock assistant message and disclose the non-clinical limitation in
  the empty state and conversation header.
- Emergency, abuse, self-harm, coercion, and immediate-danger wording remains
  referral-oriented. No diagnosis, prescribing, dosage, unsafe disclosure, or
  unverified referral is introduced.
- Clear only this local conversation after confirmation; preserve profile,
  language, accessibility preferences, and unrelated account data.
- Keep stored history bounded and serialize only the message fields needed to
  restore this local UI.

## Acceptance criteria

- Chat route renders an empty state with privacy/safety disclosure and tappable,
  language- and age-aware suggestions.
- User can send single- and multiline messages; duplicate sends are prevented.
- User and assistant messages render without horizontal overflow with stable
  IDs, metadata, timestamps, status, and mock disclosure.
- Mock assistant responses stream in chunks, can be stopped with an explicit
  incomplete status, and can fail deterministically with a retry action that
  does not duplicate the user message.
- Copy, feedback, listen placeholder, new conversation, and confirmed clear
  actions are reachable with accessible labels, hints, roles, and state.
- Composer remains visible with the keyboard and safe areas; long text, dark
  mode, large text, reduced motion, and small screens remain usable.
- Completed account chat restores from SecureStore; guest chat is memory-only;
  corrupted storage is ignored safely.
- Unit tests cover responder selection/streaming/cancellation/failure and hook
  behavior for send, duplicate prevention, retry, clear, feedback, and storage.

## Checks and manual verification

Run from `hashie-mobile/`:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- --run`
- `pnpm expo-doctor`
- `pnpm expo export --platform ios`

Use Argent with the iOS simulator for a smoke pass covering the empty state,
suggestion send, streaming, stop, retry, copy/feedback, clear confirmation,
keyboard-safe composer, and accessibility tree. Do not capture or retain real
health content or credentials in simulator artifacts. Record any simulator or
environment blocker exactly rather than claiming verification.
