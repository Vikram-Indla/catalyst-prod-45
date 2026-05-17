/**
 * StageOverviewWidget — "Where is everything sitting?" stage cards.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders one card per active demand process step (data-driven, never hardcoded)
 *   - Each card shows the stage label and the count of BRs in that stage
 *   - Each card has a sparkline region (12-week trend placeholder)
 *   - Clicking a card fires onStageClick(stageValue)
 *   - Shows skeleton while loading
 *   - Empty state when no stages configured
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { StageOverviewWidget } from './StageOverviewWidget';
import { useActiveDemandProcessSteps } from '@/hooks/useDemandProcessSteps';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useDemandProcessSteps');
vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('./StageDrillDownDrawer', () => ({
  StageDrillDownDrawer: ({ stageLabel, onClose }: { stageValue: string | null; stageLabel: string; onClose: () => void }) =>
    stageLabel ? <div data-testid="stage-drilldown-drawer-mock">{stageLabel}<button onClick={onClose}>Close</button></div> : null,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const STEPS = [
  { id: '1', value: 'funnel',    label: 'Funnel',    sort_order: 1,  is_active: true, color: null, created_at: '', updated_at: '' },
  { id: '2', value: 'discovery', label: 'Discovery', sort_order: 2,  is_active: true, color: null, created_at: '', updated_at: '' },
  { id: '3', value: 'design',    label: 'Design',    sort_order: 3,  is_active: true, color: null, created_at: '', updated_at: '' },
  { id: '4', value: 'done',      label: 'Done',      sort_order: 11, is_active: true, color: null, created_at: '', updated_at: '' },
];

/** Mock a single grouped-count query that returns counts per stage. */
const mockCountsQuery = (rows: Array<{ process_step: string; count: number }>) => {
  // Chain: .from('business_requests').select('process_step, count:id.count()').is('deleted_at', null)
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ is: isNull });
  (supabase.from as any).mockReturnValue({ select });
};

describe('StageOverviewWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: STEPS, isLoading: false });
    mockCountsQuery([
      { process_step: 'funnel',    count: 12 },
      { process_step: 'discovery', count: 5  },
      { process_step: 'design',    count: 3  },
      { process_step: 'done',      count: 20 },
    ]);
  });

  it('renders one card per active stage', async () => {
    render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    const cards = await screen.findAllByTestId(/^stage-card-/);
    expect(cards).toHaveLength(STEPS.length);
  });

  it('shows each stage label', async () => {
    render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    expect(await screen.findByText('Funnel')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows the BR count for each stage', async () => {
    render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    await screen.findByText('Funnel');
    expect(screen.getByTestId('stage-count-funnel')).toHaveTextContent('12');
    expect(screen.getByTestId('stage-count-discovery')).toHaveTextContent('5');
    expect(screen.getByTestId('stage-count-design')).toHaveTextContent('3');
    expect(screen.getByTestId('stage-count-done')).toHaveTextContent('20');
  });

  it('renders a sparkline per stage card', async () => {
    render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    await screen.findByText('Funnel');
    STEPS.forEach(s => {
      expect(screen.getByTestId(`stage-sparkline-${s.value}`)).toBeInTheDocument();
    });
  });

  it('calls onStageClick with the stage value when a card is clicked', async () => {
    const onStageClick = vi.fn();
    render(<StageOverviewWidget onStageClick={onStageClick} />, { wrapper });

    await screen.findByText('Discovery');
    await userEvent.click(screen.getByTestId('stage-card-discovery'));
    expect(onStageClick).toHaveBeenCalledWith('discovery');
  });

  it('shows skeleton while stages are loading', () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: undefined, isLoading: true });

    render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    expect(screen.getByTestId('stage-overview-skeleton')).toBeInTheDocument();
  });

  it('renders nothing when no stages are configured', async () => {
    (useActiveDemandProcessSteps as any).mockReturnValue({ data: [], isLoading: false });

    const { container } = render(<StageOverviewWidget onStageClick={vi.fn()} />, { wrapper });

    await new Promise(r => setTimeout(r, 50));
    expect(container.firstChild).toBeNull();
  });
});
