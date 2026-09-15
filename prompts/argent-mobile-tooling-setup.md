# Argent mobile tooling setup

## Goal

Install and initialize Argent for the Hashie repository, then make Argent the required tool for all future mobile app interaction, inspection, debugging, profiling, and flow verification.

## Inspected state

- Repository: `/Users/samuel/Desktop/projects/Xashie`
- Expo app: `apps/hashie`
- `.agents/` currently contains only `.gitkeep`; no Argent skill or project configuration is present.
- No `argent` executable or Argent-specific project file was found on PATH or in the repository.
- Official Argent documentation specifies `npx @swmansion/argent init` as the setup command and describes Android/iOS control, component-tree inspection, debugging, and profiling capabilities.

## Decisions

- Run the official Argent initialization command from the repository root or the location it documents for project setup.
- Add a strict rule to the root `AGENTS.md`: all mobile interactions and mobile verification for Hashie must use Argent when Argent supports the requested operation; do not substitute screenshots, generic UI automation, or manual ADB/UI actions for Argent except when Argent is unavailable or cannot perform the operation, in which case the limitation must be reported.
- Keep secrets, device data, tokens, and private health content out of committed configuration.
- Do not change application behavior or add unrelated mobile dependencies.

## Requirements

1. Argent initialization completes successfully, or the exact environmental blocker is documented.
2. The root `AGENTS.md` contains the strict mobile-tooling rule.
3. Any generated configuration is scoped to Argent and the Hashie project.
4. No credentials, device identifiers, private data, or unrelated files are committed.
5. Future mobile interaction work is routed through Argent first.

## Security and privacy

- Review generated files before committing them; remove or redact credentials and private device information.
- Do not expose health content, user data, device logs, or network payloads in prompts or source control.
- Keep the mobile client/backend boundary unchanged.

## Acceptance criteria

- Argent is initialized for the repository if the environment supports it.
- The root instructions explicitly require Argent for all supported mobile interactions.
- `git status --short` shows only the intended prompt, instruction, and Argent setup files.
- Existing Expo app code remains behaviorally unchanged.

## Checks and manual verification

- Run the official Argent setup command.
- Inspect the generated configuration and confirm it contains no secrets.
- Run the available Argent health or discovery check, if setup provides one.
- Verify the root `AGENTS.md` rule is present.
- If a connected Android device is available, use Argent to discover or inspect the Hashie Expo app; otherwise record that device verification is pending.
