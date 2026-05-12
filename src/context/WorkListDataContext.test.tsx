/**
 * WorkListDataContext — Data context for work list (F1.23)
 *
 * Contract:
 *   - Provides items, loading, and error states
 *   - Provides create mutation
 *   - Wraps useWorkItems and useCreateWorkItem
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkListDataProvider, useWorkListData } from './WorkListDataContext';

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
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function TestComponent() {
  const { items, isLoading, create } = useWorkListData();
  return (
    <div>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {items && <div data-testid="items">Items: {items.length}</div>}
    </div>
  );
}

describe('WorkListDataContext', () => {
  it('provides context to children', () => {
    render(
      <QueryClientProvider client={client}>
        <WorkListDataProvider>
          <TestComponent />
        </WorkListDataProvider>
      </QueryClientProvider>
    );
    expect(screen.getByTestId('items')).toBeInTheDocument();
  });

  it('hook returns initial state', () => {
    const TestHook = () => {
      const { items, isLoading, isError, create } = useWorkListData();
      return (
        <div>
          <div data-testid="items-count">{items.length}</div>
          <div data-testid="loading">{isLoading ? 'yes' : 'no'}</div>
        </div>
      );
    };

    render(
      <QueryClientProvider client={client}>
        <WorkListDataProvider>
          <TestHook />
        </WorkListDataProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('yes');
  });

  it('hook provides create function', () => {
    const TestHook = () => {
      const { create } = useWorkListData();
      return <button onClick={() => create({ summary: 'Test', issue_type: 'Task', description: '' })}>Create</button>;
    };

    render(
      <QueryClientProvider client={client}>
        <WorkListDataProvider>
          <TestHook />
        </WorkListDataProvider>
      </QueryClientProvider>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('throws when used outside provider', () => {
    const TestHook = () => {
      useWorkListData();
      return null;
    };

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestHook />)).toThrow();
    consoleError.mockRestore();
  });
});
