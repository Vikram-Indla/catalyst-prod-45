/**
 * MyResource360Page — IC persona's primary R360 surface at /me.
 *
 * Thin wrapper: resolves auth.uid → resource_inventory.id via useMyResource,
 * then renders the canonical R360MemberDetail with that id. No list, no
 * chrome — Tufte's max-data-ink for self.
 *
 * Contract (this test is the spec — implementation follows):
 *   - useMyResource isLoading=true                → loading state
 *   - useMyResource isError=true                  → error state
 *   - useMyResource resourceId=null (unauth/no row) → empty state
 *   - useMyResource resourceId resolved             → renders R360MemberDetail with resourceId prop
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import React from 'react';

import MyResource360Page from '@/pages/MyResource360Page';
import { useMyResource } from '@/hooks/useMyResource';

vi.mock('@/hooks/useMyResource');

const r360MemberDetailMock = vi.fn();
vi.mock('@/pages/R360MemberDetail', () => ({
  default: (props: { resourceId?: string }) => {
    r360MemberDetailMock(props);
    return <div data-testid="r360-member-detail" data-resource-id={props.resourceId ?? ''} />;
  },
}));

const renderPage = (children: ReactNode) =>
  render(<MemoryRouter initialEntries={['/me']}>{children}</MemoryRouter>);

describe('MyResource360Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while useMyResource is loading', () => {
    (useMyResource as any).mockReturnValue({
      resourceId: null,
      isLoading: true,
      isError: false,
      error: null,
    });

    renderPage(<MyResource360Page />);

    expect(screen.getByTestId('my-r360-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('r360-member-detail')).not.toBeInTheDocument();
  });

  it('renders the empty state when resourceId is null and not loading', () => {
    (useMyResource as any).mockReturnValue({
      resourceId: null,
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage(<MyResource360Page />);

    expect(screen.getByTestId('my-r360-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('r360-member-detail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-r360-loading')).not.toBeInTheDocument();
  });

  it('renders the error state when useMyResource reports isError', () => {
    (useMyResource as any).mockReturnValue({
      resourceId: null,
      isLoading: false,
      isError: true,
      error: new Error('rls denied'),
    });

    renderPage(<MyResource360Page />);

    expect(screen.getByTestId('my-r360-error')).toBeInTheDocument();
    expect(screen.queryByTestId('r360-member-detail')).not.toBeInTheDocument();
  });

  it('renders R360MemberDetail with resolved resourceId when present', () => {
    (useMyResource as any).mockReturnValue({
      resourceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage(<MyResource360Page />);

    const detail = screen.getByTestId('r360-member-detail');
    expect(detail).toBeInTheDocument();
    expect(detail).toHaveAttribute('data-resource-id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(r360MemberDetailMock).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }),
    );
    expect(screen.queryByTestId('my-r360-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-r360-empty')).not.toBeInTheDocument();
  });
});
