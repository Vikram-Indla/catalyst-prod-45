import { describe, it, expect } from 'vitest';
import {
  worseState,
  resolveDisplayState,
  appendDailyHistory,
  lockedStateFor,
  sparklineScores,
  computeTrend,
  HISTORY_CAP,
  type CatyDailyPoint,
} from './catyMoodHistory';

describe('worsen-only resolution', () => {
  it('worseState returns the higher-rank state', () => {
    expect(worseState('zen', 'alert')).toBe('alert');
    expect(worseState('concerned', 'content')).toBe('concerned');
  });

  it('display can worsen below-to-above the lock but never improve', () => {
    expect(resolveDisplayState('content', 'alert')).toBe('alert'); // worsens live
    expect(resolveDisplayState('alert', 'zen')).toBe('alert'); // never improves
    expect(resolveDisplayState(null, 'focused')).toBe('focused'); // no lock yet
  });
});

describe('appendDailyHistory', () => {
  it('adds a new day', () => {
    const h = appendDailyHistory([], '2026-06-14', 5, 'focused');
    expect(h).toHaveLength(1);
    expect(h[0]).toEqual({ date: '2026-06-14', score: 5, state: 'focused' });
  });

  it('merges same day keeping worse state and higher score (worsen-only)', () => {
    let h = appendDailyHistory([], '2026-06-14', 5, 'focused');
    h = appendDailyHistory(h, '2026-06-14', 13, 'alert');
    expect(h).toHaveLength(1);
    expect(h[0]).toEqual({ date: '2026-06-14', score: 13, state: 'alert' });
  });

  it('does not improve within the same day', () => {
    let h = appendDailyHistory([], '2026-06-14', 13, 'alert');
    h = appendDailyHistory(h, '2026-06-14', 2, 'content');
    expect(h[0]).toEqual({ date: '2026-06-14', score: 13, state: 'alert' });
  });

  it('caps history length', () => {
    let h: CatyDailyPoint[] = [];
    for (let i = 0; i < HISTORY_CAP + 5; i++) {
      const day = `2026-06-${`${i + 1}`.padStart(2, '0')}`;
      h = appendDailyHistory(h, day, i, 'content');
    }
    expect(h).toHaveLength(HISTORY_CAP);
    expect(h[h.length - 1].date).toBe(`2026-06-${HISTORY_CAP + 5}`);
  });
});

describe('lockedStateFor + sparklineScores', () => {
  const h: CatyDailyPoint[] = [
    { date: '2026-06-10', score: 2, state: 'content' },
    { date: '2026-06-11', score: 4, state: 'focused' },
    { date: '2026-06-12', score: 8, state: 'concerned' },
  ];
  it('returns the locked state for today', () => {
    expect(lockedStateFor(h, '2026-06-12')).toBe('concerned');
    expect(lockedStateFor(h, '2026-06-13')).toBeNull();
  });
  it('returns last-n scores oldest→newest', () => {
    expect(sparklineScores(h, 2)).toEqual([4, 8]);
  });
});

describe('computeTrend — workload framing', () => {
  it('flat with <2 days', () => {
    expect(computeTrend([{ date: 'd', score: 5, state: 'focused' }]).word).toBe('stable');
  });
  it('climbing when today above baseline', () => {
    const h: CatyDailyPoint[] = [
      { date: 'a', score: 4, state: 'focused' },
      { date: 'b', score: 5, state: 'focused' },
      { date: 'c', score: 7, state: 'concerned' },
    ];
    expect(computeTrend(h).direction).toBe('up');
    expect(['climbing', 'spiking']).toContain(computeTrend(h).word);
  });
  it('spiking when today is a big jump', () => {
    const h: CatyDailyPoint[] = [
      { date: 'a', score: 2, state: 'content' },
      { date: 'b', score: 2, state: 'content' },
      { date: 'c', score: 14, state: 'alert' },
    ];
    expect(computeTrend(h).word).toBe('spiking');
  });
  it('easing when today below baseline', () => {
    const h: CatyDailyPoint[] = [
      { date: 'a', score: 10, state: 'concerned' },
      { date: 'b', score: 9, state: 'concerned' },
      { date: 'c', score: 3, state: 'focused' },
    ];
    expect(computeTrend(h).word).toBe('easing');
  });
});
