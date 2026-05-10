/**
 * useMyResource — identity bridge hook.
 *
 * Maps auth.user.id → resource_inventory.id (the canonical R360 entity id
 * used in URLs and as r360_ai_*.resource_id). Powers the IC persona's `/me`
 * route and the avatar dropdown's "My 360°" entry.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Returns { resourceId: string | null, isLoading: boolean, isError: boolean }
 *   - Unauthenticated  → { resourceId: null, isLoading: false }
 *   - Auth loading     → { resourceId: null, isLoading: true }
 *   - Authenticated, no resource_inventory row → { resourceId: null, isLoading: false }
 *   - Authenticated, mapped → { resourceId: '<inv.id>', isLoading: false }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useMyResource } from '@/hooks/useMyResource';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const mockInventoryQuery = (response: { data: any; error: any }) => {
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValue({ select });
  return { select, eq, maybeSingle };
};

describe('useMyResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null resourceId when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(() => useMyResource(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.resourceId).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(() => useMyResource(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.resourceId).toBeNull();
  });

  it('returns null resourceId when auth user has no resource_inventory row', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '11111111-1111-1111-1111-111111111111' },
      loading: false,
      isAuthenticated: true,
    });
    mockInventoryQuery({ data: null, error: null });

    const { result } = renderHook(() => useMyResource(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.resourceId).toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('resource_inventory');
  });

  it('returns the resource_inventory.id when auth user maps to a resource', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '22222222-2222-2222-2222-222222222222' },
      loading: false,
      isAuthenticated: true,
    });
    const { eq } = mockInventoryQuery({
      data: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
      error: null,
    });

    const { result } = renderHook(() => useMyResource(), { wrapper });

    await waitFor(() => {
      expect(result.current.resourceId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });
    expect(supabase.from).toHaveBeenCalledWith('resource_inventory');
    expect(eq).toHaveBeenCalledWith('profile_id', '22222222-2222-2222-2222-222222222222');
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '33333333-3333-3333-3333-333333333333' },
      loading: false,
      isAuthenticated: true,
    });
    mockInventoryQuery({ data: null, error: new Error('rls denied') });

    const { result } = renderHook(() => useMyResource(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.resourceId).toBeNull();
  });
});
