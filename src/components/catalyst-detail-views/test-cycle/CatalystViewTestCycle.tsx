// @ts-nocheck
/**
 * CatalystViewTestCycle — Test Hub canonical detail view for a test cycle.
 *
 * Mounted from the timeline side panel (CatalystDetailPanel → TestCyclePanelBody
 * → CatalystDetailRouter entityKind='test_cycle') and reusable as a full view.
 * Cloned from CatalystViewTestCase: tm_test_cycles lives in a non-ph_issues
 * table keyed by UUID, so it adapts a cycle row into a `pseudoIssue` and mounts
 * the real CatalystViewBase. Inline edits (title / status / description) write
 * through the canonical useUpdateCycle mutation.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import {
  CatalystTitleEditor,
  StatusLozengeDropdown,
  CatalystKeyDetails,
  KeyDetailsFieldRow,
  Description,
  CatalystSidebarDetails,
} from '../shared/sections';
import { useTestCycle, useUpdateCycle } from '@/hooks/test-management/useTestCycles';
import type { CatalystViewBaseProps } from '../shared/types';
import { ConfirmCloneDialog, type ClonePatch } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { cloneWorkItemWithFlags } from '@/lib/cloneWorkItemWithFlags';
import { cloneTestCycle, fetchTestCycleSectionCounts, TEST_CYCLE_INCLUDE_CATALOG } from '@/lib/cloneTestCycle';
import { TmCommentsSection } from '@/components/testhub/TmCommentsSection';

/* Cycle lifecycle (TMCycle enum) → display + lozenge category. Zero-assumption:
   unknown status → null category, never a typed default. */
const STATUS_DISPLAY: Record<string, string> = {
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
const STATUS_CATEGORY: Record<string, string | null> = {
  PLANNED: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'done',
  CANCELLED: 'removed',
};
const CYCLE_STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned', color_category: 'todo' },
  { value: 'IN_PROGRESS', label: 'In progress', color_category: 'in_progress' },
  { value: 'COMPLETED', label: 'Completed', color_category: 'done' },
  { value: 'CANCELLED', label: 'Cancelled', color_category: 'removed' },
];

function cycleToPseudoIssue(c: any): any | null {
  if (!c) return null;
  const status: string | null = c.status ?? null;
  return {
    id: c.id,
    issue_key: c.key ?? null,
    summary: c.name ?? '',
    description_adf: null,
    description_text: c.description ?? null,
    status: status ? (STATUS_DISPLAY[status] ?? status) : null,
    status_category: status ? (STATUS_CATEGORY[status] ?? null) : null,
    priority: null,
    issue_type: 'Test Cycle',
    parent_key: null,
    parent_summary: null,
    assignee_account_id: null,
    assignee_display_name: null,
    reporter_account_id: null,
    reporter_display_name: null,
    project_key: null,
    project_name: null,
    sprint_release: null,
    labels: null,
    due_date: c.planned_end_date ?? null,
    jira_created_at: c.created_at ?? null,
    jira_updated_at: c.updated_at ?? null,
    deleted_at: null,
  };
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(); } catch { return '—'; }
}

