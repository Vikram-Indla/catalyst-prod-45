import { describe, it, expect } from 'vitest';
import { generateSystemInsights } from './itsmInsights';
import type { ItsmIncident } from '../types';

const base: ItsmIncident = {
  id: 'x', incidentKey: 'INC-0001', title: 't', description: null,
  status: 'investigating', severity: 'SEV3', priority: 'Medium',
  affectedService: null, assigneeId: 'u1', reporterId: 'u1', slaPolicyId: null,
  responseDueAt: null, resolveDueAt: null, acknowledgedAt: null,
  resolvedAt: null, closedAt: null,
  createdAt: '2026-06-17T00:00:00.000Z', updatedAt: '2026-06-17T00:00:00.000Z',
};
const mk = (o: Partial<ItsmIncident>): ItsmIncident => ({ ...base, ...o });
const NOW = '2026-06-17T06:00:00.000Z';

describe('generateSystemInsights (deterministic, not AI)', () => {
  it('empty input -> empty output', () => {
    expect(generateSystemInsights([], NOW)).toEqual([]);
  });

  it('flags open SEV1 as critical', () => {
    const out = generateSystemInsights([mk({ id: 'a', severity: 'SEV1' })], NOW);
    const sev1 = out.find((i) => i.id === 'open-sev1');
    expect(sev1?.severity).toBe('critical');
    expect(sev1?.metric).toBe(1);
    expect(sev1?.source).toBe('System Insight');
  });

  it('flags breached resolve SLA as critical', () => {
    const out = generateSystemInsights(
      [mk({ id: 'b', resolveDueAt: '2026-06-17T04:00:00.000Z' })], NOW,
    );
    expect(out.find((i) => i.id === 'resolve-breach')?.metric).toBe(1);
  });

  it('flags unassigned open as warning', () => {
    const out = generateSystemInsights([mk({ id: 'c', assigneeId: null })], NOW);
    expect(out.find((i) => i.id === 'unassigned')?.severity).toBe('warning');
  });

  it('does NOT count resolved/closed incidents as open', () => {
    const out = generateSystemInsights(
      [mk({ id: 'd', severity: 'SEV1', status: 'resolved' })], NOW,
    );
    expect(out.find((i) => i.id === 'open-sev1')).toBeUndefined();
  });

  it('orders critical before warning before info', () => {
    const out = generateSystemInsights([
      mk({ id: 'a', severity: 'SEV1', assigneeId: null }),
    ], NOW);
    const ranks = out.map((i) => i.severity);
    const order = { critical: 0, warning: 1, info: 2 } as const;
    for (let k = 1; k < ranks.length; k++) {
      expect(order[ranks[k]]).toBeGreaterThanOrEqual(order[ranks[k - 1]]);
    }
  });

  it('is deterministic — same input yields identical output', () => {
    const input = [mk({ id: 'a', severity: 'SEV1', assigneeId: null })];
    expect(generateSystemInsights(input, NOW)).toEqual(generateSystemInsights(input, NOW));
  });
});
