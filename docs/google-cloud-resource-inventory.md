# Google Cloud resource inventory

## Scope and date

This is a read-only inventory of Google Cloud project `my-hashie-app`, prepared
2026-09-15 (Africa/Accra). The active gcloud account was
`smenxah@gmail.com`. The primary deployment region is `africa-south1`.

No resource was stopped, deleted, scaled, disabled, or otherwise modified while
preparing this document. Secret payloads, tokens, credentials, auth headers, and
private user content were not read or recorded.

## Architecture at a glance

```text
Web / mobile clients
        |
        | Clerk session token; HTTPS
        v
Cloud Run API
  hashie-api       (prior generation)
  hashie-api-v2    (current documented generation)
        |
        +--> Cloud SQL PostgreSQL
        |      hashie-postgres       (prior)
        |      hashie-postgres-v2    (current)
        |
        +--> LLM gateway / AI providers through server-only credentials
        |
        +--> Cloud Storage audio
               my-hashie-app-hashie-audio (prior API integration)

Cloud Run web frontends
  hashie-web       (prior generation)
  hashie-web-v2    (current documented generation)

Cloud Build --> Artifact Registry --> Cloud Run revisions
     |                 |
     +--> Cloud Build bucket     +--> deployed image digests

Secret Manager --> Cloud Run services and web runtime
Cloud Logging  --> managed _Default and _Required log buckets
```

The local Xashie development run is separate from these resources: it uses the
local API, local PostgreSQL, Expo/Android, and a local `.env`. None of the cloud
resources is required for that local run.

## Current documented v2 generation

These resources are the current deployed generation described by the repository
deployment documents. They should be retained unless the user separately
approves taking the deployed environment offline.

| Resource | State / activity | Dependencies and notes |
| --- | --- | --- |
| Cloud Run service `hashie-api-v2` | `RUNNABLE`; `africa-south1`; created 2026-08-31; URL `https://hashie-api-v2-ghlooukrva-bq.a.run.app`; revision `hashie-api-v2-00009-tzx` receives 100% traffic | Image `hashie-api-v2:prompt-safety-20260831`; attached Cloud SQL `hashie-postgres-v2`; uses v2 database, Clerk webhook, Clerk server, and gateway-token secrets; max scale 3, 512 MiB container |
| Cloud Run service `hashie-web-v2` | `RUNNABLE`; `africa-south1`; created 2026-08-31; URL `https://hashie-web-v2-ghlooukrva-bq.a.run.app`; revision `hashie-web-v2-00002-7vm` receives 100% traffic | Image `hashie-web-v2:prompt-safety-20260831`; uses v2 Clerk publishable-key secret; configured to call the v2 API |
| Cloud SQL instance `hashie-postgres-v2` | `RUNNABLE`; PostgreSQL 16; `africa-south1`; created 2026-08-31; tier `db-g1-small`; activation policy `ALWAYS` | Database `hashie` and database `postgres`; SSL required/trusted-client mode; automated daily backups were successful through 2026-09-14 |
| Secrets `hashie-v2-clerk-publishable-key`, `hashie-v2-clerk-secret-key`, `hashie-v2-clerk-webhook-signing-secret`, `hashie-v2-database-url`, `hashie-v2-gateway-token` | Enabled versions; publishable key has two enabled versions observed | Referenced by the v2 Cloud Run services. Do not delete or rotate without confirming v2 consumers and the gateway/auth contract |
| v2 Artifact Registry images | Retained in repository `hashie`; current tags include `97fd749`, `28b9eb6`, `dee95c2`, `f121fd8`, and `prompt-safety-20260831` across API/web v2 images | Keep the deployed digest and a rollback window before pruning |
| Cloud Run job `hashie-api-v2-migrate` | Retained job definition; five completed successful executions, created 2026-08-31 | Migration job is not an active request-serving service; retain its history until rollback/migration needs are accepted |

Recent log activity was observed for `hashie-api-v2` on 2026-09-08. The v2 web
service did not return a recent entry in the bounded 30-day log query; this is
not proof that it is unused.

Repository references:

