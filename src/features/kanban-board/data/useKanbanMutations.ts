/**
 * useKanbanMutations — board writes for both project and product modes.
 *
 * Mode switch (2026-06-15) per CLAUDE.md "ADOPT CANONICAL COMPONENTS":
 *   - mode='project' → ph_issues / ph_issue_links (existing behavior)
 *   - mode='product' → business_requests / business_request_relations
 *
 * All product columns landed in migration 20260615120000_product_board_parity:
 *   business_requests.is_flagged, .parent_request_id, .tags
 *   public.business_request_relations (mirrors ph_issue_links shape)
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';
import type { StatusCategory } from '../types';
import type { KanbanMode } from './useKanbanData';

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

/* Generate a unique MIM-N request_key (mirrors src/hooks/useBusinessRequests.ts).
   business_requests uses one global keyspace (MIM-1, MIM-2, ...) regardless
   of product. Falls back to a timestamp-based key on lookup failure so we
   never block creation. */
async function generateRequestKey(): Promise<string> {
  const { data } = await (supabase as any)
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(2000);
  let maxNum = 0;
  ((data ?? []) as Array<{ request_key: string | null }>).forEach((r) => {
    const m = r.request_key?.match(/MIM-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  if (maxNum === 0) {
    return `MIM-${Date.now().toString().slice(-6)}`;
  }
  return `MIM-${maxNum + 1}`;
}

export function useKanbanMutations(mode: KanbanMode = 'project'): KanbanMutations {
  const isProduct = mode === 'product';

  /* ── updateStatus ──────────────────────────────────────────────────── */
  const updateStatus = useCallback(async (issueId: string, status: string, category?: StatusCategory) => {
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests')
        .update({ process_step: status })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    const patch: Record<string, unknown> = { status };
    const jiraCat = categoryToJira(category);
    if (jiraCat) patch.status_category = jiraCat;
    const { error } = await supabase.from('ph_issues').update(patch).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── toggleFlag ────────────────────────────────────────────────────── */
  const toggleFlag = useCallback(async (issueId: string, isFlagged: boolean) => {
    const table = isProduct ? 'business_requests' : 'ph_issues';
    const { error } = await (supabase as any).from(table).update({ is_flagged: isFlagged }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── updateAssignee ────────────────────────────────────────────────── */
  const updateAssignee = useCallback(async (issueId: string, displayName: string | null, accountId: string | null) => {
    if (isProduct) {
      /* Product: assignee is stored as `project_manager_user_id` (uuid) on
         business_requests. We need to resolve displayName → profile.id. If
         displayName is null, clear the field. */
      let profileId: string | null = null;
      if (displayName) {
        const { data } = await supabase
          .from('profiles').select('id').eq('full_name', displayName).maybeSingle();
        profileId = (data as { id: string } | null)?.id ?? null;
      }
      const { error } = await (supabase as any)
        .from('business_requests')
        .update({ project_manager_user_id: profileId })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from('ph_issues')
      .update({ assignee_display_name: displayName, assignee_account_id: accountId })
      .eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── createIssue ───────────────────────────────────────────────────── */
  const createIssue = useCallback(async (input: NewIssueInput) => {
    const now = new Date().toISOString();
    if (isProduct) {
      /* Product create: input.projectKey holds the product CODE. We need
         the product UUID for product_id. The host passes a product key here
         because that is what the inline create form has; we look up the
         product row by code+is_active. */
      const { data: prodRow } = await (supabase as any)
        .from('products').select('id').eq('code', input.projectKey).eq('is_active', true).maybeSingle();
      const productId = (prodRow as { id: string } | null)?.id ?? null;
      if (!productId) {
        throw new Error(`No active product found for code ${input.projectKey}`);
      }
      const requestKey = await generateRequestKey();
      const { error } = await (supabase as any).from('business_requests').insert({
        request_key: requestKey,
        product_id: productId,
        title: input.summary,
        process_step: input.status,
        urgency: 'Medium',
        is_flagged: false,
        tags: [],
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      return;
    }
    const issueKey = await generateIssueKey(input.projectKey);
    const { error } = await supabase.from('ph_issues').insert({
      project_key: input.projectKey,
      issue_key: issueKey,
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
  }, [isProduct]);

  /* ── updateSummary ─────────────────────────────────────────────────── */
  const updateSummary = useCallback(async (issueId: string, summary: string) => {
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests').update({ title: summary }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issues').update({ summary }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── addLabel ──────────────────────────────────────────────────────── */
  const addLabel = useCallback(async (issueId: string, current: string[], label: string) => {
    const next = Array.from(new Set([...(current ?? []), label]));
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests').update({ tags: next }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issues').update({ labels: next }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── archiveIssue ──────────────────────────────────────────────────── */
  const archiveIssue = useCallback(async (issueId: string) => {
    if (isProduct) {
      /* business_requests has no archived_at — soft-delete instead, matching
         the OLD KanbanBoardPage product branch behavior. */
      const { error } = await (supabase as any)
        .from('business_requests').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issues').update({ archived_at: new Date().toISOString() }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── deleteIssue ───────────────────────────────────────────────────── */
  const deleteIssue = useCallback(async (issueId: string) => {
    const table = isProduct ? 'business_requests' : 'ph_issues';
    const { error } = await (supabase as any).from(table).update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── setParent ─────────────────────────────────────────────────────── */
  const setParent = useCallback(async (issueId: string, parentKey: string | null, parentSummary: string | null) => {
    if (isProduct) {
      /* Resolve parent request_key → parent uuid. Skip when clearing. */
      let parentId: string | null = null;
      if (parentKey) {
        const { data } = await (supabase as any)
          .from('business_requests').select('id').eq('request_key', parentKey).maybeSingle();
        parentId = (data as { id: string } | null)?.id ?? null;
        if (!parentId) {
          throw new Error(`Parent BR with request_key=${parentKey} not found`);
        }
      }
      const { error } = await (supabase as any)
        .from('business_requests').update({ parent_request_id: parentId }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from('ph_issues')
      .update({ parent_key: parentKey, parent_summary: parentSummary })
      .eq('id', issueId);
    if (error) throw error;
  }, [isProduct]);

  /* ── linkIssue ─────────────────────────────────────────────────────── */
  const linkIssue = useCallback(async (sourceKey: string, targetKey: string, linkType: string) => {
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_request_relations')
        .insert({ source_key: sourceKey, target_key: targetKey, link_type: linkType });
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issue_links').insert({ source_id: sourceKey, target_id: targetKey, link_type: linkType });
    if (error) throw error;
  }, [isProduct]);

  return { updateStatus, toggleFlag, updateAssignee, createIssue, updateSummary, addLabel, archiveIssue, deleteIssue, setParent, linkIssue };
}
