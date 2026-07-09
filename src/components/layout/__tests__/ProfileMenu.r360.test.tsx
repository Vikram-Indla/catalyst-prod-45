/**
 * ProfileMenu — R360 persona-conditional menu item.
 *
 * Original contract (this test was the spec — implementation followed):
 *   - canAccessEnterprise=true           → "Resource 360™"   → /admin/resources
 *   - canAccessEnterprise=false, lead    → "My Team"          → /my-team
 *   - canAccessEnterprise=false, IC      → "My Resource 360°" → /me
 *
 * Updated 2026-07-09: ProfileMenu.tsx now documents that the entire Resource
 * 360 entry was REMOVED 2026-05-31 — "accessible via the For You
 * 'Resource 360°' tab and via per-row contextual actions" instead. The
 * three-way persona branch (canAccessEnterprise / useMyLeadProjects /
 * r360Item) was deleted from the component. This test now pins the current,
 * post-removal contract: none of the three R360 menu items render from
 * ProfileMenu, for any persona.
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

describe('ProfileMenu — R360 persona item (removed 2026-05-31)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never shows "Resource 360™" for Manager+ — moved to the For You tab', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: true, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({ projects: [], isLoading: false });

    renderMenu();
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: /resource 360™/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my resource 360°/i })).not.toBeInTheDocument();
  });

  it('never shows "My Team" for a Lead with no enterprise access', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({
      projects: [{ id: 'proj-aaa', key: 'BAU' }],
      isLoading: false,
    });

    renderMenu();
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /resource 360™/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my resource 360°/i })).not.toBeInTheDocument();
  });

  it('never shows "My Resource 360°" for an IC', async () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: false });
    (useMyLeadProjects as any).mockReturnValue({ projects: [], isLoading: false });

    renderMenu();
    await openMenu();

    expect(screen.queryByRole('menuitem', { name: /my resource 360°/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /my team/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /resource 360™/i })).not.toBeInTheDocument();
  });
});
