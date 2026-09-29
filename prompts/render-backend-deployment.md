# Provision Hashie backend on Render

## Goal

Provision a new Render Free web service for the Hashie backend and verify its public
`GET /health` endpoint. This is a migration from the currently unavailable Cloud Run
deployment, not a redeploy.

## Inspected context

- `apps/backend/` on the current development branch builds the intended Supabase-backed
  backend and its `/health` liveness route.
- The public repository is `https://github.com/simiel/Xashie`, but its `main` branch
  does **not** contain `apps/backend/`. It contains the older `hashie-api/` service,
  which expects a PostgreSQL `DATABASE_URL` and has different gateway configuration.
- Render created `hashie-backend` from `main`, but its initial deployment failed before
  starting because the configured root directory did not exist in that branch. No
  deployed instance is serving traffic.

## Original approved scope

1. Create one Render Free web service named `hashie-backend` from the repository's
   `main` branch, using Docker with `apps/backend` as the root directory and its
   existing `Dockerfile`.
2. Set the Render health check path to `/health`.
3. Add only the existing backend's server-side configuration and secret names through
   Render's secret environment-variable mechanism. Values must be copied only through
   an authorized secret-management flow and never displayed in a command, log, prompt,
   repository, or client bundle.
4. Trigger the deployment with the Render CLI, monitor the deployment logs/status, and
   request the deployed `/health` endpoint.
5. Report the generated Render URL. Do not change mobile production configuration in
   this task; pointing the app to the new service is a separate, user-approved change.

## Approved resolution

The user approved merging the current development branch into `main`, then retrying
the Render deployment. `main` is an ancestor of the current branch, so the merge can
be a fast-forward update. The Render service will remain configured to auto-deploy
from `main` with `apps/backend` as its Docker root directory.

## Required server-side configuration (option 2 only)

Non-secret runtime values:

- `NODE_ENV=production`
- `HASHIE_DATA_STORE=supabase`
- `HASHIE_ALLOW_INSECURE_MEMORY_STORE=false`
- `HASHIE_GATEWAY_TOKEN_FILE=/tmp/hashie-gateway-tokens.json`

Required secret values, supplied through Render without disclosure:

- Clerk: secret key, JWT key, publishable key, authorized parties
- Supabase: URL, service-role key
- Model/gateway: OpenAI key, MedGemma base URL, access key, refresh key

## Security and product constraints

- No secrets, health content, user data, tokens, or request bodies may be logged.
- The mobile app must not receive any server-only configuration.
- Render Free may sleep after idle time and is appropriate only for a demo or preview,
  not a dependable health-support production service.
- The service must use Supabase, not the in-memory data store.

## Acceptance criteria (option 2 only)

- Render reports a successful Docker deployment of the intended `hashie-backend`
  service from the Xashie repository.
- The service has only the required server-side configuration and `/health` is set as
  the health check.
- `GET <Render URL>/health` returns HTTP 200 and the expected non-sensitive JSON
  liveness response.
- No application code, mobile configuration, or Google Cloud resources are modified.

## Checks and manual test steps

1. Run the backend's existing typecheck and tests before deployment.
2. Confirm the CLI-selected Render service ID, repository, branch, root directory, and
   runtime before triggering the deploy.
3. Watch the deployment to completion and inspect only safe startup/error logs.
4. Request `/health` and record only HTTP status, latency, and its safe response shape.
5. Confirm that the mobile app remains pointed at its existing backend until a separate
   approval changes its public API URL.
