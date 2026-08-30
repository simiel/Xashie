# Hashie API

The server boundary for Hashie. It owns authentication, authorization, safety
decisions, provider calls, persistence, rate limits, controlled actions, and
redacted observability. Web and mobile clients must not call intelligence or
speech providers directly.

This workspace is intentionally a local-first foundation. The product modules
are separated now, but chat, voice, reviewed content, and admin workflows will
be implemented behind these boundaries and tested before deployment.

## Start locally

```text
cp .env.example .env
pnpm install
pnpm db:local:start
pnpm db:migrate
pnpm dev
```

If Docker is available, `docker compose up -d postgres` is an equivalent
database option. Use `pnpm db:push` only for disposable local schema iteration;
new environments should use the version-controlled migrations.

Useful endpoints:

```text
GET http://localhost:4000/health
GET http://localhost:4000/ready
GET http://localhost:4000/docs
```

The first database-backed route is `GET/PATCH /v1/me`. It requires a valid
Clerk bearer token and stores only the user ID, role snapshot, and onboarding
profile fields defined in the schema.

`/health` is a process liveness check. `/ready` checks that the configured
database responds. Provider health is reported separately and must not make a
local process impossible to inspect.

## Boundaries

- `src/modules/` contains product capabilities.
- `src/providers/` contains vendor-neutral interfaces and adapters.
- `src/plugins/` contains cross-cutting Fastify concerns.
- `src/db/` contains the PostgreSQL schema and database lifecycle.
- `test/` contains unit, integration, and provider-contract tests.

The current intelligence gateway is disabled by default. Its Clerk contract,
Akan/Twi reliability, speech capability, and retention terms must be resolved
before production integration.
