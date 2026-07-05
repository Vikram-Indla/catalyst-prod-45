// @ts-nocheck
/**
 * CatalystViewTestCase — Test Hub canonical detail view for a test case.
 *
 * D4 (CAT-TESTHUB-ENGINE-20260626-001): replaces the hand-rolled CaseDrawer
 * for the VIEW/EDIT path. Cloned from TaskCatalystView (template per 03b spec):
 * tm_test_cases lives in a non-ph_issues table exactly like `tasks`, so it
 * adapts a case row into a `pseudoIssue` + `dataSource` and mounts the real
 * CatalystViewBase. The CREATE path still uses CaseDrawer (coexist strategy).
 *
 * Data flow:
 *   - Reads tm_test_cases (+ folder) via useTestCase(itemId).
 *   - Inline edits (status / priority / title / description) write DIRECTLY to
 *     tm_test_cases through the dataSource adapter callbacks — NOT through
 *     useUpdateTestCase, which bumps version + snapshots on every save (wrong
 *     for a single-field toggle).
 *   - Steps + Versions render read-only inside @atlaskit/tabs in leftContent.
 *
 * 6 mismatch flags (03b spec) handled inline — see comments tagged [MM#].
 */
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Lozenge from '@atlaskit/lozenge';
import Textfield from '@atlaskit/textfield';
import Select, { AsyncSelect } from '@atlaskit/select';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
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
import { useTestCase } from '@/hooks/test-management/useTestCases';
import { useTestCaseVersions, useRestoreTestCaseVersion } from '@/hooks/test-management/useTestCaseVersions';
import { VersionDiffView } from '@/components/testhub/versioning/VersionDiffView';
import { TestCaseStepsEditor } from './TestCaseStepsEditor';
import { TmActivitySection } from './TmActivitySection';
import { TestCaseAttachments } from './TestCaseAttachments';
import type { CatalystViewBaseProps } from '../shared/types';
import { ConfirmCloneDialog, type ClonePatch } from '../shared/ConfirmCloneDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { cloneWorkItemWithFlags } from '@/lib/cloneWorkItemWithFlags';
import { cloneTestCase, fetchTestCaseSectionCounts, TEST_CASE_INCLUDE_CATALOG } from '@/lib/cloneTestCase';

/* ═══════════════════════════════════════════
   STATUS — tm lifecycle enum (NOT a Jira workflow). [MM1]
   useTestCase maps the DB enum to UI labels: DRAFT/REVIEW/APPROVED/DEPRECATED.
   ═══════════════════════════════════════════ */
const UI_TO_DB_STATUS: Record<string, string> = {
  DRAFT: 'draft',
  REVIEW: 'ready',
  APPROVED: 'approved',
  DEPRECATED: 'deprecated',
};
const STATUS_DISPLAY: Record<string, string> = {
  DRAFT: 'Draft',
  REVIEW: 'Review',
  APPROVED: 'Approved',
  DEPRECATED: 'Deprecated',
};
/** Lifecycle → lozenge category. deprecated → 'removed'. */
const STATUS_CATEGORY: Record<string, string | null> = {
  DRAFT: 'todo',
  REVIEW: 'in_progress',
  APPROVED: 'done',
  DEPRECATED: 'removed',
};
/** Injected status options for the canonical pill (bypasses Jira workflow). */
const TEST_CASE_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', color_category: 'todo' },
  { value: 'REVIEW', label: 'Review', color_category: 'in_progress' },
  { value: 'APPROVED', label: 'Approved', color_category: 'done' },
  { value: 'DEPRECATED', label: 'Deprecated', color_category: 'removed' },
];

/* ═══════════════════════════════════════════
   ADAPTER — zero-assumption: never a typed fallback.
   ═══════════════════════════════════════════ */
