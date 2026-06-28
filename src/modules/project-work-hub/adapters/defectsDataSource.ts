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
import { useCanonicalIssueWorkflow } from '@/hooks/useCanonicalIssueWorkflow';
import type { BacklogStory } from '../types/backlog.types';
import type { StatusOption, LozengeAppearance } from '@/components/shared/JiraTable';
import { BIZ_SOURCE, type BacklogDataSource } from './backlogDataSource';

// Map a canonical status category → ADS Lozenge appearance (component owns color).
const CATEGORY_APPEARANCE: Record<string, LozengeAppearance> = {
  todo: 'new', in_progress: 'inprogress', done: 'success',
};

// Values MUST match the tm_defect_status enum exactly (lowercase): the chosen
// value is written straight to tm_defects.status via onUpdate. The prior list
// used UPPERCASE + invalid values (FIXED/VERIFIED/WONT_FIX/DUPLICATE) that the
// enum rejects (400), and was missing resolved/reopened.
const DEFECT_STATUSES: Array<{ value: string; label: string; appearance: LozengeAppearance }> = [
  { value: 'open',        label: 'Open',        appearance: 'new'        },
  { value: 'in_progress', label: 'In progress', appearance: 'inprogress' },
  { value: 'resolved',    label: 'Resolved',    appearance: 'success'    },
  { value: 'closed',      label: 'Closed',      appearance: 'default'    },
  { value: 'reopened',    label: 'Reopened',    appearance: 'moved'      },
];
const STATUS_BY_VALUE = new Map(DEFECT_STATUSES.map((s) => [s.value, s]));

function defectToBacklogStory(d: any): BacklogStory {
  return {
    id: d.id,
    story_key: d.defect_key ?? d.key ?? d.id,
    title: d.title ?? '',
    name: d.title ?? null,
    description: d.description ?? null,
    // Canonical status: workflow_status_key is the source of truth; enum is fallback.
    status: d.workflow_status_key ?? d.status ?? null,
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

  // Canonical Defect workflow (bridged): drives the 18-status dropdown + labels.
  const canonical = useCanonicalIssueWorkflow('Defect');
  const canonicalReady = canonical.isCanonical && (canonical.statusGroups?.length ?? 0) > 0;

  const rows = (defectsData as any)?.data ?? (defectsData as any)?.defects ?? [];
  const isLoading = pl || dl;

  const extraStories = useMemo(() => rows.map(defectToBacklogStory), [rows]);

  // label/value/appearance derived from canonical statusGroups when available.
  const appearanceByLabel = useMemo(() => {
    const m = new Map<string, LozengeAppearance>();
    for (const g of canonical.statusGroups ?? []) {
      for (const label of g.statuses) m.set(label, CATEGORY_APPEARANCE[g.category] ?? 'default');
    }
    return m;
  }, [canonical.statusGroups]);

  const statusOptions = useMemo<StatusOption[]>(() => {
    if (canonicalReady) {
      return (canonical.statusGroups ?? []).flatMap((g) =>
        g.statuses.map((label) => ({
          value: label, label, appearance: CATEGORY_APPEARANCE[g.category] ?? 'default', group: g.groupLabel,
        })),
      );
    }
    return DEFECT_STATUSES.map((s) => ({ value: s.value, label: s.label, appearance: s.appearance, group: 'Status' }));
  }, [canonicalReady, canonical.statusGroups]);

  const allStatuses = useMemo(() => statusOptions.map((s) => s.value), [statusOptions]);

  const resolvedStatusAppearance = useCallback(
    (status: string | null | undefined): LozengeAppearance => {
      if (!status) return 'default';
      if (canonicalReady) return appearanceByLabel.get(canonical.labelForStatus(status)) ?? 'default';
      return STATUS_BY_VALUE.get(status.toLowerCase())?.appearance ?? 'default';
    },
    [canonicalReady, appearanceByLabel, canonical],
  );
  const resolvedStatusLabel = useCallback(
    (status: string | null | undefined): string => {
      if (!status) return '—';
      if (canonicalReady) return canonical.labelForStatus(status) || status;
      return STATUS_BY_VALUE.get(status.toLowerCase())?.label ?? status;
    },
    [canonicalReady, canonical],
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
        let canonicalKey: string | null = null;
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'updated_at' || k === 'jira_updated_at') continue;
          if (k === 'status' && canonicalReady) {
            // Picked value is a canonical label → resolve to its status_key and
            // write via the bridged workflow_status_key path (enum stays compat).
            canonicalKey = canonical.resolveStatusKey(v as string);
            continue;
          }
          const target = DEFECT_PATCH_MAP[k];
          if (target) mapped[target] = v;
        }
        if (canonicalKey) {
          await updateMutation.mutateAsync({ id, project_id: effectiveProjectId, ...mapped, workflowStatusKey: canonicalKey } as any);
        } else if (Object.keys(mapped).length > 0) {
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
    canonicalReady, canonical,
  ]);
}
