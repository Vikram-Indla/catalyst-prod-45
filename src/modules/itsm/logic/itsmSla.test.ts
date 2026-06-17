import { describe, it, expect } from 'vitest';
import { computeSlaTargets, slaState } from './itsmSla';
import type { ItsmSlaPolicy } from '../types';

const policy: ItsmSlaPolicy = {
  id: 'p1',
  name: 'P1',
  priority: 'Highest',
  responseMinutes: 15,
  resolveMinutes: 240,
  isActive: true,
};

describe('computeSlaTargets', () => {
  it('adds response + resolve minutes to created time (pure)', () => {
    const t = computeSlaTargets('2026-06-17T00:00:00.000Z', policy);
    expect(t.responseDueAt).toBe('2026-06-17T00:15:00.000Z');
    expect(t.resolveDueAt).toBe('2026-06-17T04:00:00.000Z');
  });
});

describe('slaState', () => {
  const due = '2026-06-17T04:00:00.000Z';

  it('ok when well within window', () => {
    expect(slaState('2026-06-17T01:00:00.000Z', '2026-06-17T00:00:00.000Z', due, null)).toBe('ok');
  });

  it('at_risk past 80% of window', () => {
    // window 00:00 -> 04:00 (240m). 80% = 03:12. now 03:30 -> at_risk
    expect(slaState('2026-06-17T03:30:00.000Z', '2026-06-17T00:00:00.000Z', due, null)).toBe('at_risk');
  });

  it('breached when now past due and unsatisfied', () => {
    expect(slaState('2026-06-17T05:00:00.000Z', '2026-06-17T00:00:00.000Z', due, null)).toBe('breached');
  });

  it('met when satisfied before due', () => {
    expect(slaState('2026-06-17T05:00:00.000Z', '2026-06-17T00:00:00.000Z', due, '2026-06-17T03:00:00.000Z')).toBe('met');
  });

  it('breached when satisfied after due', () => {
    expect(slaState('2026-06-17T05:00:00.000Z', '2026-06-17T00:00:00.000Z', due, '2026-06-17T04:30:00.000Z')).toBe('breached');
  });
});
