/**
 * AtAGlanceWidget — 4-KPI summary card for the Product Dashboard.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders 4 KPI sections: "Active", "Business Cycle", "IT Cycle", "Total Cycle"
 *   - Active count = BRs where process_step ≠ funnel step AND deleted_at IS NULL
 *   - Cycle times come from useBrCycleTime (median displayed)
 *   - Each KPI has a sparkline region (data-testid="sparkline-{kpi}")
 *   - Gear icon button opens the settings panel
 *   - Shows skeleton while loading
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AtAGlanceWidget } from './AtAGlanceWidget';
import { useBrCycleTime } from '@/hooks/useBrCycleTime';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useBrCycleTime');
vi.mock('@/hooks/useWidgetSettings');
vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const mockCountQuery = (count: number) => {
  const single = vi.fn().mockResolvedValue({ count, error: null });
  const isNull = vi.fn().mockReturnValue({ single });
  const neq = vi.fn().mockReturnValue({ is: isNull });
  const select = vi.fn().mockReturnValue({ neq });
  (supabase.from as any).mockReturnValue({ select });
};

const DEFAULT_CYCLE = {
  median: 12,
  avg: 13.5,
  p90: 22,
  sample_size: 40,
  isLoading: false,
  isError: false,
  error: null,
};

describe('AtAGlanceWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    (useWidgetSettings as any).mockReturnValue({
      config: {},
      isLoading: false,
      isError: false,
      error: null,
    });
    (useBrCycleTime as any).mockReturnValue(DEFAULT_CYCLE);
    mockCountQuery(23);
  });

  it('renders 4 KPI section labels', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Business Cycle')).toBeInTheDocument();
    expect(screen.getByText('IT Cycle')).toBeInTheDocument();
    expect(screen.getByText('Total Cycle')).toBeInTheDocument();
  });

  it('displays the active BR count', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('kpi-active-value')).toHaveTextContent('23'),
    );
  });

  it('displays cycle time medians', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    await screen.findByText('Active');
    const medians = screen.getAllByTestId('kpi-cycle-median');
    expect(medians.length).toBe(3);
    medians.forEach(el => expect(el).toHaveTextContent('12'));
  });

  it('renders a sparkline region for each KPI', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    await screen.findByText('Active');
    expect(screen.getByTestId('sparkline-active')).toBeInTheDocument();
    expect(screen.getByTestId('sparkline-business-cycle')).toBeInTheDocument();
    expect(screen.getByTestId('sparkline-it-cycle')).toBeInTheDocument();
    expect(screen.getByTestId('sparkline-total-cycle')).toBeInTheDocument();
  });

  it('renders a gear icon button for settings', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    await screen.findByText('Active');
    const gear = screen.getByRole('button', { name: /settings/i });
    expect(gear).toBeInTheDocument();
  });

  it('opens settings panel when gear is clicked', async () => {
    render(<AtAGlanceWidget />, { wrapper });

    await screen.findByText('Active');
    await userEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByTestId('widget-settings-panel')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    (useBrCycleTime as any).mockReturnValue({ ...DEFAULT_CYCLE, isLoading: true });

    render(<AtAGlanceWidget />, { wrapper });

    expect(screen.getByTestId('at-a-glance-skeleton')).toBeInTheDocument();
  });
});
