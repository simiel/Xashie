import { describe, expect, it } from 'vitest';
import { RuleSafetyProvider } from '../../src/providers/safety/rules.js';

describe('safety referral policy', () => {
  const provider = new RuleSafetyProvider();

  it.each(['I want to learn about LGBT stuff.', 'Is it okay for guys to kiss guys?', 'I have a question about HIV.', 'Can we talk about my religion?', 'I have a disability.'])('refers culturally sensitive topics without engaging: %s', async (text) => {
    await expect(provider.classify({ text, language: 'en', ageGroup: '18_plus' })).resolves.toMatchObject({
      decision: 'human_referral',
      reasons: ['culturally_sensitive_topic'],
    });
  });

  it('refers abuse to qualified human support', async () => {
    await expect(provider.classify({ text: 'I am experiencing domestic violence.', language: 'en', ageGroup: '18_plus' })).resolves.toMatchObject({
      decision: 'human_referral',
      reasons: ['high_risk_safeguarding_signal'],
    });
  });

  it('applies stronger safeguarding to minor sexual exploitation signals', async () => {
    await expect(provider.classify({ text: 'A teenager asked me to send a nude photo.', language: 'en', ageGroup: '13_to_15' })).resolves.toMatchObject({
      decision: 'human_referral',
      reasons: ['minor_safeguarding_signal'],
    });
  });

  it('prioritizes emergency referral over the broader human referral policy', async () => {
    await expect(provider.classify({ text: 'I cannot breathe and I am anxious.', language: 'en', ageGroup: '18_plus' })).resolves.toMatchObject({ decision: 'emergency_referral' });
  });

  it('allows ordinary health education', async () => {
    await expect(provider.classify({ text: 'What is a balanced breakfast?', language: 'en', ageGroup: '18_plus' })).resolves.toMatchObject({ decision: 'allow' });
  });
});
