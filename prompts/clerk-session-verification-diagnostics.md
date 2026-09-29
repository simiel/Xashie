# Clerk session verification diagnostics

## Goal

Identify why a completed native Google sign-in is rejected by the Render backend without exposing session tokens, user identifiers, or Clerk secrets.

## Inspected code and deployment

- `apps/hashie/components/onboarding-provider.tsx` sends the current Clerk token to `/v1/session` and turns every 401 into the same recovery message.
- `apps/backend/src/clerk.ts` catches all Clerk verification outcomes and reduces them to `invalid` without retaining the reason.
- `apps/backend/src/app.ts` returns a request ID but does not log the Clerk rejection with that ID.
- Render has live Clerk key types, but its active `CLERK_AUTHORIZED_PARTIES` had development localhost values during this investigation.

## Decisions

- Preserve the existing generic user-facing error; do not reveal backend configuration or JWT claims in the mobile UI.
- Log only a safe diagnostic: request ID, a sanitized verification outcome, token issuer origin, authorized-party origin, and JWT key ID. Never log a token, `sub`, session ID, email, or any secret.
- Associate the server log with the response request ID so a tester can report it safely.
- Keep the existing session-handoff and bounded Google sign-in behavior intact.

## Requirements

- The backend must distinguish an unauthenticated Clerk response from a verifier exception in structured logs.
- Token metadata must be parsed defensively and only emit safe, bounded origin/key values.
- Runtime response behavior remains a 401 `invalid_credentials` for invalid bearer tokens.

## Acceptance criteria

- A valid verified Clerk token produces no rejection diagnostic.
- An invalid token produces a token-safe structured diagnostic with the response request ID.
- Existing backend and mobile session tests pass, TypeScript passes, and no unrelated files are staged or deployed.

## Manual test

1. Deploy the backend and install/reload the mobile app build that points to Render.
2. Complete Google sign-in once.
3. Locate the response `x-request-id` and matching Render log entry.
4. Compare its `authorizedParty` with `CLERK_AUTHORIZED_PARTIES`; correct only the matching origin.
