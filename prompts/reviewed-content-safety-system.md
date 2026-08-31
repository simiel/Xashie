# Reviewed content and safety system

## Goal

Provide a reviewable Ghana-context health-content system and risk-aware response policy across API and mobile. Reviewed content must carry language, topic, source, reviewer, review date, evidence level, country/context, publication state, and expiry. Retrieval must filter by language and topic. Every generated or safety-referral response must retain policy version, model version, safety result, and reviewed source IDs.

## Safety boundary

Rules distinguish imminent emergency, abuse/coercion/exploitation, minor risk, and sensitive-but-allowed education. Identity, disability, religion, sexual health, and traditional-healing topics are not diseases and are not blanket-refused. The API can enforce routing and disclosure limits; it cannot certify medical accuracy, Ghanaian cultural fit, safeguarding practice, or legal compliance.

## Human review gate

Before production use, Ghanaian clinical, safeguarding, cultural, and legal advisers must review the policy terms, Akan/Twi wording, emergency/referral copy, age boundaries, retention behavior, and a bilingual evaluation set. Their approvals and policy version must be recorded outside the model prompt; code and automated tests are not certification.

## Verification

Test CRUD state transitions, expiry filtering, language/topic retrieval, emergency precedence, minor safeguards, sensitive-topic dignity, traceability fields, provider failures, and mobile display of safety referrals. Run API and mobile typecheck/lint/tests/build/export checks. Simulator verification remains a separate manual gate.
