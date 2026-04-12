/**
 * Canonical shared UI sections for CatalystView* components.
 *
 * CatalystTitleEditor     — Editable h1 with focus ring + hover highlight
 * CatalystActivitySection — Comments / History tab pair (fetches its own data)
 * CatalystSidebarDetails  — Status dropdown, Details header, children slot,
 *                           Assignee, Reporter, Labels, Timestamps, Delete modal
 */
import React, { useState } from 'react';
import { ChevronDown, MessageSquare, Clock } from 'lucide-react';
import type { PhIssue, PhComment, PhActivityLog } from './types';
import { useCatalystComments, useCatalystActivity, useCatalystAvatarProfile } from './hooks';
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/* ═══════════════════════════════════════════
   CatalystTitleEditor
   ═══════════════════════════════════════════ */
interface TitleEditorProps {
  issue: PhIssue | null;
  onTitleChange: (newTitle: string) => void;
}

export function CatalystTitleEditor({ issue, onTitleChange }: TitleEditorProps) {
  const [focused, setFocused] = useState(false);
  const summary = issue?.summary;

  return (
    <h1
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setFocused(true)}
      onBlur={e => {
        setFocused(false);
        const newTitle = e.currentTarget.textContent?.trim() ?? '';
        if (newTitle && newTitle !== summary) {
          onTitleChange(newTitle);
        }
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Escape') { e.currentTarget.textContent = summary ?? ''; e.currentTarget.blur(); }
      }}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 22, fontWeight: 700, color: '#172B4D', lineHeight: 1.3,
        margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
        padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
        background: focused ? '#FFFFFF' : 'transparent',
        boxShadow: focused ? '0 0 0 2px #4C9AFF' : 'none',
      }}
      onMouseEnter={e => { if (!focused) e.currentTarget.style.background = '#F4F5F7'; }}
      onMouseLeave={e => { if (!focused) e.currentTarget.style.background = 'transparent'; }}
    >
      {summary ?? '\u2014'}
    </h1>
  );
}

/* ═══════════════════════════════════════════
   CatalystActivitySection
   Fetches comments + activity internally via canonical hooks.
   ═══════════════════════════════════════════ */
interface ActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

export function CatalystActivitySection({ itemId, isOpen }: ActivitySectionProps) {
  const { data: comments = [] } = useCatalystComments(itemId, isOpen);
  const { data: activityLog = [] } = useCatalystActivity(itemId, isOpen);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');

  return (
    <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
        {(['comments', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px', fontSize: 14, fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#172B4D' : '#5E6C84',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #0052CC' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab === 'comments' ? <MessageSquare size={14} /> : <Clock size={14} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'comments' && (
        <div>
          {comments.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {c.author?.avatar_url ? (
                <img src={c.author.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(c.author?.full_name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{c.author?.full_name ?? 'Unknown'}</span>
                  <span style={{ fontSize: 13, color: '#6B778C', marginLeft: 8 }}>{fmtDate(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: c.body }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {activityLog.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>
          )}
          {activityLog.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {entry.actor?.avatar_url ? (
                <img src={entry.actor.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1" /><rect x="4" y="4" width="16" height="18" rx="2" /></svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{entry.actor?.full_name ?? 'System'}</span>{' '}
                  {entry.action === 'field_updated' ? <>changed the <span style={{ fontWeight: 600 }}>{entry.field_name}</span></> : entry.action}
                </div>
                <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</div>
                {(entry.old_value || entry.new_value) && (
                  <div style={{ marginTop: 8, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#6B778C' }}>{entry.old_value || 'None'}</span>
                    <span style={{ color: '#97A0AF' }}>{'\u2192'}</span>
                    <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CatalystSidebarDetails
   Manages its own delete confirmation modal state.
   ═══════════════════════════════════════════ */
interface SidebarDetailsProps {
  issue: PhIssue | null;
  itemId: string;
  onStatusChange: (newStatus: string) => void;
  onClose: () => void;
  onDelete: () => void;
  typeLabel: string;
  /** Rendered BETWEEN the "Details" header and the canonical Assignee field */
  children?: React.ReactNode;
}

export function CatalystSidebarDetails({
  issue, itemId, onStatusChange, onClose, onDelete, typeLabel, children,
}: SidebarDetailsProps) {
  const [localStatus, setLocalStatus] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);

  const labelsArray: string[] = Array.isArray(issue?.labels) ? issue.labels : [];

  return (
    <>
      {/* Status dropdown */}
      <div style={{ marginBottom: 14, position: 'relative' }}>
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
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4 }}>{group.groupLabel}</div>
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
                      onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); onStatusChange(st); }}
                      style={{
                        height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ ...lozengeStyle, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{st}</span>
                      {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details section */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <ChevronDown size={14} color="#42526E" />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
        </div>

        {/* Children slot: type-specific fields between header and Assignee */}
        {children}

        {/* Assignee */}
        <SidebarPersonField
          label="Assignee"
          displayName={issue?.assignee_display_name}
          accountId={issue?.assignee_account_id}
          emptyLabel="Unassigned"
        />

        {/* Reporter */}
        <SidebarPersonField
          label="Reporter"
          displayName={issue?.reporter_display_name}
          accountId={issue?.reporter_account_id}
          emptyLabel={'\u2014'}
        />

        {/* Labels */}
        {labelsArray.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Labels</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 0' }}>
              {labelsArray.map((label, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3, background: '#F4F5F7', color: '#172B4D' }}>{label}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
        <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
          <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(issue?.jira_created_at)}
        </div>
        <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
          <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw', animation: 'cv-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>This {typeLabel} will be soft-deleted. It can be restored within 30 days.</p>
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

/* ═══════════════════════════════════════════
   Internal helper — person field (Assignee / Reporter)
   Uses useCatalystAvatarProfile internally
   ═══════════════════════════════════════════ */
function SidebarPersonField({
  label, displayName, accountId, emptyLabel,
}: {
  label: string;
  displayName?: string | null;
  accountId?: string | null;
  emptyLabel: string;
}) {
  const { data: profile } = useCatalystAvatarProfile(accountId);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
        {displayName ? (
          <>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(accountId ?? displayName), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {getInitials(displayName)}
              </span>
            )}
            <span style={{ fontSize: 14, color: '#172B4D' }}>{displayName}</span>
          </>
        ) : (
          <span style={{ color: '#42526E', fontSize: 14 }}>{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
