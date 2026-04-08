/**
 * StoryDetailView — Full-page two-panel Jira-style detail view
 * Left panel: Description + Comments + History (tabs)
 * Right panel: Key details sidebar
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, ArrowRight, MessageSquare, History, FileText, Eye, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

interface StoryDetailViewProps {
  projectId: string;
  projectKey: string;
  itemId: string;
}

const STATUS_GROUPS = [
  { label: 'TO DO', statuses: ['Backlog', 'In Requirements', 'In Design', 'Ready for Development', 'To Do'] },
  { label: 'IN PROGRESS', statuses: ['In Development', 'In QA', 'In UAT', 'BETA READY', 'In BETA', 'In Progress', 'In Review'] },
  { label: 'DONE', statuses: ['In Production', 'Done'] },
];

const WORKFLOW_TRANSITIONS: Record<string, { label: string; target: string }[]> = {
  'In Requirements': [{ label: 'Design', target: 'In Design' }, { label: 'dev', target: 'Ready for Development' }, { label: 'TV', target: 'Technical Validation' }],
  'In Design': [{ label: 'req', target: 'In Requirements' }, { label: 'dev', target: 'Ready for Development' }],
  'Ready for Development': [{ label: 'dev', target: 'In Development' }, { label: 'req', target: 'In Requirements' }],
  'Technical Validation': [{ label: 'req', target: 'In Requirements' }, { label: 'dev', target: 'Ready for Development' }],
  'In Development': [{ label: 'QA', target: 'In QA' }, { label: 'hold', target: 'On Hold' }, { label: 'req', target: 'In Requirements' }],
  'On Hold': [{ label: 'dev', target: 'In Development' }, { label: 'req', target: 'In Requirements' }],
  'In QA': [{ label: 'dev', target: 'In Development' }, { label: 'INT', target: 'In Entity Integration' }, { label: 'UAT', target: 'In UAT' }],
  'In Entity Integration': [{ label: 'QA', target: 'In QA' }, { label: 'UAT', target: 'In UAT' }],
  'In UAT': [{ label: 'BETA', target: 'In BETA' }, { label: 'QA', target: 'In QA' }, { label: 'prod', target: 'In Production' }],
  'In BETA': [{ label: 'E2E', target: 'End to End Testing' }, { label: 'UAT', target: 'In UAT' }, { label: 'prod ready', target: 'Production Ready' }, { label: 'prod', target: 'In Production' }],
  'End to End Testing': [{ label: 'prod ready', target: 'Production Ready' }, { label: 'BETA', target: 'In BETA' }, { label: 'beta ready', target: 'Beta Ready' }],
  'Production Ready': [{ label: 'prod', target: 'In Production' }, { label: 'E2E', target: 'End to End Testing' }],
  'Beta Ready': [{ label: 'prod', target: 'In Production' }, { label: 'E2E', target: 'End to End Testing' }],
  'In Production': [],
};

const WORKFLOW_NODES = [
  { id: 'In Requirements', category: 'todo' }, { id: 'In Design', category: 'todo' },
  { id: 'Ready for Development', category: 'todo' }, { id: 'Technical Validation', category: 'todo' },
  { id: 'In Development', category: 'in_progress' }, { id: 'On Hold', category: 'in_progress' },
  { id: 'In QA', category: 'in_progress' }, { id: 'In Entity Integration', category: 'in_progress' },
  { id: 'In UAT', category: 'in_progress' }, { id: 'In BETA', category: 'in_progress' },
  { id: 'End to End Testing', category: 'in_progress' },
  { id: 'Production Ready', category: 'done' }, { id: 'Beta Ready', category: 'done' },
  { id: 'In Production', category: 'done' },
];

function getStatusCategory(status: string): string {
  return WORKFLOW_NODES.find(n => n.id === status)?.category || 'todo';
}

function getStatusLozengeColor(category: string): string {
  if (category === 'done') return '#1B7F37';
  if (category === 'in_progress') return '#0C66E4';
  return '#A5ADBA';
}

function getStatusLozengeColors(status: string): { bg: string; text: string; label: string } {
  const cfg = STORY_STATUS_LOZENGE[status];
  if (cfg) {
    const style = getLozengeStyle(cfg.color);
    return { ...style, label: cfg.label };
  }
  return { bg: '#DFE1E6', text: '#42526E', label: status.replace(/_/g, ' ').toUpperCase() };
}

function formatFixVersions(fv: any): string {
  if (!fv) return '—';
  try {
    const arr = Array.isArray(fv) ? fv : JSON.parse(fv);
    if (!arr.length) return '—';
    return arr.map((v: any) => (typeof v === 'string' ? v : v?.name || v?.id || '')).filter(Boolean).join(', ');
  } catch { return '—'; }
}

type TabId = 'details' | 'comments' | 'history';

export default function StoryDetailView({ projectId, projectKey, itemId }: StoryDetailViewProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('details');

  const { data: story, isLoading, error } = useQuery({
    queryKey: ['story-detail-view', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_display_name, reporter_display_name, due_date, labels, parent_key, parent_summary, fix_versions, jira_created_at, jira_updated_at, issue_type')
        .eq('id', itemId)
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
    enabled: !!itemId,
  });

  const { data: jiraSyncData } = useQuery({
    queryKey: ['story-detail-jira-sync', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return null;
      const { data } = await (supabase.from('ph_work_items') as any)
        .select('jira_key, jira_sync_status, jira_pushed_at')
        .eq('item_key', story.issue_key)
        .maybeSingle();
      return data as { jira_key: string | null; jira_sync_status: string | null; jira_pushed_at: string | null } | null;
    },
    enabled: !!story?.issue_key,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['story-detail-comments', story?.issue_key],
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

  const { data: changelog = [], isLoading: changelogLoading } = useQuery({
    queryKey: ['story-detail-changelog', story?.issue_key],
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

  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const updates: Record<string, any> = { [field]: value };
      if (field === 'status') {
        const done = ['Done', 'In Production', 'Closed', 'Released'];
        const inProgress = ['In Progress', 'In Development', 'In QA', 'In UAT', 'In BETA', 'BETA READY', 'In Review', 'Ready for QA'];
        if (done.includes(value)) updates.status_category = 'Done';
        else if (inProgress.includes(value)) updates.status_category = 'In Progress';
        else updates.status_category = 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail-view', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleUpdate = useCallback((field: string, value: any) => {
    updateMutation.mutate({ field, value });
  }, [updateMutation]);

  const statusColors = story?.status ? getStatusLozengeColors(story.status) : null;

  const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.06em', color: tk.t2, marginBottom: 4 };
  const VAL: React.CSSProperties = { fontSize: 14, color: tk.t1, fontWeight: 400 };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: tk.pageBg }}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div style={{ width: 200, height: 20, borderRadius: 4, background: tk.chipBg }} />
          <div style={{ width: 140, height: 14, borderRadius: 4, background: tk.chipBg }} />
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: tk.pageBg }}>
        <p style={{ fontSize: 14, color: '#DC2626' }}>Failed to load story</p>
        <button onClick={() => navigate(`/project-hub/${projectKey}/story-backlog`)} style={{ fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to backlog</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 h-[48px] border-b flex-shrink-0" style={{ borderColor: tk.border }}>
        <button
          onClick={() => navigate(`/project-hub/${projectKey}/story-backlog`)}
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tk.t2 }}
          onMouseEnter={e => (e.currentTarget.style.background = tk.hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = '')}
        >
          <ChevronLeft className="h-4 w-4" /> Story Backlog
        </button>
        <span style={{ color: tk.t3, fontSize: 12 }}>/</span>
        <JiraIssueTypeIcon type={story.issue_type || 'story'} size={16} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: tk.t1 }}>{story.issue_key}</span>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — main content */}
        <div className="flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
          <div style={{ maxWidth: 800, padding: '24px 32px' }}>
            {/* Status moved to sidebar — no status button here */}

            {/* Title */}
            {editingTitle ? (
              <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
                style={{ width: '100%', fontSize: 24, fontWeight: 650, color: tk.t1, border: `1.5px solid #2563EB`, borderRadius: 4, padding: '6px 10px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 12, background: 'transparent' }}
              />
            ) : (
              <h1 onClick={() => setEditingTitle(true)} style={{ fontSize: 24, fontWeight: 650, color: tk.t1, margin: '0 0 12px', cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                {story.summary || <span style={{ fontStyle: 'italic', color: tk.t3 }}>Click to add a title...</span>}
              </h1>
            )}

            {/* Parent */}
            {story.parentEpic && (
              <div style={{ marginBottom: 16 }}>
                <ParentEpicChip epicId={story.parentEpic.id} epicKey={story.parentEpic.epic_key} epicName={story.parentEpic.name} />
              </div>
            )}

            {/* Tabs */}
            <div style={{ borderBottom: `1px solid ${tk.border}`, display: 'flex', gap: 0, marginBottom: 20 }}>
              {(['details', 'comments', 'history'] as TabId[]).map(tab => {
                const isActive = activeTab === tab;
                const icons = { details: <FileText size={14} />, comments: <MessageSquare size={14} />, history: <History size={14} /> };
                const labels = { details: 'Details', comments: `Comments${comments.length > 0 ? ` (${comments.length})` : ''}`, history: `History${changelog.length > 0 ? ` (${changelog.length})` : ''}` };
                return (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    fontSize: 12, fontWeight: 600, padding: '8px 12px', border: 'none', cursor: 'pointer',
                    background: 'none', color: isActive ? tk.t1 : tk.t2,
                    borderBottom: `2px solid ${isActive ? '#2563EB' : 'transparent'}`,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {icons[tab]} {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            {activeTab === 'details' && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...LABEL, marginBottom: 6 }}>Description</div>
                  {editingDesc ? (
                    <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                      onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                      autoFocus rows={6}
                      style={{ width: '100%', border: `1.5px solid #2563EB`, borderRadius: 4, padding: 10, fontSize: 14, color: tk.t1, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', minHeight: 120, background: 'transparent' }}
                    />
                  ) : (
                    <div onClick={() => setEditingDesc(true)} style={{
                      fontSize: 14, color: story.description_text ? tk.t1 : tk.t3,
                      fontStyle: story.description_text ? 'normal' : 'italic',
                      cursor: 'text', minHeight: 40, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {story.description_text || 'Click to add description...'}
                    </div>
                  )}
                </div>

                {/* Labels */}
                {story.labels && Array.isArray(story.labels) && story.labels.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={LABEL}>Labels</div>
                    <div className="flex flex-wrap gap-1.5">
                      {story.labels.map((l: string) => (
                        <span key={l} style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 3, fontSize: 11, fontWeight: 600, background: tk.chipBg, color: tk.t2 }}>{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'comments' && (
              <CommentsPane comments={comments} isLoading={commentsLoading} tk={tk} />
            )}
            {activeTab === 'history' && (
              <HistoryPane changelog={changelog} isLoading={changelogLoading} tk={tk} />
            )}
          </div>
        </div>

        {/* Right panel — details sidebar */}
        <div className="w-[320px] flex-shrink-0 border-l overflow-y-auto" style={{ borderColor: tk.border, background: isDark ? '#111111' : '#F8FAFC' }}>
          <div style={{ padding: '20px 20px' }}>
            <div style={{ ...LABEL, marginBottom: 12 }}>Key Details</div>

            <SidebarField label="Status" tk={tk}>
              {statusColors && (
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>
              )}
            </SidebarField>

            <SidebarField label="Priority" tk={tk}>
              <span style={{ ...VAL, color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
            </SidebarField>

            <SidebarField label="Assignee" tk={tk}>
              {story.assignee_display_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>
                    {getInitials(story.assignee_display_name)}
                  </div>
                  <span style={VAL}>{story.assignee_display_name}</span>
                </div>
              ) : (
                <span style={{ fontSize: 14, color: tk.t3, fontStyle: 'italic' }}>Unassigned</span>
              )}
            </SidebarField>

            <SidebarField label="Reporter" tk={tk}>
              <span style={{ ...VAL, color: story.reporter_display_name ? tk.t1 : tk.t3, fontStyle: story.reporter_display_name ? 'normal' : 'italic' }}>
                {story.reporter_display_name || '—'}
              </span>
            </SidebarField>

            <SidebarField label="Due Date" tk={tk}>
              <span style={{ ...VAL, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: story.due_date ? tk.t1 : tk.t3 }}>
                {story.due_date ? format(new Date(story.due_date), 'MMM d, yyyy') : '—'}
              </span>
            </SidebarField>

            <SidebarField label="Release" tk={tk}>
              <span style={{ ...VAL, color: formatFixVersions(story.fix_versions) !== '—' ? tk.t1 : tk.t3 }}>
                {formatFixVersions(story.fix_versions)}
              </span>
            </SidebarField>

            <SidebarField label="Created" tk={tk}>
              <span style={{ fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                {story.jira_created_at ? format(new Date(story.jira_created_at), 'MMM d, yyyy') : '—'}
              </span>
            </SidebarField>

            <SidebarField label="Updated" tk={tk}>
              <span style={{ fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                {story.jira_updated_at ? format(new Date(story.jira_updated_at), 'MMM d, yyyy') : '—'}
              </span>
            </SidebarField>

            {/* Jira Sync */}
            {jiraSyncData?.jira_key && (
              <>
                <div style={{ borderTop: `0.75px solid ${tk.border}`, marginTop: 16, paddingTop: 16 }}>
                  <div style={{ ...LABEL, marginBottom: 12 }}>Jira Sync</div>
                  <SidebarField label="Jira Issue" tk={tk}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: '2px 8px', borderRadius: 4, background: tk.chipBg, color: tk.t1 }}>{jiraSyncData.jira_key}</span>
                  </SidebarField>
                  {jiraSyncData.jira_sync_status && (
                    <SidebarField label="Sync Status" tk={tk}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4,
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                        backgroundColor: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#E3FCEF' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#DEEBFF' : '#DFE1E6',
                        color: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#006644' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#0747A6' : '#253858',
                      }}>{jiraSyncData.jira_sync_status}</span>
                    </SidebarField>
                  )}
                  <SidebarField label="Last Synced" tk={tk}>
                    <span style={{ fontSize: 12, color: tk.t2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {jiraSyncData.jira_pushed_at ? format(new Date(jiraSyncData.jira_pushed_at), 'MMM d, yyyy') : '—'}
                    </span>
                  </SidebarField>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarField({ label, children, tk }: { label: string; children: React.ReactNode; tk: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 36, gap: 8, marginBottom: 2 }}>
      <span style={{ width: 90, flexShrink: 0, fontSize: 11, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: tk.t2 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function CommentsPane({ comments, isLoading, tk }: { comments: any[]; isLoading: boolean; tk: any }) {
  if (isLoading) return <SkeletonList count={3} tk={tk} />;
  if (!comments.length) return <EmptyState text="No comments from Jira" tk={tk} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {comments.map((c: any) => (
        <div key={c.id} style={{ borderBottom: `0.75px solid ${tk.divider || tk.border}`, paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>
              {getInitials(c.author_display_name || 'U')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: tk.t1 }}>{c.author_display_name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: tk.t3, marginLeft: 'auto' }}>
              {c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}
            </span>
          </div>
          <div style={{ fontSize: 13, color: tk.t2, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 32 }}>
            {c.body || ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryPane({ changelog, isLoading, tk }: { changelog: any[]; isLoading: boolean; tk: any }) {
  if (isLoading) return <SkeletonList count={4} tk={tk} />;
  if (!changelog.length) return <EmptyState text="No history from Jira" tk={tk} />;

  const statusChanges = changelog.filter((c: any) => c.field_name === 'status');
  const otherChanges = changelog.filter((c: any) => c.field_name !== 'status');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {statusChanges.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2, marginBottom: 8 }}>
            Status Transitions ({statusChanges.length})
          </div>
          {statusChanges.map((entry: any) => {
            const fromColors = getStatusLozengeColors(entry.from_string || '');
            const toColors = getStatusLozengeColors(entry.to_string || '');
            return (
              <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `0.75px solid ${tk.divider || tk.border}` }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: tk.t2, flexShrink: 0, marginTop: 2 }}>
                  {getInitials(entry.author_display_name || 'S')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: tk.t1 }}>{entry.author_display_name || 'System'}</span>
                    <span style={{ fontSize: 11, color: tk.t3 }}>
                      {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: fromColors.bg, color: fromColors.text }}>{fromColors.label}</span>
                    <span style={{ fontSize: 12, color: tk.t3 }}>→</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: toColors.bg, color: toColors.text }}>{toColors.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {otherChanges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: tk.t2, marginBottom: 8 }}>
            Other Changes ({otherChanges.length})
          </div>
          {otherChanges.map((entry: any) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `0.75px solid ${tk.divider || tk.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: tk.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: tk.t2, flexShrink: 0 }}>
                {getInitials(entry.author_display_name || 'S')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tk.t1 }}>{entry.author_display_name || 'System'}</span>
                  <span style={{ fontSize: 11, color: tk.t3 }}>
                    {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: tk.t2 }}>
                  Changed <strong style={{ color: tk.t1, fontWeight: 600 }}>{entry.field_name}</strong>
                  {entry.from_string && <> from <span style={{ color: tk.t3 }}>{entry.from_string}</span></>}
                  {entry.to_string && <> to <span style={{ color: tk.t1 }}>{entry.to_string}</span></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonList({ count, tk }: { count: number; tk: any }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: tk.chipBg, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, width: '60%', borderRadius: 4, background: tk.chipBg, marginBottom: 6 }} />
            <div style={{ height: 10, width: '40%', borderRadius: 4, background: tk.chipBg }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text, tk }: { text: string; tk: any }) {
  return <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: tk.t3 }}>{text}</div>;
}
