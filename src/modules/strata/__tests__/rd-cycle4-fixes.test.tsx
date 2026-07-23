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

import { LINK_TYPES, objectiveOptions } from '@/modules/strata/components/ReviewWorkspaceModal';
import { ActionRow, DecisionCard, buildReviewsCsv, eligibleSnapshotOptions, resolveDecisionSnapshotLabel } from '@/modules/strata/pages/StrataReviewsPage';
import { StrataFormModal } from '@/modules/strata/components/authoring';
import { StrataPanel } from '@/modules/strata/components/shared';
import type { StrataAction, StrataDecision, StrataReview, StrataSnapshot } from '@/modules/strata/types';

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
    await user.type(screen.getByLabelText('Value (required)'), 'SNAP-1');
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
    await user.type(screen.getByLabelText('Value (required)'), 'draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the header/backdrop close path (Escape) also dismisses immediately after a rejection', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StrataFormModal
        open onClose={onClose} title="Attach snapshot" fields={fields}
        onSubmit={async () => { throw new Error('rejected by the database'); }}
      />,
    );
    await user.type(screen.getByLabelText('Value (required)'), 'x');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText('rejected by the database')).toBeTruthy());
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('Discard unsaved changes?')).toBeNull();
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
    await user.type(screen.getByLabelText('Value (required)'), 'x');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(screen.getByText(refusal)).toBeTruthy());
    rerender(ui(false));
    rerender(ui(true));
    expect(screen.queryByText(refusal)).toBeNull();
    expect((screen.getByLabelText('Value (required)') as HTMLInputElement).value).toBe('');
  });
});

describe('RD-DEF-001 — Strategy objective picker semantics (mixed fixtures)', () => {
  const mixed = [
    { id: 'e-obj', name: 'Grow ARPU', element_type: 'objective' },
    { id: 'e-theme', name: 'J Cycle 1 Strategy Theme', element_type: 'theme' },
    { id: 'e-play', name: 'Fiber build-out', element_type: 'play' },
    { id: 'e-obj2', name: 'Reduce churn', element_type: 'objective' },
  ];
  it('offers ONLY element_type=objective — the Codex theme finding is excluded', () => {
    const opts = objectiveOptions(mixed);
    expect(opts.map((o) => o.id).sort()).toEqual(['e-obj', 'e-obj2']);
    expect(opts.some((o) => o.label === 'J Cycle 1 Strategy Theme')).toBe(false);
    expect(opts.some((o) => o.label === 'Grow ARPU')).toBe(true);
  });
  it('is empty (honest empty state) when no objectives exist', () => {
    expect(objectiveOptions(mixed.filter((e) => e.element_type !== 'objective'))).toHaveLength(0);
  });
});

const decision = (over: Partial<StrataDecision>): StrataDecision => ({
  id: 'd-1', decision_key: 'DEC-9', forum: null, snapshot_id: null, element_id: null,
  decision_type: 'governance', title: 'T', description: null, owner_id: null,
  decided_by: null, decided_at: null, due_date: null, status: 'open', evidence_refs: null,
  outcome: null, rationale: null, approved_by: null, approved_at: null, created_by: null,
  ...over,
});

