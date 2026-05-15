/**
 * useBrLandingStep — reads the admin-configured Definition of Done step.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Returns { landingStep: { id, value, label, sort_order } | null, isLoading, isError, error }
 *   - Reads demand_process_steps WHERE is_landing=true AND is_active=true LIMIT 1
 *   - Unauthenticated → landingStep=null, no DB query
 *   - Auth loading    → isLoading=true
 *   - Step configured → returns the step
 *   - No step marked  → landingStep=null
 *   - DB error        → isError=true, landingStep=null
 *
 * Powers Widget 5 Recent Releases (configurable Definition of Done).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useBrLandingStep } from '@/hooks/useBrLandingStep';
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

const mockLandingQuery = (response: { data: any; error: any }) => {
  // Chain: .from('demand_process_steps').select('...').eq('is_landing',true).eq('is_active',true).maybeSingle()
  const maybeSingle = vi.fn().mockResolvedValue(response);
  const eqActive = vi.fn().mockReturnValue({ maybeSingle });
  const eqLanding = vi.fn().mockReturnValue({ eq: eqActive });
  const select = vi.fn().mockReturnValue({ eq: eqLanding });
  (supabase.from as any).mockReturnValueOnce({ select });
  return { select, eqLanding, eqActive, maybeSingle };
};

describe('useBrLandingStep', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.landingStep).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.landingStep).toBeNull();
  });

  it('returns the configured landing step', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    const step = { id: 'step-uuid-1', value: 'done', label: 'Done', sort_order: 11 };
    mockLandingQuery({ data: step, error: null });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.landingStep).toEqual(step);
    expect(supabase.from).toHaveBeenCalledWith('demand_process_steps');
  });

  it('returns null when no step is marked as landing', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    mockLandingQuery({ data: null, error: null });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.landingStep).toBeNull();
  });

  it('queries with correct filters', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    const { eqLanding, eqActive } = mockLandingQuery({ data: null, error: null });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(eqLanding).toHaveBeenCalledWith('is_landing', true);
    expect(eqActive).toHaveBeenCalledWith('is_active', true);
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isAuthenticated: true,
    });
    mockLandingQuery({ data: null, error: new Error('rls denied') });

    const { result } = renderHook(() => useBrLandingStep(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.landingStep).toBeNull();
  });
});
