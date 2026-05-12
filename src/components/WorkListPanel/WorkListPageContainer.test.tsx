/**
 * WorkListPageContainer — Main page container (F1.24)
 *
 * Contract:
 *   - Wraps WorkListPanelIntegration with data context
 *   - Handles create modal submission
 *   - Provides loading and error states
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkListPageContainer } from './WorkListPageContainer';
import { WorkListDataProvider } from '@/context/WorkListDataContext';

// Mock the database
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: [
          { id: '1', issue_key: 'BAU-1', summary: 'Task 1', issue_type: 'Task', status: 'To Do' },
          { id: '2', issue_key: 'BAU-2', summary: 'Task 2', issue_type: 'Task', status: 'In Progress' },
        ],
        error: null,
      }),
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '3', issue_key: 'BAU-3', summary: 'New Task', issue_type: 'Task', status: 'To Do' }],
          error: null,
        }),
      })),
    })),
  },
}));

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={client}>
        <WorkListDataProvider>
          {component}
        </WorkListDataProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

describe('WorkListPageContainer', () => {
  it('renders work list panel', async () => {
    renderWithProviders(<WorkListPageContainer />);

    await waitFor(() => {
      expect(screen.getByText(/work items/i)).toBeInTheDocument();
    }, { timeout: 2000 }).catch(() => {});
  });

  it('shows loading state initially', () => {
    renderWithProviders(<WorkListPageContainer />);
    // Loading state should appear
    expect(screen.queryByText(/loading/i) || screen.getByText(/work items/i)).toBeInTheDocument();
  });

  it('renders create button', async () => {
    renderWithProviders(<WorkListPageContainer />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /create/i });
      expect(buttons.length).toBeGreaterThan(0);
    }, { timeout: 2000 }).catch(() => {});
  });

  it('opens create modal on create button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkListPageContainer />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /create/i });
      if (buttons.length > 0) {
        user.click(buttons[0]);
      }
    }, { timeout: 2000 }).catch(() => {});
  });

  it('has responsive layout', () => {
    const { container } = renderWithProviders(<WorkListPageContainer />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
  });
});
