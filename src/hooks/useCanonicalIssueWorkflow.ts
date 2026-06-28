/**
 * useCanonicalIssueWorkflow — drop-in canonical replacement for
 * useIssueTypeWorkflow, gated per entity.
 *
 * For entities on the canonical ph_wf_* engine (Story today) it returns the
 * SAME IssueTypeWorkflowResult shape sourced from the published version
 * (statuses + transitions + legacy remaps). Every other type delegates to the
 * legacy hook unchanged. Both hooks are always called (no conditional hooks).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIssueTypeWorkflow, type IssueTypeWorkflowResult, type WorkflowStatusGroup } from './useIssueTypeWorkflow';
import type { StatusCategory } from '@/constants/statusCategoryColors';
import type { EntityKey } from '@/lib/workflow/canonical/contracts';
import { resolveCanonicalVersion, resolveKeyInVersion, availableTransitions, type ResolvedVersion } from '@/lib/workflow/canonical/runtime';

const ISSUE_TYPE_TO_ENTITY: Record<string, EntityKey> = {
  story: 'story', Story: 'story',
  epic: 'epic', Epic: 'epic',
  feature: 'feature', Feature: 'feature',
  subtask: 'subtask', 'sub-task': 'subtask', 'Sub-task': 'subtask',
  defect: 'defect', Defect: 'defect', 'qa bug': 'defect',
  release: 'release', Release: 'release',
  business_request: 'business_request', 'Business Request': 'business_request',
  product_milestone: 'product_milestone', 'Product Milestone': 'product_milestone',
  task: 'task', Task: 'task',
  sprint: 'sprint', Sprint: 'sprint',
};

export interface CanonicalWorkflowExtras {
  isCanonical: boolean;
  versionId: string | null;
  resolveStatusKey: (name: string | null | undefined) => string | null;
  labelForStatus: (name: string | null | undefined) => string;
  /** True when the from→to transition (or the to-status) requires a reason. */
  requiresReason: (fromName: string | null | undefined, toName: string | null | undefined) => boolean;
}

export function useCanonicalIssueWorkflow(
  issueType: string | null | undefined,
): IssueTypeWorkflowResult & CanonicalWorkflowExtras {
  const legacy = useIssueTypeWorkflow(issueType);
  const entityKey = issueType ? ISSUE_TYPE_TO_ENTITY[issueType] : undefined;

  const { data: canonical, isLoading } = useQuery({
    queryKey: ['canonical-issue-workflow', entityKey],
    enabled: !!entityKey,
    staleTime: 60_000,
    queryFn: () => resolveCanonicalVersion(entityKey as EntityKey, null),
  });

  return useMemo(() => {
    if (!entityKey || !canonical) {
      return {
        ...legacy, isCanonical: false, versionId: null,
        resolveStatusKey: () => null,
        labelForStatus: (n: string | null | undefined) => n ?? '',
        requiresReason: () => false,
      };
    }
    const v = canonical as ResolvedVersion;
    const labelByKey = new Map(v.statuses.map((s) => [s.status_key, s.display_label]));
    const allLabels = v.statuses.map((s) => s.display_label);

    const byCat: Record<StatusCategory, string[]> = { todo: [], in_progress: [], done: [] };
    for (const s of v.statuses) if (s.category in byCat) byCat[s.category as StatusCategory].push(s.display_label);
    const statusGroups: WorkflowStatusGroup[] = [];
    if (byCat.todo.length) statusGroups.push({ groupLabel: 'To do', category: 'todo', statuses: byCat.todo });
    if (byCat.in_progress.length) statusGroups.push({ groupLabel: 'In progress', category: 'in_progress', statuses: byCat.in_progress });
    if (byCat.done.length) statusGroups.push({ groupLabel: 'Done', category: 'done', statuses: byCat.done });

    const getAvailableStatuses = (currentStatus: string | null | undefined): string[] => {
      const curKey = resolveKeyInVersion(v, currentStatus);
      if (!curKey) return allLabels; // unmapped legacy -> open model (move onto track)
      const targets = new Set<string>();
      availableTransitions(v, curKey).forEach((t) => targets.add(t.to_status_key));
      targets.add(curKey);
      const labels = Array.from(targets).map((k) => labelByKey.get(k)).filter(Boolean) as string[];
      return allLabels.filter((l) => labels.includes(l));
    };

    const initialStatus = v.statuses.find((s) => s.is_initial)?.display_label ?? null;

    return {
      statusGroups, initialStatus, getAvailableStatuses, isLoading, hasConfig: statusGroups.length > 0,
      isCanonical: true, versionId: v.versionId,
      resolveStatusKey: (name: string | null | undefined) => resolveKeyInVersion(v, name),
      labelForStatus: (name: string | null | undefined) => {
        const k = resolveKeyInVersion(v, name);
        return (k && labelByKey.get(k)) || (name ?? '');
      },
      requiresReason: (fromName: string | null | undefined, toName: string | null | undefined) => {
        const tk = resolveKeyInVersion(v, toName);
        if (!tk) return false;
        const fk = resolveKeyInVersion(v, fromName);
        const t = v.transitions.find((x) => x.to_status_key === tk && (x.from_status_key === fk || x.from_status_key === null));
        const st = v.statuses.find((s) => s.status_key === tk);
        return !!(t?.requires_reason || st?.requires_reason);
      },
    } as IssueTypeWorkflowResult & CanonicalWorkflowExtras;
  }, [entityKey, canonical, legacy, isLoading]);
}
