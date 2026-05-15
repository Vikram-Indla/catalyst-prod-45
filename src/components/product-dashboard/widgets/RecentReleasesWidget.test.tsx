/**
 * RecentReleasesWidget — "What shipped recently?" list of landed BRs.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Renders root with data-testid="recent-releases-widget"
 *   - Fetches BRs that have reached the landing step (is_landing = true step)
 *     by querying demand_process_steps for the landing step value, then
 *     querying business_requests WHERE process_step = landingValue AND deleted_at IS NULL
 *   - Renders one row per recent BR (data-testid="release-item-{id}")
 *   - Each row shows the BR title and completed date
 *   - Shows skeleton while loading (data-testid="recent-releases-skeleton")
 *   - Shows empty state (data-testid="recent-releases-empty") when none
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RecentReleasesWidget } from './RecentReleasesWidget';
import { useAuth } from '@/hooks/useAuth';
import { useBrLandingStep } from '@/hooks/useBrLandingStep';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/useBrLandingStep');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const RELEASES = [
  { id: 'br-1', title: 'New reporting module',    updated_at: '2026-05-01T00:00:00Z' },
  { id: 'br-2', title: 'Onboarding revamp',       updated_at: '2026-04-28T00:00:00Z' },
];

const mockBrsQuery = (rows = RELEASES) => {
  const isNull = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq = vi.fn().mockReturnValue({ is: isNull });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValue({ select });
};

describe('RecentReleasesWidget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    (useBrLandingStep as any).mockReturnValue({
      landingStep: { value: 'done', label: 'Done' },
      isLoading: false,
    });
    mockBrsQuery();
  });

  it('renders the widget root', async () => {
    render(<RecentReleasesWidget />, { wrapper });
    expect(await screen.findByTestId('recent-releases-widget')).toBeInTheDocument();
  });

  it('renders one row per released BR', async () => {
    render(<RecentReleasesWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('release-item-br-1')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('release-item-br-2')).toBeInTheDocument();
  });

  it('shows the BR title in each row', async () => {
    render(<RecentReleasesWidget />, { wrapper });

    expect(await screen.findByText('New reporting module')).toBeInTheDocument();
    expect(screen.getByText('Onboarding revamp')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    (useBrLandingStep as any).mockReturnValue({ landingStep: null, isLoading: true });

    render(<RecentReleasesWidget />, { wrapper });
    expect(screen.getByTestId('recent-releases-skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no released BRs', async () => {
    mockBrsQuery([]);

    render(<RecentReleasesWidget />, { wrapper });

    await waitFor(() =>
      expect(screen.getByTestId('recent-releases-empty')).toBeInTheDocument(),
    );
  });
});
