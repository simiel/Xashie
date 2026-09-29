# Google Sign-In Guest Handoff Fix

## Goal

Complete Google sign-in on iOS and Android when a device also has a stored guest session, without waiting indefinitely for the generic session-restoration path.

## Confirmed cause

After native Google sign-in calls Clerk `setActive`, `AccessScreen` invokes `refreshSession()`. When secure storage records `guest` as the selected actor, `OnboardingProvider.refreshSession()` intentionally restores only that guest and passes `clerk: 'missing'` to its reconciliation decision. The new authenticated Clerk session is therefore ignored. `AccessScreen` then waits for a `clerk-user` actor while the provider has activated a guest actor, causing `SESSION_ACTIVATION_TIMEOUT` on both iOS and Android.

This is a client actor-selection bug, not a Google SDK timeout or Render availability issue. Render's public health and credential-free session endpoint now return HTTP 200.

## Scope

1. After Google authentication activates a Clerk session, call the explicit signed-in actor activation operation rather than generic cold-start restoration.
2. Use the operation's returned guest-upgrade and preference state to route directly to upgrade, onboarding, or tabs.
3. Retain native Google timeout/error handling, guest flow, and web browser SSO.
4. Remove the waiting state machine that assumes generic restore will select the Clerk actor.
5. Add focused routing tests for the explicit signed-in activation result.

## Acceptance criteria

- A device with a stored guest can sign in with Google and reaches guest upgrade rather than timing out.
- A signed-in user without a guest session reaches onboarding or tabs based on preferences.
- A real backend or Clerk failure shows its existing safe error rather than `SESSION_ACTIVATION_TIMEOUT`.

## Checks and manual test

1. Run TypeScript and auth-session tests.
2. On iOS and Android, start as a guest, complete Google sign-in, and confirm upgrade is offered.
3. Repeat without a guest session and confirm direct onboarding or tabs routing.
