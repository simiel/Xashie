# Hashie v1.0 simulator captures

This folder contains named screenshots of the current Hashie iOS simulator experience, captured with Argent on an iPhone 17 Pro simulator while exercising the guest flow. Captures use synthetic onboarding choices and non-personal test content only. Most are full-resolution (1206 × 2622); the first four captures use Argent's 25% preview scale (302 × 656).

## Capture index

| File | Screen / flow |
| --- | --- |
| `01-welcome.png` | Welcome screen |
| `02-guest-access.png` | Guest or Google access choice |
| `03-language-choice.png` | Language selection, initial viewport |
| `04-language-choice-continue.png` | Language selection with Continue visible after scrolling |
| `05-nickname-optional.png` | Optional nickname step |
| `06-age-group.png` | Broad age-group selection |
| `07-accessibility-preferences.png` | Accessibility preferences |
| `08-home.png` | Guest home |
| `09-learning-library.png` | Offline health-learning library |
| `10-puberty-topic-sections.png` | Puberty Education sections |
| `11-physical-changes-questions.png` | Physical Changes questions |
| `12-learning-answer.png` | Example educational answer |
| `13-ask-empty.png` | Ask Hashie before sending a question |
| `14-ask-service-error.png` | First Ask attempt: service-unreachable/error state (kept as requested) |
| `15-check-in-preview.png` | Check-in screen, explicitly preview-only |
| `16-profile-preferences.png` | Profile/session preferences |
| `17-learning-search-results.png` | Library search results for “puberty” |
| `18-ask-retry-response.png` | Retry returned an answer; prior incomplete attempt remains in the conversation |

## QA notes

- Guest-session setup and preference persistence reached Home. The test used English, no nickname, synthetic age group 18–24, and “No changes needed” for accessibility.
- The offline library, topic/section navigation, question search, and answer screen rendered. Search for “puberty” returned matches.
- First Ask attempt showed a service-unreachable error. A retry of the same generic prompt, “What happens during puberty?”, returned an educational answer after the AI gateway cold start. The earlier incomplete attempt remains visible above the successful retry; see screenshots 14 and 18.
- Check-in identifies itself as a preview-only prototype. The Home urgent-help link states that it is not connected yet.
- Google sign-in was not exercised. No real personal, health, or account data was entered.
- Screenshots are review evidence, not a claim that the release is production-ready. The first four lower-resolution images were emitted by Argent's default preview capture; the rest were captured at full simulator resolution.

## Environment

- App workspace: `apps/hashie`
- Simulator: iPhone 17 Pro
- Intended product release label: 1.0 (Expo app version currently configured as 1.0.0)
- Authentication: guest path only; Google sign-in is not exercised.
