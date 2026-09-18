# Native Google sign-in for Hashie

## Goal

Replace Hashie's browser-based Google sign-in with Clerk's native Google sign-in on Android, while retaining the existing Hashie-branded onboarding screen and preserving the current browser-based flow on platforms not included in the approved scope. Keep guest onboarding unchanged. Use a signed-in Clerk session for subsequent backend calls; do not move authentication or application authorization into the client.

## Skills and references

- `clerk-expo`: inspect the installed `@clerk/expo` source and implement its native Google hook as a custom UI flow. Follow the installed package signatures/status handling, do not guess.
- `argent-react-native-app-workflow` and `argent-device-interact`: use the repository's Expo scripts and Argent for native device/emulator interaction and flow verification.
- Read the exact Expo SDK 57 versioned docs before code changes, per `apps/hashie/AGENTS.md`.
- Current official Clerk Expo native Google guide: https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google

## Inspected project context

- `apps/hashie` is Expo SDK `~57.0.23`, React Native `0.86.3`, and `@clerk/expo` `^4.6.8`.
- `apps/hashie/app/onboarding/access.tsx` uses a custom Hashie access screen and currently starts Google through `useSSO()` with `oauth_google`; the guest path is separate and should remain unchanged.
- `apps/hashie/app/_layout.tsx` wraps routes in `ClerkProvider` and uses Clerk's `tokenCache`.
- `apps/hashie/app.json` registers `@clerk/expo`, uses scheme `hashie`, and has Android package `com.hashie.app`.
- Native Google requirements are not installed/configured yet: `@clerk/expo-google-signin` is absent, `expo-crypto` is not a direct app dependency, and the native Google config plugin is absent.
- `apps/hashie/eas.json` has an internal Android APK `preview` profile. It does not explicitly pin an EAS environment or declare the Google client IDs.
- `apps/hashie/package.json` has no test script or existing test suite.
- The user corrected the mobile production Clerk publishable key in `apps/hashie/.env.local`; it parses as a valid `pk_live_` key. The Android and Web Google client IDs are now present locally and match the expected public OAuth client ID format. The backend's local Clerk keys remain development/test and do not match the mobile production instance. No credential values were copied into this prompt.
- The user's earlier `./gradlew signingReport` attempt failed because Java is unavailable in the local shell. Local native build verification therefore requires a JDK (Expo SDK 57 EAS Android images use JDK 17) or a separately approved EAS build.

## Proposed decisions and assumptions

- Default UI: keep the existing Hashie-branded Google button and use Clerk's custom native hook, rather than replacing onboarding with Clerk's prebuilt `AuthView`.
- Default platform scope: Android native sign-in, because the setup conversation has provided Android OAuth details. Keep browser-based `useSSO()` for iOS/web unless the user explicitly expands scope and supplies iOS Google configuration.
- Continue to call `setActive` only as required by the installed native hook's return type/behavior; navigate to onboarding only after Clerk reports a created session and activation succeeds.
- Preserve guest sign-in behavior, current onboarding choices, design/accessibility labels, and safe user-facing error states. Disable duplicate submissions while the native flow is active. Do not log OAuth ID tokens, Clerk session tokens, or raw sensitive credential data.
- No Google Cloud, Clerk Dashboard, EAS credential, or production backend mutations are included. Native Google requires a Google Android client ID and a Google Web client ID; the Web client secret must be configured in the production Clerk Dashboard, never in mobile environment variables or source.
- The mobile production publishable key must be present in the environment used by the selected build and begin with Clerk's valid `pk_live_` format. The production backend must independently use matching production Clerk server credentials before signed-in onboarding/API requests can work end to end. Do not overwrite local or remote credentials on the user's behalf.
- Before custom native-flow implementation, derive the Clerk Frontend API URL from the valid publishable key, call `/v1/environment?_is_native=true`, and verify the enabled Google factor/strategy as required by the Clerk skill. Do not make this external request until the user approves the prompt and a valid production key is available.

## Files expected to change after approval

