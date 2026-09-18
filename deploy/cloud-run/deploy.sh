#!/usr/bin/env bash

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-my-hashie-app}"
REGION="${GCP_REGION:-africa-south1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-hashie-backend}"
REPOSITORY="${ARTIFACT_REPOSITORY:-hashie}"
IMAGE_NAME="${IMAGE_NAME:-hashie-api}"
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT:-hashie-api-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"
if git -C "$ROOT_DIR" diff --quiet -- apps/backend; then
  IMAGE_TAG="${COMMIT_SHA}"
else
  IMAGE_TAG="${COMMIT_SHA}-dirty-$(date -u +%Y%m%d%H%M%S)"
fi

gcloud config set project "$PROJECT_ID" >/dev/null

gcloud builds submit "$ROOT_DIR/apps/backend" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --tag "${IMAGE_URI}:${IMAGE_TAG}" \
  --quiet

IMAGE_DIGEST="$(gcloud artifacts docker images describe "${IMAGE_URI}:${IMAGE_TAG}" \
  --project "$PROJECT_ID" \
  --format='value(image_summary.digest)')"

if [[ -z "$IMAGE_DIGEST" ]]; then
  echo "Unable to resolve the built image digest." >&2
  exit 1
fi

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --image "${IMAGE_URI}@${IMAGE_DIGEST}" \
  --service-account "$RUNTIME_SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --ingress all \
  --max-instances 1 \
  --min-instances 0 \
  --concurrency 20 \
  --timeout 300 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars 'NODE_ENV=production,HASHIE_DATA_STORE=supabase,HASHIE_ALLOW_INSECURE_MEMORY_STORE=false,HASHIE_GATEWAY_TOKEN_FILE=/tmp/hashie-gateway-tokens.json' \
  --set-secrets 'CLERK_SECRET_KEY=hashie-backend-clerk-secret-key:1,CLERK_JWT_KEY=hashie-backend-clerk-jwt-key:1,CLERK_PUBLISHABLE_KEY=hashie-backend-clerk-publishable-key:1,CLERK_AUTHORIZED_PARTIES=hashie-backend-clerk-authorized-parties:1,SUPABASE_URL=hashie-backend-supabase-url:1,SUPABASE_SERVICE_ROLE_KEY=hashie-backend-supabase-service-role-key:1,OPENAI_API_KEY=hashie-backend-openai-api-key:1,MEDGEMMA_BASE_URL=hashie-backend-medgemma-base-url:1,MEDGEMMA_ACCESS_KEY=hashie-backend-medgemma-access-key:1,MEDGEMMA_REFRESH_KEY=hashie-backend-medgemma-refresh-key:1' \
  --labels "app=hashie,component=backend,source-sha=$COMMIT_SHA,image-tag=$IMAGE_TAG" \
  --quiet

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"

printf 'SERVICE_URL=%s\n' "$SERVICE_URL"
printf 'IMAGE_DIGEST=%s\n' "$IMAGE_DIGEST"
printf 'REVISION=%s\n' "$(gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.latestReadyRevisionName)')"
