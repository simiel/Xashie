# Hashie web admin portal implementation prompt

## Goal

Create `hashie-web` as a Next.js App Router workspace for Hashie operations staff. The first usable surface is an authenticated admin console with a responsive overview dashboard and navigation entry points for the requested operational capabilities. The browser is a client for the API; it is never the authorization boundary.

## Inspected context

- `AGENTS.md`: Hashie product, safety, privacy, accessibility, role, and deployment requirements.
- `HASHIE_LLM_GATEWAY.md`: provider boundary and operational limitations.
- `hashie-api/src/plugins/auth.ts`: Clerk bearer verification and roles `admin`, `super_admin`, `content_reviewer`, `support_agent`, and `auditor`.
- `hashie-api/src/modules/content/routes.ts`: existing protected reviewed-content admin routes and workflow transitions.
- `hashie-api/src/routes/health.ts`: existing public `/health` and `/ready` routes.
- `hashie-mobile/src/constants/theme.ts`: existing Hashie colors, typography intent, and bilingual product context.
- Existing worktree: preserve unrelated API, mobile, docs, and prompt changes.

## Design decisions

- Visual system: true-white workspace; forest green accent; cool gray borders/surfaces; restrained shadow; dense but readable tables; no gradients or decorative health imagery.
- Shell: 230px navigation rail, content canvas with 32px desktop gutters, compact top toolbar, responsive rail collapse on smaller screens.
- Primary overview: system health dependency table, provider reliability chart/table, reviewed-content queue, safety review queue, and support queue.
- Sensitive data: seed data is intentionally redacted; UI copy must not imply access to raw health content. Reports are operational summaries only.
- Interactions: nav selection, timeframe selection, search filtering, maintenance-mode confirmation, table row selection, and status feedback must work locally.
- Auth: use Clerk when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is configured; provide a clearly labeled local preview fallback only when it is not configured. Production admin APIs must receive a Clerk bearer token and enforce role independently.
- API boundary: add a typed client helper that accepts a Clerk token and base URL; do not call the LLM gateway or provider SDK from the browser.

## Security and safety

- Never store or log tokens, transcripts, audio, names, email addresses, raw medical content, or provider errors in the web app.
- Hide convenience-only navigation based on the role returned by the API, but treat all client state as untrusted.
- Maintenance mode and all operational mutations require an API confirmation flow in production; this first UI only demonstrates the confirmation state.
- Use safe, redacted labels for audit and safety records.

## Acceptance criteria

- `hashie-web` is independently installable and starts as a Next.js workspace.
- Admin entry supports Clerk-authenticated rendering and a safe no-key preview mode for local visual work.
- Overview renders all requested operational categories with accessible labels, keyboard-visible focus, semantic tables, and responsive behavior.
- Controls have real local state and clear success/error affordances.
- API client exposes typed patterns for auth, health, content, and future admin resources without embedding provider details.
- No credentials or unnecessary health content are included in source.

## Verification

- Run web typecheck, lint, and production build.
- Run the app and inspect the overview at desktop and mobile widths.
- Verify the primary interactions: nav, time range, search, maintenance confirmation, and row selection.
- Inspect the generated design concept and the final browser screenshot with `view_image`; record comparison points in the final handoff.

