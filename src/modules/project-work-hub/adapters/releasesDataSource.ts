/**
 * releasesDataSource.ts — BacklogDataSource adapter for Release Operations.
 *
 * Mirrors useBusinessRequestsSource (product hub adapter) so the Releases
 * tab at /release-hub/releases mounts the SAME canonical BacklogPage
 * (table, toolbar, column picker, inline edit, bulk actions, group-by,
 * URL state, Ask Caty) used by /project-hub/:key/backlog and
 * /product-hub/:key/backlog — per CLAUDE.md "ADOPT CANONICAL".
 *
 * Differences from project / product hub:
 *   - Data source: rh_releases (cancelled rows hidden).
 *   - Statuses:    9-stage release lifecycle (draft → planned → in_readiness
 *                  → ready_for_signoff → approved → scheduled → deploying
 *                  → monitoring → completed).
 *   - Detail:      entityKind='release' — BacklogPage navigates to
 *                  /release-hub/:id (existing ReleaseDetailPage with 8 tabs)
 *                  instead of mounting CatalystDetailRouter. Releases are
 *                  a different domain than ph_issues work items; the
 *                  established release detail surface stays canonical.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BacklogStory } from '../types/backlog.types';
import type { StatusOption, LozengeAppearance } from '@/components/shared/JiraTable';
import { BIZ_SOURCE, type BacklogDataSource } from './backlogDataSource';

/* The 9-stage release lifecycle — mirrors RELEASE_BOARD_COLUMNS in the
   canonical kanban (useKanbanData) so the table and board agree on which
   stages exist. */
const RELEASE_STATUSES: Array<{ value: string; label: string; appearance: LozengeAppearance }> = [
  { value: 'draft',             label: 'Draft',              appearance: 'default'    },
  { value: 'planned',           label: 'Planned',            appearance: 'default'    },
  { value: 'in_readiness',      label: 'In readiness',       appearance: 'new'        },
  { value: 'ready_for_signoff', label: 'Ready for sign-off', appearance: 'inprogress' },
  { value: 'approved',          label: 'Approved',           appearance: 'inprogress' },
  { value: 'scheduled',         label: 'Scheduled',          appearance: 'inprogress' },
  { value: 'deploying',         label: 'Deploying',          appearance: 'inprogress' },
  { value: 'monitoring',        label: 'Monitoring',         appearance: 'inprogress' },
  { value: 'completed',         label: 'Completed',          appearance: 'success'    },
];

const STATUS_BY_VALUE = new Map(RELEASE_STATUSES.map((s) => [s.value, s]));

const RELEASE_SELECT =
  'id, name, version, status, health, release_type, target_env, target_date, planned_release_date, readiness_pct, source, jira_key, updated_at, created_at, product_id, release_manager_id';

interface ReleaseRow {
  id: string;
  name: string | null;
  version: string | null;
  status: string;
  health: string | null;
  release_type: string | null;
  target_env: string | null;
  target_date: string | null;
  planned_release_date: string | null;
  readiness_pct: number | null;
  source: string;
  jira_key: string | null;
  updated_at: string | null;
  created_at: string | null;
  product_id: string | null;
  release_manager_id: string | null;
  manager_name?: string | null;
}

function releaseToBacklogStory(r: ReleaseRow): BacklogStory {
  return {
    id: r.id,
    story_key: r.jira_key ?? r.version ?? r.id,
    title: r.name ?? '',
    name: r.name ?? null,
    description: null,
    status: r.status ?? null,
    feature_id: null,
    assignee_id: r.release_manager_id ?? null,
    assignee_name: r.manager_name ?? null,
    reporter_name: null,
    start_date: null,
    priority: null,
    deleted_at: null,
    jira_created_at: r.created_at ?? null,
    jira_updated_at: r.updated_at ?? null,
    source: BIZ_SOURCE as any,
    issue_type: 'Release',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: r.version ? [r.version] : null,
    rank_order: null,
    feature: null,
    request_type: r.release_type ?? null,
    category: r.target_env ?? null,
    theme: null,
    urgency: null,
    planned_quarter: null,
    target_date: r.planned_release_date ?? r.target_date ?? null,
    delivery_manager_id: r.release_manager_id ?? null,
    delivery_manager_name: r.manager_name ?? null,
    product_owner_id: null,
    product_owner_name: null,
    stakeholders: null,
    targeted_feature: null,
  };
}

/* Field map: BacklogPage patch key → rh_releases column. Unknown keys are
   silently dropped (matches BIZ_PATCH_MAP convention in backlogDataSource). */
