/**
 * R5 — mapping memory UI (capability 11).
 *
 * The DB half is proven by probe (06_VALIDATION_EVIDENCE.md): a stored mapping SUGGESTS but never
 * applies, a conflict is reported with its candidates named and unresolved, a retired target drops
 * out of the suggestion, the ledger refuses UPDATE/DELETE, and the role gate refuses a user without
 * data_steward|kpi_owner|strategy_office. This pins the UI's obligations:
 *   - a remembered mapping is an OFFER — it must never auto-fill the Select (suggest-not-assume);
 *   - a conflict NAMES its candidates and refuses to choose;
 *   - provenance renders only what was recorded — never "Unknown", never a placeholder date;
 *   - nothing remembered renders a dash, not "none" (NULL is "not recorded", not a value);
 *   - with no registered source the UI says memory is impossible rather than offering an action the
 *     RPC would refuse.
 *
 * tsc proves nothing here (`npx tsc --noEmit` is a no-op repo-wide). These assertions are the check.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => ({
  TEMPLATE: {
    id: 't1', name: 'KPI Actuals (Quarterly)', version: 1, status: 'approved',
    target_entity: 'kpi_actual', slug: 'kpi-actuals', description: null,
    column_schema: [
      { column: 'kpi_slug', label: 'KPI', type: 'text', required: true },
      { column: 'period', label: 'Period', type: 'text', required: true },
      { column: 'value', label: 'Actual value', type: 'number', required: true },
      { column: 'confidence', label: 'Confidence (0-1)', type: 'number', required: false },
    ],
  },
  suggestMapping: vi.fn(),
  recordMapping: vi.fn(),
}));

vi.mock('@/modules/strata/domain', () => ({
  lineageApi: { suggestMapping: H.suggestMapping, recordMapping: H.recordMapping },
  configApi: {}, scorecardApi: {}, governanceApi: {}, valueApi: {}, kpiApi: {}, strategyApi: {},
}));

// The SECTION, not the page: rendering StrataUploadWizardPage drags in StrataPageShell and would
// prove the shell rather than the governed memory. Mirrors the R3 SourcesRegistry test.
import { MapStep } from '@/modules/strata/pages/StrataUploadWizardPage';
import type { StrataMappingSuggestion } from '@/modules/strata/types';

const q = (id: string) => document.querySelector(`[data-testid="${id}"]`);

const ROWS = [
  { header: 'Net Revenue', samples: ['1250000'], match: 'DECIDE' as const, suggested: null },
  { header: 'Quarter', samples: ['Q2 FY2026'], match: 'DECIDE' as const, suggested: null },
];

const suggestion = (over: Partial<StrataMappingSuggestion>): StrataMappingSuggestion => ({
  source_key: 'Net Revenue', status: 'none', suggested_target: null, candidates: null,
  last_confirmed_by: null, last_confirmed_by_name: null, last_confirmed_at: null, times_confirmed: null,
  ...over,
});

const SUGGESTED = suggestion({
  status: 'suggested', suggested_target: 'value', candidates: ['value'],
  last_confirmed_by: 'u1', last_confirmed_by_name: 'Jahanara Khan',
  last_confirmed_at: '2026-06-30T10:00:00Z', times_confirmed: 3,
});

const CONFLICT = suggestion({
  status: 'conflict', suggested_target: null, candidates: ['confidence', 'value'],
});

function renderStep(over: Partial<React.ComponentProps<typeof MapStep>> = {}) {
  const onChange = vi.fn();
  const onRemember = vi.fn();
  render(
    <MapStep
      template={H.TEMPLATE as never}
      rows={ROWS}
      mapping={{}}
      memory={{}}
      memoryState="idle"
      sourceSelected
      onChange={onChange}
      onRemember={onRemember}
      {...over}
    />,
  );
  return { onChange, onRemember };
}

beforeEach(() => { H.suggestMapping.mockReset(); H.recordMapping.mockReset(); });

describe('R5 UI — a remembered mapping SUGGESTS, it does not apply', () => {
  it('offers the remembered target without binding it — the Select is untouched until a human acts', () => {
    const { onChange } = renderStep({ memory: { 'Net Revenue': SUGGESTED } });
    expect(q('strata-map-memory-suggested-Net Revenue')).not.toBeNull();
    expect(screen.getByText('Suggested')).toBeTruthy();
    // suggest-not-assume: rendering a suggestion must not have mapped anything.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('binds the column only when the human clicks Use this mapping', async () => {
    const user = userEvent.setup();
    const { onChange } = renderStep({ memory: { 'Net Revenue': SUGGESTED } });
    await user.click(q('strata-map-memory-use-Net Revenue') as HTMLElement);
    expect(onChange).toHaveBeenCalledWith('Net Revenue', 'value');
  });

  it('shows provenance — who last confirmed it, when, and how often', () => {
    renderStep({ memory: { 'Net Revenue': SUGGESTED } });
    const cell = q('strata-map-memory-suggested-Net Revenue');
    expect(cell?.textContent).toMatch(/last confirmed by Jahanara Khan on 30 Jun 2026/);
    expect(cell?.textContent).toMatch(/3×/);
    // The label, not the raw column name — the steward maps meanings, not identifiers.
    expect(cell?.textContent).toMatch(/Actual value/);
  });

  it('once applied, stops offering Use and reports Applied', () => {
    renderStep({ memory: { 'Net Revenue': SUGGESTED }, mapping: { 'Net Revenue': 'value' } });
    expect(screen.getByText('Applied')).toBeTruthy();
    expect(q('strata-map-memory-use-Net Revenue')).toBeNull();
  });
});

describe('R5 UI — a conflict is NAMED and refused, never resolved', () => {
  it('names every candidate and states that STRATA will not choose', () => {
    renderStep({ memory: { 'Net Revenue': CONFLICT } });
    const cell = q('strata-map-memory-conflict-Net Revenue');
    expect(cell).not.toBeNull();
    expect(screen.getByText('Conflict')).toBeTruthy();
    // Candidates named, by label, not counted away.
    expect(cell?.textContent).toMatch(/Confidence \(0-1\)/);
    expect(cell?.textContent).toMatch(/Actual value/);
    expect(cell?.textContent).toMatch(/will not choose/i);
  });

  it('offers NO Use action on a conflict — picking one would be STRATA resolving it', () => {
    renderStep({ memory: { 'Net Revenue': CONFLICT } });
    expect(q('strata-map-memory-use-Net Revenue')).toBeNull();
    expect(q('strata-map-memory-suggested-Net Revenue')).toBeNull();
  });
});

describe('R5 UI — zero assumption', () => {
  it('renders a dash when nothing is remembered — not "none", not a guess', () => {
    renderStep({ memory: {} });
    expect(q('strata-map-memory-suggested-Net Revenue')).toBeNull();
    expect(q('strata-map-memory-conflict-Net Revenue')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('status="none" is rendered as nothing, exactly like an absent suggestion', () => {
    renderStep({ memory: { 'Net Revenue': suggestion({ status: 'none' }) } });
    expect(q('strata-map-memory-suggested-Net Revenue')).toBeNull();
  });

  it('omits provenance entirely when it was not recorded — no "Unknown", no placeholder date', () => {
    renderStep({
      memory: {
        'Net Revenue': suggestion({
          status: 'suggested', suggested_target: 'value', candidates: ['value'],
          last_confirmed_by_name: null, last_confirmed_at: null, times_confirmed: 1,
        }),
      },
    });
    const cell = q('strata-map-memory-suggested-Net Revenue');
    expect(cell?.textContent).not.toMatch(/Unknown|null|undefined|Invalid Date/i);
    expect(cell?.textContent).not.toMatch(/last confirmed/i);
  });
});

describe('R5 UI — the confirm action is the only write, and is gated honestly', () => {
  it('records only on the human clicking Remember', async () => {
    const user = userEvent.setup();
    const { onRemember } = renderStep({ mapping: { 'Net Revenue': 'value' } });
    expect(onRemember).not.toHaveBeenCalled();
    await user.click(q('strata-map-memory-remember') as HTMLElement);
    expect(onRemember).toHaveBeenCalledTimes(1);
  });

  it('counts only genuinely mapped columns — unmapped ones are not evidence', () => {
    renderStep({ mapping: { 'Net Revenue': 'value', Quarter: '__unmapped__' } });
    expect(q('strata-map-memory-remember')?.textContent).toMatch(/Remember 1 mapping$/);
  });

  it('disables Remember when nothing is mapped', () => {
    renderStep({ mapping: {} });
    expect((q('strata-map-memory-remember') as HTMLButtonElement).disabled).toBe(true);
  });

  it('with no registered source it explains why memory is impossible and offers no action', () => {
    renderStep({ sourceSelected: false, mapping: { 'Net Revenue': 'value' } });
    expect(q('strata-map-memory-remember')).toBeNull();
    expect(q('strata-map-memory-no-source')?.textContent).toMatch(/not an identity/i);
  });
});
