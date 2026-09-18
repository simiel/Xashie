# Guest credential selection for the full phone demo flow

## Goal

Make the React Native app reliably use the active guest-session credential for every guest chat request, including follow-up messages, even when Clerk has a lingering signed-in session in memory. Preserve the existing temporary single-message gateway workaround and keep the Google sign-in path working.

## Skills and references

- `clerk-expo` custom-flow skill: `/Users/samuel/.agents/skills/clerk-expo/SKILL.md`
- Custom Clerk hook reference: `/Users/samuel/.agents/skills/clerk-expo/references/custom.md`
- Argent Android interaction and flow verification skills from the project skill catalog

The installed `@clerk/expo` / `@clerk/react` source confirms that `useAuth().isSignedIn` represents Clerk’s global auth state and `getToken()` retrieves the Clerk session token. That global state is not the app’s guest-vs-Google access choice.

## Inspected code

- `apps/hashie/components/onboarding-provider.tsx`
  - Owns `state.accessChoice`.
  - Sets `accessChoice` to `guest` after creating and securely storing the guest token.
  - Already uses the guest token for guest preference writes and the Clerk token for Google preference writes.
- `apps/hashie/components/support-chat-provider.tsx`
  - Currently selects `clerkToken` or `guestToken` from Clerk’s global `isSignedIn` flag.
  - This can send a stale/incorrect Clerk credential after the user explicitly selected guest access.
  - Its memoized context value also needs to observe access-mode changes so `send` cannot retain a closure from before onboarding selection.
- `apps/hashie/lib/hashie-api.ts`
  - Rejects conflicting credentials and sends exactly one selected credential to the backend.
  - Maps a backend 401 to the observed “session expired” message.
- `apps/hashie/app/_layout.tsx`
  - Places `OnboardingProvider` above `SupportChatProvider`, so the chat provider can read the selected access mode without changing provider ownership.
- `apps/backend/src/app.ts`
  - Resolves guest credentials before agent execution; the observed 401 therefore occurs before the gateway/model path.

## Approved implementation scope

Update only `apps/hashie/components/support-chat-provider.tsx`:

1. Read `state.accessChoice` through `useOnboarding()`.
2. When the choice is `guest`, retrieve and send only `getGuestToken()`; do not call Clerk for that request.
3. When the choice is `google`, retrieve and send only Clerk’s `getToken()`; do not send the guest token.
4. If no access choice is available, preserve the existing private-session error behavior rather than guessing a credential.
5. Include the selected access choice in the memoization dependencies so the context’s `send` function updates after onboarding selection.
6. Keep the existing `HashieApiClient` conflicting-credential guard, secure storage, request shape, and error handling unchanged.

## Explicit non-goals

- No backend, gateway, model, database, Clerk dashboard, or production configuration changes.
- Do not sign the user out of Clerk when guest access is selected.
- Do not delete either credential from storage.
- Do not log tokens, authorization headers, private user content, or sensitive session data.
- Do not change the temporary history-flattening behavior.
- Do not expand the task into persistent onboarding-state redesign after app reload.

## Assumptions

- `OnboardingProvider.state.accessChoice` is set before the user reaches the Ask screen in the normal demo flow.
- `getGuestToken()` returns the guest token created by `beginGuestSession()`.
- The existing `ClerkProvider` token cache and Google SSO flow remain correct.
- A guest request must contain exactly one credential, as enforced by `hashieApi.streamAgent()`.

## Security and privacy requirements

- Keep all credential selection local to the provider and server-bound API call.
- Never expose or print token values.
- Never send both guest and Clerk credentials in one request.
- Continue using the existing 401 handling so expired guest sessions remain understandable to the user.

## Acceptance criteria

- A fresh guest session can send at least three consecutive non-sensitive messages in one conversation on the connected Android phone.
- The second and later guest requests use the guest credential even if Clerk reports a signed-in session.
- No request contains both credential types.
- The Google path still uses the Clerk token when `accessChoice === 'google'`.
- Missing access selection still fails safely with the existing private-session error.
- No backend or gateway files are modified for this fix.

## Checks

- Run `npx tsc --noEmit` from `apps/hashie`.
- Run the existing backend test suite from `apps/backend` to ensure the API contract remains intact.
- Review `git diff --check`.
- Restart Metro and the backend in the user’s VS Code terminal as needed.
- Use Argent for Android launch, inspection, screenshots, and manual interaction; do not use raw `adb` or generic UI automation.

## Exact manual test

1. With the backend listening on port 3000 and Metro on port 8081, open the Hashie dev app on the connected Android phone.
2. Start a new private session as guest and complete onboarding.
3. Send a short, non-sensitive first question and confirm a non-empty response.
4. Send a second question in the same session and confirm a non-empty response without a 401/session-expired error.
5. Send a third question and confirm the same.
6. Capture the Ask screen after the successful follow-up flow and inspect the UI for an error banner, stuck loading state, or empty assistant message.
7. If a failure occurs, inspect redacted status/request evidence only; do not capture or report credential values or private message content.
