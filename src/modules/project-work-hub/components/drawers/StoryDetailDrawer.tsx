/**
 * StoryDetailDrawer — 560px right slide-in detail panel
 * Tabs: Details, Comments, History
 * No Points/Sprint. Includes Release (fix_versions), Comments, Changelog.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { X, MessageSquare, History, FileText } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ParentEpicChip } from '../shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, getPriorityLabel, getPriorityColor, getInitials } from '../../utils/backlog.utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface StoryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string | null;
  projectId: string;
}

const DETAIL_LABEL: React.CSSProperties = {
  width: 100, flexShrink: 0, fontSize: 11, fontWeight: 650,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', lineHeight: '36px',
};
const DETAIL_VALUE: React.CSSProperties = { fontSize: 14, color: 'var(--fg-1, #0F172A)', fontWeight: 400 };

const STATUS_GROUPS = [
  { label: 'TO DO', statuses: ['Backlog', 'In Requirements', 'In Design', 'Ready for Development', 'To Do'] },
  { label: 'IN PROGRESS', statuses: ['In Development', 'In QA', 'In UAT', 'BETA READY', 'In BETA', 'In Progress', 'In Review'] },
  { label: 'DONE', statuses: ['In Production', 'Done'] },
];

function getStatusLozengeColors(status: string): { bg: string; text: string; label: string } {
  const cfg = STORY_STATUS_LOZENGE[status];
  if (cfg) {
    const style = getLozengeStyle(cfg.color);
    return { ...style, label: cfg.label };
  }
  return { bg: '#DFE1E6', text: '#42526E', label: status.replace(/_/g, ' ').toUpperCase() };
}

type TabId = 'details' | 'comments' | 'history';

const TAB_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, padding: '8px 12px', border: 'none', cursor: 'pointer',
  background: 'none', color: '#64748B', borderBottom: '2px solid transparent',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};
const TAB_ACTIVE: React.CSSProperties = { ...TAB_STYLE, color: 'var(--fg-1, #0F172A)', borderBottomColor: '#2563EB' };

function formatFixVersions(fv: any): string {
  if (!fv) return '—';
  try {
    const arr = Array.isArray(fv) ? fv : JSON.parse(fv);
    if (!arr.length) return '—';
    return arr.map((v: any) => (typeof v === 'string' ? v : v?.name || v?.id || '')).filter(Boolean).join(', ');
  } catch { return '—'; }
}

export const StoryDetailDrawer: React.FC<StoryDetailDrawerProps> = ({ isOpen, onClose, storyId, projectId }) => {
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('details');

  // Main query
  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story-drawer-detail', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_display_name, reporter_display_name, due_date, labels, parent_key, parent_summary, fix_versions, jira_created_at, jira_updated_at, issue_type')
        .eq('id', storyId)
        .single();
      if (error) throw error;

      let parentEpic: { id: string; epic_key: string | null; name: string } | null = null;
      if (data.parent_key) {
        const { data: epic } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary')
          .eq('issue_key', data.parent_key)
          .single();
        if (epic) parentEpic = { id: epic.id, epic_key: epic.issue_key, name: epic.summary };
      }
      return { ...data, parentEpic };
    },
    enabled: !!storyId && isOpen,
  });

  // Jira sync fields from ph_work_items
  const { data: jiraSyncData } = useQuery({
    queryKey: ['story-drawer-jira-sync', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return null;
      const { data } = await (supabase.from('ph_work_items') as any)
        .select('jira_key, jira_sync_status, jira_pushed_at')
        .eq('item_key', story.issue_key)
        .maybeSingle();
      return data as { jira_key: string | null; jira_sync_status: string | null; jira_pushed_at: string | null } | null;
    },
  });

  // Comments query
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['story-drawer-comments', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return [];
      const { data } = await supabase
        .from('jira_sync_comments')
        .select('id, author_display_name, body, jira_created_at')
        .eq('issue_key', story.issue_key)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!story?.issue_key && activeTab === 'comments',
  });

  // Changelog (history) query
  const { data: changelog = [], isLoading: changelogLoading } = useQuery({
    queryKey: ['story-drawer-changelog', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return [];
      const { data } = await supabase
        .from('jira_sync_changelog')
        .select('id, author_display_name, field_name, from_string, to_string, jira_created_at')
        .eq('issue_key', story.issue_key)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: !!story?.issue_key && activeTab === 'history',
  });

  useEffect(() => {
    if (story) {
      setTitleValue(story.summary || '');
      setDescValue(story.description_text || '');
    }
  }, [story]);

  // Reset tab when drawer closes
  useEffect(() => {
    if (!isOpen) setActiveTab('details');
  }, [isOpen]);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      if (!storyId) return;
      const updates: Record<string, any> = { [field]: value };
      if (field === 'status') {
        const done = ['Done', 'In Production', 'Closed', 'Released'];
        const inProgress = ['In Progress', 'In Development', 'In QA', 'In UAT', 'In BETA', 'BETA READY', 'In Review', 'Ready for QA'];
        if (done.includes(value)) updates.status_category = 'Done';
        else if (inProgress.includes(value)) updates.status_category = 'In Progress';
        else updates.status_category = 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-drawer-detail', storyId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleUpdate = useCallback((field: string, value: any) => {
    updateMutation.mutate({ field, value });
  }, [updateMutation]);

  if (!storyId) return null;

  const statusColors = story?.status ? getStatusLozengeColors(story.status) : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        style={{ width: 560, maxWidth: '100vw', padding: 0, background: 'var(--bg-app, #FFFFFF)' }}
        className="overflow-y-auto border-l"
      >
        {/* Sticky Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-app, #FFFFFF)',
          borderBottom: '0.75px solid rgba(15,23,42,0.06)',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {story ? (
            <>
              <JiraIssueTypeIcon type={story.issue_type || 'story'} size={20} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{story.issue_key}</span>
              <span style={{ fontSize: 13, color: '#64748B' }}>· {story.issue_type || 'Story'}</span>
            </>
          ) : (
            <div style={{ height: 20, width: 120, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
          )}
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="#64748B" />
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px 20px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 100, height: 14, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
                <div style={{ width: 140, height: 14, borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#DC2626' }}>Failed to load work item</p>
            <button onClick={onClose} style={{ marginTop: 12, fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : story ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Title + Status + Description (always visible) */}
            <div style={{ padding: '16px 20px 0' }}>
              {/* Status lozenge (clickable) */}
              <div style={{ marginBottom: 12 }}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {statusColors && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
                          borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text,
                        }}>
                          {statusColors.label}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" style={{ width: 220, padding: '4px 0', background: 'var(--bg-app, #FFFFFF)', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999, maxHeight: 320, overflowY: 'auto' }}>
                    {STATUS_GROUPS.map(group => (
                      <div key={group.label}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3, #94A3B8)', padding: '6px 12px 2px' }}>{group.label}</div>
                        {group.statuses.map(s => {
                          const sc = getStatusLozengeColors(s);
                          return (
                            <button key={s} onClick={() => handleUpdate('status', s)} style={{
                              width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                              background: story.status === s ? 'rgba(37,99,235,0.08)' : 'transparent',
                              color: 'var(--fg-1, #0F172A)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
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
                  autoFocus
                  style={{ width: '100%', fontSize: 20, fontWeight: 650, color: 'var(--fg-1, #0F172A)', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 8 }}
                />
              ) : (
                <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 650, color: 'var(--fg-1, #0F172A)', margin: '0 0 8px', cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                  {story.summary || <span style={{ fontStyle: 'italic', color: 'var(--fg-3, #94A3B8)' }}>Click to add a title...</span>}
                </h2>
              )}

              {/* Parent Epic Chip */}
              {story.parentEpic && (
                <div style={{ marginBottom: 12 }}>
                  <ParentEpicChip epicId={story.parentEpic.id} epicKey={story.parentEpic.epic_key} epicName={story.parentEpic.name} />
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '0 20px', display: 'flex', gap: 0 }}>
              <button onClick={() => setActiveTab('details')} style={activeTab === 'details' ? TAB_ACTIVE : TAB_STYLE}>
                <FileText size={14} /> Details
              </button>
              <button onClick={() => setActiveTab('comments')} style={activeTab === 'comments' ? TAB_ACTIVE : TAB_STYLE}>
                <MessageSquare size={14} /> Comments {comments.length > 0 && `(${comments.length})`}
              </button>
              <button onClick={() => setActiveTab('history')} style={activeTab === 'history' ? TAB_ACTIVE : TAB_STYLE}>
                <History size={14} /> History {changelog.length > 0 && `(${changelog.length})`}
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 6 }}>Description</div>
                    {editingDesc ? (
                      <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                        onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                        autoFocus rows={4}
                        style={{ width: '100%', border: '1.5px solid #2563EB', borderRadius: 4, padding: 8, fontSize: 14, color: 'var(--fg-1, #0F172A)', fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', minHeight: 80 }}
                      />
                    ) : (
                      <div onClick={() => setEditingDesc(true)} style={{
                        fontSize: 14, color: story.description_text ? '#334155' : 'var(--fg-3, #94A3B8)',
                        fontStyle: story.description_text ? 'normal' : 'italic',
                        cursor: 'text', minHeight: 20, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                      }}>
                        {story.description_text || 'Click to add description...'}
                      </div>
                    )}
                  </div>

                  {/* Key Details */}
                  <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 4 }}>Key Details</div>

                    {/* Status */}
                    <DetailRow label="Status">
                      {statusColors && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>
                      )}
                    </DetailRow>

                    {/* Priority */}
                    <DetailRow label="Priority">
                      <span style={{ ...DETAIL_VALUE, color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
                    </DetailRow>

                    {/* Assignee */}
                    <DetailRow label="Assignee">
                      {story.assignee_display_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                            {getInitials(story.assignee_display_name)}
                          </div>
                          <span style={DETAIL_VALUE}>{story.assignee_display_name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 14, color: 'var(--fg-3, #94A3B8)', fontStyle: 'italic' }}>— Set assignee</span>
                      )}
                    </DetailRow>

                    {/* Reporter */}
                    <DetailRow label="Reporter">
                      {story.reporter_display_name ? (
                        <span style={DETAIL_VALUE}>{story.reporter_display_name}</span>
                      ) : (
                        <span style={{ fontSize: 14, color: 'var(--fg-3, #94A3B8)', fontStyle: 'italic' }}>— Set reporter</span>
                      )}
                    </DetailRow>

                    {/* Due Date */}
                    <DetailRow label="Due Date">
                      <span style={{ ...DETAIL_VALUE, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: story.due_date ? 'var(--fg-1, #0F172A)' : 'var(--fg-3, #94A3B8)' }}>
                        {story.due_date ? format(new Date(story.due_date), 'MMM d, yyyy') : '— Set date'}
                      </span>
                    </DetailRow>

                    {/* Release (fix_versions) */}
                    <DetailRow label="Release">
                      <span style={{ ...DETAIL_VALUE, color: formatFixVersions(story.fix_versions) !== '—' ? 'var(--fg-1, #0F172A)' : 'var(--fg-3, #94A3B8)' }}>
                        {formatFixVersions(story.fix_versions)}
                      </span>
                    </DetailRow>

                    {/* Created */}
                    <DetailRow label="Created">
                      <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                        {story.jira_created_at ? format(new Date(story.jira_created_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>

                    {/* Updated */}
                    <DetailRow label="Updated">
                      <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                        {story.jira_updated_at ? format(new Date(story.jira_updated_at), 'MMM d, yyyy, hh:mm a') : '—'}
                      </span>
                    </DetailRow>
                  </div>

                  {/* Jira Sync Status */}
                  {jiraSyncData?.jira_key && (
                    <div style={{ borderTop: '0.75px solid var(--bd-default, #E2E8F0)', paddingTop: 16, marginTop: 16 }} className="dark:!border-[#1A1A1A]">
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 12 }}>Jira Sync</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Jira Issue</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: '2px 8px', borderRadius: 4, background: var(--bg-2, '#F1F5F9'), color: '#1E293B' }}>{jiraSyncData.jira_key}</span>
                        </div>
                        {jiraSyncData.jira_sync_status && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Sync Status</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4,
                              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                              backgroundColor: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? 'var(--status-ok-bg, #E3FCEF)' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#DEEBFF' : '#DFE1E6',
                              color: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#006644' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#0747A6' : '#253858',
                            }}>{jiraSyncData.jira_sync_status}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Last Synced</span>
                          <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                            {jiraSyncData.jira_pushed_at ? format(new Date(jiraSyncData.jira_pushed_at), 'MMM d, yyyy, hh:mm a') : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'comments' && (
                <CommentsPane comments={comments} isLoading={commentsLoading} />
              )}

              {activeTab === 'history' && (
                <HistoryPane changelog={changelog} isLoading={changelogLoading} />
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};

/* Reusable detail row */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 50, gap: 12 }}>
      <span style={DETAIL_LABEL}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 50 }}>{children}</div>
    </div>
  );
}

