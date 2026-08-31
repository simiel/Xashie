# Hashie web v2 deployment handoff

- Production web URL: `https://hashie-web-v2-ghlooukrva-bq.a.run.app`
- API v2 URL: `https://hashie-api-v2-239035662159.africa-south1.run.app`
- Cloud Run service: `hashie-web-v2`
- Ready revision: `hashie-web-v2-00001-ntn`
- Image: `africa-south1-docker.pkg.dev/my-hashie-app/hashie/hashie-web-v2:28b9eb6`

The web service is publicly reachable so the Clerk sign-in page can load. Admin access remains gated by Clerk in the application. The web runtime receives `HASHIE_API_URL` for API integration and receives only the Clerk publishable key from Secret Manager entry `hashie-v2-clerk-publishable-key`. It does not receive database credentials, gateway tokens, Clerk secret keys, or webhook secrets.

The current portal is the deployed Clerk-gated admin experience. Its dashboard cards and tables are still static preview data; live admin API data wiring is a separate implementation task. The API client boundary is available at `hashie-web/src/lib/api-client.ts`.

Cloud Build runs the API tests/build/deploy/migration first, then web typecheck/lint/build, image push, and web deployment. Automatic GitHub triggering still needs the one-time Google Cloud GitHub connection authorization.
