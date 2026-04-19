/**
 * Unit tests for buildIncidentHubBoardAdapter (Phase 8).
 *
 * Focused on the Phase 5 migration contract: 5-column lifecycle, severity
 * → Atlaskit lozenge appearance, resolution_breached → isFlagged, and
 * the read-only `onDropAttempt` delegation pattern. Pure functions only.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildIncidentHubBoardAdapter,
  incidentHubColumnIdToStatus,
  incidentHubStatusToColumnId,
  incidentToCanonicalIssue,
  INCIDENTHUB_BOARD_COLUMNS,
  type IncidentHubRow,
} from '../adapters/incidentHubBoardAdapter';
import { buildColMapFromAdapter } from '../adapters/BoardAdapter';

/* ═══════════════════════════════════════════════════════════════════════
   Fixture builder — IncidentHubRow has ~20 fields. Default unset ones to
   null / false so tests stay focused on the branch under test.
   ═══════════════════════════════════════════════════════════════════════ */

function incident(overrides: Partial<IncidentHubRow>): IncidentHubRow {
  return {
    id: overrides.id ?? 'inc-1',
    incident_key: overrides.incident_key ?? 'INC-0001',
    title: overrides.title ?? 'Untitled incident',
    description: null,
    severity: overrides.severity ?? 'SEV-3',
    priority: overrides.priority ?? 'P3',
    status: overrides.status ?? 'open',
    jira_status: '',
    project_name: '',
    assignee_name: overrides.assignee_name ?? null,
    reporter_name: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
    resolution: null,
    labels: [],
    due_date: overrides.due_date ?? null,
    type_icon_url: null,
    parent_key: null,
    parent_summary: null,
    resolution_breached: overrides.resolution_breached ?? false,
    response_breached: false,
    resolution_due_at: null,
  };
}

const FIXTURES: IncidentHubRow[] = [
  incident({ id: 'inc-triage', incident_key: 'INC-0001', status: 'triage',       severity: 'SEV-2' }),
  incident({ id: 'inc-open',   incident_key: 'INC-0002', status: 'open',         severity: 'SEV-1', resolution_breached: true }),
  incident({ id: 'inc-wip',    incident_key: 'INC-0003', status: 'in_progress',  severity: 'SEV-3', assignee_name: 'Ahmed' }),
  incident({ id: 'inc-comm',   incident_key: 'INC-0004', status: 'to_committee', severity: 'SEV-4' }),
  incident({ id: 'inc-done',   incident_key: 'INC-0005', status: 'resolved',     severity: 'SEV-3' }),
];

