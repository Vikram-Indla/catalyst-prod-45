/**
 * ProfileMenu — R360 persona-conditional menu item.
 *
 * Contract (this test is the spec — implementation follows):
 *   - canAccessEnterprise=true           → "Resource 360™"   → /admin/resources
 *   - canAccessEnterprise=false, lead    → "My Team"          → /my-team
 *   - canAccessEnterprise=false, IC      → "My Resource 360°" → /me
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { useUserRole } from '@/hooks/useUserRole';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';

vi.mock('@/hooks/useUserRole');
vi.mock('@/hooks/useMyLeadProjects');
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    },
    signOut: vi.fn(),
  }),
}));
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn(), isDark: false }),
}));
vi.mock('@/lib/avatars', () => ({ resolveAvatarUrl: () => null }));
vi.mock('@atlaskit/tokens', () => ({ token: (_k: string, fallback: string) => fallback }));

const renderMenu = () =>
  render(
    <MemoryRouter>
      <ProfileMenu />
    </MemoryRouter>,
  );

const openMenu = async () => {
  const trigger = screen.getByRole('button', { name: 'Profile menu' });
  await userEvent.click(trigger);
};

describe('ProfileMenu — R360 persona item', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Resource 360™" linking to /admin/resources for Manager+', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: true, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({ projects: [], isLoading: false });

    renderMenu();
    await openMenu();

    const item = screen.getByRole('menuitem', { name: /resource 360™/i });
    expect(item).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my resource 360°/i })).not.toBeInTheDocument();

    await userEvent.click(item);
  });

  it('shows "My Team" linking to /my-team for a Lead with no enterprise access', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({
      projects: [{ id: 'proj-aaa', key: 'BAU' }],
      isLoading: false,
    });

    renderMenu();
    await openMenu();

    expect(screen.getByRole('menuitem', { name: /my team/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /resource 360™/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my resource 360°/i })).not.toBeInTheDocument();
  });

  it('shows "My Resource 360°" linking to /me for an IC', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({ projects: [], isLoading: false });

    renderMenu();
    await openMenu();

    expect(screen.getByRole('menuitem', { name: /my resource 360°/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /resource 360™/i })).not.toBeInTheDocument();
  });
});
