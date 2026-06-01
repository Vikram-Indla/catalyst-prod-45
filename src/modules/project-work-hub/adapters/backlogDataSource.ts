/**
 * backlogDataSource.ts — optional adapter interface for BacklogPage.
 *
 * BacklogPage normally reads from ph_issues (project hub). When a
 * BacklogDataSource is passed as the optional `dataSource` prop, the page uses
 * the adapter for data, mutations, and status vocabulary instead.
 *
 * For the product hub (/product-hub/:key/backlog) the adapter wraps
 * business_requests + demand_process_steps. All other behavior (toolbar,
 * table, Ask Caty, column picker, bulk-select, inline create) is inherited
 * from the canonical BacklogPage unchanged.
 *
 * Zero changes to BacklogPage's project-hub behavior when dataSource is absent.
 */

import { useMemo, useCallback } from 'react';
import type { FC } from 'react';
import type { BacklogStory, BacklogEpic } from '../types/backlog.types';
import type { StatusOption, LozengeAppearance } from '@/components/shared/JiraTable';
import {
  useBusinessRequestsByProduct,
  useCreateBusinessRequest,
  useDeleteBusinessRequest,
  useUpdateBusinessRequest,
} from '@/hooks/useBusinessRequests';
import {
  useActiveDemandProcessSteps,
  stepToLozengeAppearance,
} from '@/hooks/useDemandProcessSteps';
import type { BusinessRequest } from '@/types/business-request';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Source sentinel used on BacklogItem.source for adapter-owned rows.
 * BacklogPage (which is @ts-nocheck) checks `item.source === BIZ_SOURCE`
 * to route mutations to the adapter instead of ph_issues.
 */
export const BIZ_SOURCE = 'biz' as const;

// Field map: BacklogPage patch key → business_requests column name.
// Only explicitly listed keys are written; unknown keys are silently dropped
// to prevent Supabase errors from non-existent columns.
const BIZ_PATCH_MAP: Record<string, string> = {
  title: 'title',
  status: 'process_step',
  priority: 'urgency',
  due_date: 'end_date',
};

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ProductInfo {
  id: string;    // products.id UUID
  name: string;
  code: string;  // e.g. 'INV'
}

/**
 * Optional data-source override for BacklogPage.
 * Provides the full set of seam-points BacklogPage needs to swap from
 * ph_issues to an alternative store (business_requests).
 */
export interface BacklogDataSource {
  /** Identifies adapter-owned BacklogItem rows (value: 'biz'). */
  sourceTag: typeof BIZ_SOURCE;

  /** Additional story rows merged with ph_issues stories. */
  extraStories: BacklogStory[];
  /** Additional epic rows (always empty for flat data sources). */
  extraEpics: BacklogEpic[];
  /** True while adapter data is loading. */
  isLoading: boolean;

  // Status vocabulary —————————————————————————————————————————
  /** Replaces BacklogPage's static STATUS_OPTIONS. */
  statusOptions: StatusOption[];
  /** Replaces BacklogPage's static statusAppearance() function. */
  statusAppearance: (status: string | null | undefined) => LozengeAppearance;
  /** Replaces BacklogPage's static statusLabel() function. */
  statusLabel: (status: string | null | undefined) => string;
  /** Replaces BacklogPage's ALL_BACKLOG_STATUSES array. */
  allStatuses: string[];

  // Navigation ————————————————————————————————————————————————
  /**
   * Opens an adapter-owned item in its detail view.
   * BacklogPage calls this instead of navigate(detailHref) when
   * item.source === sourceTag.
   * @param key  display key (e.g. 'MIM-001')
   * @param id   BacklogItem.id (= request_key for business_requests)
   */
  onOpenItem: (key: string | null, id: string) => void;

  // Mutations —————————————————————————————————————————————————
  /**
   * Called by BacklogPage's updateField mutation when item.source === sourceTag.
   * @param id    BacklogItem.id (= request_key)
   * @param patch BacklogPage-internal field names (title, status, priority…)
   */
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  /** Called by BacklogPage's deleteItem mutation when item.source === sourceTag. */
  onDelete: (id: string) => Promise<void>;
  /** Called by BacklogPage's bulkDelete mutation for adapter-owned IDs. */
  onBulkDelete: (ids: string[]) => Promise<void>;
  /** Called by inline create, sticky footer create, and BottomCreateRow. */
  onCreate: (input: { title: string }) => Promise<void>;
  /** Called by the drag-to-rank DnD monitor. Optional. */
  onSetRank?: (id: string, rank: number) => Promise<void>;

  // Cache invalidation ————————————————————————————————————————
  /**
   * Keys to invalidate after BacklogPage mutations complete.
   * Appended to BacklogPage's own ph_issues invalidations.
   */
  invalidationKeys: readonly (readonly unknown[])[];

  // UI overrides ——————————————————————————————————————————————
  /**
   * Optional chrome band header component.
   * When provided, renders instead of <ProjectHeaderChip projectKey={...} />.
   */
  ChromeHeader?: FC<{ productCode: string; productName: string }>;

