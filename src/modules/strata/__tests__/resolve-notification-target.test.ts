/**
 * Phase-5 regression — governanceApi.resolveNotificationTarget (slice 5G-2).
 *
 * This is the riskiest logic Phase 5 shipped: strata_notifications stores
 * entity_id as a UUID while STRATA routes are slug-only (SLUG CONTRACT), so
 * every entity_table needs its own id→slug hop, and the same hop decides
 * whether the notification's ask is already satisfied (the "expired" variant).
 *
 * The orphan case is NOT hypothetical: staging holds a real decision row whose
 * snapshot_id is null. It must resolve to key=null so the bell falls back to the
 * area landing rather than building a broken link.
 *
 * NB: src/test/setup.ts mocks @/integrations/supabase/client but does NOT export
 * typedQuery/typedRpc, so the domain's import would be undefined. This file's
 * vi.mock overrides it with a controllable fake.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => {
  const rows: Record<string, unknown> = {};
  const tablesQueried: string[] = [];
  const typedQuery = (table: string) => {
    tablesQueried.push(table);
    const builder: Record<string, unknown> = {};
    builder.select = () => builder;
    builder.eq = () => builder;
    builder.order = () => builder;
    builder.maybeSingle = () => Promise.resolve({ data: rows[table] ?? null, error: null });
    return builder;
  };
  return { rows, tablesQueried, typedQuery };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
  typedQuery: H.typedQuery,
  typedRpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));

import { governanceApi } from '@/modules/strata/domain';
import type { StrataNotification } from '@/modules/strata/types';

const notif = (entity_table: string | null, entity_id: string | null): StrataNotification => ({
  id: 'n1', user_id: 'u1', event_type: 'e', entity_table, entity_id,
  title: 't', body: null, read_at: null, created_at: '2026-07-16',
});

beforeEach(() => {
  for (const k of Object.keys(H.rows)) delete H.rows[k];
  H.tablesQueried.length = 0;
});

describe('resolveNotificationTarget — id→slug resolution + done-detection', () => {
  describe('strata_kpis (config_pending_approval)', () => {
    it('resolves the slug directly and reports done when the KPI is approved', async () => {
      H.rows.strata_kpis = { slug: 'otif-delivery-rate', status: 'approved' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_kpis', 'k1')))
        .toEqual({ key: 'otif-delivery-rate', done: true });
    });

    it('is NOT done while the KPI is still pending_approval', async () => {
      H.rows.strata_kpis = { slug: 'otif-delivery-rate', status: 'pending_approval' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_kpis', 'k1')))
        .toEqual({ key: 'otif-delivery-rate', done: false });
    });
  });

  describe('strata_benefit_values (benefit_validation_requested)', () => {
    it('hops benefit_value → benefit to get the slug; not done while validated_at is null', async () => {
      H.rows.strata_benefit_values = { benefit_id: 'b1', validated_at: null };
      H.rows.strata_benefits = { slug: 'ops-cost-reduction-automation' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_benefit_values', 'bv1')))
        .toEqual({ key: 'ops-cost-reduction-automation', done: false });
      expect(H.tablesQueried).toEqual(['strata_benefit_values', 'strata_benefits']);
    });

    it('is done once validated_at is set (expired variant)', async () => {
      H.rows.strata_benefit_values = { benefit_id: 'b1', validated_at: '2026-07-11' };
      H.rows.strata_benefits = { slug: 'ops-cost-reduction-automation' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_benefit_values', 'bv1')))
        .toEqual({ key: 'ops-cost-reduction-automation', done: true });
    });
  });

  describe('strata_decisions (decision_assigned)', () => {
    it('hops decision → snapshot for the snapshot_key; done once decided_at is set', async () => {
      H.rows.strata_decisions = { snapshot_id: 's1', decided_at: '2026-07-10' };
      H.rows.strata_snapshots = { snapshot_key: 'SNAP-1001' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_decisions', 'd1')))
        .toEqual({ key: 'SNAP-1001', done: true });
    });

    it('ORPHAN (real staging row): a null snapshot_id yields key=null so the bell falls back to the area, not a broken link', async () => {
      H.rows.strata_decisions = { snapshot_id: null, decided_at: null };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_decisions', 'd-orphan')))
        .toEqual({ key: null, done: false });
      // it must NOT go looking for a snapshot it knows isn't there
      expect(H.tablesQueried).toEqual(['strata_decisions']);
    });
  });

  describe('strata_dependencies (blocker_opened)', () => {
    it.each([
      ['resolved', true],
      ['cancelled', true],
      ['open', false],
      ['blocked', false],
      ['at_risk', false],
    ])('status %s → done=%s', async (status, done) => {
      H.rows.strata_dependencies = { requesting_id: 'c1', status };
      H.rows.strata_project_cards = { slug: 'inspection-project-2' };
      expect(await governanceApi.resolveNotificationTarget(notif('strata_dependencies', 'dep1')))
        .toEqual({ key: 'inspection-project-2', done });
    });
  });

  describe('degenerate inputs never fabricate a link', () => {
    it('returns key=null when entity_id is null', async () => {
      expect(await governanceApi.resolveNotificationTarget(notif('strata_kpis', null)))
        .toEqual({ key: null, done: false });
      expect(H.tablesQueried).toEqual([]); // no query attempted
    });

    it('returns key=null for an entity_table with no resolver', async () => {
      expect(await governanceApi.resolveNotificationTarget(notif('strata_something_else', 'x1')))
        .toEqual({ key: null, done: false });
    });

    it('returns key=null when the object has been deleted (row missing)', async () => {
      // H.rows.strata_kpis intentionally unset → maybeSingle yields null
      expect(await governanceApi.resolveNotificationTarget(notif('strata_kpis', 'gone')))
        .toEqual({ key: null, done: false });
    });
  });
});