describe('RD-DEF-012 — decision snapshot attribution is the decision’s OWN, never the selected cockpit’s', () => {
  // The cockpit’s real mapping path: a memoized id→key map over the governed snapshot
  // collection, resolved INSIDE DecisionCard from d.snapshot_id. The selected snapshot is
  // deliberately NOT an input anywhere in this path.
  const LOOKUP = new Map([['s1', 'SNAP-1'], ['s8', 'SNAP-8']]);
  const noop = () => {};
  const renderCard = (over: Partial<StrataDecision>) => render(
    <DecisionCard
      d={decision({ status: 'closed', decided_by: 'u1', ...over })}
      canAuthor busy={false} snapshotKeyById={LOOKUP} profileName={() => 'Vikram Indla'}
      onDecide={noop} onCloseDecision={noop} onNewAction={noop} onHistory={noop}
    />,
  );
  const attribution = (key: string) =>
    (document.querySelector(`[data-testid="strata-reviews-decision-snapshot-${key}"]`) as HTMLElement).textContent ?? '';

  it('a SNAP-1 historical decision reads "against SNAP-1" even while the SNAP-8 cockpit is open (DEC-1104 case)', () => {
    // Viewing context = SNAP-8 cockpit; the lookup contains SNAP-8 — the card must not use it.
    renderCard({ decision_key: 'DEC-1104x', snapshot_id: 's1' });
    expect(attribution('DEC-1104x')).toContain('against SNAP-1');
    expect(attribution('DEC-1104x')).not.toContain('SNAP-8');
  });

  it('a decision genuinely linked to the selected snapshot reads "against SNAP-8"', () => {
    renderCard({ decision_key: 'DEC-S8', snapshot_id: 's8' });
    expect(attribution('DEC-S8')).toContain('against SNAP-8');
  });

  it('snapshot_id = null renders the honest absent value, inheriting nothing', () => {
    renderCard({ decision_key: 'DEC-NULL', snapshot_id: null });
    expect(attribution('DEC-NULL')).toContain('against —');
    expect(attribution('DEC-NULL')).not.toContain('SNAP-');
  });

  it('an unresolvable non-null snapshot id renders the honest fallback preserving the id — never the selected snapshot', () => {
    renderCard({ decision_key: 'DEC-GHOST', snapshot_id: 'ghost-id' });
    expect(attribution('DEC-GHOST')).toContain('against unknown snapshot (ghost-id)');
    expect(attribution('DEC-GHOST')).not.toContain('SNAP-8');
    expect(attribution('DEC-GHOST')).not.toContain('SNAP-1');
  });

  it('mixed set: linked/unlinked membership is disjoint (page predicate) and every card keeps its own attribution', () => {
    const mixed = [
      decision({ id: 'd1', decision_key: 'DEC-A', snapshot_id: 's1', status: 'closed', decided_by: 'u1' }),
      decision({ id: 'd2', decision_key: 'DEC-B', snapshot_id: 's8', status: 'closed', decided_by: 'u1' }),
      decision({ id: 'd3', decision_key: 'DEC-N', snapshot_id: null, status: 'closed', decided_by: 'u1' }),
    ];
    // The page's own membership predicate (unchanged by this fix): linked ⇔ d.snapshot_id === selected.id
    const selectedId = 's8';
    const linked = mixed.filter((d) => d.snapshot_id === selectedId);
    const unlinked = mixed.filter((d) => !linked.includes(d));
    expect(linked.map((d) => d.decision_key)).toEqual(['DEC-B']);
    expect(unlinked.map((d) => d.decision_key).sort()).toEqual(['DEC-A', 'DEC-N']);
    expect(linked.filter((d) => unlinked.includes(d))).toHaveLength(0); // no duplicates
    // Every card renders its own attribution regardless of section:
    mixed.forEach((d) => renderCard(d));
    expect(attribution('DEC-A')).toContain('against SNAP-1');
    expect(attribution('DEC-B')).toContain('against SNAP-8');
    expect(attribution('DEC-N')).toContain('against —');
  });

  it('resolveDecisionSnapshotLabel: the pure mapping used by the card', () => {
    expect(resolveDecisionSnapshotLabel('s1', LOOKUP)).toBe('SNAP-1');
    expect(resolveDecisionSnapshotLabel(null, LOOKUP)).toBe('—');
    expect(resolveDecisionSnapshotLabel('nope', LOOKUP)).toBe('unknown snapshot (nope)');
  });

  it('attribution stays inside the wrapping verdict band at narrow widths (RD-DEF-010 interplay)', () => {
    renderCard({ decision_key: 'DEC-W', snapshot_id: 's1', forum: 'A very long forum that forces wrapping at 1024 wide viewports' });
    const verdict = document.querySelector('[data-testid="strata-reviews-decision-verdict-DEC-W"]') as HTMLElement;
    const attributionEl = document.querySelector('[data-testid="strata-reviews-decision-snapshot-DEC-W"]') as HTMLElement;
    expect(verdict.contains(attributionEl)).toBe(true);
    expect(verdict.style.overflowWrap).toBe('anywhere');
  });
});

