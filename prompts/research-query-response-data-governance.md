# Research query and response data governance

## Goal

Enable ethically approved research into the questions Hashie receives and the responses it provides, without turning private health support into researcher-accessible surveillance.

## Scope requested

- Preserve a research-eligible copy of user query text and Hashie response text.
- Derive useful qualitative and quantitative insights for University of Ghana researchers and approved stakeholders.
- Exclude direct personal information from research access through an anonymization/de-identification process.

## Phase 0: local developer observability (approved development direction)

Before research collection, implement a deliberately separate, developer-only diagnostic flow. Its purpose is to let the Hashie developer inspect how a *local test* query travelled through the backend and what reply was streamed, so retrieval, safety and model behaviour can be debugged before launch.

- It is not a research dataset, analytics product, or production conversation archive.
- It is enabled only when `NODE_ENV=development` **and** an explicit developer-insights feature flag is set. All other environments, including Render, remain disabled and expose no endpoint.
- It keeps a bounded, in-memory ring buffer for the current local backend process only (proposed: at most 50 records). A restart clears it; it writes neither Supabase rows nor files nor third-party logs.
- A record contains the correlation ID, timestamp, submitted query, final streamed reply, response completion/error state, and non-identifying technical metadata needed to trace the request (for example model/retrieval outcome if already available). It must not include Clerk IDs, guest tokens, headers, IP addresses, device identifiers, full chat history, or secrets.
- A development-only endpoint exposes these records only when a separately configured local developer key is supplied. The mobile app does not call it and it must never be enabled in a deployed environment.
- Replies and queries are capped to a small, documented size so a runaway stream cannot grow process memory. Synthetic test prompts are the default for verification.

This phase provides an intentionally simple inspection loop:

```text
local test client → backend request validation/auth → retrieval + model stream
                                      │                         │
                                      └──── developer buffer ◀───┘
                                                     │
                                      locally protected inspector endpoint
```

The later research design below remains required before any persistent capture, researcher access, anonymization, consent flow, or production deployment is considered.

## Non-negotiable design decisions

1. Raw free text is sensitive health data and may itself contain direct identifiers. It is not anonymous merely because account fields are omitted.
2. Researchers never receive raw production text by default. A server-side restricted de-identification boundary produces a research copy before data enters the research workspace.
3. Participation is optional, granular, understandable in English and Twi, revocable for future use, and never a condition of using Hashie.
4. Existing conversations are excluded unless an approved consent basis explicitly covers them.
5. Any study requiring access to identifiable or insufficiently de-identified text requires a separate University of Ghana ethics protocol, data-access review, and an approved legal basis.
6. Teen/minor participation, assent, guardian consent, and any waiver must be determined by the responsible UG ethics committee, not inferred by the app.

## Proposed data flow

1. The normal support service processes a query and produces a response.
2. For a participant who has opted into the approved research purpose, the backend writes an encrypted, short-retention research intake record in an isolated store.
3. A server-side de-identification job redacts direct identifiers and high-risk free-text spans, removes account/session identifiers, and assigns a rotating research ID.
4. The resulting redacted query, redacted response, derived topic/safety/retrieval metadata, consent version, and content/model version enter the research dataset.
5. Researchers access only the redacted dataset in a role-limited workspace. Exports require a study-specific approval and disclosure review.
6. The raw intake record is deleted on a fixed schedule after processing, or earlier after withdrawal where applicable; the de-identified copy follows the approved protocol and retention schedule.

## Phase 0 implementation plan

1. Add a backend-only developer-insights module with a disabled sink and a bounded in-memory sink.
2. Wrap the agent response stream only in local development, collecting its final user-visible text without changing the streamed response sent to the client.
3. Add a private, development-only inspection route with constant-time developer-key verification and no cache headers.
4. Add focused tests for disabled-by-default behaviour, production fail-closed behaviour, authorization, bounded retention, stream completion, and stream errors.
5. Document the environment variables and a local `curl` test using synthetic content. Do not add Supabase migrations, Render variables, client UI, or deployment configuration in this phase.

## Required controls

- Separate production and research stores, encryption keys, service accounts, and access roles.
- No email, phone number, account ID, Clerk ID, guest token, device identifier, IP address, precise location, or raw log attached to research records.
- Automated redaction plus sampling-based quality assurance by a minimal trained privacy team; no broad researcher review of raw text.
- Minimum cohort sizes and suppression of small cells in dashboards and exports.
- Immutable consent, access, transformation, export, and deletion audit records.
- Research data dictionary, permitted-use register, data-access committee, incident response process, and publication disclosure review.

## Governance prerequisites

- University of Ghana ethics approval for the defined protocol and participant materials.
- Review by the appropriate UG committee/board, with an explicit decision on minors and consent/assent.
- Ghana Data Protection Act compliance review and confirmation of controller/processor roles, registration obligations, retention, transfers, and breach handling.
- Approved participant-facing consent text, privacy notice update, withdrawal handling, and researcher data-use agreement.

## Acceptance criteria

- A user can use Hashie without contributing text to research.
- A consenting user can see exactly what purpose applies and withdraw prospectively.
- No researcher role can access raw production conversations.
- Every research record has de-identification status, consent version, retention deadline, and audit trail.
- Aggregates and exports avoid re-identification through small groups or quasi-identifiers.

## Checks before implementation

1. Ethics protocol and consent materials approved by the relevant UG ethics body.
2. Data protection review completed with documented lawful basis and safeguards.
3. Threat model and re-identification test completed.
4. Redaction quality evaluated on synthetic, non-user health text before any participant data is processed.
5. Access-control, withdrawal, deletion, audit, and export controls tested end to end.
