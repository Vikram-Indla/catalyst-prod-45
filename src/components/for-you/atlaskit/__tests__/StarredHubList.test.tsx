import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarredHubList } from '../StarredHubList';
import type { StarredHubRow } from '@/hooks/home/useStarredHub';

const rows: StarredHubRow[] = [
  { id: 'board-1', type: 'board', category: 'surface', label: 'Sprint 14 board', subtitle: 'Board', starredAt: new Date().toISOString() },
  { id: 'BAU-5757', type: 'defect', category: 'work_item', label: 'OTP email not delivered', subtitle: 'BAU-5757', issueType: 'QA Bug', starredAt: new Date().toISOString() },
  { id: 'proj-1', type: 'project', category: 'container', label: 'Investor Journey', subtitle: 'Project', starredAt: new Date().toISOString() },
];

describe('StarredHubList', () => {
  it('renders a heading per non-empty category, in fixed order', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByText('Surfaces')).toBeInTheDocument();
    expect(screen.getByText('Work items')).toBeInTheDocument();
    expect(screen.getByText('Containers')).toBeInTheDocument();
    // knowledge group has no rows → no heading
    expect(screen.queryByText('Knowledge')).toBeNull();
  });

  it('renders each row label and a typed badge', () => {
    render(<StarredHubList rows={rows} onOpenRow={vi.fn()} onUnstar={vi.fn()} />);
    expect(screen.getByText('Sprint 14 board')).toBeInTheDocument();
    expect(screen.getByText('OTP email not delivered')).toBeInTheDocument();
    expect(screen.getByText('QA Bug')).toBeInTheDocument(); // badge label
    expect(screen.getByText('Investor Journey')).toBeInTheDocument();
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
