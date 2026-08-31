# Hashie API v2 provider operations

## Gateway authentication

The Hashie LLM gateway requires a gateway-issued JWT from its documented
`/auth/login` or `/auth/guest` flow. An API-key-style value is rejected with
`401` and causes the API to emit `provider_unavailable` on the chat stream.

The JWT is server-only. Store it in Google Secret Manager as
`hashie-v2-gateway-token` and reference the secret from the Cloud Run service.
Never send it to web or mobile clients, commit it, or log it.

## Current production state

- Cloud Run service: `hashie-api-v2`
- Active revision: `hashie-api-v2-00007-vgd`
- Gateway secret version: `3`
- Verified: `/health`, `/ready`, authenticated English streaming chat
- The current guest JWT expires on 2026-09-01 at 17:49 UTC and must be
  replaced before expiry.

## Rotation procedure

1. Request a new gateway JWT through the gateway's approved server-side auth
   flow.
2. Add it as a new version of `hashie-v2-gateway-token`.
3. Create a new Cloud Run revision referencing the secret's `latest` version.
4. Verify `/health`, `/ready`, authenticated chat, streaming completion, and
   provider-failure handling before shifting traffic.
5. Disable the previous secret version after the new revision is confirmed.

The guest-token arrangement is an interim operational credential. Production
requires a durable server-to-server gateway credential or a documented token
refresh contract before the current JWT expires.
