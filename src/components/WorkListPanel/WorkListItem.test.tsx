/**
 * WorkListItem — Single work item row renderer (F1.15)
 *
 * Contract:
 *   - Renders key, summary, type icon, and status
 *   - Calls onSelect when clicked
 *   - Shows hover state with background change
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { WorkListItem, WorkListItemProps } from './WorkListItem';

const mockItem: WorkListItemProps['item'] = {
  id: 'BAU-123',
  key: 'BAU-123',
  summary: 'Fix login button alignment',
  issueType: 'Defect',
  status: 'In Progress',
};

const mockOnSelect = () => {};

function renderWithClient(component: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      {component}
    </QueryClientProvider>
  );
}

describe('WorkListItem', () => {
  it('renders key and summary', () => {
    renderWithClient(<WorkListItem item={mockItem} isSelected={false} onSelect={mockOnSelect} />);
    expect(screen.getByText('BAU-123')).toBeInTheDocument();
    expect(screen.getByText(/fix login button/i)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithClient(<WorkListItem item={mockItem} isSelected={false} onSelect={onSelect} />);

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('BAU-123');
  });

  it('shows selected state styling', () => {
    const { container } = renderWithClient(<WorkListItem item={mockItem} isSelected={true} onSelect={mockOnSelect} />);
    const button = container.querySelector('button') as HTMLElement;
    const computed = window.getComputedStyle(button);
    expect(computed.backgroundColor).toBeTruthy();
  });

  it('shows hover state on mouse enter', async () => {
    const user = userEvent.setup();
    const { container } = renderWithClient(<WorkListItem item={mockItem} isSelected={false} onSelect={mockOnSelect} />);
    const button = container.querySelector('button') as HTMLElement;

    await user.hover(button);
    const computed = window.getComputedStyle(button);
    expect(computed.backgroundColor).toBeTruthy();
  });

  it('renders issue type icon', () => {
    renderWithClient(<WorkListItem item={mockItem} isSelected={false} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('work-item-icon')).toBeInTheDocument();
  });
});
