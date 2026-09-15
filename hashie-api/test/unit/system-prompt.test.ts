import { describe, expect, it } from 'vitest';
import { buildHashieSystemPrompt, HASHIE_SYSTEM_PROMPT_VERSION } from '../../src/providers/intelligence/system-prompt.js';

describe('Hashie system prompt', () => {
  it('includes approved profile context, Ghana safeguards, and referral constraints', () => {
    const prompt = buildHashieSystemPrompt({ language: 'en', ageGroup: '13_to_15', region: 'Ashanti', accessibility: { largeText: true }, voiceFirst: false }, []);
    expect(prompt).toContain('Age group: 13_to_15');
    expect(prompt).toContain('Region: Ashanti');
    expect(prompt).toContain('For users under 18');
    expect(prompt).toContain('do not answer the substantive question');
    expect(prompt).toContain('Ghanaian context');
    expect(HASHIE_SYSTEM_PROMPT_VERSION).toBe('hashie-safety-1');
  });
});
