/**
 * useBrCycleTime — configurable cycle time stats across business requests.
 *
 * Contract (this test is the spec — implementation follows):
 *   - Args: { startStep: string, endStep: string }
 *   - Returns { median, avg, p90, sample_size, isLoading, isError, error }
 *   - Reads business_request_audit_logs WHERE field_changed='process_step'
 *     AND new_value IN (startStep, endStep)
 *   - Computes per-BR cycle time = created_at(new_value=endStep) - created_at(new_value=startStep) in days
 *   - Aggregates: median, avg (rounded to 1dp), p90, sample_size across all BRs
 *   - Skips BRs where either step is missing from audit logs
 *   - Unauthenticated → all stats null, no DB query
 *   - Auth loading    → isLoading=true
 *   - DB error        → isError=true, all stats null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { useBrCycleTime } from '@/hooks/useBrCycleTime';
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

/** Builds an audit log row where a BR transitioned TO newValue at dayOffset days from epoch. */
const auditRow = (brId: string, newValue: string, dayOffset: number) => ({
  business_request_id: brId,
  new_value: newValue,
  created_at: new Date(dayOffset * 86_400_000).toISOString(),
});

const mockAuditQuery = (response: { data: any; error: any }) => {
  // Chain: .from('business_request_audit_logs').select('...').eq('field_changed', 'process_step').in('new_value', [...])
  const inFn = vi.fn().mockResolvedValue(response);
  const eq = vi.fn().mockReturnValue({ in: inFn });
  const select = vi.fn().mockReturnValue({ eq });
  (supabase.from as any).mockReturnValueOnce({ select });
  return { select, eq, inFn };
};

const NULL_STATS = { median: null, avg: null, p90: null, sample_size: 0 };

describe('useBrCycleTime', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null stats when unauthenticated', async () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false, isAuthenticated: false });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject(NULL_STATS);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('reports isLoading=true while auth resolves', () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true, isAuthenticated: false });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current).toMatchObject(NULL_STATS);
  });

  it('returns null stats when audit log is empty', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockAuditQuery({ data: [], error: null });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject(NULL_STATS);
  });

  it('computes correct stats for 3 BRs with cycle times of 5, 10, 15 days', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockAuditQuery({
      data: [
        auditRow('br-1', 'funnel', 0),
        auditRow('br-1', 'done', 5),
        auditRow('br-2', 'funnel', 0),
        auditRow('br-2', 'done', 10),
        auditRow('br-3', 'funnel', 0),
        auditRow('br-3', 'done', 15),
      ],
      error: null,
    });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sample_size).toBe(3);
    expect(result.current.median).toBe(10);
    expect(result.current.avg).toBe(10);
    expect(result.current.p90).toBe(15);
  });

  it('skips BRs where start step is missing from audit logs', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockAuditQuery({
      data: [
        // br-1: both steps present → included
        auditRow('br-1', 'funnel', 0),
        auditRow('br-1', 'done', 8),
        // br-2: only endStep present → excluded
        auditRow('br-2', 'done', 5),
      ],
      error: null,
    });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sample_size).toBe(1);
    expect(result.current.median).toBe(8);
  });

  it('skips BRs where end step is missing from audit logs', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockAuditQuery({
      data: [
        auditRow('br-1', 'funnel', 0),
        auditRow('br-1', 'done', 6),
        // br-2: only startStep → excluded
        auditRow('br-2', 'funnel', 0),
      ],
      error: null,
    });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sample_size).toBe(1);
    expect(result.current.median).toBe(6);
  });

  it('queries business_request_audit_logs with correct field and step values', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    const { eq, inFn } = mockAuditQuery({ data: [], error: null });

    renderHook(
      () => useBrCycleTime({ startStep: 'ready_for_implementation', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(inFn).toHaveBeenCalled());
    expect(supabase.from).toHaveBeenCalledWith('business_request_audit_logs');
    expect(eq).toHaveBeenCalledWith('field_changed', 'process_step');
    expect(inFn).toHaveBeenCalledWith('new_value', ['ready_for_implementation', 'done']);
  });

  it('surfaces query errors via isError', async () => {
    (useAuth as any).mockReturnValue({ user: { id: 'u1' }, loading: false, isAuthenticated: true });
    mockAuditQuery({ data: null, error: new Error('permission denied') });

    const { result } = renderHook(
      () => useBrCycleTime({ startStep: 'funnel', endStep: 'done' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current).toMatchObject(NULL_STATS);
  });
});
