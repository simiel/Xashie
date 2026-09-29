# Google Sign-In Stall Recovery

## Goal

Ensure the mobile Google button never remains disabled indefinitely, while preserving the native iOS/Android Clerk flow and avoiding a silent browser fallback.

## Evidence

- `AccessScreen` sets `isGoogleConnecting` before awaiting Clerk's native `startGoogleAuthenticationFlow()`.
- The installed Clerk hook awaits both the native Google presentation and the Clerk token exchange. Neither layer has an application-level timeout.
- If either promise never settles, the screen remains disabled as `Connecting…` with no recovery.
- The app's current local client endpoint is an old Cloud Run URL whose `/health` request returns HTTP 500. A signed-in attempt can therefore also wait on session activation while its backend is unavailable. The proposed code must surface that separately rather than blame Google.

## Scope

1. Add an explicit, testable timeout wrapper for the native Clerk Google operation.
2. Map a timeout to a safe, retryable notice and a development-only diagnostic code; never log provider payloads, account data, tokens, or raw exceptions.
3. Bound the post-provider session-activation wait so the button is re-enabled with a service-specific message if Clerk/backend state never converges.
4. Preserve native Google on iOS/Android, browser SSO on web, and the existing guest flow.
5. Do not change the local backend URL: the intended Render service must first prove a working health response.

## Acceptance criteria

- A stalled native Google operation exits `Connecting…` and allows a retry.
- A stalled session activation exits `Connecting…` and names the session/service problem without falsely reporting a Google rejection.
- Cancellation remains non-fatal.
- Focused tests cover timeout classification and the existing session-routing states.

## Checks and manual test

1. Run the TypeScript check and auth-session tests.
2. Rebuild/reload the iOS development app and tap Google once.
3. If the Google sheet appears, finish selection; the app must route or present a safe session/service error, never spin forever.
4. If no sheet appears, wait for the timeout notice, then retry and capture only the displayed diagnostic code from Metro logs.
