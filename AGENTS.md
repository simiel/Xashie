# Repository Guidelines

## Project Structure & Module Organization

This repository is currently a blank project scaffold. As implementation begins, keep a predictable layout:

- `src/` for application or library source code.
- `tests/` for automated tests, mirroring `src/` where practical.
- `assets/` for static, non-generated resources.
- `docs/` for longer design notes and user-facing documentation.

Keep build outputs, dependency directories, local environment files, and generated artifacts out of version control. Add appropriate entries to `.gitignore` when tooling is introduced.

## Build, Test, and Development Commands

No build system or package manager is configured yet. When one is added, document the canonical commands in `README.md` and keep this guide aligned. Prefer a small, consistent command set, for example:

```sh
npm run dev      # run the local development server
npm run build    # create a production build
npm test         # run the automated test suite
npm run lint     # check formatting and static analysis
```

Do not commit generated build output unless the project explicitly requires it.

## Coding Style & Naming Conventions

Use the formatter and linter native to the chosen language; commit their configuration files with the project. Use 2 spaces for JSON, YAML, Markdown nested content, and JavaScript/TypeScript unless the language tool mandates another style. Name files descriptively and consistently: `kebab-case` for general files, `PascalCase` for UI components/classes, and `camelCase` for functions and variables. Keep modules focused and avoid unrelated refactors in the same change.

## Testing Guidelines

Add tests with every behavior change. Place test files under `tests/` or alongside source files using the convention adopted by the selected framework (for example, `widget.test.ts`). Cover normal behavior, edge cases, and regressions. Run the full test and lint commands before opening a pull request.

## Commit & Pull Request Guidelines

Git history is not yet available, so use concise imperative commit subjects such as `Add user settings screen` or `Fix empty-state rendering`. Keep commits single-purpose. Pull requests should explain the change and its motivation, link relevant issues, list validation performed, and include screenshots for visual changes. Request review only after tests pass and configuration changes are documented.
