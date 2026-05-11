/**
 * AdminGuard — gates an admin surface on useUserRole().
 *
 * Contract (Phase 0 hot-fix per /catalyst-agent v2 plan):
 *   - isLoading true                        → renders the loading spinner
 *   - isAdmin true (any value of isSuperAdmin) → renders children
 *   - isSuperAdmin true (even if isAdmin is false) → renders children
 *   - isAdmin false AND isSuperAdmin false  → renders the "no permission" Alert
 *
 * The isSuperAdmin admission path is the behaviour change introduced by Phase 0.
 * Before the fix, AdminGuard checked only `isAdmin`, so a user with the
 * product-role super_admin (via user_product_roles) was incorrectly blocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AdminGuard } from '@/components/admin/AdminGuard';
import { useUserRole } from '@/hooks/useUserRole';

vi.mock('@/hooks/useUserRole');

const Child = () => <div data-testid="admin-content">admin content</div>;
const BLOCK_TEXT = /you don't have permission/i;

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading spinner while role is loading', () => {
    (useUserRole as any).mockReturnValue({ isAdmin: false, isSuperAdmin: false, isLoading: true });

    render(<AdminGuard><Child /></AdminGuard>);

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.queryByText(BLOCK_TEXT)).not.toBeInTheDocument();
  });

  it('renders children when the user is an admin (isAdmin true)', () => {
    (useUserRole as any).mockReturnValue({ isAdmin: true, isSuperAdmin: false, isLoading: false });

    render(<AdminGuard><Child /></AdminGuard>);

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.queryByText(BLOCK_TEXT)).not.toBeInTheDocument();
  });

  it('renders children when the user is a super admin (isSuperAdmin true, isAdmin false)', () => {
    // This is the Phase 0 hot-fix behaviour. Currently FAILS — AdminGuard reads only `isAdmin`.
    (useUserRole as any).mockReturnValue({ isAdmin: false, isSuperAdmin: true, isLoading: false });

    render(<AdminGuard><Child /></AdminGuard>);

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.queryByText(BLOCK_TEXT)).not.toBeInTheDocument();
  });

  it('renders the no-permission Alert when neither isAdmin nor isSuperAdmin is true', () => {
    (useUserRole as any).mockReturnValue({ isAdmin: false, isSuperAdmin: false, isLoading: false });

    render(<AdminGuard><Child /></AdminGuard>);

    expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
    expect(screen.getByText(BLOCK_TEXT)).toBeInTheDocument();
  });
});
