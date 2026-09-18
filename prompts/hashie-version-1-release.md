# Hashie mobile v1.0 internal release — approval prompt

**Status: approved; execution in progress (updated 2026-09-18).**

## Goal

Prepare the Expo mobile app for v1.0 internal feedback builds on Android and iOS, after recording the current simulator experience. This means EAS internal-distribution builds only; it does not mean publishing to Google Play, App Store, or TestFlight.

## Skills and references used

- Project Argent workflow, device-interaction, and simulator QA instructions; all mobile taps, waits, and captures in this review used Argent.
- Expo `expo-deployment` and `expo-cicd-workflows` skills.
- Official [SDK 57 app-config reference](https://docs.expo.dev/versions/v57.0.0/config/app/), [EAS build-profile reference](https://docs.expo.dev/build/eas-json/), [app-version management](https://docs.expo.dev/build-reference/app-versions/), and [internal distribution guide](https://docs.expo.dev/build/internal-distribution/).

## Inspected project state

- `apps/hashie/package.json` is already `1.0.0`; Expo is `~57.0.23`, React Native is `0.86.3`, and TypeScript is `~6.0.3`.
- `apps/hashie/app.json` already declares Expo `version: "1.0.0"` and Android package `com.hashie.app`. The local iOS simulator prebuild added `ios.bundleIdentifier: "com.hashie.app"`; this is now an uncommitted config change and matches the identifier used by the local simulator build. I will preserve it unless you direct otherwise.
- `apps/hashie/eas.json` already has a `preview` profile with internal distribution and Android APK output; there is no explicit iOS-specific override.
- The earlier EAS error named missing `typescript@5.9.3`. The current package and lockfile both request/resolve TypeScript `6.0.3`; `npm ci --include=dev --dry-run --ignore-scripts --no-audit --no-fund` completed successfully (`up to date`). No lockfile repair is currently indicated, so the proposal does not change dependencies. A real clean install and both cloud build logs will be checked after approval.
- No Android emulator was available for this simulator run. The interactive review below used an iPhone 17 Pro simulator.

## Simulator QA and captured evidence

Named screenshots and an index are in [`artifacts/version-1.0`](../artifacts/version-1.0/README.md). Onboarding used synthetic, non-identifying choices: English, no nickname, age group 18–24, and “No changes needed.” No real account, personal, or health data was entered.

- Guest onboarding/preferences, Home, offline learning library, topic/section browsing, search for “puberty,” and opening a learning answer rendered.
- The first synthetic Ask query, “What happens during puberty?”, returned a service-unreachable/incomplete error. At your request I retried once after the AI gateway cold start; the retry returned an educational answer. The earlier incomplete attempt remains visible in the conversation, so the old failure capture is retained and the successful retry has a separate screenshot.
- Check-in explicitly says it is preview-only. Home’s urgent-help informational link says it is not connected yet. Google sign-in was not tested.
- The initial four Argent captures were emitted at preview resolution (302 × 656); the remaining captures are full simulator resolution (1206 × 2622). The screenshot README records this limitation.

## Proposed decisions

1. Keep the user-facing app version as `1.0.0` (the conventional semantic-version representation of “1.0”); it is already present in both the Expo config and the mobile package manifest. The backend remains a separately deployed service and is not versioned or redeployed by this mobile release task.
2. Keep Android application ID and iOS bundle identifier `com.hashie.app`, subject to the Apple Developer account accepting that identifier. Do not change app identity during a preview release.
3. Set EAS `cli.appVersionSource` to `remote` and enable `autoIncrement` on `preview`, letting EAS maintain distinct monotonically increasing Android `versionCode` and iOS `buildNumber` values while the visible app version remains `1.0.0`.
4. Use the existing `preview` profile for both builds. Android produces an installable APK. iOS uses internal Ad Hoc provisioning, which only installs on registered iOS devices. These are not store submissions, and no `eas submit` command will be run.
5. Reuse existing Expo/EAS and Apple signing credentials only. If EAS requires a new credential, Apple team selection, new device registration, a paid account, or a credential replacement, stop and ask rather than creating or changing it.

Expo documents that internal iOS builds use registered-device Ad Hoc provisioning and that internal build URLs are available to anyone holding the URL by default. Share any resulting link only with testers you choose; it is not a public app-store release. If no iOS device is already registered to the configured Apple team, the iOS build may pause until one is registered.

## Files and external actions in scope after approval

- `apps/hashie/eas.json`: add the remote EAS version source and preview auto-increment setting; retain the existing internal Android APK configuration.
- `apps/hashie/app.json`: leave the app version and platform identifiers as inspected; no product version bump or identifier change.
- `apps/hashie/package.json` / `package-lock.json`: no planned dependency edits because the current lockfile passes the dry-run consistency check. If a full install or cloud build proves it is stale, stop and report the exact mismatch before editing dependencies.
- `artifacts/version-1.0/`: preserve the 18 captured screenshots and index, including both Ask error and retry evidence.
- After config review and tests, run `eas build --platform android --profile preview` and `eas build --platform ios --profile preview` on the linked Expo project, reusing currently configured credentials. Return the build IDs/statuses and Expo install URLs; do not distribute the URLs on your behalf.

No backend, model, auth-provider, store, production deployment, or app-screen code change is included. No secret values or `.env.local` contents will be copied into this prompt, build logs, or screenshots.

## Checks and acceptance criteria

- Confirm `npm ci --include=dev` succeeds from `apps/hashie` without changing dependency resolution; run the mobile TypeScript check (`npx tsc --noEmit`).
- Confirm the Expo public config reports app version `1.0.0`, Android ID `com.hashie.app`, and iOS ID `com.hashie.app` without printing environment secrets.
- Confirm `eas.json` parses and EAS accepts the `preview` profile for both platforms.
- Both internal EAS jobs complete successfully: Android is an APK; iOS is an Ad Hoc `.ipa` or explicitly pauses for missing Apple/device prerequisites. Report actual results, not assumptions.
- In the installed preview build, manually repeat guest setup, Home, library search/answer, one generic Ask question, Check-in preview disclosure, and Profile. Do not use personal data. Google sign-in, non-registered iOS devices, and store submission remain outside this check.
- Do not describe the build as ready for broad public use while Check-in is a prototype, the urgent-help link is disconnected, or Ask reliability remains uncertain. The observed successful retry and earlier failure must both be reported.

## Exact manual tester path

1. Install the Android APK from the EAS build page, or install the iOS Ad Hoc build only on a device registered in the Apple provisioning profile.
2. Start as a guest; choose English; leave nickname blank; choose an age group appropriate for the tester; select any relevant accessibility needs (or skip).
3. Open Learn, search `puberty`, open a result, and read the answer.
4. Open Ask and submit a non-personal educational question. If it fails, use Retry once and report both the failure and result; never include identifying or sensitive details.
5. Open Check-in and note that it is preview-only; open Profile and confirm the displayed session preferences.
6. Send feedback without screenshots that contain personal health content, account tokens, or other identifying information.

## Items that need your attention

- The plan was approved. `apps/hashie/eas.json` now uses remote app versioning and preview auto-increment; the user-facing app version remains `1.0.0`.
- Local clean install, TypeScript check, Expo config validation, and `git diff --check` passed. The earlier missing-TypeScript lockfile mismatch did not reproduce; no dependency or lockfile edits were needed.
- Android internal APK build `6482e8b7-3ee0-46bf-9a47-410c7129be44` was uploaded successfully and is `IN_QUEUE`: [Expo build page](https://expo.dev/accounts/simiel/projects/hashie/builds/6482e8b7-3ee0-46bf-9a47-410c7129be44). EAS reported elevated Android queue times. The configured preview environment contains `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `EXPO_PUBLIC_HASHIE_API_BASE_URL`; values are intentionally not recorded here.
- The iOS build did not start. With credentials frozen, EAS reported that no existing iOS credentials were suitable for internal distribution. No device registration, signing-credential creation, or credential change was attempted. A separate authorized Ad Hoc signing/device-registration step is required before retrying. EAS also warned that `ITSAppUsesNonExemptEncryption` is unset and App Store Connect export-compliance configuration may be needed before iOS testing.
- No Android emulator or connected Android device was available for post-build install testing during this run. The build is still queued, so its final build result and APK artifact remain pending.
- Internal build links are bearer links by default; choose testers before sharing any link.
