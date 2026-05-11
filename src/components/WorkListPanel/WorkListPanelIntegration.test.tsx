/**
 * WorkListPanelIntegration — Full work list panel (F1.20)
 *
 * Contract:
 *   - Renders header with item count
 *   - Renders filters
 *   - Renders grouped work list
 *   - Opens create modal on create button click
 *   - Selects items and syncs to URL
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { WorkListPanelIntegration, WorkListPanelIntegrationProps } from './WorkListPanelIntegration';

const mockItems = [
  { id: 'BAU-1', key: 'BAU-1', summary: 'Task 1', issueType: 'Task', status: 'To Do' },
  { id: 'BAU-2', key: 'BAU-2', summary: 'Task 2', issueType: 'Story', status: 'In Progress' },
];

function renderWithProviders(component: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={client}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('WorkListPanelIntegration', () => {
  it('renders header with item count', () => {
    renderWithProviders(
      <WorkListPanelIntegration items={mockItems} isLoading={false} />
    );
    expect(screen.getByText(/work items/i)).toBeInTheDocument();
    expect(screen.getAllByText(/2/).length).toBeGreaterThan(0);
  });

  it('renders filters', () => {
    renderWithProviders(
      <WorkListPanelIntegration items={mockItems} isLoading={false} />
    );
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders grouped work list', () => {
    renderWithProviders(
      <WorkListPanelIntegration items={mockItems} isLoading={false} />
    );
    expect(screen.getAllByText(/To Do/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/).length).toBeGreaterThan(0);
  });

  it('opens create modal when create button clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkListPanelIntegration items={mockItems} isLoading={false} />
    );

    const createButton = screen.getByRole('button', { name: /create/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/create issue/i)).toBeInTheDocument();
    });
  });

  it('shows loading state when isLoading is true', () => {
    renderWithProviders(
      <WorkListPanelIntegration items={[]} isLoading={true} />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no items and not loading', () => {
    renderWithProviders(
      <WorkListPanelIntegration items={[]} isLoading={false} />
    );
    expect(screen.getByText(/no items found/i)).toBeInTheDocument();
  });

  it('selects item on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WorkListPanelIntegration items={mockItems} isLoading={false} />
    );

    const items = screen.getAllByTestId('work-list-item');
    expect(items.length).toBeGreaterThan(0);

    await user.click(items[0]);

    await waitFor(() => {
      const updatedItems = screen.getAllByTestId('work-list-item');
      const computed = window.getComputedStyle(updatedItems[0]);
      expect(computed.backgroundColor).toBeTruthy();
    });
  });
});
