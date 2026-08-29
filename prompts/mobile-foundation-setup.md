# Hashie mobile foundation setup

## Goal

Create the `hashie-mobile/` Expo application foundation for Hashie, using TypeScript, Expo Router, native navigation, Tailwind-compatible styling, and a small bilingual safety-first starter screen.

## Inspected context

- Root repository currently contains only `AGENTS.md`; its existing modification is user-owned and must remain untouched.
- The mobile application must be isolated in `hashie-mobile/`.
- Current official Expo documentation (2026-08-28) recommends SDK 57 and Expo Router for new applications.
- Expo Router native tabs provide system-native tabs. `@expo/ui` exposes SwiftUI/Jetpack Compose controls, but is intentionally not added to the initial runtime until a screen needs a platform-specific control beyond React Native's native controls.
- Expo documents NativeWind and Uniwind as compatibility layers for Tailwind on Android and iOS. NativeWind v5 is currently pre-release; use it only for styling and document this risk.
- Argent is an agentic toolkit for simulator/device control, debugging, profiling, flow replay, and visual regression. It will be initialized as development tooling and used for a smoke test when the local simulator service is available.

## Decisions and assumptions

- Use `pnpm`, Expo SDK 57, Expo Router, React Native's New Architecture defaults, strict TypeScript, typed routes, and native tabs.
- Use native platform components for behavior: Expo Router stacks/tabs, React Native `Pressable`, `TextInput`, `Switch`, `ScrollView`, safe-area context, and SF Symbols. Tailwind utilities style those components but do not emulate native controls.
- Create a deliberately small, static foundation: a privacy/safety welcome surface and native Home, Learn, Support, and Settings tabs. No authentication, API, voice, medical advice, network requests, analytics, or storage of sensitive data is included.
- Establish English (`en`) and Akan/Twi (`tw`, provider `akh`) terminology and starter UI copy. Translation quality must receive native-speaker review before release.
- Do not add a production provider SDK or real credentials. The API will own authorization and sensitive operations.

## Security and privacy

- No secrets or user health data are committed or logged.
- App configuration has only public identity fields and local development metadata.
- The scaffold explains that Hashie provides health education/support, not diagnosis or emergency services.

## Acceptance criteria

- `hashie-mobile/` is an independently runnable Expo project.
- It contains TypeScript, Expo Router, native tab navigation, NativeWind styling support, lint/typecheck/test scripts, app config, and a reproducible Codex Run action.
- Project-local mobile-agent instructions record the stack, safety boundaries, iOS-native-first UI policy, accessibility expectations, documentation rule, and Argent loop.
- Argent is initialized and its instructions are retained locally without exposing sensitive data.
- A starter screen renders with correct accessibility labels and test coverage for core text/language metadata.

## Checks and manual verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- --run`
- `pnpm expo-doctor`
- `pnpm expo export --platform ios`
- Use Argent to launch the iOS simulator and inspect the accessibility tree; if the host simulator service is unavailable, report that exact blocker and leave Argent configured for the next run.
