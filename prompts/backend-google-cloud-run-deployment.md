# Deploy Hashie backend to Google Cloud Run

## Status

Approved and implemented on 2026-09-16. This file records the deployment scope,
accepted expedited risks, and the resulting handoff. It is not a request to repeat
the deployment automatically.

## Goal

Deploy apps/backend as a reachable, monitored Google Cloud service as quickly as
possible, while preserving Hashie's server-side credential boundaries and avoiding
loss of rotated gateway credentials or exposure of private data.

The first release target is Google Cloud Run, backed by Artifact Registry and Secret
Manager. The service must expose the existing API, support guest and
Clerk-authenticated mobile requests, and provide a post-deploy /healthz check.

## Recommendation

- Use a Cloud Run service named hashie-backend unless the user chooses another name.
- Store the image in a regional Artifact Registry Docker repository.
- Build a multi-stage production container from apps/backend and deploy by commit SHA
  or image digest, never by a mutable latest tag.
- Use public HTTPS ingress because guest clients must reach the API. Keep application
  authorization mandatory for protected routes.
- Store all server-only configuration in Secret Manager. Do not put secrets in the
  image, Git, Cloud Run YAML, logs, or the mobile bundle.
- Start with max-instances=1 and document this as a temporary containment measure.
  The current rate limiter and gateway refresh lock are process-local.

## Accepted expedited-deployment risk

The current GatewayTokenManager persists rotating access and refresh tokens to a
Cloud Run's filesystem is not durable across instance replacement, and gateway
refresh tokens are single-use. Per the user's direction, do not add a managed token
store in this deployment slice. Inject the current access and refresh credentials
through Secret Manager and set HASHIE_GATEWAY_TOKEN_FILE to a writable temporary
path such as /tmp/hashie-gateway-tokens.json.

Known consequence: if the service refreshes the credentials and the instance is
later replaced before the rotated pair is captured elsewhere, the new instance
may start from the old bootstrap refresh token and gateway requests may fail until
the credentials are updated. Treat this as an accepted temporary risk, document a
manual credential refresh/redeploy procedure, and do not describe this deployment
as rotation-safe or ready for multi-instance scaling.

Keep max-instances=1 for the first deployment to limit concurrent use of the
single-use refresh token and the process-local rate limiter. This reduces, but does
not eliminate, the restart risk.

## Inspected project context

- apps/backend/src/server.ts starts the Node HTTP server on PORT and preserves
  streamed Fetch-style responses.
- apps/backend/src/app.ts owns /healthz, guest sessions, Clerk actor resolution,
  preferences, guest upgrade, and /v1/agent/stream.
- apps/backend/src/store.ts uses Supabase when its server credentials exist and
  fails closed when persistence is not configured. Memory storage is blocked in
  production.
- apps/backend/src/clerk.ts verifies Clerk bearer tokens server-side.
- apps/backend/src/gateway-token-manager.ts uses a local file for rotated credentials;
  this is intentionally retained for the expedited deployment.
- apps/backend/src/agent.ts uses the Hashie LLM Gateway through the Vercel AI SDK,
  OpenAI only for retrieval embeddings, and plain-text streaming to the client.
- apps/backend/.env.example documents server-only Clerk, Supabase, OpenAI, and
  gateway configuration.
- apps/backend/package.json has typecheck, lint, test, and build checks; start runs
  the compiled server.
- apps/backend/.gitignore excludes local env files and the local token file.
- apps/hashie/lib/hashie-api.ts uses only the public API base URL and sends guest or
  Clerk credentials to the backend.
- Supabase migrations under supabase/migrations define auth persistence and reviewed
  knowledge retrieval; production must have the applicable migrations applied.
- Docker and Cloud Run deployment files were added under apps/backend and deploy/.
- The worktree is already dirty with user changes. Preserve unrelated changes and
  do not reset, clean, or overwrite them.

## Skills and references

Use setup-deploy for deployment detection and health checks.
Use supabase:supabase and supabase:supabase-postgres-best-practices before any
production persistence work. Use openai-developers:agents and ai-sdk guidance when
changing the agent boundary.

Use and verify current syntax from these official Google references:

- https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service
- https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run
- https://docs.cloud.google.com/run/docs/configuring/services/secrets
- https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- https://docs.cloud.google.com/run/docs/container-contract

## Inputs required after approval

Do not invent these values or request secret values in chat.

