// @ts-nocheck
/**
 * TaskCatalystView — Tasks Hub canonical detail view.
 *
 * 2026-06-17 rewrite v3: mounts the CANONICAL `Description` + `CatalystSidebarDetails`
 * components (not parallel reimplementations). Feeds them tasks-table data via the
 * `saveOverride` / `loadAdf` props on Description and the `dataSource` adapter on
 * CatalystSidebarDetails — both added 2026-06-17 to honor the CLAUDE.md
 * "Adopt canonical components" rule (2026-06-01).
 *
 * Data flow:
 *   - Reads from `tasks` table via useTaskDetail (joined to status / workstream /
 *     assignee).
 *   - Writes via useUpdateTaskField (debounced for text, immediate for selects),
 *     plus direct supabase.from('tasks').update(...) calls inside the dataSource
 *     adapter callbacks.
 *   - Comments + activity stream into the canonical ActivityPanel through inline
 *     adapters (mapTaskCommentToCds + mapTaskActivityToCds). No worklog tab —
 *     tasks have no worklog model.
 *
 * Nav button fix: CatalystViewBase's "Open in full page" defaults to
 *   /project-hub/{projectKey}/backlog/{itemKey} which 404s for tasks. We pass
 *   `fullPageHrefBuilder` → `/tasks/view/<task-key>` (full-page detail).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import {
  CatalystTitleEditor,
  CatalystQuickActions,
  CatalystStatusPill,
  CatalystKeyDetails,
  Description,
  CatalystSidebarDetails,
} from '../shared/sections';
import { ActivityPanel } from '@/components/catalyst-ds';
import type { CdsComment, CdsActivityItem, CdsUser } from '@/components/catalyst-ds';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTaskField } from '@/modules/tasks/hooks/useUpdateTaskField';
import { useDeletePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import {
  useTaskChecklist,
  useTaskAttachments,
  useTaskComments,
  useTaskActivity,
} from '@/modules/tasks/hooks/useTaskDetails';
import { ChecklistSection } from '@/modules/tasks/components/TaskDetailDrawer/ChecklistSection';
import { AttachmentsSection } from '@/modules/tasks/components/TaskDetailDrawer/AttachmentsSection';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';

/* ═══════════════════════════════════════════
   DATA HOOK — task detail
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
   ADAPTERS — zero-assumption: never typed fallbacks.
   ═══════════════════════════════════════════ */
function taskToPseudoIssue(task: any): any | null {
  if (!task) return null;
  const slug = task.status?.slug ?? null;
  const statusCategory =
    slug === 'done' ? 'done'
    : (slug === 'in-progress' || slug === 'in_progress' || slug === 'review') ? 'inprogress'
    : (slug === 'backlog' || slug === 'planned' || slug === 'todo') ? 'todo'
    : null;
  return {
    id: task.id,
    issue_key: task.key ?? null,
    summary: task.title ?? '',
    description_adf: null,
    description_text: task.description ?? null,
    status: task.status?.name ?? null,
    status_category: statusCategory,
    /* tasks.priority is stored lowercase (critical/high/medium/low).
       EditablePriority + PriorityIcon expect capitalized labels
       (Critical/High/Medium/Low). Capitalize for display; lowercase on
       write inside dataSource.onPriorityChange. */
    priority: task.priority
      ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase()
      : null,
    issue_type: 'Task',
    parent_key: null,
    parent_summary: null,
    assignee_account_id: task.assignee?.id ?? null,
    assignee_display_name: task.assignee?.full_name ?? null,
    reporter_account_id: null,
    reporter_display_name: null,
    project_key: task.workstream?.key_prefix ?? null,
    project_name: task.workstream?.name ?? null,
    sprint_release: null,
    labels: null,
    due_date: task.due_date ?? null,
    jira_created_at: task.created_at ?? null,
    jira_updated_at: task.updated_at ?? null,
    deleted_at: null,
  };
}

/**
 * Wrap plain-text task description into a minimal ADF doc so the canonical
 * Tiptap Description component can render and edit it. The reverse is the
 * `tiptapAdfToPlainText` helper below — collapses ADF back to plain text
 * on save.
 */
function plainTextToAdf(text: string | null | undefined): any | null {
  const s = (text ?? '').toString();
  if (!s.trim()) {
    // Empty doc — Description renders the "Add a description…" placeholder.
    return { type: 'doc', version: 1, content: [] };
  }
  // Split on newlines so paragraphs survive a round-trip.
  const paragraphs = s.split(/\r?\n/).map((line) => ({
    type: 'paragraph',
    content: line.length > 0 ? [{ type: 'text', text: line }] : [],
  }));
  return { type: 'doc', version: 1, content: paragraphs };
}

/**
 * Collapse an ADF doc to plain text for the tasks.description column.
 * Walks paragraphs and stringifies their text runs joined by newlines.
 */