export default function CatalystViewTestCycle({
  isOpen, onClose, itemId, projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {
  const { data: cycle, isLoading } = useTestCycle(isOpen ? itemId : undefined);
  const updateCycle = useUpdateCycle();
  const projectId = cycle?.project_id ?? undefined;
  const queryClient = useQueryClient();

  /* ── Action menu state — Clone + Delete dialogs. */
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: cloneCounts = {} } = useQuery({
    queryKey: ['clone-section-counts-test-cycle', itemId],
    enabled: showCloneDialog && !!itemId,
    staleTime: 60000,
    queryFn: () => fetchTestCycleSectionCounts(itemId as string),
  });

  const handleClone = useCallback((patch?: ClonePatch) => {
    if (!cycle?.id) return;
    const sourceKey = (cycle.cycle_key ?? (cycle as any).key ?? '') as string;
    void cloneWorkItemWithFlags({
      sourceKey,
      entityLabel: 'Test cycle',
      detailUrl: () => `/testhub/cycles/${cycle.id}`,
      cloneFn: (p) => cloneTestCycle(cycle.id as string, p),
      patch,
    });
  }, [cycle?.id, cycle?.cycle_key]);

  const handleDelete = useCallback(async () => {
    if (!cycle?.id) return;
    const { error } = await supabase.from('tm_test_cycles').delete().eq('id', cycle.id);
    if (error) {
      catalystToast.error('Delete failed', error.message);
      return;
    }
    catalystToast.success('Test cycle deleted');
    setShowDeleteDialog(false);
    queryClient.invalidateQueries({ queryKey: ['tm-cycle', itemId] });
    if (projectId) {
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'tm-cycles' && q.queryKey[1] === projectId });
    }
    onClose?.();
  }, [cycle?.id, itemId, projectId, queryClient, onClose]);

  const pseudoIssue = useMemo(() => cycleToPseudoIssue(cycle), [cycle]);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    const next = (newTitle || '').trim();
    if (!itemId || !projectId || !next || next === cycle?.name) return;
    await updateCycle.mutateAsync({ id: itemId, project_id: projectId, name: next });
  }, [itemId, projectId, cycle?.name, updateCycle]);

  const handleStatusChange = useCallback(async (uiValue: string) => {
    if (!itemId || !projectId) return;
    await updateCycle.mutateAsync({ id: itemId, project_id: projectId, status: uiValue as any });
  }, [itemId, projectId, updateCycle]);

  const handleDescriptionSave = useCallback(async (adf: any) => {
    if (!itemId || !projectId) return;
    const plain = adfToPlainText(adf);
    await updateCycle.mutateAsync({ id: itemId, project_id: projectId, description: plain });
  }, [itemId, projectId, updateCycle]);

  /* Sidebar dataSource — cycles have no priority/labels/etc: silent no-ops. */
  const sidebarDataSource = useMemo(() => ({
    onPriorityChange: async () => {},
    onAssigneeChange: async () => {},
    onReporterChange: async () => {},
    onDueDateChange: async () => {},
    onLabelsChange: async () => {},
    onFixVersionsChange: async () => {},
    onComponentsChange: async () => {},
  }), []);

  const detailsPanel = (
    <div>
      <CatalystKeyDetails
        issue={pseudoIssue}
        itemId={itemId}
        itemType="story"
        projectKey={projectKey ?? ''}
        showParent={false}
        showPriority={false}
        extraRows={
          <>
            <KeyDetailsFieldRow label="Start date">
              <span style={{ color: cycle?.planned_start_date ? 'var(--ds-text)' : 'var(--ds-text-subtlest)' }}>
                {fmtDate(cycle?.planned_start_date)}
              </span>
            </KeyDetailsFieldRow>
            <KeyDetailsFieldRow label="End date">
              <span style={{ color: cycle?.planned_end_date ? 'var(--ds-text)' : 'var(--ds-text-subtlest)' }}>
                {fmtDate(cycle?.planned_end_date)}
              </span>
            </KeyDetailsFieldRow>
            <KeyDetailsFieldRow label="Test cases">
              <span style={{ color: 'var(--ds-text)' }}>{cycle?.total_cases ?? 0}</span>
            </KeyDetailsFieldRow>
            <KeyDetailsFieldRow label="Pass rate">
              <span style={{ color: 'var(--ds-text)' }}>
                {typeof cycle?.pass_rate === 'number' ? `${cycle.pass_rate}%` : '—'}
              </span>
            </KeyDetailsFieldRow>
          </>
        }
        afterBody={
          <Description issue={pseudoIssue} saveOverride={handleDescriptionSave} />
        }
      />
      {/* G14 COL-002: cycle detail had zero collaboration surface. */}
      <div style={{ marginTop: 16, borderTop: '1px solid var(--ds-border)', paddingTop: 16 }}>
        <p style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 600, color: 'var(--ds-text)', margin: '0 0 8px' }}>
          Comments
        </p>
        <TmCommentsSection entityType="cycle" entityId={itemId} />
      </div>
    </div>
  );

  const leftContent = useMemo(() => {
    if (isLoading || !cycle) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle)' }}>
          {isLoading ? 'Loading…' : 'Test cycle not found'}
        </div>
      );
    }
    return (
      <>
        <CatalystTitleEditor issue={pseudoIssue} onTitleChange={handleTitleChange} />
        <div style={{ padding: '0 8px' }}>{detailsPanel}</div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle, pseudoIssue, isLoading, detailsPanel, handleTitleChange]);

  const rightContent = useMemo(() => {
    if (!cycle || !pseudoIssue) return null;
    return (
      <CatalystSidebarDetails
        issue={pseudoIssue}
        itemId={itemId ?? ''}
        onStatusChange={handleStatusChange}
        onClose={onClose}
        onDelete={() => {}}
        typeLabel="test cycle"
        projectKey={projectKey ?? ''}
        statusPill={
          <StatusLozengeDropdown
            status={pseudoIssue?.status}
            statusCategory={pseudoIssue?.status_category}
            onStatusChange={handleStatusChange}
            issueType="Test Cycle"
            statusOptions={CYCLE_STATUS_OPTIONS}
          />
        }
        dataSource={sidebarDataSource}
      />
    );
  }, [cycle, pseudoIssue, itemId, handleStatusChange, onClose, projectKey, sidebarDataSource]);

  const fullPageHrefBuilder = useCallback(() => `/testhub/cycles/${itemId}`, [itemId]);

  const sourceKey = (cycle?.cycle_key ?? (cycle as any)?.key ?? null) as string | null;
  const sourceName = cycle?.name ?? null;

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Test Cycle"
        itemKey={cycle?.key ?? null}
        projectKey={projectKey ?? ''}
        projectName="Test Hub"
        parentKey={null}
        parentType="Test Cycle"
        moreMenuItems={useMemo(() => [
          { label: 'Clone', onClick: () => { if (cycle?.id) setShowCloneDialog(true); } },
          { label: 'Move', onClick: () => catalystToast.info('Coming soon') },
          { label: 'Delete', onClick: () => { if (cycle?.id) setShowDeleteDialog(true); }, danger: true },
        ], [cycle?.id])}
        /* tm_test_cycles has no is_flagged / archived columns — omit flagContext.
           When Vikram wants flag support, add columns via migration first. */
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
        isNotFound={!isLoading && cycle === null}
        hideSidebar={hideSidebar}
        fullPageHrefBuilder={fullPageHrefBuilder}
      />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={sourceKey}
        issueSummary={sourceName}
        issueId={cycle?.id ?? null}
        projectId={projectId ?? null}
        currentAssigneeId={(cycle as any)?.assigned_to ?? null}
        currentAssigneeName={null}
        hideReporter
        useAllProfiles
        includeCatalog={TEST_CYCLE_INCLUDE_CATALOG}
        counts={cloneCounts}
        onConfirm={handleClone}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={sourceKey}
        issueSummary={sourceName}
        typeLabel="test cycle"
        onConfirm={handleDelete}
      />
    </>
  );
}

/* Plain-text ⇆ ADF for the canonical Description editor. */
function adfToPlainText(adf: any): string {
  if (!adf || !Array.isArray(adf.content)) return '';
  const lines: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      if (lines.length === 0) lines.push('');
      lines[lines.length - 1] += node.text;
      return;
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      lines.push('');
      if (Array.isArray(node.content)) node.content.forEach(walk);
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  adf.content.forEach(walk);
  return lines.join('\n').trim();
}
