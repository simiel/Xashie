# Hashie API v2 mobile deployment handoff

## Production API

- API base URL: `https://hashie-api-v2-239035662159.africa-south1.run.app`
- Health check: `GET /health`
- Readiness check: `GET /ready`
- API documentation: `GET /docs`
- Chat endpoint: `POST /v1/conversations/:id/messages`
- Chat response: authenticated Server-Sent Events stream

The existing `hashie-api` service and its database remain separate. Mobile must use the v2 base URL above for this current system.

## Mobile environment

Set the client API URL using the mobile app's existing environment variable:

```text
EXPO_PUBLIC_HASHIE_API_URL=https://hashie-api-v2-239035662159.africa-south1.run.app
```

The mobile app must not receive the database URL, gateway token, Clerk secret, webhook secret, or any other server credential. There is no API key for the Hashie API; authenticated requests send a Clerk bearer token obtained from the mobile Clerk session.

## Clerk

The v2 API validates Clerk tokens server-side. The mobile build needs the Clerk publishable key from Secret Manager entry `hashie-v2-clerk-publishable-key`; retrieve it through the team's approved secret-delivery process. Do not copy the Clerk secret key or webhook signing secret into the mobile app.

Before release, verify the mobile Clerk instance and the API's authorized-party/audience settings use the same production Clerk configuration. A real signed-in mobile session must complete one chat request and one streaming response.

## Verified checks

- Cloud Run revision: `hashie-api-v2-00002-pmk`
- Cloud Build: `d7700612-a63f-4eb8-8793-b9c347582cd4`
- Image: `africa-south1-docker.pkg.dev/my-hashie-app/hashie/hashie-api-v2:97fd749`
- Cloud SQL: `hashie-postgres-v2`, database `hashie`, migrated successfully
- `/health`: 200
- `/ready`: 200 with database `ok`
- Unauthenticated chat: 401 from the API

## Mobile release smoke test

1. Configure `EXPO_PUBLIC_HASHIE_API_URL`.
2. Sign in with the production Clerk instance.
3. Create/select a conversation and send an English message.
4. Confirm streamed text renders incrementally and ends cleanly.
5. Repeat with `tw` only after the Akan provider evaluation is approved.
6. Confirm sign-out, expired-session handling, retry, captions/transcripts, and error states.

## Cloud Build note

The repository contains `cloudbuild.yaml` and the initial build was run manually. Automatic GitHub push triggering still needs a one-time Google Cloud GitHub connection/authorization in `my-hashie-app`; the project currently has no connected repository trigger. After connecting GitHub, create a main-branch trigger pointing to `cloudbuild.yaml` and use `_IMAGE_TAG=$COMMIT_SHA` for trigger builds.
