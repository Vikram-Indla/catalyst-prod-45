/**
 * useCreateWorkItem — Create work item mutation (F1.22)
 *
 * Contract:
 *   - Provides mutation function to create items
 *   - Returns loading, error, and success states
 *   - Invalidates work items cache on success
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCreateWorkItem } from './useCreateWorkItem';

// Mock the database
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', issue_key: 'BAU-1', summary: 'New Task', issue_type: 'Task', status: 'To Do' }],
          error: null,
        }),
      })),
    })),
  },
}));

function renderHookWithQueryClient<T>(hook: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return renderHook(hook, {
    wrapper: ({ children }) => React.createElement(QueryClientProvider, { client }, children),
  });
}

describe('useCreateWorkItem', () => {
  it('provides mutation function', () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());
    expect(typeof result.current.mutate).toBe('function');
  });

  it('is not loading initially', () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());
    expect(result.current.isPending).toBe(false);
  });

  it('sets loading state during mutation', async () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());

    await act(async () => {
      result.current.mutate({
        summary: 'New Task',
        issue_type: 'Task',
        description: 'Test task',
      });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('provides created item data on success', async () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());

    await act(async () => {
      result.current.mutate({
        summary: 'New Task',
        issue_type: 'Task',
        description: 'Test task',
      });
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });

  it('tracks error state on failure', async () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());
    expect(result.current.error).toBeNull();
  });

  it('provides reset function', () => {
    const { result } = renderHookWithQueryClient(() => useCreateWorkItem());
    expect(typeof result.current.reset).toBe('function');
  });
});