function testCaseToPseudoIssue(tc: any, priorityName: string | null): any | null {
  if (!tc) return null;
  const uiStatus: string | null = tc.status ?? null; // DRAFT/REVIEW/APPROVED/DEPRECATED
  // [MM1] deprecated → null category (zero-assumption, never default 'todo').
  const statusCategory = uiStatus ? (STATUS_CATEGORY[uiStatus] ?? null) : null;
  return {
    id: tc.id,
    issue_key: tc.key ?? tc.case_key ?? null,
    summary: tc.title ?? '',
    description_adf: null,
    description_text: tc.objective ?? tc.description ?? null,
    status: uiStatus ? (STATUS_DISPLAY[uiStatus] ?? uiStatus) : null,
    status_category: statusCategory,
    // [MM2] priority is a FK (priority_id → tm_case_priorities), not a label.
    // Display the resolved name; writes go through dataSource.onPriorityChange.
    priority: priorityName,
    issue_type: 'Test Case',
    parent_key: null,
    parent_summary: null,
    assignee_account_id: tc.assigned_user?.id ?? tc.assigned_to ?? null,
    assignee_display_name: tc.assigned_user?.full_name ?? null,
    // [MM5] tm_test_cases has no reporter/labels/sprint/components.
    reporter_account_id: null,
    reporter_display_name: null,
    project_key: null,
    project_name: null,
    sprint_release: null,
    labels: null,
    due_date: null,
    jira_created_at: tc.created_at ?? null,
    jira_updated_at: tc.updated_at ?? null,
    // archived → soft-deleted marker (D8).
    deleted_at: tc.archived ? (tc.updated_at ?? new Date().toISOString()) : null,
  };
}

