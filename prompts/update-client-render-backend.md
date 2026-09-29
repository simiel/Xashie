# Point the Hashie mobile client at Render

## Goal

Update the Expo mobile client’s client-safe backend base URL from the unavailable
Cloud Run service to the deployed Render backend, then verify a simulator build loads
the new configuration and can reach the backend health route.

## Inspected context

- `apps/hashie/.env.local` defines `EXPO_PUBLIC_HASHIE_API_BASE_URL`; it currently
  points to the former Cloud Run service.
- `apps/hashie/lib/hashie-api.ts` reads that public setting as the client’s API base
  URL. No other active client file contains the prior Cloud Run endpoint.
- Render deployment is live at `https://hashie-backend.onrender.com`, where `GET
  /health` returned HTTP 200 with the expected safe liveness response.
- The mobile workspace uses Expo scripts: `npm run android` and `npm run ios`.
- Argent’s required mobile-device tools are not exposed in this session. Per project
  policy, no non-Argent device-control fallback will be used without explicit user
  authorization.

## Proposed change

1. Replace only `EXPO_PUBLIC_HASHIE_API_BASE_URL` in `apps/hashie/.env.local` with
   `https://hashie-backend.onrender.com`.
2. Do not put server credentials in the mobile configuration or modify `.env.example`.
3. Restart the Expo development server so the public configuration is rebundled.
4. If the user explicitly authorizes a non-Argent fallback, launch their selected
   Android emulator or iOS simulator and verify the app starts with the new bundle.
5. Confirm the deployed endpoint separately with `GET /health` and report any app-side
   API error without exposing credentials or user data.

## Security and constraints

- `EXPO_PUBLIC_*` is bundled into the mobile app; only a public HTTPS URL belongs
  there.
- The change must not alter Clerk credentials, server-side secrets, data stores, or
  mobile product behavior.
- Render Free may take time to wake after inactivity; account for an initial slow
  request before treating it as a client failure.

## Acceptance criteria

- The mobile client reads the Render base URL from its local public configuration.
- Expo starts with the updated bundle.
- The Render health endpoint responds HTTP 200.
- If a simulator is authorized and available, the app launches without a configuration
  or runtime error.

## Checks and manual test steps

1. Confirm the local environment file contains exactly the Render HTTPS URL for the
   API base setting, without printing other values.
2. Run the mobile session test and TypeScript check appropriate to the existing npm
   scripts.
3. Start Expo using the project script in the user’s VS Code terminal.
4. Launch the selected simulator, inspect its app state, and check runtime logs for
   safe configuration errors only.
5. Request `https://hashie-backend.onrender.com/health` and record the status code.
