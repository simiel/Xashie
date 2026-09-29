# EAS Cloud Build Readiness and Installable Test Artifacts

## Goal

Make `apps/hashie` ready for reliable EAS Cloud builds, then create and deliver an installable Android preview APK. Also create an iOS Simulator artifact that can be run locally without Apple Developer signing credentials, so the native release path can be exercised on both platforms.

## Skills and authoritative references

- `argent-react-native-app-workflow` for React Native build and device-flow verification. Any simulator interaction will use the project-required Argent workflow.
- Expo SDK 57 and current EAS documentation for dynamic configuration, EAS environment variables, internal APK builds, and iOS Simulator builds.

## Inspected context

- `apps/hashie/package.json`, `package-lock.json`, `app.json`, `app.config.js`, `eas.json`, native generated folders, environment template, and readme.
- `npx expo-doctor` currently reports 19 of 21 checks passing. It reports five Expo SDK 57 patch dependencies behind the required compatibility versions and an ambiguous static-plus-dynamic application config layout.
- The effective local public config resolves with the expected application IDs, plugins, EAS project ID, and all four native Google sign-in values present. Values were not recorded in this prompt.
- `npm run check:google-config` fails when invoked without Expo's local environment loading. This is expected locally but proves the four values must be configured in the selected EAS environment because the EAS pre-install hook requires them.
- `preview` already targets an installable Android APK and uses the `preview` EAS environment. `appVersionSource` is remote.
- The generated `ios/` and `android/` folders are ignored, so EAS should use the managed/CNG configuration rather than local native build artifacts.

## Decisions

1. Keep this as an internal `preview` Android APK, not a Play Store AAB or submission.
2. Add a separate `ios-simulator` EAS profile that extends the preview profile, uses the `preview` EAS environment, and sets `ios.simulator: true`. This produces an unsigned simulator artifact and requires no Apple Developer credentials. It is not installable on a physical iPhone.
3. Use EAS-managed Android signing credentials for the preview APK if the EAS account does not already have a compatible keystore. Do not create, export, print, or commit signing material.
4. Store the six client-safe build values in EAS's `preview` environment: backend base URL, Clerk publishable key, and the four Google sign-in values. They are public by design once embedded in the app, but their raw values will not be copied into source, logs, or this prompt. No server secrets will be uploaded.
5. Do not change the bundle/package IDs, EAS project, owner, privacy behavior, or production profile.

## Planned changes

- Consolidate application configuration into one authoritative dynamic config representation so Expo Doctor no longer reports the static/dynamic config ambiguity, while retaining the current resolved config exactly.
- Upgrade only the five SDK 57 patch-level packages required by Expo compatibility and regenerate the npm lockfile deterministically.
- Add the iOS Simulator EAS profile described above.
- Add a non-secret, structural build-environment validation script or strengthen the existing pre-install validation so EAS fails with clear variable names when required public configuration is absent. It must not print values.
- Update the mobile README with concise cloud-build prerequisites, artifact types, and the signing/SHA registration limitation for Google sign-in.
- Do not edit ignored local environment files, generated native folders, credentials, or unrelated uncommitted files.

## EAS Cloud execution plan

1. Verify EAS authentication and inspect only the names/scope/environment/visibility of the `preview` variables; never retrieve or print their values.
2. If any required public variable is absent, stop before submitting a build and report the missing names. Creating or changing EAS environment values requires the account holder to enter the values through the EAS dashboard or authorize an interactive CLI change; values will not be requested in chat.
3. Run the approved local checks, then submit `preview` for Android to EAS Cloud.
4. When the Android cloud build succeeds, provide its EAS artifact/install link as the APK deliverable.
5. Submit the iOS Simulator profile to EAS Cloud. When it succeeds, install it on an available iOS Simulator with the EAS CLI and use Argent for the agreed smoke flow. If no simulator is installed, provide the artifact link and explicitly mark interactive verification as pending.

## Security and release constraints

- `EXPO_PUBLIC_*` values are client-visible; they are not secrets. Server credentials, OAuth client secrets, Clerk backend credentials, database credentials, and signing material must never be added to client config, EAS public variables, source, logs, or prompts.
- Google sign-in is not fully proved by compilation alone. The SHA-1 fingerprint of the EAS preview signing certificate must be registered in Google Cloud/Clerk for Android OAuth to succeed. This registration is external-provider configuration and is outside this repository.
- The backend URL and Clerk publishable key in the preview environment must belong to the same intended Clerk environment. The cloud build cannot prove server-side Clerk secret alignment.

## Acceptance criteria

- `npx expo-doctor` reports no actionable configuration or Expo SDK dependency failures.
- The resolved public Expo config contains the current identifiers, plugins, EAS project ID, and no accidentally embedded server secret.
- The pre-install check passes only with all required EAS preview variables available and reports missing names safely otherwise.
- `npm run test:session` passes.
- A cloud Android `preview` build completes successfully and its artifact is an APK.
- An iOS Simulator EAS Cloud build completes without requiring Apple Developer credentials, or a clear EAS-side reason is reported.
- The Android artifact link and iOS Simulator artifact link are delivered; smoke-test result is documented separately from compile success.

## Checks and manual verification

1. Run Expo Doctor, TypeScript compilation through the existing session test, and static resolved-config checks with all environment values redacted.
2. Inspect EAS preview variable metadata only and confirm required names are available to cloud builds.
3. Submit the Android preview APK and inspect its completed EAS build logs for dependency, prebuild, Gradle, and bundle failures.
4. Download/install the Android APK on an emulator or test device using Argent, open Hashie, and verify launch, guest onboarding, navigation to the support screen, and the visible unavailable-state behavior if no reachable preview backend is configured. Do not attempt real user authentication unless an authorized test account and registered OAuth fingerprint are available.
5. Build and install the iOS Simulator artifact, then repeat the same smoke flow with Argent. Do not attempt a physical iPhone build or IPA without Apple credentials.

## Out of scope

- Play Store submission, app-store submission, production builds, OTA updates, server deployment, external OAuth-console changes, and any credential rotation.
