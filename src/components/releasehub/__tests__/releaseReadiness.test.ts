import { describe, it, expect } from 'vitest';
import { buildReleaseReadiness, DEFAULT_SLA_DAYS } from '../releaseReadiness';
import type { ReleaseListRow, PendingApproval } from '@/hooks/useReleaseHub';

const NOW = new Date('2026-06-19T00:00:00Z');

function release(over: Partial<ReleaseListRow> = {}): ReleaseListRow {
  return {
    id: 'rel-1',
    name: 'June production release',
    version: null,
    status: 'in_readiness',
    health: 'on_track',
    release_type: null,
    target_env: 'production',
    target_date: '2026-06-28',
    planned_release_date: null,
    readiness_pct: 60,
    source: 'catalyst',
    jira_key: null,
    updated_at: null,
    changeCount: 0,
    workItemsCount: 0,
    productName: null,
    manager: null,
    signoffProgress: null,
    ...over,
  } as ReleaseListRow;
}

function approval(over: Partial<PendingApproval> = {}): PendingApproval {
  return {
    id: 'ap-1',
    entityType: 'release',
    changeId: 'rel-1',
    chgNumber: 'CR-118',
    changeTitle: 'change record not yet submitted',
    riskLevel: null,
    role: 'change_manager',
    status: 'pending',
    waitStartedAt: '2026-06-13T00:00:00Z',
    approverId: 'u-1',
    approverName: 'Y. Daraz',
    approverAvatarUrl: null,
    ...over,
  };
}

describe('buildReleaseReadiness', () => {
  it('emits an awaiting-approval gate marked overdue when the approval waited past SLA', () => {
    const out = buildReleaseReadiness({
      releases: [release()],
      approvals: [approval()],
      freezeConflicts: 0,
      now: NOW,
    });
    expect(out).toHaveLength(1);
    const gate = out[0].gates.find((g) => g.status === 'awaiting_approval');
    expect(gate).toBeDefined();
    expect(gate!.overdueDays).toBe(6);
    expect(gate!.transition).toBe('approve');
    expect(gate!.owner).toEqual({ role: 'change_manager', name: 'Y. Daraz' });
    expect(gate!.tickets[0]).toEqual({ key: 'CR-118', summary: 'change record not yet submitted', assignee: 'Y. Daraz' });
    expect(out[0].overdueCount).toBe(1);
  });

  it('does not mark a gate overdue when the approval is still within SLA', () => {
    const recent = new Date(NOW.getTime() - (DEFAULT_SLA_DAYS - 1) * 86400000).toISOString();
    const out = buildReleaseReadiness({
      releases: [release()],
      approvals: [approval({ waitStartedAt: recent })],
      freezeConflicts: 0,
      now: NOW,
    });
    const gate = out[0].gates[0];
    expect(gate.status).toBe('awaiting_approval');
    expect(gate.overdueDays).toBeNull();
    expect(out[0].overdueCount).toBe(0);
  });

  it('adds a blocked deploy-freeze gate when the release env has a freeze conflict', () => {
    const out = buildReleaseReadiness({
      releases: [release()],
      approvals: [],
      freezeConflicts: 1,
      now: NOW,
    });
    const gate = out[0].gates.find((g) => g.status === 'blocked');
    expect(gate).toBeDefined();
    expect(gate!.name).toMatch(/freeze/i);
    expect(gate!.transition).toBe('open');
    expect(out[0].blockedCount).toBe(1);
  });

  it('includes an active release with no gates (renders on-track), not dropped', () => {
    const out = buildReleaseReadiness({
      releases: [release({ readiness_pct: 100, health: 'on_track' })],
      approvals: [],
      freezeConflicts: 0,
      now: NOW,
    });
    expect(out).toHaveLength(1);
    expect(out[0].gates).toEqual([]);
    expect(out[0].overdueCount).toBe(0);
    expect(out[0].blockedCount).toBe(0);
  });
});
