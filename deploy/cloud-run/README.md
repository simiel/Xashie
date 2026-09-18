# Hashie backend Cloud Run deployment

This deployment uses the Google Cloud project, region, and Artifact Registry
repository configured by the operator. The helper deploys an immutable image built
from apps/backend and binds server-only values from Secret Manager.

Defaults:

- Project: my-hashie-app
- Region: africa-south1
- Artifact Registry repository: hashie
- Image: hashie-api
- Cloud Run service: hashie-backend
- Runtime service account: hashie-api-runtime
- Maximum instances: 1

The deployment intentionally uses the current gateway access and refresh credentials.
The backend may persist a rotated pair only in the instance's temporary filesystem.
If that instance is replaced after rotation, the bootstrap credentials may need to be
updated and redeployed manually.

Required Secret Manager secrets, each pinned at version 1:

- hashie-backend-clerk-secret-key
- hashie-backend-clerk-jwt-key
- hashie-backend-clerk-publishable-key
- hashie-backend-clerk-authorized-parties
- hashie-backend-supabase-url
- hashie-backend-supabase-service-role-key
- hashie-backend-openai-api-key
- hashie-backend-medgemma-base-url
- hashie-backend-medgemma-access-key
- hashie-backend-medgemma-refresh-key

Never commit secret values or put them in this file. Create the secrets and grant the
runtime service account access before running deploy.sh.

## Current deployment

- Service URL: https://hashie-backend-ghlooukrva-bq.a.run.app
- Health check: https://hashie-backend-ghlooukrva-bq.a.run.app/health
- Compatibility health check: https://hashie-backend-ghlooukrva-bq.a.run.app/healthz/
- Exact /healthz is intercepted by the Cloud Run frontend and returns 404; use /health.
- Revision: hashie-backend-00002-gzf
- Image digest: sha256:c29c5c1297dde3c5848f0c766cf83fbc86a368e781719c5708c70a38d0104a40
- Traffic: 100% to the current revision
- Service-level maximum instances: 1
- Service-level minimum instances: 0
- Region: africa-south1

For the mobile app, set the client-safe value:

    EXPO_PUBLIC_HASHIE_API_BASE_URL=https://hashie-backend-ghlooukrva-bq.a.run.app

The mobile client sends guest requests with X-Hashie-Guest-Token and signed-in
requests with Authorization: Bearer <Clerk session token>. Native mobile requests
do not require CORS. Expo web requests will need an explicit backend origin allowlist
before browser use is enabled.

The agent endpoint is deployed and was validated from the mobile smoke test: a guest
request to /v1/agent/stream returned a non-empty educational response. A separate
local-shell smoke test previously saw a DNS resolution failure for the configured
MEDGEMMA_BASE_URL, so run the deployed synthetic stream check again after any gateway
or networking change. If the gateway becomes unavailable, replace only that
server-side Secret Manager value with the verified gateway URL, then deploy a new
revision. Do not put gateway credentials in the mobile app.

For a later deployment, override non-secret settings with GCP_PROJECT_ID,
GCP_REGION, CLOUD_RUN_SERVICE, ARTIFACT_REPOSITORY, IMAGE_NAME, or
RUNTIME_SERVICE_ACCOUNT. Do not use a mutable latest image tag.
