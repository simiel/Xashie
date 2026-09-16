# Mobile guest and Clerk integration

## Goal

Connect the existing Hashie Expo mobile onboarding flow to the backend API while preserving the current visual language and privacy boundaries. Guests receive a server-created opaque session token stored through a secure device cache. Signed-in users authenticate through Clerk's browser-based Google SSO flow and call the same backend preference API with a Clerk session token. The mobile client must never call providers directly or contain server secrets.

## Approved scope

- Add `@clerk/expo` and its Expo integration requirements.
- Wrap the Expo Router tree in `ClerkProvider` using the configured public publishable key and Clerk's `tokenCache`.
- Replace the prototype Google browser link with a custom `useSSO()` Google flow.
- Add a typed, timeout-aware Hashie API client for guest sessions, session lookup, and preferences.
- Persist the opaque guest token using a secure device store and use it only in the guest header.
- Submit the approved onboarding preference fields at setup completion for the active guest or Clerk actor.
- Add safe loading and error states, without logging credentials or sensitive request data.
- Apply the approved Supabase persistence migration for guest sessions and onboarding preferences.
- Add a server-only transactional guest-to-Clerk upgrade RPC with explicit consent, idempotency, conflict handling, preference merge semantics, and guest invalidation.
- Update the server adapter to call and safely classify the approved RPC result.

## Not in scope

- Clerk Dashboard provider setup beyond inspecting the existing configuration; no credentials are printed or committed.
- AI calls, content retrieval, analytics, audio, or new UI design.
- Native Google credential hooks; Expo Go compatibility requires browser-based `useSSO()`.

## Skills and references

- `clerk-expo` custom-flow guidance and installed package source for hook signatures.
- `argent-react-native-app-workflow` for the existing Expo/Metro workflow.
- `argent-device-interact` and `argent-test-ui-flow` for all mobile interaction and verification.
- Existing backend contract in `apps/backend/src/contracts.ts` and routes in `apps/backend/src/app.ts`.
- Supabase project `anavlxkjifsqntrcbqpf` through the registered Supabase MCP server; the project was inspected before changes and had zero public tables and zero migrations.
- Supabase `supabase` and `supabase-postgres-best-practices` guidance for grants, RLS, constraints, indexes, and short transactions.

## Inspected code and decisions

- `apps/hashie` is an Expo SDK 57 app using Expo Router and React Native 0.86.
- The existing auth choice screen already has branded guest and Google actions, so the custom flow is the smallest compatible integration.
- The backend accepts `X-Hashie-Guest-Token` for guest requests and `Authorization: Bearer <Clerk session token>` for authenticated requests; never send both except for the explicitly unsupported upgrade operation.
- Onboarding values already use the backend's language, age-group, and accessibility enum values.
- Guest data is session-scoped; authenticated preferences are persistent according to backend capabilities.
- Missing API configuration, expired sessions, network failures, and controlled 4xx/5xx responses must be surfaced as safe, actionable UI messages. Response bodies must not be rendered wholesale.

## Files

- `apps/hashie/app.json`: register the Clerk Expo config plugin.
- `apps/hashie/app/_layout.tsx`: add the root Clerk provider and secure token cache.
- `apps/hashie/app/onboarding/access.tsx`: use Clerk `useSSO()` for Google and create a guest session through the API.
- `apps/hashie/app/onboarding/accessibility.tsx`: submit onboarding preferences before entering the main tabs.
- `apps/hashie/components/onboarding-provider.tsx`: expose the active actor/API integration state needed by onboarding.
- `apps/hashie/lib/hashie-api.ts`: typed client, secure guest token storage, safe errors, and request auth.
- `apps/hashie/package.json` and lockfile: approved Expo-compatible dependencies only.

## Security and privacy requirements

