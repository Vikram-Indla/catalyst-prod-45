import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useBusinessRequestHealth } from '../useBusinessRequestHealth';

// Mock supabase — must be hoisted before imports in vitest
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock both engines
vi.mock('@/lib/date-pulse/DatePulseEngine', () => ({
  computeDatePulseViolations: vi.fn(() => []),
}));

vi.mock('@/lib/date-pulse/HealthStatusEngine', () => ({
  computeHealthStatus: vi.fn(() => 'Uncommitted'),
}));

import { supabase } from '@/integrations/supabase/client';
import { computeDatePulseViolations } from '@/lib/date-pulse/DatePulseEngine';
import { computeHealthStatus } from '@/lib/date-pulse/HealthStatusEngine';

const MOCK_BR = {
  id: 'br-uuid-1',
  request_key: 'MDT-100',
  title: 'Test BR',
  end_date: '2026-12-31',
  process_step: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  request_type: 'feature',
  urgency: 'medium',
  product_id: 'prod-1',
  release_id: null,
};

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

function mockSupabaseChain(data: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  (supabase as any).from = vi.fn().mockReturnValue(chain);
  return chain;
}

describe('useBusinessRequestHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null health when brId is undefined', async () => {
    const { result } = renderHook(() => useBusinessRequestHealth(undefined), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });

  it('returns null when brId is null', async () => {
    const { result } = renderHook(() => useBusinessRequestHealth(null), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });

  it('uses request_key lookup when brId is not a UUID', async () => {
    const chain = mockSupabaseChain(MOCK_BR);
    const { result } = renderHook(() => useBusinessRequestHealth('MDT-100'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Verify eq was called with 'request_key' not 'id'
    expect(chain.eq).toHaveBeenCalledWith('request_key', 'MDT-100');
  });

  it('uses id lookup when brId is a UUID', async () => {
    const chain = mockSupabaseChain(MOCK_BR);
    const uuid = 'br-uuid-1-xxxx-0000-0000-000000000000';
    const { result } = renderHook(() => useBusinessRequestHealth(uuid), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(chain.eq).toHaveBeenCalledWith('id', uuid);
  });

  it('returns null when BR not found', async () => {
    mockSupabaseChain(null, { message: 'Not found', code: 'PGRST116' });
    const { result } = renderHook(() => useBusinessRequestHealth('MDT-999'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.health).toBeNull();
  });

  it('calls both engines and returns BusinessRequestHealth shape', async () => {
    mockSupabaseChain(MOCK_BR);
    vi.mocked(computeHealthStatus).mockReturnValue('Uncommitted');
    vi.mocked(computeDatePulseViolations).mockReturnValue([]);

    const { result } = renderHook(() => useBusinessRequestHealth('MDT-100'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.health).not.toBeNull());

    const h = result.current.health!;
    expect(h.health_status).toBe('Uncommitted');
    expect(Array.isArray(h.date_pulse_violations)).toBe(true);
    expect(typeof h.violation_count).toBe('number');
    expect(typeof h.linked_work_count).toBe('number');
    expect(typeof h.evaluated_at).toBe('string');
  });

  it('calls computeDatePulseViolations with correct BR model', async () => {
    mockSupabaseChain(MOCK_BR);
    const { result } = renderHook(() => useBusinessRequestHealth('MDT-100'), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.health).not.toBeNull());

    expect(computeDatePulseViolations).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'br-uuid-1',
        request_key: 'MDT-100',
        status: 'active',
        end_date: '2026-12-31',
      }),
      expect.any(Array),
      null,
    );
  });
});
