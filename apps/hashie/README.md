# Hashie mobile app

The Expo mobile client owns onboarding, accessibility, conversation UI, preferences, and navigation. It must call the Hashie backend for server-owned data and must never call Clerk server APIs, Supabase, AI providers, or privileged tools directly.

## Local environment

Copy `.env.example` to `.env.local` and replace only the client-safe placeholders:

- `EXPO_PUBLIC_HASHIE_API_BASE_URL` — backend base URL. Use `http://localhost:3000` for a web simulator on the same machine; for a physical device, use a reachable development-machine LAN address.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key only (`pk_test_...` or `pk_live_...`).

Expo makes `EXPO_PUBLIC_*` values available to the client bundle, so treat them as public configuration. The app uses these values only to call Hashie’s backend and Clerk with the user’s selected guest or signed-in session; it never calls an AI provider or database directly.

## Ask Hashie privacy

Ask Hashie keeps its message list only in the running app session. It does not save chat content in SecureStore, AsyncStorage, or Hashie’s database. Messages are sent to the server-owned agent service to produce a reply; its model gateway may retain requests. Users should avoid including names, phone numbers, addresses, or other identifying details in a message.

Configure Google OAuth client settings in the Clerk Dashboard. Do not put Google client IDs or secrets in source or this env file. Never add `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, database credentials, an OpenAI key, or any other server credential to the mobile app. Those belong in the backend or managed provider configuration.

Real local env files are ignored by Git (`.env` and `.env*.local`); keep `.env.example` tracked as the placeholder template.

## Clerk environment diagnostic

Hashie mobile and its backend must use the same Clerk environment: development/test mobile configuration must call a backend configured to verify that same environment, and production mobile configuration must call the production backend. A publishable key is client-safe, but never print or copy its value, Clerk session tokens, backend Clerk secrets, or Cloud Run secret values into logs, tickets, screenshots, or source files.

For a safe local check, verify only that the mobile configuration has a client-safe publishable key and backend URL configured, then confirm the key mode (`pk_test_` or `pk_live_`) matches the backend's server-only Clerk configuration. `npx expo config --type public` verifies Expo plugins, scheme, and bundle identifiers; it does not prove that deployed Cloud Run Secret Manager values match the mobile environment. That deployed-secret match requires an authorized production operator to inspect managed configuration without disclosing values.
