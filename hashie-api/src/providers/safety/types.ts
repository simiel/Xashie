import type { HashieLanguage } from '../intelligence/types.js';

export type SafetyDecision = 'allow' | 'safe_fallback' | 'human_referral' | 'emergency_referral';

export type SafetyInput = {
  text: string;
  language: HashieLanguage;
  ageGroup: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown';
};

export type SafetyResult = {
  decision: SafetyDecision;
  policyVersion: string;
  reasons: string[];
};

export interface SafetyProvider {
  classify(input: SafetyInput): Promise<SafetyResult>;
}
