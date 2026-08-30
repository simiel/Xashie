import { describe, expect, it } from 'vitest';
import { MemoryRateLimitStore } from '../../src/plugins/limits.js';
import { requestHash } from '../../src/modules/actions/idempotency.js';

describe('request foundations', () => {
  it('limits a key within a window and resets it after expiry', () => {
    const store = new MemoryRateLimitStore(2, 1000);
    expect(store.consume('user', 0).allowed).toBe(true);
    expect(store.consume('user', 1).allowed).toBe(true);
    expect(store.consume('user', 2).allowed).toBe(false);
    expect(store.consume('user', 1000).allowed).toBe(true);
  });

  it('hashes equivalent request bodies deterministically', () => {
    expect(requestHash({ a: 1 })).toBe(requestHash({ a: 1 }));
    expect(requestHash({ a: 1 })).not.toBe(requestHash({ a: 2 }));
  });
});
