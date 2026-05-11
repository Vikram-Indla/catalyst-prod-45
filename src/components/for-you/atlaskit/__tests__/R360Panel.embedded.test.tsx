/**
 * R360Panel — embedded mode tests.
 *
 * The Resource 360° tab in the For You page must render the full
 * ring/chronology/board weekly view (R360MemberDetail) for the current user,
 * NOT a capacity/spatial chart.
 *
 * For leads it must also surface a team-member switcher so they can inspect
 * any resource assigned to their projects.
 *
 * These tests FAIL until R360Panel is rewritten to embed R360MemberDetail.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ── Data stubs ───────────────────────────────────────────────────────────────
vi.mock('@/hooks/useR360PanelData', () => ({
  useMyR360ResourceId: () => ({ data: 'res-vikram', isLoading: false }),
  useTeamResourceIds: () => ({
    data: [
      { id: 'res-alice', name: 'Alice Tan',  role_name: 'Developer' },
      { id: 'res-bob',   name: 'Bob Smith',  role_name: 'QA Lead'   },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ isTeamLead: true }),
}));

// R360MemberDetail stub — exposes its key props as data attributes for assertions
vi.mock('@/pages/R360MemberDetail', () => ({
  default: ({ resourceId, embedded }: { resourceId: string; embedded?: boolean }) => (
    <div
      data-testid="r360-member-detail"
      data-resource-id={resourceId}
      data-embedded={String(!!embedded)}
    />
  ),
}));

vi.mock('@atlaskit/tokens', () => ({ token: (_: string, fb: string) => fb }));

import R360Panel from '../R360Panel';

describe('R360Panel — renders ring view not capacity chart', () => {
  it('renders R360MemberDetail for the current user resource', () => {
    render(<MemoryRouter><R360Panel /></MemoryRouter>);
    expect(screen.getByTestId('r360-member-detail')).toBeInTheDocument();
    expect(screen.getByTestId('r360-member-detail').dataset.resourceId).toBe('res-vikram');
  });

  it('passes embedded=true so the Back button is suppressed inside the tab', () => {
    render(<MemoryRouter><R360Panel /></MemoryRouter>);
    expect(screen.getByTestId('r360-member-detail').dataset.embedded).toBe('true');
  });

  it('shows a team-member picker when the user is a lead', () => {
    render(<MemoryRouter><R360Panel /></MemoryRouter>);
    expect(screen.getByText('Alice Tan')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('switches the detail view to a team member when their pill is clicked', async () => {
    render(<MemoryRouter><R360Panel /></MemoryRouter>);
    await userEvent.click(screen.getByText('Alice Tan'));
    expect(screen.getByTestId('r360-member-detail').dataset.resourceId).toBe('res-alice');
  });

  it('switches back to self when the "Me" pill is clicked', async () => {
    render(<MemoryRouter><R360Panel /></MemoryRouter>);
    await userEvent.click(screen.getByText('Alice Tan'));
    await userEvent.click(screen.getByText(/me/i));
    expect(screen.getByTestId('r360-member-detail').dataset.resourceId).toBe('res-vikram');
  });
});
