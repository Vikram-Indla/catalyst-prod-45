/**
 * WorkListPanel — Split-view left rail component.
 *
 * Feature #1: Root container with grid layout (auto toolbar / 1fr list)
 *
 * Contract:
 *   - Renders a <div> with display: grid
 *   - Grid has two rows: auto (toolbar) and 1fr (scrollable list)
 *   - Accepts projectKey prop
 *   - Loading state shows spinner while fetching items
 *   - No crash, no console errors
 */
import { describe, it, expect, beforeEach, vi as vitest } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { WorkListPanel } from './WorkListPanel';

describe('WorkListPanel', () => {
  beforeEach(() => {
    // Clear any mocks
  });

  it('renders a grid container with auto/1fr template rows', () => {
    const { container } = render(<WorkListPanel projectKey="BAU" />);

    const root = container.querySelector('[data-testid="work-list-panel"]') as HTMLElement;

    // Component must render without crashing
    expect(root).toBeInTheDocument();

    // Grid layout checks
    const computed = window.getComputedStyle(root);
    expect(computed.display).toBe('grid');
    expect(computed.gridTemplateRows).toMatch(/auto\s+1fr|auto 1fr/);
  });

  it('shows loading spinner while items are fetching', async () => {
    render(<WorkListPanel projectKey="BAU" isLoading={true} />);

    // Should show a loading indicator
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('data-testid', 'work-list-loading');
  });

  it('accepts projectKey prop without crashing', () => {
    const { rerender } = render(<WorkListPanel projectKey="BAU" />);
    expect(screen.getByTestId('work-list-panel')).toBeInTheDocument();

    // Should handle prop changes
    rerender(<WorkListPanel projectKey="OTH" />);
    expect(screen.getByTestId('work-list-panel')).toBeInTheDocument();
  });

  it('renders no console errors', () => {
    const consoleSpy = vitest.spyOn(console, 'error').mockImplementation(() => {});

    render(<WorkListPanel projectKey="BAU" />);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('renders empty state when no items are present', () => {
    const onClearFilters = vitest.fn();

    render(
      <WorkListPanel
        projectKey="BAU"
        items={[]}
        isLoading={false}
        onClearFilters={onClearFilters}
      />
    );

    // Assert empty state container exists
    const emptyState = screen.getByTestId('work-list-empty-state');
    expect(emptyState).toBeInTheDocument();

    // Assert icon is rendered
    const icon = screen.getByTestId('empty-state-icon');
    expect(icon).toBeInTheDocument();

    // Assert text is rendered
    expect(screen.getByText('No issues found')).toBeInTheDocument();

    // Assert "Adjust filters" link exists
    const link = screen.getByText('Adjust filters');
    expect(link).toBeInTheDocument();

    // Assert link has click handler
    link.click();
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('does not render empty state when items are present', () => {
    render(
      <WorkListPanel
        projectKey="BAU"
        items={[
          { id: '1', key: 'BAU-1', summary: 'Test issue' } as any,
        ]}
        isLoading={false}
        onClearFilters={vitest.fn()}
      />
    );

    // Empty state should NOT be present
    const emptyState = screen.queryByTestId('work-list-empty-state');
    expect(emptyState).not.toBeInTheDocument();
  });

  it('does not render empty state while loading', () => {
    render(
      <WorkListPanel
        projectKey="BAU"
        items={[]}
        isLoading={true}
        onClearFilters={vitest.fn()}
      />
    );

    // Empty state should NOT be present when loading
    const emptyState = screen.queryByTestId('work-list-empty-state');
    expect(emptyState).not.toBeInTheDocument();

    // Loading spinner should be shown instead
    const spinner = screen.getByTestId('work-list-loading');
    expect(spinner).toBeInTheDocument();
  });
});
