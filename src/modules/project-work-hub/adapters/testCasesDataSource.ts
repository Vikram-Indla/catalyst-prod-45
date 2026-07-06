/**
 * testCasesDataSource.ts — BacklogDataSource adapter for TestHub My Work.
 *
 * Mirrors useReleasesSource / useBusinessRequestsSource so /testhub/my-work
 * mounts the SAME canonical BacklogPage (table, toolbar, column picker,
 * inline edit, bulk actions, group-by, URL state, Ask Caty) used by every
 * other hub — per CLAUDE.md "ADOPT CANONICAL".
 *
 * Differences from project / product / release hub:
 *   - Data source: tm_test_cases (filtered to the first active test-
 *     management project, mirroring the dashboard widgets convention).
 *   - Statuses:    4-stage case lifecycle (DRAFT → REVIEW → APPROVED → DEPRECATED).
 *   - Detail:      entityKind='test_case' — row click navigates to
 *     /testhub/repository?case=<id> (CaseDrawer opens). No CatalystView*
 *     for test cases; cloning would duplicate the case detail UI built
 *     into the Repository tab.
 */
import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/test-management/useProjects';
import { useTestCases, useUpdateTestCase, useDeleteTestCase, useCreateTestCase } from '@/hooks/test-management/useTestCases';
import { filterCreatableTypes } from '@/lib/catalyst-rules';
import type { BacklogStory } from '../types/backlog.types';
import type { StatusOption, LozengeAppearance } from '@/components/shared/JiraTable';
import { BIZ_SOURCE, type BacklogDataSource } from './backlogDataSource';
import { formatTestKey } from '@/lib/test-management/formatTestKey';

// D032: useTestCases normalises the DB enum (draft/ready/approved/deprecated)
// to the UI lifecycle vocabulary DRAFT/REVIEW/APPROVED/DEPRECATED (see
// statusFromDb). Rows reaching this adapter already carry the UI values, so the
// options must key on those. The prior 'In review' label was the D032 outlier —
// Repository and the test-case detail both label REVIEW as 'Review'; aligned.
const CASE_STATUSES: Array<{ value: string; label: string; appearance: LozengeAppearance }> = [
  { value: 'DRAFT',      label: 'Draft',      appearance: 'default'    },
  { value: 'REVIEW',     label: 'Review',     appearance: 'inprogress' },
  { value: 'APPROVED',   label: 'Approved',   appearance: 'success'    },
  { value: 'DEPRECATED', label: 'Deprecated', appearance: 'moved'      },
];
const STATUS_BY_VALUE = new Map(CASE_STATUSES.map((s) => [s.value, s]));

function caseToBacklogStory(c: any): BacklogStory {
  return {
    id: c.id,
    story_key: formatTestKey(c.key) ?? c.id,
    title: c.title ?? '',
    name: c.title ?? null,
    description: c.objective ?? null,
    status: c.status ?? null,
    feature_id: null,
    assignee_id: c.assigned_to ?? null,
    assignee_name: c.assignee?.full_name ?? null,
    reporter_name: c.created_by_user?.full_name ?? null,
    start_date: null,
    priority: null,
    deleted_at: null,
    jira_created_at: c.created_at ?? null,
    jira_updated_at: c.updated_at ?? null,
    source: BIZ_SOURCE as any,
    issue_type: 'Test Case',
    parent_key: null,
    parent_summary: null,
    labels: null,
    sprint_release: null,
    rank_order: null,
    feature: null,
    request_type: null,
    category: c.folder?.name ?? null,
    theme: null,
    urgency: null,
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

const CASE_PATCH_MAP: Record<string, string> = {
  title: 'title',
  status: 'status',
};

export interface TestCasesSourceOptions {
  /**
   * D031: when set, only cases assigned to this user are returned. My Work
   * passes the current auth user id so the surface shows *my* cases, not the
   * whole repository. Column name on tm_test_cases is `assigned_to`
   * (see useTestCases' assigned_to filter).
   */
  assigneeId?: string;
}

export function useTestCasesSource(options?: TestCasesSourceOptions): BacklogDataSource | null {
  const qc = useQueryClient();
  const { data: projects = [], isLoading: pl } = useProjects();
  const projectId = projects[0]?.id;
  const assigneeId = options?.assigneeId;
  const { data: casesData, isLoading: cl } = useTestCases(
    projectId,
    assigneeId ? { assigned_to: assigneeId } : undefined,
  );
  const updateMutation = useUpdateTestCase();
  const deleteMutation = useDeleteTestCase();
  const createMutation = useCreateTestCase();
  void qc;

  const rows = casesData?.cases ?? [];
  const isLoading = pl || cl;

  const extraStories = useMemo(() => rows.map(caseToBacklogStory), [rows]);

  const statusOptions = useMemo<StatusOption[]>(
    () => CASE_STATUSES.map((s) => ({
      value: s.value,
      label: s.label,
      appearance: s.appearance,
      group: 'Status',
    })),
    [],
  );
  const allStatuses = useMemo(() => CASE_STATUSES.map((s) => s.value), []);

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
      return STATUS_BY_VALUE.get(status)?.label ?? status;
    },
    [],
  );

  return useMemo((): BacklogDataSource | null => {
    /* 2026-06-21: when no active tm_projects row exists (fresh staging DB
       with no test data seeded), still return a usable adapter so the
       canonical BacklogPage renders its empty-state instead of the host
       page spinning forever. Inserts use whatever projectId we have; if
       none, onCreate throws via the upstream mutation. */
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
      /* onOpenItem: row click → /testhub/repository?case=<id>. CaseDrawer
         on RepositoryPage reads ?case query param and opens. */
      onOpenItem: (_key, id) => {
        window.location.assign(`/testhub/repository?case=${id}`);
      },
      onUpdate: async (id, patch) => {
        const mapped: Record<string, any> = {};
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'updated_at' || k === 'jira_updated_at') continue;
          const target = CASE_PATCH_MAP[k];
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
        await createMutation.mutateAsync({ project_id: effectiveProjectId, title, status: 'DRAFT' } as any);
      },
      invalidationKeys: [
        ['tm-cases', effectiveProjectId],
      ],
      productId: effectiveProjectId,
      entityKind: 'test_case',
      /* BacklogPage's key-cell icon defaults to 'Business Request' for any
         BIZ_SOURCE row. Override returns 'Test Case' so JiraIssueTypeIcon
         resolves to the flask icon registered above. */
      resolveItemType: () => 'Test Case',
      // CRE chokepoint (P1-S19, E4): TestHub owns 'Test Case' per Grid A
      // (MODULE_OWNED_TYPES.TESTHUB) — route through the filter rather than
      // hardcoding, so ownership drift is caught automatically.
      creatableTypes: filterCreatableTypes(['Test Case'], 'TESTHUB'),
      defaultCreatableType: 'Test Case',
    };
  }, [
    projectId, extraStories, isLoading,
    statusOptions, allStatuses, resolvedStatusAppearance, resolvedStatusLabel,
    updateMutation, deleteMutation, createMutation,
  ]);
}
