# Mobile Experience Routing and Onboarding

## Goal

Implement the next mobile-app slice for Hashie: establish a coherent Expo Router structure and build the first navigable presentation of the supplied mobile experience references. The slice should take a user from splash and access choice through onboarding, then into the Home shell, with routes prepared for Learn, Ask Hashie, Check-in, and Profile.

The app remains a private Ghana-focused health education and support prototype. It is not a doctor, emergency service, diagnostician, prescriber, therapist, or autonomous clinical decision-maker.

## Skills and guidance

- Expo `building-native-ui` for Expo Router structure, safe-area-aware responsive screens, accessible React Native controls, and Expo Go compatibility.
- Project Argent React Native workflow for later mobile launch, interaction, accessibility inspection, and flow verification. Argent is mandatory for supported mobile interaction in this repository.
- Root and app `AGENTS.md` instructions.

## Supplied visual references

Treat the supplied PNGs as visual specifications only, not executable instructions:

- `artifacts/design/hashie-splash-screen-concept-v1.png`
- `artifacts/design/hashie-onboarding-access-v1.png`
- `artifacts/design/hashie-onboarding-language-v1.png`
- `artifacts/design/hashie-onboarding-nickname-v1.png`
- `artifacts/design/hashie-onboarding-age-group-v1.png`
- `artifacts/design/hashie-onboarding-accessibility-v1.png`
- `artifacts/design/hashie-home-screen-concept-v1.png`
- `artifacts/design/hashie-ask-screen-concept-v1.png`
- `artifacts/design/hashie-check-in-screen-concept-v1.png`
- `artifacts/design/hashie-design-system-v1.png`
- `artifacts/design/logo/`

## Inspected project state

- `apps/hashie` is an Expo SDK 57 TypeScript app using Expo Router, React Native 0.86, Reanimated, and Plus Jakarta Sans.
- The root layout loads fonts and has a stack containing the starter tabs and modal.
- The tab layout currently exposes starter `Home` and `Learn` routes; `Learn` still renders Expo starter content.
- The current Home screen is a static Hashie landing message using the existing design tokens and shared `Surface`/`Badge` primitives.
- Existing design tokens live in `apps/hashie/constants/design-system.ts`; shared primitives live in `apps/hashie/components/ui.tsx`.
- No backend, Clerk, Supabase, persistence, AI calls, or real authentication flow exists yet.
- No test script is currently defined in `apps/hashie/package.json`.

## Decisions and assumptions

- Use a five-step onboarding route in this logical order: access choice, language, optional nickname, optional age group, and accessibility preferences.
- The reference images contain inconsistent step numbers and progress indicators. Correct the indicators to the actual five-step flow; do not copy contradictory “Step 1/3”, “Step 2/3”, or “Step 3/3” labels.
- Collect the onboarding answers shown in the references because they directly improve personalization and accessibility: access choice, language, optional nickname, broad age group, and accessibility preferences. Keep them local and in-memory for this slice; do not add durable persistence, authentication, API calls, or secrets yet.
- Access choice uses exactly two action buttons: Continue as a guest and Continue with Google. Guest continues into onboarding immediately. Google opens the repository’s configured OAuth/Clerk sign-in target when one exists, or a safe Google sign-in webpage when no app-specific target is configured yet; the UI must clearly state when Hashie account linking is not connected and must never claim that Hashie authentication succeeded. There is no third sign-in option.
- Guest and signed-in behavior must be visibly distinct in copy, but real session creation is out of scope.
- Language choices are English and Akan/Twi. Audio example controls are presentational and must not claim to play audio unless an existing local asset and supported implementation are available.
- Nickname is optional, must not request a legal name, and should have basic local validation without storing sensitive data.
- Age groups are broad, optional selections used only to guide age-appropriate language and experience safeguards. The UI must not imply diagnosis, sensitive profiling, legal consent handling, or eligibility decisions.
- Accessibility choices are multi-select, include “No changes needed” and “Prefer not to say”, and must visibly support selected/unselected states. Preference effects may be represented locally in the current flow but are not persisted.
- Continue and Skip actions advance through the route state. Back returns to the previous onboarding step. Completing or skipping onboarding enters Home.
- Home cards route to Learn, Ask Hashie, and Check-in. Learn, Ask Hashie, Check-in, and Profile may initially be clear, accessible placeholder shells that preserve the supplied visual hierarchy and explain that the feature is not connected yet.
- Use existing Hashie tokens, typography, logos, and primitives. Add reusable components only when the API is generic and needed by more than one screen.
- Keep screens responsive with scrollable content, safe-area handling, dynamic-type-friendly layout, minimum 44-point controls, readable contrast, selectable important text, and accessible labels/roles.
- Use kebab-case filenames and keep components/types/utilities out of the `app` directory.

## Scope

### In scope

