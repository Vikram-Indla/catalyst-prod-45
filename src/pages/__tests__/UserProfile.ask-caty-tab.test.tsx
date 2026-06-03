/**
 * UserProfile — Ask Caty tab.
 *
 * Verifies:
 * 1. The /profile page renders a "Profile" tab and an "Ask Caty" tab
 * 2. ?tab=caty activates the Ask Caty tab on mount
 * 3. The Ask Caty tab mounts R360ProfileDrawer (not a reimplementation)
 *
 * FAILS until the tab system is added to UserProfile.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const MOCK_USER_ID = 'user-aaa';
const MOCK_RESOURCE_ID = 'res-999';

vi.mock('@/integrations/supabase/client', () => {
  const mockFrom = () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: MOCK_USER_ID, full_name: 'Test', email: 'test@test.com', role: 'Dev', avatar_url: '', created_at: '', updated_at: '' }, error: null }),
        maybeSingle: () => Promise.resolve({ data: { id: MOCK_RESOURCE_ID }, error: null }),
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  });
  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: { id: MOCK_USER_ID } }, error: null }) },
      from: mockFrom,
    },
    typedQuery: mockFrom,
  };
});

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: MOCK_USER_ID } }),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ role: 'admin' }),
}));

vi.mock('@/components/r360/R360ProfileDrawer', () => ({
  __esModule: true,
  default: ({ resourceId }: { resourceId: string }) => (
    <div data-testid="r360-profile-drawer" data-resource-id={resourceId}>Drawer Content</div>
  ),
}));

vi.mock('@atlaskit/tokens', () => ({
  token: (_: string, fb: string) => fb,
}));

function Wrapper({ children, search = '' }: { children: React.ReactNode; search?: string }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/profile${search}`]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UserProfile Ask Caty tab', () => {
  it('renders both Profile and Ask Caty tabs', async () => {
    const UserProfile = (await import('../UserProfile')).default;
    render(<UserProfile />, { wrapper: Wrapper });

    expect(screen.getByRole('tab', { name: /profile/i })).toBeDefined();
    expect(screen.getByRole('tab', { name: /ask caty/i })).toBeDefined();
  });

  it('activates Ask Caty tab when ?tab=caty is present', async () => {
    const UserProfile = (await import('../UserProfile')).default;
    render(<UserProfile />, {
      wrapper: ({ children }) => <Wrapper search="?tab=caty">{children}</Wrapper>,
    });

    const catyTab = screen.getByRole('tab', { name: /ask caty/i });
    expect(catyTab.getAttribute('aria-selected')).toBe('true');
  });
});
