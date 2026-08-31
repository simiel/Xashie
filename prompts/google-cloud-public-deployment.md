# Google Cloud public deployment plan

## Goal

Deploy the current `hashie-api` through Git push -> Cloud Build -> Artifact Registry -> Cloud Run service `hashie-api`, using Cloud SQL PostgreSQL in `my-hashie-app` / `africa-south1`, with Secret Manager and redacted Cloud Logging. Keep local PostgreSQL and versioned Drizzle migrations portable for development.

## Inspected state

- API checks currently pass: typecheck, lint, 13 unit tests, and production build.
- The checkout is on `main` with unrelated uncommitted API, mobile, web, documentation, and prompt changes; they must not be discarded.
- No Git remote is configured, so Git push and a Git-backed Cloud Build trigger cannot currently be completed.
- Cloud Run `hashie-api` already exists at `https://hashie-api-ghlooukrva-bq.a.run.app`.
- Cloud SQL `hashie-postgres` exists and is `RUNNABLE`, but automated backups are disabled and SSL is not required.
- Artifact Registry repository `hashie` exists in `africa-south1`; Secret Manager resources exist.
- No Cloud Build trigger is configured. Historical builds were manual and use a different environment contract from this checkout.
- The live service uses `AI_*`, `OPENAI_*`, and `HASHIE_GATEWAY_API_KEY` variables, while this checkout uses `HASHIE_GATEWAY_*` variables and defaults the gateway off.

## Release blockers

1. Obtain and configure the canonical Git remote and the intended branch/commit scope.
2. Reconcile the deployed service contract with this repository before rollout; do not silently map or expose provider secrets.
3. Resolve the gateway reference's production blockers: Clerk-compatible/server-to-server authentication, retention/training/deletion terms, Akan reliability and clinical/native-speaker review, and separate speech providers if voice is in scope.
4. Add integration/provider contract tests and explicit safety/accessibility smoke checks. Current tests do not prove the requested deployment gates.
5. Enable Cloud SQL automated backups, enforce an approved TLS/private-connectivity posture, and perform a documented backup/restore test.
6. Define staging, canary, rollback, migration validation, and authenticated/streaming/provider-failure smoke-test credentials and procedures without logging sensitive data.

## Implementation decisions

- Cloud Run remains the API runtime; clients continue to call only the API.
- Cloud SQL receives the same versioned Drizzle migrations; production uses `drizzle-kit migrate`, never `db:push`.
- Secrets remain server-side in Secret Manager and are referenced by Cloud Run; no secret values enter Git or client environments.
- `/health` is liveness and `/ready` checks database readiness. Provider health must be tested separately and must not make liveness unusable.
- Production rollout is blocked until the safety, privacy, provider, and data-protection gates are explicitly passed.

## Acceptance criteria

- Git push starts a Cloud Build pipeline that runs typecheck, lint, unit/integration tests, migration validation, and build.
- Staging deployment passes `/health`, `/ready`, authenticated chat, streaming, provider-failure, safety, and accessibility checks.
- Production uses Cloud SQL with verified backups and restore, Secret Manager references, redacted logs, canary traffic, and a tested rollback path.
- The deployed image and environment variables match this repository's API contract and are traceable to the Git commit.

## Manual verification after approval

Run the full API baseline plus integration/provider checks, validate migrations against a disposable PostgreSQL instance and staging Cloud SQL, deploy staging, execute smoke tests, verify logs and metrics are redacted, then perform a canary and rollback. Only after those results are recorded should production traffic be advanced.
