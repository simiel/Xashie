# Fix Android Ask Hashie keyboard overlap

## Goal

Keep the Ask Hashie composer visible above the Android keyboard while typing, without changing the existing iOS behavior or the chat interaction model.

## Inspected code and configuration

- `apps/hashie/app/(tabs)/ask.tsx`
  - Wraps the screen in `KeyboardAvoidingView`.
  - Uses `behavior="padding"` on iOS and `undefined` on Android.
  - Renders the message `FlatList` above a bottom composer containing the multiline `TextInput`.
  - Already sets `keyboardShouldPersistTaps="handled"` on the list.
- `apps/hashie/app/(tabs)/_layout.tsx`
  - Uses Expo Router tabs with a visible bottom tab bar.
- `apps/hashie/app/_layout.tsx`
  - Uses the standard Expo Router root stack.
- No existing Android `adjustResize` or keyboard-layout override was found in the project source.

## Decision

Use `KeyboardAvoidingView` with `behavior="height"` on Android and retain `behavior="padding"` on iOS. This is the smallest owning-component change and lets the existing flex layout shrink so the composer remains above the keyboard.

Do not change API behavior, message state, navigation, styling tokens, authentication, or backend configuration.

## Files to change

- `apps/hashie/app/(tabs)/ask.tsx`

## Requirements

1. Replace the Android `undefined` keyboard behavior with `height`.
2. Preserve the existing iOS `padding` behavior.
3. Keep the composer usable for both empty and multiline drafts.
4. Preserve accessibility labels, send/stop controls, error handling, and starter-question behavior.
5. Do not expose, add, or modify credentials or environment values.

## Acceptance criteria

- On Android, focusing the health-question input causes the available screen area to resize and the composer remains visible above the keyboard.
- The input can be tapped, typed into, scrolled within when multiline, and submitted while the keyboard is open.
- The message list remains scrollable and the tab bar does not obscure the composer.
- iOS behavior is unchanged.
- No TypeScript or lint errors are introduced.

## Checks

- Run the mobile TypeScript check if available from the workspace configuration.
- Run `git diff --check`.
- Rebuild or refresh the Android app as required by the changed source.
- Use Argent on the connected Android device to open Ask Hashie, focus the input, type a representative question, verify the composer remains visible, and verify the send control remains reachable.

## Manual test steps

1. Launch Hashie on the connected Android device.
2. Navigate to Ask Hashie.
3. Tap `Your health question`.
4. Type `What happens during puberty?`.
5. Confirm the keyboard does not cover the input or send control.
6. Type enough text to create multiple lines and confirm the input remains usable.
7. Dismiss the keyboard and confirm the screen returns to its normal layout.
