# Hashie directory-system setup

## Goal

Establish the initial Hashie monorepo directory system for a working prototype, with clear ownership boundaries for the mobile app, operations app, backend, shared packages, artifacts, prompts, and project-scoped agent configuration.

## Inspected project state

- Repository: `/Users/samuel/Desktop/projects/Xashie`
- Existing files: `AGENTS.md` only
- Existing application code, configuration, dependencies, and tests: none found

## Decisions

Create the following empty directory structure, each with a minimal `.gitkeep` so Git preserves the intended layout:

- `apps/hashie/` — React Native with Expo mobile app and user experience
- `apps/operations/` — Next.js authorized operations and configuration app
- `apps/backend/` — API, orchestration, retrieval, persistence, safety, and controlled actions
- `artifacts/` — design files, references, supplied assets, and working resources
- `packages/` — genuinely reusable shared types, UI primitives, validation, and safe utilities
- `prompts/` — approved implementation prompts and task context
- `.agents/` — project-scoped agent skills and configuration

Do not add package manifests, framework scaffolds, deployment configuration, credentials, secrets, or application code as part of this directory-only change.

## Assumptions

- The repository is an empty initial workspace, so no files need to be moved or migrated.
- Empty directories need placeholders because Git does not track directories by themselves.
- `AGENTS.md` remains at the repository root and is not moved.
- `.gitkeep` files contain no secrets or user data.

## Security and privacy

- Keep all provider keys, Clerk secrets, Supabase credentials, model keys, MCP credentials, and other sensitive configuration out of the repository.
- Preserve the ownership boundary: clients must not call models, MCP servers, or privileged tools directly.
- Treat `artifacts/` and future user or health content as potentially sensitive; add access and retention rules before storing real data.

## Acceptance criteria

1. All seven specified directory paths exist.
2. Each directory contains only a minimal `.gitkeep` placeholder.
3. No existing files are deleted, moved, or overwritten.
4. No framework, dependency, environment, deployment, or secret files are introduced.
5. The resulting tree is easy to extend into the planned three-workspace architecture.

## Checks

- Run `find` to verify the exact directory tree and placeholders.
- Run `git status --short` to verify only the intended prompt and directory placeholders are untracked changes.
- Confirm no credential-like files or environment files were added.

## Manual verification

1. Open the repository root and confirm `apps`, `artifacts`, `packages`, `prompts`, and `.agents` are visible.
2. Expand `apps` and confirm `hashie`, `operations`, and `backend` are present.
3. Confirm the root `AGENTS.md` is still present.
4. Confirm all placeholders are empty and contain no application code.

## Implementation scope

After explicit user approval, create only the directories and `.gitkeep` placeholders listed above, then run the checks and report passed, failed, skipped, and pending manual verification separately.
