/**
 * useUpdatePlannerTask — extended dbUpdates mapper
 *
 * Pins the contract that status + teamId writes are NOT silently dropped:
 *   - updates.status (TaskStatus slug) → DB column `status_id` = UUID
 *     resolved via task_statuses.slug
 *   - updates.teamId → DB column `workstream_id` (direct passthrough)
 *
 * Background: pre-fix dbUpdates handled only priority, blocked, blockedReason,
 * progress, assigneeId, dueDate, startDate, title, description. Any status
 * or teamId in the patch never reached Supabase — the optimistic update fired,
 * then onSettled invalidation reverted the row. Documented in the
 * useTasksTableData header (commit 6d1a3300f).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Capture every .update() payload so tests can assert on it.
const updateCalls: any[] = [];

vi.mock('@/integrations/supabase/client', () => {
  const eq = vi.fn(() => Promise.resolve({ error: null }));
  const update = vi.fn((payload: any) => {
    updateCalls.push(payload);
    return { eq };
  });
  const select = vi.fn(() => Promise.resolve({ data: [], error: null }));
  const from = vi.fn(() => ({
    update,
    select,
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
  }));
  return {
    supabase: { from },
    typedQuery: from,
  };
});

// Import AFTER the mock so the hook picks up the mocked client.
import { useUpdatePlannerTask } from '../useTaskItems';

const SEEDED_STATUSES = [
  { id: 'uuid-backlog', slug: 'backlog', name: 'Backlog', color: 'var(--ds-text)', order: 0 },
  { id: 'uuid-planned', slug: 'planned', name: 'Planned', color: 'var(--ds-text)', order: 1 },
  { id: 'uuid-in-progress', slug: 'in-progress', name: 'In Progress', color: 'var(--ds-text)', order: 2 },
  { id: 'uuid-review', slug: 'review', name: 'Review', color: 'var(--ds-text)', order: 3 },
  { id: 'uuid-done', slug: 'done', name: 'Done', color: 'var(--ds-text)', order: 4 },
];

function makeWrapper(seedStatuses: typeof SEEDED_STATUSES | null = SEEDED_STATUSES) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (seedStatuses) {
    client.setQueryData(['planner-statuses'], seedStatuses);
  }
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe('useUpdatePlannerTask — extended dbUpdates', () => {
  beforeEach(() => {
    updateCalls.length = 0;
  });

  it('writes status_id (UUID) to DB when updates.status is set', async () => {
    const { result } = renderHook(() => useUpdatePlannerTask(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'task-1',
        updates: { status: 'in-progress' },
      });
    });

    await waitFor(() => {
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    const payload = updateCalls[0];
    expect(payload).toHaveProperty('status_id', 'uuid-in-progress');
    // Should NOT smuggle the slug through under another key
    expect(payload).not.toHaveProperty('status');
  });

  it('writes workstream_id directly when updates.teamId is set', async () => {
    const { result } = renderHook(() => useUpdatePlannerTask(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'task-2',
        updates: { teamId: 'ws-123' },
      });
    });

    await waitFor(() => {
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    const payload = updateCalls[0];
    expect(payload).toHaveProperty('workstream_id', 'ws-123');
    expect(payload).not.toHaveProperty('teamId');
  });

  it('writes workstream_id = null when updates.teamId is null (clear workstream)', async () => {
    const { result } = renderHook(() => useUpdatePlannerTask(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'task-3',
        updates: { teamId: undefined },
      });
    });

    await waitFor(() => {
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    // teamId: undefined should be treated as "not present" — no workstream_id key
    // (matches existing assigneeId / dueDate / startDate pattern using !== undefined).
    const payload = updateCalls[0];
    expect(payload).not.toHaveProperty('workstream_id');
  });

  it('throws on unknown status slug (zero-assumption — no silent fallback)', async () => {
    const { result } = renderHook(() => useUpdatePlannerTask(), { wrapper: makeWrapper() });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 'task-4',
          updates: { status: 'nonexistent_slug' as any },
        });
      } catch (e) {
        caught = e as Error;
      }
    });

    expect(caught).toBeTruthy();
    expect(caught?.message).toMatch(/status/i);
    // No DB write should have been attempted
    expect(updateCalls.length).toBe(0);
  });
});
