# Hashie mobile: Clerk authentication and onboarding

## Goal

Add a privacy-first authentication and minimum-profile onboarding experience to the Expo SDK 57 Hashie mobile app. Use Clerk for account identity and a clearly differentiated local guest mode.

## Inspected context

- `hashie-mobile` is an Expo Router, TypeScript, NativeWind app on Expo SDK 57.
- Existing `scheme` is `hashie`; Secure Store and Web Browser are already installed.
- No Clerk package, publishable-key environment variable, OAuth callback route, auth state, or onboarding persistence existed.
- Clerk test instance environment was read before implementation. Native API is enabled; enabled social strategies are Google and Apple; passwords and phone authentication are disabled. This product scope implements the explicitly requested Google OAuth only.

## Decisions

- Retain Expo SDK 57, confirmed by the product owner.
- Use the supplied test publishable key only in ignored `hashie-mobile/.env`; commit only `.env.example`.
- Install `@clerk/expo` and `expo-auth-session` with `npx expo install`; retain the installed Secure Store and Web Browser packages.
- Wrap Expo Router with `ClerkProvider` and Clerk's `tokenCache`.
- Use `useSSO()` with `oauth_google` and `hashie://oauth-callback`.
- Keep identity/session state in Clerk. Keep Hashie onboarding/preferences and the limited guest marker separately in Secure Store.
- Guest mode is feature-flagged by `EXPO_PUBLIC_HASHIE_GUEST_MODE_ENABLED`; it is enabled in the supplied local development environment and can be disabled for a production build.
- Account deletion is an entry point only: the mobile client does not claim to delete backend health records. It directs the signed-in user to a deliberately separated confirmation path pending API-side deletion support.

## Security and privacy

- Never store Clerk tokens directly; use `@clerk/expo/token-cache`.
- Do not add secret keys, auth headers, health content, audio, transcripts, or sensitive profile data to logs.
- Store only the minimum requested onboarding profile locally; use age bands, not birth dates.
- Route guards never treat client-side UI visibility as backend authorization.

## Acceptance criteria

- Deterministic route selection: no session -> auth, session/guest with incomplete profile -> onboarding, complete profile -> app.
- Google OAuth presents a loading, cancellation, and non-sensitive failure state; callback routes users according to session and onboarding state.
- Welcome, choice, onboarding, settings and error states are accessible and distinguish guest from account sessions.
- Language, age band, accessibility preferences, voice preference, interests, and optional region persist locally.
- Tests cover route selection and persistence semantics without real Clerk credentials.

## Verification

- Run `npm run typecheck`, `npm run lint`, `npx expo-doctor`, and configured unit tests.
- Build/run a native development build and manually verify Google OAuth only after the Clerk Dashboard is configured with the native redirect/Google client settings.
