/**
 * ConfirmCloneDialog — Jira-parity clone form.
 *
 * Layout:
 *   - Header:            `Clone {issueKey}`
 *   - Subtitle:          `Required fields are marked with an asterisk *`
 *   - Summary *          Textfield, prefilled `CLONE - {originalSummary}`
 *   - Assignee           EditableAssignee (local state)
 *   - Assign to me       link — sets assignee to current user
 *   - Reporter *         EditableReporter (local state)
 *   - Include            checkbox group — only renders when at least one
 *                        cloneable child section has count > 0. Each row
 *                        renders iff its section has ≥1 item.
 *   - Footer:            Cancel · Clone
 *
 * Pickers run in local mode via `onChange` overrides — no writes to the
 * source issue. Selected values are held in dialog state until Clone is
 * confirmed. Callers consume the patch via `onConfirm(patch)`.
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

export interface ClonePatch {
  summary: string;
  assigneeId: string | null;
  assigneeName: string | null;
  reporterId: string | null;
  reporterName: string | null;
  include: CloneInclude;
}

export interface CloneInclude {
  attachments: boolean;
  childItems: boolean;
  linkedItems: boolean;
  subtasks: boolean;
  links: boolean;
  design: boolean;
  comments: boolean;
  testCases: boolean;
}

interface SectionCounts {
  attachments: number;
  childItems: number;
  linkedItems: number;
  subtasks: number;
  links: number;
  design: number;
  comments: number;
  testCases: number;
}

const ZERO_COUNTS: SectionCounts = {
  attachments: 0,
  childItems: 0,
  linkedItems: 0,
  subtasks: 0,
  links: 0,
  design: 0,
  comments: 0,
  testCases: 0,
};

const DEFAULT_INCLUDE: CloneInclude = {
  attachments: false,
  childItems: false,
  linkedItems: false,
  subtasks: false,
  links: false,
  design: false,
  comments: false,
  testCases: false,
};

const SUBTASK_TYPES = new Set(['sub-task', 'subtask', 'backend', 'frontend', 'integration']);

interface ConfirmCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string | null | undefined;
  issueSummary: string | null | undefined;
  /** Source issue id — passed through to EditableAssignee/Reporter (unused for writes; onChange bypasses their default mutation). */
  issueId?: string | null;
  /** Required for member queries in the assignee/reporter pickers. */
  projectId?: string | null;
  currentAssigneeId?: string | null;
  currentAssigneeName?: string | null;
  currentReporterId?: string | null;
  currentReporterName?: string | null;
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
 * Fetches per-section counts for the source issue. Sections with 0 items are
 * hidden in the "Include" group. Runs only when the dialog is open. Uses
 * `count: 'exact', head: true` so no row payloads are transferred.
 */
function useSectionCounts(
  isOpen: boolean,
  issueId: string | null | undefined,
  issueKey: string | null | undefined,
): SectionCounts {
  const { data } = useQuery({
    queryKey: ['clone-section-counts', issueKey, issueId],
    enabled: isOpen && !!issueKey,
    staleTime: 60000,
    queryFn: async (): Promise<SectionCounts> => {
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
        iid
          ? countExact(
              (supabase as any)
                .from('ph_attachments')
                .select('id', { count: 'exact', head: true })
                .eq('work_item_id', iid),
            )
          : Promise.resolve(0),
        ikey
          ? countExact(
              (supabase as any)
                .from('ph_issue_links')
                .select('id', { count: 'exact', head: true })
                .or(`source_id.eq.${ikey},target_id.eq.${ikey}`),
            )
          : Promise.resolve(0),
        iid
          ? countExact(
              (supabase as any)
                .from('ph_web_links')
                .select('id', { count: 'exact', head: true })
                .eq('work_item_id', iid),
            )
          : Promise.resolve(0),
        iid
          ? countExact(
              (supabase as any)
                .from('ph_designs')
                .select('id', { count: 'exact', head: true })
                .eq('work_item_id', iid),
            )
          : Promise.resolve(0),
        iid
          ? countExact(
              (supabase as any)
                .from('ph_comments')
                .select('id', { count: 'exact', head: true })
                .eq('work_item_id', iid),
            )
          : Promise.resolve(0),
        ikey
          ? countExact(
              (supabase as any)
                .from('tm_test_cases')
                .select('id', { count: 'exact', head: true })
                .eq('linked_story_key', ikey)
                .eq('archived', false),
            )
          : Promise.resolve(0),
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

      return {
        attachments,
        linkedItems,
        links,
        design,
        comments,
        testCases,
        subtasks,
        childItems,
      };
    },
  });

  return data ?? ZERO_COUNTS;
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
  onConfirm,
}: ConfirmCloneDialogProps) {
  const { user } = useAuth();

  const initialSummary = useMemo(
    () => `CLONE - ${issueSummary ?? ''}`.trimEnd(),
    [issueSummary],
  );

  const [summary, setSummary] = useState(initialSummary);
  const [assigneeId, setAssigneeId] = useState<string | null>(currentAssigneeId ?? null);
  const [assigneeName, setAssigneeName] = useState<string | null>(currentAssigneeName ?? null);
  const [reporterId, setReporterId] = useState<string | null>(currentReporterId ?? null);
  const [reporterName, setReporterName] = useState<string | null>(currentReporterName ?? null);
  const [include, setInclude] = useState<CloneInclude>(DEFAULT_INCLUDE);

  // Reset ONLY on open (false → true). Do not depend on the initial-* props
  // themselves — if any of them change while the dialog is open (parent
  // re-renders with fresh issue data), state must not blow away the user's
  // edits (checkbox picks, edited summary, picked assignee/reporter).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setSummary(initialSummary);
      setAssigneeId(currentAssigneeId ?? null);
      setAssigneeName(currentAssigneeName ?? null);
      setReporterId(currentReporterId ?? null);
      setReporterName(currentReporterName ?? null);
      setInclude(DEFAULT_INCLUDE);
    }
    wasOpen.current = isOpen;
  }, [isOpen, initialSummary, currentAssigneeId, currentAssigneeName, currentReporterId, currentReporterName]);

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

  const counts = useSectionCounts(isOpen, issueId, issueKey);

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

  const canConfirm = !!summary.trim() && !!reporterId;

  const includeRows: Array<{ key: keyof CloneInclude; label: string; count: number }> = [
    { key: 'attachments', label: 'Attachments', count: counts.attachments },
    { key: 'childItems', label: 'Child work items', count: counts.childItems },
    { key: 'linkedItems', label: 'Linked work items', count: counts.linkedItems },
    { key: 'subtasks', label: 'Subtasks', count: counts.subtasks },
    { key: 'links', label: 'Links', count: counts.links },
    { key: 'design', label: 'Design', count: counts.design },
    { key: 'comments', label: 'Comments', count: counts.comments },
    { key: 'testCases', label: 'Test cases', count: counts.testCases },
  ].filter((r) => r.count > 0);

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
            />
            <AssignToMeLink onClick={handleAssignToMe} disabled={!user} />
          </div>

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
            />
          </div>

          {includeRows.length > 0 && (
            <div>
              <label style={labelStyle}>Include</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {includeRows.map((row) => (
                  <Checkbox
                    key={row.key}
                    label={`${row.label} (${row.count})`}
                    isChecked={include[row.key]}
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
