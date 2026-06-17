import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StarredEmptyState } from '../StarredEmptyState';

describe('StarredEmptyState', () => {
  it('renders the action-framed headline and scope-honest copy', () => {
    render(<StarredEmptyState onBrowseWork={vi.fn()} onOpenBoard={vi.fn()} />);
    expect(screen.getByText('Build your starred shortcuts')).toBeInTheDocument();
    // copy must name more than just "work item" (the old copy lied about scope)
    const desc = screen.getByTestId('starred-empty-description').textContent || '';
    expect(desc.toLowerCase()).toContain('board');
    expect(desc.toLowerCase()).toContain('filter');
  });

  it('teaches the taxonomy with all four category tiles', () => {
    render(<StarredEmptyState onBrowseWork={vi.fn()} onOpenBoard={vi.fn()} />);
    ['Surfaces', 'Work items', 'Containers', 'Knowledge'].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('fires onBrowseWork and onOpenBoard from their CTAs', () => {
    const onBrowseWork = vi.fn();
    const onOpenBoard = vi.fn();
    render(<StarredEmptyState onBrowseWork={onBrowseWork} onOpenBoard={onOpenBoard} />);
    fireEvent.click(screen.getByRole('button', { name: /browse work to star/i }));
    fireEvent.click(screen.getByRole('button', { name: /open a board/i }));
    expect(onBrowseWork).toHaveBeenCalledTimes(1);
    expect(onOpenBoard).toHaveBeenCalledTimes(1);
  });

  it('renders the Filters CTA only when onBrowseFilters is provided (no dead link)', () => {
    const { rerender } = render(<StarredEmptyState onBrowseWork={vi.fn()} onOpenBoard={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /filters/i })).toBeNull();

    const onBrowseFilters = vi.fn();
    rerender(<StarredEmptyState onBrowseWork={vi.fn()} onOpenBoard={vi.fn()} onBrowseFilters={onBrowseFilters} />);
    const btn = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(btn);
    expect(onBrowseFilters).toHaveBeenCalledTimes(1);
  });
});