function args(overrides: Partial<Parameters<typeof buildIncidentHubBoardAdapter>[0]> = {}) {
  return {
    incidents: FIXTURES,
    avatarsByName: new Map<string, string>(),
    search: '',
    onSearchChange: () => {},
    selAssignees: new Set<string>(),
    onSelAssigneesChange: () => {},
    filterSelected: {} as Record<string, string[]>,
    onFilterChange: () => {},
    onClearFilters: () => {},
    groupBy: 'none',
    onGroupByChange: () => {},
    onDropAttempt: vi.fn(),
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Tests
   ═══════════════════════════════════════════════════════════════════════ */

describe('INCIDENTHUB_BOARD_COLUMNS + status mapping', () => {
  it('declares the 5-stage Phase 5 lifecycle', () => {
    expect(INCIDENTHUB_BOARD_COLUMNS.map(c => c.id)).toEqual([
      'col-triage', 'col-open', 'col-in-progress', 'col-committee', 'col-resolved',
    ]);
  });

  it('status → col round-trips for every lifecycle entry', () => {
    for (const col of INCIDENTHUB_BOARD_COLUMNS) {
      const status = col.statuses[0];
      expect(incidentHubStatusToColumnId(status)).toBe(col.id);
      expect(incidentHubColumnIdToStatus(col.id)).toBe(status);
    }
  });

  it('returns null for unknown statuses / column ids', () => {
    expect(incidentHubStatusToColumnId('nope')).toBeNull();
    expect(incidentHubColumnIdToStatus('col-ghost')).toBeNull();
  });
});

describe('incidentToCanonicalIssue', () => {
  it('maps SEV-1 → removed, SEV-2 → new, SEV-3 → inprogress, SEV-4 → default', () => {
    const c1 = incidentToCanonicalIssue(incident({ severity: 'SEV-1' }));
    const c2 = incidentToCanonicalIssue(incident({ severity: 'SEV-2' }));
    const c3 = incidentToCanonicalIssue(incident({ severity: 'SEV-3' }));
    const c4 = incidentToCanonicalIssue(incident({ severity: 'SEV-4' }));
    expect(c1.primaryLozenge?.appearance).toBe('removed');
    expect(c2.primaryLozenge?.appearance).toBe('new');
    expect(c3.primaryLozenge?.appearance).toBe('inprogress');
    expect(c4.primaryLozenge?.appearance).toBe('default');
  });

  it('lozenge label strips the dash (SEV-1 → SEV1)', () => {
    const c = incidentToCanonicalIssue(incident({ severity: 'SEV-1' }));
    expect(c.primaryLozenge?.label).toBe('SEV1');
  });

  it('forwards resolution_breached as isFlagged (red-edge affordance)', () => {
    expect(incidentToCanonicalIssue(incident({ resolution_breached: true })).isFlagged).toBe(true);
    expect(incidentToCanonicalIssue(incident({ resolution_breached: false })).isFlagged).toBe(false);
  });

  it('uses "Production Incident" as the canonical issueType', () => {
    const c = incidentToCanonicalIssue(incident({}));
    expect(c.issueType).toBe('Production Incident');
  });

  it('preserves raw row on the canonical issue for adapter callbacks', () => {
    const row = incident({ id: 'inc-raw' });
    const c = incidentToCanonicalIssue(row);
    expect(c.raw).toBe(row);
  });
});

describe('buildIncidentHubBoardAdapter — distribution + filters', () => {
  it('buckets every fixture into the correct column', () => {
    const a = buildIncidentHubBoardAdapter(args());
    const cm = buildColMapFromAdapter(a);
    expect(cm['col-triage']).toEqual(['inc-triage']);
    expect(cm['col-open']).toEqual(['inc-open']);
    expect(cm['col-in-progress']).toEqual(['inc-wip']);
    expect(cm['col-committee']).toEqual(['inc-comm']);
    expect(cm['col-resolved']).toEqual(['inc-done']);
  });

  it('filters by severity', () => {
    const a = buildIncidentHubBoardAdapter(args({
      filterSelected: { severity: ['SEV-1'] },
    }));
    expect(a.cards.map(c => c.id)).toEqual(['inc-open']);
  });

  it('filters by SLA status (breached / at_risk / healthy)', () => {
    const breached = buildIncidentHubBoardAdapter(args({
      filterSelected: { sla: ['breached'] },
    }));
    expect(breached.cards.map(c => c.id)).toEqual(['inc-open']);

    const healthy = buildIncidentHubBoardAdapter(args({
      filterSelected: { sla: ['healthy'] },
    }));
    // Every non-breached fixture with no due_date ends up healthy.
    expect(healthy.cards.map(c => c.id).sort()).toEqual(
      ['inc-triage', 'inc-wip', 'inc-comm', 'inc-done'].sort(),
    );
  });

  it('search matches on incident_key', () => {
    const a = buildIncidentHubBoardAdapter(args({ search: 'INC-0002' }));
    expect(a.cards.map(c => c.id)).toEqual(['inc-open']);
  });
});

describe('buildIncidentHubBoardAdapter — read-only persistence', () => {
  it('onDrop delegates to onDropAttempt when column changes', () => {
    const onDropAttempt = vi.fn();
    const a = buildIncidentHubBoardAdapter(args({ onDropAttempt }));
    a.persistence.onDrop({
      cardId: 'inc-triage', sourceColId: 'col-triage', destColId: 'col-open', insertIndex: 0,
    });
    expect(onDropAttempt).toHaveBeenCalledWith('inc-triage', 'col-open');
  });

  it('onDrop is a no-op for same-column drops (no false-positive toast)', () => {
    const onDropAttempt = vi.fn();
    const a = buildIncidentHubBoardAdapter(args({ onDropAttempt }));
    a.persistence.onDrop({
      cardId: 'inc-open', sourceColId: 'col-open', destColId: 'col-open', insertIndex: 0,
    });
    expect(onDropAttempt).not.toHaveBeenCalled();
  });

  it('does NOT expose a write-path onStatusChange (read-only hub)', () => {
    const a = buildIncidentHubBoardAdapter(args());
    expect(a.persistence.onStatusChange).toBeUndefined();
  });
});

describe('buildIncidentHubBoardAdapter — misc', () => {
  it('exposes resolveIcon so the card footer stays incident-native', () => {
    const a = buildIncidentHubBoardAdapter(args());
    expect(typeof a.resolveIcon).toBe('function');
  });

  it('createLabel matches the Phase 5 "New incident" CTA', () => {
    const a = buildIncidentHubBoardAdapter(args());
    expect(a.createLabel).toBe('New incident');
  });
});
