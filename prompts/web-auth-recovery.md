# Web guest and Google sign-in recovery

## Goal

Restore guest-session creation and Google sign-in on the deployed Hashie web app.

## Observed issue

The user reports that neither access path works after the marketing-site deployment and environment synchronization.

## Investigation plan

1. Reproduce both flows against the live onboarding route and inspect browser console/network-visible failures.
2. Check public build configuration, client storage behavior on web, backend CORS/auth boundaries, and Clerk web redirect/origin settings.
3. Apply the smallest web-safe fix that preserves native behavior and server-owned authorization.
4. Validate guest navigation and the Google redirect handoff locally and on the custom domain, then publish.

## Constraints

- Use only public `EXPO_PUBLIC_*` configuration on the web client.
- Do not expose Clerk, backend, or OAuth secrets.
- Keep guest writes through the backend API and Clerk authentication through Clerk.
- Preserve iOS and Android flows.

## Acceptance criteria

- Guest access creates/activates a guest session from the web.
- Google sign-in opens the Clerk Google flow and returns to the Hashie web app.
- The backend accepts web-originated guest requests.
- Production export and relevant tests pass.