- `apps/hashie/app/onboarding/access.tsx`: native Android Google action and bounded status/error handling, retaining non-Android fallback if approved.
- `apps/hashie/package.json` and `apps/hashie/package-lock.json`: install Clerk's native Google module and required compatible Expo peer dependencies using the Expo SDK 57-compatible install workflow.
- `apps/hashie/app.json` (or a carefully scoped app config if required): register the Clerk native Google plugin and expose only public Google client IDs through the configuration mechanism required by the installed SDK.
- `apps/hashie/.env.example`: document public Android/Web client ID variable names and reiterate that the Web client secret and Clerk secret key stay server-side.
- Add focused tests only if the installed project/test setup supports them without introducing unrelated test infrastructure.

Do not modify `apps/hashie/.env.local`, `apps/backend/.env.local`, production Clerk settings, Google Cloud credentials, EAS signing credentials, backend secrets, or unrelated existing dirty files as part of this prompt.

## Security and privacy requirements

- Google Android/Web client IDs and the Clerk publishable key are public identifiers, not secrets; never print actual credential values in logs or this prompt.
- Google Web client secret and Clerk secret/JWT keys remain in Clerk/server-managed configuration only.
- Keep OAuth tokens and Clerk session tokens out of logs, source, committed files, screenshots, and user-facing errors.
- Continue to send only the active Clerk session token to Hashie's backend through the existing API client; do not call Google APIs or Clerk server APIs from the client.
- Do not use or request a personal Google account for verification. Use a dedicated test account controlled by the user, and stop before account selection if the user has not explicitly authorized the live provider test.

## Implementation notes

- The required Clerk `/v1/environment?_is_native=true` lookup was attempted using the valid mobile publishable key, but the request timed out from this environment. The user explicitly selected native Google sign-in, so implementation proceeds only for that approved strategy; no other provider was added.
- Expo config forwards the public Google Android and Web client IDs from build environment variables into `extra`, where the native Clerk package can read them. The local IDs are configured, but EAS build environments still need matching values if they are not already configured there.

## Acceptance criteria

- Android uses Clerk's supported native Google hook from the existing Hashie-styled onboarding control in a native development/release build, not Expo Go.
- Successful native authentication activates a Clerk session and advances into the existing onboarding path.
- Cancel, dismiss, missing credentials, disabled provider, and sign-in failures leave the user on the access screen with a safe retry path; guest access remains available.
- If Clerk is not loaded or the SSO hook returns no auth-session result, show a clear retryable message instead of silently treating it as a user cancellation. Only an actual cancellation/dismissal remains silent.
- iOS/web behavior remains as explicitly approved and is not routed through an Android-only native module.
- No secrets are added to mobile config or repository files; no server-owned business logic or authorization is moved into the app.
- TypeScript checks and Expo config validation pass; native Android build is verified when Java/build tooling is available.
- Argent is used to inspect and exercise the Android app flow. Report actual build/device checks separately from pending external Clerk/Google setup.

## Checks and manual verification

1. Run the mobile TypeScript check and any applicable focused tests; the current package has no test script, so do not claim tests passed unless added and run.
2. Validate Expo config and plugin resolution after installing the SDK-compatible native dependencies.
3. Build/install a native Android development build from the user's VS Code terminal when a JDK and credentials are available; the native Google hook cannot be verified in Expo Go.
4. With Argent, inspect the access screen and its accessibility tree, then test: (a) continue as guest, (b) start native Google sign-in with a user-approved dedicated test account, (c) successful return/session activation, (d) cancel/dismiss/retry, and (e) continue to onboarding/API with the production backend when configured.
5. Do not initiate a cloud EAS build or sign into a real Google account unless the user separately authorizes that external action.

## Exact manual test steps

1. Install the native Android build on a device/emulator and launch Hashie.
2. Advance to “How would you like to begin?” and verify the Google and guest controls are accessible.
3. Tap “Continue with Google”; verify Android's native Google account chooser appears.
4. Use only a user-approved dedicated test account, select it, and confirm return to Hashie with an active Clerk session before continuing onboarding.
5. Complete onboarding and verify a signed-in API request reaches a production backend configured for the same Clerk instance.
6. Repeat and cancel/dismiss the Google chooser; confirm the user can retry or continue as guest without losing onboarding state.
7. Confirm the approved iOS/web fallback still works if those platforms remain in scope.
