/**
 * RouteRoleGuard — gates a route on canAccessEnterprise from useUserRole.
 *
 * Contract:
 *   - canAccessEnterprise true            → renders children
 *   - canAccessEnterprise false, loaded   → does NOT render children (redirect to /unauthorized)
 *   - isLoading true                      → renders nothing (null), not children
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

import { RouteRoleGuard } from '@/components/RouteRoleGuard';
import { useUserRole } from '@/hooks/useUserRole';

vi.mock('@/hooks/useUserRole');

const wrap = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/admin/resources']}>
      <Routes>
        <Route path="/admin/resources" element={<>{ui}</>} />
        <Route path="/unauthorized" element={<div data-testid="unauthorized-page" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('RouteRoleGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when canAccessEnterprise is true', () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: true, isLoading: false });

    wrap(
      <RouteRoleGuard>
        <div data-testid="protected-content">admin content</div>
      </RouteRoleGuard>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('unauthorized-page')).not.toBeInTheDocument();
  });

  it('redirects to /unauthorized when canAccessEnterprise is false and not loading', () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: false });

    wrap(
      <RouteRoleGuard>
        <div data-testid="protected-content">admin content</div>
      </RouteRoleGuard>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('unauthorized-page')).toBeInTheDocument();
  });

  it('renders nothing while role is loading', () => {
    (useUserRole as any).mockReturnValue({ canAccessEnterprise: false, isLoading: true });

    wrap(
      <RouteRoleGuard>
        <div data-testid="protected-content">admin content</div>
      </RouteRoleGuard>,
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unauthorized-page')).not.toBeInTheDocument();
  });
});
