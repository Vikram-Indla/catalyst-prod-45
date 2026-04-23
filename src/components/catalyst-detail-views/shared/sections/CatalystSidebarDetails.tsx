/**
 * CANONICAL — Right sidebar for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Uses production-grade editable components from StoryDetailModal:
 *   - EditableAssignee (Jira-parity user picker with avatars)
 *   - EditablePriority (Jira-native priority SVGs with dropdown)
 *   - EditableLabels (add/remove labels with suggestions)
 *   - EditableFixVersions (multi-select with unreleased/released groups)
 *
 * Renders: Status dropdown → Details header → Assignee → "Assign to me" → {children} → Priority → Reporter → Labels → Fix Versions → Timestamps
 *
 * GUARDRAIL: Story Points are BANNED platform-wide (see Catalyst spec). Do NOT re-add.
 *
 * The `children` slot is where type-specific sidebar fields go.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import Heading from '@atlaskit/heading';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { Inline } from '@atlaskit/primitives';
import { useWorkflow } from '@/lib/workflows';
import { StatusTransitionDropdown } from '@/components/workflow';

/**
 * FieldRow — sidebar field row atom (Phase E.3, 2026-04-18).
 *
 * Collapses the repeated {flex + fixed-width label + flex-1 value} pattern
 * into a single call-site per field. Label typography (14/500/#505258 with
 * lineHeight 18.67px) is Jira-measured and kept inline so future typography
 * updates touch one spot. Horizontal gap uses @atlaskit/primitives Inline
 * with space.250 (20px) — the one token that maps exactly to Jira's measured
 * value. Vertical padding stays inline at 11px top/bottom; this doesn't map
 * to any space token cleanly, and we're not drifting for the sake of
 * tokenization.
 */
function FieldRow({
  label,
  alignBlock = 'start',
  labelTopPad = false,
  children,
}: {
  label: string;
  alignBlock?: 'start' | 'center';
  /** Add 2px top padding to the label — used for multi-line values like
   *  Labels / Fix versions where the label should visually align with the
   *  first line of chips. */
  labelTopPad?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '11px 0' }}>
      <Inline space="space.250" alignBlock={alignBlock}>
        <span style={{
          fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258',
          minWidth: 96, flexShrink: 0,
          paddingTop: labelTopPad ? 2 : undefined,
        }}>{label}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </Inline>
    </div>
  );
}
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { PhIssue } from '../types';
import { useCatalystAvatarProfile } from '../hooks/useCatalystAvatarProfile';
/* EditablePriority moved to CatalystKeyDetails (main content) per Jira
   parity audit on 2026-04-20. Keeping the other three editable fields. */
import { EditableAssignee, EditableLabels, EditableFixVersions } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { EpicDueDateField } from '@/components/project/EpicDueDateField';
import { toast } from 'sonner';
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

interface CatalystSidebarDetailsProps {
  issue: PhIssue | null;
  itemId: string;
  projectId?: string;
  onStatusChange: (newStatus: string) => void;
  onClose: () => void;
  onDelete: () => void;
  /** Type-specific fields rendered between the "Details" header and Priority */
  children?: React.ReactNode;
  /** Label for the work item type in the delete confirmation */
  typeLabel?: string;
  /** External trigger to open the delete confirmation */
  deleteRequested?: boolean;
  onDeleteDismiss?: () => void;
}

