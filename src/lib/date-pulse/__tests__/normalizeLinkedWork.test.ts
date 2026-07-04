import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mutable table data, set per-test. Hoisted so the vi.mock factory can close
// over it before the module under test imports the supabase client.
const store = vi.hoisted(() => ({ tables: {} as Record<string, any[]> }));

vi.mock('@/integrations/supabase/client', () => {
  let currentTable = '';
  const builder: any = {
    from(t: string) { currentTable = t; return builder; },
    select() { return builder; },
    in() { return builder; },
    eq() { return builder; },
    is() { return builder; },
    limit() { return builder; },
    // Thenable: awaiting any point in the chain resolves the current table's rows.
    then(resolve: any) {
      return Promise.resolve({ data: store.tables[currentTable] ?? [], error: null }).then(resolve);
    },
  };
  return { supabase: builder };
});

import { fetchLinkedWorkForBRs } from '../normalizeLinkedWork';

beforeEach(() => {
  store.tables = {};
});

describe('fetchLinkedWorkForBRs', () => {
  it('returns empty map for no BR ids without querying', async () => {
    const result = await fetchLinkedWorkForBRs([]);
    expect(result.size).toBe(0);
  });

  it('excludes epics (grouping containers) from linked work', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'br1', linked_item_id: 'epic1', linked_item_type: 'epic' },
      { business_request_id: 'br1', linked_item_id: 'feat1', linked_item_type: 'feature' },
    ];
    store.tables.features = [
      { id: 'feat1', display_id: 'F-1', status: 'implementing', blocked: false, planned_end_date: '2026-12-01', created_at: 'c', updated_at: 'u' },
    ];
    const result = await fetchLinkedWorkForBRs(['br1']);
    const work = result.get('br1')!;
    expect(work).toHaveLength(1);
    expect(work[0].issue_type).toBe('feature');
    expect(work.some(w => w.issue_type === 'epic')).toBe(false);
  });

  it('maps feature status → canonical buckets and blocked precedence', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'br1', linked_item_id: 'f_done', linked_item_type: 'feature' },
      { business_request_id: 'br1', linked_item_id: 'f_funnel', linked_item_type: 'feature' },
      { business_request_id: 'br1', linked_item_id: 'f_impl', linked_item_type: 'feature' },
      { business_request_id: 'br1', linked_item_id: 'f_blocked', linked_item_type: 'feature' },
    ];
    store.tables.features = [
      { id: 'f_done', display_id: 'F-1', status: 'done', blocked: false, planned_end_date: null, created_at: 'c', updated_at: 'u' },
      { id: 'f_funnel', display_id: 'F-2', status: 'funnel', blocked: false, planned_end_date: null, created_at: 'c', updated_at: 'u' },
      { id: 'f_impl', display_id: 'F-3', status: 'implementing', blocked: false, planned_end_date: '2026-11-30', created_at: 'c', updated_at: 'u' },
      { id: 'f_blocked', display_id: 'F-4', status: 'implementing', blocked: true, planned_end_date: null, created_at: 'c', updated_at: 'u' },
    ];
    const byKey = new Map((await fetchLinkedWorkForBRs(['br1'])).get('br1')!.map(w => [w.issue_key, w]));
    expect(byKey.get('F-1')!.status).toBe('done');
    expect(byKey.get('F-2')!.status).toBe('backlog');
    expect(byKey.get('F-3')!.status).toBe('implementing'); // in-progress bucket
    expect(byKey.get('F-3')!.due_date).toBe('2026-11-30');
    expect(byKey.get('F-4')!.status).toBe('blocked'); // blocked bool wins
  });

  it('maps story status and always nulls story due_date (no date column)', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'br1', linked_item_id: 's_todo', linked_item_type: 'story' },
      { business_request_id: 'br1', linked_item_id: 's_prog', linked_item_type: 'story' },
      { business_request_id: 'br1', linked_item_id: 's_blocked', linked_item_type: 'story' },
    ];
    store.tables.stories = [
      { id: 's_todo', story_key: 'S-1', status: 'todo', blocked: false, created_at: 'c', updated_at: 'u' },
      { id: 's_prog', story_key: 'S-2', status: 'in_progress', blocked: false, created_at: 'c', updated_at: 'u' },
      { id: 's_blocked', story_key: 'S-3', status: 'in_progress', blocked: true, created_at: 'c', updated_at: 'u' },
    ];
    const byKey = new Map((await fetchLinkedWorkForBRs(['br1'])).get('br1')!.map(w => [w.issue_key, w]));
    expect(byKey.get('S-1')!.status).toBe('todo');
    expect(byKey.get('S-2')!.status).toBe('in_progress');
    expect(byKey.get('S-3')!.status).toBe('blocked');
    expect([...byKey.values()].every(w => w.due_date === null)).toBe(true);
  });

  it('null source status → null (zero-assumption, never fabricated)', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'br1', linked_item_id: 'f_null', linked_item_type: 'feature' },
    ];
    store.tables.features = [
      { id: 'f_null', display_id: 'F-9', status: null, blocked: false, planned_end_date: null, created_at: 'c', updated_at: 'u' },
    ];
    const work = (await fetchLinkedWorkForBRs(['br1'])).get('br1')!;
    expect(work[0].status).toBeNull();
  });

  it('skips links whose target row is missing (soft-deleted)', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'br1', linked_item_id: 'gone', linked_item_type: 'feature' },
    ];
    store.tables.features = []; // target filtered out by deleted_at
    const result = await fetchLinkedWorkForBRs(['br1']);
    expect(result.get('br1')).toBeUndefined();
  });

  it('stamps business_request_id onto each returned item', async () => {
    store.tables.business_request_links = [
      { business_request_id: 'brX', linked_item_id: 'f1', linked_item_type: 'feature' },
    ];
    store.tables.features = [
      { id: 'f1', display_id: 'F-1', status: 'done', blocked: false, planned_end_date: null, created_at: 'c', updated_at: 'u' },
    ];
    const work = (await fetchLinkedWorkForBRs(['brX'])).get('brX')!;
    expect(work[0].business_request_id).toBe('brX');
  });
});
