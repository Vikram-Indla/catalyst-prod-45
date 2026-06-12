/**
 * useExistingRoadmapForFilter — dedup lookup (Step 4 of filter→Roadmap vertical).
 *
 * Contract:
 *   - Queries the `filter_derived_views` table.
 *   - Filters by source_filter_id = filterId AND owner_id = userId AND type = 'roadmap'.
 *   - Resolves to the existing { id, title } when one exists, else null.
 *   - Stays disabled (no query) until BOTH filterId and userId are present.
 *
 * Mirrors useExistingBoardForFilter exactly — only table name and column names differ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useExistingRoadmapForFilter } from '@/hooks/workhub/useFilterDerivedViews';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

function makeBuilder(result: { data: any; error: any }) {
  const calls: Record<string, any[]> = {};
  const builder: any = {};
  for (const m of ['select', 'eq', 'order', 'limit']) {
    builder[m] = vi.fn((...args: any[]) => {
      (calls[m] ||= []).push(args);
      return builder;
    });
  }
  builder.then = (resolve: (v: any) => any) => Promise.resolve(result).then(resolve);
  builder.__calls = calls;
  return builder;
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

beforeEach(() => vi.clearAllMocks());

describe('useExistingRoadmapForFilter', () => {
  it('returns the existing roadmap for (filter, owner) and queries by source_filter_id, owner_id, type', async () => {
    const builder = makeBuilder({
      data: [{ id: 'view-1', title: 'Q2 Roadmap' }],
      error: null,
    });
    (supabase.from as any).mockReturnValue(builder);

    const { result } = renderHook(
      () => useExistingRoadmapForFilter('filter-1', 'user-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({ id: 'view-1', title: 'Q2 Roadmap' });

    expect(supabase.from).toHaveBeenCalledWith('filter_derived_views');
    const eqArgs = (builder.__calls.eq ?? []).map((a: any[]) => a[0]);
    expect(eqArgs).toContain('source_filter_id');
    expect(eqArgs).toContain('owner_id');
    expect(eqArgs).toContain('type');
  });

  it('returns null when no matching roadmap exists', async () => {
    const builder = makeBuilder({ data: [], error: null });
    (supabase.from as any).mockReturnValue(builder);

    const { result } = renderHook(
      () => useExistingRoadmapForFilter('filter-1', 'user-1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('stays disabled until both filterId and userId are present', () => {
    const { result } = renderHook(
      () => useExistingRoadmapForFilter(undefined, 'user-1'),
      { wrapper },
    );
    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