export function CatalystSidebarDetails({
  issue, itemId, projectId, onStatusChange, onClose, onDelete,
  children, typeLabel = 'item',
  deleteRequested, onDeleteDismiss,
}: CatalystSidebarDetailsProps) {
  const queryClient = useQueryClient();

  /* ── Status state ───────────────────────── */
  const [localStatus, setLocalStatus] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);

  // ── Workflow-aware dropdown (Jira-parity) ──────────────────────────
  // When the issue type is bound to one of our workflows (SDLC / Simple / Bug),
  // use the new StatusTransitionDropdown which matches Jira's verb→pill pattern
  // and renders categories beyond the legacy 3-colour guardrail (red / yellow /
  // purple). Falls back to the original grouped picker below when no workflow
  // is defined for the issue type (e.g. Task, Subtask).
  const workflow = useWorkflow(issue?.issue_type);
  const currentWorkflowState = workflow
    ? workflow.states.find(s => s.name.toLowerCase() === statusValue.toLowerCase())
      ?? workflow.states.find(s => s.id === statusValue.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
      ?? workflow.states.find(s => s.id === workflow.initialStateId)
    : undefined;
  // Phase E.2 (2026-04-18): map Catalyst status category → Atlaskit Lozenge
  // appearance. Colours are locked to the 3-colour guardrail (CLAUDE.md §5):
  // grey / blue / green. Atlaskit's default / inprogress / success tokens
  // render those exact values.
  const lozengeAppearance: 'default' | 'inprogress' | 'success' =
    statusCategory === 'done'
      ? 'success'
      : statusCategory === 'in_progress'
        ? 'inprogress'
        : 'default';

  useEffect(() => { setLocalStatus(''); }, [itemId]);

  useEffect(() => {
    if (deleteRequested) setShowConfirmDelete(true);
  }, [deleteRequested]);

  useEffect(() => {
    if (!showStatusDropdown) return;
    const h = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDropdown]);

  /* ── Auth + current user profile ─────────── */
  const { user } = useAuth();
  const { data: currentProfile } = useCatalystAvatarProfile(user?.id);

  /* ── Avatar resolution for reporter ─────── */
  const { data: reporterProfile } = useCatalystAvatarProfile(issue?.reporter_account_id);

  const labelsArray: string[] = Array.isArray(issue?.labels) ? issue.labels : [];

  const invalidateIssue = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] }),
    [queryClient, itemId],
  );

  /* ── Assign to me handler ──────────────── */
  const handleAssignToMe = useCallback(async () => {
    if (!user) return;
    const displayName = (currentProfile as any)?.full_name ?? user.email ?? 'Me';
    await (supabase as any).from('ph_issues')
      .update({ assignee_account_id: user.id, assignee_display_name: displayName })
      .eq('id', itemId);
    invalidateIssue();
  }, [user, currentProfile, itemId, invalidateIssue]);

  return (
    <>
      {/* ── Status dropdown ──────────────────────────────────────────────
          Phase F (2026-04-20): Jira-parity workflow-aware dropdown. When the
          issue type is bound to a workflow in /admin/workflows, render the
          StatusTransitionDropdown (verb → target-pill rows matching image 4
          of the BAU-5514 design critique). Falls back to the legacy grouped
          picker for unmapped types (Task, Subtask, etc.). */}
      {workflow && currentWorkflowState ? (
        <div style={{ marginBottom: 14 }}>
          <StatusTransitionDropdown
            issueType={issue?.issue_type ?? 'Defect'}
            currentStateId={currentWorkflowState.id}
            onTransition={(_targetStateId, transition) => {
              const target = workflow.states.find(s => s.id === transition.to);
              if (!target) return;
              setLocalStatus(target.name);
              onStatusChange(target.name);
            }}
          />
        </div>
      ) : (
      <div style={{ marginBottom: 14, position: 'relative' }} ref={statusDropdownRef}>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <Lozenge appearance={lozengeAppearance}>{statusValue}</Lozenge>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 4L5 7L8 4" stroke="#42526E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showStatusDropdown && (
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', borderRadius: 8,
            boxShadow: '0 4px 24px rgba(30,31,33,0.16), 0 0 1px rgba(30,31,33,0.31)',
            padding: '6px 0', zIndex: 9999, minWidth: 240, maxHeight: 420, overflowY: 'auto',
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {STATUS_OPTION_GROUPS.map(group => (
              <div key={group.category}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '10px 16px 6px',
                }}>{group.groupLabel}</div>
                {group.statuses.map(st => {
                  const isActive = statusValue === st;
                  const cat = group.category as 'todo' | 'in_progress' | 'done';
                  // Phase E.2 (2026-04-18): Atlaskit Lozenge per CLAUDE.md §5.
                  const optionAppearance: 'default' | 'inprogress' | 'success' =
                    cat === 'done' ? 'success' : cat === 'in_progress' ? 'inprogress' : 'default';
                  return (
                    <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); onStatusChange(st); }}
                      style={{
                        height: 36, padding: '0 16px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', cursor: 'pointer',
                        background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Lozenge appearance={optionAppearance}>{st}</Lozenge>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* View workflow link */}
            <div style={{ borderTop: '1px solid #EBECF0', marginTop: 4, padding: '8px 16px' }}>
              <span style={{ fontSize: 13, color: '#505258', cursor: 'default' }}>View workflow</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Details section card ──────────────── */}
      <div style={{ marginBottom: 8 }}>
        {/* Section header — 49px, Jira spec */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 49,
          padding: '0 8px', borderRadius: '6px 6px 0 0', background: '#FFFFFF',
        }}>
          <ChevronDown size={14} color="#505258" />
          {/* Phase D.1 (2026-04-18): Atlaskit Heading owns typography via tokens. */}
          <Heading size="small">Details</Heading>
        </div>

        {/* Section body — two-column field grid.
            2026-04-20 Jira-parity reorder (Drawer Phase 5):
              Measured on BAU-5538 / BAU-5364 — Jira's Details section
              renders fields in this order:
                Fix versions → Assignee → Reporter → Labels → {children}
              Priority was MOVED out of the sidebar into the new
              "Key details" block at the top of the main content
              (CatalystKeyDetails.tsx). */}
        <div style={{ padding: '8px 12px 8px 19px' }}>

          {/* ── Fix Versions ──── */}
          <FieldRow label="Fix versions" labelTopPad>
            {issue && (
              <EditableFixVersions
                issueId={issue.id}
                currentFixVersions={issue.fix_versions}
                projectKey={issue.project_key}
                onUpdate={invalidateIssue}
              />
            )}
          </FieldRow>

          {/* ── Assignee ──── */}
          <FieldRow label="Assignee">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {issue && (
                <EditableAssignee
                  issueId={issue.id}
                  projectId={projectId || ''}
                  currentAssigneeId={issue.assignee_account_id}
                  currentAssigneeName={issue.assignee_display_name}
                  onUpdate={invalidateIssue}
                />
              )}
              {/* Assign to me */}
              {user && issue?.assignee_account_id !== user.id && (
                <button
                  onClick={handleAssignToMe}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 14, color: '#1868DB', fontFamily: 'inherit', marginTop: 2,
                    textAlign: 'left', textDecoration: 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Assign to me
                </button>
              )}
            </div>
          </FieldRow>

          {/* ── Reporter ──── */}
          <FieldRow label="Reporter" alignBlock="center">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {issue?.reporter_display_name ? (
                <>
                  {reporterProfile?.avatar_url ? (
                    <img src={reporterProfile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name),
                      color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>{getInitials(issue.reporter_display_name)}</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>{issue.reporter_display_name}</span>
                </>
              ) : <span style={{ color: '#6B6E76', fontSize: 14, fontWeight: 400 }}>None</span>}
            </div>
          </FieldRow>

          {/* ── Labels ──── */}
          <FieldRow label="Labels" labelTopPad>
            {issue && (
              <EditableLabels
                issueId={issue.id}
                currentLabels={labelsArray}
                onUpdate={invalidateIssue}
              />
            )}
          </FieldRow>

          {/* ── TYPE-SPECIFIC FIELDS (children slot) ──
              Jira parity: custom fields (MDT Ref, parent picker for legacy
              code paths, etc.) render after Labels. Each CatalystView* owns
              its own children tree. */}
          {children}

          {/* Priority MOVED to CatalystKeyDetails (main content).
              Story Points: BANNED platform-wide. Do NOT re-add. */}
        </div>
      </div>

      {/* ── Timestamps (canonical) ────────────── */}
      <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
        <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
          <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(issue?.jira_created_at)}
        </div>
        <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
          <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
        </div>
      </div>

      {/* ── Delete confirmation (canonical) ─────────────────────────────
          Phase E.1 (2026-04-18): migrated from hand-rolled position:fixed
          overlay to @atlaskit/modal-dialog. Focus trap, Escape to cancel,
          click-outside to dismiss, body scroll lock all inherited from
          Atlaskit. Matches the BacklogPage bulk-delete pattern. */}
      <ModalTransition>
        {showConfirmDelete && (
          <Modal
            onClose={() => { setShowConfirmDelete(false); onDeleteDismiss?.(); }}
            width="small"
          >
            <ModalHeader>
              <ModalTitle appearance="danger">
                Delete {issue?.issue_key}?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              This {typeLabel} will be soft-deleted. It can be restored within 30 days.
            </ModalBody>
            <ModalFooter>
              <Button
                appearance="subtle"
                onClick={() => { setShowConfirmDelete(false); onDeleteDismiss?.(); }}
              >
                Cancel
              </Button>
              <Button
                appearance="danger"
                onClick={() => { setShowConfirmDelete(false); onDelete(); }}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
}
