import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computeDatePulseViolations } from '../DatePulseEngine';
import type { BusinessRequest, WorkItem, Release } from '@/types/date-pulse';

// Pin "now" so date-relative rules (D2 overdue, D4 blocked-past-due, D1 stale)
// evaluate deterministically. Without this, fixtures with absolute dates drift
// into/out of "past due" as real time passes and the suite rots.
const NOW = '2026-06-15T12:00:00Z';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
afterEach(() => { vi.useRealTimers(); });

const BASE_BR: BusinessRequest = {
  id: 'br-uuid-1',
  request_key: 'MDT-100',
  status: 'active',
  end_date: '2026-12-31',
  release_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const BASE_WORK: WorkItem = {
  id: 'wi-uuid-1',
  issue_key: 'BAU-100',
  issue_type: 'story',
  project_key: 'BAU',
  status: 'in_progress',
  due_date: '2026-11-30',
  severity: null,
  parent_key: null,
  sprint_id: null,
  business_request_id: 'br-uuid-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const BASE_RELEASE: Release = {
  id: 'rel-1',
  name: 'Q4 2026',
  target_date: '2026-12-15',
  project_key: 'BAU',
};

// ── A: Missing Date Rules ────────────────────────────────────────────────────

describe('Rule A1 — BR Target Date Missing', () => {
  it('fires advisory when BR has no end_date and no release_id', () => {
    const br = { ...BASE_BR, end_date: null, release_id: null };
    const violations = computeDatePulseViolations(br, [], null);
    expect(violations.some(v => v.rule_id === 'A1')).toBe(true);
    expect(violations.find(v => v.rule_id === 'A1')?.severity).toBe('advisory');
  });

  it('does not fire when BR has end_date', () => {
    const violations = computeDatePulseViolations(BASE_BR, [], null);
    expect(violations.some(v => v.rule_id === 'A1')).toBe(false);
  });
});

describe('Rule A2 — Linked Work Missing Dates', () => {
  it('fires warning for each work item without due_date', () => {
    const work = { ...BASE_WORK, due_date: null };
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    const a2 = violations.filter(v => v.rule_id === 'A2');
    expect(a2.length).toBe(1);
    expect(a2[0].severity).toBe('warning');
    expect(a2[0].affected_item_key).toBe('BAU-100');
  });

  it('fires once per missing-date work item', () => {
    const work1 = { ...BASE_WORK, id: 'w1', issue_key: 'BAU-101', due_date: null };
    const work2 = { ...BASE_WORK, id: 'w2', issue_key: 'BAU-102', due_date: null };
    const violations = computeDatePulseViolations(BASE_BR, [work1, work2], null);
    expect(violations.filter(v => v.rule_id === 'A2').length).toBe(2);
  });
});

describe('Rule A3 — Release Date Missing', () => {
  it('fires when BR has release_id but release has no target_date', () => {
    const br = { ...BASE_BR, release_id: 'rel-1' };
    const release = { ...BASE_RELEASE, target_date: null as unknown as string };
    const violations = computeDatePulseViolations(br, [], release);
    expect(violations.some(v => v.rule_id === 'A3')).toBe(true);
  });
});

// ── B: Date Conflict Rules ───────────────────────────────────────────────────

describe('Rule B1 — Story Due After Release', () => {
  it('fires critical when story due_date is after release target_date', () => {
    const br = { ...BASE_BR, release_id: 'rel-1' };
    const work = { ...BASE_WORK, due_date: '2026-12-20' }; // after release 2026-12-15
    const violations = computeDatePulseViolations(br, [work], BASE_RELEASE);
    const b1 = violations.find(v => v.rule_id === 'B1');
    expect(b1).toBeDefined();
    expect(b1?.severity).toBe('critical');
  });

  it('does not fire when story due_date is before release', () => {
    const br = { ...BASE_BR, release_id: 'rel-1' };
    const work = { ...BASE_WORK, due_date: '2026-12-10' }; // before release
    const violations = computeDatePulseViolations(br, [work], BASE_RELEASE);
    expect(violations.some(v => v.rule_id === 'B1')).toBe(false);
  });
});

describe('Rule B3 — Story After BR Target', () => {
  it('fires warning when story due_date exceeds BR end_date', () => {
    const work = { ...BASE_WORK, due_date: '2027-01-15' }; // after BR end 2026-12-31
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    const b3 = violations.find(v => v.rule_id === 'B3');
    expect(b3).toBeDefined();
    expect(b3?.severity).toBe('warning');
  });
});

// ── C: Scope Creep Rules ─────────────────────────────────────────────────────

describe('Rule C1 — New Work Added After Target', () => {
  it('fires when work is added after the BR target with a release committed', () => {
    const br = { ...BASE_BR, release_id: 'rel-1' };
    const work = {
      ...BASE_WORK,
      issue_type: 'defect',
      created_at: '2027-02-01T00:00:00Z', // after BR target 2026-12-31
    };
    const violations = computeDatePulseViolations(br, [work], null);
    expect(violations.some(v => v.rule_id === 'C1')).toBe(true);
  });
});

// ── D: Status Rules ──────────────────────────────────────────────────────────

describe('Rule D2 — Overdue Work Items', () => {
  it('fires critical for work item with past due_date not done', () => {
    const work = { ...BASE_WORK, due_date: '2026-01-01', status: 'in_progress' };
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    const d2 = violations.find(v => v.rule_id === 'D2');
    expect(d2).toBeDefined();
    expect(d2?.severity).toBe('critical');
  });

  it('does not fire for done work items', () => {
    const work = { ...BASE_WORK, due_date: '2026-01-01', status: 'done' };
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    expect(violations.some(v => v.rule_id === 'D2')).toBe(false);
  });
});

describe('Rule D4 — Blocked Past-Due Items', () => {
  it('fires critical for a blocked work item that is past due', () => {
    const work = { ...BASE_WORK, status: 'blocked', due_date: '2026-01-01' };
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    const d4 = violations.find(v => v.rule_id === 'D4');
    expect(d4).toBeDefined();
    expect(d4?.severity).toBe('critical');
  });
});

// ── General ──────────────────────────────────────────────────────────────────

describe('computeDatePulseViolations — general', () => {
  it('returns empty array for fully committed BR with no violations', () => {
    const violations = computeDatePulseViolations(BASE_BR, [BASE_WORK], null);
    // No rule fires: story due_date 2026-11-30 < BR end_date 2026-12-31, status in_progress, no release
    const critical = violations.filter(v => v.severity === 'critical');
    expect(critical.length).toBe(0);
  });

  it('returns violations sorted critical → warning → advisory', () => {
    const workMissingDate = { ...BASE_WORK, id: 'w2', issue_key: 'BAU-102', due_date: null };
    const brNoDate = { ...BASE_BR, end_date: null, release_id: null };
    const violations = computeDatePulseViolations(brNoDate, [workMissingDate], null);
    const severityOrder = ['critical', 'warning', 'advisory'];
    for (let i = 0; i < violations.length - 1; i++) {
      expect(severityOrder.indexOf(violations[i].severity)).toBeLessThanOrEqual(
        severityOrder.indexOf(violations[i + 1].severity),
      );
    }
  });

  it('violation has all required fields', () => {
    const work = { ...BASE_WORK, due_date: null };
    const violations = computeDatePulseViolations(BASE_BR, [work], null);
    const v = violations.find(v => v.rule_id === 'A2');
    expect(v).toBeDefined();
    expect(typeof v!.id).toBe('string');
    expect(v!.rule_id).toBe('A2');
    expect(v!.rule_category).toBe('missing');
    expect(typeof v!.title).toBe('string');
    expect(typeof v!.description).toBe('string');
  });
});
