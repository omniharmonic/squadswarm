import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight fixed-window rate limiter.
 *
 * This is an in-memory implementation: it protects a single instance and resets
 * on redeploy. For multi-instance/serverless production, back this with a shared
 * store (e.g. @upstash/ratelimit on Redis) — the call sites here stay the same,
 * only `hit()` changes. Even in-memory it meaningfully blunts brute-force and
 * accidental floods on the auth/AI endpoints.
 */

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Opportunistic cleanup so the map can't grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, win] of buckets) if (win.resetAt < now) buckets.delete(key);
}

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function hit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  existing.count += 1;
  if (existing.count > opts.limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: opts.limit - existing.count, retryAfterSec: 0 };
}

/** Best-effort client IP from common proxy headers. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Enforce a limit for `name` scoped to the caller's IP. Returns a 429 response
 * if exceeded, or null to proceed.
 */
export function enforceRateLimit(req: NextRequest, name: string, opts: RateLimitOptions): NextResponse | null {
  const res = hit(`${name}:${clientIp(req)}`, opts);
  if (res.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': String(res.retryAfterSec) } },
  );
}
