/**
 * useTeamResources — fetches resource records for all members of the
 * given project ids.
 *
 * Two-step query:
 *   1. ph_project_members WHERE project_id IN projectIds → user_ids
 *   2. resource_inventory WHERE profile_id IN user_ids, join profiles for name
 *
 * Contract (this test is the spec — implementation follows):
 *   - projectIds=[]                        → resources=[], no DB call
 *   - projectIds=[…], no member rows       → resources=[]
 *   - projectIds=[…], members with records → resources=[{resourceId, displayName}]
 *   - projectIds=[…], query error          → isError=true, resources=[]
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useTeamResources } from '@/hooks/useTeamResources';
import { supabase } from '@/integrations/supabase/client';

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

function mockTwoStepQuery(
  membersResponse: { data: any; error: any },
  resourcesResponse: { data: any; error: any },
) {
  (supabase.from as any).mockImplementation((table: string) => {
    if (table === 'ph_project_members') {
      const inFn = vi.fn().mockResolvedValue(membersResponse);
      const selectFn = vi.fn().mockReturnValue({ in: inFn });
      return { select: selectFn };
    }
    if (table === 'resource_inventory') {
      const inFn = vi.fn().mockResolvedValue(resourcesResponse);
      const selectFn = vi.fn().mockReturnValue({ in: inFn });
      return { select: selectFn };
    }
    return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [], error: null }) }) };
  });
}

describe('useTeamResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty resources and makes no DB call when projectIds is empty', async () => {
    const { result } = renderHook(() => useTeamResources([]), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.resources).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns empty resources when no project members are found', async () => {
    mockTwoStepQuery({ data: [], error: null }, { data: [], error: null });

    const { result } = renderHook(
      () => useTeamResources(['proj-aaa']),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.resources).toEqual([]);
    expect(supabase.from).toHaveBeenCalledWith('ph_project_members');
  });

  it('maps members to resources when inventory rows exist', async () => {
    mockTwoStepQuery(
      {
        data: [
          { user_id: 'user-aaa' },
          { user_id: 'user-bbb' },
        ],
        error: null,
      },
      {
        data: [
          { id: 'res-111', profile_id: 'user-aaa', profiles: { full_name: 'Alice A' } },
          { id: 'res-222', profile_id: 'user-bbb', profiles: { full_name: 'Bob B' } },
        ],
        error: null,
      },
    );

    const { result } = renderHook(
      () => useTeamResources(['proj-aaa', 'proj-bbb']),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.resources).toHaveLength(2);
    });
    expect(result.current.resources).toEqual([
      { resourceId: 'res-111', displayName: 'Alice A' },
      { resourceId: 'res-222', displayName: 'Bob B' },
    ]);
    expect(result.current.isError).toBe(false);
  });

  it('surfaces query errors via isError', async () => {
    mockTwoStepQuery(
      { data: null, error: new Error('rls denied') },
      { data: [], error: null },
    );

    const { result } = renderHook(
      () => useTeamResources(['proj-aaa']),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.resources).toEqual([]);
  });
});
