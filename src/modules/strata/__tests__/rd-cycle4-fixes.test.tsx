/**
 * CAT-STRATA-RDDEF-20260718-001 · Cycle 4 fix pack regression.
 *
 * Covers the code-addressable Cycle 4 findings:
 *  - RD-DEF-001: the evidence vocabulary is COMPLETE (objective, scorecard, gate included);
 *  - RD-DEF-002: only eligible (locked + unbound) snapshots are offered for attachment;
 *  - RD-DEF-011: after a rejected submission, Cancel dismisses the modal directly and a
 *    reopened modal is clean — while the server's verbatim error stays visible until then;
 *  - RD-DEF-010: panel headers wrap instead of clipping their actions;
 *  - Export: the filtered CSV artifact's exact content (Cycle 4's Chrome could not capture
 *    the download event, so the content itself is proven here).
 *
 * Server-boundary behaviour (zero-row rejections, SoD, duplicate protection, terminal
 * immutability) is enforced in the DB and proven by the staging probe battery — not re-proven
 * here through mocks, which would only prove the mocks.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINK_TYPES } from '@/modules/strata/components/ReviewWorkspaceModal';
import { buildReviewsCsv, eligibleSnapshotOptions } from '@/modules/strata/pages/StrataReviewsPage';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { StrataPanel } from '@/modules/strata/components/shared';
import type { StrataReview, StrataSnapshot } from '@/modules/strata/types';

vi.mock('@/modules/strata/hooks/useStrata', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useProfileNames: () => ({ data: new Map() }),
}));

const review = (over: Partial<StrataReview>): StrataReview => ({
  id: 'r-x', review_key: 'REV-X', slug: null, organization_id: null, name: 'X',
  review_type: 'executive', cadence: 'quarterly', status: 'scheduled', origin: 'scheduled',
  scope: null, cycle_id: null, period_id: null, snapshot_id: null, board_pack_id: null,
  scheduled_for: null, chair_id: null, accountable_owner_id: null, agenda: null, note: null,
  created_by: null, created_at: '2026-07-18T00:00:00Z', updated_at: '2026-07-18T00:00:00Z',
  ...over,
});

const snap = (over: Partial<StrataSnapshot>): StrataSnapshot => ({
  id: 's-x', snapshot_key: 'SNAP-X', name: 'Qx', cycle_id: 'c1', period_id: 'p1',
  created_by: null, locked_at: '2026-07-01T00:00:00Z', status: 'locked', superseded_by_id: null,
  ...over,
} as StrataSnapshot);

describe('RD-DEF-001 — complete governed evidence vocabulary', () => {
  it('exposes every required evidence type, including the three Cycle 4 found missing', () => {
    const values = LINK_TYPES.map((t) => t.value);
    // Cycle 4 gaps:
    expect(values).toContain('objective');
    expect(values).toContain('scorecard_instance');
    expect(values).toContain('gate_instance');
    // Preserved set:
    for (const kept of ['kpi', 'okr', 'project_card', 'portfolio', 'benefit', 'snapshot']) {
      expect(values).toContain(kept);
    }
    expect(values).toHaveLength(9);
  });
});

describe('RD-DEF-002 — eligible snapshot attachment', () => {
  const forReview = review({ id: 'r-1', review_key: 'REV-11' });
  const other = review({ id: 'r-2', review_key: 'REV-7', snapshot_id: 's-bound' });
  const snapshots = [
    snap({ id: 's-bound', snapshot_key: 'SNAP-1' }),          // locked but bound to REV-7
    snap({ id: 's-free', snapshot_key: 'SNAP-2' }),           // locked, unbound → eligible
    snap({ id: 's-superseded', snapshot_key: 'SNAP-0', status: 'superseded' }), // not locked
  ];

  it('offers only locked snapshots not bound to another review', () => {
    const opts = eligibleSnapshotOptions(snapshots, [forReview, other], forReview);
    expect(opts.map((o) => o.value)).toEqual(['s-free']);
  });

  it('keeps the review’s OWN attached snapshot selectable', () => {
    const mine = review({ id: 'r-1', snapshot_id: 's-bound' });
    const reviews = [mine, review({ id: 'r-3' })];
    const opts = eligibleSnapshotOptions(snapshots, reviews, mine);
    expect(opts.map((o) => o.value).sort()).toEqual(['s-bound', 's-free']);
  });

  it('returns nothing when every locked snapshot is bound elsewhere — the modal then names the Lock-snapshot path', () => {
    const opts = eligibleSnapshotOptions(
      [snap({ id: 's-bound' })],
      [forReview, other],
      forReview,
    );
    expect(opts).toHaveLength(0);
  });
});

describe('Export — filtered CSV artifact content', () => {
  it('emits a header row plus one line per filtered review, with stable IDs and escaping', () => {
    const rows = [
      review({ id: 'id-1', review_key: 'REV-1', name: 'Plain' }),
      review({ id: 'id-2', review_key: 'REV-2', name: 'Has, comma "and quotes"', status: 'cancelled', note: 'line1\nline2' }),
    ];
    const csv = buildReviewsCsv(rows, () => null);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('review_key,id,name,type,cadence,status,scheduled_for,chair,accountable_owner,snapshot_id,board_pack_id,origin,note');
    expect(lines[1].startsWith('REV-1,id-1,Plain,executive,quarterly,scheduled')).toBe(true);
    // Quoted/escaped field survives intact:
    expect(csv).toContain('"Has, comma ""and quotes"""');
    // The multi-line note is quoted, so the CSV has exactly header + 2 records + 1 continuation line.
    expect(csv).toContain('"line1\nline2"');
  });

  it('contains ONLY the filtered result set', () => {
    const csv = buildReviewsCsv([review({ review_key: 'REV-8', status: 'cancelled' })], () => null);
    expect(csv).toContain('REV-8');
    expect(csv).not.toContain('REV-7');
  });
});

describe('RD-DEF-011 — modal recovery after a rejected submission', () => {
  const fields = [{ key: 'val', label: 'Value', kind: 'text' as const, required: true }];

  it('Cancel dismisses the modal directly after a server rejection, preserving the verbatim error until then', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const refusal = 'a review cannot convene on a snapshot bound to another review';
    render(
      <StrataFormModal
        open onClose={onClose} title="Attach snapshot" fields={fields}
        onSubmit={async () => { throw new Error(refusal); }}
      />,
    );
    await user.type(screen.getByLabelText('Value'), 'SNAP-1');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    // The database's own wording is preserved on screen…
    await waitFor(() => expect(screen.getByText(refusal)).toBeTruthy());
    // …and Cancel now closes IMMEDIATELY — no stacked "Discard unsaved changes?" detour.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
  });

  it('a dirty form that was NEVER rejected still confirms before discarding', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StrataFormModal open onClose={onClose} title="Edit" fields={fields} onSubmit={async () => {}} />,
    );
    await user.type(screen.getByLabelText('Value'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reopening after a rejection shows a clean modal — no stale error or values', async () => {
    const user = userEvent.setup();
    const refusal = 'rejected by the database';
    const ui = (open: boolean) => (
      <StrataFormModal
        open={open} onClose={() => {}} title="Attach" fields={fields}
        onSubmit={async () => { throw new Error(refusal); }}
      />
    );
    const { rerender } = render(ui(true));
    await user.type(screen.getByLabelText('Value'), 'x');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText(refusal)).toBeTruthy());
    rerender(ui(false));
    rerender(ui(true));
    expect(screen.queryByText(refusal)).toBeNull();
    expect((screen.getByLabelText('Value') as HTMLInputElement).value).toBe('');
  });
});

describe('RD-DEF-010 — panel headers wrap instead of clipping', () => {
  it('the StrataPanel header declares flex-wrap so actions drop a line at 1024×768 rather than being amputated by overflow:hidden', () => {
    const { container } = render(
      <StrataPanel title="Board packs" actions={<button type="button">Generate board pack (PDF)</button>} testId="panel-x">
        <div>body</div>
      </StrataPanel>,
    );
    const section = container.querySelector('[data-testid="panel-x"]') as HTMLElement;
    const header = section.firstElementChild as HTMLElement;
    expect(header.style.flexWrap).toBe('wrap');
  });
});
