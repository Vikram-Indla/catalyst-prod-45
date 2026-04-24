/**
 * useIssueViewData — Composite hook for the 3-column hierarchy/allwork view
 * ════════════════════════════════════════════════════════════════════════════
 * Wires to existing Supabase hooks. Maps WorkItem → AllWorkItem shape.
 * Handles: item list, selected item detail, comments, links, history, children.
 */
import { useMemo } from 'react';
import { useProjectAllWorkItems, useWorkItemChildren, useWorkItem } from '@/hooks/useProjectListItems';
import { useWhComments, useWhLinks, useWhHistory, useWhWorkLogs, useCreateComment, useLogWork } from '@/hooks/workhub/useAllWork';
import type { AllWorkItem } from '@/types/allwork.types';

/**
 * Convert WorkItem (from useProjectAllWorkItems/useWorkItemChildren) to AllWorkItem.
 * WorkItem has different field names than AllWorkItem.
 */
function workItemToAllWork(wi: any): AllWorkItem {
  return {
    id: wi.id ?? wi.jiraKey ?? '',
    issue_key: wi.jiraKey ?? wi.issue_key ?? '',
    project_key: wi.projectId ?? wi.project_key ?? null,
    issue_type: typeof wi.type === 'string' ? wi.type : wi.type?.name ?? wi.issue_type ?? '',
    summary: wi.summary ?? '',
    description_text: wi.description ?? wi.description_text ?? null,
    status: wi.statusName ?? (typeof wi.status === 'string' ? wi.status : wi.status?.name) ?? '',
    status_category: wi.statusCategory ?? wi.status_category ?? null,
    status_color: null,
    status_id: typeof wi.status === 'object' ? wi.status?.id : wi.status_id ?? null,
    priority: typeof wi.priority === 'string' ? wi.priority : wi.priority?.name ?? 'Medium',
    parent_key: wi.parentKey ?? wi.parent_key ?? null,
    parent_summary: wi.parentSummary ?? wi.parent_summary ?? null,
    assignee_display_name: wi.assignee?.name ?? wi.assignee_display_name ?? null,
    assignee_id: wi.assigneeId ?? wi.assignee?.id ?? wi.assignee_id ?? null,
    assignee_avatar: wi.assignee?.avatarUrl ?? wi.assignee_avatar ?? null,
    reporter_name: wi.reporter?.name ?? wi.reporter_name ?? null,
    labels: wi.labels ?? [],
    fix_version_name: typeof wi.fixVersion === 'string' ? wi.fixVersion : wi.fixVersion?.name ?? wi.fix_version_name ?? null,
    comment_count: wi.commentsCount ?? wi.comment_count ?? 0,
    attachment_count: wi.attachment_count ?? 0,
    child_count: wi.childCount ?? wi.child_count ?? 0,
    story_points: wi.storyPoints ?? wi.story_points ?? null,
    sprint_name: wi.sprintName ?? wi.sprint_name ?? null,
    resolution: wi.resolution ?? null,
    jira_created_at: wi.createdAt ?? wi.jira_created_at ?? null,
    jira_updated_at: wi.updatedAt ?? wi.jira_updated_at ?? null,
    icon_color: wi.icon_color ?? null,
    icon_glyph: wi.icon_glyph ?? null,
    work_type_id: wi.work_type_id ?? null,
    rank: wi.rank ?? null,
    is_flagged: wi.is_flagged ?? false,
    flag_reason: wi.flag_reason ?? null,
    _source: wi._source,
  };
}

export function useIssueViewData(
  projectKey: string | undefined,
  selectedIssueKey: string | null,
  searchQuery: string,
) {
  // ─── Left panel: issue list ───
  const { data: rawItems, isLoading: itemsLoading } = useProjectAllWorkItems(projectKey);

  // Convert WorkItem[] → AllWorkItem[]
  const items: AllWorkItem[] = useMemo(() => {
    if (!rawItems) return [];
    return rawItems.map(workItemToAllWork);
  }, [rawItems]);

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(item =>
      item.issue_key.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // ─── Selected item ───
  const selectedItem = useMemo(() => {
    if (!selectedIssueKey) return null;
    return filteredItems.find(i => i.issue_key === selectedIssueKey) ?? null;
  }, [filteredItems, selectedIssueKey]);

  // ─── Fallback fetch when selected item isn't in the list (e.g. deep-link) ───
  const isMissing = !!selectedIssueKey && !selectedItem && !itemsLoading;
  const { data: fetchedRaw } = useWorkItem(isMissing ? selectedIssueKey : undefined);
  const fetchedItem: AllWorkItem | null = useMemo(
    () => (fetchedRaw ? workItemToAllWork(fetchedRaw) : null),
    [fetchedRaw],
  );
  const resolvedItem = selectedItem ?? fetchedItem ?? null;

  // ─── Parent item ───
  const parentItem = useMemo(() => {
    if (!resolvedItem?.parent_key) return null;
    return items.find(i => i.issue_key === resolvedItem.parent_key) ?? null;
  }, [items, resolvedItem]);

  // ─── Children (subtasks) — useWorkItemChildren returns WorkItem[] ───
  const { data: rawChildren, isLoading: childrenLoading } = useWorkItemChildren(
    selectedIssueKey ?? undefined,
    !!selectedIssueKey,
  );
  const children: AllWorkItem[] = useMemo(() => {
    if (!rawChildren) return [];
    return rawChildren.map(workItemToAllWork);
  }, [rawChildren]);

  // Derive lookup IDs — wh_ tables use item.id, ph_issues fallback uses issue_key
  const itemId = resolvedItem?.id ?? null;
  const issueKey = resolvedItem?.issue_key ?? null;

  // ─── Links (raw wh_work_item_links rows) ───
  const { data: links = [], isLoading: linksLoading } = useWhLinks(itemId);

  // ─── Comments — pass issue_key so ph_issues JSONB fallback works ───
  const { data: comments = [], isLoading: commentsLoading } = useWhComments(issueKey);

  // ─── History — pass issue_key so ph_issues changelog fallback works ───
  const { data: history = [], isLoading: historyLoading } = useWhHistory(issueKey);

  // ─── Work logs (raw wh_work_logs rows) ───
  const { data: worklogs = [], isLoading: worklogsLoading } = useWhWorkLogs(itemId);

  // ─── Mutations ───
  const createComment = useCreateComment(issueKey ?? '');
  const logWork = useLogWork(itemId ?? '');

  return {
    items: filteredItems,
    itemsLoading,
    selectedItem,
    parentItem,
    children,
    childrenLoading,
    links,
    linksLoading,
    comments,
    commentsLoading,
    history,
    historyLoading,
    worklogs,
    worklogsLoading,
    createComment,
    logWork,
  };
}
