/**
 * defectsDataSource.ts — BacklogDataSource adapter for TestHub Defects.
 *
 * 2026-06-21: mirrors useTestCasesSource so /testhub/defects mounts the
 * canonical BacklogPage reading tm_defects. Detail row click navigates to
 * the dedicated /testhub/defects/:id detail page (when present); falls back
 * to no-op if route absent.
 */
import { useMemo, useCallback } from 'react';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useDefects, useCreateDefect, useUpdateDefect, useDeleteDefect } from '@/hooks/test-management/useDefects';
import type { BacklogStory } from '../types/backlog.types';
import type { StatusOption, LozengeAppearance } from '@/components/shared/JiraTable';
import { BIZ_SOURCE, type BacklogDataSource } from './backlogDataSource';

const DEFECT_STATUSES: Array<{ value: string; label: string; appearance: LozengeAppearance }> = [
  { value: 'OPEN',        label: 'Open',        appearance: 'new'        },
  { value: 'IN_PROGRESS', label: 'In progress', appearance: 'inprogress' },
  { value: 'FIXED',       label: 'Fixed',       appearance: 'success'    },
  { value: 'VERIFIED',    label: 'Verified',    appearance: 'success'    },
  { value: 'CLOSED',      label: 'Closed',      appearance: 'default'    },
  { value: 'WONT_FIX',    label: "Won't fix",   appearance: 'removed'    },
  { value: 'DUPLICATE',   label: 'Duplicate',   appearance: 'moved'      },
];
const STATUS_BY_VALUE = new Map(DEFECT_STATUSES.map((s) => [s.value, s]));

function defectToBacklogStory(d: any): BacklogStory {
  return {
    id: d.id,
    story_key: d.defect_key ?? d.key ?? d.id,
    title: d.title ?? '',
    name: d.title ?? null,
    description: d.description ?? null,
    status: d.status ?? null,
    feature_id: null,
    assignee_id: d.assignee_id ?? d.assigned_to ?? null,
    assignee_name: d.assignee?.full_name ?? null,
    reporter_name: d.reporter?.full_name ?? null,
    start_date: null,
    priority: (d.severity ?? '').toLowerCase() || null,
    deleted_at: null,
    jira_created_at: d.created_at ?? null,
    jira_updated_at: d.updated_at ?? null,
    source: BIZ_SOURCE as any,
    issue_type: 'QA Bug',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: null,
    rank_order: null,
    feature: null,
    request_type: null,
    category: d.severity ?? null,
    theme: null,
    urgency: d.severity ?? null,
    planned_quarter: null,
    target_date: null,
    delivery_manager_id: null,
    delivery_manager_name: null,
    product_owner_id: null,
    product_owner_name: null,
    stakeholders: null,
    targeted_feature: null,
  };
}

const DEFECT_PATCH_MAP: Record<string, string> = {
  title: 'title',
  status: 'status',
};

export function useDefectsSource(): BacklogDataSource | null {
  const { data: projects = [], isLoading: pl } = useProjects();
  const projectId = projects[0]?.id;
  const { data: defectsData, isLoading: dl } = useDefects(projectId);
  const updateMutation = useUpdateDefect();
  const deleteMutation = useDeleteDefect();
  const createMutation = useCreateDefect();

  const rows = (defectsData as any)?.data ?? (defectsData as any)?.defects ?? [];
  const isLoading = pl || dl;

  const extraStories = useMemo(() => rows.map(defectToBacklogStory), [rows]);

  const statusOptions = useMemo<StatusOption[]>(
    () => DEFECT_STATUSES.map((s) => ({ value: s.value, label: s.label, appearance: s.appearance, group: 'Status' })),
    [],
  );
  const allStatuses = useMemo(() => DEFECT_STATUSES.map((s) => s.value), []);

  const resolvedStatusAppearance = useCallback(
    (status: string | null | undefined): LozengeAppearance => {
      if (!status) return 'default';
      return STATUS_BY_VALUE.get(status.toUpperCase())?.appearance ?? 'default';
    },
    [],
  );
  const resolvedStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (!status) return '—';
      return STATUS_BY_VALUE.get(status.toUpperCase())?.label ?? status;
    },
    [],
  );

  return useMemo((): BacklogDataSource | null => {
    const effectiveProjectId = projectId ?? 'TESTHUB';
    return {
      sourceTag: BIZ_SOURCE,
      extraStories,
      extraEpics: [],
      isLoading,
      statusOptions,
      statusAppearance: resolvedStatusAppearance,
      statusLabel: resolvedStatusLabel,
      allStatuses,
      onOpenItem: (_key, id) => {
        window.location.assign(`/testhub/defects/${id}`);
      },
      onUpdate: async (id, patch) => {
        const mapped: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'updated_at' || k === 'jira_updated_at') continue;
          const target = DEFECT_PATCH_MAP[k];
          if (target) mapped[target] = v;
        }
        if (Object.keys(mapped).length > 0) {
          await updateMutation.mutateAsync({ id, project_id: effectiveProjectId, ...mapped } as any);
        }
      },
      onDelete: async (id) => {
        await deleteMutation.mutateAsync({ id, project_id: effectiveProjectId } as any);
      },
      onBulkDelete: async (ids) => {
        await Promise.all(ids.map((id) => deleteMutation.mutateAsync({ id, project_id: effectiveProjectId } as any)));
      },
      onCreate: async ({ title }) => {
        await createMutation.mutateAsync({
          project_id: effectiveProjectId,
          title,
          severity: 'MINOR',
        } as any);
      },
      invalidationKeys: [
        ['tm-defects', effectiveProjectId],
      ],
      productId: effectiveProjectId,
      entityKind: 'defect',
      creatableTypes: ['QA Bug'],
      defaultCreatableType: 'QA Bug',
      resolveItemType: () => 'QA Bug',
    };
  }, [
    projectId, extraStories, isLoading,
    statusOptions, allStatuses, resolvedStatusAppearance, resolvedStatusLabel,
    updateMutation, deleteMutation, createMutation,
  ]);
}
