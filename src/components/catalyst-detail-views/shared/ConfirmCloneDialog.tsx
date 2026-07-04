/**
 * ConfirmCloneDialog — Jira-parity clone form.
 *
 * Extensibility (2026-07-04): supports non-ph_issues entity types (test cases,
 * test cycles, tasks hub items, business requests). Callers can:
 *   - Hide the Reporter row via `hideReporter` (test cases, test cycles, BR)
 *   - Override the Include catalog + counts via `includeCatalog` + `counts`
 *     props. When both are omitted, the dialog falls back to the built-in
 *     ph_issues catalog (attachments/childItems/linkedItems/subtasks/links/
 *     design/comments/testCases) and auto-fetches counts.
 *
 * The patch surface stays generic — callers own how the patch maps to their
 * table columns. `include` is `Record<string, boolean>` so any custom catalog
 * key works.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Checkbox from '@atlaskit/checkbox';
import { EditableAssignee, EditableReporter } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type CloneInclude = Record<string, boolean>;

export interface ClonePatch {
  summary: string;
  assigneeId: string | null;
  assigneeName: string | null;
  reporterId: string | null;
  reporterName: string | null;
  include: CloneInclude;
}

/** Section catalog entry — a checkbox row in the "Include" group. */
export interface CloneCatalogEntry {
  key: string;
  label: string;
}

const SUBTASK_TYPES = new Set(['sub-task', 'subtask', 'backend', 'frontend', 'integration']);

/** Default catalog for ph_issues detail views (Story, Epic, Feature, etc.). */
const DEFAULT_PH_CATALOG: CloneCatalogEntry[] = [
  { key: 'attachments', label: 'Attachments' },
  { key: 'childItems', label: 'Child work items' },
  { key: 'linkedItems', label: 'Linked work items' },
  { key: 'subtasks', label: 'Subtasks' },
  { key: 'links', label: 'Links' },
  { key: 'design', label: 'Design' },
  { key: 'comments', label: 'Comments' },
  { key: 'testCases', label: 'Test cases' },
];

interface ConfirmCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string | null | undefined;
  issueSummary: string | null | undefined;
  /** Source issue id — threaded to EditableAssignee/Reporter (unused for writes; onChange bypasses their default mutation). */
  issueId?: string | null;
  /** Required for the assignee/reporter pickers' member queries. */
  projectId?: string | null;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  currentReporterId?: string | null;
  currentReporterName?: string | null;
  /** Hide the Reporter row (test cases, test cycles, BR — Assignee-only variant). */
  hideReporter?: boolean;
  /** Override the Include catalog. When omitted, defaults to the ph_issues catalog. */
  includeCatalog?: CloneCatalogEntry[];
  /** Precomputed section counts keyed by catalog `key`. When provided, disables the internal ph_issues auto-fetch. */
  counts?: Record<string, number>;
  /** Populate the Assignee/Reporter pickers from ALL approved profiles instead of
   *  the passed `projectId`'s project_members shortlist. Defaults to `true` —
   *  clone modals show every user everywhere (Jira parity). Pass `false` to
   *  scope the pickers to `project_members` for a specific caller. */
  useAllProfiles?: boolean;
  /** Fires with the current dialog state so callers can apply the patch. */
  onConfirm: (patch?: ClonePatch) => void;
}

const asterisk = (
  <span style={{ color: 'var(--ds-text-danger)', marginLeft: 2 }}>*</span>
);

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 'var(--ds-font-size-200)',
  color: 'var(--ds-text)',
  marginBottom: 4,
};

function AssignToMeLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
      style={{
        background: 'none',
        border: 'none',
        padding: '4px 0 0 0',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--ds-text-disabled)' : 'var(--ds-link)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 400,
        lineHeight: '16px',
        textAlign: 'left',
      }}
    >
      Assign to me
    </button>
  );
}

/**
 * Built-in ph_issues section counts. Skipped when the caller passes explicit
 * `counts` (non-ph_issues variants). Runs only when the dialog is open.
 */
function usePhIssueSectionCounts(
  enabled: boolean,
  issueId: string | null | undefined,
  issueKey: string | null | undefined,
): Record<string, number> {
  const { data } = useQuery({
    queryKey: ['clone-section-counts', issueKey, issueId],
    enabled: enabled && !!issueKey,
    staleTime: 60000,
    queryFn: async (): Promise<Record<string, number>> => {
      const iid = issueId ?? '';
      const ikey = issueKey ?? '';

      const countExact = (p: PromiseLike<{ count: number | null; error: unknown }>) =>
        p.then((r) => (r.error ? 0 : r.count ?? 0));

      const [
        attachments,
        linkedItems,
        links,
        design,
        comments,
        testCases,
        children,
      ] = await Promise.all([
        iid ? countExact((supabase as any).from('ph_attachments').select('id', { count: 'exact', head: true }).eq('work_item_id', iid)) : Promise.resolve(0),
        ikey ? countExact((supabase as any).from('ph_issue_links').select('id', { count: 'exact', head: true }).or(`source_id.eq.${ikey},target_id.eq.${ikey}`)) : Promise.resolve(0),
        iid ? countExact((supabase as any).from('ph_web_links').select('id', { count: 'exact', head: true }).eq('work_item_id', iid)) : Promise.resolve(0),
        iid ? countExact((supabase as any).from('ph_designs').select('id', { count: 'exact', head: true }).eq('work_item_id', iid)) : Promise.resolve(0),
        iid ? countExact((supabase as any).from('ph_comments').select('id', { count: 'exact', head: true }).eq('work_item_id', iid)) : Promise.resolve(0),
        ikey ? countExact((supabase as any).from('tm_test_cases').select('id', { count: 'exact', head: true }).eq('linked_story_key', ikey).eq('archived', false)) : Promise.resolve(0),
        ikey
          ? (supabase as any)
              .from('ph_issues')
              .select('issue_type', { count: 'exact' })
              .eq('parent_key', ikey)
              .is('deleted_at', null)
              .then((r: any) => (r.error ? [] : (r.data ?? [])))
          : Promise.resolve([]),
      ]);

      let subtasks = 0;
      let childItems = 0;
      for (const row of children as Array<{ issue_type: string | null }>) {
        const t = (row.issue_type ?? '').toLowerCase().trim();
        if (SUBTASK_TYPES.has(t)) subtasks += 1;
        else childItems += 1;
      }

      return { attachments, linkedItems, links, design, comments, testCases, subtasks, childItems };
    },
  });

  return data ?? {};
}

