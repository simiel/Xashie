# Android build environment setup

## Goal

Make local Expo Android builds work from the user's macOS zsh terminal and VS Code terminal by exposing the already-installed JDK and Android SDK paths.

## Skills and guidance

- `argent-android-emulator-setup`: Android SDK platform tools are required; emulator tooling is optional when using the existing SM_A566B phone.
- Repository `AGENTS.md`: get approval before changing machine configuration; run app processes and device checks in the user's VS Code terminal; use Argent for supported mobile interaction.

## Inspected state

- `apps/hashie/package.json`: Expo `~57.0.23`, React Native `0.86.3`, script `android: expo run:android`.
- Android Gradle wrapper: Gradle `9.3.1`.
- `java` currently resolves to `/usr/bin/java`, but macOS reports no registered runtime when run without configuration.
- Homebrew OpenJDK 17 is installed at `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`; invoking its `bin/java -version` succeeds.
- Android SDK is installed at `/opt/homebrew/share/android-commandlinetools`, not the default `~/Library/Android/sdk`.
- `sdkmanager --sdk_root=/opt/homebrew/share/android-commandlinetools --list_installed` succeeds when given the JDK path and confirms platform 36, build-tools 35/36, NDK 27.1.12297006, and platform-tools.
- No Android/JDK path overrides were found in the existing `~/.zshrc` or `~/.zprofile`.
- `adb` is available at `/Users/samuel/platform-tools/adb`; the repo's run log selected physical device `SM_A566B`.
- Existing working-tree changes were present before this task. Do not alter them.

## Decisions and assumptions

- Reuse the JDK and SDK already installed. Do not run Homebrew installs or download Android packages.
- Add an idempotent environment block to `~/.zshrc` only, preserving all existing content. Set `JAVA_HOME` to the verified Homebrew JDK; set `ANDROID_HOME` and `ANDROID_SDK_ROOT` to the verified SDK root; prepend JDK `bin`, SDK `platform-tools`, and SDK `cmdline-tools/latest/bin` to `PATH` without duplicating entries.
- Do not edit project Gradle files, `local.properties`, `.env.local`, or app source.
- Do not print or modify environment secrets.
- If the user approves, back up `~/.zshrc` before adding the block. Apply the machine-level edit only after explicit approval.

## Scope

Machine config: `~/.zshrc`.

Project files: this prompt only. Preserve all pre-existing project changes and untracked files.

## Security and reversibility

- The proposed change only exports local tool paths; it grants no new permissions and changes no credentials.
- Preserve the existing shell file and make a dated backup before editing.
- Provide the exact managed block and removal instructions after completion.

## Acceptance criteria

1. A new zsh terminal reports the intended `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT`.
2. `java -version` reports OpenJDK 17.
3. `sdkmanager --sdk_root="$ANDROID_HOME" --list_installed` sees the existing packages.
4. `adb version` runs from the SDK's platform-tools directory and `adb devices -l` can see `SM_A566B` in the user's VS Code terminal.
5. Expo's Android build should proceed beyond SDK and Java discovery if run later. The user asked not to run the build during this task.

## Checks and manual test steps

Run in the user's VS Code terminal after opening a fresh zsh session:

1. `printf 'JAVA_HOME=%s\\nANDROID_HOME=%s\\nANDROID_SDK_ROOT=%s\\n' "$JAVA_HOME" "$ANDROID_HOME" "$ANDROID_SDK_ROOT"`
2. `java -version`
3. `sdkmanager --sdk_root="$ANDROID_HOME" --list_installed`
4. `command -v adb && adb version && adb devices -l`
5. Build/install check deferred at the user's request; do not run `expo run:android` or Gradle build tasks unless requested later.

The device build is not to be started until approval and must run in the user's VS Code terminal. Use Argent to inspect or interact with the app once installed; do not substitute generic UI automation when Argent supports the operation.

## Completed setup

The user approved implementation. `~/.zshrc` was backed up to `/Users/samuel/.zshrc.codex-backup-20260918-192541` and updated with the managed Android build environment block.

Verified in a fresh zsh and in the user's VS Code terminal: JDK 17, SDK manager, platform tools, installed SDK packages, and connected device `SM_A566B`. The Expo/Gradle build was intentionally not run at the user's request.
