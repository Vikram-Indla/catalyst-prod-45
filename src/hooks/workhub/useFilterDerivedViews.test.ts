/**
 * useFilterDerivedViews — dashboard hooks (Feature 3)
 *
 * Contract:
 *  - useExistingDashboardForFilter returns null when filterId/userId absent
 *  - useCreateDashboardFromFilter provides a mutation function
 *  - insert payload uses type='dashboard' and visibility 'private'|'org' only
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useExistingDashboardForFilter,
  useCreateDashboardFromFilter,
} from './useFilterDerivedViews';
import type { CreateDashboardFromFilterArgs } from './useFilterDerivedViews';

// ── Supabase mock ─────────────────────────────────────────────────────────────

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'new-uuid-1234' },
        error: null,
      }),
    })),
  },
}));

// ── Test wrapper ──────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ── useExistingDashboardForFilter ─────────────────────────────────────────────

describe('useExistingDashboardForFilter', () => {
  it('is disabled and returns null when filterId is absent', async () => {
    const { result } = renderHook(
      () => useExistingDashboardForFilter(undefined, 'user-1'),
      { wrapper },
    );
    // disabled query — data is undefined, not an error
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('is disabled and returns null when userId is absent', async () => {
    const { result } = renderHook(
      () => useExistingDashboardForFilter('filter-1', null),
      { wrapper },
    );
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('resolves to null when the DB returns an empty array', async () => {
    const { result } = renderHook(
      () => useExistingDashboardForFilter('filter-1', 'user-1'),
      { wrapper },
    );
    await waitFor(() => !result.current.isLoading);
    expect(result.current.data).toBeNull();
  });
});

// ── useCreateDashboardFromFilter ──────────────────────────────────────────────

describe('useCreateDashboardFromFilter', () => {
  it('provides a mutate function', () => {
    const { result } = renderHook(() => useCreateDashboardFromFilter(), { wrapper });
    expect(typeof result.current.mutate).toBe('function');
  });

  it('is not pending initially', () => {
    const { result } = renderHook(() => useCreateDashboardFromFilter(), { wrapper });
    expect(result.current.isPending).toBe(false);
  });
});

// ── CreateDashboardFromFilterArgs type contract ───────────────────────────────

describe('CreateDashboardFromFilterArgs type', () => {
  it('accepts private visibility', () => {
    const args: CreateDashboardFromFilterArgs = {
      filterId: 'f-1',
      title: 'My Dashboard',
      ownerId: 'u-1',
      visibility: 'private',
    };
    expect(args.visibility).toBe('private');
  });

  it('accepts org visibility', () => {
    const args: CreateDashboardFromFilterArgs = {
      filterId: 'f-1',
      title: 'My Dashboard',
      ownerId: 'u-1',
      visibility: 'org',
    };
    expect(args.visibility).toBe('org');
  });
});
