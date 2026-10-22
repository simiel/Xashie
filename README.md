# Hashie

Hashie is a private health-education app for teens and young adults in Ghana. People can browse a sexual and reproductive health library that ships on the device, or ask a text assistant that answers from that same approved material. The app supports English and Akan/Twi preferences, guest access, and Google sign-in, and it is built for sight- and hearing-related accessibility needs. Hashie is education and support: its agent instructions tell it to stay clear of diagnosis, prescriptions, and emergency or clinical decisions, and to point people toward qualified care when a concern needs a person.

Built by Samuel Adjei Mensah ([@simiel](https://github.com/simiel)). The Expo project owner is `simiel`. The GitHub repository is [simiel/Xashie](https://github.com/simiel/Xashie).

## What this demonstrates

- **A safety boundary that is enforced in code.** Age group changes how the server asks the model to write. Accessibility choices change type size and contrast in the app and how the model is told to explain things. Retrieval runs before any model call. If retrieval is unavailable, the API returns `503` and does not answer from general model knowledge.
- **A strict client/server split.** The Expo app calls Hashie’s API and Clerk. Supabase, embeddings, and the model gateway are server-only. Guest tokens are random opaque values; the database stores SHA-256 hashes. Row-level security denies `anon` and `authenticated` access to application tables.
- **Grounded question answering.** Each accepted question is embedded, matched with pgvector against approved passages (up to four, similarity threshold `0.55`), and sent to the model as the only factual basis for health claims. A completed lookup with no match may still reach the model, with an instruction that it cannot verify health facts from general knowledge. User text and retrieved passages are treated as data, not as instructions.
- **Session design for sensitive use.** Guest sessions last 24 hours. Moving guest preferences onto a Clerk account requires both credentials, explicit consent, and an `Idempotency-Key`. Ask Hashie keeps the message list in the running app session. It does not write chat content to SecureStore, AsyncStorage, or Hashie’s database.
- **A content pipeline with two readers.** One canonical question-and-answer file is compiled into a hashed offline library for the phone and ingested as 1,536-dimension embeddings for the agent. The generated library contains **5,524** usable entries (from 5,536 source rows) across **18** topics.
- **An accessible mobile product surface.** Expo Router, a tokenized design system (Plus Jakarta Sans), skippable onboarding, and preferences for larger text, higher contrast, captions, visual descriptions, and hearing-related needs.
- **Delivery work that matches the architecture.** A multi-stage Node 22 image, Cloud Run and Render deployment notes, and EAS profiles for internal Android APKs, an iOS simulator build, and a production APK.

## Features

### Mobile app (`apps/hashie`, version 1.0.0)

- Onboarding for guest access or Google sign-in, language (English or Akan/Twi), an optional nickname, a broad age group, and accessibility preferences. Each step can be skipped where the screen allows it.
- Tabs for Home, Learn, Ask, Check-in, and Profile.
- An offline learning library: topics, sections, questions, full answers, and on-device search.
- Ask Hashie: streaming replies, starter questions, stop and retry, a 1,200-character message limit, and bounded recent history (eight messages). A guest session or signed-in account is required; the library stays available without one.
- Profile review and edit of saved choices, ending a guest session, signing out, and an explicit review step before guest preferences move to a Google account.
- Google sign-in through Clerk’s native flow on iOS and Android, and Clerk browser SSO on web. Native guest credentials use SecureStore. Web guest credentials stay in the browser session.

### Backend API (`apps/backend`)

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/health`, `/healthz` | Process health. Cloud Run notes say to use `/health`. |
| `POST` | `/v1/guest-sessions` | Create a 24-hour guest session and return its token once. |
| `GET` | `/v1/session` | Resolve guest, Clerk user, or signed-out state. |
| `GET`, `PATCH`, `DELETE` | `/v1/me/preferences` | Read, update, or delete the current actor’s preferences. |
| `POST` | `/v1/guest-sessions/upgrade` | Move guest preferences to a Clerk user. |
| `POST` | `/v1/agent/stream` | Stream a plain UTF-8 reply for a guest or Clerk actor. |

Guest requests use `X-Hashie-Guest-Token`. Signed-in requests use `Authorization: Bearer` with a Clerk session token. The upgrade route is the one that accepts both. The API does not take an owner id from the client.

### Learning library

The offline library and the retrieval corpus share one source, `artifacts/data/healthQAdata.json`. Topics in the generated library:

- Puberty Education
- Sexual Education
- Reproductive Health Services
- Gender and Sexual Identity
- Mental Health
- Peer Pressure and Decision-Making
- Preventing Sexual Violence
- Social and Cultural Context
- STI/HIV Prevention and Education
- Parental Communication
- Legal and Ethical Considerations
- Access to Healthcare
- Education and Empowerment
- Media Literacy
- Crisis Intervention and Support
- Sexual and Reproductive Rights
- Global Perspectives on ASRH
- Economic Empowerment

## Tech stack

- **Language:** TypeScript, with `strict` enabled in both the mobile app and the backend.
- **Mobile:** React Native 0.86, React 19.2, Expo SDK 57, Expo Router, `react-native-reanimated`.
- **Auth:** Clerk (`@clerk/expo`, `@clerk/expo-google-signin`, `@clerk/backend`).
- **API:** Node.js HTTP server. The request handler speaks the Fetch `Request` / `Response` API and is re-exported from `apps/backend/api/index.ts`.
- **Data:** Supabase Postgres. Auth and preference tables use forced row-level security. Knowledge retrieval uses the `vector` extension, 1,536-dimension embeddings, and an HNSW cosine index.
- **Models:** Vercel AI SDK (`ai`) with `@ai-sdk/openai-compatible`. Embeddings default to OpenAI `text-embedding-3-small`. Generation goes through the Hashie LLM gateway as model `hashie-medgemma`, with gateway requests marked for Ghana and English.
- **Build and release:** EAS Build (`apps/hashie/eas.json`). Backend container image based on `node:22-bookworm-slim`.

## Repository layout

```text
apps/hashie/          Expo mobile app (onboarding, library, Ask, profile)
apps/backend/         API, guest and Clerk auth, retrieval, agent streaming
apps/operations/      Reserved for an operations app (placeholder)
packages/             Reserved for shared packages (placeholder)
supabase/migrations/  Auth/preference schema and knowledge-vector schema
artifacts/data/       Canonical health Q&A source and import report
artifacts/version-1.0/ Named iOS simulator captures of the guest flow
scripts/              Offline library generator
deploy/cloud-run/     Cloud Run deploy helper and deployment notes
prompts/              Implementation prompts and recorded release notes
```

There is no root workspace manifest. The mobile app and the backend are separate npm packages.

Notable implementation choices:

- The agent loads only the current actor’s nickname, age group, language, and accessibility preferences. It does not send owner ids, session ids, tokens, email, or vectors to the embedding provider.
- The deployed gateway returned an empty stream for a custom system message and for multiple messages, so Hashie places server safety and evidence guidance in a single user message and keeps the gateway’s own system prompt.
- Gateway SSE streams omit the `finish_reason` chunk the AI SDK expects. The backend injects that protocol event and leaves the gateway’s data intact.
- Gateway access tokens rotate through the gateway’s refresh endpoint. A local token file is gitignored; the backend README says production needs a managed single-writer secret store before more than one instance runs.
- An in-process rate limiter covers guest creation, upgrades, and agent requests. It is for tests and local development.
- Until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, the data store stays unavailable and returns `503`. A process-local memory store exists only when `HASHIE_DATA_STORE=memory` and `HASHIE_ALLOW_INSECURE_MEMORY_STORE=true`, and only when `NODE_ENV` is not `production`.

## Project status

Active product development. The mobile app version in `apps/hashie/app.config.js` and `apps/hashie/package.json` is `1.0.0`. Guest onboarding, the offline library, profile preferences, Google sign-in, and the grounded agent are implemented in this tree.

These surfaces are still prototypes or explicitly unfinished in the UI:

- Check-in shows example feelings on disabled controls and states that nothing is scored, classified, or sent.
- Home’s urgent-help label tells people to contact local emergency services or a qualified professional, and states that the link is not connected.
- The language step offers English and Akan/Twi. Its “hear an example” line states that audio is not connected. Ask Hashie generates English. If the saved language is Akan/Twi, the server instruction tells the model to acknowledge that English limit.
- `apps/operations` and `packages` contain only `.gitkeep`.
- `DEVELOPMENT_PLAN.md` is the phased plan from product boundaries through a controlled public release. Its “current position” section was written before the auth, library, and agent work that is now in the repository.

Deployment notes checked into the repo, as records of those tasks:

- [`deploy/cloud-run/README.md`](deploy/cloud-run/README.md) records a Cloud Run service in `africa-south1`, with a maximum of one instance.
- [`prompts/render-backend-deployment.md`](prompts/render-backend-deployment.md) and [`prompts/update-client-render-backend.md`](prompts/update-client-render-backend.md) record a later Render web service and a `GET /health` result of HTTP 200 at the time of that note. Those notes describe Render’s free tier as a demo or preview host.
- [`prompts/hashie-version-1-release.md`](prompts/hashie-version-1-release.md) records an Android internal APK submitted to EAS and still queued, and an iOS internal build that did not start because no suitable signing credentials were available. [`artifacts/version-1.0/README.md`](artifacts/version-1.0/README.md) indexes simulator captures of the guest flow, including an Ask error and a later successful retry.

## Getting started

**Prerequisites**

- Node.js 22 and npm. The backend image uses `node:22-bookworm-slim`.
- For local native builds: Xcode (iOS) or the Android SDK (Android).
- For cloud binaries: an Expo account and the EAS CLI (`eas.json` expects CLI `>= 24.8.0`).
- For a working signed-in agent against real services: a Clerk application, a Supabase project with the migrations below applied, an OpenAI key used only for embeddings, and Hashie LLM gateway credentials. Names only are listed here. Copy the example files and fill them locally. Do not commit secret values.

### Mobile app

```sh
cd apps/hashie
cp .env.example .env.local
npm install
npm start
```

`npm start` runs `expo start`. Other scripts in `apps/hashie/package.json`:

| Script | Command |
| --- | --- |
| `npm run android` | `expo run:android` |
| `npm run ios` | `expo run:ios` |
| `npm run web` | `expo start --web` |
| `npm run check:google-config` | Validate public Google sign-in configuration |
| `npm run test:session` | Compile and run the session, history, and Google sign-in tests |

Typecheck the app with `npx tsc --noEmit` from `apps/hashie`. There is no `typecheck` npm script in that package.

Client environment names (see `apps/hashie/.env.example` and `apps/hashie/.env.production.example`):

- `EXPO_PUBLIC_HASHIE_API_BASE_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME`

`EXPO_PUBLIC_*` values are bundled into the client. Keep Clerk secrets, Supabase keys, database credentials, and model keys on the server. For EAS, put the public values in the matching `development`, `preview`, or `production` environment. `apps/hashie/README.md` has the build-profile details.

### Backend

```sh
cd apps/backend
cp .env.example .env.local
npm install
npm run dev
```

`npm run dev` typechecks via `tsc`, then starts `dist/src/server.js` with `--env-file=.env.local`. `PORT` defaults to `3000`.

| Script | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `tsc --noEmit` |
| `npm test` | Build, then `node --test test/*.test.mjs` |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled server |
| `npm run ingest:knowledge` | Embed new or changed approved entries (server env required) |
| `npm run smoke:gateway-languages` | Synthetic gateway probe (server env required) |
| `npm run smoke:agent-stream` | Synthetic stream through the AI SDK adapter |

Server environment names (see `apps/backend/.env.example`):

- `NODE_ENV`, `PORT`
- `HASHIE_WEB_ALLOWED_ORIGINS`
- `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_AUTHORIZED_PARTIES`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `HASHIE_DATA_STORE`, `HASHIE_ALLOW_INSECURE_MEMORY_STORE`
- `OPENAI_API_KEY`, `HASHIE_EMBEDDING_MODEL`
- `MEDGEMMA_BASE_URL`, `MEDGEMMA_ACCESS_KEY`, `MEDGEMMA_REFRESH_KEY`
- `HASHIE_GATEWAY_TOKEN_FILE`

The gateway smoke script also reads `HASHIE_GATEWAY_ONLY_STREAM` and `HASHIE_GATEWAY_SMOKE_TIMEOUT_MS` when you set them. Behavior, local memory-store limits, and what must stay off the phone are documented in [`apps/backend/README.md`](apps/backend/README.md).

### Regenerate the offline library

From the repository root (Node only; no install):

```sh
node scripts/generate-learning-library.mjs
```

This reads `artifacts/data/healthQAdata.json` and writes `apps/hashie/data/learning-library.json` plus `artifacts/data/healthQAdata.import-report.json`.

### Database

Apply these to the Supabase project the backend uses, in order:

1. `supabase/migrations/20260916_hashie_auth_persistence.sql`
2. `supabase/migrations/20260916060624_hashie_knowledge_retrieval.sql`

The second migration creates the `vector` extension and `hashie_match_knowledge_documents`. Run `npm run ingest:knowledge` only after that migration and the server embedding variables are in place.

### Backend container

`apps/backend/Dockerfile` installs from the lockfile, runs `npm run build`, drops dev dependencies, and starts as the `node` user on port `8080`:

```sh
docker build -t hashie-backend apps/backend
```

Cloud Run defaults and secret names are in [`deploy/cloud-run/README.md`](deploy/cloud-run/README.md). `deploy/cloud-run/deploy.sh` is the helper for that project.

## Further reading

- [`apps/hashie/README.md`](apps/hashie/README.md) — client configuration, EAS profiles, and Ask Hashie privacy
- [`apps/backend/README.md`](apps/backend/README.md) — routes, grounding rules, and local checks
- [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) — phased plan through a controlled public release
- [`AGENTS.md`](AGENTS.md) — product boundaries and how changes are supposed to be made in this repo