- Only `EXPO_PUBLIC_*` values may be read by the mobile bundle; no Clerk secret, Supabase credential, model key, or MCP credential may be added.
- Use Clerk's `tokenCache` from `@clerk/expo/token-cache`; do not implement a second Clerk token cache.
- Keep the guest token in secure storage, never in logs, URLs, analytics, or rendered text.
- Do not persist raw health answers beyond the backend contract; send only the approved onboarding preference fields.
- Use safe error messages and request IDs only for support/debugging; do not expose backend payloads or secrets.
- Do not silently merge or upgrade a guest session when Google sign-in succeeds.
- Keep application tables inaccessible to `anon` and `authenticated`; enable and force RLS as defense in depth, and grant only the server role the required table and RPC permissions.
- Store only SHA-256 guest-token hashes; never persist or return raw guest tokens except for the one-time session-creation response.
- The upgrade RPC must lock the guest row, reject missing/expired sessions, require consent, make an idempotent same-key replay safe, reject conflicting replays, merge guest preferences without overwriting existing authenticated values, delete guest-owned preferences, and revoke the guest session in one transaction.

## Acceptance criteria

1. The app type-checks and Expo configuration validates with the Clerk plugin and dependencies installed.
2. The root renders through `ClerkProvider` with the configured public key and Clerk token cache.
3. Continue as guest calls `POST /v1/guest-sessions`, securely retains the returned opaque token, and proceeds only after a successful response; retrying does not display the token.
4. Google uses `useSSO({ strategy: 'oauth_google' })`; cancellation is non-fatal, successful sessions become active via Clerk, and no direct Google login URL is opened.
5. Completing onboarding calls `PATCH /v1/me/preferences` with the selected language, trimmed nickname or null, age group or null, and accessibility preferences; it shows retryable failure UI and does not navigate on failure.
6. Guest requests use only the guest header; signed-in requests use only the Clerk bearer token. No client code calls Supabase, AI providers, or Clerk secret endpoints.
7. Existing visual layout, accessibility labels, and navigation remain intact aside from truthful auth/API status messaging.
8. The Supabase project contains the reviewed `hashie_guest_sessions` and `hashie_preferences` tables, safe constraints/indexes, RLS enabled, client roles denied, and only server-role grants.
9. The server adapter uses the transactional Supabase upgrade RPC and preserves redacted `401`/`409`/`503` behavior for inactive, conflicting, and unavailable states.

## Checks and manual verification

- Run mobile TypeScript validation, Expo doctor/config validation, and `git diff --check`.
- Run the unchanged backend tests and health check.
- Apply and verify the Supabase migration through the connected Supabase MCP; run security and performance advisors afterward.
- Run a real API smoke test against the configured Supabase store for guest creation, preference write/read, expiry/invalidation, and explicit idempotent upgrade behavior without printing credentials.
- With the existing VS Code Metro/backend terminals, use Argent to inspect the running app, tap guest, complete onboarding, and verify the request/status result through Argent network/debug logs without exposing token values.
- Verify Google action opens the Clerk SSO flow and handles cancellation or configuration failure safely; do not claim a successful account login without a real test account and a completed Clerk callback.
- Test offline/API-unavailable behavior at guest start and onboarding completion: a clear retry action is shown and the app does not falsely report completion.

## Known external dependency

Successful Google login still depends on Clerk Dashboard provider and OAuth redirect settings plus a real test account. Supabase persistence is approved for this phase and must be configured through the server-only backend environment; if Clerk remains unavailable, report the exact limitation rather than claiming a completed Google flow.

## Persistence implementation decisions

- Migration artifact: `supabase/migrations/20260916_hashie_auth_persistence.sql`, applied to the Hashie project through the connected Supabase MCP because the local Supabase CLI is unavailable.
- `hashie_guest_sessions` uses UUID session ids, unique SHA-256 token hashes, UTC timestamps, expiry/revocation state, upgrade target, and upgrade idempotency hash.
- `hashie_preferences` uses `(owner_type, owner_id)` as its primary key and stores only the approved language, optional nickname, broad age group, accessibility preference array, and timestamps.
- The RPC is `public.hashie_upgrade_guest_session(uuid, text, text, boolean, timestamptz)` and returns a small JSON result. It is `SECURITY INVOKER`, callable only by `service_role`, and performs all merge/invalidation writes inside one transaction.
- When authenticated preferences already exist, non-null authenticated scalar values win; missing scalar values are filled from the guest record, and accessibility preferences are unioned in existing-first order. A guest preference row is deleted after a successful upgrade.
