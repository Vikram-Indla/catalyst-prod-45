import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ProjectIcon pulls useIconOverrides (react-query) — stub it so the list can
// mount without a QueryClientProvider. We still assert it receives the row.
vi.mock('@/components/shared/ProjectIcon', () => ({
  ProjectIcon: ({ name }: { name?: string }) => <span data-testid="project-icon">{name}</span>,
}));

import { StarredHubList } from '../StarredHubList';
import type { StarredHubRow } from '@/hooks/home/useStarredHub';

const rows: StarredHubRow[] = [
  { id: 'board-1', type: 'board', category: 'surface', label: 'Sprint 14 board', subtitle: 'Board', starredAt: new Date().toISOString() },
  { id: 'BAU-5757', type: 'defect', category: 'work_item', label: 'OTP email not delivered', subtitle: 'BAU-5757', issueType: 'QA Bug', status: 'In QA', statusCategory: 'inprogress', starredAt: new Date().toISOString() },
  { id: 'proj-1', type: 'project', category: 'container', label: 'Investor Journey', subtitle: 'Project', projectKey: 'INV', starredAt: new Date().toISOString() },
];

describe('StarredHubList', () => {
  it('groups by real type names — no "Surfaces"/"Containers" jargon, no filter chips', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByText('Work items')).toBeInTheDocument();
    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.queryByText('Surfaces')).toBeNull();
    expect(screen.queryByText('Containers')).toBeNull();
    // no filter-chip buttons competing with the For You tabs
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull();
  });

  it('work-item rows show key + canonical status chip and no redundant type badge', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByText('OTP email not delivered')).toBeInTheDocument();
    expect(screen.getByText('BAU-5757')).toBeInTheDocument();
    expect(screen.getByText('In QA')).toBeInTheDocument(); // canonical lozenge text
    // washed-out singular type badges are gone (headings are plural)
    expect(screen.queryByText('Board')).toBeNull();
    expect(screen.queryByText('Project')).toBeNull();
  });

  it('renders the real ProjectIcon for project rows', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByTestId('project-icon')).toHaveTextContent('Investor Journey');
  });

  it('renders a "Pages" group for generic page stars (e.g. Capacity Planner)', () => {
    const pageRows: StarredHubRow[] = [
      { id: '/planhub/capacity', type: 'page', category: 'surface', label: 'Capacity Planner', subtitle: 'Plan', route: '/planhub/capacity', starredAt: new Date().toISOString() },
    ];
    render(<StarredHubList rows={pageRows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByText('Pages')).toBeInTheDocument();
    expect(screen.getByText('Capacity Planner')).toBeInTheDocument();
  });

  it('fires onOpenRow on row click and onUnstar on the star button', () => {
    const onOpenRow = vi.fn();
    const onUnstar = vi.fn();
    render(<StarredHubList rows={rows} onOpenRow={onOpenRow} onUnstar={onUnstar} />);
    fireEvent.click(screen.getByText('Sprint 14 board'));
    expect(onOpenRow).toHaveBeenCalledWith(expect.objectContaining({ id: 'board-1' }));
    const unstarButtons = screen.getAllByRole('button', { name: /remove from starred/i });
    fireEvent.click(unstarButtons[0]);
    expect(onUnstar).toHaveBeenCalledTimes(1);
  });
});
