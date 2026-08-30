import { describe, expect, it } from 'vitest';
import { resolveOAuthOutcome } from './oauth';

describe('resolveOAuthOutcome', () => {
  it('accepts only a created Clerk session as success', () => {
    expect(resolveOAuthOutcome('sess_test', { type: 'success' })).toBe('success');
  });
  it('treats browser cancellation as recoverable', () => {
    expect(resolveOAuthOutcome(null, { type: 'cancel' })).toBe('cancelled');
    expect(resolveOAuthOutcome(null, { type: 'dismiss' })).toBe('cancelled');
  });
  it('does not treat a successful browser response without a session as signed in', () => {
    expect(resolveOAuthOutcome(null, { type: 'success' })).toBe('failed');
  });
});
