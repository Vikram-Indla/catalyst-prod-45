/**
 * NeedsAttentionWidget — "What needs a decision?" surfacing blocked/stalled/overdue BRs.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders root with data-testid="needs-attention-widget"
 *   - Fetches BRs from business_requests (deleted_at IS NULL)
 *   - Classifies each BR client-side: stalled (> 14 days in stage), overdue (> 21 days)
 *   - Shows total attention-item count (data-testid="attention-count")
 *   - Renders one row per attention BR (data-testid="attention-item-{id}")
 *   - Each row shows the BR title
 *   - Shows skeleton while loading (data-testid="needs-attention-skeleton")
 *   - Shows empty state (data-testid="needs-attention-empty") when no BRs qualify
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NeedsAttentionWidget } from './NeedsAttentionWidget';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

const ALL_BRS = [
  { id: 'br-1', title: 'Stalled initiative',  process_step: 'discovery', entered_step_at: daysAgo(20), assignee_name: 'Alice' },
  { id: 'br-2', title: 'Overdue initiative',   process_step: 'design',    entered_step_at: daysAgo(30), assignee_name: 'Bob'   },
  { id: 'br-3', title: 'On-track initiative',  process_step: 'funnel',    entered_step_at: daysAgo(5),  assignee_name: 'Carol' },
];

const mockBrsQuery = (rows = ALL_BRS) => {
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ is: isNull });
  (supabase.from as any).mockReturnValue({ select });
};

describe('NeedsAttentionWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockBrsQuery();
  });

  it('renders the widget root', async () => {
    render(<NeedsAttentionWidget />, { wrapper });
    expect(await screen.findByTestId('needs-attention-widget')).toBeInTheDocument();
  });

  it('shows only BRs that qualify (stalled > 14d or overdue > 21d)', async () => {
    render(<NeedsAttentionWidget />, { wrapper });

    // br-1 (20d) and br-2 (30d) qualify; br-3 (5d) does not
    await waitFor(() =>
      expect(screen.getByTestId('attention-item-br-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('attention-item-br-2')).toBeInTheDocument();
    expect(screen.queryByTestId('attention-item-br-3')).toBeNull();
  });

  it('shows the BR title in each attention row', async () => {
    render(<NeedsAttentionWidget />, { wrapper });

    expect(await screen.findByText('Stalled initiative')).toBeInTheDocument();
    expect(screen.getByText('Overdue initiative')).toBeInTheDocument();
  });

  it('shows the total attention count badge', async () => {
    render(<NeedsAttentionWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('attention-count')).toHaveTextContent('2'),
    );
  });

  it('shows skeleton while data is loading', () => {
    const isNull = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const select = vi.fn().mockReturnValue({ is: isNull });
    (supabase.from as any).mockReturnValue({ select });

    render(<NeedsAttentionWidget />, { wrapper });
    expect(screen.getByTestId('needs-attention-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no BRs qualify', async () => {
    mockBrsQuery([{ id: 'br-x', title: 'Fresh', process_step: 'funnel', entered_step_at: daysAgo(2), assignee_name: null }]);

    render(<NeedsAttentionWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('needs-attention-empty')).toBeInTheDocument(),
    );
  });
});
