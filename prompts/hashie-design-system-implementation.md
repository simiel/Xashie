# Hashie Design System Implementation

## Goal

Implement the reusable Hashie visual foundation in `apps/hashie` without building new product workflows or adding new feature screens. The design system should be the single source of truth for the existing Expo app and future Home, Learn, Ask Hashie, Check-in, onboarding, and Profile work.

## Skills and guidance

- Expo `building-native-ui` skill for Expo Router, React Native styling, responsive layout, accessibility, and Expo Go compatibility.
- Existing project-scoped Argent skills for later mobile verification; the current request is design-system implementation, not device-flow testing.
- Follow `apps/hashie/AGENTS.md`, the root `AGENTS.md`, and the generated design reference at `artifacts/design/hashie-design-system-v1.png`.

## Inspected code

- `apps/hashie/app/_layout.tsx` loads only the Space Mono font and uses the default Expo Router themes.
- `apps/hashie/app/(tabs)/_layout.tsx` still uses starter tab labels, icons, and light/dark tint values.
- `apps/hashie/app/(tabs)/index.tsx` has one custom landing screen with inline colors and styles.
- `apps/hashie/constants/Colors.ts` contains starter Expo colors.
- `apps/hashie/tsconfig.json` supports the `@/*` alias.
- The app is Expo SDK 57 with TypeScript and React Native 0.86.

## Decisions

- Use a TypeScript token module as the source of truth for color, typography, spacing, radii, borders, control sizes, and shadows.
- Use `Plus Jakarta Sans` as the primary display/body family if it can be added through a compatible, reproducible Expo font package; retain the existing Space Mono asset for utility labels and metadata. If adding the font would require an avoidable native build, document the limitation and use a safe system fallback rather than adding an unverified dependency.
- Use the design-reference palette: Powder Blue `#EAF5FF`, Sky Blue `#CFE7FF`, Deep Blue `#143B67`, Bright Gold `#FFC43D`, Soft Mint `#D8F3EA`, and White `#FFFFFF`.
- Support light mode first and keep semantic token names extensible for a future dark mode; do not invent a dark visual treatment in this task.
- Use an 8-point spacing scale with `4, 8, 12, 16, 24, 32`, continuous corner curves with `12, 20, 28`, and restrained card depth.
- Prefer React Native `StyleSheet.create` or shared style objects, `borderCurve: 'continuous'`, flex gap, safe-area-aware scroll containers, and `boxShadow` where supported by the Expo version.
- Keep the system accessible by default: readable contrast, minimum 44-point touch targets, dynamic type-friendly sizing, selectable important text, visible focus/pressed/disabled states, and no color-only meaning.

## Scope

Create or update only reusable design-system code and the smallest existing-app integration needed to prove the system is wired correctly:

- Design tokens and semantic aliases.
- Font loading and typography styles.
- Shared primitives for text, surface/card, button, input, badge, message bubble, check-in choice, and bottom-navigation styling where their APIs remain generic.
- Shared accessibility constants and interaction-state styles.
- Replace starter `Colors.ts` values and existing inline landing-screen values with the shared tokens/primitives where practical.
- Update the existing tab shell’s visual tokens only as needed to consume the design system; do not add the Learn, Ask Hashie, Check-in, or Profile workflows.

## Out of scope

- No new routes, screens, backend work, authentication, AI behavior, knowledge content, persistence, analytics, or production configuration.
- No replacement of the generated artwork or creation of a new brand mark.
- No Expo development build; keep the app compatible with Expo Go.
- No debugger remediation; Expo Go’s physical-device debugger limitation remains accepted.

## Requirements

1. Components must be typed, small, composable, and usable by future screens without coupling to a specific route.
2. Components must expose accessible labels/roles and support disabled, pressed, selected, and focus-visible states where relevant.
3. Typography must use semantic roles rather than arbitrary per-screen font sizes.
4. Color usage must use semantic names such as `background`, `surface`, `textPrimary`, `textSecondary`, `accent`, `success`, `warning`, and `urgent`.
5. The existing landing screen must visually move toward the saved Hashie references without adding new content or workflows.
6. Avoid unsupported styling or dependencies; verify the implementation against the installed Expo SDK.

## Security and privacy

- Do not add secrets, remote credentials, analytics identifiers, or network calls.
- Do not add personal or health data.
- Keep all design-system code client-only and content-agnostic.

## Acceptance criteria

- The Expo app type-checks with `npx tsc --noEmit`.
- `npx expo-doctor` passes with no new warnings attributable to this change.
- `npx expo export --platform web` succeeds.
- The current app loads with the shared typography and semantic tokens instead of starter inline colors.
- Shared primitives render their default, pressed/selected, disabled, and focus-relevant states without clipping at common phone widths.
- Important text remains readable with larger font settings and controls meet the 44-point minimum target guidance.
- No new product workflow or route is introduced.

## Manual verification

1. Start the app from the Expo project in the Visual Studio Code terminal using Expo Go.
2. Use Argent to inspect the running screen and confirm the existing landing route renders with the new design tokens and typography.
3. Exercise any rendered component states available in the design-system preview or existing screen.
4. Check long text, larger system text, pressed states, disabled states, and contrast.
5. Record passed, failed, and skipped checks separately.

## Files expected to change

- `apps/hashie/constants/Colors.ts` or a replacement semantic token module.
- New reusable files under `apps/hashie/components/` and/or `apps/hashie/constants/`.
- `apps/hashie/app/_layout.tsx` for font registration if needed.
- `apps/hashie/app/(tabs)/_layout.tsx` and `apps/hashie/app/(tabs)/index.tsx` only for token adoption, not new workflows.
- `apps/hashie/package.json` and lockfile only if a compatible font dependency is justified.

## Implementation rule

Do not begin code changes until the user approves this prompt. After approval, implement only this scope, run the checks above, and report what passed, failed, skipped, and remains for manual review.
