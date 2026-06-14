import { describe, it, expect } from 'vitest';
import {
  computeCatyState,
  WEIGHTS,
  THRESHOLDS,
  ZEN_MAX_OPEN,
  type CatySignals,
} from './catyMoodEngine';

const EMPTY: CatySignals = {
  overdue: 0,
  dueToday: 0,
  dueThisWeek: 0,
  incidentsOpen: 0,
  changeRequestsOpen: 0,
  bugsOpen: 0,
  gapsOpen: 0,
  blocked: 0,
  highPriorityOpen: 0,
  agedOpen: 0,
  totalOpen: 0,
};

const sig = (p: Partial<CatySignals>): CatySignals => ({ ...EMPTY, ...p });

describe('computeCatyState — determinism', () => {
  it('same signals always produce identical output', () => {
    const s = sig({ incidentsOpen: 1, totalOpen: 9, agedOpen: 4 });
    expect(computeCatyState(s)).toEqual(computeCatyState(s));
  });
});

describe('computeCatyState — score math is reproducible by hand', () => {
  it('sums weight × count across non-zero rules', () => {
    // 2 overdue (×5) + 1 incident (×4) + 1 due today (×3) = 17
    const m = computeCatyState(sig({ overdue: 2, incidentsOpen: 1, dueToday: 1, totalOpen: 6 }));
    expect(m.score).toBe(2 * WEIGHTS.overdue + 1 * WEIGHTS.incidentsOpen + 1 * WEIGHTS.dueToday);
    expect(m.score).toBe(17);
  });

  it('overload only counts open items above the floor', () => {
    // totalOpen 20 → overload 5 × 0.5 = 2.5
    const m = computeCatyState(sig({ totalOpen: 20 }));
    expect(m.score).toBe(5 * WEIGHTS.overload);
  });
});

describe('computeCatyState — breakdown is the audit trail', () => {
  it('lists only non-zero rules, sorted by points desc', () => {
    const m = computeCatyState(sig({ incidentsOpen: 1, agedOpen: 2, totalOpen: 8 }));
    const keys = m.contributions.map((c) => c.key);
    expect(keys).toEqual(['incidentsOpen', 'agedOpen']); // 4 > 1
    expect(m.contributions.every((c) => c.points > 0)).toBe(true);
  });

  it('contribution points equal weight × count', () => {
    const m = computeCatyState(sig({ blocked: 3, totalOpen: 3 }));
    const blocked = m.contributions.find((c) => c.key === 'blocked')!;
    expect(blocked.points).toBe(3 * WEIGHTS.blocked);
  });
});

describe('computeCatyState — state buckets', () => {
  it('zen: nothing pending and light load', () => {
    expect(computeCatyState(sig({ totalOpen: 3 })).state).toBe('zen');
  });

  it('content: light score or load above zen ceiling', () => {
    expect(computeCatyState(sig({ totalOpen: ZEN_MAX_OPEN + 2 })).state).toBe('content');
    expect(computeCatyState(sig({ agedOpen: 2, totalOpen: 4 })).state).toBe('content'); // 1.0
  });

  it('focused: score in the 3–6 band', () => {
    const m = computeCatyState(sig({ highPriorityOpen: 2, totalOpen: 8 })); // 3.0
    expect(m.score).toBeGreaterThanOrEqual(THRESHOLDS.focused);
    expect(m.state).toBe('focused');
  });

  it('concerned: score in the 7–12 band', () => {
    const m = computeCatyState(sig({ blocked: 2, highPriorityOpen: 2, totalOpen: 25 })); // 4 + 3 + 5*0.5=2.5 = 9.5
    expect(m.score).toBeGreaterThanOrEqual(THRESHOLDS.concerned);
    expect(m.state).toBe('concerned');
  });

  it('alert: open incident forces alert regardless of low score', () => {
    expect(computeCatyState(sig({ incidentsOpen: 1, totalOpen: 1 })).state).toBe('alert');
  });

  it('alert: any overdue forces alert', () => {
    expect(computeCatyState(sig({ overdue: 1, totalOpen: 1 })).state).toBe('alert');
  });

  it('alert: score above the alert threshold', () => {
    expect(computeCatyState(sig({ blocked: 7, totalOpen: 7 })).state).toBe('alert'); // 14 > 12
  });
});

describe('computeCatyState — personalised across every work item type', () => {
  it('weights change requests, bugs and gaps into the score', () => {
    const m = computeCatyState(sig({ changeRequestsOpen: 1, bugsOpen: 3, gapsOpen: 1, totalOpen: 10 }));
    // 1×2 + 3×1 + 1×1 = 6
    expect(m.score).toBe(1 * WEIGHTS.changeRequestsOpen + 3 * WEIGHTS.bugsOpen + 1 * WEIGHTS.gapsOpen);
    expect(m.state).toBe('focused');
  });

  it('a bug-heavy load alone shifts mood (no incident needed)', () => {
    const m = computeCatyState(sig({ bugsOpen: 8, totalOpen: 12 }));
    expect(m.score).toBe(8);
    expect(m.state).toBe('concerned');
  });

  it('change requests surface in the breakdown', () => {
    const m = computeCatyState(sig({ changeRequestsOpen: 2, totalOpen: 5 }));
    expect(m.contributions.find((c) => c.key === 'changeRequestsOpen')?.points).toBe(4);
  });
});

describe('computeCatyState — message is fact-only and never empty', () => {
  it('produces a non-empty message for every state', () => {
    const cases: CatySignals[] = [
      sig({ totalOpen: 2 }),
      sig({ totalOpen: 7 }),
      sig({ highPriorityOpen: 2, totalOpen: 8 }),
      sig({ blocked: 2, highPriorityOpen: 2, totalOpen: 25 }),
      sig({ incidentsOpen: 1, overdue: 2, totalOpen: 6 }),
    ];
    for (const c of cases) {
      expect(computeCatyState(c).message.length).toBeGreaterThan(0);
    }
  });
});
