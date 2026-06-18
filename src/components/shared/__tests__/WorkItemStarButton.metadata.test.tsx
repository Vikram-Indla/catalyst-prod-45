import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mutate = vi.fn();

vi.mock('@/hooks/home/useStarredItems', () => ({
  useStarredItemIds: () => ({ data: new Set<string>(), isLoading: false }),
  useToggleStar: () => ({ mutate, isPending: false }),
}));

vi.mock('@/components/ads', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { WorkItemStarButton } from '../WorkItemStarButton';

describe('WorkItemStarButton — surface metadata round-trip', () => {
  beforeEach(() => mutate.mockClear());

  it('forwards metadata (label/route) to the toggle mutation for surface stars', () => {
    render(
      <WorkItemStarButton
        itemId="board-42"
        itemType="board"
        metadata={{ label: 'Sprint 14 board', route: '/project-hub/BAU/boards/42' }}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: 'board-42',
        itemType: 'board',
        metadata: { label: 'Sprint 14 board', route: '/project-hub/BAU/boards/42' },
      }),
    );
  });

  it('omits metadata for plain work-item stars', () => {
    render(<WorkItemStarButton itemId="BAU-5757" itemType="defect" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0].metadata).toBeUndefined();
  });
});