export function ConfirmCloneDialog({
  isOpen,
  onClose,
  issueKey,
  issueSummary,
  issueId,
  projectId,
  currentAssigneeId,
  currentAssigneeName,
  currentReporterId,
  currentReporterName,
  hideReporter,
  includeCatalog,
  counts: countsOverride,
  useAllProfiles = true,
  onConfirm,
}: ConfirmCloneDialogProps) {
  const { user } = useAuth();

  const initialSummary = useMemo(
    () => `CLONE - ${issueSummary ?? ''}`.trimEnd(),
    [issueSummary],
  );

  const catalog = includeCatalog ?? DEFAULT_PH_CATALOG;
  const defaultInclude: CloneInclude = useMemo(() => {
    const out: CloneInclude = {};
    for (const row of catalog) out[row.key] = false;
    return out;
  }, [catalog]);

  const [summary, setSummary] = useState(initialSummary);
  const [assigneeId, setAssigneeId] = useState<string | null>(currentAssigneeId ?? null);
  const [assigneeName, setAssigneeName] = useState<string | null>(currentAssigneeName ?? null);
  const [reporterId, setReporterId] = useState<string | null>(currentReporterId ?? null);
  const [reporterName, setReporterName] = useState<string | null>(currentReporterName ?? null);
  const [include, setInclude] = useState<CloneInclude>(defaultInclude);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setSummary(initialSummary);
      setAssigneeId(currentAssigneeId ?? null);
      setAssigneeName(currentAssigneeName ?? null);
      setReporterId(currentReporterId ?? null);
      setReporterName(currentReporterName ?? null);
      setInclude(defaultInclude);
    }
    wasOpen.current = isOpen;
  }, [isOpen, initialSummary, currentAssigneeId, currentAssigneeName, currentReporterId, currentReporterName, defaultInclude]);

  const { data: currentProfile } = useQuery({
    queryKey: ['clone-me-profile', user?.id],
    enabled: !!user?.id && isOpen,
    staleTime: 300000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', user!.id)
        .maybeSingle();
      return data as { id: string; full_name: string | null; email: string | null } | null;
    },
  });

  const autoCounts = usePhIssueSectionCounts(
    isOpen && !countsOverride && !includeCatalog,
    issueId,
    issueKey,
  );
  const counts = countsOverride ?? autoCounts;

  const handleAssignToMe = () => {
    if (!user) return;
    const displayName = currentProfile?.full_name ?? user.email ?? 'Me';
    setAssigneeId(user.id);
    setAssigneeName(displayName);
  };

  const handleConfirm = () => {
    onConfirm({
      summary: summary.trim(),
      assigneeId,
      assigneeName,
      reporterId,
      reporterName,
      include,
    });
    onClose();
  };

  const canConfirm = !!summary.trim() && (hideReporter || !!reporterId);

  const includeRows = catalog
    .map((row) => ({ ...row, count: counts[row.key] ?? 0 }))
    .filter((r) => r.count > 0);

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ModalTitle>Clone {issueKey ?? 'issue'}</ModalTitle>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)' }}>
            Required fields are marked with an asterisk{asterisk}
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label htmlFor="clone-summary" style={labelStyle}>
              Summary{asterisk}
            </label>
            <Textfield
              id="clone-summary"
              value={summary}
              onChange={(e) => setSummary((e.currentTarget as HTMLInputElement).value)}
              autoFocus
              maxLength={255}
              aria-required="true"
              isInvalid={!summary.trim()}
            />
          </div>

          <div>
            <label style={labelStyle}>Assignee</label>
            <EditableAssignee
              issueId={issueId ?? ''}
              projectId={projectId ?? ''}
              currentAssigneeId={assigneeId}
              currentAssigneeName={assigneeName}
              onUpdate={() => { /* no-op — local state */ }}
              onChange={(id, name) => {
                setAssigneeId(id);
                setAssigneeName(name);
              }}
              bordered
              useAllProfiles={useAllProfiles}
            />
            <AssignToMeLink onClick={handleAssignToMe} disabled={!user} />
          </div>

          {!hideReporter && (
            <div>
              <label style={labelStyle}>
                Reporter{asterisk}
              </label>
              <EditableReporter
                issueId={issueId ?? ''}
                projectId={projectId ?? ''}
                currentReporterId={reporterId}
                currentReporterName={reporterName}
                onUpdate={() => { /* no-op — local state */ }}
                onChange={(id, name) => {
                  setReporterId(id);
                  setReporterName(name);
                }}
                bordered
                useAllProfiles={useAllProfiles}
              />
            </div>
          )}

          {includeRows.length > 0 && (
            <div>
              <label style={labelStyle}>Include</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {includeRows.map((row) => (
                  <Checkbox
                    key={row.key}
                    label={`${row.label} (${row.count})`}
                    isChecked={!!include[row.key]}
                    onChange={() =>
                      setInclude((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleConfirm} isDisabled={!canConfirm}>
          Clone
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
