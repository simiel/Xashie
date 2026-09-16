# Hashie Development Plan

## Purpose

This is the single sequence for building Hashie from prototype to a safe public release. Work should move one phase at a time. Each phase has a concrete output and a gate; do not begin the next phase until the current gate is passed or an explicit decision records why it is deferred.

Hashie is a private Ghana-focused health education and support product for teens and young adults. It provides reviewed information and supportive AI guidance in English and Akan/Twi, with accessibility support for sight- and hearing-related needs. It is not a doctor, emergency service, diagnostician, prescriber, therapist, or autonomous clinical decision-maker.

## Working rules

- Keep the mobile app, operations app, backend, data layer, and shared packages separate.
- For every feature, inspect first, write an implementation prompt, obtain approval, then build only that approved slice.
- Use Expo Go first for mobile iteration.
- Use Argent for all supported React Native and device interactions, screenshots, accessibility checks, and flow verification.
- Run application processes from the user’s Visual Studio Code terminal.
- Keep secrets and provider credentials server-side.
- Make guest access useful, private, and clearly limited.
- Prefer reversible, small changes over broad rewrites.
- For health content and safety behavior, require qualified human review before public release.

## Current position

Completed foundations:

- Repository structure for mobile, operations, backend, shared packages, artifacts, prompts, and project tooling.
- Expo SDK 57 Hashie mobile scaffold.
- Hashie visual design system with semantic tokens, Plus Jakarta Sans, reusable primitives, and accessibility states.
- Splash, Home, Ask Hashie, Check-in, onboarding, and design-system visual references.
- Initial logo suite with transparent wordmark, mark, app-icon, and reversed variants.
- Argent installed and required by the root project instructions.
- Expo Go running on a connected Android device and verified with Argent.

Not yet built:

- Real onboarding routes and persistence.
- Authentication and guest-session behavior.
- Backend API and data boundaries.
- Reviewed knowledge library.
- Ask Hashie backend orchestration.
- Check-in flow.
- Operations review tools.
- Production security, monitoring, release, and public distribution.

## The build sequence

### Phase 0 — Product, safety, and release boundaries

**Goal:** agree on what Hashie is allowed to do before adding functionality.

**Deliverables:**

- Product brief and first-release scope.
- Guest versus signed-in capability matrix.
- Supported age groups and safeguarding rules.
- English and Akan/Twi content policy.
- Accessibility baseline for sight and hearing needs.
- AI safety policy, escalation rules, and clear non-clinical boundaries.
- Data inventory: what is collected, why, retention, deletion, and who can access it.
- Public-release risk register and human-review responsibilities.

**Gate:** no unresolved decision about age handling, urgent-care routing, sensitive-data retention, or public-release ownership.

### Phase 1 — Visual foundation and mobile shell

**Goal:** make every future screen use one consistent, accessible visual language.

**Deliverables:**

- Design tokens for color, typography, spacing, radii, elevation, controls, and semantic states.
- Shared UI primitives and accessibility behavior.
- Logo and icon assets selected for their intended surfaces.
- Mobile navigation shell with stable destinations: Home, Learn, Ask, Check-in, and Profile.
- Expo font loading and Expo Go-compatible startup behavior.

**Status:** foundation implemented; navigation still contains starter routes and needs the approved product-shell pass.

**Gate:** type checks, Expo Doctor, web export, Argent visual inspection, readable large text, and no clipped or inaccessible primitives.

### Phase 2 — First-time onboarding

**Goal:** move a new user from splash to useful content with minimal friction.

**Screens:**

1. Splash.
2. Choose how to enter: guest, Google, or another sign-in method.
3. Language selection.
4. Optional nickname.
5. Broad age group.
6. Accessibility needs and preferences.
7. Direct entry to Home; no unnecessary success screen.

**Deliverables:**

- One-question-per-screen guided flow, not a long form.
- Visible progress, back navigation, and Skip for now.
- Accessible defaults before the accessibility question is answered.
- Local draft state so interrupted onboarding can resume safely.
- Clear guest privacy explanation.

