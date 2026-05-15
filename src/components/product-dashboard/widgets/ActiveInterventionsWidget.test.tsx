/**
 * ActiveInterventionsWidget — "What has been escalated?" live escalation tracker.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders root with data-testid="active-interventions-widget"
 *   - Fetches BRs where intervention_active = true AND deleted_at IS NULL
 *   - Shows total count (data-testid="intervention-count")
 *   - Renders one row per intervention BR (data-testid="intervention-item-{id}")
 *   - Each row shows the BR title and process_step
 *   - Shows skeleton while loading (data-testid="active-interventions-skeleton")
 *   - Shows empty state (data-testid="active-interventions-empty") when none active
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ActiveInterventionsWidget } from './ActiveInterventionsWidget';
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

const INTERVENTIONS = [
  { id: 'br-1', title: 'Stalled procurement approval', process_step: 'design',     assignee_name: 'Alice' },
  { id: 'br-2', title: 'Blocked by infra dependency',  process_step: 'discovery',  assignee_name: 'Bob'   },
];

const mockQuery = (rows = INTERVENTIONS) => {
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn().mockReturnValue({ is: isNull });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValue({ select });
};

describe('ActiveInterventionsWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockQuery();
  });

  it('renders the widget root', async () => {
    render(<ActiveInterventionsWidget />, { wrapper });
    expect(await screen.findByTestId('active-interventions-widget')).toBeInTheDocument();
  });

  it('renders one row per active intervention', async () => {
    render(<ActiveInterventionsWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('intervention-item-br-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('intervention-item-br-2')).toBeInTheDocument();
  });

  it('shows the BR title in each row', async () => {
    render(<ActiveInterventionsWidget />, { wrapper });

    expect(await screen.findByText('Stalled procurement approval')).toBeInTheDocument();
    expect(screen.getByText('Blocked by infra dependency')).toBeInTheDocument();
  });

  it('shows the intervention count', async () => {
    render(<ActiveInterventionsWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('intervention-count')).toHaveTextContent('2'),
    );
  });

  it('shows skeleton while loading', () => {
    const eq = vi.fn().mockReturnValue({ is: vi.fn().mockReturnValue(new Promise(() => {})) });
    const select = vi.fn().mockReturnValue({ eq });
    (supabase.from as any).mockReturnValue({ select });

    render(<ActiveInterventionsWidget />, { wrapper });
    expect(screen.getByTestId('active-interventions-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no active interventions', async () => {
    mockQuery([]);

    render(<ActiveInterventionsWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('active-interventions-empty')).toBeInTheDocument(),
    );
  });
});
