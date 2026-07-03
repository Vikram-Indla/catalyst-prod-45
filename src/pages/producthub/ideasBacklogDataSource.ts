/**
 * ideasBacklogDataSource — adapter that lets the canonical BacklogPage
 * render the Ideas Backlog (/product/ideas/backlog) using the same chrome
 * as /project-hub/BAU/backlog: same JiraTable, same column picker, same
 * column filters, same toolbar. Per CAT-AUDIT-1055
 * (features/CAT-AUDIT-FULLSWEEP-20260703-001/lanes/LANE-12_cross-surface.md).
 *
 * Data: ph_ideas (via useIdeasHub / ph_ideas_listing view) — a genuinely
 * separate table from business_requests, so this is a new adapter (not a
 * reuse of useBusinessRequestsSource). Mutations wire to the existing
 * useUpdateIdea / useDeleteIdea / useCreateIdea hooks from
 * src/hooks/useIdeasHub.ts — no new Supabase writes invented here.
 *
 * Source tag: reuses BIZ_SOURCE ('biz') because BacklogPage's adapter
 * routing checks are all keyed on it. onOpenItem routes through
 * globalOpenDetail with itemType='idea', which CatalystDetailRouter
 * resolves to CatalystViewIdea (idea_key-based lookup) — the same
 * canonical detail-panel path business_requests and incidents use.
 */

import { useMemo, useCallback } from 'react';
import type { LozengeAppearance, StatusOption } from '@/components/shared/JiraTable';
import {
  useIdeasHub,
  useUpdateIdea,
  useDeleteIdea,
  useCreateIdea,
  type IdeaRow,
} from '@/hooks/useIdeasHub';
import {
  BIZ_SOURCE,
  type BacklogDataSource,
} from '@/modules/project-work-hub/adapters/backlogDataSource';
import type { BacklogStory } from '@/modules/project-work-hub/types/backlog.types';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

/* ── Idea status vocabulary ─────────────────────────────────────────────
   Real ph_ideas.status values (Title Case, per useIdeasHub / ideation-data
   STATUS_LOZENGE_COLORS) — order = canonical workflow order (draft → converted). */
const IDEA_STATUSES = [
  'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted to Request',
] as const;

function ideaStatusAppearance(s: string | null | undefined): LozengeAppearance {
  if (!s) return 'default';
  if (s === 'Converted to Request' || s === 'Converted') return 'success';
  if (s === 'Under Review' || s === 'Approved') return 'inprogress';
  if (s === 'Rejected') return 'removed';
  return 'default'; // Draft, Submitted
}

// BacklogPage patch key → ph_ideas column name. Only listed keys are
// written; unknown keys are silently dropped to prevent Supabase errors
// from non-existent columns (mirrors BIZ_PATCH_MAP in backlogDataSource.ts).
const IDEA_PATCH_MAP: Record<string, string> = {
  title: 'title',
  status: 'status',
  priority: 'priority',
};

function ideaToBacklogStory(r: IdeaRow): BacklogStory {
  return {
    id: r.idea_key,
    story_key: r.idea_key,
    title: r.title ?? '',
    name: r.title ?? null,
    description: r.description ?? null,
    status: r.status ?? null,
    feature_id: null,
    assignee_id: r.assignee_id ?? null,
    assignee_name: r.assigned_to_name ?? null,
    reporter_name: null,
    start_date: null,
    priority: r.priority ? r.priority.toLowerCase() : null,
    deleted_at: null,
    jira_created_at: r.created_at ?? null,
    jira_updated_at: r.updated_at ?? null,
    /* Use BIZ_SOURCE so BacklogPage routes mutations to this adapter and
       doesn't try to update ph_issues directly. */
    source: BIZ_SOURCE as any,
    issue_type: r.idea_type ?? 'Idea',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: null,
    rank_order: null,
    feature: null,
  } as any;
}

/**
 * useIdeasBacklogSource — pass to <BacklogPage dataSource={...} />.
 * Returns null until the first ideas fetch completes so BacklogPage
 * doesn't paint an empty grid mid-load.
 */
export function useIdeasBacklogSource(filters?: {
  status?: string;
  theme?: string;
  search?: string;
}): BacklogDataSource | null {
  const { data: ideas = [], isLoading } = useIdeasHub(filters);
  const updateMutation = useUpdateIdea();
  const deleteMutation = useDeleteIdea();
  const createMutation = useCreateIdea();
  const globalOpenDetail = useGlobalSearchStore(s => s.openDetail);

  const extraStories: BacklogStory[] = useMemo(
    () => ideas.map(ideaToBacklogStory),
    [ideas],
  );

  const statusOptions: StatusOption[] = useMemo(
    () => IDEA_STATUSES.map(s => ({ value: s, label: s, appearance: ideaStatusAppearance(s) })),
    [],
  );

  const onUpdate = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const row = ideas.find(i => i.idea_key === id);
      if (!row) throw new Error(`Idea not found: ${id}`);
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'updated_at' || k === 'jira_updated_at') continue;
        const mapped = IDEA_PATCH_MAP[k];
        if (mapped) updates[mapped] = v;
      }
      if (Object.keys(updates).length === 0) return;
      await updateMutation.mutateAsync({ id: row.id, updates });
    },
    [ideas, updateMutation],
  );

  const onDelete = useCallback(
    async (id: string) => {
      const row = ideas.find(i => i.idea_key === id);
      if (!row) throw new Error(`Idea not found: ${id}`);
      await deleteMutation.mutateAsync(row.id);
    },
    [ideas, deleteMutation],
  );

  const onBulkDelete = useCallback(
    async (ids: string[]) => {
      const rowIds = ideas.filter(i => ids.includes(i.idea_key)).map(i => i.id);
      await Promise.all(rowIds.map(rid => deleteMutation.mutateAsync(rid)));
    },
    [ideas, deleteMutation],
  );

  const onCreate = useCallback(
    async ({ title }: { title: string }) => {
      await createMutation.mutateAsync({ title });
    },
    [createMutation],
  );

  return useMemo<BacklogDataSource | null>(() => ({
    sourceTag: BIZ_SOURCE,
    extraStories,
    extraEpics: [],
    isLoading,

    statusOptions,
    statusAppearance: ideaStatusAppearance,
    statusLabel: (s) => (s ? String(s) : '—'),
    allStatuses: [...IDEA_STATUSES],

    /* Click-through: open the canonical idea detail panel.
       itemType='idea' routes CatalystDetailRouter to CatalystViewIdea,
       which looks the row up by idea_key — same pattern as the product-hub
       business_requests adapter's onOpenItem. */
    onOpenItem: (key) => {
      if (key) globalOpenDetail({ id: key, itemType: 'idea' });
    },

    onUpdate,
    onDelete,
    onBulkDelete,
    onCreate,

    invalidationKeys: [
      ['ideas-hub'],
      ['ideas'],
      ['ideas-roadmap'],
    ],

    /* No dedicated product UUID for Ideas Backlog — it's a flat hub, not a
       per-product surface. productId is required by BacklogDataSource but
       only consumed by CreateBusinessRequestModal wiring which this adapter
       doesn't use (New Idea has its own dialog on the page). */
    productId: 'ideas',
  }), [extraStories, isLoading, statusOptions, onUpdate, onDelete, onBulkDelete, onCreate, globalOpenDetail]);
}
