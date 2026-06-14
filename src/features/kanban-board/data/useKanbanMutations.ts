/**
 * useKanbanMutations — writes to the shared ph_issues data source.
 * Status change (drag/transition), flag toggle, assignee change.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { StatusCategory } from '../types';

export interface NewIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  status: string;
  category: StatusCategory;
  dueDate?: string | null;
}

export interface KanbanMutations {
  updateStatus: (issueId: string, status: string, category?: StatusCategory) => Promise<void>;
  toggleFlag: (issueId: string, isFlagged: boolean) => Promise<void>;
  updateAssignee: (issueId: string, displayName: string | null, accountId: string | null) => Promise<void>;
  createIssue: (input: NewIssueInput) => Promise<void>;
  updateSummary: (issueId: string, summary: string) => Promise<void>;
  addLabel: (issueId: string, current: string[], label: string) => Promise<void>;
  archiveIssue: (issueId: string) => Promise<void>;
  deleteIssue: (issueId: string) => Promise<void>;
  setParent: (issueId: string, parentKey: string | null, parentSummary: string | null) => Promise<void>;
  linkIssue: (sourceKey: string, targetKey: string, linkType: string) => Promise<void>;
}

function categoryToJira(cat?: StatusCategory): string | undefined {
  if (cat === 'done') return 'Done';
  if (cat === 'in_progress') return 'In Progress';
  if (cat === 'todo') return 'To Do';
  return undefined;
}

export function useKanbanMutations(): KanbanMutations {
  const updateStatus = useCallback(async (issueId: string, status: string, category?: StatusCategory) => {
    const patch: Record<string, unknown> = { status };
    const jiraCat = categoryToJira(category);
    if (jiraCat) patch.status_category = jiraCat;
    const { error } = await supabase.from('ph_issues').update(patch).eq('id', issueId);
    if (error) throw error;
  }, []);

  const toggleFlag = useCallback(async (issueId: string, isFlagged: boolean) => {
    const { error } = await supabase.from('ph_issues').update({ is_flagged: isFlagged }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const updateAssignee = useCallback(async (issueId: string, displayName: string | null, accountId: string | null) => {
    const { error } = await supabase
      .from('ph_issues')
      .update({ assignee_display_name: displayName, assignee_account_id: accountId })
      .eq('id', issueId);
    if (error) throw error;
  }, []);

  const createIssue = useCallback(async (input: NewIssueInput) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('ph_issues').insert({
      project_key: input.projectKey,
      issue_key: `${input.projectKey}-LOCAL-${Date.now()}`,
      summary: input.summary,
      issue_type: input.issueType,
      status: input.status,
      status_category: categoryToJira(input.category) ?? 'To Do',
      source: 'catalyst',
      jira_created_at: now,
      jira_updated_at: now,
      ...(input.dueDate ? { due_date: input.dueDate } : {}),
    });
    if (error) throw error;
  }, []);

  const updateSummary = useCallback(async (issueId: string, summary: string) => {
    const { error } = await supabase.from('ph_issues').update({ summary }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const addLabel = useCallback(async (issueId: string, current: string[], label: string) => {
    const next = Array.from(new Set([...(current ?? []), label]));
    const { error } = await supabase.from('ph_issues').update({ labels: next }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const archiveIssue = useCallback(async (issueId: string) => {
    const { error } = await supabase.from('ph_issues').update({ archived_at: new Date().toISOString() }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const deleteIssue = useCallback(async (issueId: string) => {
    const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const setParent = useCallback(async (issueId: string, parentKey: string | null, parentSummary: string | null) => {
    const { error } = await supabase.from('ph_issues').update({ parent_key: parentKey, parent_summary: parentSummary }).eq('id', issueId);
    if (error) throw error;
  }, []);

  const linkIssue = useCallback(async (sourceKey: string, targetKey: string, linkType: string) => {
    const { error } = await supabase.from('ph_issue_links').insert({ source_id: sourceKey, target_id: targetKey, link_type: linkType });
    if (error) throw error;
  }, []);

  return { updateStatus, toggleFlag, updateAssignee, createIssue, updateSummary, addLabel, archiveIssue, deleteIssue, setParent, linkIssue };
}
