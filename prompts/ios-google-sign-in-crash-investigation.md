# iOS Google Sign-In Crash Investigation

## Goal

Determine why tapping Google sign-in terminates the iOS app, capture the first trustworthy native failure, and restore a verifiable native Google sign-in path without exposing OAuth tokens, account information, or credentials.

## Scope

- Diagnose the native iOS crash before changing user-facing authentication behavior.
- Validate generated iOS configuration, the installed Clerk Google native module, and the source app flow.
- Require a fresh native build after correcting the iOS callback scheme.
- Use Argent for device/simulator interaction and native failure capture when its tools are available.

## Evidence gathered

1. `AccessScreen` invokes Clerk's `useSignInWithGoogle()` natively on iOS. JavaScript catches provider rejections and emits only a development diagnostic code; it cannot catch a native process termination.
2. The installed `@clerk/expo-google-signin` iOS module configures `GIDSignIn` and presents the native Google UI directly. The module rejects recoverable errors, but a Google SDK configuration assertion can terminate the process before the promise returns.
3. The previous local iOS URL scheme was a raw client-ID prefix rather than the required `com.googleusercontent.apps.<ios-client-id-prefix>` reversed scheme.
4. The local environment now contains the corrected scheme, `npm run check:google-config` passes, and Expo prebuild regenerated `ios/Hashie/Info.plist` with the configured scheme.
5. The affected installed app may predate that regenerated configuration. A new build is required; editing local config alone cannot repair an already-installed binary.
6. No Argent device-control tools or attached development terminal are available in this Codex session, so a live reproduction and native crash log cannot yet be captured here. Generic computer automation will not be substituted for required Argent tooling.

## Most likely cause

The app currently being tested was built with an invalid/missing iOS Google URL scheme. This is a configuration-level native crash hypothesis, not a confirmed device trace. A fresh build containing the corrected scheme is the first controlled test.

## Required verification sequence

1. Create a fresh iOS development or preview build with the corrected EAS environment variables.
2. Install it on the test device/simulator; do not test an older installed build.
3. Start Metro/Xcode logging, reproduce exactly one Google-sign-in attempt, and preserve only the exception type, top frames, and non-sensitive error code.
4. If the app remains running, collect the JavaScript diagnostic code rather than raw provider error text.
5. If it terminates, inspect the first native exception for a missing URL scheme, invalid client ID, missing module/pod, or presentation-controller failure.
6. Confirm the fresh app's `Info.plist` includes the reversed iOS scheme and Clerk/Google Cloud both register bundle ID `com.hashie.app`.

## Acceptance criteria

- A newly built iOS binary no longer terminates when Google sign-in is tapped.
- A cancelled sign-in returns harmlessly to Hashie.
- A recoverable provider failure yields a safe app message and development diagnostic code.
- A native failure has a captured, redacted first exception before further code changes are considered.

## Security requirements

- Do not copy OAuth ID tokens, authorization codes, email addresses, client secrets, or full device logs into source control or chat.
- Record only non-sensitive error codes and the minimal native exception needed to identify the configuration defect.
