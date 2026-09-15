# Restore Argent debugger support with an Expo development build

## Goal

Make the Hashie Expo app debuggable through Argent on the connected Android phone while preserving the current Expo Router app and the mandatory Argent workflow.

## Finding

Argent reaches the running app and Metro, but the debugger connection fails at `Debugger.setPauseOnExceptions`. The app is running in Expo Go with Expo SDK 57 / React Native 0.86 bridgeless Hermes. Expo documents a reproduced SDK 57 issue where HermesRuntime[RNBridgeless] does not support Chrome DevTools Protocol debugging on physical Android devices; the app continues to run normally.

## Inspected state

- Expo app: `apps/hashie`
- Expo SDK: 57.0.x
- Android target: connected physical Android device, SDK 36
- Metro: listening on port 8081
- ADB reverse forwarding: configured for port 8081
- Argent: globally installed and linked; project MCP and skills configured
- Current app launch mode: Expo Go

## Proposed decisions

- Add the Expo development-build capability required for Argent runtime debugging rather than attempting to patch Argent or rely on unsupported Expo Go CDP behavior.
- Use `npx expo install expo-dev-client` and the project’s local Android run workflow only if the installed Expo SDK resolves a compatible version.
- Add only the minimal app configuration and package script changes needed to support a local development build.
- Keep Expo Go available as a lightweight fallback for visual checks, but use Argent with the development build for debugger, component tree, logs, and runtime inspection.
- Do not add production credentials, backend configuration, or application feature work.

## Security and privacy

- Do not commit device identifiers, tokens, logs containing user data, or credentials.
- Keep all debugging local to the developer machine and connected test device.
- Review generated native/config files for secrets before retaining them.

## Acceptance criteria

1. A compatible Expo development build can be installed and launched on the connected Android device.
2. Argent can list the device, inspect the app screen, and connect to the React Native debugger without the `setPauseOnExceptions` failure.
3. Argent can retrieve the React component tree or debugger status for the Hashie app.
4. The existing Expo Go visual workflow remains documented and the app UI is unchanged.
5. Changes are limited to the approved development-build setup and documentation/configuration.

## Checks

- Run Expo dependency validation and TypeScript checks.
- Build/install the development client on the connected Android device.
- Start Metro in development-client mode from the VS Code terminal.
- Use Argent `list-devices`, `launch-app`, `describe`, `debugger-connect`, and `debugger-status`.
- Review Git status and confirm no secrets or unrelated files were added.

## Manual verification

1. Launch the development build on the connected Android device.
2. Confirm the Hashie home screen renders.
3. Use Argent to inspect the accessibility tree and React component tree.
4. Confirm Argent debugger status reports a connected runtime.
5. Confirm the original Expo Go path is still available if the user wants a quick visual-only run.

## Approval gate

Do not install `expo-dev-client`, change app configuration, generate native Android files, or build/install the development client until the user explicitly approves this prompt.
