/**
 * WhoCarriesWhatWidget — "Who owns what?" workload distribution by assignee.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders root with data-testid="who-carries-what-widget"
 *   - Fetches active BRs (deleted_at IS NULL) and groups by assignee client-side
 *   - Renders one row per unique assignee (data-testid="workload-row-{assignee_id}")
 *   - Each row shows the assignee name and their BR count
 *   - Shows skeleton while loading (data-testid="workload-skeleton")
 *   - Shows empty state (data-testid="workload-empty") when no BRs
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { WhoCarriesWhatWidget } from './WhoCarriesWhatWidget';
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

const BRS = [
  { id: 'br-1', assignee_id: 'u1', assignee_name: 'Alice' },
  { id: 'br-2', assignee_id: 'u1', assignee_name: 'Alice' },
  { id: 'br-3', assignee_id: 'u2', assignee_name: 'Bob'   },
];

const mockQuery = (rows = BRS) => {
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ is: isNull });
  (supabase.from as any).mockReturnValue({ select });
};

describe('WhoCarriesWhatWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockQuery();
  });

  it('renders the widget root', async () => {
    render(<WhoCarriesWhatWidget />, { wrapper });
    expect(await screen.findByTestId('who-carries-what-widget')).toBeInTheDocument();
  });

  it('renders one row per unique assignee', async () => {
    render(<WhoCarriesWhatWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('workload-row-u1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('workload-row-u2')).toBeInTheDocument();
  });

  it('shows assignee name in each row', async () => {
    render(<WhoCarriesWhatWidget />, { wrapper });

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows the BR count per assignee', async () => {
    render(<WhoCarriesWhatWidget />, { wrapper });

    await waitFor(() => {
      // Alice has 2 BRs, Bob has 1
      expect(screen.getByTestId('workload-row-u1')).toHaveTextContent('2');
      expect(screen.getByTestId('workload-row-u2')).toHaveTextContent('1');
    });
  });

  it('shows skeleton while loading', () => {
    const isNull = vi.fn().mockReturnValue(new Promise(() => {}));
    const select = vi.fn().mockReturnValue({ is: isNull });
    (supabase.from as any).mockReturnValue({ select });

    render(<WhoCarriesWhatWidget />, { wrapper });
    expect(screen.getByTestId('workload-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no BRs exist', async () => {
    mockQuery([]);

    render(<WhoCarriesWhatWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('workload-empty')).toBeInTheDocument(),
    );
  });
});
