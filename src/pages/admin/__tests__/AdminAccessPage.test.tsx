/**
 * AdminAccessPage — /admin/access
 *
 * Contract:
 *   - Renders 3 tabs: People, Invitations, Email Log
 *   - People tab is selected by default
 *   - People tab panel contains a "Create access" button (formerly "Invite User")
 *   - Wrapped in AdminGuard
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/admin/AdminGuard', () => ({
  AdminGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  };
});

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-user', email: 'admin@test.com', user_metadata: { full_name: 'Admin' } },
    session: null,
  }),
}));

vi.mock('@atlaskit/platform-feature-flags', () => ({
  fg: () => false,
}));

import AdminAccessPage from '@/pages/admin/AdminAccessPage';

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

function renderPage() {
  return render(<AdminAccessPage />, { wrapper });
}

describe('AdminAccessPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders People, Invitations, and Email Log tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /people/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /invitations/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /email log/i })).toBeInTheDocument();
  });

  it('shows People tab as selected by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /people/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('People tab contains the Create access button', async () => {
    renderPage();
    // "Create access" (formerly "Invite User") is in PeopleTab (the default tab), not the Invitations tab
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create access/i })).toBeInTheDocument();
    });
  });
});