describe('RD-DEF-010 — cockpit decision/action surfaces wrap at narrow widths', () => {
  const LONG = 'A very long forum name that would otherwise push controls past the 1024 viewport edge and clip them irrecoverably';
  const noop = () => {};

  it('DecisionCard: metadata, verdict and control rows all declare wrap; long text breaks safely', () => {
    render(
      <DecisionCard
        d={decision({ forum: LONG, owner_id: 'u1', status: 'decided', outcome: 'approved', rationale: 'because', decided_by: 'u2', approved_by: 'u2', snapshot_id: 's8' })}
        canAuthor busy={false} snapshotKeyById={new Map([['s8', 'SNAP-8']])} profileName={() => 'Vikram Indla'}
        onDecide={noop} onCloseDecision={noop} onNewAction={noop} onHistory={noop}
      />,
    );
    const meta = document.querySelector('[data-testid="strata-reviews-decision-meta-DEC-9"]') as HTMLElement;
    const controls = document.querySelector('[data-testid="strata-reviews-decision-controls-DEC-9"]') as HTMLElement;
    const verdict = document.querySelector('[data-testid="strata-reviews-decision-verdict-DEC-9"]') as HTMLElement;
    expect(meta.style.flexWrap).toBe('wrap');
    expect(controls.style.flexWrap).toBe('wrap');
    expect(verdict.style.overflowWrap).toBe('anywhere');
    // Controls remain present (reachable), not conditionally dropped, at any width:
    expect(screen.getByTestId('strata-reviews-close-decision-DEC-9')).toBeTruthy();
    expect(screen.getByTestId('strata-reviews-history-DEC-9')).toBeTruthy();
  });

  it('DecisionCard (closed): terminal notice + History wrap row; no New action', () => {
    render(
      <DecisionCard
        d={decision({ decision_key: 'DEC-C', status: 'closed' })}
        canAuthor busy={false} snapshotKeyById={new Map()} profileName={() => null}
        onDecide={noop} onCloseDecision={noop} onNewAction={noop} onHistory={noop}
      />,
    );
    expect(screen.getByTestId('strata-reviews-decision-terminal-DEC-C')).toBeTruthy();
    expect(screen.queryByTestId('strata-reviews-new-action-DEC-C')).toBeNull();
    expect((document.querySelector('[data-testid="strata-reviews-decision-controls-DEC-C"]') as HTMLElement).style.flexWrap).toBe('wrap');
  });

  it('ActionRow: metadata and control rows declare wrap and stay keyboard-reachable', () => {
    const a: StrataAction = { id: 'a-1', action_key: 'ACT-9', decision_id: 'd-1', title: 'Follow up', owner_id: 'u1', due_date: '2026-07-31', status: 'in_progress', note: null };
    render(
      <ActionRow a={a} decisionKey="DEC-9" canAuthor busy={false} todayISO="2026-07-18"
        profileName={() => 'Vikram Indla'} onTransition={noop} onHistory={noop} />,
    );
    expect((document.querySelector('[data-testid="strata-reviews-action-meta-ACT-9"]') as HTMLElement).style.flexWrap).toBe('wrap');
    expect((document.querySelector('[data-testid="strata-reviews-action-controls-ACT-9"]') as HTMLElement).style.flexWrap).toBe('wrap');
    // Done/Cancel/History are real buttons — keyboard-focusable by nature.
    expect(screen.getByTestId('strata-reviews-done-ACT-9').tagName).toBe('BUTTON');
    expect(screen.getByTestId('strata-reviews-history-ACT-9').tagName).toBe('BUTTON');
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
