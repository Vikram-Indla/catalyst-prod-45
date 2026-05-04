/**
 * StoryDetailDrawer — 560px right slide-in detail panel
 * Tabs: Details, Comments, History
 * No Points/Sprint. Includes Release (fix_versions), Comments, Changelog.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JiraDescriptionEditor } from '@/components/shared/jira-description-editor';
import { supabase } from '@/integrations/supabase/client';
import { Popup } from '@atlaskit/popup';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import CommentIcon from '@atlaskit/icon/core/comment';
import RecentIcon from '@atlaskit/icon/glyph/recent';
import PageIcon from '@atlaskit/icon/core/page';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import AttachmentIcon from '@atlaskit/icon/core/attachment';
import AkLinkIcon from '@atlaskit/icon/core/link';
import BranchIcon from '@atlaskit/icon/core/branch';
import { StoryActionMenu } from './StoryActionMenu';
import { SubtasksList } from '@/components/stories/SubtasksList';
import { StoryLinks } from '@/components/stories/StoryLinks';
import { StoryAttachments } from '@/components/stories/StoryAttachments';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ParentEpicChip } from '../shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, getPriorityLabel, getPriorityColor, getInitials } from '../../utils/backlog.utils';
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
const DETAIL_VALUE: React.CSSProperties = { fontSize: 14, color: '#0F172A', fontWeight: 400 };

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
const TAB_ACTIVE: React.CSSProperties = { ...TAB_STYLE, color: '#0F172A', borderBottomColor: '#2563EB' };

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
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);

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

  if (!isOpen || !storyId) return null;

  const statusColors = story?.status ? getStatusLozengeColors(story.status) : null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 560,
        maxWidth: '100vw',
        background: '#FFFFFF',
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--ds-shadow-overlay, -4px 0 16px rgba(9,30,66,0.15))',
        borderLeft: '1px solid var(--ds-border, rgba(9,30,66,0.14))',
      }}
    >
      {/* Sticky Header */}
      <div style={{
        flexShrink: 0,
        background: '#FFFFFF',
        borderBottom: '0.75px solid rgba(15,23,42,0.06)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {story ? (
          <>
            <JiraIssueTypeIcon type={story.issue_type || 'story'} size={20} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{story.issue_key}</span>
            <span style={{ fontSize: 13, color: '#64748B' }}>· {story.issue_type || 'Story'}</span>
          </>
        ) : (
          <div style={{ height: 20, width: 120, borderRadius: 3, background: '#E2E8F0' }} />
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {story && <StoryActionMenu storyId={storyId!} storyKey={story.issue_key} onClose={onClose} />}
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <CrossIcon label="Close" size="small" primaryColor="#64748B" />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <div style={{ padding: '24px 20px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 100, height: 14, borderRadius: 3, background: '#E2E8F0' }} />
                <div style={{ width: 140, height: 14, borderRadius: 3, background: '#E2E8F0' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#DC2626' }}>Failed to load work item</p>
            <button type="button" onClick={onClose} style={{ marginTop: 12, fontSize: 13, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        ) : story ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Title + Status + Description (always visible) */}
            <div style={{ padding: '16px 20px 0' }}>
              {/* Status lozenge (clickable) */}
              <div style={{ marginBottom: 12 }}>
                <Popup
                  isOpen={statusPopoverOpen}
                  onClose={() => setStatusPopoverOpen(false)}
                  placement="bottom-start"
                  trigger={({ ref, ...triggerProps }) => (
                    <button
                      ref={ref as React.Ref<HTMLButtonElement>}
                      {...triggerProps}
                      type="button"
                      onClick={() => setStatusPopoverOpen(!statusPopoverOpen)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {statusColors && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px',
                          borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text,
                        }}>
                          {statusColors.label}
                        </span>
                      )}
                    </button>
                  )}
                  content={() => (
                    <div style={{ width: 220, padding: '4px 0', background: '#FFFFFF', maxHeight: 320, overflowY: 'auto' }}>
                      {STATUS_GROUPS.map(group => (
                        <div key={group.label}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', padding: '6px 12px 2px' }}>{group.label}</div>
                          {group.statuses.map(s => {
                            const sc = getStatusLozengeColors(s);
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => { handleUpdate('status', s); setStatusPopoverOpen(false); }}
                                style={{
                                  width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                                  background: story.status === s ? 'rgba(37,99,235,0.08)' : 'transparent',
                                  color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text }}>{sc.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                />
              </div>

              {/* Title */}
              {editingTitle ? (
                <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                  onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }}
                  autoFocus
                  style={{ width: '100%', fontSize: 20, fontWeight: 650, color: '#0F172A', border: '1.5px solid #2563EB', borderRadius: 4, padding: '4px 8px', outline: 'none', fontFamily: "'Sora', sans-serif", marginBottom: 8 }}
                />
              ) : (
                <h2 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 650, color: '#0F172A', margin: '0 0 8px', cursor: 'text', fontFamily: "'Sora', sans-serif", lineHeight: 1.3 }}>
                  {story.summary || <span style={{ fontStyle: 'italic', color: '#94A3B8' }}>Click to add a title...</span>}
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
            <div style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', padding: '0 20px', display: 'flex', gap: 0, flexShrink: 0 }}>
              <button type="button" onClick={() => setActiveTab('details')} style={activeTab === 'details' ? TAB_ACTIVE : TAB_STYLE}>
                <PageIcon label="" size="small" /> Details
              </button>
              <button type="button" onClick={() => setActiveTab('comments')} style={activeTab === 'comments' ? TAB_ACTIVE : TAB_STYLE}>
                <CommentIcon label="" size="small" /> Comments {comments.length > 0 && `(${comments.length})`}
              </button>
              <button type="button" onClick={() => setActiveTab('history')} style={activeTab === 'history' ? TAB_ACTIVE : TAB_STYLE}>
                <RecentIcon label="" size="small" /> History {changelog.length > 0 && `(${changelog.length})`}
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '16px 20px' }}>
              {activeTab === 'details' && (
                <>
                  {/* Description */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 6 }}>Description</div>
                    <JiraDescriptionEditor
                      value={story.description_text}
                      onChange={json => handleUpdate('description_text', json)}
                      placeholder="Add a description…"
                      minHeight={100}
                    />
                  </div>

                  {/* Key Details */}
                  <div style={{ border: '0.75px solid rgba(15,23,42,0.06)', borderRadius: 6, padding: '8px 16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 4 }}>Key Details</div>

                    {/* Status */}
                    <DetailRow label="Status">
                      {statusColors && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: statusColors.bg, color: statusColors.text }}>{statusColors.label}</span>
                      )}
                    </DetailRow>

                    {/* Priority */}
                    <DetailRow label="Priority">
                      <span style={{ ...DETAIL_VALUE, color: getPriorityColor(story.priority) }}>{getPriorityLabel(story.priority)}</span>
                    </DetailRow>

                    {/* Assignee */}
                    <DetailRow label="Assignee">
                      <Popup
                        isOpen={assigneePopoverOpen}
                        onClose={() => setAssigneePopoverOpen(false)}
                        placement="bottom-start"
                        trigger={({ ref, ...triggerProps }) => (
                          <button
                            ref={ref as React.Ref<HTMLButtonElement>}
                            {...triggerProps}
                            type="button"
                            onClick={() => setAssigneePopoverOpen(!assigneePopoverOpen)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, margin: '-2px -4px' }}
                          >
                            {story.assignee_display_name ? (
                              <>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                                  {getInitials(story.assignee_display_name)}
                                </div>
                                <span style={DETAIL_VALUE}>{story.assignee_display_name}</span>
                              </>
                            ) : (
                              <span style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>— Set assignee</span>
                            )}
                          </button>
                        )}
                        content={() => (
                          <div style={{ width: 240 }}>
                            <AssigneePicker
                              projectId={projectId}
                              currentAssignee={story.assignee_display_name}
                              onSelect={(name) => { handleUpdate('assignee_display_name', name); setAssigneePopoverOpen(false); }}
                            />
                          </div>
                        )}
                      />
                    </DetailRow>

                    {/* Reporter */}
                    <DetailRow label="Reporter">
                      {story.reporter_display_name ? (
                        <span style={DETAIL_VALUE}>{story.reporter_display_name}</span>
                      ) : (
                        <span style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>— Set reporter</span>
                      )}
                    </DetailRow>

                    {/* Due Date */}
                    <DetailRow label="Due Date">
                      <span style={{ ...DETAIL_VALUE, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: story.due_date ? '#0F172A' : '#94A3B8' }}>
                        {story.due_date ? format(new Date(story.due_date), 'MMM d, yyyy') : '— Set date'}
                      </span>
                    </DetailRow>

                    {/* Release (fix_versions) */}
                    <DetailRow label="Release">
                      <span style={{ ...DETAIL_VALUE, color: formatFixVersions(story.fix_versions) !== '—' ? '#0F172A' : '#94A3B8' }}>
                        {formatFixVersions(story.fix_versions)}
                      </span>
                    </DetailRow>

                    {/* Labels */}
                    <DetailRow label="Labels">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                        {story.labels && Array.isArray(story.labels) && story.labels.length > 0 ? (
                          story.labels.map((label: string, idx: number) => (
                            <span key={idx} style={{
                              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px',
                              borderRadius: 3, fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
                              background: 'var(--cp-bg-sunken, #F1F5F9)', color: 'var(--cp-text-primary, #0F172A)',
                              border: '1px solid var(--cp-border-subtle, rgba(15, 23, 42, 0.06))',
                            }}>
                              {label}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: 14, color: '#94A3B8', fontStyle: 'italic' }}>None</span>
                        )}
                      </div>
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
                    <div style={{ borderTop: '0.75px solid #E2E8F0', paddingTop: 16, marginTop: 16 }} className="dark:!border-[#262830]">
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 12 }}>Jira Sync</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Jira Issue</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#1E293B' }}>{jiraSyncData.jira_key}</span>
                        </div>
                        {jiraSyncData.jira_sync_status && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, color: '#6B7280' }}>Sync Status</span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3,
                              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                              backgroundColor: jiraSyncData.jira_sync_status === 'synced' || jiraSyncData.jira_sync_status === 'pushed' ? '#E3FCEF' : jiraSyncData.jira_sync_status === 'queued' || jiraSyncData.jira_sync_status === 'approval_pending' ? '#DEEBFF' : '#DFE1E6',
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

                  {/* ═══════ Child Issues / Subtasks ═══════ */}
                  <div style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)', marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setSubtasksOpen(!subtasksOpen)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {subtasksOpen
                        ? <ChevronDownIcon label="" size="small" primaryColor="#64748B" />
                        : <ChevronRightIcon label="" size="small" primaryColor="#64748B" />}
                      <BranchIcon label="" size="small" primaryColor="#64748B" />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                        Child Issues
                      </span>
                    </button>
                    {subtasksOpen && storyId && (
                      <div style={{ paddingBottom: 12 }}>
                        <SubtasksList storyId={storyId} />
                      </div>
                    )}
                  </div>

                  {/* ═══════ Linked Issues ═══════ */}
                  <div style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setLinksOpen(!linksOpen)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {linksOpen
                        ? <ChevronDownIcon label="" size="small" primaryColor="#64748B" />
                        : <ChevronRightIcon label="" size="small" primaryColor="#64748B" />}
                      <AkLinkIcon label="" size="small" primaryColor="#64748B" />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                        Linked Issues
                      </span>
                    </button>
                    {linksOpen && storyId && (
                      <div style={{ paddingBottom: 12 }}>
                        <StoryLinks storyId={storyId} />
                      </div>
                    )}
                  </div>

                  {/* ═══════ Attachments ═══════ */}
                  <div style={{ borderTop: '0.75px solid rgba(15,23,42,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setAttachmentsOpen(!attachmentsOpen)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {attachmentsOpen
                        ? <ChevronDownIcon label="" size="small" primaryColor="#64748B" />
                        : <ChevronRightIcon label="" size="small" primaryColor="#64748B" />}
                      <AttachmentIcon label="" size="small" primaryColor="#64748B" />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
                        Attachments
                      </span>
                    </button>
                    {attachmentsOpen && storyId && (
                      <div style={{ paddingBottom: 12 }}>
                        <StoryAttachments storyId={storyId} />
                      </div>
                    )}
                  </div>
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
      </div>
    </div>
  );
};

/* Reusable detail row */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 12 }}>
      <span style={DETAIL_LABEL}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', height: 36 }}>{children}</div>
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
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
              {getInitials(c.author_display_name || 'U')}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{c.author_display_name || 'Unknown'}</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>
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

  const statusChanges = changelog.filter((c: any) => c.field_name === 'status');
  const otherChanges = changelog.filter((c: any) => c.field_name !== 'status');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0, marginTop: 2 }}>
                  {getInitials(entry.author_display_name || 'S')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{entry.author_display_name || 'System'}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: fromColors.bg, color: fromColors.text }}>
                      {fromColors.label}
                    </span>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>→</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: toColors.bg, color: toColors.text }}>
                      {toColors.label}
                    </span>
                  </div>
                  {entry.jira_created_at && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                      {format(new Date(entry.jira_created_at), 'MMM d, yyyy, hh:mm a')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {otherChanges.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: 8 }}>
            Other Changes ({otherChanges.length})
          </div>
          {otherChanges.map((entry: any) => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '0.75px solid rgba(15,23,42,0.04)' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#64748B', flexShrink: 0 }}>
                {getInitials(entry.author_display_name || 'S')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{entry.author_display_name || 'System'}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  Changed <strong style={{ color: '#0F172A', fontWeight: 600 }}>{entry.field_name}</strong>
                  {entry.from_string && <> from <span style={{ color: '#94A3B8' }}>{entry.from_string}</span></>}
                  {entry.to_string && <> to <span style={{ color: '#0F172A' }}>{entry.to_string}</span></>}
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
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, width: '60%', borderRadius: 3, background: '#E2E8F0', marginBottom: 6 }} />
            <div style={{ height: 10, width: '40%', borderRadius: 3, background: '#E2E8F0' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>{text}</div>;
}

/* Assignee picker — lists unique assignee names from the project's issues */
function AssigneePicker({ projectId, currentAssignee, onSelect }: {
  projectId: string;
  currentAssignee: string | null;
  onSelect: (name: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const { data: assignees = [] } = useQuery({
    queryKey: ['project-assignees', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('assignee_display_name')
        .eq('project_id', projectId)
        .not('assignee_display_name', 'is', null);
      if (!data) return [];
      const unique = [...new Set(data.map(d => d.assignee_display_name).filter(Boolean))] as string[];
      return unique.sort();
    },
  });

  const filtered = assignees.filter((name: string) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search people..."
          autoFocus
          style={{
            width: '100%', height: 32, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4,
            padding: '0 8px', fontSize: 13, outline: 'none', background: '#F8FAFC',
            fontFamily: "'Inter', sans-serif",
          }}
        />
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', textAlign: 'left',
            background: !currentAssignee ? 'rgba(37,99,235,0.08)' : 'transparent',
            color: '#94A3B8', cursor: 'pointer', fontStyle: 'italic',
          }}
        >
          Unassigned
        </button>
        {filtered.map((name: string) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            style={{
              width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', textAlign: 'left',
              background: currentAssignee === name ? 'rgba(37,99,235,0.08)' : 'transparent',
              color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#64748B', flexShrink: 0,
            }}>
              {getInitials(name)}
            </div>
            {name}
          </button>
        ))}
        {filtered.length === 0 && search && (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
            No matches
          </div>
        )}
      </div>
    </div>
  );
}
