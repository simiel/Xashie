# Google sign-in error diagnostics

## Goal

Expose the underlying Android Google/Clerk sign-in failure in development diagnostics while preserving the current user-facing retry message and sign-in behavior.

## Skills

- `clerk-expo` custom-flow guidance: use the installed `@clerk/expo` behavior as the source of truth and keep provider-token exchange inside Clerk.
- Argent mobile debugging: verify the Android retry on the connected phone and inspect runtime output.

## Inspected context

- `apps/hashie/app/onboarding/access.tsx` uses Clerk's `useSignInWithGoogle()` on Android and catches the sign-in exception without logging it, replacing it with a generic notice.
- The installed Clerk Expo native Google hook can throw provider or Clerk errors; its documented usage catches and logs the error.
- The access screen and several Expo/Clerk configuration files already have user changes. Keep the implementation limited to the existing Google sign-in catch and preserve all unrelated changes.
- The app has no package script for tests, lint, or type checking; TypeScript is installed in `apps/hashie`.

## Decisions and assumptions

- Add development-only, structured error diagnostics in the Android Google sign-in catch; do not change OAuth configuration, flow selection, or user-facing copy.
- Extract only useful non-secret fields (error name/code, safe message, nested cause code/message, and Clerk error codes/request ID if present). Do not log the raw exception object.
- Redact email addresses, JWT-like values, and token/authorization-code fields from logged strings. Keep cancellation behavior unchanged.
- The diagnostic is temporary to identify this failure; remove it after diagnosis unless the user asks to retain diagnostics.

## Files

- `apps/hashie/app/onboarding/access.tsx` — add the sanitized error log in the existing catch only.

## Security and privacy

- Never log Google ID tokens, Clerk/session tokens, credentials, authorization headers, full request bodies, or raw error objects.
- Do not alter `.env*`, OAuth client IDs/secrets, or production Clerk/Google configuration.
- Preserve the generic user-facing error and avoid putting technical details on the onboarding screen.

## Acceptance criteria

- A failed Android Google sign-in emits a useful sanitized diagnostic to the development runtime console, including the available provider/Clerk error code and message.
- No account email, token-shaped string, credential, or raw exception object appears in the log.
- Successful sign-in, user-cancelled behavior, navigation, loading state, and existing fallback notice are unchanged.
- No unrelated user changes are overwritten.

## Checks

- Run `npx tsc --noEmit -p apps/hashie/tsconfig.json` from the repository root (or the equivalent local TypeScript binary if Expo's config requires it).
- Use Argent to verify the connected Android app still opens the Google account picker and the failure produces the sanitized runtime log.
- Review the diff to confirm only the intended catch was changed and no secret-bearing data is logged.

## Manual verification

1. Keep the current Android development app connected to Metro and start the redacted runtime log capture.
2. Tap Continue with Google and select the same test account the user has been using.
3. If sign-in fails, verify the development log identifies the underlying provider/Clerk error while the UI still shows its generic retry notice.
4. If sign-in succeeds, verify onboarding continues to the language step and no failure diagnostic is emitted.
5. Confirm the capture contains no email address, token, credential, or authorization value.
