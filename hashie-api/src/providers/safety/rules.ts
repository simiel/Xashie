import type { SafetyProvider, SafetyInput, SafetyResult } from './types.js';

const emergencyTerms = /unconscious|not breathing|severe bleeding|chest pain|overdose|suicid|kill myself|can't breathe/i;
export class RuleSafetyProvider implements SafetyProvider {
  async classify(input: SafetyInput): Promise<SafetyResult> {
    if (emergencyTerms.test(input.text)) return { decision: 'emergency_referral', policyVersion: 'rules-1', reasons: ['possible_emergency'] };
    return { decision: 'allow', policyVersion: 'rules-1', reasons: [] };
  }
}
