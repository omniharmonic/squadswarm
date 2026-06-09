import { describe, it, expect } from 'vitest';
import { hit } from './rate-limit';

describe('rate limiter (fixed window)', () => {
  it('allows up to the limit then blocks', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    expect(hit(key, opts).ok).toBe(true);
    expect(hit(key, opts).ok).toBe(true);
    expect(hit(key, opts).ok).toBe(true);
    const blocked = hit(key, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 1, windowMs: 1 };
    expect(hit(key, opts).ok).toBe(true);
    // Force the window to be considered expired by waiting past 1ms.
    const start = Date.now();
    while (Date.now() - start < 3) { /* spin briefly */ }
    expect(hit(key, opts).ok).toBe(true);
  });
});