/* Comments pane */
function CommentsPane({ comments, isLoading }: { comments: any[]; isLoading: boolean }) {
  if (isLoading) return <SkeletonList count={3} />;
  if (!comments.length) return <EmptyState text="No comments from Jira" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {comments.map((c: any) => (
        <div key={c.id} style={{ borderBottom: '0.75px solid rgba(15,23,42,0.06)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
              {getInitials(c.author_display_name || 'U')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{c.author_display_name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: 'var(--fg-3, #94A3B8)', marginLeft: 'auto' }}>
              {c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 32 }}>
            {c.body || ''}
          </div>
        </div>
      ))}
    </div>
  );
}

/* History/Changelog pane — shows status transitions with who + when */
function HistoryPane({ changelog, isLoading }: { changelog: any[]; isLoading: boolean }) {
  if (isLoading) return <SkeletonList count={4} />;
  if (!changelog.length) return <EmptyState text="No history from Jira" />;

  // Group by status transitions specifically
  const statusChanges = changelog.filter((c: any) => c.field_name === 'status');
  const otherChanges = changelog.filter((c: any) => c.field_name !== 'status');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Status Transitions Section */}
      {statusChanges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>
            Status Transitions ({statusChanges.length})
          </div>
          {statusChanges.map((entry: any) => {
            const fromColors = getStatusLozengeColors(entry.from_string || '');
            const toColors = getStatusLozengeColors(entry.to_string || '');
            return (
              <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '0.75px solid rgba(15,23,42,0.04)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0, marginTop: 2 }}>
                  {getInitials(entry.author_display_name || 'S')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{entry.author_display_name || 'System'}</span>
                    <span style={{ fontSize: 11, color: 'var(--fg-3, #94A3B8)' }}>
                      {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: fromColors.bg, color: fromColors.text }}>
                      {fromColors.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--fg-3, #94A3B8)' }}>→</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: toColors.bg, color: toColors.text }}>
                      {toColors.label}
                    </span>
                  </div>
                  {entry.jira_created_at && (
                    <div style={{ fontSize: 11, color: 'var(--fg-3, #94A3B8)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {format(new Date(entry.jira_created_at), 'MMM d, yyyy, hh:mm a')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Other field changes */}
      {otherChanges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>
            Other Changes ({otherChanges.length})
          </div>
          {otherChanges.map((entry: any) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '0.75px solid rgba(15,23,42,0.04)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                {getInitials(entry.author_display_name || 'S')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1, #0F172A)' }}>{entry.author_display_name || 'System'}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3, #94A3B8)' }}>
                    {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  Changed <strong style={{ color: 'var(--fg-1, #0F172A)', fontWeight: 600 }}>{entry.field_name}</strong>
                  {entry.from_string && <> from <span style={{ color: 'var(--fg-3, #94A3B8)' }}>{entry.from_string}</span></>}
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
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bd-default, #E2E8F0)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, width: '60%', borderRadius: 4, background: 'var(--bd-default, #E2E8F0)', marginBottom: 6 }} />
            <div style={{ height: 10, width: '40%', borderRadius: 4, background: 'var(--bd-default, #E2E8F0)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--fg-3, #94A3B8)' }}>{text}</div>;
}
