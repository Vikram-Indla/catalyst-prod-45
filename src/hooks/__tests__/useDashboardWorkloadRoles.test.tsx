/**
 * useDashboardWorkloadRoles — dynamic role labels for the "Who's carrying what" widget.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Returns { roles: Array<{ code, name }>, isLoading, isError, error }
 *   - Queries product_roles WHERE is_workload_relevant = true ORDER BY name
 *   - Unauthenticated → roles=[], no DB query
 *   - Auth loading    → isLoading=true
 *   - Has roles       → roles mapped from product_roles rows
 *   - Empty result    → roles=[]
 *   - DB error        → isError=true, roles=[]
 *
 * Replaces hardcoded "Delivery Managers" / "Product Owners" labels in widgets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useDashboardWorkloadRoles } from '@/hooks/useDashboardWorkloadRoles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const mockRolesQuery = (response: { data: any; error: any }) => {
  // Chain: .from('product_roles').select('code, name').eq('is_workload_relevant', true).order('name')
  const order = vi.fn().mockResolvedValue(response);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValueOnce({ select });
  return { select, eq, order };
};

describe('useDashboardWorkloadRoles', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns empty roles when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.roles).toEqual([]);
  });

  it('returns roles mapped from product_roles', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    mockRolesQuery({
      data: [
        { code: 'delivery_manager', name: 'Delivery Manager' },
        { code: 'product_owner', name: 'Product Owner' },
        { code: 'product_manager', name: 'Product Manager' },
      ],
      error: null,
    });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([
      { code: 'delivery_manager', name: 'Delivery Manager' },
      { code: 'product_owner', name: 'Product Owner' },
      { code: 'product_manager', name: 'Product Manager' },
    ]);
    expect(supabase.from).toHaveBeenCalledWith('product_roles');
  });

  it('returns empty roles when no workload-relevant roles configured', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    mockRolesQuery({ data: [], error: null });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual([]);
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    mockRolesQuery({ data: null, error: new Error('rls denied') });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.roles).toEqual([]);
  });

  it('queries with correct filters', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    const { eq, order } = mockRolesQuery({ data: [], error: null });

    const { result } = renderHook(() => useDashboardWorkloadRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(eq).toHaveBeenCalledWith('is_workload_relevant', true);
    expect(order).toHaveBeenCalledWith('name');
  });
});