1. Google Cloud project ID and billing confirmation.
2. Cloud Run region, selected after checking current supported regions and latency
   to Ghana, Supabase, and the gateway.
3. Cloud Run service name and Artifact Registry repository name.
4. Deployment identity: local gcloud user for the first deploy or a named CI account.
5. Generated run.app URL or custom domain. DNS changes require separate approval.
6. Production Clerk mode, authorized parties, and mobile release configuration.
7. Production Supabase project and confirmation that required migrations are applied.
8. Authorized production gateway credentials, entered directly into Secret Manager.
9. OpenAI embedding credential and approved embedding model, entered into
   Secret Manager.
10. Confirmation that the user accepts the known gateway credential restart risk for
    this deployment.
11. Whether the agent may be enabled immediately after synthetic checks or must stay
    disabled until a separate human review.

## Implementation scope after approval

### Container and build

- Add apps/backend/Dockerfile with a pinned supported Node LTS base image, builder
  stage, npm ci from the committed lockfile, TypeScript build, and minimal non-root
  runtime stage.
- Start the compiled server directly with Node. Respect Cloud Run's PORT and use
  8080 as the container default when no value is supplied.
- Add apps/backend/.dockerignore excluding env files, token files, node_modules,
  dist, tests not needed at runtime, and repository artifacts.
- Verify the image has no credentials, local env files, or local token file.
- Leave gateway-token-manager.ts functionally unchanged apart from deployment-safe
  configuration wiring; managed credential rotation is explicitly out of scope.

### Cloud Run and Artifact Registry

- Add a checked-in non-secret deployment definition or script under deploy/.
  Project IDs, secret values, and domains must be deploy-time inputs.
- Enable only the required APIs, expected to include Cloud Run, Artifact Registry,
  Cloud Build if used, Secret Manager, and Service Usage.
- Build and push an immutable image tagged with the reviewed commit SHA.
- Deploy by digest to Cloud Run with public HTTPS ingress, a dedicated least-
  privilege runtime service account, NODE_ENV=production, and Cloud Run's PORT.
- Set max-instances=1 initially. Choose concurrency, memory, CPU, timeout, and
  minimum instances from a short latency check and document the values.
- Keep future admin or operations endpoints private; do not make them public.

### Secret Manager and identity

- Create or reuse separate auditable secrets for server-only values.
- Grant the runtime account only the Secret Manager permissions it needs. Do not
  grant Owner, Editor, broad service-account creation, or unrelated admin roles.
- Pin the Secret Manager versions injected as MEDGEMMA_ACCESS_KEY and
  MEDGEMMA_REFRESH_KEY. Do not add a managed rotation adapter in this deployment.
- Set HASHIE_GATEWAY_TOKEN_FILE to a writable temporary path and document that its
  contents disappear when the Cloud Run instance is replaced.
- Keep HASHIE_ALLOW_INSECURE_MEMORY_STORE=false and do not use memory persistence.
- Verify logs, crash output, revision metadata, and errors contain no secret values.

### Runtime and API readiness

- Add safe production configuration validation that fails closed without telling the
  client which secret is absent.
- Keep /healthz as a cheap process check. If dependency readiness is needed, add a
  separately named protected operational check without exposing dependency details.
- Preserve request IDs, no-store headers, safe JSON errors, ownership checks, guest
  token hashing, size limits, rate limits, and streaming behavior.
- Keep the mobile/backend URL contract stable. Update only client-safe environment
  documentation after the HTTPS URL is confirmed.
- Do not add broad CORS. If Expo web or operations web is in scope, use an explicit
  origin allowlist as a separately reviewed requirement.

### Repeatable deploy path

- Prefer Cloud Build or gcloud automation that builds from a reviewed commit,
  deploys by digest, and prints only non-sensitive resource metadata.
- If CI is included, use a dedicated narrowly scoped deploy account, explicit trigger
  branches, and required backend checks before deployment.
- Do not enable automatic production deploys without separate approval.

## Security and privacy requirements

- Never print, copy, or commit real secret values in source, prompts, fixtures,
  shell history, Cloud Build logs, or the final report.
- Never place Clerk secrets, the Supabase service-role key, OpenAI keys, gateway
  tokens, or Google credentials in the mobile bundle.
- Do not log request bodies, user messages, model output, retrieved health passages,
  credentials, conversation IDs, or raw upstream error bodies.
