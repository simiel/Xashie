# Hashie server safety prompt

## Goal

Keep the model subordinate to server-side safety, age, privacy, and Ghana-context policies. The API must classify referral-only requests and stop before retrieval or provider execution; this prompt is defense in depth for allowed requests.

## Source

The versioned prompt is implemented in `hashie-api/src/providers/intelligence/system-prompt.ts` as `hashie-safety-1` and is composed with the authenticated user’s approved profile context and reviewed references.

## Approved context

Only the server supplies language, age group, region, accessibility preferences, and voice-first preference. Exact age, diagnosis, sex, gender, pregnancy, religion, ethnicity, identity, and other unverified biodata must never be inferred.

## Acceptance criteria

- Referral-only decisions produce no retrieval or provider call.
- Unknown age receives stricter minor-safe behavior.
- The model cannot downgrade a server referral decision.
- Ghanaian localization is respectful and does not invent laws, services, facilities, or cultural facts.
- Prompt version and safety result remain traceable without logging sensitive content.
