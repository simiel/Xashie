# Production Android Google Sign-In remediation

## Goal

Make native Google sign-in work in Hashie's EAS-signed production Android APK without weakening guest access, exposing credentials, or changing authentication ownership boundaries.

## Skills and references

- `clerk-expo` for the installed `@clerk/expo` native Google flow.
- `argent-react-native-app-workflow`, `argent-android-emulator-setup`, and `argent-device-interact` for any device verification. Argent is unavailable in this task's callable tool inventory, so no device interaction will be attempted unless it becomes available or the user explicitly permits a fallback.
- Clerk's official Expo Google sign-in guide: https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google

## Inspected state

- `apps/hashie/app.config.js` defines Android package `com.hashie.app`, enables `@clerk/expo` and `@clerk/expo-google-signin`, and injects the native Google client IDs into Expo `extra` for EAS builds.
- The EAS production environment contains the required public client configuration and the release APK built successfully.
- `apps/hashie/app/onboarding/access.tsx` calls the current `useSignInWithGoogle()` native hook on Android.
- The installed SDK maps the user-visible text to Android's generic `GOOGLE_SIGN_IN_ERROR`, which the native Credential Manager also uses for an unregistered Android OAuth client.
- The app's Android-specific client ID is present. The native Android request uses the web client ID as its server client ID; Android package/certificate authorization is enforced by Google Cloud, independently of that value.
- Local development and EAS production use different Android signing certificates. Local success therefore does not prove the EAS release certificate is registered.

## Diagnosis

The highest-probability production-only failure is missing or mismatched release certificate registrations:

1. Google Cloud Console must have an **Android OAuth client** for package `com.hashie.app` with the EAS-managed release keystore's **SHA-1**.
2. Clerk Dashboard > Native Applications must have an Android entry for package `com.hashie.app` with that same keystore's **SHA-256**, and native API access enabled.
3. Clerk's Google social connection must use the matching web-client ID and secret, with the Clerk-provided redirect URI registered in Google Cloud.

## Approved-scope implementation plan

After approval, I will:

1. Retrieve the release credential fingerprints from EAS without downloading or revealing the keystore or its passwords.
2. Provide the SHA-1 and SHA-256 to the account owner for entry in Google Cloud and Clerk, or apply those dashboard changes only if the authenticated owner access is available and the user expressly authorizes it.
3. Add a privacy-safe production diagnostic code for native Google provider failures, so future reports distinguish configuration, cancellation, unavailable activity, and provider errors without exposing Google/Clerk error text or user data.
4. Add unit coverage for that diagnostic behavior, validate the EAS config, and make a new internal production APK only after the external registrations are confirmed.

## Security and privacy

- Never log Google account details, raw provider errors, OAuth secrets, Clerk secrets, keystore contents, or passwords.
- Android SHA fingerprints and the package name are safe to share only with the authorized project owner for provider registration.
- Guest access remains available and unchanged.

## Acceptance criteria

- Google Cloud's Android OAuth client exactly matches `com.hashie.app` and the EAS release SHA-1.
- Clerk's Android Native Application exactly matches `com.hashie.app` and the EAS release SHA-256.
- The Google client ID/secret configured in Clerk is the matching web OAuth client and its redirect URI is registered.
- A newly built EAS production APK opens the Android account chooser and completes a Clerk session on a physical Android device.
- A cancelled chooser remains non-fatal and guest access continues to work.

## Checks and manual verification

1. Run `npm run check:google-config`, TypeScript, and Google sign-in unit tests.
2. Confirm EAS production config has all required client values without printing them.
3. Build a new `production-apk` artifact only after the dashboard configuration is complete.
4. On the Android phone, launch the new APK, choose **Continue with Google**, select an account, and verify the onboarding route proceeds past the access screen. Cancel once and verify no error is shown; choose guest access and verify it still works.

## Decision needed

The external Google Cloud and Clerk dashboard registrations are account-level changes. Approval is required before I change source code, modify those dashboards, or issue a replacement APK.
