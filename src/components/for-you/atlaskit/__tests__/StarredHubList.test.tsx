import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarredHubList } from '../StarredHubList';
import type { StarredHubRow } from '@/hooks/home/useStarredHub';

const rows: StarredHubRow[] = [
  { id: 'board-1', type: 'board', category: 'surface', label: 'Sprint 14 board', subtitle: 'Board', starredAt: new Date().toISOString() },
  { id: 'BAU-5757', type: 'defect', category: 'work_item', label: 'OTP email not delivered', subtitle: 'BAU-5757', issueType: 'QA Bug', status: 'In QA', statusCategory: 'inprogress', starredAt: new Date().toISOString() },
  { id: 'proj-1', type: 'project', category: 'container', label: 'Investor Journey', subtitle: 'Project', starredAt: new Date().toISOString() },
];

describe('StarredHubList', () => {
  it('renders filter chips and a heading per non-empty category', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    // chips (by role) — "Surfaces"/"Containers" appear as both chip and heading
    ['All', 'Work', 'Surfaces', 'Containers'].forEach(name =>
      expect(screen.getByRole('button', { name })).toBeInTheDocument(),
    );
    // "Work items" heading is unique (its chip is labelled "Work")
    expect(screen.getByText('Work items')).toBeInTheDocument();
    // no Knowledge anywhere (no rows)
    expect(screen.queryByText('Knowledge')).toBeNull();
  });

  it('shows STATUS on work items and a TYPE badge on surfaces/containers (one badge per row)', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    // work item → status lozenge + key, no type badge
    expect(screen.getByText('In QA')).toBeInTheDocument();
    expect(screen.getByText('BAU-5757')).toBeInTheDocument();
    expect(screen.queryByText('QA Bug')).toBeNull();
    // surface + container → type badge
    expect(screen.getByText('Board')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('filter chips scope by category', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Surfaces' }));
    expect(screen.getByText('Sprint 14 board')).toBeInTheDocument();
    expect(screen.queryByText('OTP email not delivered')).toBeNull();
    expect(screen.queryByText('Investor Journey')).toBeNull();
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
