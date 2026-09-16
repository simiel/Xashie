export interface RateLimiter {
  check(key: string, limit: number, windowMs: number, now: Date): {
    allowed: boolean;
    retryAfterSeconds: number;
  };
}

type Counter = { count: number; windowStartedAt: number };

/**
 * Small-process limiter for local development and tests.
 * Production should provide a managed, distributed limiter instead.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly counters = new Map<string, Counter>();

  check(key: string, limit: number, windowMs: number, now: Date) {
    const current = now.getTime();
    const previous = this.counters.get(key);
    const counter = !previous || current - previous.windowStartedAt >= windowMs
      ? { count: 0, windowStartedAt: current }
      : previous;

    counter.count += 1;
    this.counters.set(key, counter);

    if (counter.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
    const remainingMs = Math.max(0, windowMs - (current - counter.windowStartedAt));
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  }
}
