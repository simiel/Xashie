# API Guest and Clerk Boundary

## Goal

Establish Hashie’s first server-owned API slice in `apps/backend` for guest sessions, Clerk session verification, onboarding preference access, and consented guest-to-account handoff. The mobile app must call this API for application state; it must not implement authentication, persistence, authorization, or privileged data access itself.

Hashie remains a Ghana-focused health education and support product. It is not a doctor, emergency service, diagnostician, prescriber, therapist, or autonomous clinical decision-maker.

## Skills and guidance

- Clerk Expo and Clerk backend guidance for server-side session verification and browser-based Google authentication boundaries.
- Supabase and Supabase Postgres best practices for server-only database access, migrations, RLS, and sensitive-data handling.
- Vercel API conventions and the repository root `AGENTS.md`.

## Inspected project state

- `apps/backend` currently contains only `.gitkeep`; no framework, routes, package manifest, database adapter, or tests exist there.
- `apps/hashie` is an Expo Router mobile app with a custom branded access screen. It currently opens a Google sign-in webpage as a temporary behavior and has no Clerk integration.
- The repository architecture assigns API, authorization, persistence, safety, and orchestration to `apps/backend`.
- The repository architecture assigns Supabase Postgres to application data and Clerk to identity, sessions, Google sign-in, and account management.
- No Clerk or Supabase credentials are present in the inspected repository.

## Decisions and assumptions

- Scaffold a minimal TypeScript, Vercel-compatible backend workspace under `apps/backend`, keeping provider-specific code behind interfaces and avoiding an unnecessary web UI framework.
- Use Clerk as the identity provider. Google authentication is initiated by the mobile client through Clerk’s supported browser-based flow; Hashie does not implement a custom Google OAuth server or accept raw Google tokens.
- Verify authenticated requests on the server using Clerk’s server SDK and a server-managed secret. Never trust a user ID, session ID, or role supplied in a request body or client metadata.
- Treat a guest as a Hashie-managed actor, not as a fake anonymous Clerk user. Issue a cryptographically random opaque guest-session token once, store only a hash and minimal metadata server-side, enforce expiry and revocation, and rate-limit guest creation and use.
- Represent the authenticated actor explicitly as either `guest` or `clerk-user`; reject requests that present conflicting guest and Clerk credentials.
- Use Supabase Postgres through a server-only data-access adapter for durable guest sessions and approved onboarding preferences. The service-role credential must never be exposed to the mobile app or bundled client code.
- Collect only the approved onboarding fields: language, optional nickname, broad age group, and accessibility preferences, plus the access/session actor needed to authorize them. Do not add health history, diagnosis, exact birth date, contact details, or other sensitive fields.
- Require explicit consent for guest-to-account migration. Migrate only eligible preference data, make the operation idempotent, expire the guest session after success, and preserve a clear failure path that does not delete guest data prematurely.
- Use typed request/response contracts and runtime validation at every public API boundary. Use a small validation dependency only if it is justified and pinned.
- Return generic, non-sensitive errors to clients; redact tokens and preference values from logs; include safe correlation IDs for debugging.
- Keep the initial API slice independent of AI, health content, check-in scoring, operations tooling, analytics, and external service calls beyond Clerk verification and Supabase persistence.

## API contract

Implement versioned routes under `/v1` with consistent JSON responses and an error envelope:

1. `GET /healthz`
   - Public liveness response with no secrets or user data.

2. `POST /v1/guest-sessions`
   - Creates a guest actor with a short, documented expiry.
   - Returns the opaque guest token exactly once plus non-sensitive expiry/session metadata.
   - Does not accept a user ID or arbitrary ownership fields.

3. `GET /v1/session`
   - Resolves the caller as guest, authenticated Clerk user, or signed out.
   - Returns only safe actor status and capability flags; never returns raw token material.

4. `GET /v1/me/preferences`
   - Returns the caller’s approved onboarding preferences when a valid guest or Clerk actor is present.

