// @ts-nocheck
/**
 * CatalystViewTmDefect — Test Hub canonical detail view for a tm_defects row.
 *
 * P1-S13 (CAT-TESTHUB-PROD-20260703-001): tm_defects is a separate table from
 * ph_issues, exactly like tm_test_cases — same REUSE-FIRST pattern as
 * CatalystViewTestCase (no fork of the ph_issues-based CatalystViewDefect,
 * which cannot render a tm_defects row). Routed when callers pass
 * entityKind='tm_defect'; itemId is the row's defect_key (e.g. "DEF-002").
 *
 * History tab reads tm_defect_links -> tm_test_runs (DEF-004/010) — real
 * run occurrences, not a hand-maintained log or a dead legacy table.
 */
import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
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
import { useDefectByKey, useDefectHistory, useDefectSourceCase } from '@/hooks/test-management/useDefects';
import { Routes } from '@/lib/routes';
import type { CatalystViewBaseProps } from '../shared/types';

/* ═══════════════════════════════════════════
   STATUS — tm_defect_status enum (real db values, not the lossy
   statusFromDb display labels used elsewhere in the codebase).
   ═══════════════════════════════════════════ */
const STATUS_DISPLAY: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};
const STATUS_CATEGORY: Record<string, string> = {
  open: 'todo',
  in_progress: 'in_progress',
  resolved: 'done',
  closed: 'removed',
  reopened: 'todo',
};
const DEFECT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color_category: 'todo' },
  { value: 'in_progress', label: 'In progress', color_category: 'in_progress' },
  { value: 'resolved', label: 'Resolved', color_category: 'done' },
  { value: 'closed', label: 'Closed', color_category: 'removed' },
  { value: 'reopened', label: 'Reopened', color_category: 'todo' },
];

function runStatusAppearance(s: string | null): 'default' | 'inprogress' | 'success' | 'removed' | 'moved' {
  switch (s) {
    case 'passed': return 'success';
    case 'failed': return 'removed';
    case 'blocked': return 'moved';
    case 'in_progress': return 'inprogress';
    default: return 'default';
  }
}

/* ═══════════════════════════════════════════
   ADAPTER — zero-assumption: never a typed fallback.
   ═══════════════════════════════════════════ */
function defectToPseudoIssue(d: any): any | null {
  if (!d) return null;
  const rawStatus: string | null = d.raw_status ?? null;
  return {
    id: d.id,
    issue_key: d.key,
    summary: d.title ?? '',
    description_adf: null,
    description_text: d.description ?? null,
    status: rawStatus ? (STATUS_DISPLAY[rawStatus] ?? rawStatus) : null,
    status_category: rawStatus ? (STATUS_CATEGORY[rawStatus] ?? null) : null,
    priority: d.raw_severity ? (d.raw_severity.charAt(0).toUpperCase() + d.raw_severity.slice(1)) : null,
    issue_type: 'Defect',
    parent_key: null,
    parent_summary: null,
    assignee_account_id: d.assigned_to ?? null,
    assignee_display_name: d.assignee?.full_name ?? null,
    reporter_account_id: d.reported_by || null,
    reporter_display_name: d.reporter?.full_name ?? null,
    project_key: null,
    project_name: null,
    sprint_release: null,
    labels: null,
    due_date: null,
    jira_created_at: d.created_at ?? null,
    jira_updated_at: d.updated_at ?? null,
    deleted_at: null,
  };
}

