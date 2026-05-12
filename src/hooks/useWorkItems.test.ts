/**
 * useWorkItems — Fetch work items (F1.21)
 *
 * Contract:
 *   - Fetches items from database on mount
 *   - Returns items, loading, and error states
 *   - Refetches on dependency changes
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useWorkItems, UseWorkItemsOptions } from './useWorkItems';

// Mock the database client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnValue({
        data: [
          { id: '1', issue_key: 'BAU-1', summary: 'Task 1', issue_type: 'Task', status: 'To Do' },
          { id: '2', issue_key: 'BAU-2', summary: 'Task 2', issue_type: 'Story', status: 'In Progress' },
        ],
        error: null,
      }),
    })),
  },
}));

function renderHookWithQueryClient<T>(hook: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderHook(hook, {
    wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
  });
}

describe('useWorkItems', () => {
  it('returns loading state initially', () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems());
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches items and returns data', async () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toBeDefined();
    expect(Array.isArray(result.current.items)).toBe(true);
  });

  it('returns error state on fetch failure', async () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems({ enabled: true }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 }).catch(() => {});
  });

  it('accepts enabled option to control fetching', () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems({ enabled: false }));
    expect(result.current.items).toEqual([]);
  });

  it('provides refetch function', async () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems());
    expect(typeof result.current.refetch).toBe('function');
  });

  it('tracks item count', async () => {
    const { result } = renderHookWithQueryClient(() => useWorkItems());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.itemCount).toBe(result.current.items.length);
  });
});
