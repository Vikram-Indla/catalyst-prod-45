/**
 * Unit tests for buildIdeasBoardAdapter (Phase 8).
 *
 * Focused on the Phase 4 migration contract: Ideas columns, drafts filter,
 * primary/secondary lozenges, status-change persistence, and assignee
 * avatar wiring. Pure functions only — no React, no Supabase.
 */
import { describe, it, expect, vi } from 'vitest';
import type { IdeaRow } from '@/hooks/useIdeasHub';
import {
  buildIdeasBoardAdapter,
  IDEAS_BOARD_COLUMNS,
  ideasColumnIdToStatus,
  ideasStatusToColumnId,
  ideaToCanonicalIssue,
} from '../adapters/ideasBoardAdapter';
import { buildColMapFromAdapter } from '../adapters/BoardAdapter';

/* ═══════════════════════════════════════════════════════════════════════
   Fixture builder — IdeaRow has many optional fields; give sane defaults.
   ═══════════════════════════════════════════════════════════════════════ */

function idea(overrides: Partial<IdeaRow>): IdeaRow {
  return {
    id: overrides.id ?? 'i-1',
    idea_key: overrides.idea_key ?? 'IDH-001',
    title: overrides.title ?? 'Untitled',
    description: null,
    status: overrides.status ?? 'Submitted',
    priority: overrides.priority ?? 'P3',
    idea_type: overrides.idea_type ?? 'Feature',
    source: null,
    theme: overrides.theme ?? null,
    assigned_team: null,
    assigned_to_name: overrides.assigned_to_name ?? null,
    assignee_id: null,
    department: null,
    roadmap_quarter: overrides.roadmap_quarter ?? null,
    target_release_date: null,
    is_committed: overrides.is_committed ?? false,
    impact_total: overrides.impact_total ?? 3.5,
    impact_investor_fit: 0,
    impact_market_size: 0,
    impact_problem_severity: 0,
    impact_user_benefit: 0,
    impact_complexity_inv: 0,
    impact_time_to_value: 0,
    vote_count: 0,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z',
    linked_initiative_key: null,
    ai_enrichment_status: null,
    is_deleted: overrides.is_deleted ?? false,
  };
}

const sampleIdeas: IdeaRow[] = [
  idea({ id: 'i-submitted',  idea_key: 'IDH-001', status: 'Submitted',    theme: 'DX', roadmap_quarter: '2026-Q2', assigned_to_name: 'Fatima' }),
  idea({ id: 'i-review',     idea_key: 'IDH-002', status: 'Under Review', theme: 'AI', idea_type: 'Enhancement', assigned_to_name: 'Ahmed' }),
  idea({ id: 'i-approved',   idea_key: 'IDH-003', status: 'Approved',     is_committed: true }),
  idea({ id: 'i-converted',  idea_key: 'IDH-004', status: 'Converted to Request' }),
  idea({ id: 'i-rejected',   idea_key: 'IDH-005', status: 'Rejected' }),
  idea({ id: 'i-draft',      idea_key: 'IDH-006', status: 'Draft' }),          // excluded
  idea({ id: 'i-deleted',    idea_key: 'IDH-007', status: 'Submitted', is_deleted: true }), // excluded
];

const avatars = new Map<string, string>([['fatima', 'url/f.png'], ['ahmed', 'url/a.png']]);

