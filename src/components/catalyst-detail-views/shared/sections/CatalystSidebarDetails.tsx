/**
 * CANONICAL — Right sidebar for all CatalystView* components.
 * Change here → updates all 7 work item types.
 *
 * Renders:  Status dropdown → Details header → {children} → Assignee → Reporter → Labels → Timestamps
 *
 * The `children` slot is where type-specific fields go (Priority, Fix Versions, etc.).
 * This lets each view add unique fields without losing the canonical ones.
 */
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PhIssue } from '../types';
import { useCatalystAvatarProfile } from '../hooks/useCatalystAvatarProfile';
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

interface CatalystSidebarDetailsProps {
  issue: PhIssue | null;
  itemId: string;
  onStatusChange: (newStatus: string) => void;
  onClose: () => void;
  onDelete: () => void;
  /** Type-specific fields rendered between the "Details" header and Assignee */
  children?: React.ReactNode;
  /** Label for the work item type in the delete confirmation */
  typeLabel?: string;
  /** External trigger to open the delete confirmation (e.g. from "more" menu) */
  deleteRequested?: boolean;
  /** Called when the delete confirmation is dismissed without deleting */
  onDeleteDismiss?: () => void;
}

export function CatalystSidebarDetails({
  issue, itemId, onStatusChange, onClose, onDelete,
  children, typeLabel = 'item',
  deleteRequested, onDeleteDismiss,
}: CatalystSidebarDetailsProps) {

  /* ── Status state ───────────────────────── */
  const [localStatus, setLocalStatus] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);

  // Sync localStatus when issue changes (e.g. navigation)
  useEffect(() => { setLocalStatus(''); }, [itemId]);

  // Allow external trigger for delete confirmation (e.g. from "more" menu)
  useEffect(() => {
    if (deleteRequested) setShowConfirmDelete(true);
  }, [deleteRequested]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showStatusDropdown) return;
    const h = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDropdown]);

  /* ── Avatar resolution ──────────────────── */
  const { data: assigneeProfile } = useCatalystAvatarProfile(issue?.assignee_account_id);
  const { data: reporterProfile } = useCatalystAvatarProfile(issue?.reporter_account_id);

  const labelsArray: string[] = Array.isArray(issue?.labels) ? issue.labels : [];

  return (
    <>
      {/* ── Status dropdown ──────────────────── */}
      <div style={{ marginBottom: 14, position: 'relative' }} ref={statusDropdownRef}>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          style={{
            backgroundColor: statusStyle.bg, color: statusStyle.text,
            padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', display: 'inline-flex',
            alignItems: 'center', gap: 6, fontFamily: 'inherit', lineHeight: 1,
            transition: 'opacity 0.15s',
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
                    <div
                      key={st}
                      onClick={() => {
                        setLocalStatus(st);
                        setShowStatusDropdown(false);
                        onStatusChange(st);
                      }}
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

      {/* ── Details section ──────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <ChevronDown size={14} color="#42526E" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
        </div>

        {/* ── TYPE-SPECIFIC FIELDS (children slot) ── */}
        {children}

        {/* ── Assignee (canonical) ────────────── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Assignee</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
            {issue?.assignee_display_name ? (
              <>
                {assigneeProfile?.avatar_url ? (
                  <img src={assigneeProfile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: getAvatarColor(issue.assignee_account_id ?? issue.assignee_display_name),
                    color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{getInitials(issue.assignee_display_name)}</span>
                )}
                <span style={{ fontSize: 14, color: '#172B4D' }}>{issue.assignee_display_name}</span>
              </>
            ) : <span style={{ color: '#42526E', fontSize: 14 }}>Unassigned</span>}
          </div>
        </div>

        {/* ── Reporter (canonical) ────────────── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
            {issue?.reporter_display_name ? (
              <>
                {reporterProfile?.avatar_url ? (
                  <img src={reporterProfile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name),
                    color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{getInitials(issue.reporter_display_name)}</span>
                )}
                <span style={{ fontSize: 14, color: '#172B4D' }}>{issue.reporter_display_name}</span>
              </>
            ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
          </div>
        </div>

        {/* ── Labels (canonical) ──────────────── */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Labels</div>
          {labelsArray.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 0' }}>
              {labelsArray.map((label, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3, background: '#F4F5F7', color: '#172B4D' }}>{label}</span>
              ))}
            </div>
          ) : (
            <div style={{ padding: '4px 6px', fontSize: 14, color: '#42526E' }}>None</div>
          )}
        </div>
      </div>

      {/* ── Timestamps (canonical, always at bottom) ── */}
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
              <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); onDelete(); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#DE350B', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Expose a trigger for the delete confirmation — views call this via the "more" menu */
CatalystSidebarDetails.displayName = 'CatalystSidebarDetails';