export default function CatalystViewTmDefect({
  isOpen, onClose, itemId, projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const queryClient = useQueryClient();
  const { data: defect, isLoading } = useDefectByKey(isOpen ? itemId : undefined);
  const { data: history = [] } = useDefectHistory(isOpen ? defect?.id : undefined);
  // D043: originating test case (tm_defects.source_test_case_id). Null when the
  // defect wasn't raised from a test — render nothing then (zero-assumption).
  const { data: sourceCase } = useDefectSourceCase((defect as any)?.source_test_case_id ?? null);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tm-defect-by-key', itemId] });
    queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'tm-defects' });
  }, [queryClient, itemId]);

  const pseudoIssue = useMemo(() => defectToPseudoIssue(defect), [defect]);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    const next = (newTitle || '').trim();
    if (!defect?.id || !next || next === defect?.title) return;
    const { error } = await supabase
      .from('tm_defects')
      .update({ title: next, updated_at: new Date().toISOString() })
      .eq('id', defect.id);
    if (error) { catalystToast.error('Failed to rename defect', error.message); return; }
    invalidate();
  }, [defect?.id, defect?.title, invalidate]);

  const handleStatusChange = useCallback(async (uiValue: string) => {
    const dbStatus = uiValue.toLowerCase().replace(/\s+/g, '_');
    if (!defect?.id) return;
    const { error } = await supabase
      .from('tm_defects')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', defect.id);
    if (error) { catalystToast.error('Failed to update status', error.message); return; }
    catalystToast.success('Status updated');
    invalidate();
  }, [defect?.id, invalidate]);

  const handleDescriptionSave = useCallback(async (adfOrText: any) => {
    if (!defect?.id) return;
    const plain = typeof adfOrText === 'string' ? adfOrText : (defect.description ?? '');
    const { error } = await supabase
      .from('tm_defects')
      .update({ description: plain, updated_at: new Date().toISOString() })
      .eq('id', defect.id);
    if (error) throw error;
    invalidate();
  }, [defect?.id, defect?.description, invalidate]);

  const sidebarDataSource = useMemo(() => ({
    onPriorityChange: async () => {}, // severity change not wired in this slice — read-only
    onAssigneeChange: async (accountId: string | null) => {
      if (!defect?.id) return;
      const { error } = await supabase
        .from('tm_defects')
        .update({ assignee_id: accountId, updated_at: new Date().toISOString() })
        .eq('id', defect.id);
      if (error) { catalystToast.error('Failed to update assignee', error.message); return; }
      invalidate();
    },
    onReporterChange: async () => {},
    onDueDateChange: async () => {},
    onLabelsChange: async () => {},
    onFixVersionsChange: async () => {},
    onComponentsChange: async () => {},
  }), [defect?.id, invalidate]);

  const detailsPanel = (
    <div>
      <CatalystKeyDetails
        issue={pseudoIssue}
        itemId={itemId}
        itemType="story"
        projectKey={projectKey ?? ''}
        showParent={false}
        showPriority
        dataSource={{ priorityOptions: [], onPriorityChange: sidebarDataSource.onPriorityChange }}
        extraRows={
          <>
            {defect?.raw_severity ? (
              <KeyDetailsFieldRow label="Severity">
                <span style={{ color: 'var(--ds-text)', textTransform: 'capitalize' }}>{defect.raw_severity}</span>
              </KeyDetailsFieldRow>
            ) : null}
            {/* D043: originating test case. Read-only — test cases have no
                standalone URL route (they open in-panel on Repository), so a
                clickable link would target a page that can't focus this case.
                Rendered only when the source case resolves. */}
            {sourceCase?.case_key ? (
              <KeyDetailsFieldRow label="Raised from test case">
                <span style={{ color: 'var(--ds-text)' }}>
                  <span style={{ fontWeight: 600 }}>{sourceCase.case_key}</span>
                  {sourceCase.title ? <span style={{ color: 'var(--ds-text-subtle)' }}>{` — ${sourceCase.title}`}</span> : null}
                </span>
              </KeyDetailsFieldRow>
            ) : (
              // CAT-0001/CAT-0002 remediation: lineage is optional at the DB
              // level (legit standalone backlog defects exist), so surface the
              // gap instead of hiding it — don't fabricate a fake source.
              <KeyDetailsFieldRow label="Raised from test case">
                <span style={{ color: 'var(--ds-text-subtlest)' }}>Not linked to a test case</span>
              </KeyDetailsFieldRow>
            )}
          </>
        }
        afterBody={
          <Description
            issue={pseudoIssue}
            saveOverride={handleDescriptionSave}
            loadAdf={null}
          />
        }
      />
    </div>
  );

  const historyPanel = (
    <div style={{ padding: '8px 16px' }}>
      {history.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: 0 }}>
          No linked test runs yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((h: any) => (
            <div key={h.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
              border: '1px solid var(--ds-border)', borderRadius: 6,
              background: 'var(--ds-surface-raised)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--ds-text)', minWidth: 60 }}>
                Run #{h.test_run?.run_number ?? '—'}
              </span>
              <Lozenge appearance={runStatusAppearance(h.test_run?.status ?? null)}>
                {h.test_run?.status ?? 'unknown'}
              </Lozenge>
              <span style={{ flex: 1, color: 'var(--ds-text-subtle)', fontSize: 'var(--ds-font-size-200)' }}>
                {h.test_run?.completed_at ? new Date(h.test_run.completed_at).toLocaleString() : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const leftContent = useMemo(() => {
    if (isLoading || !defect) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle)' }}>
          {isLoading ? 'Loading…' : 'Defect not found'}
        </div>
      );
    }
    return (
      <>
        <CatalystTitleEditor issue={pseudoIssue} onTitleChange={handleTitleChange} />
        <div style={{ padding: '0 8px' }}>
          <Tabs id="tm-defect-detail-tabs">
            <TabList>
              <Tab>Details</Tab>
              <Tab>History{history.length ? ` (${history.length})` : ''}</Tab>
            </TabList>
            <TabPanel>{detailsPanel}</TabPanel>
            <TabPanel>{historyPanel}</TabPanel>
          </Tabs>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defect, pseudoIssue, isLoading, detailsPanel, historyPanel, history.length, handleTitleChange]);

  const rightContent = useMemo(() => {
    if (!defect || !pseudoIssue) return null;
    return (
      <CatalystSidebarDetails
        issue={pseudoIssue}
        itemId={defect.id}
        onStatusChange={handleStatusChange}
        onClose={onClose}
        onDelete={() => {}}
        typeLabel="defect"
        projectKey={projectKey ?? ''}
        statusPill={
          <StatusLozengeDropdown
            status={pseudoIssue?.status}
            statusCategory={pseudoIssue?.status_category}
            onStatusChange={handleStatusChange}
            issueType="Defect"
            statusOptions={DEFECT_STATUS_OPTIONS}
          />
        }
        dataSource={sidebarDataSource}
      />
    );
  }, [defect, pseudoIssue, handleStatusChange, onClose, projectKey, sidebarDataSource]);

  const fullPageHrefBuilder = useCallback(() => Routes.testHub.defect(itemId ?? ''), [itemId]);

  return (
    <CatalystViewBase
      isOpen={isOpen}
      onClose={onClose}
      panelMode={panelMode}
      fullPageMode={fullPageMode}
      itemType="Defect"
      itemKey={defect?.key ?? null}
      projectKey={projectKey ?? ''}
      projectName="Test Hub"
      parentKey={null}
      parentType="Defect"
      moreMenuItems={[]}
      onTogglePanelMode={onTogglePanelMode}
      navigationItems={navigationItems}
      currentItemId={itemId}
      onNavigate={onNavigate}
      leftContent={leftContent}
      rightContent={rightContent}
      isLoading={isLoading}
      isNotFound={!isLoading && defect === null}
      hideSidebar={hideSidebar}
      fullPageHrefBuilder={fullPageHrefBuilder}
    />
  );
}
