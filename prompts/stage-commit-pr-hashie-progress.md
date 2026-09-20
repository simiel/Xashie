# Stage, commit, and open a PR for Hashie progress

## Goal

Preserve the current Hashie progress on a new branch, stage and commit the intentional working-tree changes, push that branch to `origin`, and open a pull request against the repository default branch.

## Skills and instructions

- `ship`: inspect the branch/base, review the diff, run relevant checks, commit in coherent units, push, and open/update a PR.
- Repository `AGENTS.md`: keep the change scoped, preserve user work, obtain approval before GitHub writes, and report verified checks accurately.
- Repository `apps/hashie/AGENTS.md`: Expo SDK 57 project; consult the versioned Expo docs before changing app code. This task should not introduce additional app-code changes.

## Inspected state

- Repository: `/Users/samuel/Desktop/projects/Xashie`; remotes include `origin` (`https://github.com/simiel/Xashie.git`) and `hashie` (`https://github.com/simiel/Hashie.git`).
- Current branch: `sam/hashie-progress-2026-09-18`, clean relative to its upstream at `b32da44` before these pending changes. The requested new branch does not yet exist.
- Local `origin/main` is available and is the presumed PR base. GitHub API lookup failed in the restricted shell, so default-branch confirmation, repository visibility, and whether an existing PR exists remain pending until network access is available.
- The current branch already contains 12 commits not in `origin/main`; the diff against `origin/main` is a broad project delivery (roughly 400 files, including app, backend, repository structure, and project guidance), not just the pending Google sign-in work. A PR from the requested new branch will include this existing history plus the pending changes.
- Pending tracked changes: `apps/hashie/.env.example`, `apps/hashie/app.json`, `apps/hashie/app/onboarding/access.tsx`, `apps/hashie/eas.json`, `apps/hashie/package.json`, and `apps/hashie/package-lock.json`.
- Pending intentional untracked files: `apps/hashie/app.config.js`; four supporting prompts under `prompts/`; and `artifacts/version-1.0/README.md` with 18 synthetic-data iOS simulator screenshots (7.6 MB total).
- Three untracked `.DS_Store` files are present and are explicitly excluded. Local `.env*.local` files, signing material, and other ignored files are excluded.
- The app package/version is currently `1.0.0`; no root `VERSION` or `CHANGELOG.md` exists. Do not invent root release metadata or bump the app version as part of this Git workflow.

## Decisions and assumptions

- Create `sam/hashie-progress-pr-2026-09-18` from the current progress branch's `HEAD`, preserving its existing commit history and all intentional pending progress. Do not rewrite or move the existing branch.
- Stage only the explicitly listed pending files, never use `git add -A`, and exclude `.DS_Store`, `.env.local`, credentials, keystores, build output, and unrelated files.
- Use a few coherent commits: native Google auth/configuration; internal-release EAS configuration if separable; and release QA evidence/supporting prompts. Keep the already committed history unchanged.
- Push to `origin` and create a PR against the confirmed default branch only after local review and checks pass. If the existing work is already covered by an open PR, update that PR only if it is for the new branch; otherwise create one for this branch.
- Do not change production Clerk/Google configuration, EAS credentials, app behavior, version metadata, or remote branches other than pushing the requested new branch/opening the PR.
- Use a `v1.0.0`-prefixed PR title to match the app version; describe that version as existing, not a new release.

## Files to include

- Modified tracked files listed in “Inspected state”.
- `apps/hashie/app.config.js`.
- `prompts/android-build-environment-setup.md`.
- `prompts/google-sign-in-error-diagnostics.md`.
- `prompts/hashie-version-1-release.md`.
- `prompts/native-google-sign-in.md`.
- `artifacts/version-1.0/README.md` and the 18 indexed PNG screenshots.

## Security and privacy

- Inspect the outgoing diff and staged files for secrets before commit/push; do not print secret values. Public Clerk publishable keys and OAuth client IDs may be present in client configuration, but never stage a Clerk secret, Google Web client secret, token, private key, or local environment file.
- The screenshot index reports synthetic test choices and no real account, personal, or health data. If visual/content review finds otherwise, exclude the affected screenshot and report it.
- Exclude all `.DS_Store` files. Do not push or modify Google Cloud, Clerk Dashboard, EAS, production, or other remote configuration.
- Do not force-push, amend, or rewrite existing commits.

## Acceptance criteria

- The new branch is created from the current progress `HEAD`; the existing branch remains unchanged.
- Only the listed intentional files are staged and committed; `.DS_Store`, local secrets, and ignored files are absent from the index and commit.
- Commit history is coherent and does not include a fabricated root version/changelog change.
- Relevant type-checks/tests and `git diff --check` pass, or failures/skips are clearly reported.
- The new branch is pushed to `origin`, and a PR is opened against the confirmed default branch with an accurate summary, test results, and the existing app version stated correctly.
- Report the branch name, commit SHA(s), PR URL, checks passed/failed/skipped, and any unresolved review or network limitation.

## Checks and manual verification

- Inspect `git diff` and staged diff; confirm the exact allowlist above.
- Run `git diff --check`.
- Run the Hashie TypeScript check and relevant backend tests for the existing project changes; run other project checks required by review without starting application processes outside the user's VS Code terminal.
- Scan outgoing commit/PR content for credentials and sensitive data.
- Confirm the PR base and whether an existing PR exists through GitHub once network access is available.
- After opening the PR, verify its URL, title, base, branch, and body through GitHub.
