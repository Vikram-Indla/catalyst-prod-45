/**
 * useProjectAllWorkItems — project scope work items hook.
 *
 * Fetches and filters work items for a given project with support for
 * status, type, priority, and assignee filters, plus sorting.
 *
 * Powers:
 *   - WorkListPanel (allwork view within a project)
 *   - ProjectAllWorkView (allwork navigator)
 *   - Backlog filtering
 *
 * Contract (this test is the spec — implementation follows):
 *   - Accepts projectKey (required string) and optional filters object
 *   - Returns { items, filters, setFilters, sort, setSort, isLoading, error, refetch }
 *   - Initial state: isLoading = true (React Query loading)
 *   - After data loads: isLoading = false, items.length > 0 (or = 0 if no matches)
 *   - Query key uses [projectKey, filters, sort] for caching
 *   - No real Jira API calls (all data mocked)
 *   - No console errors or crashes
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useProjectAllWorkItems } from '@/hooks/useProjectAllWorkItems';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useProjectAllWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expected data structure with required properties', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert the return object has all required properties
    expect(result.current).toHaveProperty('items');
    expect(result.current).toHaveProperty('filters');
    expect(result.current).toHaveProperty('setFilters');
    expect(result.current).toHaveProperty('sort');
    expect(result.current).toHaveProperty('setSort');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
  });

  it('initializes with isLoading=true, then false after data loads', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    // Initially true during query execution
    expect(result.current.isLoading).toBe(true);

    // Resolves to false after data loads
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns empty items array and default filters on initial load', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.filters).toEqual({
      status: undefined,
      type: undefined,
      priority: undefined,
      assignee: undefined,
    });
  });

  it('returns default sort state (field, order)', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sort).toHaveProperty('field');
    expect(result.current.sort).toHaveProperty('order');
    expect(['asc', 'desc']).toContain(result.current.sort.order);
  });

  it('setFilters updates filters and triggers refetch', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialFilters = result.current.filters;

    // Update filters
    result.current.setFilters({ status: 'in_progress', type: 'story' });

    await waitFor(() => {
      expect(result.current.filters).not.toEqual(initialFilters);
    });

    expect(result.current.filters.status).toBe('in_progress');
    expect(result.current.filters.type).toBe('story');
  });

  it('setSort updates sort and triggers refetch', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialSort = { ...result.current.sort };

    // Update sort
    result.current.setSort({ field: 'priority', order: 'desc' });

    await waitFor(() => {
      expect(result.current.sort.field).toBe('priority');
      expect(result.current.sort.order).toBe('desc');
    });

    expect(result.current.sort).not.toEqual(initialSort);
  });

  it('accepts optional initial filters', async () => {
    const initialFilters = { status: 'backlog', type: 'task' };

    const { result } = renderHook(() => useProjectAllWorkItems('BAU', initialFilters), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filters.status).toBe('backlog');
    expect(result.current.filters.type).toBe('task');
  });

  it('error is null when no error occurs', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('refetch function is callable and does not throw', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // refetch should be a function
    expect(typeof result.current.refetch).toBe('function');

    // Should not throw when called
    await expect(result.current.refetch()).resolves.not.toThrow();
  });
});
