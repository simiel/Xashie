import { describe, expect, it } from 'vitest';

import { resolveInitialRoute } from './routing';

describe('resolveInitialRoute', () => {
  it('waits for Clerk and preference hydration', () => {
    expect(resolveInitialRoute({ isReady: false, sessionType: null, onboardingComplete: false, sessionExpired: false })).toBeNull();
  });

  it('routes unauthenticated users to welcome', () => {
    expect(resolveInitialRoute({ isReady: true, sessionType: null, onboardingComplete: false, sessionExpired: false })).toBe('/welcome');
  });

  it('routes guests and accounts with incomplete onboarding to onboarding', () => {
    expect(resolveInitialRoute({ isReady: true, sessionType: 'guest', onboardingComplete: false, sessionExpired: false })).toBe('/language');
    expect(resolveInitialRoute({ isReady: true, sessionType: 'account', onboardingComplete: false, sessionExpired: false })).toBe('/language');
  });

  it('routes completed sessions to the application', () => {
    expect(resolveInitialRoute({ isReady: true, sessionType: 'account', onboardingComplete: true, sessionExpired: false })).toBe('/home');
  });

  it('routes an expired account safely before other route states', () => {
    expect(resolveInitialRoute({ isReady: true, sessionType: null, onboardingComplete: false, sessionExpired: true })).toBe('/session-expired');
  });
});
