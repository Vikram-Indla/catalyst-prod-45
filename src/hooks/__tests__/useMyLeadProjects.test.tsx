/**
 * useMyLeadProjects — lead-scope hook.
 *
 * Resolves the set of projects the current user leads (ph_project_members
 * where user_id = auth.uid() AND role = 'lead'), joining to ph_projects to
 * return both id (uuid) and key (text) so downstream callers can filter
 * either by uuid (for project-id joins) or by key (for ph_issues joins).
 *
 * Powers:
 *   - RouteRoleGuard on /my-team   (gate: projects.length > 0)
 *   - MyTeamResourcesPage          (list resources in lead's projects)
 *   - R360MemberDetail projectScope prop
 *
 * Contract (this test is the spec — implementation follows):
 *   - Returns { projects: Array<{ id, key }>, isLoading, isError, error }
 *   - Unauthenticated → projects=[], no DB query
 *   - Auth loading    → isLoading=true
 *   - No lead rows    → projects=[]
 *   - Has lead rows   → projects mapped from the join
 *   - Query error     → isError=true, projects=[]
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useMyLeadProjects } from '@/hooks/useMyLeadProjects';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/useAuth');

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

const mockLeadQuery = (response: { data: any; error: any }) => {
  // Chain: .from('ph_project_members').select(...).eq('user_id', x).eq('role', 'lead')
  const eqRole = vi.fn().mockResolvedValue(response);
  const eqUser = vi.fn().mockReturnValue({ eq: eqRole });
  const select = vi.fn().mockReturnValue({ eq: eqUser });
  (supabase.from as any).mockReturnValue({ select });
  return { select, eqUser, eqRole };
};

describe('useMyLeadProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty projects when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(() => useMyLeadProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.projects).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(() => useMyLeadProjects(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.projects).toEqual([]);
  });

  it('returns empty projects when user leads no projects', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '11111111-1111-1111-1111-111111111111' },
      loading: false,
      isAuthenticated: true,
    });
    mockLeadQuery({ data: [], error: null });

    const { result } = renderHook(() => useMyLeadProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.projects).toEqual([]);
    expect(supabase.from).toHaveBeenCalledWith('ph_project_members');
  });

  it('returns projects mapped from the join when user leads multiple projects', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '22222222-2222-2222-2222-222222222222' },
      loading: false,
      isAuthenticated: true,
    });
    const { eqUser, eqRole } = mockLeadQuery({
      data: [
        { ph_projects: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', key: 'BAU' } },
        { ph_projects: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', key: 'IRP' } },
      ],
      error: null,
    });

    const { result } = renderHook(() => useMyLeadProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(2);
    });
    expect(result.current.projects).toEqual([
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', key: 'BAU' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', key: 'IRP' },
    ]);
    expect(eqUser).toHaveBeenCalledWith('user_id', '22222222-2222-2222-2222-222222222222');
    expect(eqRole).toHaveBeenCalledWith('role', 'lead');
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: '33333333-3333-3333-3333-333333333333' },
      loading: false,
      isAuthenticated: true,
    });
    mockLeadQuery({ data: null, error: new Error('rls denied') });

    const { result } = renderHook(() => useMyLeadProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.projects).toEqual([]);
  });
});
