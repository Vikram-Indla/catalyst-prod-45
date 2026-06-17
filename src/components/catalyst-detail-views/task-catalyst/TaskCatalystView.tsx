// @ts-nocheck
/**
 * TaskCatalystView — Tasks Hub canonical detail view.
 *
 * Mounts inside CatalystDetailPanel (right-side drag-resizable panel) and
 * mirrors the chrome of CatalystViewTask (top toolbar, breadcrumb, splitter,
 * more menu) by reusing the SHARED CatalystViewBase shell.
 *
 * Reads from the `tasks` table (Tasks Hub) — NOT ph_issues. Built per the
 * REUSE-FIRST + ADOPT-CANONICAL rules in CLAUDE.md so that:
 *   - Catalyst chrome stays canonical (CatalystViewBase owns the top bar,
 *     breadcrumb, more menu, splitter, Escape handling, sticky sizing).
 *   - Per-section bodies reuse the EXISTING Tasks Hub subcomponents that
 *     already render from `tasks`:
 *       TaskDescription   (description)
 *       SidebarFields     (status / priority / workstream / assignee / labels)
 *       ChecklistSection  (checklist)
 *       AttachmentsSection (files)
 *       ActivitySection   (comments + history)
 *
 * Sections intentionally hidden (zero-assumption — no fakes):
 *   - Linked work items: no `tasks ↔ tasks` link table in scope today
 *     (task_dependencies is a different model, deferred to a follow-up).
 *   - Subtasks: `tasks.parent_task_id` is wired in the schema but Tasks Hub
 *     has no subtask renderer today. Surfacing an empty section would
 *     violate the zero-assumption rule. Re-enable when a TasksSubtasksPanel
 *     is built.
 *
 * Task 1.5d (2026-06-16).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useUpdateTaskField } from '@/modules/tasks/hooks/useUpdateTaskField';
import { useDeletePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import {
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '@/modules/tasks/hooks/useTaskDetails';
import { TaskDescription } from '@/modules/tasks/components/TaskDetailDrawer/TaskDescription';
import { SidebarFields } from '@/modules/tasks/components/TaskDetailDrawer/SidebarFields';
import { ChecklistSection } from '@/modules/tasks/components/TaskDetailDrawer/ChecklistSection';
import { AttachmentsSection } from '@/modules/tasks/components/TaskDetailDrawer/AttachmentsSection';
import { ActivitySection } from '@/modules/tasks/components/TaskDetailDrawer/ActivitySection';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { KeyDetailsFieldRow } from '../shared/sections';
import type { CatalystViewBaseProps } from '../shared/types';

const PRIORITY_COLOR: Record<string, string> = {
  critical: 'var(--ds-text-danger, #dc2626)',
  high: '#ca8a04',
  medium: 'var(--ds-text-brand, #2563eb)',
  low: 'var(--ds-text-subtlest, #94a3b8)',
};

/* ═══════════════════════════════════════════
   DATA HOOK — task detail (same shape used by TaskDetailDrawer)
   ═══════════════════════════════════════════ */