- `docs/hashie-api-v2-mobile-deployment.md`
- `docs/hashie-api-v2-provider-operations.md`
- `docs/hashie-web-v2-deployment.md`
- `cloudbuild.yaml`

## Prior non-v2 generation

These resources appear to be the earlier deployed generation and are shutdown
candidates only after checking whether any client, bookmark, webhook, or
operator still uses their URLs.

| Resource | State / activity | Dependencies and notes |
| --- | --- | --- |
| Cloud Run service `hashie-api` | `RUNNABLE`; `africa-south1`; created 2026-07-05; URL `https://hashie-api-ghlooukrva-bq.a.run.app`; revision `hashie-api-00023-v9m` receives 100% traffic | Image `hashie-api:a4a02922…`; attached Cloud SQL `hashie-postgres`; uses old Clerk, database, AI gateway, OpenAI, webhook, and audio configuration; max scale 3, 512 MiB container |
| Cloud Run service `hashie-web` | `RUNNABLE`; `africa-south1`; created 2026-07-07; URL `https://hashie-web-ghlooukrva-bq.a.run.app`; revision `hashie-web-00003-575` receives 100% traffic | Image `hashie-web:19db0890…`; uses the old-generation Clerk secrets and API configuration |
| Cloud SQL instance `hashie-postgres` | `RUNNABLE`; PostgreSQL 16; `africa-south1`; created 2026-07-06; tier `db-f1-micro`; activation policy `ALWAYS`; 10 GB PD-SSD | Database `hashie` and database `postgres`; public IPv4 authorized network observed; `requireSsl=false`; automated backups disabled. Attached to prior `hashie-api` |
| Cloud Storage bucket `my-hashie-app-hashie-audio` | `AFRICA-SOUTH1`; approximately 10.25 MiB observed | Contains user-scoped assistant TTS MP3 objects for at least three users. This is health-related audio/PII and must not be deleted without retention/export/deletion approval |
| Secrets `hashie-ai-gateway-api-key`, `hashie-clerk-publishable-key`, `hashie-clerk-secret-key`, `hashie-clerk-webhook-signing-secret`, `hashie-database-url`, `hashie-llm-gateway-api-key`, `hashie-openai-api-key` | One enabled version observed for each | Referenced by the prior API/web services. Revoke/rotate consumers before deleting; never expose values |
| Prior Cloud Run revisions | `hashie-api`: 23 total; `hashie-web`: 3 total | Older revisions report Ready but have no allocated traffic in the service listing. They are retained rollback artifacts, not independently receiving traffic |
| Cloud Run job `hashie-api-migrations` | Retained job definition; six completed successful executions, created 2026-07-07 | Migration history/configuration, not an active execution |
| Prior Artifact Registry images | Old API/web images include July tags such as guest-AI, gateway, and manual builds plus untagged digests | Candidate for cleanup only after a rollback window and dependency check |

Recent log activity was observed for the prior API on 2026-09-01 and prior web
on 2026-09-14. These timestamps make the prior services active candidates for
usage verification rather than automatically safe-to-stop resources.

## Shared, retained, or unclear resources

| Resource | Observed state | Classification |
| --- | --- | --- |
| Artifact Registry repository `hashie` | Docker repository in `africa-south1`; created 2026-07-05; updated 2026-08-31; approximately 969.8 MB | Shared by prior and v2 services. Retain current images; prune old digests individually only after rollback review |
| Cloud Storage bucket `my-hashie-app_cloudbuild` | US bucket; approximately 624 MiB under the observed `source/` prefix | Shared Cloud Build source archives. Review retention and source sensitivity before cleanup |
| Managed logging bucket `_Default` | Global; 30-day retention | Platform log retention; do not delete casually |
| Managed logging bucket `_Required` | Global; 400-day retention | Required audit log retention; do not alter without a compliance decision |
| Service account `hashie-api-runtime@my-hashie-app.iam.gserviceaccount.com` | Enabled; used by prior API/web and old secret access | Shared with prior generation; do not disable until all bindings and services are migrated |
| Service account `hashie-github-deployer@my-hashie-app.iam.gserviceaccount.com` | Enabled; no user-managed keys returned | Deployment configuration; usage is unclear and should be reviewed before disabling |
| Service account `239035662159-compute@developer.gserviceaccount.com` | Enabled; used by v2 API/web and v2 secret access | Current v2 dependency; retain while v2 is live |
| Cloud Build triggers | No triggers returned | No automatic GitHub trigger was found; this is configuration absence, not a billable runtime |
| Cloud Build service logs | Recent builds are retained in Cloud Build logs/source storage | Retain until build provenance and rollback records are no longer needed |