**Gate:** a guest can complete onboarding and reach Home in a short path; every question can be skipped where policy allows; screen readers, large text, captions, and contrast remain usable.

### Phase 3 — Identity, authentication, and session boundaries

**Goal:** make guest and account access secure and understandable.

**Deliverables:**

- Clerk integration behind a clear authentication boundary.
- Google sign-in and supported account flows.
- Guest session creation, expiration, conversion, and privacy explanation.
- Onboarding completion state tied to the correct guest or account identity.
- Authorization rules for private, persistent, and gated features.
- Safe sign-out, account deletion, and session recovery behavior.

**Gate:** no client exposes secrets; guests cannot access another user’s data; sign-in, sign-out, expiry, and conversion are tested on mobile and backend boundaries.

### Phase 4 — Backend and data foundation

**Goal:** establish the server-owned API, persistence, and safety boundaries before feature logic expands.

**Deliverables:**

- Backend workspace and environment configuration.
- Typed API contracts and request validation.
- Supabase Postgres schema and data-access layer where needed.
- Row-level authorization strategy and migration process.
- Correlation IDs, structured logs, redaction, and error conventions.
- Server-side feature flags or configuration where justified.
- Test fixtures that contain no real sensitive health data.

**Initial entities:** user profile, guest session, preferences, onboarding state, knowledge article metadata, conversation session, message metadata, check-in session, and support-resource entry.

**Gate:** authentication, authorization, validation, persistence, deletion, and failure paths are tested before real AI or sensitive user workflows are connected.

### Phase 5 — Reviewed knowledge library

**Goal:** give users trustworthy education without requiring an AI conversation.

**Deliverables:**

- Operations workflow for drafting, reviewing, approving, versioning, translating, and retiring content.
- Mobile Learn experience with topics, article detail, search, reading time, language, audio/transcript status, and related content.
- Content provenance and review metadata that users can understand.
- Accessibility for long content, dynamic type, captions, and selectable text.
- Editorial taxonomy covering periods and body changes, pregnancy and contraception, sexual health and consent, STIs and testing, relationships and boundaries, wellbeing, and professional help.

**Gate:** every public article has an accountable reviewer, approval state, update date, language review, and an appropriate professional-care section where required.

### Phase 6 — Ask Hashie

**Goal:** provide grounded, understandable, private question-and-answer support.

**Deliverables:**

- Mobile conversation screen with text and voice input, read-aloud, captions, shorter explanation, language switching, and clear loading/error states.
- Backend conversation endpoint with typed input/output contracts.
- Vercel AI SDK interface behind provider-neutral server code.
- Retrieval from approved knowledge content only.
- Safety classification before generation and response review after generation.
- Structured response sections: direct answer, explanation, uncertainty, next steps, professional help, urgent help when relevant.
- Conversation retention, deletion, guest limits, and no silent transfer of check-in data.
- Tracing and redacted observability without storing raw sensitive content unnecessarily.

**Gate:** test ordinary questions, ambiguous questions, unsupported questions, unsafe or urgent situations, long answers, language switching, voice alternatives, retries, timeouts, and deletion. Qualified reviewers must approve the safety behavior before public exposure.

### Phase 7 — Check-in

**Goal:** help users identify what kind of support they want without diagnosis or scoring.

**Deliverables:**

- Versioned, structured, tap-first flow.
- Optional short text input with strict privacy handling.
- Questions about current feeling, desired support, and urgent concern.
- Deterministic routing to information, calming support, trusted-person support, professional help, or urgent help.
- Clear option to skip, stop, delete, or continue to Ask Hashie with consent.
- Minimal storage by default.

**Gate:** every route is deterministic and explainable; no mental-health score or diagnosis appears; urgent routes are prominent and professionally reviewed; two unchanged full manual passes succeed.

### Phase 8 — Profile, preferences, and privacy controls

**Goal:** give users durable control over their experience and data.

**Deliverables:**

- Nickname, age group, language, and accessibility settings.
- Saved learning for signed-in users.
- Conversation history controls.
- Clear data and account deletion actions.
- Guest and signed-in status explanation.
- Audio, captions, contrast, text-size, and reduced-motion controls.

