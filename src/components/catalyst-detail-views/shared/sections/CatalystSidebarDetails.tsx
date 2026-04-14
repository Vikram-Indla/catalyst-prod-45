/**
 * CANONICAL — Right sidebar for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Uses production-grade editable components from StoryDetailModal:
 *   - EditableAssignee (Jira-parity user picker with avatars)
 *   - EditablePriority (Jira-native priority SVGs with dropdown)
 *   - EditableLabels (add/remove labels with suggestions)
 *   - EditableStoryPoints (Fibonacci picker with None option)
 *   - EditableFixVersions (multi-select with unreleased/released groups)
 *
 * Renders: Status dropdown → Details header → Assignee → "Assign to me" → {children} → Priority → Reporter → Labels → Fix Versions → Story Points → Timestamps
 *
 * The `children` slot is where type-specific sidebar fields go.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { PhIssue } from '../types';
import { useCatalystAvatarProfile } from '../hooks/useCatalystAvatarProfile';
import { EditableAssignee, EditablePriority, EditableLabels, EditableStoryPoints, EditableFixVersions } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
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
      {/* ── Status dropdown ──────────────────── */}
      <div style={{ marginBottom: 14, position: 'relative' }} ref={statusDropdownRef}>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          style={{
            backgroundColor: statusStyle.bg, color: statusStyle.text,
            padding: '0 10px', borderRadius: 3, fontSize: 14, fontWeight: 500,
            border: 'none', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 6, fontFamily: 'inherit', lineHeight: 1,
            height: 32, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {statusValue.toUpperCase()}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showStatusDropdown && (
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', borderRadius: 4,
            boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
            padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto',
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {STATUS_OPTION_GROUPS.map(group => (
              <div key={group.category}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4,
                }}>{group.groupLabel}</div>
                {group.statuses.map(st => {
                  const isActive = statusValue === st;
                  const cat = group.category as 'todo' | 'in_progress' | 'done';
                  const lozengeStyle = cat === 'done'
                    ? { background: '#E3FCEF', color: '#006644' }
                    : cat === 'in_progress'
                      ? { background: '#DEEBFF', color: '#0747A6' }
                      : { background: '#DFE1E6', color: '#253858' };
                  return (
                    <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); onStatusChange(st); }}
                      style={{
                        height: 36, padding: '0 12px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', cursor: 'pointer',
                        background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{
                        ...lozengeStyle, display: 'inline-flex', alignItems: 'center',
                        height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11,
                        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}>{st}</span>
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
          </div>
        )}
      </div>

      {/* ── Details section card ──────────────── */}
      <div style={{ marginBottom: 8 }}>
        {/* Section header — 49px, Jira spec */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 49,
          padding: '0 8px', borderRadius: '6px 6px 0 0', background: '#FFFFFF',
        }}>
          <ChevronDown size={14} color="#505258" />
          <span style={{ fontSize: 16, fontWeight: 500, lineHeight: '20px', color: '#292A2E' }}>Details</span>
        </div>

        {/* Section body — two-column field grid */}
        <div style={{ padding: '8px 12px 8px 19px' }}>

          {/* ── Assignee ──── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0 }}>Assignee</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          </div>

          {/* ── TYPE-SPECIFIC FIELDS (children slot) ── */}
          {children}

          {/* ── Priority ──── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '11px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0 }}>Priority</span>
            <div style={{ flex: 1 }}>
              {issue && (
                <EditablePriority
                  issueId={issue.id}
                  currentPriority={issue.priority}
                  onUpdate={invalidateIssue}
                />
              )}
            </div>
          </div>

          {/* ── Reporter ──── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0 }}>Reporter</span>
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
          </div>

          {/* ── Labels ──── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0, paddingTop: 2 }}>Labels</span>
            <div style={{ flex: 1 }}>
              {issue && (
                <EditableLabels
                  issueId={issue.id}
                  currentLabels={labelsArray}
                  onUpdate={invalidateIssue}
                />
              )}
            </div>
          </div>

          {/* ── Fix Versions ──── */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0, paddingTop: 2 }}>Fix versions</span>
            <div style={{ flex: 1 }}>
              {issue && (
                <EditableFixVersions
                  issueId={issue.id}
                  currentFixVersions={issue.fix_versions}
                  projectKey={issue.project_key}
                  onUpdate={invalidateIssue}
                />
              )}
            </div>
          </div>

          {/* ── Story Points ──── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '11px 0' }}>
            <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 120, flexShrink: 0 }}>Story points</span>
            <div style={{ flex: 1 }}>
              {issue && (
                <EditableStoryPoints
                  issueId={issue.id}
                  currentPoints={issue.story_points}
                  onUpdate={invalidateIssue}
                />
              )}
            </div>
          </div>
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

      {/* ── Delete confirmation (canonical) ──── */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw', animation: 'cv-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>
              This {typeLabel} will be soft-deleted. It can be restored within 30 days.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setShowConfirmDelete(false); onDeleteDismiss?.(); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); onDelete(); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#DE350B', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