The project billing account is enabled. Cloud SQL instances with activation
policy `ALWAYS`, Cloud Run services while handling requests, Artifact Registry
storage, Cloud Storage data, Cloud Build storage, and logging retention can all
have cost or retention implications.

## Artifact Registry and build history

The `hashie` repository contains both generations:

- `hashie-api` and `hashie-web` images from July 2026, including guest-AI,
  gateway, and manual builds.
- `hashie-api-v2` and `hashie-web-v2` images from August 2026, including the
  current prompt-safety tag and earlier deployment tags.

Recent successful builds include:

- `8e039b5f-f3ae-4cf7-a217-dd0882413f41` — 2026-08-31; produced the v2
  prompt-safety API and web images.
- `474c270c-b2fd-4823-b593-443f318a97bb` — 2026-07-07; prior web guest-AI
  image.
- `88fda975-2685-4a3c-869d-aa1e12c9cec5` — 2026-07-07; prior API guest-AI
  image.

No Cloud Build trigger was returned. The repository’s `cloudbuild.yaml`
describes a v2 API migration job and v2 API/web deployment flow, but the
inventory found no connected automatic GitHub trigger.

## Networking and unchecked categories

No Pub/Sub topics/subscriptions, Cloud Tasks queues, Cloud Scheduler jobs,
Compute Engine instances, GKE clusters, Cloud Functions, App Engine
application, or Monitoring alert policies were returned by the read-only
queries. No custom logging sink was found; only the managed `_Default` and
`_Required` buckets were present.

The following limitations matter:

- Cloud Asset Inventory API is disabled in this project, so a global asset
  search could not be used.
- Compute Engine API is disabled, so VPC networks, forwarding rules, reserved
  IPs, backend services, routers, and load balancers could not be conclusively
  enumerated through gcloud. Direct Cloud Run URLs were observed, but absence
  of a separately managed network resource is not proven.
- Some installed gcloud commands for Firebase, Dataform, and Monitoring
  notification channels were unavailable. Firestore reported no database,
  BigQuery returned no datasets, and App Engine reported no application; these
  should be treated as query results rather than a substitute for Asset
  Inventory.
- No secret payloads were read. Secret names and service bindings above are
  configuration metadata only.

## Proposed safe shutdown order

This is a proposal, not an authorization to act:

1. Confirm whether the prior API/web URLs are still used by clients,
   integrations, webhooks, or operators. Confirm whether v2 remains live.
2. For `hashie-postgres`, take an approved backup/export and decide the
   retention period. For `my-hashie-app-hashie-audio`, decide whether audio is
   to be exported, retained, or deleted under the approved data policy.
3. Stop or remove traffic from prior Cloud Run services `hashie-api` and
   `hashie-web`, then monitor logs and client errors during an agreed window.
4. After the old services are confirmed unused, stop/delete the prior Cloud
   SQL instance `hashie-postgres` only with explicit data-retention approval.
5. Revoke or rotate old provider, Clerk, webhook, and database credentials;
   delete old Secret Manager entries only after all consumers are removed.
6. Prune prior Cloud Run revisions and unreferenced old image digests/tags,
   retaining a documented rollback set.
7. Review Cloud Build source archives, audio storage, and log retention before
   deleting data or shortening policies.

Do not change `hashie-api-v2`, `hashie-web-v2`, `hashie-postgres-v2`, v2
secrets, current v2 image digests, the required logging bucket, or shared
service accounts without separate approval. Any action affecting the old SQL
database or audio bucket requires an explicit data-retention decision first.
