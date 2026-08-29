import { describe, expect, it } from 'vitest';

import { copy, supportedLanguages } from './copy';

describe('Hashie bilingual starter copy', () => {
  it('keeps the documented provider values', () => {
    expect(supportedLanguages).toEqual({
      en: { label: 'English', providerValue: 'eng' },
      tw: { label: 'Akan/Twi', providerValue: 'akh' },
    });
  });

  it.each(['en', 'tw'] as const)('includes the safety boundary in %s', (language) => {
    expect(copy[language].limitation).toBeTruthy();
    expect(copy[language].emergency).toBeTruthy();
  });
});
