/**
 * R2/F1 — board-pack editorial lifecycle UI (capability 7).
 *
 * The DB half is proven by the migration (20260717140000): issued packs are immutable BY TRIGGER
 * (UPDATE and DELETE both refused), the only legal transition off `issued` is `superseded`, a
 * correction is a NEW VERSION over the SAME snapshot, and a reason is mandatory to supersede.
 * This pins the UI's obligations:
 *   - an issued pack offers Supersede and NOTHING that the server would refuse (no edit, no delete);
 *   - `status` (generation) and `issue_status` (editorial) stay two independent, separately
 *     rendered facts — F-12; a pack can be `approved` and still `pending` a render;
 *   - `qualification_note` is rendered VERBATIM — the figures are official and unchanged, and
 *     paraphrasing that into doubt about the numbers would be a falsehood;
 *   - `is_qualified === false` is NEVER rendered as verified/clean — it means no exception is on
 *     record, which per E-4/§3.7 is not proof of integrity;
 *   - a reason is collected BEFORE the round trip, so the RPC is never called without one;
 *   - no governed verb is offered to a role the RPC would refuse.
 *
 * strata_approve_board_pack (20260717200000) closed the lifecycle's missing entry verb, so the arc
 * draft → approved → issued is now reachable and is pinned here too. Approval is offered ONLY from
 * draft|in_review, and deliberately does NOT require a locked snapshot — only issuance does.
 *
 * tsc proves nothing here (F-11: `npx tsc --noEmit` is a no-op). These assertions are the check.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const pack = (
    id: string, version: number, issue_status: string, status: string,
    extra: Record<string, unknown> = {},
  ) => ({
    id, version, issue_status, status,
    snapshot_id: 'snap-1', format: 'pdf', storage_path: null, generated_at: '2026-07-01T00:00:00Z',
    supersedes_id: null, issued_by: null, issued_at: null, approved_by: null, approved_at: null,
    title: null, sections: null, ...extra,
  });
  const NOTE =
    'The figures in this pack are OFFICIAL and UNCHANGED — they were frozen when the snapshot was '
    + 'locked. What is qualified is their PROVENANCE: the configuration recorded for this snapshot can '
    + 'no longer be re-resolved to the exact values that produced these numbers. See integrity '
    + 'exception 11111111-1111-1111-1111-111111111111 (documented).';
  return {
    NOTE,
    // v2 was issued to a board; v1 is the version it corrected.
    ISSUED: pack('p2', 2, 'issued', 'ready', {
      supersedes_id: 'p1', issued_by: 'u1', issued_at: '2026-07-10T09:00:00Z', approved_by: 'u2',
    }),
    SUPERSEDED: pack('p1', 1, 'superseded', 'ready', { issued_by: 'u1', issued_at: '2026-06-01T09:00:00Z' }),
    APPROVED_READY: pack('p3', 3, 'approved', 'ready', { approved_by: 'u2' }),
    // Approved editorially, but the artefact has NOT rendered — the two lifecycles are independent.
    APPROVED_PENDING: pack('p4', 4, 'approved', 'pending', { approved_by: 'u2' }),
    DRAFT: pack('p5', 5, 'draft', 'ready'),
    IN_REVIEW: pack('p6', 6, 'in_review', 'ready'),
    // A pack with no snapshot. The real query filters by snapshot_id so this cannot appear on this
    // surface — it pins the defensive mirror of the RPC's snapshot_id IS NULL refusal.
    NO_SNAPSHOT: pack('p7', 7, 'draft', 'ready', { snapshot_id: null }),
    QUALIFIED: {
      board_pack_id: 'p2', snapshot_id: 'snap-1', snapshot_key: 'SNAP-1', issue_status: 'issued',
      version: 2, is_qualified: true, provenance_reproducibility: 'not_reproducible',
      values_changed: false, resolution: 'documented', detection_is_lower_bound: true,
      qualification_note: NOTE,
    },
    UNQUALIFIED: {
      board_pack_id: 'p3', snapshot_id: 'snap-1', snapshot_key: 'SNAP-1', issue_status: 'approved',
      version: 3, is_qualified: false, provenance_reproducibility: null, values_changed: null,
      resolution: null, detection_is_lower_bound: null, qualification_note: null,
    },
    boardPackQualification: vi.fn(),
    approveBoardPack: vi.fn(async () => undefined),
    issueBoardPack: vi.fn(async () => undefined),
    supersedeBoardPack: vi.fn(async () => 'p9'),
    invalidate: vi.fn(),
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

let ROLES: string[] = ['strategy_office'];
const DEFAULT_PACKS = () => [H.SUPERSEDED, H.ISSUED, H.APPROVED_READY, H.APPROVED_PENDING, H.DRAFT, H.IN_REVIEW];
let PACKS: unknown[] = DEFAULT_PACKS();

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useBoardPacks: () => H.ok(PACKS),
  useStrataRoles: () => H.ok(ROLES),
  useProfileNames: () => H.ok(new Map([['u1', { name: 'Dana Issuer', email: null, avatarUrl: null }]])),
  useInvalidateStrata: () => H.invalidate,
  // Imported by the page module (the section does not call them, but the module must resolve).
  useSnapshotByKey: () => H.ok(null),
  useSnapshotItems: () => H.ok([]),
  useDecisions: () => H.ok([]),
  useActions: () => H.ok([]),
  useStrataContext: () => ({ cycles: [], periods: [] }),
}));
vi.mock('@/modules/strata/domain', () => ({
  governanceApi: {
    boardPackQualification: H.boardPackQualification,
    approveBoardPack: H.approveBoardPack,
    issueBoardPack: H.issueBoardPack,
    supersedeBoardPack: H.supersedeBoardPack,
  },
  configApi: {}, scorecardApi: {}, lineageApi: {}, valueApi: {}, kpiApi: {}, strategyApi: {},
}));
vi.mock('@/modules/strata/lib/boardPack', () => ({ generateBoardPackPdf: vi.fn() }));

// The SECTION, not the page: rendering the page drags in the STRATA shell and would prove the
// shell rather than the governed lifecycle. Mirrors how SourcesRegistry is tested (R3).
import { PackVersionsSection } from '@/modules/strata/pages/StrataBoardPackPage';

// Renders whatever the section reports through onError, so a server refusal can be asserted as the
// user would read it.
const Page = ({ snapshotStatus = 'locked' as const }) => {
  const [err, setErr] = React.useState<string | null>(null);
  return (
    <>
      {err ? <div data-testid="strata-pack-error">{err}</div> : null}
      <PackVersionsSection snapshotId="snap-1" snapshotStatus={snapshotStatus} onError={setErr} />
    </>
  );
};
const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);

beforeEach(() => {
  ROLES = ['strategy_office'];
  PACKS = DEFAULT_PACKS();
  H.boardPackQualification.mockReset();
  H.approveBoardPack.mockReset();
  H.approveBoardPack.mockResolvedValue(undefined);
  H.issueBoardPack.mockClear();
  H.supersedeBoardPack.mockClear();
});

describe('R2 UI — an issued pack is immutable, so only Supersede is offered', () => {
  it('offers Supersede and NOT Issue on an issued pack', () => {
    render(<Page />);
    expect(q('strata-pack-supersede-p2')).not.toBeNull();
    expect(q('strata-pack-issue-p2')).toBeNull();
  });

  it('offers no edit and no delete anywhere — the DB refuses both on an issued pack', () => {
    render(<Page />);
    // Anchored: the sortable column header "Editorial state" is itself a button and would match a
    // loose /edit/i. What must not exist is an edit/delete VERB.
    expect(screen.queryByRole('button', { name: /^(edit|delete|remove|discard)\b/i })).toBeNull();
  });

  it('a SUPERSEDED pack is terminal — no verbs, and it says why', () => {
    render(<Page />);
    expect(q('strata-pack-terminal-p1')).not.toBeNull();
    expect(q('strata-pack-terminal-p1')?.textContent).toMatch(/terminal/i);
    expect(q('strata-pack-supersede-p1')).toBeNull();
    expect(q('strata-pack-issue-p1')).toBeNull();
  });

  it('a correction points back at the version it corrects', () => {
    render(<Page />);
    expect(q('strata-pack-supersedes-p2')?.textContent).toMatch(/corrects v1/);
  });
});

describe('R2 UI — generation and editorial lifecycles stay distinct (F-12)', () => {
  it('renders a pack that is APPROVED editorially and still PENDING generation as both', () => {
    render(<Page />);
    // Two separate cells: conflating them into one badge would lose one of the two facts.
    expect(q('strata-pack-issue-status-p4')?.textContent).toMatch(/approved/i);
    expect(q('strata-pack-generation-p4')?.textContent).toMatch(/pending/i);
  });

  it('does not offer Issue while the artefact has not rendered — and names the blocker', () => {
    render(<Page />);
    expect(q('strata-pack-issue-p4')).toBeNull();
    expect(q('strata-pack-issue-blocked-p4')?.textContent).toMatch(/not ready/i);
    // The ready+approved sibling IS offered — proving the block is about generation, not editorial state.
    expect(q('strata-pack-issue-p3')).not.toBeNull();
  });

  it('does not offer Issue over an unlocked snapshot — the numbers could still change', () => {
    render(<Page snapshotStatus={'superseded' as never} />);
    expect(q('strata-pack-issue-p3')).toBeNull();
    expect(q('strata-pack-issue-blocked-p3')?.textContent).toMatch(/not locked/i);
  });

  it('offers Approve — not Issue — on a draft: the RPC refuses to issue anything not approved', () => {
    render(<Page />);
    expect(q('strata-pack-approve-p5')).not.toBeNull();
    expect(q('strata-pack-issue-p5')).toBeNull();
  });
});

describe('R2 UI — approval is the entry verb, offered exactly where the RPC accepts it', () => {
  it('offers Approve on draft AND in_review — the only two states the RPC accepts', () => {
    render(<Page />);
    expect(q('strata-pack-approve-p5')).not.toBeNull(); // draft
    expect(q('strata-pack-approve-p6')).not.toBeNull(); // in_review
  });

  it('never offers Approve on approved, issued or superseded — each is refused by name', () => {
    render(<Page />);
    expect(q('strata-pack-approve-p3')).toBeNull(); // already approved
    expect(q('strata-pack-approve-p4')).toBeNull(); // already approved (pending artefact)
    expect(q('strata-pack-approve-p2')).toBeNull(); // issued — immutable
    expect(q('strata-pack-approve-p1')).toBeNull(); // superseded — terminal
  });

  it('does NOT require a locked snapshot to approve — only issuance does', () => {
    render(<Page snapshotStatus={'superseded' as never} />);
    // Issue is blocked over an unlocked snapshot...
    expect(q('strata-pack-issue-p3')).toBeNull();
    // ...but approval is not: R2/F1 chose not to impose that gate and none is invented here.
    expect(q('strata-pack-approve-p5')).not.toBeNull();
  });

  it('names the snapshot blocker instead of offering a verb that would fail', () => {
    PACKS = [H.NO_SNAPSHOT];
    render(<Page />);
    expect(q('strata-pack-approve-p7')).toBeNull();
    expect(q('strata-pack-approve-blocked-p7')?.textContent).toMatch(/no record of which numbers were approved/i);
  });

  it('sends no note when none was typed — the RPC writes its own audit wording', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-pack-approve-p5') as HTMLElement);
    await user.click(q('strata-pack-approve-confirm') as HTMLElement);
    await waitFor(() => expect(H.approveBoardPack).toHaveBeenCalledWith('p5', undefined));
  });

  it('passes a typed note through', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-pack-approve-p6') as HTMLElement);
    await user.type(screen.getByLabelText(/Approve note/i), '  reviewed at the 12 Jul sitting  ');
    await user.click(q('strata-pack-approve-confirm') as HTMLElement);
    await waitFor(() => expect(H.approveBoardPack).toHaveBeenCalledWith('p6', 'reviewed at the 12 Jul sitting'));
  });

  it('surfaces the RPC refusal VERBATIM', async () => {
    const user = userEvent.setup();
    const REFUSAL = 'approving a board pack requires the strategy_office or admin role';
    H.approveBoardPack.mockRejectedValue(new Error(REFUSAL));
    render(<Page />);
    await user.click(q('strata-pack-approve-p5') as HTMLElement);
    await user.click(q('strata-pack-approve-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-pack-error')).not.toBeNull());
    expect(q('strata-pack-error')?.textContent).toBe(REFUSAL);
  });
});

describe('R2 UI — the draft → approved → issued arc is reachable', () => {
  it('walks a pack from draft to issued through the two separate hands', async () => {
    const user = userEvent.setup();
    // Hand 1 approves the draft.
    render(<Page />);
    await user.click(q('strata-pack-approve-p5') as HTMLElement);
    await user.click(q('strata-pack-approve-confirm') as HTMLElement);
    await waitFor(() => expect(H.approveBoardPack).toHaveBeenCalledWith('p5', undefined));
    // The list is then invalidated so the row re-reads its server state rather than being guessed at.
    expect(H.invalidate).toHaveBeenCalled();
    // Hand 2 issues an approved+ready pack. SoD is the server's to enforce — never faked here.
    await user.click(q('strata-pack-issue-p3') as HTMLElement);
    await user.click(q('strata-pack-issue-confirm') as HTMLElement);
    await waitFor(() => expect(H.issueBoardPack).toHaveBeenCalledWith('p3', undefined));
  });
});

describe('R2 UI — provenance qualification is stated exactly as the view states it', () => {
  it('renders qualification_note VERBATIM', async () => {
    const user = userEvent.setup();
    H.boardPackQualification.mockResolvedValue(H.QUALIFIED);
    render(<Page />);
    await user.click(q('strata-pack-provenance-p2') as HTMLElement);
    await waitFor(() => expect(q('strata-pack-qualification-note')).not.toBeNull());
    expect(q('strata-pack-qualification-note')?.textContent).toBe(H.NOTE);
  });

  it('says the figures are official and unchanged — never that the numbers are in doubt', async () => {
    const user = userEvent.setup();
    H.boardPackQualification.mockResolvedValue(H.QUALIFIED);
    render(<Page />);
    await user.click(q('strata-pack-provenance-p2') as HTMLElement);
    await waitFor(() => expect(q('strata-pack-qualification')).not.toBeNull());
    const text = q('strata-pack-qualification')?.textContent ?? '';
    expect(text).toMatch(/official and unchanged/i);
    expect(text).not.toMatch(/unreliable|questionable|incorrect figures/i);
  });

  it('is_qualified=false is NOT rendered as verified or clean', async () => {
    const user = userEvent.setup();
    H.boardPackQualification.mockResolvedValue(H.UNQUALIFIED);
    render(<Page />);
    await user.click(q('strata-pack-provenance-p3') as HTMLElement);
    await waitFor(() => expect(q('strata-pack-no-exception')).not.toBeNull());
    const text = q('strata-pack-qualification')?.textContent ?? '';
    expect(text).toMatch(/no integrity exception is on record/i);
    // Absence of a record is not evidence — E-4/§3.7.
    expect(text).toMatch(/not a verification/i);
    expect(text).not.toMatch(/verified|clean|no issues|integrity confirmed/i);
    // And no qualification wording is fabricated when the view returned none.
    expect(q('strata-pack-qualification-note')).toBeNull();
  });
});

describe('R2 UI — supersede requires a reason before the round trip', () => {
  it('blocks Supersede with an empty reason and does NOT call the RPC', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-pack-supersede-p2') as HTMLElement);
    const confirm = q('strata-pack-supersede-confirm') as HTMLButtonElement;
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(H.supersedeBoardPack).not.toHaveBeenCalled();
  });

  it('passes the typed reason to the RPC', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-pack-supersede-p2') as HTMLElement);
    await user.type(screen.getByLabelText(/Supersede reason/i), '  restated commentary on KPI 4  ');
    await user.click(q('strata-pack-supersede-confirm') as HTMLElement);
    await waitFor(() => expect(H.supersedeBoardPack).toHaveBeenCalledWith('p2', 'restated commentary on KPI 4'));
  });

  it('ISSUE does not require a note — the RPC defaults it to NULL', async () => {
    const user = userEvent.setup();
    render(<Page />);
    await user.click(q('strata-pack-issue-p3') as HTMLElement);
    expect(q('strata-pack-issue-confirm')).not.toBeDisabled();
    await user.click(q('strata-pack-issue-confirm') as HTMLElement);
    await waitFor(() => expect(H.issueBoardPack).toHaveBeenCalledWith('p3', undefined));
  });
});

describe('R2 UI — role gate mirrors the RPC', () => {
  beforeEach(() => { ROLES = ['executive_viewer']; });

  it('offers no governed verb to a role the RPC would refuse', () => {
    render(<Page />);
    expect(q('strata-pack-approve-p5')).toBeNull();
    expect(q('strata-pack-approve-p6')).toBeNull();
    expect(q('strata-pack-issue-p3')).toBeNull();
    expect(q('strata-pack-supersede-p2')).toBeNull();
  });

  it('still shows provenance — reading a qualification is not a governed verb', () => {
    render(<Page />);
    expect(q('strata-pack-provenance-p2')).not.toBeNull();
  });

  it('admin passes the gate — strata_has_role short-circuits on admin, so the UI must too', () => {
    ROLES = ['strata_admin'];
    render(<Page />);
    expect(q('strata-pack-approve-p5')).not.toBeNull();
  });
});
