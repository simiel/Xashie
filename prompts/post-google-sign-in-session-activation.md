# Post-Google-Sign-In Session Activation Fix

## Goal

Fix the iOS/Android flow that completes native Google account selection but remains on the access screen with a generic error. Route only after the updated Clerk session has been observed and Hashie's backend actor activation has completed.

## Confirmed cause

`apps/hashie/app/onboarding/access.tsx` awaits Clerk `setActive()` and then immediately calls `activateSignedInActor()` from the same React render. That callback captures the pre-sign-in `isSignedIn` state. `inspectClerk()` treats the stale `false` value as a missing credential, then the outer catch replaces the cause with the generic Google error.

The native Google sheet succeeding, account selection completing, and no native diagnostic being printed are consistent with this post-provider activation race.

## Scope

1. Let `OnboardingProvider` react to the updated Clerk hook state and activate the server actor after React rerenders.
2. Make the access screen wait for that observable state instead of directly activating the actor from the stale event handler.
3. Report safe development-only diagnostics for backend activation failures: stage, HTTP status, application error code, and request ID only. Never log a token, OAuth code, provider payload, email address, or raw exception.
4. Preserve browser SSO on web and native Google on iOS/Android.
5. Add focused tests for the post-sign-in routing state and diagnostics.

## Backend check

Once the race is removed, the first signed-in backend request is `GET /v1/session`, followed by `GET /v1/me/preferences`. A 401 would indicate Clerk verification/environment mismatch at the backend; a 503 indicates missing Render configuration. The safe client diagnostic and server request ID will distinguish these cases.

## Acceptance criteria

- Selecting and approving a Google account produces an active Clerk session.
- The access screen remains in a loading state only until session activation completes, then routes to onboarding, upgrade, or tabs.
- A backend failure shows a safe message and development diagnostic rather than incorrectly saying Google sign-in failed.
- Guest behavior and web browser SSO are unchanged.