function useTaskDetail(taskId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const { data, error } = await typedQuery('tasks')
        .select(`
          *,
          status:task_statuses(*),
          workstream:task_workstreams(id, name, key_prefix),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('id', taskId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!taskId && enabled,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export default function TaskCatalystView({
  isOpen, onClose, itemId, projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const queryClient = useQueryClient();
  const { data: task, isLoading } = useTaskDetail(itemId, isOpen);
  const { updateNow, updateDebounced, flushPending } = useUpdateTaskField();
  const deleteMutation = useDeletePlannerTask();

  // Local draft state for optimistic title/desc updates — mirrors the
  // TaskDetailDrawer pattern so the UI doesn't flicker between the user's
  // keystrokes and the network round-trip.
  const [draftTask, setDraftTask] = useState<any | null>(null);
  useEffect(() => {
    if (!task) return;
    setDraftTask((prev: any) => {
      if (!prev || prev.id !== task.id) return task;
      return { ...prev, ...task };
    });
  }, [task]);
  const t = draftTask ?? task;

  // Related data — reuse existing tasks-hub hooks.
  const { data: checklist } = useTaskChecklist(itemId);
  const { data: attachments } = useTaskAttachments(itemId);
  const { data: comments } = useTaskComments(itemId);
  const { data: activity } = useTaskActivity(itemId);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Flush any pending debounced writes when the panel closes.
  useEffect(() => {
    return () => {
      if (itemId) flushPending(itemId);
    };
  }, [itemId, flushPending]);

  /* ── Field update handlers (debounced for text, immediate for selects) ── */
  const handleFieldUpdate = useCallback((field: string, value: any) => {
    if (!itemId) return;
    setDraftTask((prev: any) => (prev ? { ...prev, [field]: value } : prev));
    updateNow(itemId, field, value);
  }, [itemId, updateNow]);

  const handleTextFieldUpdate = useCallback((field: string, value: any) => {
    if (!itemId) return;
    setDraftTask((prev: any) => (prev ? { ...prev, [field]: value } : prev));
    updateDebounced(itemId, field, value, 500);
  }, [itemId, updateDebounced]);

  const handleTitleBlur = useCallback((newTitle: string) => {
    if (!itemId) return;
    const next = (newTitle || '').trim();
    if (!next || next === t?.title) return;
    handleFieldUpdate('title', next);
  }, [itemId, t?.title, handleFieldUpdate]);

  const handleDelete = useCallback(async () => {
    if (!itemId) return;
    try {
      await deleteMutation.mutateAsync(itemId);
      catalystToast.success('Task deleted', t?.key ?? undefined);
      onClose();
    } catch (e) {
      catalystToast.error('Delete failed', e instanceof Error ? e.message : String(e));
    }
  }, [itemId, deleteMutation, t?.key, onClose]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/tasks/task-list?openTask=${itemId}`;
    navigator.clipboard.writeText(url).then(
      () => catalystToast.success('Link copied'),
      () => catalystToast.error('Copy failed'),
    );
  }, [itemId]);

  /* ── leftContent ──────────────────────────── */
  /* Section header style is inlined per-h2 (16px/653/--ds-text) per CLAUDE.md
     2026-05-12 + design-governance typography-enforcer regex which requires
     inline fontSize+fontWeight on the same line as the <h2>. */
  const leftContent = useMemo(() => {
    if (isLoading || !t) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle, #505258)' }}>
          {isLoading ? 'Loading…' : 'Task not found'}
        </div>
      );
    }
    return (
      <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Title — inline-editable, contenteditable to match TaskDetailDrawer. */}
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => handleTitleBlur(e.currentTarget.textContent || '')}
          style={{
            fontSize: 24,
            fontWeight: 653,
            lineHeight: '28px',
            color: 'var(--ds-text, #292A2E)',
            margin: '8px 0 4px',
            outline: 'none',
            cursor: 'text',
          }}
        >
          {t.title}
        </h1>

        {/* Key details — type, priority, workstream (mirrors CatalystKeyDetails pattern) */}
        <div style={{
          borderBottom: '1px solid var(--ds-border, #DFE1E6)',
          paddingBottom: 8,
          marginBottom: 4,
        }}>
          <KeyDetailsFieldRow label="Priority">
            {t.priority ? (
              <span style={{ fontSize: 14, fontWeight: 500, color: PRIORITY_COLOR[t.priority] || 'var(--ds-text-subtle, #505258)' }}>
                {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
              </span>
            ) : (
              <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, #6B778C)' }}>–</span>
            )}
          </KeyDetailsFieldRow>
          {t.workstream?.name && (
            <KeyDetailsFieldRow label="Workstream">
              <span style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)' }}>{t.workstream.name}</span>
            </KeyDetailsFieldRow>
          )}
        </div>

        {/* Description */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0, padding: '12px 16px 8px' }}>Description</h2>
          <div style={{ padding: '0 16px' }}>
            <TaskDescription
              taskId={itemId}
              value={t.description || ''}
              onChange={(desc) => handleTextFieldUpdate('description', desc)}
            />
          </div>
        </section>

        {/* Checklist — hide when empty per zero-assumption rule */}
        {checklist && checklist.length > 0 && (
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0, padding: '12px 16px 8px' }}>Checklist ({checklist.length})</h2>
            <div style={{ padding: '0 16px' }}>
              <ChecklistSection taskId={itemId} items={checklist} />
            </div>
          </section>
        )}

        {/* Attachments — hide when empty per zero-assumption rule */}
        {attachments && attachments.length > 0 && (
          <section>
            <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0, padding: '12px 16px 8px' }}>Files ({attachments.length})</h2>
            <div style={{ padding: '0 16px' }}>
              <AttachmentsSection taskId={itemId} attachments={attachments} />
            </div>
          </section>
        )}

        {/* Activity — always shown so users can add the first comment */}
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 653, color: 'var(--ds-text, #292A2E)', margin: 0, padding: '12px 16px 8px' }}>Activity</h2>
          <div style={{ padding: '0 16px' }}>
            <ActivitySection
              taskId={itemId}
              comments={comments || []}
              activity={activity || []}
            />
          </div>
        </section>
      </div>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, isLoading, itemId, checklist, attachments, comments, activity, handleTitleBlur, handleTextFieldUpdate]);

  /* ── rightContent (sidebar — fields + timestamps) ──────── */
  const rightContent = useMemo(() => {
    if (!t) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '8px 16px', flex: 1, overflow: 'auto' }}>
          <SidebarFields task={t} onFieldChange={handleFieldUpdate} />

          {/* Timestamps — Created / Updated (CLAUDE.md zero-assumption: only
              render when the value is real). */}
          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {t.created_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Created</span>
                <span style={{ color: 'var(--ds-text, #292A2E)' }}>
                  {format(new Date(t.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {t.updated_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>Updated</span>
                <span style={{ color: 'var(--ds-text, #292A2E)' }}>
                  {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [t, handleFieldUpdate]);

  /* ── Render ──────────────────────────────── */
  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Task"
        // 2026-06-17: tasks are identified by `key` (PLN-N) — the live DB
        // schema does not expose `task_key`. The BEFORE-INSERT trigger
        // always fills `key`.
        itemKey={t?.key || null}
        projectKey={t?.workstream?.key_prefix || projectKey || ''}
        projectName={t?.workstream?.name || 'Tasks'}
        parentKey={null}
        parentType="Task"
        // No add-parent affordance for tasks today — parent_task_id exists but
        // there is no parent picker built (skip onParentChange).
        moreMenuItems={[
          { label: 'Copy link', onClick: handleCopyLink },
          { label: 'Delete', onClick: () => setShowDeleteDialog(true), danger: true },
        ]}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
        isNotFound={!isLoading && task === null}
        hideSidebar={hideSidebar}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={t?.key || ''}
        issueSummary={t?.title}
        typeLabel="task"
        onConfirm={handleDelete}
      />
    </>
  );
}
