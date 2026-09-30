# Production Android APK via EAS Cloud

## Goal

Create an installable, release-signed Android APK using Hashie's production configuration through EAS Cloud, without changing the Play Store AAB behavior of the existing `production` profile.

## Inspected context

- `apps/hashie/eas.json` uses EAS remote app versions and requires EAS CLI 24.8.0 or newer.
- The existing `production` profile uses the `production` EAS environment and auto-increments the Android version code, but has no APK build type. EAS would therefore create an AAB intended for Google Play.
- The existing `preview` profile is an internal APK and uses a distinct `preview` environment.
- Local configuration and dependency readiness checks pass: Expo Doctor (21/21), `npm ci --include=dev --dry-run`, TypeScript, and session tests.
- The latest EAS Cloud attempts were blocked during dependency installation, despite a valid local clean install. No production artifact has been created.

## Decisions

1. Add a new `production-apk` profile extending `production`, with `distribution: internal` and `android.buildType: apk`. The existing production AAB profile remains unchanged.
2. Use the `production` EAS environment only. Do not copy preview/test values into production.
3. Use existing EAS-managed Android release credentials; do not export or commit signing material.
4. Before submission, inspect production EAS variable metadata only. Required public names are the backend base URL, Clerk publishable key, and four Google native identifiers. Their raw values must never be printed or copied into source/logs.
5. Do not submit to Google Play. The deliverable is an installable APK for controlled testing.

## Required production safeguards

- The production backend URL and Clerk publishable key must correspond to the intended production Clerk/backend environment.
- The EAS Android signing certificate SHA-1 must be registered for Google OAuth/Clerk before testing Google sign-in in the production APK.
- Client-visible `EXPO_PUBLIC_*` values are marked sensitive in EAS to avoid log exposure. Server keys, OAuth secrets, database credentials, and signing material are prohibited.

## Implementation and build plan

1. Add the dedicated EAS profile and document its intended artifact type.
2. Confirm production environment variable names and sensitive visibility without reading values. Stop if any are absent.
3. Normalize the ephemeral cloud lockfile in `eas-build-pre-install` with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, then run the existing non-secret Google configuration check. This is a targeted workaround for EAS's repeated false lockfile mismatch before `npm ci`; it does not commit generated lockfile changes or run dependency scripts on the cloud worker.
4. Re-run local dependency/config/type/test checks.
5. Submit the production APK with EAS CLI 24.8.0 and wait for the completed artifact.
6. Deliver the APK URL and document the exact build version, signing mode, build status, and any remaining external OAuth verification.

## Acceptance criteria

- `production` retains its existing AAB configuration.
- `production-apk` builds an internally distributed Android APK using the production environment and remote version increment.
- Production cloud configuration preflight passes without values appearing in output.
- EAS Cloud completes the build and returns a downloadable APK link.
- No production app-store submission occurs.

## Checks and controlled manual testing

1. Run `npm ci --include=dev --dry-run`, Expo Doctor, session tests, and TypeScript validation.
2. Inspect the EAS build logs for environment redaction, pre-install validation, dependency installation, JS bundling, and Gradle completion.
3. Install the APK on an Android emulator or approved test device using Argent; verify launch, guest onboarding, navigation, and the configured production-backend failure state if it is unavailable.
4. Test Google sign-in only with an authorized test account after the release certificate fingerprint has been registered externally.

## Out of scope

- Google Play submission, production server deployment, credential creation/export, OAuth-console changes, and iOS production device builds.
