/**
 * AdminAccessPage — /admin/access
 *
 * Contract:
 *   - Renders 3 tabs: People, Invitations, Email Log
 *   - People tab is selected by default
 *   - Invitations tab panel contains an "Invite User" button
 *   - Wrapped in AdminGuard
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

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

import AdminAccessPage from '@/pages/admin/AdminAccessPage';

function renderPage() {
  return render(<AdminAccessPage />);
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

  it('switching to Invitations tab reveals the Invite User button', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /invitations/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite user/i })).toBeInTheDocument();
    });
  });
});
