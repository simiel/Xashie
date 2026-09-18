# Commit and publish current Hashie progress

## Goal

Publish the current, related Hashie backend/mobile demo progress on a dedicated
`sam/` branch, preserving the current working tree and avoiding unrelated or
secret files.

## Authorization and decision

The user explicitly requested: “commit, branch and push our progress.” This is
the approved scope for the branch, commit, and push; do not deploy or change
production configuration as part of this task.

Use branch `sam/hashie-progress-2026-09-18` and commit subject
`feat: prepare Hashie mobile demo deployment` unless a verified naming conflict
requires reporting a blocker. Include all currently listed Hashie progress,
deployment/build handoff files, and this prompt. Do not include ignored local
environment files, build output, or unrelated changes.

## Inspected scope

- Backend: gateway-compatible bounded follow-up context, health route alias,
  local environment-file loading, tests, Docker packaging, and Cloud Run deploy
  helper/documentation.
- Mobile: guest-vs-Clerk credential selection, streaming failure/retry handling,
  accessibility and privacy messaging, Android keyboard avoidance, Expo/EAS
  project configuration, and client documentation.
- Handoff prompts: backend environment loading, Cloud Run deployment, Android
  keyboard fix, guest credential selection, Android APK build, and temporary
  single-message agent context.

## Security and scope requirements

- Never add `.env*`, gateway token files, keystores, credentials, or generated
  build artifacts.
- Inspect the staged path list and staged diff before committing.
- Do not amend existing commits, force-push, deploy, or rewrite history.
- Push only the new branch to the configured `origin` remote.

## Acceptance criteria and checks

- Backend tests and typecheck pass.
- Mobile TypeScript check passes.
- `git diff --check` passes.
- Commit contains only the reviewed progress files and this prompt.
- The branch is pushed with upstream tracking and the final commit hash is
  reported.

## Manual verification

- Confirm the pushed branch and commit with Git metadata after the push.
- Do not claim new-device installation or Google sign-in verification as part of
  this Git publishing task.