**Gate:** every stored preference can be changed; deletion behavior is verified end to end; settings work with large text and screen readers.

### Phase 9 — Operations and human review

**Goal:** provide authorized workflows needed to run Hashie safely.

**Deliverables:**

- Next.js operations app with authenticated roles.
- Knowledge content review and approval.
- Translation review.
- Safety-rule and support-resource review.
- Model/provider configuration with audit history.
- Incident review and content rollback.
- No direct client access to privileged actions or secrets.

**Gate:** every privileged mutation is authorized, validated, audited, reversible where practical, and tested against unauthorized access.

### Phase 10 — End-to-end integration

**Goal:** connect mobile, backend, data, AI, content, and operations into coherent user journeys.

**Critical paths:**

1. New guest: splash → guest access → onboarding → Home → Learn.
2. New account: splash → Google sign-in → onboarding → Home → saved learning.
3. Ask Hashie: Home → question → grounded response → follow-up → delete conversation.
4. Check-in: Home → structured prompts → support route → optional Ask Hashie handoff.
5. Urgent concern: either entry point → direct safety guidance → professional or emergency support.
6. Accessibility: setup → adapted UI → audio/caption/text alternatives → change preference later.

**Gate:** all critical paths work with network failures, expired sessions, empty states, retries, long content, slow responses, and deletion. Every client-to-server boundary is traceable without exposing health content in logs.

### Phase 11 — Quality, accessibility, and safety review

**Goal:** establish evidence that the product is usable and safe enough for a controlled release.

**Checks:**

- TypeScript, linting, unit tests, integration tests, and production builds for each workspace.
- Argent device and flow verification on supported Android and iOS targets where available.
- Accessibility review for sight and hearing needs, dynamic type, contrast, captions, touch targets, screen readers, and reduced motion.
- Content accuracy and translation review by qualified humans.
- Privacy, authorization, deletion, rate limiting, abuse prevention, and secret-handling review.
- AI evaluation set covering grounding, uncertainty, safety, refusal, escalation, language, and prompt-injection resistance.
- Performance checks for startup, navigation, message streaming, article loading, and low-connectivity behavior.
- Manual test log that separates passed, failed, skipped, and pending checks.

**Gate:** no release-blocking safety, privacy, authorization, accessibility, or data-loss issue remains open.

### Phase 12 — Controlled release and public distribution

**Goal:** release gradually with rollback and human oversight.

**Deliverables:**

- Production environments and managed secrets.
- Privacy notice, terms, age/safeguarding language, AI limitations, and support-resource disclosure.
- Monitoring, alerting, incident response, and support ownership.
- Store metadata, screenshots, accessibility declarations, and distribution assets.
- Staged release to internal testers, then a small pilot, then broader public availability.
- Rollback plan for mobile, backend, content, and model configuration.

**Gate:** named owners can respond to incidents, disable unsafe content or AI behavior, restore service, and communicate limitations. Public distribution happens only after qualified safety and legal review.

## Dependency map

```text
Product + safety boundaries
            ↓
Design system + mobile shell
            ↓
Onboarding + identity/session boundaries
            ↓
Backend + data foundation
       ↙              ↘
Reviewed library     Ask Hashie
       ↘              ↙
       Check-in + profile controls
                ↓
       Operations + human review
                ↓
       End-to-end integration
                ↓
       QA, accessibility, safety
                ↓
       Controlled public release
```

## How we avoid confusion

For each phase, create one focused implementation prompt that names:

- The one outcome being built.
- The exact owning workspace.
- The files expected to change.
- The dependencies that are allowed.
- The acceptance criteria.
- The manual Argent checks.
- What is explicitly out of scope.

Do not combine onboarding, authentication, AI, content, and backend work in one prompt. Finish and verify one vertical slice before adding the next.

## Immediate next slice

The next implementation should be **Phase 2: the onboarding route shell only**. It should use the approved visual references and existing design system to create the splash, access-choice, language, nickname, age-group, and accessibility screens with local state and direct navigation to the existing Home screen.

It should not yet add real Google authentication, backend persistence, AI, health content, notification permissions, or production configuration. Those belong to later phases.