const RELEASE_PATCH_MAP: Record<string, string> = {
  title: 'name',
  status: 'status',
  target_date: 'planned_release_date',
  request_type: 'release_type',
  category: 'target_env',
  delivery_manager_id: 'release_manager_id',
};

export function useReleasesSource(): BacklogDataSource | null {
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['releases-backlog'],
    staleTime: 30_000,
    queryFn: async (): Promise<ReleaseRow[]> => {
      const { data: rels, error } = await supabase
        .from('rh_releases')
        .select(RELEASE_SELECT)
        .neq('status', 'cancelled')
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      const list = (rels ?? []) as ReleaseRow[];
      const managerIds = Array.from(new Set(list.map((r) => r.release_manager_id).filter(Boolean) as string[]));
      const nameById = new Map<string, string>();
      if (managerIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', managerIds);
        (profs ?? []).forEach((p: any) => {
          if (p.full_name) nameById.set(p.id, p.full_name);
        });
      }
      return list.map((r) => ({ ...r, manager_name: r.release_manager_id ? nameById.get(r.release_manager_id) ?? null : null }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase
        .from('rh_releases')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['releases-backlog'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      /* rh_releases has no deleted_at — soft-retire by setting status='cancelled'. */
      const { error } = await supabase
        .from('rh_releases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['releases-backlog'] }),
  });

  const createMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      const now = new Date().toISOString();
      const todayDate = now.slice(0, 10);
      /* target_date is NOT NULL on rh_releases (legacy migration 20260309). */
      const { error } = await supabase.from('rh_releases').insert({
        name: title,
        status: 'draft',
        source: 'catalyst',
        target_date: todayDate,
        created_at: now,
        updated_at: now,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['releases-backlog'] }),
  });

  const extraStories = useMemo(() => rows.map(releaseToBacklogStory), [rows]);

  const statusOptions = useMemo<StatusOption[]>(
    () => RELEASE_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      appearance: s.appearance,
      group: 'Status',
    })),
    [],
  );
  const allStatuses = useMemo(() => RELEASE_STATUSES.map((s) => s.value), []);

  const resolvedStatusAppearance = useCallback(
    (status: string | null | undefined): LozengeAppearance => {
      if (!status) return 'default';
      return STATUS_BY_VALUE.get(status)?.appearance ?? 'default';
    },
    [],
  );

  const resolvedStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (!status) return '—';
      return STATUS_BY_VALUE.get(status)?.label ?? status.replace(/_/g, ' ');
    },
    [],
  );

  return useMemo((): BacklogDataSource | null => ({
    sourceTag: BIZ_SOURCE,
    extraStories,
    extraEpics: [],
    isLoading,

    statusOptions,
    statusAppearance: resolvedStatusAppearance,
    statusLabel: resolvedStatusLabel,
    allStatuses,

    /* onOpenItem fires from the in-panel "Open in full page" button. Because
       entityKind='release' short-circuits row click in BacklogPage straight
       to /release-hub/:id, this is rarely reached — but kept consistent so
       any future caller behaves correctly. */
    onOpenItem: (_key, id) => {
      window.location.assign(`/release-hub/${id}`);
    },

    onUpdate: async (id, patch) => {
      const mapped: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'updated_at' || k === 'jira_updated_at') continue;
        const target = RELEASE_PATCH_MAP[k];
        if (target) mapped[target] = v;
      }
      if (Object.keys(mapped).length > 0) {
        await updateMutation.mutateAsync({ id, patch: mapped });
      }
    },

    onDelete: async (id) => {
      await deleteMutation.mutateAsync(id);
    },

    onBulkDelete: async (ids) => {
      await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
    },

    onCreate: async ({ title }) => {
      await createMutation.mutateAsync({ title });
    },

    invalidationKeys: [
      ['releases-backlog'],
      ['release-hub', 'releases'],
    ],

    /* Sentinel productId — required by BacklogDataSource contract, but
       rh_releases inserts don't use a product_id from this layer. */
    productId: 'RELEASES',

    entityKind: 'release',

    /* Returns 'Release' so BacklogPage renders the teal stopwatch icon
       instead of the amber Business Request lightbulb fallback. */
    resolveItemType: () => 'Release',
  }), [
    extraStories, isLoading,
    statusOptions, allStatuses, resolvedStatusAppearance, resolvedStatusLabel,
    updateMutation, deleteMutation, createMutation,
  ]);
}
