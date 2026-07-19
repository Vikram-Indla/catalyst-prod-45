/**
 * KR Observation form — persistent-label regression (CAT-STRATA-THEMEOKR-20260719-001).
 *
 * Guards the ADS field-chrome fix: every control carries a persistent VISIBLE label
 * (not a placeholder standing in for one), placeholders provide EXAMPLES only, the
 * required Actual value is marked, and no legacy placeholder-as-label text survives.
 * Drives the real KrObservations against mocked server hooks.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const { krObservations, submitKrObservation } = vi.hoisted(() => ({
  krObservations: vi.fn(), submitKrObservation: vi.fn(),
}));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, kpiApi: { ...actual.kpiApi,
    krObservations: (krId: string) => krObservations(krId),
    submitKrObservation } };
});
vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useInvalidateStrata: () => vi.fn(),
  useStrataContext: () => ({ cycles: [], periods: [{ id: 'p1', name: 'Q2 FY26' }], activeCycle: null, activePeriod: null }),
  useProfileNames: () => q(new Map()),
}));

// KrObservations reads useQuery directly; provide a client-free render by mocking react-query's useQuery.
vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQuery: () => ({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() }),
}));

import { KrObservations } from '@/modules/strata/components/shared';

const renderForm = () =>
  render(<KrObservations krId="kr-1" krName="Adoption rate" canValidate embedded onClose={() => {}} />);

beforeEach(() => {
  krObservations.mockReset().mockReturnValue([]);
  submitKrObservation.mockReset().mockResolvedValue(undefined);
});

describe('KR Observation form — persistent visible labels', () => {
  const LABELS = ['As-of date', 'Actual value', 'Reporting period', 'Year-end forecast', 'Confidence', 'Commentary'];

  it.each(LABELS)('renders a persistent visible "%s" label', (label) => {
    renderForm();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('marks Actual value as required', () => {
    renderForm();
    const marker = screen.getByText('Actual value').parentElement;
    expect(within(marker as HTMLElement).getByText('*')).toBeTruthy();
  });

  it('placeholders provide examples, never stand in as labels', () => {
    renderForm();
    // legacy placeholder-as-label strings must be gone
    for (const gone of ['Value', 'Forecast (optional)', 'Commentary (optional)', 'Reporting period…']) {
      expect(screen.queryByPlaceholderText(gone)).toBeNull();
    }
    // numeric fields show example values
    expect(screen.getByPlaceholderText('e.g. 60')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g. 75')).toBeTruthy();
  });
});
