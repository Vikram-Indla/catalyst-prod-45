/**
 * R2 — reviews scheduling UI (capability 10), wiring `strata_reviews` into StrataReviewsPage.
 *
 * The DB half ships and is tested (migration 20260717130000). This pins the UI's obligations,
 * each of which is a way the surface could lie if it were written carelessly:
 *   - a `migrated` row's NULL chair/date means NOT RECORDED — rendering '—' would state that the
 *     meeting had no chair, about a meeting that really happened;
 *   - `is_ready` is snapshot-locked ONLY: ANDing it with `pack_attached` would invent a gate the
 *     database explicitly rejected (a review may convene on locked numbers before its pack exists);
 *   - every `blocking_reason` is named, so the surface says WHY rather than showing a bare status;
 *   - a CLOSED review is refused by the RPC, so no edit verb is offered on one;
 *   - cadence is NOT sent unless chosen — a client-side default would turn the server's default
 *     into a value the user never picked;
 *   - no governed verb is offered to a role the RPC would refuse.
 *
 * tsc proves nothing here (semantic checking is suppressed repo-wide by parse errors in foreign
 * files). These assertions are the check.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const H = vi.hoisted(() => {
  const base = {
    organization_id: null, scope: null, cycle_id: null, period_id: null,
    board_pack_id: null, agenda: null, created_by: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  };
  return {
    // A normal scheduled review: no snapshot yet — that is the point of scheduling.
    SCHEDULED: {
      ...base, id: 'r1', review_key: 'REV-3', slug: 'q3-exec', name: 'Q3 Executive Review',
      review_type: 'executive', cadence: 'quarterly', status: 'scheduled', origin: 'scheduled',
      snapshot_id: null, scheduled_for: '2026-08-01T09:00:00Z', chair_id: 'u1', note: null,
    },
    // D-6 backfill row: reconstructed from a locked snapshot; meeting details never recorded.
    MIGRATED: {
      ...base, id: 'r2', review_key: 'REV-1', slug: 'q1-snap', name: 'Q1 Board Snapshot',
      review_type: 'executive', cadence: 'quarterly', status: 'closed', origin: 'migrated',
      snapshot_id: 's-1', scheduled_for: null, chair_id: null,
      note: 'Migrated from locked snapshot SNAP-1 (2026-04-01). HISTORICAL RECORD, reconstructed from the snapshot alone: chair, participants, agenda and the meeting date were never recorded and are deliberately NULL — absent, not empty.',
    },
    // Locked snapshot, no pack: READY by the view's own verdict.
    READY_NO_PACK: {
      ...base, id: 'r3', review_key: 'REV-4', slug: 'ops-monthly', name: 'Ops Monthly',
      review_type: 'departmental', cadence: 'monthly', status: 'in_progress', origin: 'scheduled',
      snapshot_id: 's-2', scheduled_for: '2026-07-20T09:00:00Z', chair_id: null, note: null,
    },
    READINESS: [
      {
        review_id: 'r1', review_key: 'REV-3', status: 'scheduled',
        snapshot_locked: false, pack_attached: false, is_ready: false,
        blocking_reasons: ['no snapshot attached', 'no board pack attached'],
      },
      {
        review_id: 'r3', review_key: 'REV-4', status: 'in_progress',
        snapshot_locked: true, pack_attached: false, is_ready: true,
        blocking_reasons: ['no board pack attached'],
      },
    ],
    reviews: vi.fn(),
    reviewReadiness: vi.fn(),
    updateReview: vi.fn(async () => undefined),
    scheduleReview: vi.fn(async () => 'new-id'),
    invalidate: vi.fn(),
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

let ROLES: string[] = ['strategy_office'];

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useStrataRoles: () => H.ok(ROLES),
  useProfileNames: () => H.ok(new Map([['u1', { name: 'Dana Reyes' }]])),
  useInvalidateStrata: () => H.invalidate,
  useStrataContext: () => ({
    cycles: [], periods: [{ id: 'p1', cycle_id: 'c1', name: 'Q3 2026', period_type: 'quarter', starts_on: '2026-07-01', ends_on: '2026-09-30', close_status: 'open' }],
    activeCycle: null, activePeriod: null,
  }),
  useSnapshots: () => H.ok([
    { id: 's-2', snapshot_key: 'SNAP-2', name: 'July close', status: 'locked' },
    { id: 's-3', snapshot_key: 'SNAP-3', name: 'August draft', status: 'draft' },
  ]),
  useSnapshotItems: () => H.ok([]),
  useDecisions: () => H.ok([]),
  useActions: () => H.ok([]),
  useBoardPacks: () => H.ok([]),
  useAllBoardPacks: () => H.ok([]),
  useKpis: () => H.ok([]),
  useStrataAudit: () => H.ok([]),
  useNeedsAttention: () => H.ok([]),
}));
vi.mock('@/modules/strata/domain', () => ({
  governanceApi: {
    reviews: H.reviews,
    reviewReadiness: H.reviewReadiness,
    updateReview: H.updateReview,
    scheduleReview: H.scheduleReview,
  },
  kpiApi: {}, configApi: {}, scorecardApi: {}, valueApi: {}, strategyApi: {}, lineageApi: {},
}));
// The pack generators pull jsPDF/pptxgenjs at module load; the section under test never uses them.
vi.mock('@/modules/strata/lib/boardPack', () => ({
  generateBoardPackPdf: vi.fn(), generateBoardPackPptx: vi.fn(),
}));

// The SECTION, not the page: rendering the page drags in the STRATA shell and would prove the
// shell rather than the reviews wiring. Mirrors SourcesRegistry (R3).
import { ScheduledReviewsSection, scheduleInputFromForm } from '@/modules/strata/pages/StrataReviewsPage';

const Page = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}><ScheduledReviewsSection /></QueryClientProvider>;
};
const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);
const renderReviews = async () => {
  render(<Page />);
  await waitFor(() => expect(q('strata-review-readiness-r1')).not.toBeNull());
};

beforeEach(() => {
  ROLES = ['strategy_office'];
  H.reviews.mockResolvedValue([H.SCHEDULED, H.MIGRATED, H.READY_NO_PACK]);
  H.reviewReadiness.mockResolvedValue(H.READINESS);
  H.updateReview.mockClear();
  H.scheduleReview.mockClear();
});

describe('R2 UI — a migrated review says its details were NOT RECORDED', () => {
  it('renders "Not recorded" for chair and date — never a bare dash, which would read as "none"', async () => {
    await renderReviews();
    expect(q('strata-review-chair-r2')?.textContent).toBe('Not recorded');
    expect(q('strata-review-scheduled-r2')?.textContent).toBe('Not recorded');
    expect(q('strata-review-chair-r2')?.textContent).not.toBe('—');
    expect(q('strata-review-chair-r2')?.textContent).not.toMatch(/none|no chair/i);
  });

  it('marks the row as migrated and states that the meeting details were never recorded', async () => {
    await renderReviews();
    expect(q('strata-review-migrated-r2')).not.toBeNull();
    expect(q('strata-review-migrated-note-r2')?.textContent).toMatch(/never recorded/i);
    // The server's own note, verbatim — it names which fields are migration assumptions.
    expect(q('strata-review-note-r2')?.textContent).toBe(H.MIGRATED.note);
  });

  it('does NOT mark a genuinely scheduled review as migrated, and dashes its unrecorded chair', async () => {
    await renderReviews();
    expect(q('strata-review-migrated-r1')).toBeNull();
    // r3 was never migrated: a null chair here is simply unset, so '—' is the honest render.
    expect(q('strata-review-chair-r3')?.textContent).toBe('—');
  });
});

describe('R2 UI — readiness is the locked snapshot alone', () => {
  it('a locked snapshot with NO pack is Ready — pack_attached is never ANDed into readiness', async () => {
    await renderReviews();
    const cell = q('strata-review-readiness-r3');
    expect(cell?.textContent).toMatch(/Ready to convene/);
    expect(cell?.textContent).not.toMatch(/Not ready/);
    // …and the missing pack is still reported, separately.
    expect(cell?.textContent).toMatch(/No pack attached/);
  });

  it('an unlocked snapshot is Not ready', async () => {
    await renderReviews();
    expect(q('strata-review-readiness-r1')?.textContent).toMatch(/Not ready/);
  });

  it('renders EVERY blocking reason the view returned — including on a Ready row', async () => {
    await renderReviews();
    const r1 = q('strata-review-blockers-r1');
    expect(r1?.querySelectorAll('li')).toHaveLength(2);
    expect(r1?.textContent).toContain('no snapshot attached');
    expect(r1?.textContent).toContain('no board pack attached');
    // Ready AND still carrying a reason — the two are independent facts.
    const r3 = q('strata-review-blockers-r3');
    expect(r3?.querySelectorAll('li')).toHaveLength(1);
    expect(r3?.textContent).toContain('no board pack attached');
  });
});

describe('R2 UI — a closed review is not editable', () => {
  it('offers no transition on a closed review and says why', async () => {
    await renderReviews();
    expect(q('strata-review-terminal-r2')?.textContent).toMatch(/cannot be edited/i);
    expect(q('strata-review-in_progress-r2')).toBeNull();
    expect(q('strata-review-closed-r2-btn')).toBeNull();
    expect(q('strata-review-cancelled-r2')).toBeNull();
  });

  it('a scheduled review DOES offer the transitions the RPC permits', async () => {
    await renderReviews();
    // RD-DEF-002 transition matrix: scheduled → in progress | cancelled. Close is NOT offered
    // from scheduled — a review must convene before it can record a closure.
    expect(q('strata-review-in_progress-r1')).not.toBeNull();
    expect(q('strata-review-closed-r1')).toBeNull();
    expect(q('strata-review-cancelled-r1')).not.toBeNull();
  });

  it('offers no snapshot attachment on a closed review — the RPC refuses every edit', async () => {
    await renderReviews();
    expect(q('strata-review-attach-r2')).toBeNull();
    expect(q('strata-review-attach-r1')).not.toBeNull();
  });
});

describe('R2 UI — server refusals surface verbatim', () => {
  it('renders the RPC refusal exactly as the database worded it', async () => {
    // RD-DEF-002: Start is now readiness-gated server-side; the server names every gap and
    // the surface renders that refusal verbatim (driven here via Start, the verb a scheduled
    // review actually offers).
    const refusal = 'this review is not ready to move to in_progress: no snapshot attached; no chair recorded; no accountable owner recorded; no participants recorded; agenda is empty';
    H.updateReview.mockRejectedValueOnce(new Error(refusal));
    const user = userEvent.setup();
    await renderReviews();
    await user.click(q('strata-review-in_progress-r1') as HTMLElement);
    await user.click(q('strata-review-status-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-review-error')).not.toBeNull());
    expect(q('strata-review-error')?.textContent).toBe(refusal);
  });

  it('Export CSV emits a real download: DOM-attached anchor click, .csv filename, filtered artifact content (RD-DEF-006)', async () => {
    // jsdom has no download manager, so this proves everything up to the browser boundary:
    // the anchor is IN the document when clicked (detached-anchor clicks are what download
    // interceptors drop), carries a dated .csv filename, and its Blob holds exactly the
    // filtered rows. The final OS-level download event remains Codex's visible check.
    const clicks: Array<{ download: string; connected: boolean }> = [];
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push({ download: this.download, connected: this.isConnected });
    };
    const blobs: Blob[] = [];
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = ((b: Blob) => { blobs.push(b); return 'blob:mock'; }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    try {
      const user = userEvent.setup();
      await renderReviews();
      // Filter down to the scheduled review only, then export.
      await user.type(document.querySelector('[data-testid="strata-review-search"]') as HTMLElement, 'Q3 Executive');
      await waitFor(() => expect(q('strata-review-readiness-r3')).toBeNull());
      await user.click(q('strata-review-export') as HTMLElement);

      expect(clicks).toHaveLength(1);
      expect(clicks[0].connected).toBe(true);                       // attached to the DOM at click time
      expect(clicks[0].download).toMatch(/^strata-reviews-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(blobs).toHaveLength(1);
      expect(blobs[0].type).toContain('text/csv');
      // jsdom's Blob lacks .text() and doesn't interop with Node's Response — FileReader is
      // jsdom's own supported read path.
      const text = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsText(blobs[0]);
      });
      expect(text.startsWith('review_key,id,name,type,cadence,status,')).toBe(true);
      expect(text).toContain('REV-3');                              // the filtered row
      expect(text).not.toContain('REV-1');                          // excluded rows absent
      expect(text).not.toContain('REV-4');
      expect(text.trim().split('\n')).toHaveLength(2);              // header + exactly one record
    } finally {
      HTMLAnchorElement.prototype.click = origClick;
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('passes the chosen status to the RPC, with no note when none was typed', async () => {
    const user = userEvent.setup();
    await renderReviews();
    await user.click(q('strata-review-in_progress-r1') as HTMLElement);
    await user.click(q('strata-review-status-confirm') as HTMLElement);
    await waitFor(() => expect(H.updateReview).toHaveBeenCalledWith('r1', { status: 'in_progress', note: null }));
  });
});

describe('R2 UI — role gate mirrors the RPC', () => {
  beforeEach(() => { ROLES = ['executive_viewer']; });

  it('offers no governed verb to a role the RPC would refuse', async () => {
    await renderReviews();
    expect(q('strata-review-schedule')).toBeNull();
    expect(q('strata-review-in_progress-r1')).toBeNull();
    expect(q('strata-review-cancelled-r1')).toBeNull();
    expect(screen.getByText('Read-only for your role')).toBeTruthy();
  });

  it('still shows readiness and its reasons — reading is not a governed verb', async () => {
    await renderReviews();
    expect(q('strata-review-blockers-r1')?.textContent).toContain('no snapshot attached');
  });
});

describe('R2 — cadence is only ever sent when the user chose one', () => {
  const PERIODS = [{ id: 'p1', cycle_id: 'c1', name: 'Q3 2026', period_type: 'quarter', starts_on: '2026-07-01', ends_on: '2026-09-30', close_status: 'open' as const }];

  it('OMITS cadence entirely when unchosen — the server applies its own default', () => {
    const input = scheduleInputFromForm({ name: 'Q4 Exec', review_type: 'executive' }, PERIODS);
    expect(input).not.toHaveProperty('cadence');
    expect(input.name).toBe('Q4 Exec');
    expect(input.reviewType).toBe('executive');
  });

  it('never substitutes the documented default for a departmental review either', () => {
    const input = scheduleInputFromForm({ name: 'Ops', review_type: 'departmental' }, PERIODS);
    expect(input).not.toHaveProperty('cadence');
  });

  it('sends cadence when the user genuinely picked one', () => {
    const input = scheduleInputFromForm({ name: 'Ops', review_type: 'departmental', cadence: 'ad_hoc' }, PERIODS);
    expect(input.cadence).toBe('ad_hoc');
  });

  it('treats an empty cadence string as unchosen, not as a value', () => {
    expect(scheduleInputFromForm({ name: 'Ops', review_type: 'departmental', cadence: '' }, PERIODS))
      .not.toHaveProperty('cadence');
  });

  it('derives cycle from the chosen period and nulls what was not filled in', () => {
    const input = scheduleInputFromForm({ name: 'Ops', review_type: 'departmental', period_id: 'p1' }, PERIODS);
    expect(input.periodId).toBe('p1');
    expect(input.cycleId).toBe('c1');
    // Zero-assumption: nothing invented for the fields the user left alone.
    expect(input.scheduledFor).toBeNull();
    expect(input.chairId).toBeNull();
  });

  it('assumes no period when none was chosen', () => {
    const input = scheduleInputFromForm({ name: 'Ops', review_type: 'departmental' }, PERIODS);
    expect(input.periodId).toBeNull();
    expect(input.cycleId).toBeNull();
  });
});
