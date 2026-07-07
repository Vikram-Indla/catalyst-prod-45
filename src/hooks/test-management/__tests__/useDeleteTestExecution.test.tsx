/**
 * useDeleteTestExecution — execution delete with cycle guard.
 *
 * Contract:
 *   - Counts tm_test_cycles rows with execution_id = id BEFORE deleting.
 *   - count > 0 → throws with a message naming the cycle count; NO delete issued.
 *   - count = 0 → deletes the tm_test_executions row.
 *   - Delete error → surfaces as mutation error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useDeleteTestExecution } from '@/hooks/test-management/useTestExecutions';
import { typedQuery } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  typedQuery: vi.fn(),
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

/** Mocks the cycle-count probe: .select('id', {count,head}).eq('execution_id', id) */
const mockCycleCount = (count: number, error: unknown = null) => {
  const eq = vi.fn().mockResolvedValue({ count, error });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq };
};

/** Mocks the delete chain: .delete().eq('id', id) */
const mockDelete = (error: unknown = null) => {
  const eq = vi.fn().mockResolvedValue({ error });
  const del = vi.fn().mockReturnValue({ eq });
  return { delete: del, eq };
};

describe('useDeleteTestExecution', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('blocks deletion when the execution contains cycles', async () => {
    const countChain = mockCycleCount(3);
    const deleteChain = mockDelete();
    (typedQuery as any).mockImplementation((table: string) =>
      table === 'tm_test_cycles' ? countChain : deleteChain,
    );

    const { result } = renderHook(() => useDeleteTestExecution(), { wrapper });
    result.current.mutate({ id: 'exec-1', projectId: 'proj-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/3 cycles/);
    expect(deleteChain.delete).not.toHaveBeenCalled();
  });

  it('deletes when the execution has no cycles', async () => {
    const countChain = mockCycleCount(0);
    const deleteChain = mockDelete();
    (typedQuery as any).mockImplementation((table: string) =>
      table === 'tm_test_cycles' ? countChain : deleteChain,
    );

    const { result } = renderHook(() => useDeleteTestExecution(), { wrapper });
    result.current.mutate({ id: 'exec-1', projectId: 'proj-1' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(countChain.eq).toHaveBeenCalledWith('execution_id', 'exec-1');
    expect(deleteChain.delete).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'exec-1');
  });

  it('surfaces a delete failure as a mutation error', async () => {
    const countChain = mockCycleCount(0);
    const deleteChain = mockDelete(new Error('RLS says no'));
    (typedQuery as any).mockImplementation((table: string) =>
      table === 'tm_test_cycles' ? countChain : deleteChain,
    );

    const { result } = renderHook(() => useDeleteTestExecution(), { wrapper });
    result.current.mutate({ id: 'exec-1', projectId: 'proj-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