- Treat Cloud Logging and error reporting as sensitive systems. Document retention,
  access, and the people responsible for reviewing them.
- Do not enable debug endpoints, verbose framework errors, or permissive IAM roles.
- Confirm the mobile client uses the exact approved HTTPS URL.

## Acceptance criteria

- apps/backend builds into a Linux linux/amd64 container and starts on Cloud Run's
  PORT.
- GET /healthz returns HTTP 200 with the existing safe response shape.
- The deployed revision uses an immutable image digest and has a tested rollback.
- The runtime account can read only the approved bootstrap secrets and has no
  permission to write or administer unrelated secrets.
- A synthetic guest can create and resolve a session on the deployed API.
- A dedicated Clerk test account can read, update, and delete only its own preferences.
- Invalid, conflicting, expired, oversized, and rate-limited requests retain safe
  status codes, request IDs, and non-sensitive messages.
- The agent is enabled only after token persistence, Supabase, credentials, and
  approved smoke checks are ready.
- A synthetic non-sensitive agent request streams through Cloud Run without exposing
  upstream credentials or persisting Hashie chat history.
- The deployment report explicitly records that gateway credential recovery after
  instance replacement is not guaranteed in this expedited scope.
- Logs contain safe operational metadata only.
- A rollback command, manual credential refresh/redeploy procedure, single-instance
  warning, cost note, and scaling prerequisites are documented.

## Checks

Before deployment:

1. In apps/backend, run npm ci, npm run typecheck, npm run lint, npm test, and
   npm run build.
2. Review the diff and Docker build context for env files, token files, credentials,
   generated data, and sensitive logging.
3. Build and run the container locally with safe synthetic configuration and verify
   /healthz. Confirm production mode cannot select memory storage.
4. Validate project, region, billing, APIs, IAM, Artifact Registry, and Secret
   Manager configuration without printing values.
5. Confirm Supabase migrations and production Clerk authorized parties.

After deployment:

1. Request https://<approved-service-url>/healthz and record only status and latency.
2. Create and resolve one temporary synthetic guest session, keeping the token only
   in the test process and cleaning up supported test data.
3. Run authenticated preference ownership checks with a dedicated test account.
4. Run synthetic gateway and deployed /v1/agent/stream checks only if the agent gate
   is approved. Do not log generated text or secrets.
5. Verify revision, image digest, instance count, request logs, error rate, and
   rollback metadata.
6. Point a test mobile build at the HTTPS URL and use Argent for guest entry,
   onboarding persistence, signed-in session, streaming, timeout, and unavailable
   service behavior.
7. Verify no server-only value is present in the Expo bundle or mobile env files.

## Exact manual test steps

1. Start from the approved commit in the VS Code terminal.
2. Run backend checks and stop on failures affecting the image or API contract.
3. Build and publish the image to the approved regional Artifact Registry repository.
4. Deploy by digest to the approved Cloud Run service.
5. Request /healthz and confirm HTTP 200.
6. Create one guest session and resolve it through /v1/session without exposing the
   returned token in output.
7. Run one synthetic agent stream if approved.
8. Exercise invalid credentials, oversized input, and rate limiting; confirm safe
   errors and request IDs.
9. Confirm the deployment report records the accepted credential restart risk. Do not
   force a gateway rotation or claim that rotated credentials recover after restart.
10. Use Argent on the test mobile build against the HTTPS backend URL, including
    loading, timeout, and unavailable-service states.
11. Record revision, image digest, health result, smoke result, skipped checks, and
    remaining human/security review.

## Explicitly out of scope

- Deploying the mobile app, operations app, or Supabase itself.
- Direct Google OAuth integration.
- Public launch, domain/DNS changes, or production data migration without approval.
- Replacing Supabase with Cloud SQL, Firestore, Firebase, GKE, or another platform.
- Multi-instance scaling, distributed rate limiting, background workers, queues,
  schedulers, or Workflow migration.
- Enabling Akan/Twi or other gateway languages without quality and safety review.
- Persisting chat history, gateway conversation management, voice, image, tools,
  payments, or treatment-centre actions.

## Approval gate

Before implementation, confirm that:

- Cloud Run + Artifact Registry + Secret Manager is the approved hosting path.
- The managed gateway token-store change and max-instances=1 constraint are included.
- The listed inputs are available through configured environments without pasting
  secrets into chat.
- The user approves the exact files and external systems that may be changed.

Approval response expected: Approve this prompt for implementation.
