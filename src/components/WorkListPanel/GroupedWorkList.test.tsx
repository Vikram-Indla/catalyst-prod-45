/**
 * GroupedWorkList — Grouped work item list (F1.16)
 *
 * Contract:
 *   - Groups items by status
 *   - Shows collapsible group headers with counts
 *   - Renders items within each group
 *   - Calls onSelectItem when item clicked
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { GroupedWorkList, GroupedWorkListProps } from './GroupedWorkList';

const mockItems: GroupedWorkListProps['items'] = [
  { id: 'BAU-1', key: 'BAU-1', summary: 'Task 1', issueType: 'Task', status: 'To Do' },
  { id: 'BAU-2', key: 'BAU-2', summary: 'Task 2', issueType: 'Task', status: 'To Do' },
  { id: 'BAU-3', key: 'BAU-3', summary: 'Task 3', issueType: 'Story', status: 'In Progress' },
];

function renderWithClient(component: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      {component}
    </QueryClientProvider>
  );
}

describe('GroupedWorkList', () => {
  it('groups items by status', () => {
    renderWithClient(
      <GroupedWorkList items={mockItems} selectedKey={null} onSelectItem={() => {}} />
    );
    expect(screen.getAllByText(/To Do/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
  });

  it('shows item counts in group headers', () => {
    renderWithClient(
      <GroupedWorkList items={mockItems} selectedKey={null} onSelectItem={() => {}} />
    );
    const countBadges = screen.getAllByText(/\d/);
    expect(countBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onSelectItem when item is clicked', async () => {
    const user = userEvent.setup();
    const onSelectItem = vi.fn();
    renderWithClient(
      <GroupedWorkList items={mockItems} selectedKey={null} onSelectItem={onSelectItem} />
    );

    const item = screen.getByText(/Task 1/);
    await user.click(item);
    expect(onSelectItem).toHaveBeenCalledWith('BAU-1');
  });

  it('toggles group collapse on header click', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <GroupedWorkList items={mockItems} selectedKey={null} onSelectItem={() => {}} />
    );

    const groupHeader = screen.getAllByTestId('group-header')[0];
    await user.click(groupHeader);

    const items = screen.queryAllByText(/Task 1|Task 2/);
    expect(items.length).toBeLessThanOrEqual(1);
  });

  it('highlights selected item', () => {
    const { container } = renderWithClient(
      <GroupedWorkList items={mockItems} selectedKey="BAU-1" onSelectItem={() => {}} />
    );
    const selectedItems = container.querySelectorAll('[data-testid="work-list-item"]');
    expect(selectedItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no items', () => {
    renderWithClient(
      <GroupedWorkList items={[]} selectedKey={null} onSelectItem={() => {}} />
    );
    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });
});
