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
import { validateReleaseTransition } from '@/lib/release-ops/lifecycle';
import { gateTransition, resolveCanonicalCategory } from '@/lib/workflow/canonical/runtime';
import type { EntityKey } from '@/lib/workflow/canonical/contracts';
import type { StatusCategory } from '../types';
import type { KanbanMode } from './useKanbanData';

// issue_type -> canonical entity_key (only entities on the canonical engine).
// Enforcement (advisory|blocking) is resolved per project+entity from
// ph_wf_enforcement_config inside gateTransition — never a global flag.
const KANBAN_ISSUE_TYPE_TO_ENTITY: Record<string, EntityKey> = { Story: 'story', Epic: 'epic', Feature: 'feature', 'Sub-task': 'subtask' };

export interface NewIssueInput {
  projectKey: string;
  summary: string;
  issueType: string;
  status: string;
  category: StatusCategory;
  dueDate?: string | null;
}

export type MovePositionDirection = 'up' | 'down' | 'top' | 'bottom';

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
  /** Move a card within its column (persistent DB rank via kanban_move_position RPC).
   *  columnIssueIds must be the FULL current-column ordering as the client sees it. */
  moveIssuePosition: (issueId: string, direction: MovePositionDirection, columnIssueIds: string[]) => Promise<void>;
  /** Re-rank a column to an arbitrary order (drop-between-cards drag).
   *  newColumnIds is the FINAL desired order — server assigns 1024-step positions. */
  reorderColumn: (newColumnIds: string[]) => Promise<void>;
}

function categoryToJira(cat?: StatusCategory): string | undefined {
  if (cat === 'done') return 'Done';
  if (cat === 'in_progress') return 'In Progress';
  if (cat === 'todo') return 'To Do';
  return undefined;
}

/* Generate a unique MDT-XXXXX request_key (5-digit zero-padded, mirrors useBusinessRequests.ts).
   business_requests uses one global keyspace regardless of product. */
