# Backend development environment loading

## Goal

Make the local backend development command load the server-only environment file so configured persistence and authentication dependencies are available during local mobile testing.

## Inspected code and context

- `apps/backend/package.json` starts `dist/src/server.js` without an environment-file flag.
- `apps/backend/src/store.ts` selects the unavailable store when Supabase variables are absent from `process.env`.
- `apps/backend/.env.local` contains the local server configuration and remains server-only.
- `apps/hashie/.env.local` points the phone client at the backend on port 3000.

## Decision and scope

- Add Node's `--env-file=.env.local` flag to the backend `dev` script.
- Keep the production-oriented `start` script unchanged so managed deployment environments continue to provide their own secrets.
- Do not expose, copy, or log any secret values.

## Acceptance criteria

- `npm run dev` loads `.env.local` before starting the backend.
- The backend still typechecks and builds.
- The backend listens on port 3000 when started from `apps/backend`.
- A guest-session request no longer fails solely because persistence configuration was omitted.
- The mobile client remains configured for port 3000.

## Checks and manual test

1. Run `npm run typecheck` and `npm run build` in `apps/backend`.
2. Restart `npm run dev` in the VS Code backend terminal.
3. Confirm the backend listener is on port 3000.
4. Open Hashie on the USB Android phone, tap “Start privately as a guest,” and confirm it advances past step one.

## Security notes

The environment file contains server-only credentials. They must remain outside the mobile bundle, source logs, prompts, and user-visible output.
