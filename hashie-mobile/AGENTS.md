This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Hashie mobile conventions

- This is the only Expo application workspace. Keep mobile-only behavior here; API authorization, provider calls, medical safety classification, and sensitive persistence stay on the API.
- Use Expo SDK 57, TypeScript, Expo Router, Continuous Native Generation, and `pnpm`. Check the matching official Expo documentation before adding or changing Expo, React Native, or native APIs.
- Prefer Apple-native interaction patterns on iOS: Expo Router stacks and native tabs, SF Symbols, platform-native `Pressable`, `TextInput`, `Switch`, modal/sheet presentation, haptics, and system typography. Tailwind/NativeWind is for styling only; never recreate a platform control with a generic web widget.
- `@expo/ui` is available for SwiftUI/Jetpack Compose controls when a React Native native control cannot meet an interaction requirement. Verify the matching Expo UI documentation before adding it to a screen.
- Tailwind uses NativeWind v5 and Tailwind CSS v4. NativeWind v5 is currently pre-release, so keep its use isolated to `src/ui/` and reassess it before a production release. Do not add a second UI kit without an approved requirement.
- Shared UI copy belongs in `src/content/`. The supported language codes are `en` (provider `eng`) and `tw` (provider `akh`). Do not silently substitute a language. Akan/Twi copy requires native-speaker and clinical review before release.
- Do not make diagnostic, prescribing, dosage, emergency-service, or unverified-referral claims in client copy. Screen content must state when human or emergency help is needed.
- Critical flows must support VoiceOver/TalkBack labels, Dynamic Type, reduced motion, visible error/state messaging, captions/transcripts for audio, and 44-point minimum touch targets.
- Keep private values out of the app. `EXPO_PUBLIC_*` values must be non-sensitive; do not add provider credentials, tokens, health content, or user identifiers to configuration or logs.

## Local development and verification

- `pnpm start`, `pnpm ios`, `pnpm android`, and `pnpm web` run Expo. Start in Expo Go only where all needed native modules are available; use a development build when native configuration requires it.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test -- --run`, `pnpm expo-doctor`, and the relevant `pnpm expo export --platform <platform>` before handing off a change.
- Argent is installed locally with telemetry disabled. Use it for simulator/device smoke flows, accessibility-tree inspection, console/network debugging, and targeted performance profiling. Do not capture or retain production-like health data, credentials, audio, or private user content in Argent artifacts. Record the actual result rather than claiming visual or accessibility verification.
