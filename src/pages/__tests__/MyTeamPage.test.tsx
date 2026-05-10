/**
 * MyTeamPage — Lead persona's R360 team surface at /my-team.
 *
 * Thin wrapper: resolves lead projects via useMyLeadProjects, gates on
 * project membership, then hands off to TeamResourceList with the project ids.
 *
 * Contract (this test is the spec — implementation follows):
 *   - useMyLeadProjects isLoading=true                  → loading state
 *   - useMyLeadProjects isError=true                    → error state
 *   - useMyLeadProjects projects=[] (no lead projects)  → empty state
 *   - useMyLeadProjects projects=[…]                    → renders TeamResourceList with projectIds
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import React from 'react';

import MyTeamPage from '@/pages/MyTeamPage';
import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';

vi.mock('@/hooks/useMyLeadProjects');

const teamResourceListMock = vi.fn();
vi.mock('@/pages/TeamResourceList', () => ({
  default: (props: { projectIds?: string[] }) => {
    teamResourceListMock(props);
    return (
      <div
        data-testid="my-team-list"
        data-project-ids={(props.projectIds ?? []).join(',')}
      />
    );
  },
}));

const renderPage = (children: ReactNode) =>
  render(<MemoryRouter initialEntries={['/my-team']}>{children}</MemoryRouter>);

describe('MyTeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while useMyLeadProjects is loading', () => {
    (useMyLeadProjects as any).mockReturnValue({
      projects: [],
      isLoading: true,
      isError: false,
      error: null,
    });

    renderPage(<MyTeamPage />);

    expect(screen.getByTestId('my-team-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('my-team-list')).not.toBeInTheDocument();
  });

  it('renders the error state when useMyLeadProjects reports isError', () => {
    (useMyLeadProjects as any).mockReturnValue({
      projects: [],
      isLoading: false,
      isError: true,
      error: new Error('rls denied'),
    });

    renderPage(<MyTeamPage />);

    expect(screen.getByTestId('my-team-error')).toBeInTheDocument();
    expect(screen.queryByTestId('my-team-list')).not.toBeInTheDocument();
  });

  it('renders the empty state when user leads no projects', () => {
    (useMyLeadProjects as any).mockReturnValue({
      projects: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage(<MyTeamPage />);

    expect(screen.getByTestId('my-team-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('my-team-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-team-loading')).not.toBeInTheDocument();
  });

  it('renders TeamResourceList with project ids when user leads projects', () => {
    (useMyLeadProjects as any).mockReturnValue({
      projects: [
        { id: 'proj-aaa', key: 'BAU' },
        { id: 'proj-bbb', key: 'INF' },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage(<MyTeamPage />);

    const list = screen.getByTestId('my-team-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-project-ids', 'proj-aaa,proj-bbb');
    expect(teamResourceListMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectIds: ['proj-aaa', 'proj-bbb'] }),
    );
    expect(screen.queryByTestId('my-team-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-team-empty')).not.toBeInTheDocument();
  });
});
