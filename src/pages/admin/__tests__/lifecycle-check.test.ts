/**
 * lifecycle-check edge function — contract tests
 *
 * The edge function receives a list of users with last_sign_in_at timestamps
 * and an is_active flag, and classifies them into three buckets:
 *   - warn:       25–29 days inactive, still active → send warning email
 *   - deactivate: 30+ days inactive, still active → set is_active=false + send deactivation email
 *   - ok:         active within 25 days OR already inactive → no-op
 *
 * We test the pure classification logic extracted from the edge function so
 * we can run it in Vitest without Deno runtime.
 */
import { describe, it, expect } from 'vitest';

// ─── Types (mirrors edge function) ────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  last_sign_in_at: string | null;
  is_active: boolean;
}

type LifecycleAction = 'warn' | 'deactivate' | 'ok';

interface ClassifiedUser {
  user: UserRecord;
  action: LifecycleAction;
  days_inactive: number;
}

// ─── Pure classification function (will be extracted from the edge function) ──

export function classifyInactiveUsers(
  users: UserRecord[],
  now: Date,
  warnThresholdDays = 25,
  deactivateThresholdDays = 30,
): ClassifiedUser[] {
  return users.map((user) => {
    if (!user.is_active) return { user, action: 'ok', days_inactive: 0 };

    const lastSeen = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    if (!lastSeen) {
      // Never signed in — treat as 0 days inactive (invited but not yet active)
      return { user, action: 'ok', days_inactive: 0 };
    }

    const days_inactive = Math.floor(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (days_inactive >= deactivateThresholdDays) {
      return { user, action: 'deactivate', days_inactive };
    }
    if (days_inactive >= warnThresholdDays) {
      return { user, action: 'warn', days_inactive };
    }
    return { user, action: 'ok', days_inactive };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-11T09:00:00Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-1',
    email: 'user@example.com',
    full_name: 'Test User',
    last_sign_in_at: daysAgo(0),
    is_active: true,
    ...overrides,
  };
}

describe('classifyInactiveUsers', () => {
  it('classifies user active within 25 days as ok', () => {
    const result = classifyInactiveUsers([makeUser({ last_sign_in_at: daysAgo(10) })], NOW);
    expect(result[0].action).toBe('ok');
  });

  it('classifies user inactive 25 days as warn', () => {
    const result = classifyInactiveUsers([makeUser({ last_sign_in_at: daysAgo(25) })], NOW);
    expect(result[0].action).toBe('warn');
    expect(result[0].days_inactive).toBe(25);
  });

  it('classifies user inactive 29 days as warn', () => {
    const result = classifyInactiveUsers([makeUser({ last_sign_in_at: daysAgo(29) })], NOW);
    expect(result[0].action).toBe('warn');
  });

  it('classifies user inactive 30 days as deactivate', () => {
    const result = classifyInactiveUsers([makeUser({ last_sign_in_at: daysAgo(30) })], NOW);
    expect(result[0].action).toBe('deactivate');
    expect(result[0].days_inactive).toBe(30);
  });

  it('classifies user inactive 60 days as deactivate', () => {
    const result = classifyInactiveUsers([makeUser({ last_sign_in_at: daysAgo(60) })], NOW);
    expect(result[0].action).toBe('deactivate');
  });

  it('skips already-inactive users', () => {
    const result = classifyInactiveUsers(
      [makeUser({ last_sign_in_at: daysAgo(45), is_active: false })],
      NOW,
    );
    expect(result[0].action).toBe('ok');
  });

  it('skips users who have never signed in', () => {
    const result = classifyInactiveUsers(
      [makeUser({ last_sign_in_at: null })],
      NOW,
    );
    expect(result[0].action).toBe('ok');
  });

  it('handles mixed population correctly', () => {
    const users: UserRecord[] = [
      makeUser({ id: 'a', last_sign_in_at: daysAgo(5) }),   // ok
      makeUser({ id: 'b', last_sign_in_at: daysAgo(26) }),  // warn
      makeUser({ id: 'c', last_sign_in_at: daysAgo(31) }),  // deactivate
      makeUser({ id: 'd', last_sign_in_at: daysAgo(90), is_active: false }), // ok (already off)
    ];
    const result = classifyInactiveUsers(users, NOW);
    expect(result.map(r => r.action)).toEqual(['ok', 'warn', 'deactivate', 'ok']);
  });

  it('respects custom thresholds', () => {
    // 14-day warn, 21-day deactivate
    const result = classifyInactiveUsers(
      [makeUser({ last_sign_in_at: daysAgo(15) })],
      NOW,
      14,
      21,
    );
    expect(result[0].action).toBe('warn');
  });
});
