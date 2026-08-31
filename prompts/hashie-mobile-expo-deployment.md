# Hashie mobile Expo project and deployment

## Goal

Register the existing Expo SDK 57 mobile workspace as the Expo project named
`Xashie`, keep the installed app display name `Hashie`, configure production
API routing, and create authenticated EAS build configuration without exposing
server credentials.

## Inspected inputs

- `hashie-mobile/package.json` and `hashie-mobile/AGENTS.md`
- `hashie-mobile/app.json`, `.env.example`, and mobile API client
- `docs/hashie-api-v2-mobile-deployment.md`
- Expo SDK 57 and EAS official documentation

## Decisions and assumptions

- The existing `hashie-mobile` Expo app is the requested new project; no second
  app or nested repository is created.
- Expo project slug: `xashie`; standalone display name: `Hashie`.
- Native identifiers use `com.xashie.hashie` for both iOS and Android.
- Production builds use EAS environment `production`; the API URL is the
  public v2 Cloud Run URL from the deployment handoff.
- Guest mode is disabled for production builds unless a reviewed product
  decision explicitly enables it.
- For the current internal preview, the authorized Clerk test publishable key
  is stored only as a sensitive EAS `preview` variable. It must not be reused
  for a production release.
- App Store / Play Store submission is not assumed until store credentials and
  metadata are available. An EAS production build is the first deployment
  artifact.

## Security and safety

- Mobile receives only the API base URL and Clerk publishable key.
- No database URL, gateway token, Clerk secret, webhook secret, audio secret,
  or provider credential is committed or sent to clients.
- API authorization remains server-side through Clerk bearer tokens.
- A real signed-in production Clerk session and one English streamed chat are
  required before calling the release verified.

## Acceptance criteria

- `app.json` has display name `Hashie`, slug `xashie`, and stable native IDs.
- `eas.json` uses remote versioning, auto-increments production builds, and
  selects the production environment.
- Preview environment contains the v2 API URL and the authorized test Clerk
  publishable key as a sensitive variable; production remains unconfigured for
  Clerk until the production key is delivered.
- Expo project initialization/linking succeeds and returns a project ID.
- EAS production build succeeds for the requested platform(s).
- Health/readiness checks pass and a signed-in stream reaches the v2 API.
- No secrets or generated native folders are added to git.

## Checks and manual verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- --run`
- `pnpm exec expo-doctor`
- `pnpm exec expo export --platform web`
- `bash -n script/build_and_run.sh` and `script/build_and_run.sh --help`
- EAS build status and artifact download URL
- Manual sign-in, sign-out, expired session, retry, and English streaming
  smoke test; Akan/Twi only after provider approval

## External blockers

Expo account authentication, production Clerk key delivery, live network
access to Cloud Run, and iOS/Android store credentials are external state. Do
not fabricate them or substitute test credentials.
