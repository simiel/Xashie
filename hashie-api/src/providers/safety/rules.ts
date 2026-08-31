import type { SafetyProvider, SafetyInput, SafetyResult } from './types.js';

// These are risk signals, not diagnoses. Identity, disability, religion, and
// ordinary sexual-health education remain allowed and nonjudgmental.
const emergencyTerms = /unconscious|not breathing|severe bleeding|chest pain|overdose|suicid|kill myself|can(?:not|'t) breathe/i;
const highRiskTerms = /\b(?:rape|sexual assault|domestic violence|gender[- ]based violence|child marriage|forced marriage|coercion|abuse|exploitation|grooming|self[- ]harm|kill myself|overdose)\b/i;
const minorAdultSexualTerms = /\b(?:minor|child|under\s*1[38]|school[- ]?age|teen(?:ager)?|student)\b.{0,60}\b(?:sex|sexual|nude|naked|send (?:a )?photo|meet(?:ing)?|touch|kiss)/i;
const sensitiveTerms = /\b(?:lgbt|lgbtq|gay|lesbian|bisexual|transgender|queer|sexual orientation|gender identity|hiv|sti|contraception|abortion|depression|anxiety|trauma|psychosis|traditional medicine|herbalist|traditional healer|religion|church|mosque|prayer|faith|spiritual|disability|disabled)\b|\b(?:guys|men|women) to kiss (?:guys|men|women)\b/i;
export class RuleSafetyProvider implements SafetyProvider {
  async classify(input: SafetyInput): Promise<SafetyResult> {
    if (emergencyTerms.test(input.text)) return { decision: 'emergency_referral', policyVersion: 'rules-1', reasons: ['possible_emergency'] };
    if (highRiskTerms.test(input.text) || (input.ageGroup !== '18_plus' && minorAdultSexualTerms.test(input.text))) return { decision: 'human_referral', policyVersion: 'rules-3', reasons: [input.ageGroup === '18_plus' ? 'high_risk_safeguarding_signal' : 'minor_safeguarding_signal'] };
    if (sensitiveTerms.test(input.text)) return { decision: 'allow', policyVersion: 'rules-3', reasons: ['sensitive_topic_requires_dignity'] };
    return { decision: 'allow', policyVersion: 'rules-3', reasons: [] };
  }
}
