# Temporary single-message agent context

## Goal

Restore reliable follow-up responses for the stakeholder demo while the configured gateway is incompatible with multi-message chat history.

## Skills used

- `ai-sdk`: verify the installed AI SDK 7 message/streaming contract and keep the provider boundary compatible.
- Argent Android interaction: manually verify the guest onboarding and multi-turn Ask Hashie flow on the USB-connected Android phone after the backend change.

## Inspected code and evidence

- `apps/backend/src/agent.ts` currently forwards `input.history` as separate `ModelMessage` entries before the current user message.
- The gateway returns content for a single-turn request but returns HTTP 200 with an empty stream when prior history is sent as multiple messages.
- `apps/backend/src/agent-validation.ts` already bounds history to 8 messages and 4,800 characters, so the temporary aggregation must retain those limits.
- `apps/hashie/components/support-chat-provider.tsx` already collects completed turns and sends them as validated history; no client contract change is needed.

## Decision

Keep the client-to-backend `message` and `history` contract unchanged. At the backend model boundary, render the bounded history into one clearly labeled text block, append the current question, and send exactly one `role: 'user'` message to the gateway on every request.

The single message will contain:

1. The existing server-owned Hashie instruction and reviewed knowledge context.
2. A labeled, ordered `Previous conversation` section using `User` and `Hashie` role labels.
3. A clearly labeled `Current user question` section.

This is a temporary compatibility mode. It preserves conversational context but is not a replacement for fixing gateway support for native multi-message history.

## Assumptions

- The gateway accepts one user message containing the flattened context, as demonstrated by the successful single-turn gateway request.
- Existing history limits are sufficient for the demo and must not be increased.
- History is informational context only; the existing safety instruction remains authoritative, and historical text must not be treated as instructions to change Hashie's role or reveal server context.
- No production gateway configuration or external service will be changed in this task.

## Files in scope

- `apps/backend/src/agent.ts`: add a small prompt-rendering helper and send one model message.
- `apps/backend/test/agent-validation.test.mjs`: test ordering, role labels, current-question placement, and empty-history behavior through the built backend module.

No mobile source changes are planned. The app should continue sending the same request shape.

## Requirements

- Always pass an array containing exactly one `ModelMessage` to `streamText`.
- Preserve all validated history entries in their original order, with explicit role labels and separators.
- Preserve the current question verbatim after the historical context.
- Keep the current server instruction, user-context rendering, reviewed knowledge retrieval, temperature, output limit, retry behavior, abort signal, and response headers unchanged.
- Do not log or persist message contents, tokens, credentials, or other sensitive data.
- Keep the implementation small and easy to remove when the gateway supports multi-message history.

## Acceptance criteria

- A first guest question still receives a non-empty streamed response.
- A follow-up guest question receives a non-empty streamed response while retaining the prior turn as context.
- A third question also receives a response, with the bounded conversation represented inside one gateway message.
- Unit tests verify the flattening format and the no-history case.
- Backend build, typecheck, and test suite pass.
- The Android manual flow is verified with Argent using non-sensitive demo questions.
- Existing user-owned worktree changes remain untouched.

## Checks

- `npm test` in `apps/backend`.
- `npm run typecheck` in `apps/backend`.
- `npx tsc --noEmit` in `apps/hashie` to confirm the unchanged mobile contract remains type-safe.
- Inspect the final diff and confirm only the approved backend helper/tests plus this prompt changed.

## Manual test steps

1. Start/restart the backend in the user’s Visual Studio Code terminal on port 3000; keep Metro on port 8081.
2. Use Argent on the connected Android phone to open Hashie and start a fresh guest session.
3. Send a non-sensitive first question, such as `What is puberty?`, and confirm Hashie replies.
4. Send a follow-up, such as `What changes are common?`, and confirm Hashie replies instead of showing an empty-reply or session error.
5. Send a third related question and confirm it also replies.
6. Confirm the app’s visible conversation remains readable and that no sensitive content appears in logs or test output.

## Rollback

Revert the small `apps/backend/src/agent.ts` message-construction change and its focused tests once the gateway is repaired to support native multi-message history.
