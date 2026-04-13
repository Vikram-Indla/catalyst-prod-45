/**
 * useIssueViewData — Composite hook for the 3-column hierarchy/allwork view
 * ════════════════════════════════════════════════════════════════════════════
 * Wires to existing Supabase hooks. Single entry point for all panel data.
 * Handles: item list, selected item detail, comments, links, history, children.
 */
import { useMemo, useCallback } from 'react';
import { useProjectAllWorkItems, useWorkItemChildren, useSearchWorkItems } from '@/hooks/useProjectListItems';
import { useWhComments, useWhLinks, useWhHistory, useCreateComment, useAddLink } from '@/hooks/workhub/useAllWork';
import type { AllWorkItem } from '@/types/allwork.types';
import { normalizeWorkItem } from '@/types/allwork.types';

interface IssueViewData {
  // Left panel
  items: AllWorkItem[];
  itemsLoading: boolean;

  // Selected item (normalized)
  selectedItem: AllWorkItem | null;

  // Hierarchy
  parentItem: AllWorkItem | null;
  children: AllWorkItem[];
  childrenLoading: boolean;

  // Links
  links: any[];
  linksLoading: boolean;

  // Comments
  comments: any[];
  commentsLoading: boolean;

  // History
  history: any[];
  historyLoading: boolean;

  // Mutations
  createComment: ReturnType<typeof useCreateComment>;
}

export function useIssueViewData(
  projectKey: string | undefined,
  selectedIssueKey: string | null,
  searchQuery: string,
) {
  // ─── Left panel: issue list ───
  const { data: rawItems, isLoading: itemsLoading } = useProjectAllWorkItems(projectKey);

  // Normalize to AllWorkItem shape
  const items: AllWorkItem[] = useMemo(() => {
    if (!rawItems) return [];
    return rawItems.map((item: any) => normalizeWorkItem(item));
  }, [rawItems]);

  // Search filtering (client-side for instant response)
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

  // ─── Parent item (if selected item has parent_key) ───
  const parentItem = useMemo(() => {
    if (!selectedItem?.parent_key) return null;
    return items.find(i => i.issue_key === selectedItem.parent_key) ?? null;
  }, [items, selectedItem]);

  // ─── Children (subtasks) ───
  const { data: rawChildren, isLoading: childrenLoading } = useWorkItemChildren(
    selectedIssueKey ?? undefined,
    !!selectedIssueKey,
  );
  const children: AllWorkItem[] = useMemo(() => {
    if (!rawChildren) return [];
    return rawChildren.map((c: any) => normalizeWorkItem(c));
  }, [rawChildren]);

  // ─── Links ───
  const { data: links = [], isLoading: linksLoading } = useWhLinks(
    selectedItem?.id ?? null,
  );

  // ─── Comments ───
  const { data: comments = [], isLoading: commentsLoading } = useWhComments(
    selectedItem?.id ?? null,
  );

  // ─── History ───
  const { data: history = [], isLoading: historyLoading } = useWhHistory(
    selectedItem?.id ?? null,
  );

  // ─── Mutations ───
  const createComment = useCreateComment(selectedItem?.id ?? '');

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
    createComment,
  };
}