/* ── ADF round-trip helpers (mirror TaskCatalystView). ── */
function plainTextToAdf(text: string | null | undefined): any {
  const s = (text ?? '').toString();
  if (!s.trim()) return { type: 'doc', version: 1, content: [] };
  const paragraphs = s.split(/\r?\n/).map((line) => ({
    type: 'paragraph',
    content: line.length > 0 ? [{ type: 'text', text: line }] : [],
  }));
  return { type: 'doc', version: 1, content: paragraphs };
}
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

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */
export default function CatalystViewTestCase({
  isOpen, onClose, itemId, projectKey,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const queryClient = useQueryClient();
  const { data: testCase, isLoading } = useTestCase(isOpen ? itemId : undefined);
  const projectId = testCase?.project_id ?? undefined;

  /* ── Action menu state — Clone, Archive, Delete dialogs. */
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* Test-case section counts feed the Include catalog inside ConfirmCloneDialog. */
  const { data: cloneCounts = {} } = useQuery({
    queryKey: ['clone-section-counts-test-case', itemId],
    enabled: showCloneDialog && !!itemId,
    staleTime: 60000,
    queryFn: () => fetchTestCaseSectionCounts(itemId as string),
  });

  const handleClone = useCallback((patch?: ClonePatch) => {
    if (!testCase?.id) return;
    const sourceKey = (testCase.case_key ?? (testCase as any).key ?? '') as string;
    void cloneWorkItemWithFlags({
      sourceKey,
      entityLabel: 'Test case',
      detailUrl: () => `/testhub/repository`,
      cloneFn: (p) => cloneTestCase(testCase.id as string, p),
      patch,
    });
  }, [testCase?.id, testCase?.case_key]);

  const handleArchive = useCallback(async () => {
    if (!testCase?.id) return;
    await supabase.from('tm_test_cases').update({ archived: true } as any).eq('id', testCase.id);
    catalystToast.success('Test case archived');
    setShowArchiveDialog(false);
    queryClient.invalidateQueries({ queryKey: ['tm-case', itemId] });
    if (projectId) {
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'tm-cases' && q.queryKey[1] === projectId });
    }
    onClose?.();
  }, [testCase?.id, itemId, projectId, queryClient, onClose]);

  const handleDelete = useCallback(async () => {
    if (!testCase?.id) return;
    const { error } = await supabase.from('tm_test_cases').delete().eq('id', testCase.id);
    if (error) {
      catalystToast.error('Delete failed', error.message);
      return;
    }
    catalystToast.success('Test case deleted');
    setShowDeleteDialog(false);
    queryClient.invalidateQueries({ queryKey: ['tm-case', itemId] });
    if (projectId) {
      queryClient.invalidateQueries({ predicate: q => q.queryKey[0] === 'tm-cases' && q.queryKey[1] === projectId });
    }
    onClose?.();
  }, [testCase?.id, itemId, projectId, queryClient, onClose]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tm-case', itemId] });
    queryClient.invalidateQueries({ queryKey: ['tm-case-steps', itemId] });
    if (projectId) {
      queryClient.invalidateQueries({
        predicate: q => q.queryKey[0] === 'tm-cases' && q.queryKey[1] === projectId,
      });
    }
  }, [queryClient, itemId, projectId]);

  /* [MM2] priorities for this project — id ↔ name map. */
  const { data: priorities = [] } = useQuery({
    queryKey: ['tm-priorities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase
        .from('tm_case_priorities')
        .select('id, name, sort_order')
        .eq('project_id', projectId)
        .order('sort_order');
      return data ?? [];
    },
    enabled: !!projectId,
  });

  /* [MM3] case types for this project — resolve type_id → name. */
  const { data: caseTypes = [] } = useQuery({
    queryKey: ['tm-types', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      // tm_case_types has no sort_order column (id/project_id/name/icon/color/
      // is_default/created_at) — order by name.
      const { data } = await supabase
        .from('tm_case_types')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name');
      return data ?? [];
    },
    enabled: !!projectId,
  });

  const priorityName = useMemo(() => {
    const pid = testCase?.priority_id;
    if (!pid) return null;
    return (priorities as any[]).find(p => p.id === pid)?.name ?? null;
  }, [testCase?.priority_id, priorities]);

  const typeName = useMemo(() => {
    const tid = testCase?.type_id;
    if (!tid) return null;
    return (caseTypes as any[]).find(t => t.id === tid)?.name ?? null;
  }, [testCase?.type_id, caseTypes]);

  const pseudoIssue = useMemo(
    () => testCaseToPseudoIssue(testCase, priorityName),
    [testCase, priorityName],
  );

  const descriptionAdf = useMemo(
    () => plainTextToAdf(testCase?.objective ?? null),
    [testCase?.objective],
  );

  /* Versions (list + restore + compare). */
  const { data: versions = [] } = useTestCaseVersions(isOpen ? itemId : undefined);
  const restoreVersion = useRestoreTestCaseVersion();
  const [diffOpen, setDiffOpen] = useState(false);

  /* ── Write paths — direct tm_test_cases updates, no version churn. ── */
  const handleTitleChange = useCallback(async (newTitle: string) => {
    const next = (newTitle || '').trim();
    if (!itemId || !next || next === testCase?.title) return;
    const { error } = await supabase
      .from('tm_test_cases')
      .update({ title: next, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) { catalystToast.error('Failed to rename case', error.message); return; }
    invalidate();
  }, [itemId, testCase?.title, invalidate]);

  /* [MM1] onStatusChange writes the lifecycle ENUM, not a Jira status id. */
  const handleStatusChange = useCallback(async (uiValue: string) => {
    const dbStatus = UI_TO_DB_STATUS[uiValue];
    if (!itemId || !dbStatus) return;
    const { error } = await supabase
      .from('tm_test_cases')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) { catalystToast.error('Failed to update status', error.message); return; }
    catalystToast.success('Status updated');
    invalidate();
  }, [itemId, invalidate]);

  const handleDescriptionSave = useCallback(async (adf: any) => {
    if (!itemId) return;
    const plain = adfToPlainText(adf);
    const { error } = await supabase
      .from('tm_test_cases')
      .update({ description: plain, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) throw error;
    invalidate();
  }, [itemId, invalidate]);

  /* ── Sidebar dataSource — [MM2] priority writes the id; [MM5] no-ops. ── */
  const sidebarDataSource = useMemo(() => ({
    onPriorityChange: async (name: string | null) => {
      if (!itemId) return;
      const pid = name
        ? (priorities as any[]).find(p => p.name === name)?.id ?? null
        : null;
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ priority_id: pid, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) { catalystToast.error('Failed to update priority', error.message); return; }
      invalidate();
    },
    onAssigneeChange: async (accountId: string | null) => {
      if (!itemId) return;
      const { error } = await supabase
        .from('tm_test_cases')
        .update({ assigned_to: accountId, updated_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) { catalystToast.error('Failed to update assignee', error.message); return; }
      invalidate();
    },
    // S4 (CAT-TESTHUB-REPOSITORY-REDESIGN-20260705-001): tm_test_cases has no
    // reporter / due_date / sprint columns. We deliberately DO NOT supply
    // onReporterChange or onDueDateChange — the sidebar now hides Reporter and
    // Sprint for the 'Test Case' type, and omitting onDueDateChange means the
    // Due date row's `|| dataSource?.onDueDateChange` gate stays false, so it no
    // longer renders. A test case is a reusable spec, not an execution; those
    // properties belong to the run, not the case (zero-assumption, no no-op lies).
    onLabelsChange: async () => {},
    onFixVersionsChange: async () => {},
    onComponentsChange: async () => {},
  }), [itemId, priorities, invalidate]);

  const priorityOptions = useMemo(
    () => (priorities as any[]).map(p => p.name),
    [priorities],
  );

  /* ── Steps: persistence-backed editor (P0 — was read-only). ── */
  const steps = testCase?.steps ?? [];

  const stepsPanel = itemId ? (
    <TestCaseStepsEditor testCaseId={itemId} steps={steps as any} />
  ) : null;

  /* ── S4: Runs — this case's execution across every cycle. The reusable spec
        is executed many times; its history is the point (mental-model plane 3).
        Reads tm_cycle_scope (per-case scope row per cycle) joined to the cycle. ── */
  const { data: runs = [] } = useQuery({
    queryKey: ['tm-case-runs', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .select('id, current_status, updated_at, tm_test_cycles(name, status)')
        .eq('test_case_id', itemId)
        .order('updated_at', { ascending: false });
      if (error || !data) return [];
      return data as unknown as Array<{
        id: string;
        current_status: string | null;
        updated_at: string | null;
        tm_test_cycles: { name: string | null; status: string | null } | null;
      }>;
    },
  });

  const runStatusLozenge = (s: string | null) => {
    const map: Record<string, { appearance: 'success' | 'removed' | 'moved' | 'inprogress' | 'default'; label: string }> = {
      passed: { appearance: 'success', label: 'Passed' },
      failed: { appearance: 'removed', label: 'Failed' },
      blocked: { appearance: 'moved', label: 'Blocked' },
      in_progress: { appearance: 'inprogress', label: 'In progress' },
      not_run: { appearance: 'default', label: 'Not run' },
    };
    const cfg = (s && map[s]) || { appearance: 'default' as const, label: 'Not run' };
    return <Lozenge appearance={cfg.appearance}>{cfg.label}</Lozenge>;
  };

  const runsPanel = (
    <div style={{ padding: 'var(--ds-space-100) var(--ds-space-200)' }}>
      {runs.length === 0 ? (
        <div style={{ padding: 'var(--ds-space-300)', textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)' }}>
          This case has not been added to any test cycle yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-050)' }}>
          {runs.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--ds-space-100) var(--ds-space-150)',
              border: '1px solid var(--ds-border)', borderRadius: 'var(--ds-border-radius)',
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-300)', lineHeight: 'var(--ds-line-height-body)', color: 'var(--ds-text)', fontWeight: 500 }}>
                {r.tm_test_cycles?.name ?? 'Cycle'}
              </span>
              {runStatusLozenge(r.current_status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ── Versions read-only render. [MM6] useTestCaseVersions authoritative. ── */
  const versionsPanel = (
    <div style={{ padding: '8px 16px' }}>
      {versions.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: 0 }}>No version history. Use "New version" in the repository to create a snapshot.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {versions.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button
                onClick={() => setDiffOpen(true)}
                style={{
                  padding: '4px 10px', fontSize: 'var(--ds-font-size-200)',
                  border: '1px solid var(--ds-border)', borderRadius: 4,
                  background: 'none', cursor: 'pointer', color: 'var(--ds-text)',
                }}
              >
                Compare versions
              </button>
            </div>
          )}
          {versions.map((v: any, idx: number) => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              border: '1px solid var(--ds-border)', borderRadius: 6,
              background: idx === 0 ? 'var(--ds-background-selected)' : 'var(--ds-surface-raised)',
            }}>
              <span style={{
                fontSize: 'var(--ds-font-size-200)', fontWeight: 700, color: 'var(--ds-text)',
                fontFamily: 'var(--ds-font-family-code, monospace)',
                minWidth: 28,
              }}>
                v{v.version_number}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtle)', flex: 1 }}>
                {v.change_summary || '—'}
              </span>
              {v.changed_by_profile?.full_name && (
                <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
                  {v.changed_by_profile.full_name}
                </span>
              )}
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)', whiteSpace: 'nowrap' }}>
                {v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}
              </span>
              {idx > 0 && (
                <button
                  onClick={() => restoreVersion.mutate({ testCaseId: itemId!, versionNumber: v.version_number })}
                  disabled={restoreVersion.isPending}
                  style={{
                    padding: '4px 10px', fontSize: 'var(--ds-font-size-200)',
                    border: '1px solid var(--ds-border)', borderRadius: 4,
                    background: 'none', cursor: 'pointer',
                    color: 'var(--ds-text)', whiteSpace: 'nowrap',
                  }}
                >
                  Restore
                </button>
              )}
              {idx === 0 && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-brand)', fontWeight: 600 }}>Current</span>
              )}
            </div>
          ))}
        </div>
      )}
      {diffOpen && (
        <VersionDiffView
          open={diffOpen}
          onOpenChange={setDiffOpen}
          versions={versions}
          initialLeft={versions[versions.length - 1]?.version_number}
          initialRight={versions[0]?.version_number}
        />
      )}
    </div>
  );

  /* ── Requirements tab — tm_requirement_links. ── */
  const { data: reqLinks = [], refetch: refetchLinks } = useQuery({
    queryKey: ['tm-req-links', itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('tm_requirement_links')
        .select('id, requirement_type, requirement_id, external_key, external_title, external_url, link_type, notes, created_at')
        .eq('test_case_id', itemId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!itemId,
  });

  /* ── Attachments tab — tm_attachments (entity_type='test_case'). Count feeds
       the tab label; the panel owns list/upload/delete. ── */
  const { data: attachmentCount = 0 } = useQuery({
    queryKey: ['tm-attachments-count', itemId],
    enabled: !!itemId,
    staleTime: 30_000,
    queryFn: async (): Promise<number> => {
      if (!itemId) return 0;
      const { count, error } = await supabase
        .from('tm_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('entity_type', 'test_case')
        .eq('entity_id', itemId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const attachmentsPanel = <TestCaseAttachments testCaseId={itemId} />;

  const [linkForm, setLinkForm] = useState({
    open: false,
    mode: 'issue' as 'issue' | 'external',
    picked: null as { id: string; issue_key: string; summary: string; issue_type: string } | null,
    extKey: '',
    extTitle: '',
    linkType: 'verifies',
    saving: false,
  });

  // P1-S10 + L005 (Phase C): real ph_issues picker (id-backed) for the types
  // the requirement_type CHECK accepts. The DB CHECK on
  // tm_requirement_links.requirement_type accepts
  //   story | epic | feature | business_request | task | incident | external
  // (task added by migration 20260705021435; defect/incident already present).
  // Every picker type now maps to its own native requirement_type and is stored
  // id-backed. Anything unmapped still falls through to the 'external' write
  // path (never fabricate 'story' for an unknown type).
  const ISSUE_TYPE_TO_REQUIREMENT_TYPE: Record<string, string> = {
    Story: 'story',
    Epic: 'epic',
    Feature: 'feature',
    'Business Request': 'business_request',
    Task: 'task',
    'Production Incident': 'incident',
  };

  // Types the picker offers — all stored id-backed via their native
  // requirement_type per the map above (see handleAddLink).
  const PICKER_ISSUE_TYPES = ['Story', 'Epic', 'Feature', 'Task', 'Business Request', 'Production Incident'];

  const loadIssueOptions = useCallback(async (input: string) => {
    // Repo-wide search, no project_key scope — matches LinkToolbar.tsx's
    // canonical picker idiom. RepositoryPage has no :projectKey route param
    // (its `projectKey` prop is a hardcoded 'TESTHUB' placeholder that
    // matches no real ph_issues row), so scoping by it would silently
    // return zero results for every real project.
    const q = input.trim();
    let query = supabase
      .from('ph_issues')
      .select('id, issue_key, summary, issue_type')
      .in('issue_type', PICKER_ISSUE_TYPES)
      .is('jira_removed_at', null)
      .limit(10);
    query = q ? query.or(`issue_key.ilike.${q}%,summary.ilike.%${q}%`) : query.order('jira_updated_at', { ascending: false });
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r: any) => ({
      value: r.id as string,
      label: `${r.issue_key} ${r.summary}`,
      issue_key: r.issue_key as string,
      summary: r.summary as string,
      issue_type: r.issue_type as string,
    }));
  }, []);

  const handleAddLink = useCallback(async () => {
    const usingIssue = linkForm.mode === 'issue' && !!linkForm.picked;
    if (!usingIssue && !linkForm.extKey.trim() && !linkForm.extTitle.trim()) return;
    setLinkForm(f => ({ ...f, saving: true }));
    try {
      // L005: every picker type now maps to a native requirement_type and is
      // stored id-backed (Task→task, Production Incident→incident added
      // 20260705021435). Only a truly unmapped type falls through to 'external'
      // (never fabricate 'story', which the old `?? 'story'` did).
      const mappedType = usingIssue
        ? ISSUE_TYPE_TO_REQUIREMENT_TYPE[linkForm.picked!.issue_type]
        : undefined;
      const idBacked = usingIssue && !!mappedType;
      const { error } = await supabase.rpc('tm_link_requirement', idBacked ? {
        p_case_id: itemId,
        p_requirement_type: mappedType!,
        p_requirement_id: linkForm.picked!.id,
        p_external_key: linkForm.picked!.issue_key,
        p_external_title: linkForm.picked!.summary,
        p_link_type: linkForm.linkType,
      } : usingIssue ? {
        // Picked issue of an unmapped type (Task / Production Incident):
        // preserve its key + title on the external path.
        p_case_id: itemId,
        p_requirement_type: 'external',
        p_external_key: linkForm.picked!.issue_key,
        p_external_title: linkForm.picked!.summary,
        p_link_type: linkForm.linkType,
      } : {
        p_case_id: itemId,
        p_requirement_type: 'external',
        p_external_key: linkForm.extKey.trim() || null,
        p_external_title: linkForm.extTitle.trim() || null,
        p_link_type: linkForm.linkType,
      });
      if (error) throw error;
      setLinkForm(f => ({ ...f, open: false, picked: null, extKey: '', extTitle: '', saving: false }));
      refetchLinks();
      catalystToast.success('Requirement linked');
    } catch (err: any) {
      catalystToast.error('Failed to link', err?.message);
      setLinkForm(f => ({ ...f, saving: false }));
    }
  }, [itemId, linkForm, refetchLinks]);

  const handleDeleteLink = useCallback(async (linkId: string) => {
    const { error } = await supabase.from('tm_requirement_links').delete().eq('id', linkId);
    if (error) { catalystToast.error('Failed to remove link'); return; }
    refetchLinks();
    catalystToast.success('Link removed');
  }, [refetchLinks]);

  const requirementsPanel = (
    <div style={{ padding: '12px 16px' }}>
      {/* Existing links */}
      {reqLinks.length === 0 && !linkForm.open && (
        <p style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-300)', margin: '0 0 12px' }}>
          No requirements linked. Add one to track coverage.
        </p>
      )}
      {reqLinks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
          {reqLinks.map((l: any) => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 6,
              border: '1px solid var(--ds-border)',
              background: 'var(--ds-surface-sunken)',
            }}>
              {l.external_key && (
                <span style={{ fontFamily: 'var(--ds-font-family-code)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', flexShrink: 0 }}>
                  {l.external_key}
                </span>
              )}
              <span style={{ flex: 1, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.external_title ?? l.requirement_type ?? '—'}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest)', flexShrink: 0, textTransform: 'capitalize' }}>
                {l.link_type ?? 'verifies'}
              </span>
              <button
                onClick={() => handleDeleteLink(l.id)}
                title="Remove link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)', padding: 0, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Add link form */}
      {linkForm.open ? (
        <div style={{ border: '1px solid var(--ds-border)', borderRadius: 6, padding: 12, background: 'var(--ds-surface-sunken)', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)', cursor: 'pointer' }}>
              <input type="radio" checked={linkForm.mode === 'issue'} onChange={() => setLinkForm(f => ({ ...f, mode: 'issue' }))} />
              Search issue
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text)', cursor: 'pointer' }}>
              <input type="radio" checked={linkForm.mode === 'external'} onChange={() => setLinkForm(f => ({ ...f, mode: 'external' }))} />
              External reference
            </label>
          </div>
          {linkForm.mode === 'issue' ? (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>STORY / EPIC / FEATURE / TASK / BUSINESS REQUEST / PRODUCTION INCIDENT</div>
              <AsyncSelect
                inputId="tc-req-issue-picker"
                aria-label="Search issues"
                cacheOptions
                defaultOptions
                loadOptions={loadIssueOptions}
                value={linkForm.picked ? { value: linkForm.picked.id, label: `${linkForm.picked.issue_key} ${linkForm.picked.summary}`, issue_key: linkForm.picked.issue_key, summary: linkForm.picked.summary, issue_type: linkForm.picked.issue_type } : null}
                onChange={(opt: any) => setLinkForm(f => ({ ...f, picked: opt ? { id: opt.value, issue_key: opt.issue_key, summary: opt.summary, issue_type: opt.issue_type } : null }))}
                placeholder="Search by key or title…"
                formatOptionLabel={(opt: any) => (
                  opt?.issue_type ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <JiraIssueTypeIcon issueType={opt.issue_type} size={16} />
                      <span style={{ fontWeight: 600, color: 'var(--ds-text)' }}>{opt.issue_key}</span>
                      <span style={{ color: 'var(--ds-text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.summary}</span>
                    </span>
                  ) : (opt?.label ?? '')
                )}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>KEY</div>
                <Textfield
                  value={linkForm.extKey}
                  onChange={e => setLinkForm(f => ({ ...f, extKey: e.target.value }))}
                  placeholder="e.g. DEF-001"
                />
              </div>
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>TITLE</div>
                <Textfield
                  value={linkForm.extTitle}
                  onChange={e => setLinkForm(f => ({ ...f, extTitle: e.target.value }))}
                  placeholder="Requirement description"
                />
              </div>
            </div>
          )}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', marginBottom: 4 }}>LINK TYPE</div>
            <Select
              value={{ label: linkForm.linkType, value: linkForm.linkType }}
              options={[
                { label: 'verifies', value: 'verifies' },
                { label: 'tests', value: 'tests' },
                { label: 'derives_from', value: 'derives_from' },
                { label: 'related_to', value: 'related_to' },
              ]}
              onChange={(opt) => opt && setLinkForm(f => ({ ...f, linkType: opt.value }))}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAddLink}
              disabled={linkForm.saving || (linkForm.mode === 'issue' ? !linkForm.picked : (!linkForm.extKey.trim() && !linkForm.extTitle.trim()))}
              style={{ padding: '4px 14px', background: 'var(--ds-background-brand-bold)', color: 'var(--ds-text-inverse)', border: 'none', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}
            >
              {linkForm.saving ? 'Saving…' : 'Add link'}
            </button>
            <button
              onClick={() => setLinkForm(f => ({ ...f, open: false, picked: null, extKey: '', extTitle: '' }))}
              style={{ padding: '4px 14px', background: 'none', border: '1px solid var(--ds-border)', borderRadius: 4, fontSize: 'var(--ds-font-size-300)', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)', color: 'var(--ds-text)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setLinkForm(f => ({ ...f, open: true }))}
          style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-link)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          + Link requirement
        </button>
      )}
    </div>
  );

  /* ── Activity tab body: canonical ActivityPanel (comments + audit history). ── */
  const activityPanel = (
    <div style={{ padding: '8px 16px' }}>
      <TmActivitySection entityType="test_case" entityId={itemId} />
    </div>
  );

  /* ── Details tab body. ── */
  const detailsPanel = (
    <div>
      <CatalystKeyDetails
        issue={pseudoIssue}
        itemId={itemId}
        itemType="story"
        projectKey={projectKey ?? ''}
        showParent={false}
        showPriority
        dataSource={{
          priorityOptions,
          onPriorityChange: sidebarDataSource.onPriorityChange,
        }}
        extraRows={
          <>
            {/* [MM3] Type has no canonical field — custom row, read-only. */}
            <KeyDetailsFieldRow label="Type">
              <span style={{ color: typeName ? 'var(--ds-text)' : 'var(--ds-text-subtlest)' }}>
                {typeName ?? '—'}
              </span>
            </KeyDetailsFieldRow>
            {testCase?.preconditions ? (
              <KeyDetailsFieldRow label="Preconditions">
                <span style={{ color: 'var(--ds-text)', whiteSpace: 'pre-wrap' }}>
                  {testCase.preconditions}
                </span>
              </KeyDetailsFieldRow>
            ) : null}
          </>
        }
        afterBody={
          <Description
            issue={pseudoIssue}
            saveOverride={handleDescriptionSave}
            loadAdf={descriptionAdf}
          />
        }
      />
    </div>
  );

  /* ── leftContent: title + tabs. ── */
  const leftContent = useMemo(() => {
    if (isLoading || !testCase) {
      return (
        <div style={{ padding: 24, color: 'var(--ds-text-subtle)' }}>
          {isLoading ? 'Loading…' : 'Test case not found'}
        </div>
      );
    }
    return (
      <>
        <CatalystTitleEditor issue={pseudoIssue} onTitleChange={handleTitleChange} />
        <div style={{ padding: '0 8px' }}>
          <Tabs id="test-case-detail-tabs">
            {/* S4: Steps lead — a test case IS its spec. Runs tab added:
                the same case executed across every cycle (mental-model plane 3). */}
            <TabList>
              <Tab>Steps{steps.length ? ` (${steps.length})` : ''}</Tab>
              <Tab>Details</Tab>
              <Tab>Requirements{reqLinks.length ? ` (${reqLinks.length})` : ''}</Tab>
              <Tab>Runs{runs.length ? ` (${runs.length})` : ''}</Tab>
              <Tab>Versions{versions.length ? ` (${versions.length})` : ''}</Tab>
              <Tab>Attachments{attachmentCount ? ` (${attachmentCount})` : ''}</Tab>
              <Tab>Activity</Tab>
            </TabList>
            <TabPanel>{stepsPanel}</TabPanel>
            <TabPanel>{detailsPanel}</TabPanel>
            <TabPanel>{requirementsPanel}</TabPanel>
            <TabPanel>{runsPanel}</TabPanel>
            <TabPanel>{versionsPanel}</TabPanel>
            <TabPanel>{attachmentsPanel}</TabPanel>
            <TabPanel>{activityPanel}</TabPanel>
          </Tabs>
        </div>
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCase, pseudoIssue, isLoading, detailsPanel, stepsPanel, versionsPanel, requirementsPanel, runsPanel, attachmentsPanel, attachmentCount, steps.length, versions.length, reqLinks.length, runs.length, handleTitleChange]);

  /* ── rightContent: canonical sidebar. ── */
  const rightContent = useMemo(() => {
    if (!testCase || !pseudoIssue) return null;
    return (
      <CatalystSidebarDetails
        issue={pseudoIssue}
        itemId={itemId ?? ''}
        onStatusChange={handleStatusChange}
        onClose={onClose}
        onDelete={() => {}}
        typeLabel="test case"
        projectKey={projectKey ?? ''}
        statusPill={
          <StatusLozengeDropdown
            status={pseudoIssue?.status}
            statusCategory={pseudoIssue?.status_category}
            onStatusChange={handleStatusChange}
            issueType="Test Case"
            statusOptions={TEST_CASE_STATUS_OPTIONS}
          />
        }
        dataSource={sidebarDataSource}
      />
    );
  }, [testCase, pseudoIssue, itemId, handleStatusChange, onClose, projectKey, sidebarDataSource]);

  /* No per-case full-page route — point "Open in full page" back to Repository. */
  const fullPageHrefBuilder = useCallback(() => '/testhub/repository', []);

  const sourceKey = (testCase?.case_key ?? (testCase as any)?.key ?? null) as string | null;
  const sourceTitle = testCase?.title ?? null;

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType="Test Case"
        itemKey={testCase?.key ?? testCase?.case_key ?? null}
        projectKey={projectKey ?? ''}
        projectName="Test Hub"
        parentKey={null}
        parentType="Test Case"
        moreMenuItems={useMemo(() => [
          { label: 'Clone', onClick: () => { if (testCase?.id) setShowCloneDialog(true); } },
          { label: 'Move', onClick: () => catalystToast.info('Coming soon') },
          { label: 'Archive', onClick: () => { if (testCase?.id) setShowArchiveDialog(true); } },
          { label: 'Delete', onClick: () => { if (testCase?.id) setShowDeleteDialog(true); }, danger: true },
        ], [testCase?.id])}
        flagContext={testCase?.id && sourceKey ? {
          issueId: testCase.id as string,
          issueKey: sourceKey,
          isFlagged: !!(testCase as any).is_flagged,
          issueTitle: sourceTitle ?? undefined,
          issueType: 'Test Case',
          tableName: 'tm_test_cases',
        } : undefined}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
        isNotFound={!isLoading && testCase === null}
        hideSidebar={hideSidebar}
        fullPageHrefBuilder={fullPageHrefBuilder}
      />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={sourceKey}
        issueSummary={sourceTitle}
        issueId={testCase?.id ?? null}
        projectId={projectId ?? null}
        currentAssigneeId={(testCase as any)?.assigned_user?.id ?? (testCase as any)?.assigned_to ?? null}
        currentAssigneeName={(testCase as any)?.assigned_user?.full_name ?? null}
        hideReporter
        useAllProfiles
        includeCatalog={TEST_CASE_INCLUDE_CATALOG}
        counts={cloneCounts}
        onConfirm={handleClone}
      />
      <ConfirmArchiveDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        issueSummary={sourceTitle}
        onConfirm={handleArchive}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={sourceKey}
        issueSummary={sourceTitle}
        typeLabel="test case"
        onConfirm={handleDelete}
      />
    </>
  );
}

