/**
 * R4c/R4d — quarantine resolution + 24-hour import reversal UI (capabilities 9 & 12).
 *
 * The DB half is proven by probe (06_VALIDATION_EVIDENCE.md): the RPCs enforce the role gates, the
 * mandatory reason, SoD on self-authorization, and re-check eligibility server-side. This pins the
 * UI's obligations — the ones a page can violate while the backend stays correct:
 *   - ASK before offering the verb: no Reverse until `runReversalEligibility` says can_reverse;
 *   - render EVERY blocking_reason, not the first — fixing one and being told the next misleads twice;
 *   - collect the mandatory reason BEFORE the round trip, for both RPCs;
 *   - report `left_without_effective_value` plainly — it is not a failure and must never read as 0;
 *   - render the reversal `note` verbatim;
 *   - never offer a governed verb to a role the RPC would refuse;
 *   - say that `correct` returns the value to pending (and so reads as Missing) — don't hide it.
 *
 * tsc proves nothing here (F-11: semantic checking is suppressed repo-wide by parse errors in
 * foreign files). These assertions are the check.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const actual = (id: string, kpiId: string, value: number, note: string | null) => ({
    id, kpi_id: kpiId, period_id: 'p1', value, entry_method: 'upload' as const,
    upload_run_id: 'run-1', staging_row_id: 's1', submitted_by: 'u2', submitted_at: '2026-07-17T00:00:00Z',
    validation_status: 'quarantined' as const, validated_by: 'u1', validated_at: '2026-07-17T01:00:00Z',
    validation_note: note, confidence: null,
  });
  return {
    QUARANTINED: actual('a1', 'k1', 42, 'value is 8x the trailing mean'),
    RUN: {
      id: 'run-1', run_key: 'RUN-1', data_source_id: 'src-1', status: 'completed' as const,
      channel: 'excel', file_name: 'july.xlsx', file_hash: null, template_version: 3,
      row_count_raw: 10, row_count_valid: 9, row_count_rejected: 1,
      started_at: '2026-07-17T00:00:00Z', completed_at: '2026-07-17T02:00:00Z', initiated_by: 'u2',
    },
    ELIGIBLE: {
      run_id: 'run-1', run_type: 'import', completed_at: '2026-07-17T02:00:00Z',
      affected_actuals: 9, can_reverse: true, blocking_reasons: [] as string[],
    },
    BLOCKED: {
      run_id: 'run-1', run_type: 'import', completed_at: '2026-07-16T02:00:00Z',
      affected_actuals: 9, can_reverse: false,
      blocking_reasons: [
        'the 24-hour window has passed (completed 30:12:00 ago)',
        "this run's data is inside a LOCKED snapshot — reversing would contradict published numbers",
        'a board pack over this run\'s snapshot has been ISSUED — the board already received these numbers',
      ],
    },
    REVERSAL: {
      reversal_run_id: 'rev-1', original_run_id: 'run-1', actuals_reversed: 9,
      prior_values_restored: 4, left_without_effective_value: 5, recalculated: 9, detail: [],
      note: 'The original run and its actuals are PRESERVED and unchanged; they are marked reversed and stop counting. No offsetting, zero or negative measurement was created (D-7/E-5).',
    },
    resolveQuarantine: vi.fn(),
    runReversalEligibility: vi.fn(),
    reverseRun: vi.fn(),
    onResolved: vi.fn(),
    onReversed: vi.fn(),
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

let ROLES: string[] = ['strategy_office'];

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useStrataRoles: () => H.ok(ROLES),
  useInvalidateStrata: () => vi.fn(),
  useDataSources: () => H.ok([]),
  useUploadRuns: () => H.ok([]),
  useKpis: () => H.ok([]),
  useProfileNames: () => H.ok(new Map()),
  useRunDetail: () => H.ok(null),
  useStrataContext: () => ({ periods: [], activePeriod: null, activeCycle: null }),
}));
vi.mock('@/modules/strata/domain', () => ({
  kpiApi: { resolveQuarantine: H.resolveQuarantine },
  lineageApi: { runReversalEligibility: H.runReversalEligibility, reverseRun: H.reverseRun },
  executionApi: {}, configApi: {}, scorecardApi: {}, governanceApi: {}, valueApi: {}, strategyApi: {},
}));

// The SECTIONS, not the page: rendering the page drags in the STRATA shell and would prove the
// shell rather than the governed workflows. Mirrors how SourcesRegistry is tested (R3).
import {
  QuarantineQueueSection, RunReversalSection,
} from '@/modules/strata/pages/StrataDataPipelinePage';

const KPIS = new Map([['k1', 'Churn Rate']]);
const Quarantine = () => (
  <QuarantineQueueSection actuals={[H.QUARANTINED]} kpiNameById={KPIS} onResolved={H.onResolved} />
);
const Reversal = () => <RunReversalSection run={H.RUN as never} onReversed={H.onReversed} />;
const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);

beforeEach(() => {
  ROLES = ['strategy_office'];
  H.resolveQuarantine.mockReset();
  H.runReversalEligibility.mockReset();
  H.reverseRun.mockReset();
  H.onResolved.mockReset();
  H.onReversed.mockReset();
  H.resolveQuarantine.mockResolvedValue({
    actual_id: 'a1', validation_status: 'accepted_with_exception', counts_in_official_calculations: true,
    exception_reason: 'verified with finance', exception_authorized_by: 'u1', original_validation_failures: {},
  });
  H.runReversalEligibility.mockResolvedValue(H.ELIGIBLE);
  H.reverseRun.mockResolvedValue(H.REVERSAL);
});

describe('R4c UI — a reason is required before the round trip', () => {
  it('blocks the resolution with an empty reason and does not call the RPC', async () => {
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    const confirm = q('strata-quarantine-confirm') as HTMLButtonElement;
    expect(confirm).toBeDisabled();
    await user.click(confirm);
    expect(H.resolveQuarantine).not.toHaveBeenCalled();
  });

  it('passes the trimmed reason and verdict to the RPC', async () => {
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.type(screen.getByLabelText(/^Reason$/i), '  verified with finance  ');
    await user.click(q('strata-quarantine-confirm') as HTMLElement);
    await waitFor(() => expect(H.resolveQuarantine)
      .toHaveBeenCalledWith('a1', 'accept_with_exception', 'verified with finance', undefined));
  });
});

describe('R4c UI — `correct` mirrors the RPC exactly', () => {
  it('requires a corrected value: a reason alone does not unblock the RPC call', async () => {
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.click(q('strata-quarantine-verdict-correct') as HTMLElement);
    await user.type(screen.getByLabelText(/^Reason$/i), 'typo in the source file');
    expect(q('strata-quarantine-confirm')).toBeDisabled();
    await user.click(q('strata-quarantine-confirm') as HTMLElement);
    expect(H.resolveQuarantine).not.toHaveBeenCalled();
  });

  it('sends the corrected value once supplied', async () => {
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.click(q('strata-quarantine-verdict-correct') as HTMLElement);
    await user.type(screen.getByLabelText(/Corrected value/i), '5.25');
    await user.type(screen.getByLabelText(/^Reason$/i), 'typo in the source file');
    await user.click(q('strata-quarantine-confirm') as HTMLElement);
    await waitFor(() => expect(H.resolveQuarantine)
      .toHaveBeenCalledWith('a1', 'correct', 'typo in the source file', 5.25));
  });

  it('says a correction returns to PENDING and reads as Missing — it does not hide it', async () => {
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.click(q('strata-quarantine-verdict-correct') as HTMLElement);
    expect(q('strata-quarantine-verdict-blurb')?.textContent).toMatch(/PENDING — not validated/i);
    expect(q('strata-quarantine-verdict-blurb')?.textContent).toMatch(/Missing until someone attests/i);
  });

  it('reports the pending outcome honestly rather than as a success that counts', async () => {
    H.resolveQuarantine.mockResolvedValue({
      actual_id: 'a1', validation_status: 'pending', counts_in_official_calculations: false,
      exception_reason: null, exception_authorized_by: null, original_validation_failures: {},
    });
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.click(q('strata-quarantine-verdict-correct') as HTMLElement);
    await user.type(screen.getByLabelText(/Corrected value/i), '5');
    await user.type(screen.getByLabelText(/^Reason$/i), 'typo');
    await user.click(q('strata-quarantine-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-quarantine-outcome')).not.toBeNull());
    expect(q('strata-quarantine-outcome')?.textContent).toMatch(/does NOT count yet/i);
    expect(q('strata-quarantine-outcome')?.textContent).toMatch(/Missing until someone attests/i);
  });
});

describe('R4c UI — the server refusal surfaces verbatim', () => {
  it('renders the RPC error text without re-wording it', async () => {
    const msg = 'segregation of duties: the submitter cannot authorize an exception for their own value';
    H.resolveQuarantine.mockRejectedValue(new Error(msg));
    const user = userEvent.setup();
    render(<Quarantine />);
    await user.click(q('strata-quarantine-resolve-a1') as HTMLElement);
    await user.type(screen.getByLabelText(/^Reason$/i), 'looks fine to me');
    await user.click(q('strata-quarantine-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-quarantine-error')).not.toBeNull());
    expect(q('strata-quarantine-error')?.textContent).toBe(msg);
    // A refusal is not a success: no resolved outcome is claimed.
    expect(q('strata-quarantine-outcome')).toBeNull();
  });
});

describe('R4c UI — role gate mirrors the RPC', () => {
  it('offers no resolution to a role the RPC would refuse, and says why', () => {
    ROLES = ['data_steward']; // enough to reverse, NOT enough to resolve a quarantine
    render(<Quarantine />);
    expect(q('strata-quarantine-resolve-a1')).toBeNull();
    expect(q('strata-quarantine-role-gate')).not.toBeNull();
  });

  it('admits strata_admin — strata_has_role() admits admin unconditionally', () => {
    ROLES = ['strata_admin'];
    render(<Quarantine />);
    expect(q('strata-quarantine-resolve-a1')).not.toBeNull();
  });
});

describe('R4d UI — ask before offering the verb', () => {
  it('enables Reverse only when the eligibility RPC says can_reverse', async () => {
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reverse-run')).not.toBeNull());
    expect(H.runReversalEligibility).toHaveBeenCalledWith('run-1');
    expect(q('strata-reverse-run')).not.toBeDisabled();
  });

  it('disables Reverse when can_reverse is false', async () => {
    H.runReversalEligibility.mockResolvedValue(H.BLOCKED);
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reversal-blockers')).not.toBeNull());
    expect(q('strata-reverse-run')).toBeDisabled();
  });

  it('renders EVERY blocking reason, not just the first', async () => {
    H.runReversalEligibility.mockResolvedValue(H.BLOCKED);
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reversal-blockers')).not.toBeNull());
    const items = q('strata-reversal-blockers')!.querySelectorAll('li');
    expect(items.length).toBe(H.BLOCKED.blocking_reasons.length);
    H.BLOCKED.blocking_reasons.forEach((r) => {
      expect([...items].some((li) => li.textContent === r)).toBe(true);
    });
  });

  it('never offers reversal to a role the RPC would refuse — and does not even ask', async () => {
    ROLES = ['executive_viewer'];
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reversal-role-gate')).not.toBeNull());
    expect(q('strata-reverse-run')).toBeNull();
    expect(H.runReversalEligibility).not.toHaveBeenCalled();
  });
});

describe('R4d UI — a reason is required before the round trip', () => {
  it('blocks Reverse with an empty reason and does not call the RPC', async () => {
    const user = userEvent.setup();
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reverse-run')).not.toBeNull());
    await user.click(q('strata-reverse-run') as HTMLElement);
    expect(q('strata-reversal-confirm')).toBeDisabled();
    await user.click(q('strata-reversal-confirm') as HTMLElement);
    expect(H.reverseRun).not.toHaveBeenCalled();
  });

  it('passes the trimmed reason to the RPC', async () => {
    const user = userEvent.setup();
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reverse-run')).not.toBeNull());
    await user.click(q('strata-reverse-run') as HTMLElement);
    await user.type(screen.getByLabelText(/Reversal reason/i), '  wrong file uploaded  ');
    await user.click(q('strata-reversal-confirm') as HTMLElement);
    await waitFor(() => expect(H.reverseRun).toHaveBeenCalledWith('run-1', 'wrong file uploaded'));
  });
});

describe('R4d UI — the outcome is reported honestly', () => {
  const doReverse = async () => {
    const user = userEvent.setup();
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reverse-run')).not.toBeNull());
    await user.click(q('strata-reverse-run') as HTMLElement);
    await user.type(screen.getByLabelText(/Reversal reason/i), 'wrong file');
    await user.click(q('strata-reversal-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-reversal-note')).not.toBeNull());
  };

  it('reports left_without_effective_value — not as 0, not hidden', async () => {
    await doReverse();
    const text = q('strata-reversal-left-empty')?.textContent ?? '';
    expect(text).toMatch(/^5 left with no effective value/);
    expect(text).toMatch(/left empty rather than zeroed/i);
  });

  it('renders the server note verbatim', async () => {
    await doReverse();
    expect(q('strata-reversal-note')?.textContent).toBe(H.REVERSAL.note);
  });

  it('surfaces a server refusal verbatim and claims no success', async () => {
    const msg = 'cannot reverse this run: the 24-hour window has passed (completed 30:12:00 ago) | '
      + "this run's data is inside a LOCKED snapshot — reversing would contradict published numbers";
    H.reverseRun.mockRejectedValue(new Error(msg));
    const user = userEvent.setup();
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reverse-run')).not.toBeNull());
    await user.click(q('strata-reverse-run') as HTMLElement);
    await user.type(screen.getByLabelText(/Reversal reason/i), 'wrong file');
    await user.click(q('strata-reversal-confirm') as HTMLElement);
    await waitFor(() => expect(q('strata-reversal-error')).not.toBeNull());
    expect(q('strata-reversal-error')?.textContent).toBe(msg);
    expect(q('strata-reversal-note')).toBeNull();
    expect(H.onReversed).not.toHaveBeenCalled();
  });

  it('renders a NULL affected_actuals as a dash — array_length() is NULL for an empty set, not 0', async () => {
    H.runReversalEligibility.mockResolvedValue({ ...H.ELIGIBLE, affected_actuals: null });
    render(<Reversal />);
    await waitFor(() => expect(q('strata-reversal-affected')).not.toBeNull());
    expect(q('strata-reversal-affected')?.textContent).toMatch(/would reverse: —/);
  });
});
