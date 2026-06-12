/**
 * useExistingBoardForFilter — dedup lookup (Step 3 of filter→Kanban vertical).
 *
 * Contract (this test is the spec — implementation follows):
 *   - Queries the `boards` table.
 *   - Filters by filter_id = filterId AND created_by = userId AND deleted_at IS NULL.
 *     (A board is a duplicate only for the SAME source filter AND the SAME owner —
 *      per the agreed dedup policy: dedup on (owner, filter_id).)
 *   - Resolves to the existing { id, name } when one exists, else null.
 *   - Stays disabled (no query) until BOTH filterId and userId are present.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useExistingBoardForFilter } from '@/hooks/workhub/useSavedFilters';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

/** Chainable builder that records the filter calls and resolves a fixed result. */
function makeBuilder(result: { data: any; error: any }) {
  const calls: Record<string, any[]> = {};
  const builder: any = {};
  for (const m of ['select', 'eq', 'is', 'order', 'limit']) {
    builder[m] = vi.fn((...args: any[]) => {
      (calls[m] ||= []).push(args);
      return builder;
    });
  }
  // terminal: awaiting the builder resolves the query result
  builder.then = (resolve: (v: any) => any) => Promise.resolve(result).then(resolve);
  builder.__calls = calls;
  return builder;
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => vi.clearAllMocks());

describe('useExistingBoardForFilter', () => {
  it('returns the existing board for (filter, owner) and filters by filter_id, created_by, deleted_at IS NULL', async () => {
    const builder = makeBuilder({ data: [{ id: 'board-1', name: 'Q2 board' }], error: null });
    (supabase.from as any).mockReturnValue(builder);

    const { result } = renderHook(
      () => useExistingBoardForFilter('filter-1', 'user-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ id: 'board-1', name: 'Q2 board' });

    expect(supabase.from).toHaveBeenCalledWith('boards');
    const eqArgs = (builder.__calls.eq ?? []).map((a: any[]) => a[0]);
    expect(eqArgs).toContain('filter_id');
    expect(eqArgs).toContain('created_by');
    expect(builder.__calls.is?.[0]?.[0]).toBe('deleted_at');
  });

  it('returns null when no matching board exists', async () => {
    const builder = makeBuilder({ data: [], error: null });
    (supabase.from as any).mockReturnValue(builder);

    const { result } = renderHook(
      () => useExistingBoardForFilter('filter-1', 'user-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('stays disabled until both filterId and userId are present', () => {
    const { result } = renderHook(
      () => useExistingBoardForFilter(undefined, 'user-1'),
      { wrapper },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