function tiptapAdfToPlainText(adf: any): string {
  if (!adf || !Array.isArray(adf.content)) return '';
  const lines: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      // Append to current line buffer.
      if (lines.length === 0) lines.push('');
      lines[lines.length - 1] += node.text;
      return;
    }
    if (node.type === 'hardBreak') {
      if (lines.length === 0) lines.push('');
      lines[lines.length - 1] += '\n';
      return;
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      lines.push('');
      if (Array.isArray(node.content)) node.content.forEach(walk);
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  if (Array.isArray(adf.content)) adf.content.forEach(walk);
  return lines.join('\n').trim();
}

/** task_comments row → CdsComment. */
function mapTaskCommentToCds(raw: any): CdsComment {
  const profile = raw.author;
  return {
    id: raw.id,
    author: {
      id: raw.author_id ?? 'unknown',
      name: profile?.full_name ?? profile?.email ?? 'Unknown',
      avatarUrl: profile?.avatar_url ?? null,
      email: profile?.email,
    },
    content: raw.content ?? '',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    isEdited: raw.updated_at && raw.updated_at !== raw.created_at,
    parentId: null,
  };
}

/** task_activity row → CdsActivityItem. */
function mapTaskActivityToCds(raw: any): CdsActivityItem {
  const profile = raw.actor;
  const action = raw.action_type ?? '';
  let type: CdsActivityItem['type'] = 'update';
  if (action === 'created' || action === 'create') type = 'create';
  else if (action === 'deleted' || action === 'delete') type = 'delete';

  const fieldChange = (() => {
    if (!action) return undefined;
    if (action === 'status_changed' || action === 'status_change')
      return { field: 'status', oldValue: raw.old_value ?? null, newValue: raw.new_value ?? null };
    if (action === 'priority_changed')
      return { field: 'priority', oldValue: raw.old_value ?? null, newValue: raw.new_value ?? null };
    if (action === 'assignee_changed' || action === 'assignment')
      return { field: 'assignee', oldValue: raw.old_value ?? null, newValue: raw.new_value ?? null };
    return undefined;
  })();

  return {
    id: raw.id,
    type,
    actor: {
      id: raw.actor_id ?? raw.user_id ?? 'system',
      name: profile?.full_name ?? 'System',
      avatarUrl: profile?.avatar_url ?? null,
    },
    timestamp: raw.created_at,
    description: type === 'create' ? 'created this task' : (action === 'updated' ? 'updated this task' : undefined),
    fieldChange,
  };
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
  const { user } = useAuth();
  const { data: task, isLoading } = useTaskDetail(itemId, isOpen);
  const { updateNow, updateDebounced, flushPending } = useUpdateTaskField();
  const deleteMutation = useDeletePlannerTask();

  // Local draft state for optimistic title updates.
  const [draftTask, setDraftTask] = useState<any | null>(null);
  useEffect(() => {
    if (!task) return;
    setDraftTask((prev: any) => {
      if (!prev || prev.id !== task.id) return task;
      return { ...prev, ...task };
    });
  }, [task]);
  const t = draftTask ?? task;
  const pseudoIssue = useMemo(() => taskToPseudoIssue(t), [t]);

  // Pre-built ADF for the canonical Description component.
  const descriptionAdf = useMemo(
    () => plainTextToAdf(t?.description ?? null),
    [t?.description],
  );

  // Related data.
  const { data: checklist } = useTaskChecklist(itemId);
  const { data: attachments } = useTaskAttachments(itemId);
  const { data: comments } = useTaskComments(itemId);
  const { data: activity } = useTaskActivity(itemId);

  // All statuses — for resolving name → status_id from CatalystStatusPill.
  const { data: allStatuses = [] } = useQuery({
    queryKey: ['task-statuses-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_statuses')
        .select('id, name, slug')
        .order('position');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Current user → CdsUser for ActivityPanel.
  const currentUser: CdsUser | undefined = useMemo(() => {
    if (!user) return undefined;
    return {
      id: user.id,
      name: user.user_metadata?.full_name ?? user.email ?? 'You',
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      email: user.email,
    };
  }, [user]);

  // Mentionable users — approved profiles.
  const { data: profiles = [] } = useQuery({
    queryKey: ['task-mentionable-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const mentionableUsers: CdsUser[] = useMemo(
    () => profiles.map((p: any) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? 'Unknown',
      avatarUrl: p.avatar_url,
      email: p.email,
    })),
    [profiles],
  );

  // Comment add mutation — task_comments table.
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!itemId || !user?.id) throw new Error('Not ready');
      const { error } = await supabase
        .from('task_comments')
        .insert({ task_id: itemId, content, author_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', itemId] });
      catalystToast.success('Comment added');
    },
    onError: (err) => {
      catalystToast.error('Failed to add comment', err instanceof Error ? err.message : String(err));
    },
  });

  const handleAddComment = useCallback(
    async (content: string) => {
      await addCommentMutation.mutateAsync(content);
    },
    [addCommentMutation],
  );

  // Mapped feeds for ActivityPanel.
  const mappedComments: CdsComment[] = useMemo(
    () => (comments ?? []).map(mapTaskCommentToCds),
    [comments],
  );
  const mappedActivity: CdsActivityItem[] = useMemo(
    () => (activity ?? []).map(mapTaskActivityToCds),
    [activity],
  );

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Flush any pending debounced writes when the panel closes.
  useEffect(() => {
    return () => {
      if (itemId) flushPending(itemId);
    };
  }, [itemId, flushPending]);

  /* ── Field update handlers ────────────────── */
  const handleFieldUpdate = useCallback((field: string, value: any) => {
    if (!itemId) return;
    setDraftTask((prev: any) => (prev ? { ...prev, [field]: value } : prev));
    updateNow(itemId, field, value);
  }, [itemId, updateNow]);

  const handleTitleChange = useCallback((newTitle: string) => {
    if (!itemId) return;
    const next = (newTitle || '').trim();
    if (!next || next === t?.title) return;
    handleFieldUpdate('title', next);
  }, [itemId, t?.title, handleFieldUpdate]);

  const handleStatusNameChange = useCallback((newStatusName: string) => {
    if (!itemId || !newStatusName) return;
    const match = (allStatuses || []).find(
      (s: any) =>
        s.name?.toLowerCase() === newStatusName.toLowerCase() ||
        s.slug?.toLowerCase() === newStatusName.toLowerCase(),
    );
    if (!match) return;
    setDraftTask((prev: any) =>
      prev ? { ...prev, status_id: match.id, status: { ...match } } : prev,
    );
    updateNow(itemId, 'status_id', match.id);
  }, [itemId, allStatuses, updateNow]);

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
    const url = `${window.location.origin}/tasks/view/${t?.key ?? itemId}`;
    navigator.clipboard.writeText(url).then(
      () => catalystToast.success('Link copied'),
      () => catalystToast.error('Copy failed'),
    );
  }, [itemId]);

  /* 2026-06-17: "Open in full page" now navigates to a real full-page
     detail surface (/tasks/view/<task-key>) instead of bouncing back to
     the list with ?openTask. Matches Story / Epic / Incident behaviour
     (their button navigates to /project-hub/<key>/backlog/<itemKey>). */
  const fullPageHrefBuilder = useCallback(
    (itemKey: string) => `/tasks/view/${itemKey}`,
    [],
  );

  /* ── Description saveOverride: write ADF → plain text → tasks.description. */
  const handleDescriptionSave = useCallback(
    async (adf: any) => {
      if (!itemId) return;
      const plain = tiptapAdfToPlainText(adf);
      const { error } = await supabase
        .from('tasks')
        .update({ description: plain, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
      setDraftTask((prev: any) => (prev ? { ...prev, description: plain } : prev));
      queryClient.invalidateQueries({ queryKey: ['task-detail', itemId] });
    },
    [itemId, queryClient],
  );

  /* ── Right rail dataSource adapter — writes go to `tasks` instead of ph_issues. */
  const sidebarDataSource = useMemo(() => ({
    onAssigneeChange: async (accountId: string | null, _displayName: string | null) => {
      if (!itemId) return;
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: accountId, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['task-detail', itemId] });
    },
    onAssignToMe: async () => {
      if (!itemId || !user?.id) return;
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['task-detail', itemId] });
    },
    onReporterChange: async () => {
      // tasks have no reporter column — silent no-op to satisfy interface.
    },
    onPriorityChange: async (priority: string | null) => {
      if (!itemId) return;
      /* EditablePriority emits the canonical label ("Medium"); tasks
         store lowercase ("medium"). Round-trip is capitalize-on-read
         in pseudoIssue + lowercase-on-write here. */
      const next = priority ? priority.toLowerCase() : null;
      const { error } = await supabase
        .from('tasks')
        .update({ priority: next, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['task-detail', itemId] });
    },
    onDueDateChange: async (date: string | null) => {
      if (!itemId) return;
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: date, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['task-detail', itemId] });
    },
    onLabelsChange: async () => {
      // tasks have no labels column (yet) — silent no-op.
    },
    onFixVersionsChange: async () => {
      // tasks have no fix versions concept — silent no-op.
    },
    onComponentsChange: async () => {
      // tasks have no components concept — silent no-op.
    },
  }), [itemId, user?.id, queryClient]);

  /* ── leftContent: title + status pill + quick actions + canonical Description
       + (optional) Checklist + Attachments + canonical ActivityPanel.
       Key details / Assignee / Priority / Due date all live in the right rail
       via CatalystSidebarDetails — no longer reimplemented inline. */
  const leftContent = useMemo(() => {
    if (isLoading || !t) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle, #505258)' }}>
          {isLoading ? 'Loading…' : 'Task not found'}
        </div>
      );
    }
    return (
      <>
        {/* Canonical inline-editable title. */}
        <CatalystTitleEditor
          issue={pseudoIssue}
          onTitleChange={handleTitleChange}
        />

        {/* Canonical + button row (Add child / Add link / ...). */}
        <CatalystQuickActions />

        {/* Canonical Key details — Priority only. Parent suppressed (no
            tasks↔tasks parent picker built today). Priority writes route
            through dataSource.onPriorityChange → tasks.priority. */}
        <CatalystKeyDetails
          issue={pseudoIssue}
          itemId={itemId}
          itemType="task"
          projectKey={pseudoIssue?.project_key ?? ''}
          showParent={false}
          showPriority
          dataSource={{
            /* Tasks Hub uses a 4-level priority scale. EditablePriority's
               default is the 5-level Jira scale. Override both options +
               the write callback. */
            priorityOptions: ['Critical', 'High', 'Medium', 'Low'],
            onPriorityChange: sidebarDataSource.onPriorityChange,
          }}
          afterBody={
            <Description
              issue={pseudoIssue}
              saveOverride={handleDescriptionSave}
              loadAdf={descriptionAdf}
            />
          }
        />

        {/* Checklist — hide when empty (zero-assumption). */}
        {checklist && checklist.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: '0 0 8px',
                padding: '0 16px',
                fontSize: 14,
                fontWeight: 500,
                lineHeight: '20px',
                color: 'var(--ds-text-subtle, #505258)',
              }}
            >
              Checklist
            </h2>
            <div style={{ padding: '0 16px' }}>
              <ChecklistSection taskId={itemId} items={checklist} />
            </div>
          </section>
        )}

        {/* Attachments — hide when empty. */}
        {attachments && attachments.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h2
              style={{
                margin: '0 0 8px',
                padding: '0 16px',
                fontSize: 14,
                fontWeight: 500,
                lineHeight: '20px',
                color: 'var(--ds-text-subtle, #505258)',
              }}
            >
              Files
            </h2>
            <div style={{ padding: '0 16px' }}>
              <AttachmentsSection taskId={itemId} attachments={attachments} />
            </div>
          </section>
        )}

        {/* Activity — canonical ActivityPanel (no worklog tab). */}
        <section style={{ marginTop: 8 }}>
          <ActivityPanel
            comments={mappedComments}
            historyItems={mappedActivity}
            currentUser={currentUser}
            mentionableUsers={mentionableUsers}
            onAddComment={handleAddComment}
            isSubmitting={addCommentMutation.isPending}
            hiddenTabs={['worklog']}
            defaultTab="all"
            defaultSortOrder="newest"
            workItemId={itemId ?? undefined}
            issueKey={t.key ?? undefined}
          />
        </section>
      </>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    t, pseudoIssue, isLoading, itemId, checklist, attachments,
    mappedComments, mappedActivity, currentUser, mentionableUsers,
    handleTitleChange, handleAddComment, addCommentMutation.isPending,
    handleDescriptionSave, descriptionAdf,
    sidebarDataSource,
  ]);

  /* ── rightContent: canonical CatalystSidebarDetails (fed by `tasks` adapter). */
  const rightContent = useMemo(() => {
    if (!t || !pseudoIssue) return null;
    return (
      <CatalystSidebarDetails
        issue={pseudoIssue}
        itemId={itemId ?? ''}
        onStatusChange={handleStatusNameChange}
        onClose={onClose}
        onDelete={async () => {
          if (!itemId) return;
          try {
            await deleteMutation.mutateAsync(itemId);
            onClose();
          } catch (e) {
            catalystToast.error('Delete failed', e instanceof Error ? e.message : String(e));
          }
        }}
        typeLabel="task"
        parentSource={undefined}
        projectKey={pseudoIssue?.project_key ?? ''}
        statusPill={
          <CatalystStatusPill
            status={pseudoIssue?.status}
            statusCategory={pseudoIssue?.status_category}
            onStatusChange={handleStatusNameChange}
            issueType="Task"
          />
        }
        dataSource={sidebarDataSource}
      />
    );
  }, [t, pseudoIssue, itemId, handleStatusNameChange, onClose, deleteMutation, sidebarDataSource]);

  /* ── Render ──────────────────────────────── */
  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Task"
        itemKey={t?.key || null}
        projectKey={t?.workstream?.key_prefix || projectKey || ''}
        projectName={t?.workstream?.name || 'Tasks'}
        parentKey={null}
        parentType="Task"
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
        fullPageHrefBuilder={fullPageHrefBuilder}
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