  /** Product UUID — forwarded to CreateBusinessRequestModal. */
  productId: string;
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

/**
 * Maps a BusinessRequest DB row to the BacklogStory shape that BacklogPage
 * normalises into BacklogItem rows.
 *
 * Key decisions:
 * - id = request_key (MIM-001) so openDetail / href / mutations use a
 *   human-readable key. The adapter's onUpdate/onDelete look up the UUID
 *   internally via the rows closure.
 * - source = BIZ_SOURCE ('biz') so BacklogPage routes all mutations to the
 *   adapter instead of ph_issues.
 * - issue_type = request_type. BacklogPage's getIcon callback checks
 *   source === 'biz' first and renders the Business Request icon directly.
 */
function bizRequestToBacklogStory(r: BusinessRequest): BacklogStory {
  const raw = r as any;
  return {
    id: r.request_key,
    story_key: r.request_key,
    title: r.title ?? '',
    name: r.title ?? null,
    description: null,
    status: r.process_step ?? null,
    feature_id: null,
    assignee_id: null,
    // 2026-06-01: business_requests columns are `assignee` and `requestor`
    // (plain text names). The previous mapping read non-existent
    // `assignee_name` / `requestor_name` → every row rendered "Unassigned"
    // (78/78 on INV). Read the real columns instead.
    assignee_name: (r as any).assignee ?? null,
    reporter_name: (r as any).requestor ?? null,
    start_date: r.start_date ?? null,
    priority: r.urgency ? r.urgency.toLowerCase() : null,
    deleted_at: null,
    jira_created_at: raw.created_at ?? null,
    jira_updated_at: raw.updated_at ?? null,
    // 'biz' routes all mutations to the adapter; @ts-nocheck in BacklogPage
    // means this non-union value doesn't cause TypeScript errors there.
    source: BIZ_SOURCE as any,
    issue_type: raw.request_type ?? 'Business Request',
    parent_key: null,
    parent_summary: null,
    labels: null,
    fix_versions: null,
    rank_order: typeof r.rank === 'number' ? r.rank : null,
    feature: null,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useBusinessRequestsSource — builds a BacklogDataSource for the product hub.
 *
 * Call this in the product-hub entry wrapper and pass the result to
 * <BacklogPage dataSource={...} />.
 *
 * Returns null while the product is not yet resolved. BacklogPage falls
 * through to its default ph_issues behavior when dataSource is null/undefined.
 *
 * @example
 *   const ds = useBusinessRequestsSource(product);
 *   if (!ds) return <Spinner />;
 *   return <BacklogPage projectId={product.id} projectKey={product.code} dataSource={ds} />;
 */
export function useBusinessRequestsSource(product: ProductInfo | null): BacklogDataSource | null {
  const { data: rows = [], isLoading } = useBusinessRequestsByProduct(product?.id ?? null);
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  const createMutation = useCreateBusinessRequest();
  const deleteMutation = useDeleteBusinessRequest();
  const updateMutation = useUpdateBusinessRequest();
  const globalOpenDetail = useGlobalSearchStore(s => s.openDetail);

  const stepMap = useMemo(
    () => new Map(processSteps.map(s => [s.value, s])),
    [processSteps],
  );

  const extraStories = useMemo(() => rows.map(bizRequestToBacklogStory), [rows]);

  const statusOptions = useMemo<StatusOption[]>(
    () => processSteps.map(s => ({
      value: s.value,
      label: s.label,
      appearance: stepToLozengeAppearance(s) as LozengeAppearance,
      group: 'Status',
    })),
    [processSteps],
  );

  const allStatuses = useMemo(() => processSteps.map(s => s.value), [processSteps]);

  const resolvedStatusAppearance = useCallback(
    (status: string | null | undefined): LozengeAppearance => {
      if (!status) return 'default';
      const step = stepMap.get(status);
      return step ? (stepToLozengeAppearance(step) as LozengeAppearance) : 'default';
    },
    [stepMap],
  );

  const resolvedStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (!status) return '—';
      const step = stepMap.get(status);
      return step?.label ?? status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
    },
    [stepMap],
  );

  return useMemo((): BacklogDataSource | null => {
    if (!product) return null;

    return {
      sourceTag: BIZ_SOURCE,
      extraStories,
      extraEpics: [],
      isLoading,

      statusOptions,
      statusAppearance: resolvedStatusAppearance,
      statusLabel: resolvedStatusLabel,
      allStatuses,

      onOpenItem: (key) => {
        if (key) globalOpenDetail({ id: key, itemType: 'business_request' });
      },

      onUpdate: async (id, patch) => {
        const row = (rows as any[]).find((r: any) => r.request_key === id);
        if (!row) throw new Error(`Business request not found: ${id}`);
        const bizPatch: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'updated_at' || k === 'jira_updated_at') continue;
          const mapped = BIZ_PATCH_MAP[k];
          if (mapped) bizPatch[mapped] = v;
          // Unknown keys silently dropped — business_requests has no generic fields
        }
        if (Object.keys(bizPatch).length > 0) {
          await updateMutation.mutateAsync({ id: row.id, data: bizPatch });
        }
      },

      onDelete: async (id) => {
        const row = (rows as any[]).find((r: any) => r.request_key === id);
        if (!row) throw new Error(`Business request not found: ${id}`);
        await deleteMutation.mutateAsync(row.id);
      },

      onBulkDelete: async (ids) => {
        const rowIds = (rows as any[])
          .filter((r: any) => ids.includes(r.request_key))
          .map((r: any) => r.id as string);
        await Promise.all(rowIds.map(rid => deleteMutation.mutateAsync(rid)));
      },

      onCreate: async ({ title }) => {
        await createMutation.mutateAsync({
          title,
          product_id: product.id,
          process_step: processSteps[0]?.value ?? 'new_request',
        } as any);
      },

      onSetRank: async (id, rank) => {
        const row = (rows as any[]).find((r: any) => r.request_key === id);
        if (!row) return;
        await updateMutation.mutateAsync({ id: row.id, data: { rank } });
      },

      invalidationKeys: [
        ['business-requests-by-product', product.id],
        ['demand-process-steps', 'active'],
      ],

      productId: product.id,
    };
  }, [
    product, extraStories, isLoading,
    statusOptions, allStatuses, resolvedStatusAppearance, resolvedStatusLabel,
    createMutation, deleteMutation, updateMutation,
    globalOpenDetail, processSteps, rows,
  ]);
}