async function generateRequestKey(): Promise<string> {
  const { data } = await (supabase as any)
    .from('business_requests')
    .select('request_key')
    .not('request_key', 'is', null)
    .limit(2000);
  let maxNum = 0;
  ((data ?? []) as Array<{ request_key: string | null }>).forEach((r) => {
    const m = r.request_key?.match(/MDT-(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  if (maxNum === 0) {
    return `MDT-${Date.now().toString().slice(-5)}`;
  }
  return `MDT-${String(maxNum + 1).padStart(5, '0')}`;
}

/* 2026-06-17: helper — resolve a task status NAME → task_statuses.id so
   updateStatus can write `status_id` on the `tasks` row. The `status` arg
   from the board is the column's primary status NAME. */
async function resolveTaskStatusIdByName(name: string): Promise<string | null> {
  const { data } = await (supabase as any)
    .from('task_statuses').select('id').eq('name', name).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export function useKanbanMutations(mode: KanbanMode = 'project'): KanbanMutations {
  const isProduct = mode === 'product';
  const isTasks = mode === 'tasks';
  const isRelease = mode === 'release';
  const isTest = mode === 'test';

  /* ── updateStatus ──────────────────────────────────────────────────── */
  const updateStatus = useCallback(async (issueId: string, status: string, category?: StatusCategory) => {
    if (isTest) {
      const dbStatus = status.toLowerCase(); // DB stores lowercase
      const { error } = await (supabase as any)
        .from('tm_test_cases')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isRelease) {
      /* Release status moves go through validateReleaseTransition so the
         canonical board enforces the same lifecycle guards the dedicated
         release-status hook does. A rejected transition throws and the
         board rolls the card back. */
      const guard = await validateReleaseTransition(issueId, status);
      if (!guard.ok) throw new Error(guard.reason ?? 'Release transition not allowed');
      const { error } = await supabase
        .from('rh_releases')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isTasks) {
      const statusId = await resolveTaskStatusIdByName(status);
      if (!statusId) throw new Error(`Unknown task status: ${status}`);
      const { error } = await (supabase as any)
        .from('tasks')
        .update({ status_id: statusId, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests')
        .update({ process_step: status })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    // Pre-fetch row context (incl. guard fields) for canonical Story gate.
    const { data: before } = await supabase
      .from('ph_issues')
      .select('id, issue_type, status, project_key, description_text, assignee_account_id, assignee_display_name, reporter_account_id')
      .eq('id', issueId)
      .maybeSingle();
    const entityKey = before?.issue_type ? KANBAN_ISSUE_TYPE_TO_ENTITY[before.issue_type] : undefined;

    // Canonical gate BEFORE persistence. In BLOCKING mode a denied move throws
    // → the board's onError reverts the card to its original column.
    if (entityKey && before?.id) {
      const gate = await gateTransition({
        entityKey,
        issueRow: before,
        toStatusRaw: status,
        sourceSurface: 'kanban_drag',
      });
      if (gate.blocked) {
        throw new Error(gate.message ?? 'Move blocked by workflow.');
      }
      if (gate.reasonRequired) {
        throw new Error('This transition requires a reason. Open the issue detail to provide one.');
      }
    }

    const patch: Record<string, unknown> = { status };
    const jiraCat = categoryToJira(category);
    if (jiraCat) patch.status_category = jiraCat;
    // Story: category from workflow config (not keyword/board column).
    if (entityKey) {
      const configCat = await resolveCanonicalCategory(entityKey, before?.project_key ?? null, status);
      if (configCat) patch.status_category = configCat;
    }

    const { error } = await supabase.from('ph_issues').update(patch).eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── toggleFlag ────────────────────────────────────────────────────── */
  /* 2026-07-01: all 5 mode tables now have is_flagged + was_flagged
     (migration 20260701131032_flag_columns_all_modes). Same write across all
     modes: set is_flagged; sticky was_flagged flips true on add, never resets. */
  const toggleFlag = useCallback(async (issueId: string, isFlagged: boolean) => {
    const table = isTest    ? 'tm_test_cases'
                : isRelease ? 'rh_releases'
                : isTasks   ? 'tasks'
                : isProduct ? 'business_requests'
                :             'ph_issues';
    const patch: Record<string, unknown> = { is_flagged: isFlagged };
    if (isFlagged) patch.was_flagged = true;
    const { error } = await (supabase as any).from(table).update(patch).eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── updateAssignee ────────────────────────────────────────────────── */
  const updateAssignee = useCallback(async (issueId: string, displayName: string | null, accountId: string | null) => {
    if (isTest) {
      let profileId: string | null = null;
      if (displayName) {
        const { data } = await supabase
          .from('profiles').select('id').eq('full_name', displayName).maybeSingle();
        profileId = (data as { id: string } | null)?.id ?? null;
      }
      const { error } = await (supabase as any)
        .from('tm_test_cases')
        .update({ assigned_to: profileId, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isRelease) {
      /* Releases store the lead as release_manager_id (uuid). Resolve
         displayName → profile.id; null clears. */
      let profileId: string | null = null;
      if (displayName) {
        const { data } = await supabase
          .from('profiles').select('id').eq('full_name', displayName).maybeSingle();
        profileId = (data as { id: string } | null)?.id ?? null;
      }
      const { error } = await supabase
        .from('rh_releases')
        .update({ release_manager_id: profileId, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isTasks) {
      let profileId: string | null = null;
      if (displayName) {
        const { data } = await supabase
          .from('profiles').select('id').eq('full_name', displayName).maybeSingle();
        profileId = (data as { id: string } | null)?.id ?? null;
      }
      const { error } = await (supabase as any)
        .from('tasks')
        .update({ assignee_id: profileId, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
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
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── createIssue ───────────────────────────────────────────────────── */
  const createIssue = useCallback(async (input: NewIssueInput) => {
    const now = new Date().toISOString();
    if (isTest) {
      /* input.projectKey is the TM project UUID passed by the host page. */
      const dbStatus = input.status.toLowerCase();
      const { error } = await (supabase as any).from('tm_test_cases').insert({
        project_id: input.projectKey,
        title: input.summary,
        status: dbStatus,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      return;
    }
    if (isRelease) {
      /* target_date is NOT NULL — seed with today; user reschedules later. */
      const todayDate = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('rh_releases').insert({
        name: input.summary,
        status: input.status,
        source: 'catalyst',
        target_date: todayDate,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      return;
    }
    if (isTasks) {
      const statusId = await resolveTaskStatusIdByName(input.status);
      if (!statusId) throw new Error(`Unknown task status: ${input.status}`);
      const { error } = await (supabase as any).from('tasks').insert({
        title: input.summary,
        status_id: statusId,
        priority: 'medium',
        created_at: now,
        updated_at: now,
        ...(input.dueDate ? { due_date: input.dueDate } : {}),
      });
      if (error) throw error;
      return;
    }
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
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── updateSummary ─────────────────────────────────────────────────── */
  const updateSummary = useCallback(async (issueId: string, summary: string) => {
    if (isTest) {
      const { error } = await (supabase as any)
        .from('tm_test_cases').update({ title: summary, updated_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isRelease) {
      const { error } = await supabase
        .from('rh_releases')
        .update({ name: summary, updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isTasks) {
      const { error } = await (supabase as any)
        .from('tasks').update({ title: summary, updated_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests').update({ title: summary }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issues').update({ summary }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── addLabel ──────────────────────────────────────────────────────── */
  const addLabel = useCallback(async (issueId: string, current: string[], label: string) => {
    const next = Array.from(new Set([...(current ?? []), label]));
    if (isTest) {
      void issueId; void next;
      return;
    }
    if (isRelease) {
      /* rh_releases has no labels/tags column today — silent no-op so the
         card menu's add-label item doesn't error in release mode. */
      void issueId; void next;
      return;
    }
    if (isTasks) {
      const { error } = await (supabase as any)
        .from('tasks').update({ tags: next, updated_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_requests').update({ tags: next }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issues').update({ labels: next }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── archiveIssue ──────────────────────────────────────────────────── */
  const archiveIssue = useCallback(async (issueId: string) => {
    if (isTest) {
      const dbStatus = 'deprecated';
      const { error } = await (supabase as any)
        .from('tm_test_cases').update({ status: dbStatus, updated_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isRelease) {
      /* rh_releases has no archived_at — fall through to status='cancelled'
         (canonical "soft retire" for a release). Lifecycle guards still apply. */
      const guard = await validateReleaseTransition(issueId, 'cancelled');
      if (!guard.ok) throw new Error(guard.reason ?? 'Cannot archive release');
      const { error } = await supabase
        .from('rh_releases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isTasks) {
      const { error } = await (supabase as any)
        .from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      return;
    }
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
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── deleteIssue ───────────────────────────────────────────────────── */
  const deleteIssue = useCallback(async (issueId: string) => {
    if (isTest) {
      const { error } = await (supabase as any).from('tm_test_cases').delete().eq('id', issueId);
      if (error) throw error;
      return;
    }
    if (isRelease) {
      /* rh_releases has no deleted_at — route delete through the same
         status='cancelled' soft retire as archive. Lifecycle guards apply. */
      const guard = await validateReleaseTransition(issueId, 'cancelled');
      if (!guard.ok) throw new Error(guard.reason ?? 'Cannot delete release');
      const { error } = await supabase
        .from('rh_releases')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', issueId);
      if (error) throw error;
      return;
    }
    const table = isTasks ? 'tasks' : isProduct ? 'business_requests' : 'ph_issues';
    const { error } = await (supabase as any).from(table).update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── setParent ─────────────────────────────────────────────────────── */
  const setParent = useCallback(async (issueId: string, parentKey: string | null, parentSummary: string | null) => {
    if (isTest) {
      void parentKey; void parentSummary; void issueId;
      return;
    }
    if (isRelease) {
      /* Releases have no parent_key hierarchy — silent no-op. */
      void parentKey; void parentSummary; void issueId;
      return;
    }
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
    if (isTasks) {
      /* tasks table has no parent_key / parent_summary columns — no-op. */
      void parentKey; void parentSummary; void issueId;
      return;
    }
    const { error } = await supabase
      .from('ph_issues')
      .update({ parent_key: parentKey, parent_summary: parentSummary })
      .eq('id', issueId);
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── linkIssue ─────────────────────────────────────────────────────── */
  const linkIssue = useCallback(async (sourceKey: string, targetKey: string, linkType: string) => {
    if (isTest) {
      void sourceKey; void targetKey; void linkType;
      return;
    }
    if (isRelease) {
      /* No release-link table today — no-op. */
      void sourceKey; void targetKey; void linkType;
      return;
    }
    if (isTasks) {
      /* No issue-links table for tasks in v1. No-op. */
      void sourceKey; void targetKey; void linkType;
      return;
    }
    if (isProduct) {
      const { error } = await (supabase as any)
        .from('business_request_relations')
        .insert({ source_key: sourceKey, target_key: targetKey, link_type: linkType });
      if (error) throw error;
      return;
    }
    const { error } = await supabase.from('ph_issue_links').insert({ source_id: sourceKey, target_id: targetKey, link_type: linkType });
    if (error) throw error;
  }, [isProduct, isTasks, isRelease, isTest]);

  /* ── moveIssuePosition ─────────────────────────────────────────────────
     Persistent per-column reorder. Dispatch the mode to its underlying
     table and hand the whole column's current ordering to the RPC so the
     server can locate the neighbour, seed NULL ranks in one pass, and
     swap positions atomically. */
  const moveIssuePosition = useCallback(
    async (issueId: string, direction: MovePositionDirection, columnIssueIds: string[]) => {
      const table = isTest    ? 'tm_test_cases'
                  : isRelease ? 'rh_releases'
                  : isTasks   ? 'tasks'
                  : isProduct ? 'business_requests'
                  :             'ph_issues';
      const { error } = await (supabase as any).rpc('kanban_move_position', {
        p_table: table,
        p_issue_id: issueId,
        p_direction: direction,
        p_column_ids: columnIssueIds,
      });
      if (error) throw error;
    },
    [isProduct, isTasks, isRelease, isTest],
  );

  /* ── reorderColumn ─────────────────────────────────────────────────────
     Called after a drag-drop within a single column. newColumnIds is the
     desired new order; the RPC rewrites board_position for every id. */
  const reorderColumn = useCallback(
    async (newColumnIds: string[]) => {
      if (!newColumnIds.length) return;
      const table = isTest    ? 'tm_test_cases'
                  : isRelease ? 'rh_releases'
                  : isTasks   ? 'tasks'
                  : isProduct ? 'business_requests'
                  :             'ph_issues';
      const { error } = await (supabase as any).rpc('kanban_reorder_column', {
        p_table: table,
        p_column_ids: newColumnIds,
      });
      if (error) throw error;
    },
    [isProduct, isTasks, isRelease, isTest],
  );

  return { updateStatus, toggleFlag, updateAssignee, createIssue, updateSummary, addLabel, archiveIssue, deleteIssue, setParent, linkIssue, moveIssuePosition, reorderColumn };
}
