/**
 * CatalystViewIncident — Production Incident detail overlay.
 *
 * Uses CatalystViewBase for the shared layout shell and renders
 * incident-specific content: severity, impact, RCA section.
 * Data source: ph_issues (Jira-synced production incidents).
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ChevronDown, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import type { CatalystViewBaseProps, PhIssue, PhComment, PhActivityLog } from '../shared/types';
import {
  StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';
import {
  STATUS_OPTION_GROUPS, PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

export default function CatalystViewIncident({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const queryClient = useQueryClient();
  const { user } = useAuth();

  /* ── Queries ────────────────────────────── */
  const { data: issue, isLoading } = useQuery({
    queryKey: ['cv-incident-detail', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('*').eq('id', itemId).is('deleted_at', null).single();
      return data as unknown as PhIssue | null;
    },
  });

  const { data: reporterProfile } = useQuery({
    queryKey: ['cv-reporter', issue?.reporter_account_id],
    enabled: !!issue?.reporter_account_id,
    queryFn: async () => {
      const { data: jiraRow } = await supabase.from('jira_identity_map').select('avatar_url, catalyst_user_id').eq('jira_account_id', issue!.reporter_account_id!).maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', jiraRow.catalyst_user_id).single();
        if (profile?.avatar_url) return profile;
      }
      return null;
    },
    staleTime: 60000,
  });

  const { data: assigneeProfile } = useQuery({
    queryKey: ['cv-assignee', issue?.assignee_account_id],
    enabled: !!issue?.assignee_account_id,
    queryFn: async () => {
      const { data: jiraRow } = await supabase.from('jira_identity_map').select('avatar_url, catalyst_user_id').eq('jira_account_id', issue!.assignee_account_id!).maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', jiraRow.catalyst_user_id).single();
        if (profile?.avatar_url) return profile;
      }
      return null;
    },
    staleTime: 60000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['cv-incident-comments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_comments').select('id, work_item_id, body, author_id, created_at, updated_at').eq('work_item_id', itemId).order('created_at', { ascending: true });
      if (!data?.length) return [] as PhComment[];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', authorIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({ ...c, author: profileMap.get(c.author_id) ?? null })) as unknown as PhComment[];
    },
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['cv-incident-activity', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_activity_log').select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      if (!data?.length) return [] as PhActivityLog[];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, actor: profileMap.get(e.user_id) ?? null })) as unknown as PhActivityLog[];
    },
  });

  /* ── Local state ────────────────────────── */
  const [localStatus, setLocalStatus] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<'comments' | 'history'>('comments');
  const [titleFocused, setTitleFocused] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);
  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;

  /* ── Mutations ──────────────────────────── */
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const cat = getStatusCategory(newStatus);
      await supabase.from('ph_issues').update({ status: newStatus, status_category: cat }).eq('id', itemId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cv-incident-detail', itemId] }),
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: string; oldValue?: string }) => {
      await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cv-incident-detail', itemId] }),
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
    },
    onSuccess: () => { toast.success('Incident deleted'); onClose(); },
  });

  const labelsArray: string[] = Array.isArray(issue?.labels) ? issue.labels : [];

  /* ── LEFT PANEL ─────────────────────────── */
  const leftContent = (
    <>
      {/* Severity banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#FFF5F5', borderRadius: 6, marginBottom: 16, border: '1px solid #FFEDEB',
      }}>
        <AlertTriangle size={16} color="#FF5630" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#BF2600' }}>Production Incident</span>
        <span style={{ fontSize: 12, color: '#5E6C84', marginLeft: 'auto' }}>
          Priority: <span style={{ color: priorityStyle.color, fontWeight: 700 }}>{priorityStyle.symbol} {issue?.priority ?? 'Medium'}</span>
        </span>
      </div>

      {/* Title */}
      <h1
        contentEditable suppressContentEditableWarning
        onFocus={() => setTitleFocused(true)}
        onBlur={e => {
          setTitleFocused(false);
          const newTitle = e.currentTarget.textContent?.trim() ?? '';
          if (newTitle && newTitle !== issue?.summary) {
            updateFieldMutation.mutate({ field: 'summary', value: newTitle, oldValue: issue?.summary ?? '' });
          }
        }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === 'Escape') { e.currentTarget.textContent = issue?.summary ?? ''; e.currentTarget.blur(); } }}
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontSize: 22, fontWeight: 700, color: '#172B4D', lineHeight: 1.3,
          margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
          padding: '4px 6px', wordBreak: 'break-word', transition: 'background 0.15s, box-shadow 0.15s',
          background: titleFocused ? '#FFFFFF' : 'transparent',
          boxShadow: titleFocused ? '0 0 0 2px #4C9AFF' : 'none',
        }}
        onMouseEnter={e => { if (!titleFocused) e.currentTarget.style.background = '#F4F5F7'; }}
        onMouseLeave={e => { if (!titleFocused) e.currentTarget.style.background = 'transparent'; }}
      >{issue?.summary ?? '—'}</h1>

      {/* Description */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>Description</div>
        <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: 60 }}>
          {issue?.description_text || <span style={{ color: '#97A0AF', fontStyle: 'italic' }}>Add a description…</span>}
        </div>
      </div>

      {/* Impact / Acceptance Criteria section */}
      {issue?.acceptance_criteria && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>Impact / Root Cause</div>
          <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {issue.acceptance_criteria}
          </div>
        </div>
      )}

      {/* Activity */}
      <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20, marginTop: 8 }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
          {(['comments', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveActivityTab(tab)}
              style={{
                padding: '6px 12px', fontSize: 14, fontWeight: activeActivityTab === tab ? 700 : 400,
                color: activeActivityTab === tab ? '#172B4D' : '#5E6C84',
                background: 'none', border: 'none', borderBottom: activeActivityTab === tab ? '2px solid #0052CC' : '2px solid transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab === 'comments' ? <MessageSquare size={14} /> : <Clock size={14} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeActivityTab === 'comments' && (
          <div>
            {comments.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>}
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {c.author?.avatar_url ? (
                  <img src={c.author.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{getInitials(c.author?.full_name)}</div>
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

        {activeActivityTab === 'history' && (
          <div>
            {activityLog.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>}
            {activityLog.map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {entry.actor?.avatar_url ? (
                  <img src={entry.actor.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg>
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
                      <span style={{ color: '#97A0AF' }}>→</span>
                      <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  /* ── RIGHT SIDEBAR ──────────────────────── */
  const rightContent = (
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
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {showStatusDropdown && (
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', borderRadius: 4, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
            padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto',
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {STATUS_OPTION_GROUPS.map(group => (
              <div key={group.category}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4 }}>{group.groupLabel}</div>
                {group.statuses.map(st => {
                  const isActive = statusValue === st;
                  const cat = group.category as 'todo' | 'in_progress' | 'done';
                  const lozengeStyle = cat === 'done' ? { background: '#E3FCEF', color: '#006644' } : cat === 'in_progress' ? { background: '#DEEBFF', color: '#0747A6' } : { background: '#DFE1E6', color: '#253858' };
                  return (
                    <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); updateStatusMutation.mutate(st); }} style={{
                      height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ ...lozengeStyle, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{st}</span>
                      {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
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

        {/* Priority */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Priority</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
            <span style={{ color: priorityStyle.color, fontWeight: 700, fontSize: 14 }}>{priorityStyle.symbol}</span>
            <span style={{ fontSize: 14, color: '#172B4D' }}>{issue?.priority ?? 'Medium'}</span>
          </div>
        </div>

        {/* Assignee */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Assignee</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
            {issue?.assignee_display_name ? (
              <>
                {assigneeProfile?.avatar_url ? (
                  <img src={assigneeProfile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(issue.assignee_account_id ?? issue.assignee_display_name), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{getInitials(issue.assignee_display_name)}</span>
                )}
                <span style={{ fontSize: 14, color: '#172B4D' }}>{issue.assignee_display_name}</span>
              </>
            ) : <span style={{ color: '#42526E', fontSize: 14 }}>Unassigned</span>}
          </div>
        </div>

        {/* Reporter */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
            {issue?.reporter_display_name ? (
              <>
                {reporterProfile?.avatar_url ? (
                  <img src={reporterProfile.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{getInitials(issue.reporter_display_name)}</span>
                )}
                <span style={{ fontSize: 14, color: '#172B4D' }}>{issue.reporter_display_name}</span>
              </>
            ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
          </div>
        </div>

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

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw', animation: 'cv-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>This incident will be soft-deleted. It can be restored within 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); deleteIssueMutation.mutate(); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#DE350B', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <CatalystViewBase
      isOpen={isOpen}
      onClose={onClose}
      panelMode={panelMode}
      itemType={issue?.issue_type || 'Production Incident'}
      itemKey={issue?.issue_key || null}
      parentKey={issue?.parent_key}
      parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Clone incident', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete incident', onClick: () => setShowConfirmDelete(true), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode}
      navigationItems={navigationItems}
      currentItemId={itemId}
      onNavigate={onNavigate}
      leftContent={leftContent}
      rightContent={rightContent}
      isLoading={isLoading}
    />
  );
}