function args(overrides: Partial<Parameters<typeof buildIdeasBoardAdapter>[0]> = {}) {
  return {
    ideas: sampleIdeas,
    avatarsByName: avatars,
    search: '',
    onSearchChange: () => {},
    selAssignees: new Set<string>(),
    onSelAssigneesChange: () => {},
    filterSelected: {} as Record<string, string[]>,
    onFilterChange: () => {},
    onClearFilters: () => {},
    groupBy: 'none',
    onGroupByChange: () => {},
    onStatusChange: vi.fn(async () => {}),
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Tests
   ═══════════════════════════════════════════════════════════════════════ */

describe('IDEAS_BOARD_COLUMNS + status mapping', () => {
  it('declares the Phase 4 five-column lifecycle', () => {
    expect(IDEAS_BOARD_COLUMNS.map(c => c.id)).toEqual([
      'col-submitted', 'col-review', 'col-approved', 'col-converted', 'col-rejected',
    ]);
  });

  it('ideasStatusToColumnId maps every lifecycle status', () => {
    expect(ideasStatusToColumnId('Submitted')).toBe('col-submitted');
    expect(ideasStatusToColumnId('Under Review')).toBe('col-review');
    expect(ideasStatusToColumnId('Approved')).toBe('col-approved');
    expect(ideasStatusToColumnId('Converted to Request')).toBe('col-converted');
    expect(ideasStatusToColumnId('Rejected')).toBe('col-rejected');
    expect(ideasStatusToColumnId('Draft')).toBeNull();
  });

  it('ideasColumnIdToStatus round-trips back to the primary status', () => {
    for (const col of IDEAS_BOARD_COLUMNS) {
      const status = ideasColumnIdToStatus(col.id);
      expect(status).toBe(col.statuses[0]);
    }
  });
});

describe('ideaToCanonicalIssue', () => {
  it('sets primary lozenge = idea_type (default appearance)', () => {
    const row = idea({ idea_type: 'Opportunity' });
    const c = ideaToCanonicalIssue(row);
    expect(c.primaryLozenge?.label).toBe('Opportunity');
    expect(c.primaryLozenge?.appearance).toBe('default');
  });

  it('sets secondary lozenge = roadmap_quarter (inprogress appearance)', () => {
    const row = idea({ roadmap_quarter: '2026-Q3' });
    const c = ideaToCanonicalIssue(row);
    expect(c.secondaryLozenge?.label).toBe('2026-Q3');
    expect(c.secondaryLozenge?.appearance).toBe('inprogress');
  });

  it('formats impact_total into metaText', () => {
    const c = ideaToCanonicalIssue(idea({ impact_total: 3.75 }));
    expect(c.metaText).toBe('IMPACT: 3.75');
  });

  it('forwards is_committed as isFlagged', () => {
    expect(ideaToCanonicalIssue(idea({ is_committed: true })).isFlagged).toBe(true);
    expect(ideaToCanonicalIssue(idea({ is_committed: false })).isFlagged).toBe(false);
  });
});

describe('buildIdeasBoardAdapter — visibility + distribution', () => {
  it('excludes Draft and is_deleted ideas from the board surface', () => {
    const a = buildIdeasBoardAdapter(args());
    const ids = a.cards.map(c => c.id);
    expect(ids).not.toContain('i-draft');
    expect(ids).not.toContain('i-deleted');
  });

  it('buckets cards into the right columns', () => {
    const a = buildIdeasBoardAdapter(args());
    const cm = buildColMapFromAdapter(a);
    expect(cm['col-submitted']).toEqual(['i-submitted']);
    expect(cm['col-review']).toEqual(['i-review']);
    expect(cm['col-approved']).toEqual(['i-approved']);
    expect(cm['col-converted']).toEqual(['i-converted']);
    expect(cm['col-rejected']).toEqual(['i-rejected']);
  });
});

describe('buildIdeasBoardAdapter — filters', () => {
  it('filters by idea_type', () => {
    const a = buildIdeasBoardAdapter(args({ filterSelected: { idea_type: ['Enhancement'] } }));
    expect(a.cards.map(c => c.id)).toEqual(['i-review']);
  });

  it('filters by theme', () => {
    const a = buildIdeasBoardAdapter(args({ filterSelected: { theme: ['DX'] } }));
    expect(a.cards.map(c => c.id)).toEqual(['i-submitted']);
  });

  it('filters by roadmap_quarter', () => {
    const a = buildIdeasBoardAdapter(args({ filterSelected: { quarter: ['2026-Q2'] } }));
    expect(a.cards.map(c => c.id)).toEqual(['i-submitted']);
  });

  it('search matches title or idea_key case-insensitively', () => {
    const a = buildIdeasBoardAdapter(args({ search: 'idh-002' }));
    expect(a.cards.map(c => c.id)).toEqual(['i-review']);
  });
});

describe('buildIdeasBoardAdapter — persistence', () => {
  it('onDrop into a new column triggers onStatusChange with the new primary status', async () => {
    const onStatusChange = vi.fn();
    const a = buildIdeasBoardAdapter(args({ onStatusChange }));
    await a.persistence.onDrop({
      cardId: 'i-submitted', sourceColId: 'col-submitted', destColId: 'col-approved', insertIndex: 0,
    });
    expect(onStatusChange).toHaveBeenCalledWith('i-submitted', 'Approved');
  });

  it('onDrop is a no-op when column is unchanged', async () => {
    const onStatusChange = vi.fn();
    const a = buildIdeasBoardAdapter(args({ onStatusChange }));
    await a.persistence.onDrop({
      cardId: 'i-submitted', sourceColId: 'col-submitted', destColId: 'col-submitted', insertIndex: 0,
    });
    expect(onStatusChange).not.toHaveBeenCalled();
  });
});
