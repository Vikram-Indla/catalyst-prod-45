/**
 * useR360ForYouPanel — unit tests for the pure allocation logic.
 *
 * The allocation algorithm is the only part of this hook that is purely
 * deterministic (no Supabase, no Auth). Export it as a named function so it
 * can be tested in isolation without any provider wiring.
 *
 * These tests FAIL until useR360ForYouPanel.ts exports computeProjectAllocations.
 */
import { describe, it, expect } from 'vitest';
import {
  computeProjectAllocations,
  type ProjectAllocationEntry,
} from '@/hooks/useR360ForYouPanel';

describe('computeProjectAllocations', () => {
  it('always includes a Buffer entry at exactly 20%', () => {
    const result = computeProjectAllocations([
      { projectId: 'p1', name: 'Senaei BAU', key: 'BAU', color: 'var(--cp-primary-60, #0052CC)', role: 'lead' },
// TODO: ads-unmapped — #00B8D9 context unclear
      { projectId: 'p2', name: 'Data Analytics', key: 'DA', color: '#00B8D9', role: 'member' },
    ]);
    const buffer = result.find((p) => p.isBuffer);
    expect(buffer).toBeDefined();
    expect(buffer?.allocationPct).toBe(20);
    expect(buffer?.name).toBe('Buffer');
  });

  it('all percentages sum to exactly 100', () => {
    const input = [
      { projectId: 'p1', name: 'A', key: 'A', color: 'var(--ds-text, #172B4D)', role: 'lead' },
      { projectId: 'p2', name: 'B', key: 'B', color: 'var(--ds-text, #172B4D)', role: 'member' },
      { projectId: 'p3', name: 'C', key: 'C', color: 'var(--ds-text, #172B4D)', role: 'reviewer' },
    ];
    const result = computeProjectAllocations(input);
    const total = result.reduce((s, p) => s + p.allocationPct, 0);
    expect(total).toBe(100);
  });

  it('lead role gets strictly more allocation than member', () => {
    const result = computeProjectAllocations([
      { projectId: 'p1', name: 'Lead project', key: 'LP', color: 'var(--ds-text, #172B4D)', role: 'lead' },
      { projectId: 'p2', name: 'Member project', key: 'MP', color: 'var(--ds-text, #172B4D)', role: 'member' },
    ]);
    const lead   = result.find((p) => p.role === 'lead');
    const member = result.find((p) => p.role === 'member');
    expect(lead!.allocationPct).toBeGreaterThan(member!.allocationPct);
  });

  it('single project gets the full 80% project pool', () => {
    const result = computeProjectAllocations([
      { projectId: 'p1', name: 'Solo', key: 'S', color: 'var(--ds-text, #172B4D)', role: 'lead' },
    ]);
    const project = result.find((p) => !p.isBuffer);
    expect(project?.allocationPct).toBe(80);
  });

  it('returns Buffer even with zero projects', () => {
    const result = computeProjectAllocations([]);
    expect(result).toHaveLength(1);
    expect(result[0].isBuffer).toBe(true);
    expect(result[0].allocationPct).toBe(20);
  });

  it('reviewer gets less allocation than member', () => {
    const result = computeProjectAllocations([
      { projectId: 'p1', name: 'A', key: 'A', color: 'var(--ds-text, #172B4D)', role: 'member' },
      { projectId: 'p2', name: 'B', key: 'B', color: 'var(--ds-text, #172B4D)', role: 'reviewer' },
    ]);
    const member   = result.find((p) => p.role === 'member');
    const reviewer = result.find((p) => p.role === 'reviewer');
    expect(member!.allocationPct).toBeGreaterThan(reviewer!.allocationPct);
  });

  it('Buffer entry has isBuffer=true; all others have isBuffer=false', () => {
    const result = computeProjectAllocations([
      { projectId: 'p1', name: 'X', key: 'X', color: 'var(--ds-text, #172B4D)', role: 'lead' },
    ]);
    const buffers    = result.filter((p) => p.isBuffer);
    const nonBuffers = result.filter((p) => !p.isBuffer);
    expect(buffers).toHaveLength(1);
    expect(nonBuffers.every((p) => !p.isBuffer)).toBe(true);
  });
});