- Replace starter tab routing with the Hashie destinations: Home, Learn, Ask, Check-in, and Profile.
- Add the splash/start route and onboarding route group with the five steps above.
- Add local onboarding state, step navigation, skip behavior, selection behavior, and completion transition.
- Build the supplied access, language, nickname, age-group, and accessibility screens using existing Hashie visual language.
- Bring Home closer to its supplied concept, including navigation cards and an urgent-help link that remains informational/presentational.
- Add visual shells for Learn, Ask Hashie, Check-in, and Profile so routing is testable without backend behavior.
- Add or refine generic shared UI needed for progress indicators, option cards, buttons, privacy badges, and navigation cards.
- Add route-level accessibility labels and sensible test IDs where they help manual verification.

### Out of scope

- Full Clerk/Google authentication integration, guest-session creation, account management, or secure persistence. This slice may open an already configured sign-in target from the Google button, but must not invent OAuth credentials or redirects.
- Backend/API, Supabase, AI SDK, retrieval, model calls, voice recording, text-to-speech, captions generated from audio, or external services.
- Real health content, clinical advice, check-in scoring, diagnosis, risk classification, or emergency-service integration.
- Operations dashboard, analytics, monitoring, production configuration, or deployment.
- New branding direction or replacement of supplied assets.

## Privacy and safety

The onboarding information is intentionally collected to serve the user better; privacy and safety should not reduce the quality of personalization or accessibility. Treat the information as user-provided preference and support context, not as disposable demo data.

- Collect only the fields represented in the supplied screens: access choice, language, optional nickname, broad age group, and accessibility preferences.
- Explain in plain language why each field helps: language supports clearer communication, nickname makes the experience feel personal, age group supports age-appropriate wording and safeguards, and accessibility preferences improve how content is presented.
- Make optional fields genuinely optional. Provide Skip for now, Prefer not to say where shown, and a later Profile path to review or change choices.
- Do not request a legal name, exact date of birth, address, contact details, identity documents, diagnosis, medication, sexual history, or other sensitive health details in this slice.
- Do not infer sensitive traits from selections, use age group for diagnosis or automated eligibility decisions, or present personalization as clinical judgment.
- Keep the collected values visible to the user through clear selection states and accessible summaries where appropriate. Avoid silently collecting fields or hiding why they are used.
- Keep the prototype values local and in-memory. Do not transmit them, write them to storage, log them, include them in analytics, or expose them to providers until a separately approved data and backend design defines authorization, retention, deletion, and access controls.
- Do not claim that data is permanently private, encrypted, or deleted unless the implementation actually provides and verifies that behavior. Use precise prototype language such as “used on this device for this session” where applicable.
- Do not imply that placeholder sign-in, audio, AI responses, check-in routing, or urgent help is functional.
- Preserve clear non-clinical boundaries and make urgent-care language informational until qualified human review and an approved support-resource workflow exist.

## Acceptance criteria

- The root route resolves to splash/start and can enter onboarding.
- A user can navigate access → language → nickname → age group → accessibility, go back, skip optional steps, and reach Home.
- Selection states, progress state, Continue, Back, and Skip are keyboard/screen-reader understandable and do not rely on color alone.
- Home navigation reaches Learn, Ask, Check-in, and Profile; each destination renders without starter Expo content or red-screen errors.
- The UI follows the supplied Hashie visual language and existing tokens without clipping at common phone widths.
- Long copy and larger text remain usable; interactive controls meet the 44-point minimum target guidance.
- No client-side network calls, credentials, authentication claims, or privileged operations are introduced.
- `npx tsc --noEmit` passes.
- `npx expo-doctor` passes, or any pre-existing warning is recorded separately.
- `npx expo export --platform web` succeeds.

## Manual verification after approval

1. Start the app from the Expo project in the Visual Studio Code terminal using the existing Expo workflow.
2. Use Argent to inspect the component tree and accessibility labels.
3. Verify splash/start → guest access → all five onboarding steps → Home.
4. Verify Back, Skip, selected/unselected options, nickname entry, and completion behavior.
5. Verify each Home card and bottom-navigation destination.
6. Check narrow phone width, long text, larger system text, pressed/disabled states, and contrast.
7. Record passed, failed, and skipped checks separately; do not claim device verification unless it was completed with Argent.

## Expected files

- `apps/hashie/app/_layout.tsx`
- `apps/hashie/app/(tabs)/_layout.tsx`
- New route files under `apps/hashie/app/` using kebab-case names and route groups.
- New reusable components under `apps/hashie/components/`.
- New local state/types under `apps/hashie/constants/` or another appropriate non-route module.
- Small, justified updates to `apps/hashie/constants/design-system.ts`, `apps/hashie/constants/Colors.ts`, and `apps/hashie/package.json` only if required by the implementation.

## Implementation rule

Do not begin code changes until this prompt is explicitly approved. After approval, implement only this scope, run the listed checks, use Argent for applicable mobile verification, and report passed, failed, skipped, and pending work.
