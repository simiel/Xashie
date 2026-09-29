# Google Sign-In Architecture Audit and Correction Plan

## Goal

Replace Hashie's mixed mobile Google sign-in behavior with a single, supportable architecture while preserving browser SSO for the web. Establish the platform-specific Google/Clerk registration, native-build configuration, diagnostics, and verification needed for iOS and Android.

## Skills and references used

- `clerk-expo`, `clerk-expo-patterns`, and `clerk-testing`
- `investigate` for evidence-first diagnosis before changes
- Clerk's native Google sign-in and Expo Google strategy documentation

## Inspected implementation

- `apps/hashie/app/onboarding/access.tsx`
- `apps/hashie/app/_layout.tsx`
- `apps/hashie/app.json`, `apps/hashie/app.config.js`, and `apps/hashie/eas.json`
- Generated `apps/hashie/android` and `apps/hashie/ios` projects
- Installed Clerk native Google hook and config plugin
- Google-related local environment variable names only; values were not inspected or recorded
- Git history for the Android native sign-in and browser-fallback changes

## Confirmed findings

1. The app currently uses native Google sign-in only on Android and browser SSO on iOS and web. The Clerk SDK supports native Google sign-in on both iOS and Android.
2. Android catches every native sign-in failure and silently retries through browser SSO. This hides the error required to distinguish a cancelled sign-in from a missing Google/Clerk configuration, a SHA-1 mismatch, or a Google Play services issue.
3. Native client identifiers are sourced from both local environment variables and `eas.json`; only the iOS URL scheme is committed to the EAS preview profile. Hosted builds therefore need an explicit, verified EAS environment configuration for the remaining client identifiers.
4. The checked-in generated iOS project has a Google URL scheme form that does not match the current configuration source, indicating native-project/configuration drift. Do not use it as proof of the next build's configuration; regenerate it deliberately after configuration is normalized.
5. The checked-in Android Gradle release configuration uses the debug keystore locally. Google must register the SHA-1 of every certificate used to install a tested Android build, including the actual EAS preview/release signing certificate. A local debug fingerprint cannot validate a hosted build.
6. No `google-services.json` or `GoogleService-Info.plist` exists. That is not a defect for Clerk's Credential Manager-based native Google module; its required inputs are OAuth clients, Clerk configuration, app identity, and iOS URL scheme.
7. Clerk's native environment endpoint confirms Google social sign-in and native Google configuration are enabled for the configured mobile Clerk instance. The EAS CLI account is authenticated, but its environment listing command returned an error, so hosted variable presence remains unconfirmed.

## Recommended decision

Use Clerk's native `useSignInWithGoogle` flow for both **iOS and Android**. Use Clerk `useSSO({ strategy: 'oauth_google' })` only on web.

This produces one user-facing mobile sign-in design and one server exchange with Clerk. It does not eliminate platform setup: Android validates package name plus signing-certificate SHA-1, while iOS validates Apple team/app identity, bundle identifier, and a reversed-client-ID URL scheme.

### Alternatives considered

| Approach | Benefits | Cost | Recommendation |
| --- | --- | --- | --- |
| Native Google on iOS and Android; browser SSO only on web | Consistent mobile UX, no browser fallback ambiguity, uses installed SDK | Requires correctly configured native clients and native builds | Adopt |
| Browser SSO on all mobile platforms | Faster short-term configuration, no Android certificate registration | Browser/deep-link experience remains, does not meet native sign-in intent | Temporary fallback only |
| Clerk-managed native auth UI | Reduces custom sign-in orchestration | Changes Hashie's custom access screen and gives less UX control | Do not adopt now |

## Planned implementation scope after approval

1. Normalize app configuration in the Expo config source. Validate required public IDs at build time by platform and remove duplicate/stale configuration paths.
2. Configure EAS development, preview, and production variables through the managed environment. Do not commit credentials or client secrets. Record only variable names and environment ownership in the repository.
3. Use the native Clerk Google hook for both `ios` and `android`; isolate browser SSO to web.
4. Replace Android's catch-all browser retry with privacy-safe, actionable error classification. Cancellation remains quiet; configuration and provider failures surface a short retry message plus a non-sensitive diagnostic code in development. No tokens, email addresses, or raw provider payloads may be logged.
5. Reconcile generated iOS configuration through a controlled prebuild/native-project update, review the diff, and rebuild. Do not manually maintain conflicting URL schemes.
6. Update Google Cloud and Clerk native application registration for every actual app identity and signing certificate.
7. Add focused unit tests for platform-flow selection and error classification, update setup documentation, and run native manual verification using Argent.

## External configuration checklist

### Shared

- One Clerk instance per intended environment, with Google enabled and custom Google credentials correctly attached.
- Google web OAuth client ID and secret configured in Clerk.
- Expo public configuration contains the web client ID and each native client ID required by the Clerk hook.
- The mobile publishable key and backend Clerk verification configuration point to the same Clerk environment.

### Android

- Google OAuth Android client has package name `com.hashie.app`.
- Register SHA-1 fingerprints for the local debug build and the actual EAS preview/release certificates; verify each from the installed artifact or EAS credentials, never guess.
- Clerk native application registration includes the Android package identity.
- Test on a native build with Google Play services. Expo Go is not a valid native Google test environment.

### iOS

- Google OAuth iOS client has bundle identifier `com.hashie.app`.
- Clerk native application registration has the Apple Team ID/App ID Prefix and bundle identifier.
- Expo config uses the exact reversed iOS Google client URL scheme. The config plugin owns the final `Info.plist` entry.
- Test in a native iOS build; validate the callback returns to `hashie://` and activates the Clerk session.

### Web

- Keep browser SSO and Clerk redirect-domain configuration; no Android signing certificate or iOS URL scheme applies.

## Security and privacy requirements

- Keep Google client secrets, Clerk secrets, and service credentials outside the mobile app and repository.
- Treat OAuth client IDs as public configuration but never print them in diagnostics or issue reports.
- Do not log ID tokens, authorization codes, email addresses, or raw auth-session payloads.
- Ensure error handling does not reveal whether an account exists.

## Acceptance criteria

- A fresh native Android build signs in with Google using the intended account and reaches an active Clerk session without opening browser SSO.
- A fresh native iOS build does the same and returns through the correct URL scheme.
- Web Google sign-in still completes through browser SSO.
- Cancelled sign-in is harmless; malformed configuration yields a safe, diagnosable error instead of an opaque browser fallback.
- The correct EAS environment variable names are confirmed for each build profile without exposing values.
- The configured SHA-1 values are documented by build type, validated against the actual signed Android artifacts, and registered with Google.
- Type checks, lint, tests, build checks, and Argent native-flow verification pass.

## Exact manual test plan

1. Build/install development or preview Android and iOS artifacts with the intended EAS environment.
2. In each app, select Google from the Hashie access screen, choose a test account, and confirm onboarding continues with an active Clerk session.
3. Cancel the provider sheet and confirm no fallback browser opens and no unsafe detail is shown.
4. Temporarily use a non-production configuration fixture to assert the safe configuration-error state; restore production configuration before release.
5. Repeat the sign-in flow in the web app and verify browser callback/session activation.
6. Inspect the installed Android artifact's certificate fingerprint and confirm it is present on the Google OAuth Android client before declaring release verification complete.

## Approval needed

Approve the recommended **native iOS + Android, browser-only web** architecture and the implementation scope above before any source, EAS, Clerk, Google Cloud, or native-project changes are made.
