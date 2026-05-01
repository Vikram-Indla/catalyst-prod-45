/**
 * EpicDetailDrawer — 560px right slide-in detail panel
 * Tabs: Details, Comments, History
 * No Points/Sprint. Includes Release (fix_versions), Comments, Changelog.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X, MessageSquare, History, FileText } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { getLozengeStyle, EPIC_STATUS_LOZENGE, getInitials } from '../../utils/backlog.utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface EpicDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  epicId: string | null;
  projectId: string;
}

const DETAIL_LABEL: React.CSSProperties = {
  width: 100, flexShrink: 0, fontSize: 11, fontWeight: 650,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ds-text-subtlest, #64748B)', lineHeight: '36px',
};
const DETAIL_VALUE: React.CSSProperties = { fontSize: 14, color: 'var(--fg-1, #0F172A)', fontWeight: 400 };

const STATUS_GROUPS = [
  { label: 'TO DO', statuses: ['Backlog', 'To Do'] },
  { label: 'IN PROGRESS', statuses: ['In Progress'] },
  { label: 'DONE', statuses: ['Done', 'Cancelled'] },
];

function getEpicStatusColors(status: string): { bg: string; text: string; label: string } {
  const cfg = EPIC_STATUS_LOZENGE[status];
  if (cfg) {
    const style = getLozengeStyle(cfg.color);
    return { ...style, label: cfg.label };
  }
  return { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E', label: status.replace(/_/g, ' ').toUpperCase() };
}

type TabId = 'details' | 'comments' | 'history';

const TAB_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, padding: '8px 12px', border: 'none', cursor: 'pointer',
  background: 'none', color: 'var(--ds-text-subtlest, #64748B)', borderBottom: '2px solid transparent',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};
const TAB_ACTIVE: React.CSSProperties = { ...TAB_STYLE, color: 'var(--fg-1, #0F172A)', borderBottomColor: 'var(--ds-text-brand, #2563EB)' };

function formatFixVersions(fv: any): string {
  if (!fv) return '—';
  try {
    const arr = Array.isArray(fv) ? fv : JSON.parse(fv);
    if (!arr.length) return '—';
    return arr.map((v: any) => (typeof v === 'string' ? v : v?.name || v?.id || '')).filter(Boolean).join(', ');
  } catch { return '—'; }
}

export const EpicDetailDrawer: React.FC<EpicDetailDrawerProps> = ({ isOpen, onClose, epicId, projectId }) => {
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: epic, isLoading, error } = useQuery({
    queryKey: ['epic-drawer-detail', epicId],
    queryFn: async () => {
      if (!epicId) return null;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_display_name, reporter_display_name, due_date, labels, fix_versions, jira_created_at, jira_updated_at, issue_type')
        .eq('id', epicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!epicId && isOpen,
  });

  // Jira sync fields from ph_work_items
  const { data: jiraSyncData } = useQuery({
    queryKey: ['epic-drawer-jira-sync', epic?.issue_key],
    queryFn: async () => {
      if (!epic?.issue_key) return null;
      const { data } = await (supabase.from('ph_work_items') as any)
        .select('jira_key, jira_sync_status, jira_pushed_at')
        .eq('item_key', epic.issue_key)
        .maybeSingle();
      return data as { jira_key: string | null; jira_sync_status: string | null; jira_pushed_at: string | null } | null;
    },
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['epic-drawer-comments', epic?.issue_key],
    queryFn: async () => {
      if (!epic?.issue_key) return [];
      const { data } = await supabase
        .from('jira_sync_comments')
        .select('id, author_display_name, body, jira_created_at')
        .eq('issue_key', epic.issue_key)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!epic?.issue_key && activeTab === 'comments',
  });

  const { data: changelog = [], isLoading: changelogLoading } = useQuery({
    queryKey: ['epic-drawer-changelog', epic?.issue_key],
    queryFn: async () => {
      if (!epic?.issue_key) return [];
      const { data } = await supabase
        .from('jira_sync_changelog')
        .select('id, author_display_name, field_name, from_string, to_string, jira_created_at')
        .eq('issue_key', epic.issue_key)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!epic?.issue_key && activeTab === 'history',
  });

  useEffect(() => {
    if (epic) {
      setTitleValue(epic.summary || '');
      setDescValue(epic.description_text || '');
    }
  }, [epic]);

  useEffect(() => {
    if (!isOpen) setActiveTab('details');
  }, [isOpen]);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!epicId) return;
      const updates: Record<string, any> = { [field]: value };
      if (field === 'status') {
        const done = ['Done', 'Closed', 'In Production', 'Released', 'Cancelled'];
        const inProgress = ['In Progress'];
        if (done.includes(value)) updates.status_category = 'Done';
        else if (inProgress.includes(value)) updates.status_category = 'In Progress';
        else updates.status_category = 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', epicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-drawer-detail', epicId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleUpdate = useCallback((field: string, value: any) => {
    updateMutation.mutate({ field, value });
  }, [updateMutation]);

  if (!epicId) return null;
  const statusColors = epic?.status ? getEpicStatusColors(epic.status) : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent style={{ width: 560, maxWidth: '100vw', padding: 0, background: 'var(--bg-app, #FFFFFF)' }} className="overflow-y-auto border-l">
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-app, #FFFFFF)', borderBottom: '0.75px solid rgba(15,23,42,0.06)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {epic ? (
            <>
              <JiraIssueTypeIcon type="epic" size={20} />
              <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{epic.issue_key}</span>
              <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #64748B)' }}>· Epic</span>
            </>
          ) : <div style={{ height: 20, width: 120, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />}
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="var(--ds-text-subtlest, #64748B)" /></button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 20px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
                <div style={{ width: 140, height: 14, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--ds-text-danger, #DC2626)' }}>Failed to load epic</p>
          </div>
        ) : epic ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ padding: '16px 20px 0' }}>
              {/* Status */}
              <div style={{ marginBottom: 12 }}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {statusColors && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" style={{ width: 220, padding: '4px 0', background: 'var(--bg-app, #FFFFFF)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999 }}>
                    {STATUS_GROUPS.map(group => (
                      <div key={group.label}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #94A3B8)', padding: '6px 12px 2px' }}>{group.label}</div>
                        {group.statuses.map(s => {
                          const sc = getEpicStatusColors(s);
                          return (
                            <button key={s} onClick={() => handleUpdate('status', s)} style={{
                              width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                              background: epic.status === s ? 'rgba(37,99,235,0.08)' : 'transparent', color: 'var(--fg-1, #0F172A)', cursor: 'pointer',
                            }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text }}>{sc.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Title */}
              {editingTitle ? (
                <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                  onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                  autoFocus style={{ width: '100%', fontSize: 20, fontWeight: 650, color: 'var(--fg-1, #0F172A)', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: 'var(--cp-font-heading)', marginBottom: 8 }}
                />
              ) : (
                <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 650, color: 'var(--fg-1, #0F172A)', margin: '0 0 8px', cursor: 'text', fontFamily: 'var(--cp-font-heading)', lineHeight: 1.3 }}>
                  {epic.summary || <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest, #94A3B8)' }}>Click to add a title...</span>}
                </h2>
              )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '0 20px', display: 'flex', gap: 0 }}>
              <button onClick={() => setActiveTab('details')} style={activeTab === 'details' ? TAB_ACTIVE : TAB_STYLE}><FileText size={14} /> Details</button>
              <button onClick={() => setActiveTab('comments')} style={activeTab === 'comments' ? TAB_ACTIVE : TAB_STYLE}><MessageSquare size={14} /> Comments</button>
              <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? TAB_ACTIVE : TAB_STYLE}><History size={14} /> History</button>
            </div>

            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #64748B)', marginBottom: 6 }}>Description</div>
                    {editingDesc ? (
                      <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                        onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                        autoFocus rows={4}
                        style={{ width: '100%', border: '1.5px solid #2563EB', borderRadius: 4, padding: 8, fontSize: 14, color: 'var(--fg-1, #0F172A)', fontFamily: 'var(--cp-font-body)', outline: 'none', resize: 'vertical', minHeight: 80 }}
                      />
                    ) : (
                      <div onClick={() => setEditingDesc(true)} style={{
                        fontSize: 14, color: epic.description_text ? 'var(--ds-text-subtle, #334155)' : 'var(--ds-text-subtlest, #94A3B8)',
                        fontStyle: epic.description_text ? 'normal' : 'italic', cursor: 'text', minHeight: 20, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                      }}>
                        {epic.description_text || 'Click to add description...'}
                      </div>
                    )}
                  </div>

                  <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #64748B)', marginBottom: 4 }}>Key Details</div>

                    <DetailRow label="Status">
                      {statusColors && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>}
                    </DetailRow>
                    <DetailRow label="Priority"><span style={DETAIL_VALUE}>{epic.priority || '—'}</span></DetailRow>
                    <DetailRow label="Assignee">
                      {epic.assignee_display_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--ds-text-subtlest, #64748B)', flexShrink: 0 }}>{getInitials(epic.assignee_display_name)}</div>
                          <span style={DETAIL_VALUE}>{epic.assignee_display_name}</span>
                        </div>
                      ) : <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, #94A3B8)', fontStyle: 'italic' }}>— Set assignee</span>}
                    </DetailRow>
                    <DetailRow label="Reporter">
                      {epic.reporter_display_name ? <span style={DETAIL_VALUE}>{epic.reporter_display_name}</span> : <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest, #94A3B8)', fontStyle: 'italic' }}>— Set reporter</span>}
                    </DetailRow>
                    <DetailRow label="Due Date">
                      <span style={{ ...DETAIL_VALUE, fontFamily: 'var(--cp-font-mono)', fontSize: 13, color: epic.due_date ? 'var(--fg-1, #0F172A)' : 'var(--ds-text-subtlest, #94A3B8)' }}>
                        {epic.due_date ? format(new Date(epic.due_date), 'MMM d, yyyy') : '— Set date'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Release">
                      <span style={{ ...DETAIL_VALUE, color: formatFixVersions(epic.fix_versions) !== '—' ? 'var(--fg-1, #0F172A)' : 'var(--ds-text-subtlest, #94A3B8)' }}>
                        {formatFixVersions(epic.fix_versions)}
                      </span>
                    </DetailRow>
                    <DetailRow label="Created">
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #334155)', fontFamily: 'var(--cp-font-mono)' }}>
                        {epic.jira_created_at ? format(new Date(epic.jira_created_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>
                    <DetailRow label="Updated">
                      <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #334155)', fontFamily: 'var(--cp-font-mono)' }}>
                        {epic.jira_updated_at ? format(new Date(epic.jira_updated_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>
                  </div>

                  {jiraSyncData?.jira_key && (
                    <div style={{ borderTop: '0.75px solid var(--bd-default, #E2E8F0)', paddingTop: 16, marginTop: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #64748B)', marginBottom: 12 }}>Jira Sync</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Jira Issue</span>
                          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'var(--ds-surface-sunken, #F1F5F9)', color: '#1E293B' }}>{jiraSyncData.jira_key}</span>
                        </div>
                        {jiraSyncData.jira_sync_status && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Sync Status</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4,
                              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                              backgroundColor: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#E3FCEF' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#DEEBFF' : 'var(--ds-border, #DFE1E6)',
                              color: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#006644' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#0747A6' : 'var(--ds-text, #253858)',
                            }}>{jiraSyncData.jira_sync_status}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Last Synced</span>
                          <span style={{ fontSize: 12, color: 'var(--ds-text-subtle, #334155)', fontFamily: 'var(--cp-font-mono)' }}>
                            {jiraSyncData.jira_pushed_at ? format(new Date(jiraSyncData.jira_pushed_at), 'MMM d, yyyy, hh:mm a') : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'comments' && <CommentsPane comments={comments} isLoading={commentsLoading} />}
              {activeTab === 'history' && <HistoryPane changelog={changelog} isLoading={changelogLoading} getStatusColors={getEpicStatusColors} />}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 50, gap: 12 }}>
      <span style={DETAIL_LABEL}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 50 }}>{children}</div>
    </div>
  );
}

function CommentsPane({ comments, isLoading }: { comments: any[]; isLoading: boolean }) {
  if (isLoading) return <SkeletonList count={3} />;
  if (!comments.length) return <EmptyState text="No comments from Jira" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {comments.map((c: any) => (
        <div key={c.id} style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--ds-text-subtlest, #64748B)', flexShrink: 0 }}>{getInitials(c.author_display_name || 'U')}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{c.author_display_name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #94A3B8)', marginLeft: 'auto' }}>{c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ds-text-subtle, #334155)', lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 32 }}>{c.body || ''}</div>
        </div>
      ))}
    </div>
  );
}

function HistoryPane({ changelog, isLoading, getStatusColors }: { changelog: any[]; isLoading: boolean; getStatusColors: (s: string) => { bg: string; text: string; label: string } }) {
  if (isLoading) return <SkeletonList count={4} />;
  if (!changelog.length) return <EmptyState text="No history from Jira" />;

  const statusChanges = changelog.filter((c: any) => c.field_name === 'status');
  const otherChanges = changelog.filter((c: any) => c.field_name !== 'status');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {statusChanges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #64748B)', marginBottom: 8 }}>Status Transitions ({statusChanges.length})</div>
          {statusChanges.map((entry: any) => {
            const fromColors = getStatusColors(entry.from_string || '');
            const toColors = getStatusColors(entry.to_string || '');
            return (
              <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '0.75px solid rgba(15,23,42,0.04)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--ds-text-subtlest, #64748B)', flexShrink: 0, marginTop: 2 }}>{getInitials(entry.author_display_name || 'S')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{entry.author_display_name || 'System'}</span>
                    <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #94A3B8)' }}>{entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: fromColors.bg, color: fromColors.text }}>{fromColors.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #94A3B8)' }}>→</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: toColors.bg, color: toColors.text }}>{toColors.label}</span>
                  </div>
                  {entry.jira_created_at && <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #94A3B8)', marginTop: 2, fontFamily: 'var(--cp-font-mono)' }}>{format(new Date(entry.jira_created_at), 'MMM d, yyyy, hh:mm a')}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {otherChanges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ds-text-subtlest, #64748B)', marginBottom: 8 }}>Other Changes ({otherChanges.length})</div>
          {otherChanges.map((entry: any) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '0.75px solid rgba(15,23,42,0.04)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--ds-text-subtlest, #64748B)', flexShrink: 0 }}>{getInitials(entry.author_display_name || 'S')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{entry.author_display_name || 'System'}</span>
                  <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #94A3B8)' }}>{entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ds-text-subtlest, #64748B)' }}>
                  Changed <strong style={{ color: 'var(--fg-1, #0F172A)', fontWeight: 600 }}>{entry.field_name}</strong>
                  {entry.from_string && <> from <span style={{ color: 'var(--ds-text-subtlest, #94A3B8)' }}>{entry.from_string}</span></>}
                  {entry.to_string && <> to <span style={{ color: 'var(--fg-1, #0F172A)' }}>{entry.to_string}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div>{Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: '60%', borderRadius: 4, background: 'var(--bd-default, #E2E8F0)', marginBottom: 6 }} />
          <div style={{ height: 10, width: '40%', borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
        </div>
      </div>
    ))}</div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--ds-text-subtlest, #94A3B8)' }}>{text}</div>;
}