5. `PATCH /v1/me/preferences`
   - Validates and updates only language, nickname, broad age group, and accessibility preferences.
   - Applies ownership checks and preserves guest/account boundaries.

6. `POST /v1/guest-sessions/upgrade`
   - Requires a valid Clerk session and a valid guest session plus explicit migration consent.
   - Transfers only eligible preferences, is safe to retry with an idempotency key, expires the guest session after a successful merge, and never links accounts based only on a client-supplied email or user ID.

7. `DELETE /v1/me/preferences`
   - Deletes the caller’s stored onboarding preferences where policy permits, without implying account deletion. If the data model cannot safely support this in the first slice, document it as an explicit follow-up rather than exposing a misleading endpoint.

## Security and privacy requirements

- Keep `CLERK_SECRET_KEY`, Supabase service credentials, signing material, and database URLs in managed server secrets only. Do not commit `.env` files or print secret values.
- Validate Clerk issuer, token signature, expiry, and session/user claims using the supported Clerk server library. Do not write custom JWT verification.
- Hash guest tokens before persistence, use constant-time comparisons where applicable, and prevent token reuse after expiry, revocation, or successful upgrade.
- Apply request size limits, basic rate limiting for guest creation and upgrade, origin/transport assumptions appropriate to the deployed API, and safe error handling.
- Enable RLS on every exposed Supabase table, write ownership-aware policies, and keep privileged service-role access inside the backend adapter. Do not rely on client metadata or `auth.role()` for authorization.
- Store only the fields required for the approved experience. Define retention, deletion, and migration behavior in code comments or backend documentation.
- Never log raw Authorization headers, guest tokens, nicknames, accessibility details, or full preference payloads.
- Do not call Google directly from the backend for authentication; Clerk owns the identity provider exchange.

## Testing and verification

- Add unit tests for validation, actor resolution, guest expiry/revocation, conflicting credentials, authorization, idempotent upgrade, deletion behavior, and redacted error handling.
- Add API-level tests with fake Clerk verification and a fake data adapter so tests do not require real credentials or real user data.
- Add migration SQL through the repository-approved Supabase migration workflow only after the user approves the schema and provides configured project access through managed secrets.
- Run backend type checks, linting, unit/API tests, and the production-compatible build command defined by the created workspace.
- Verify that mobile code contains no direct database, Clerk secret, Google OAuth, or privileged API calls.
- Use safe fixtures only; never use real health or identity data.

## Acceptance criteria

- `apps/backend` is a runnable, typed API workspace with documented local and deployment configuration.
- Health, guest session, actor resolution, preferences, and upgrade contracts are implemented or explicitly marked with a tested, non-misleading boundary.
- Authenticated requests are authorized from verified Clerk server context; guest requests are authorized from expiring Hashie guest sessions.
- Guest and authenticated data cannot cross ownership boundaries without explicit consented upgrade.
- All approved onboarding fields can be validated, read, changed, and deleted according to the defined actor policy.
- No secrets, real credentials, raw tokens, or sensitive user data are committed or logged.
- Tests cover success, expiry, invalid credentials, unauthorized access, retries, and provider failures.

## Required inputs before external integration

- A real Clerk publishable key for the mobile app and a Clerk server secret configured through the project’s managed environment; do not paste either into chat.
- A Supabase project URL and server-only service credential configured through the managed environment if durable persistence is included in this implementation slice.
- Confirmation that the proposed `/v1` contract and guest retention/upgrade policy are approved.

If those inputs are not available yet, implement and test the provider interfaces, request contracts, and fake adapters only; do not invent credentials or silently substitute an insecure in-memory production path.

## Implementation rule

Do not begin backend code or schema changes until this prompt is explicitly approved. After approval, implement only this API boundary, request any missing managed-environment setup, run the required checks, and report passed, failed, skipped, and pending verification separately.
