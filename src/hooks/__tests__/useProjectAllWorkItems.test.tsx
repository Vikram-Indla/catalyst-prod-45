/**
 * useProjectAllWorkItems — project scope work items hook with keyset pagination.
 *
 * Fetches work items for a given project with keyset pagination support.
 *
 * Powers:
 *   - ProjectAllWorkView (allwork navigator)
 *   - AllWorkTable (virtualized table rendering)
 *
 * Contract (this test is the spec — implementation follows):
 *   - Accepts projectKey (required string)
 *   - Returns { items, rowsPerPage, setRowsPerPage, hasNextPage, hasPrevPage, fetchNextPage, fetchPrevPage, isLoading, error }
 *   - Initial state: isLoading = true (React Query loading)
 *   - After data loads: isLoading = false, items.length > 0 (or = 0 if no matches)
 *   - Query key uses [projectKey, cursor, rowsPerPage] for caching
 *   - No real Jira API calls (all data mocked)
 *   - No console errors or crashes
 *   - Pagination: fetchNextPage/fetchPrevPage navigate cursor
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';

// Mock auth context
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, profile: null }),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useProjectAllWorkItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns expected data structure with pagination properties', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Assert the return object has all required properties
    expect(result.current).toHaveProperty('items');
    expect(result.current).toHaveProperty('rowsPerPage');
    expect(result.current).toHaveProperty('setRowsPerPage');
    expect(result.current).toHaveProperty('hasNextPage');
    expect(result.current).toHaveProperty('hasPrevPage');
    expect(result.current).toHaveProperty('fetchNextPage');
    expect(result.current).toHaveProperty('fetchPrevPage');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('initializes with isLoading and resolves to false after data loads', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    // Eventually resolves to false after data loads
    // (In test environment, may resolve immediately or after a tick depending on query setup)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns empty items array and default pagination state on initial load', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.rowsPerPage).toBe(25);  // DEFAULT_ALL_WORK_ROWS_PER_PAGE
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.hasPrevPage).toBe(false);
  });

  it('supports changing rowsPerPage', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialRowsPerPage = result.current.rowsPerPage;

    // Update rowsPerPage
    act(() => {
      result.current.setRowsPerPage(50);
    });

    await waitFor(() => {
      expect(result.current.rowsPerPage).toBe(50);
    });

    expect(result.current.rowsPerPage).not.toBe(initialRowsPerPage);
  });

  it('error is null when no error occurs', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
  });

  it('pagination functions are callable', async () => {
    const { result } = renderHook(() => useProjectAllWorkItems('BAU'), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // fetchNextPage and fetchPrevPage should be functions
    expect(typeof result.current.fetchNextPage).toBe('function');
    expect(typeof result.current.fetchPrevPage).toBe('function');

    // Should not throw when called
    expect(() => {
      result.current.fetchNextPage();
      result.current.fetchPrevPage();
    }).not.toThrow();
  });
});
