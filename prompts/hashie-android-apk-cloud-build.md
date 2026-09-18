# Hashie Android APK cloud build

## Status

Approved and started on 2026-09-16.

## Goal

Create an installable Android APK for Hashie through Expo EAS so the user can test
the mobile app against the deployed backend.

## Decisions

- EAS account/project: `@simiel/hashie`
- EAS project ID: `b3cb5b6d-d232-4299-b6ec-c044adcab9be`
- Android package ID: `com.hashie.app`
- Profile: `preview`
- Distribution: internal
- Artifact: APK, not Play Store AAB
- Client environment: only `EXPO_PUBLIC_HASHIE_API_BASE_URL` and
  `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Backend secrets and Google Cloud credentials are not included in the APK.

## Build

- Build ID: `317eb064-011f-43ec-a40f-e828fc2c83e5`
- Initial status: `IN_QUEUE`
- App version: `1.0.0`
- Android build version: `1`
- Expo SDK: `57.0.0`
- Signing: EAS-generated Android keystore

## Acceptance checks

- EAS accepts the project archive.
- The preview profile produces an `.apk` artifact.
- The installed APK can reach the deployed API over HTTPS.
- Guest session, onboarding preferences, Clerk sign-in, and agent streaming are
  tested manually after download.

## Safety

The build does not create an API key. The app uses the existing backend contract;
all server credentials remain in Google Secret Manager and are never placed in the
mobile bundle.
