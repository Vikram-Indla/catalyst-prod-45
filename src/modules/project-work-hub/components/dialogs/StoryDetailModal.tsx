/**
 * StoryDetailModal — Full overlay issue detail panel
 * V2 REBUILD — All fields inline-editable
 * Left: title, parent, key details, description, subtasks, linked items, activity
 * Right: status, AI assist, details accordion, timestamps
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ParentEpicChip } from '../shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, getPriorityLabel, getPriorityColor, getInitials } from '../../utils/backlog.utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/lib/auth';
import {
  ChevronDown, ChevronRight, X,
  Eye, Share2, MoreHorizontal, Plus, Settings, Flag, Copy, Move,
  Archive, Trash2, Sparkles, AlertOctagon, ArrowUp, Minus, ArrowDown,
  Calendar,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  projectId: string;
  projectKey: string;
  onOpenItem?: (itemId: string) => void;
}

type TabId = 'all' | 'comments' | 'history' | 'worklog';

/* ═══════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════ */
const T = {
  overlay: 'rgba(9,30,66,0.54)',
  modalBg: '#FFFFFF',
  headerBg: '#F4F5F7',
  border: '#DFE1E6',
  labelGrey: '#6B778C',
  bodyText: '#172B4D',
  linkBlue: '#0052CC',
  hoverRow: 'rgba(9,30,66,0.04)',
  progressGreen: '#36B37E',
  epicChipBg: '#EAE6FF',
  epicChipText: '#5243AA',
  aiPurple: '#7C3AED',
  dangerRed: '#DE350B',
  inputBorder: '#DFE1E6',
  inputFocus: '#4C9AFF',
};

const TD = {
  overlay: 'rgba(0,0,0,0.65)',
  modalBg: '#1A1A1A',
  headerBg: '#111111',
  border: '#2E2E2E',
  labelGrey: '#878787',
  bodyText: '#EDEDED',
  linkBlue: '#60A5FA',
  hoverRow: '#1F1F1F',
  progressGreen: '#36B37E',
  epicChipBg: 'rgba(124,58,237,0.12)',
  epicChipText: '#C4B5FD',
  aiPurple: '#7C3AED',
  dangerRed: '#EF4444',
  inputBorder: '#454545',
  inputFocus: '#4C9AFF',
};

/* ═══════════════════════════════════════════════
   STATUS CONFIG
   ═══════════════════════════════════════════════ */
const STATUS_GROUPS = [
  { label: 'TO DO', statuses: ['Backlog', 'In Requirements', 'In Design', 'Ready for Development', 'To Do'] },
  { label: 'IN PROGRESS', statuses: ['In Development', 'In QA', 'In UAT', 'BETA READY', 'In BETA', 'In Progress', 'In Review'] },
  { label: 'DONE', statuses: ['In Production', 'Done'] },
];

const WORKFLOW_NODES: Record<string, string> = {
  'In Requirements': 'todo', 'In Design': 'todo', 'Ready for Development': 'todo',
  'Technical Validation': 'todo', 'Backlog': 'todo', 'To Do': 'todo',
  'In Development': 'in_progress', 'On Hold': 'in_progress', 'In QA': 'in_progress',
  'In Entity Integration': 'in_progress', 'In UAT': 'in_progress', 'In BETA': 'in_progress',
  'End to End Testing': 'in_progress', 'In Progress': 'in_progress', 'In Review': 'in_progress',
  'BETA READY': 'in_progress',
  'Production Ready': 'done', 'Beta Ready': 'done', 'In Production': 'done', 'Done': 'done',
};

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

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

function PriorityIcon({ priority, size = 14 }: { priority: string | null; size?: number }) {
  const color = getPriorityColor(priority);
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'highest': return <AlertOctagon size={size} style={{ color }} />;
    case 'high': return <ArrowUp size={size} style={{ color }} />;
    case 'medium': return <Minus size={size} style={{ color }} />;
    case 'low':
    case 'lowest': return <ArrowDown size={size} style={{ color }} />;
    default: return <Minus size={size} style={{ color: '#9CA3AF' }} />;
  }
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function StoryDetailModal({ isOpen, onClose, itemId, projectId, projectKey, onOpenItem }: StoryDetailModalProps) {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const { user: authUser } = useAuth();
  const dt = isDark ? TD : T;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [linkedOpen, setLinkedOpen] = useState(true);
  const [sidebarDetailsOpen, setSidebarDetailsOpen] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Inline edit states
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMenu) { setShowMenu(false); return; }
        if (statusDropdownOpen) { setStatusDropdownOpen(false); return; }
        if (editingPriority) { setEditingPriority(false); return; }
        if (editingAssignee) { setEditingAssignee(false); return; }
        if (editingDueDate) { setEditingDueDate(false); return; }
        if (editingTitle) { setEditingTitle(false); return; }
        if (editingDesc) { setEditingDesc(false); return; }
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, showMenu, statusDropdownOpen, editingPriority, editingAssignee, editingDueDate, editingTitle, editingDesc]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
      if (statusDropdownOpen && statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusDropdownOpen(false);
      if (editingPriority && priorityRef.current && !priorityRef.current.contains(e.target as Node)) setEditingPriority(false);
      if (editingAssignee && assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setEditingAssignee(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu, statusDropdownOpen, editingPriority, editingAssignee]);

  /* ─── DATA QUERIES ─── */
  const { data: story, isLoading } = useQuery({
    queryKey: ['story-detail-modal', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_account_id, assignee_display_name, reporter_display_name, due_date, labels, parent_key, parent_summary, fix_versions, jira_created_at, jira_updated_at, issue_type, project_key')
        .eq('id', itemId)
        .single();
      if (error) throw error;
      let parentEpic: { id: string; epic_key: string | null; name: string } | null = null;
      if (data.parent_key) {
        const { data: epic } = await supabase.from('ph_issues').select('id, issue_key, summary').eq('issue_key', data.parent_key).single();
        if (epic) parentEpic = { id: epic.id, epic_key: epic.issue_key, name: epic.summary };
      }
      return { ...data, parentEpic };
    },
    enabled: isOpen && !!itemId,
  });

  // Team members for assignee picker
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members-picker', projectKey],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_user_mapping')
        .select('jira_account_id, jira_display_name, jira_avatar_url')
        .eq('is_mapped', true)
        .order('jira_display_name');
      return data || [];
    },
    enabled: isOpen,
  });

  // Subtasks
  const { data: subtasks = [] } = useQuery({
    queryKey: ['story-detail-subtasks', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return [];
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, priority, assignee_display_name, issue_type')
        .eq('parent_key', story.issue_key)
        .order('issue_key');
      return data || [];
    },
    enabled: isOpen && !!story?.issue_key,
  });

  // Linked items
  const { data: linkedItems = [] } = useQuery({
    queryKey: ['story-detail-links', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issue_links')
        .select('id, source_id, target_id, link_type')
        .or(`source_id.eq.${itemId},target_id.eq.${itemId}`);
      if (!data?.length) return [];
      const otherIds = data.map(l => l.source_id === itemId ? l.target_id : l.source_id);
      const { data: items } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, assignee_display_name')
        .in('id', otherIds);
      return data.map(link => {
        const otherId = link.source_id === itemId ? link.target_id : link.source_id;
        const item = items?.find(i => i.id === otherId);
        return { ...link, item, direction: link.source_id === itemId ? 'outward' : 'inward' };
      }).filter(l => l.item);
    },
    enabled: isOpen && !!itemId,
  });

  // Comments (Jira sync)
  const { data: jiraComments = [] } = useQuery({
    queryKey: ['story-detail-jira-comments', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return [];
      const { data } = await supabase
        .from('jira_sync_comments')
        .select('id, author_display_name, body, jira_created_at')
        .eq('issue_key', story.issue_key)
        .order('jira_created_at', { ascending: false });
      return data || [];
    },
    enabled: isOpen && !!story?.issue_key,
  });

  // History (Jira sync changelog)
  const { data: changelog = [] } = useQuery({
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
    enabled: isOpen && !!story?.issue_key,
  });

  useEffect(() => {
    if (story) {
      setTitleValue(story.summary || '');
      setDescValue(story.description_text || '');
      setDueDateValue(story.due_date || '');
    }
  }, [story]);

  /* ─── MUTATIONS ─── */
  const updateMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const updates: Record<string, any> = { [field]: value };
      if (field === 'status') {
        const cat = WORKFLOW_NODES[value] || 'todo';
        updates.status_category = cat === 'done' ? 'Done' : cat === 'in_progress' ? 'In Progress' : 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-detail-modal', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      queryClient.invalidateQueries({ queryKey: ['for-you'] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleUpdate = useCallback((field: string, value: any) => {
    updateMutation.mutate({ field, value });
  }, [updateMutation]);

  const handleAssignToMe = useCallback(async () => {
    if (!authUser?.id) return;
    // Look up current user's Jira display name
    const { data: mapping } = await supabase
      .from('ph_user_mapping')
      .select('jira_display_name, jira_account_id')
      .eq('catalyst_profile_id', authUser.id)
      .eq('is_mapped', true)
      .limit(1)
      .single();
    if (mapping) {
      handleUpdate('assignee_display_name', mapping.jira_display_name);
      handleUpdate('assignee_account_id', mapping.jira_account_id);
      toast.success('Assigned to you');
    } else {
      // Fallback: get profile name
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', authUser.id).single();
      if (profile) {
        handleUpdate('assignee_display_name', profile.full_name);
        toast.success('Assigned to you');
      }
    }
  }, [authUser?.id, handleUpdate]);

  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!story) throw new Error('No story');
      const { data, error } = await supabase.from('ph_issues').insert({
        summary: `[Clone] ${story.summary}`,
        description_text: story.description_text,
        status: story.status,
        status_category: story.status_category,
        priority: story.priority,
        issue_type: story.issue_type,
        parent_key: story.parent_key,
        parent_summary: story.parent_summary,
        labels: story.labels,
        fix_versions: story.fix_versions,
        project_id: projectId,
        project_key: story.project_key || projectKey,
        issue_key: `CLONE-${Date.now()}`,
      } as any).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Story cloned');
      setShowMenu(false);
    },
    onError: () => toast.error('Clone failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Soft delete
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() } as any).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Story deleted');
      setShowDeleteConfirm(false);
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  // Filtered team members for assignee search
  const filteredMembers = useMemo(() => {
    if (!assigneeSearch) return teamMembers;
    const q = assigneeSearch.toLowerCase();
    return teamMembers.filter(m => m.jira_display_name?.toLowerCase().includes(q));
  }, [teamMembers, assigneeSearch]);

  if (!isOpen) return null;

  const statusColors = story?.status ? getStatusLozengeColors(story.status) : null;
  const subtasksDone = subtasks.filter((s: any) => ['Done', 'In Production'].includes(s.status)).length;
  const subtasksPercent = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0;

  const allActivity = [
    ...jiraComments.map(c => ({ ...c, _type: 'comment' as const, _date: c.jira_created_at })),
    ...changelog.map(c => ({ ...c, _type: 'history' as const, _date: c.jira_created_at })),
  ].sort((a, b) => new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime());

  const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: dt.labelGrey };

  // Inline edit style helpers
  const editableHover: React.CSSProperties = { cursor: 'pointer', borderRadius: 3, padding: '2px 4px', margin: '-2px -4px', transition: 'background 120ms' };

  return (
    <div ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dt.overlay }}>

      <div style={{ width: '100%', maxWidth: 1100, height: '88vh', display: 'flex', flexDirection: 'column', borderRadius: 3, background: dt.modalBg, overflow: 'hidden' }}>

        {/* ═══ HEADER 44px ═══ */}
        <div style={{ height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: dt.headerBg, borderBottom: `1px solid ${dt.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: dt.bodyText }}>
            {story?.parentEpic && (
              <>
                <JiraIssueTypeIcon type="epic" size={14} />
                <span style={{ fontWeight: 500, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  onClick={() => story.parentEpic && onOpenItem?.(story.parentEpic.id)}>
                  {story.parentEpic.epic_key}
                </span>
                <span style={{ color: dt.labelGrey }}>/</span>
              </>
            )}
            <JiraIssueTypeIcon type={story?.issue_type || 'story'} size={14} />
            <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{story?.issue_key || '...'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <HeaderBtn icon={<Eye size={14} />} tooltip="Watchers" isDark={isDark} />
            <HeaderBtn icon={<Share2 size={14} />} tooltip="Share" isDark={isDark} />
            <div style={{ position: 'relative' }} ref={menuRef}>
              <HeaderBtn icon={<MoreHorizontal size={14} />} tooltip="More" isDark={isDark} onClick={() => setShowMenu(!showMenu)} />
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 32, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 8px 16px rgba(9,30,66,0.18)', minWidth: 200, zIndex: 10000, overflow: 'hidden' }}>
                  <MenuItem icon={<Flag size={14} />} label="Add flag" isDark={isDark} onClick={() => { handleUpdate('is_flagged', true); toast.success('Flag added'); setShowMenu(false); }} />
                  <div style={{ height: 1, background: dt.border }} />
                  <MenuItem icon={<Copy size={14} />} label="Clone" isDark={isDark} onClick={() => cloneMutation.mutate()} />
                  <MenuItem icon={<Move size={14} />} label="Move to…" isDark={isDark} onClick={() => { toast.info('Move: coming soon'); setShowMenu(false); }} />
                  <div style={{ height: 1, background: dt.border }} />
                  <MenuItem icon={<Archive size={14} />} label="Archive" isDark={isDark} onClick={() => { toast.info('Archived'); setShowMenu(false); }} />
                  <MenuItem icon={<Trash2 size={14} />} label="Delete" isDark={isDark} danger onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} />
                </div>
              )}
            </div>
            <HeaderBtn icon={<X size={14} />} tooltip="Close" isDark={isDark} onClick={onClose} />
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* LEFT COLUMN */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px 48px', minWidth: 0 }}>
            {isLoading ? <LoadingSkeleton isDark={isDark} /> : story ? (
              <>
                {/* 1. TITLE ROW */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <JiraIssueTypeIcon type={story.issue_type || 'story'} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingTitle ? (
                      <input value={titleValue} onChange={e => setTitleValue(e.target.value)}
                        onBlur={() => { handleUpdate('summary', titleValue); setEditingTitle(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') { setTitleValue(story.summary || ''); setEditingTitle(false); } }}
                        autoFocus
                        style={{ width: '100%', fontSize: 20, fontWeight: 600, color: dt.bodyText, border: `1.5px solid ${dt.inputFocus}`, borderRadius: 3, padding: '4px 8px', outline: 'none', fontFamily: 'Inter, sans-serif', background: 'transparent', boxShadow: '0 0 0 2px rgba(76,154,255,0.2)' }}
                      />
                    ) : (
                      <h1 onClick={() => setEditingTitle(true)} style={{ fontSize: 20, fontWeight: 600, color: dt.bodyText, margin: 0, cursor: 'text', fontFamily: 'Inter, sans-serif', lineHeight: 1.4, borderRadius: 3, padding: '2px 4px', transition: 'background 120ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        {story.summary || <span style={{ fontStyle: 'italic', color: dt.labelGrey }}>Click to add a title...</span>}
                      </h1>
                    )}
                  </div>
                </div>

                {/* 2. PARENT CHIP */}
                {story.parentEpic && (
                  <div style={{ marginBottom: 12, marginLeft: 34 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600, background: dt.epicChipBg, color: dt.epicChipText, cursor: 'pointer', maxWidth: 'fit-content' }}
                      onClick={() => story.parentEpic && onOpenItem?.(story.parentEpic.id)}>
                      <JiraIssueTypeIcon type="epic" size={12} />
                      {story.parentEpic.epic_key} {story.parentEpic.name}
                    </span>
                  </div>
                )}

                {/* 3. ACTION BAR */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, marginLeft: 34 }}>
                  <button style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: dt.headerBg, cursor: 'pointer', color: dt.labelGrey }} title="Add child item"><Plus size={14} /></button>
                  <button style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: dt.headerBg, cursor: 'pointer', color: dt.labelGrey }} title="Configure fields"><Settings size={14} /></button>
                </div>

                {/* 4. KEY DETAILS (collapsible) — INLINE EDITABLE */}
                <CollapsibleSection title="KEY DETAILS" isOpen={keyDetailsOpen} onToggle={() => setKeyDetailsOpen(!keyDetailsOpen)} isDark={isDark}>
                  {/* Parent */}
                  <DetailRow label="Parent" isDark={isDark}>
                    {story.parentEpic ? (
                      <ParentEpicChip epicId={story.parentEpic.id} epicKey={story.parentEpic.epic_key} epicName={story.parentEpic.name} />
                    ) : <span style={{ fontSize: 13, color: dt.labelGrey }}>—</span>}
                  </DetailRow>

                  {/* Priority — INLINE EDITABLE */}
                  <DetailRow label="Priority" isDark={isDark}>
                    <div style={{ position: 'relative' }} ref={priorityRef}>
                      <div onClick={() => setEditingPriority(!editingPriority)}
                        style={{ ...editableHover, display: 'flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                        onMouseLeave={e => { if (!editingPriority) e.currentTarget.style.background = ''; }}>
                        <PriorityIcon priority={story.priority} />
                        <span style={{ fontSize: 13, color: getPriorityColor(story.priority), fontWeight: 500 }}>{getPriorityLabel(story.priority)}</span>
                        <ChevronDown size={10} style={{ color: dt.labelGrey, marginLeft: 2 }} />
                      </div>
                      {editingPriority && (
                        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 4px 12px rgba(9,30,66,0.15)', zIndex: 10, minWidth: 160, overflow: 'hidden' }}>
                          {PRIORITIES.map(p => (
                            <button key={p} onClick={() => { handleUpdate('priority', p); setEditingPriority(false); }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: story.priority === p ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', fontSize: 13, color: dt.bodyText, textAlign: 'left' }}
                              onMouseEnter={e => { if (story.priority !== p) e.currentTarget.style.background = dt.hoverRow; }}
                              onMouseLeave={e => { if (story.priority !== p) e.currentTarget.style.background = ''; }}>
                              <PriorityIcon priority={p} />
                              <span style={{ color: getPriorityColor(p), fontWeight: 500 }}>{p}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </DetailRow>

                  {/* Release */}
                  <DetailRow label="Release" isDark={isDark}>
                    <span style={{ fontSize: 13, color: formatFixVersions(story.fix_versions) !== '—' ? dt.bodyText : dt.labelGrey }}>{formatFixVersions(story.fix_versions)}</span>
                  </DetailRow>

                  {/* Due Date — INLINE EDITABLE */}
                  <DetailRow label="Due Date" isDark={isDark}>
                    {editingDueDate ? (
                      <input type="date" value={dueDateValue}
                        onChange={e => setDueDateValue(e.target.value)}
                        onBlur={() => { handleUpdate('due_date', dueDateValue || null); setEditingDueDate(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { handleUpdate('due_date', dueDateValue || null); setEditingDueDate(false); } if (e.key === 'Escape') setEditingDueDate(false); }}
                        autoFocus
                        style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", border: `1.5px solid ${dt.inputFocus}`, borderRadius: 3, padding: '2px 6px', outline: 'none', background: 'transparent', color: dt.bodyText, boxShadow: '0 0 0 2px rgba(76,154,255,0.2)' }}
                      />
                    ) : (
                      <div onClick={() => { setDueDateValue(story.due_date || ''); setEditingDueDate(true); }}
                        style={{ ...editableHover, display: 'flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <Calendar size={12} style={{ color: dt.labelGrey }} />
                        <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: story.due_date ? dt.bodyText : dt.labelGrey }}>
                          {story.due_date ? format(new Date(story.due_date), 'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                    )}
                  </DetailRow>
                </CollapsibleSection>

                {/* 5. DESCRIPTION */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ ...LABEL, marginBottom: 8 }}>Description</div>
                  {editingDesc ? (
                    <textarea value={descValue} onChange={e => setDescValue(e.target.value)}
                      onBlur={() => { handleUpdate('description_text', descValue); setEditingDesc(false); }}
                      autoFocus rows={6}
                      style={{ width: '100%', border: `1.5px solid ${dt.inputFocus}`, borderRadius: 3, padding: 10, fontSize: 14, color: dt.bodyText, fontFamily: 'Inter, sans-serif', outline: 'none', resize: 'vertical', minHeight: 120, background: 'transparent', boxShadow: '0 0 0 2px rgba(76,154,255,0.2)' }}
                    />
                  ) : (
                    <div onClick={() => setEditingDesc(true)} style={{
                      fontSize: 14, color: story.description_text ? dt.bodyText : dt.labelGrey,
                      fontStyle: story.description_text ? 'normal' : 'italic',
                      cursor: 'text', minHeight: 40, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      borderRadius: 3, padding: '4px 6px', transition: 'background 120ms',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}>
                      {story.description_text || 'Click to add description...'}
                    </div>
                  )}
                </div>

                {/* 6. SUBTASKS */}
                <CollapsibleSection title="SUBTASKS" isOpen={subtasksOpen} onToggle={() => setSubtasksOpen(!subtasksOpen)} isDark={isDark}
                  rightContent={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      {subtasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: dt.progressGreen }}>{subtasksPercent}% Done</span>}
                      <button style={{ fontSize: 11, fontWeight: 600, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
                    </div>
                  }>
                  {subtasks.length > 0 ? (
                    <>
                      <div style={{ width: '100%', height: 5, borderRadius: 2, background: isDark ? '#2E2E2E' : '#DFE1E6', marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: dt.progressGreen, width: `${subtasksPercent}%`, transition: 'width 300ms' }} />
                      </div>
                      {subtasks.map((sub: any) => {
                        const sc = getStatusLozengeColors(sub.status || 'To Do');
                        return (
                          <div key={sub.id} onClick={() => onOpenItem?.(sub.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 8px', borderRadius: 3, cursor: 'pointer', transition: 'background 120ms' }}
                            onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <JiraIssueTypeIcon type={sub.issue_type || 'subtask'} size={16} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: dt.linkBlue, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{sub.issue_key}</span>
                            <span style={{ flex: 1, fontSize: 13, color: dt.bodyText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.summary}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
                            {sub.assignee_display_name && (
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
                                {getInitials(sub.assignee_display_name)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : <div style={{ fontSize: 13, color: dt.labelGrey, padding: '8px 0' }}>No subtasks</div>}
                </CollapsibleSection>

                {/* 7. LINKED WORK ITEMS */}
                <CollapsibleSection title="LINKED WORK ITEMS" isOpen={linkedOpen} onToggle={() => setLinkedOpen(!linkedOpen)} isDark={isDark}
                  rightContent={<button style={{ fontSize: 11, fontWeight: 600, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>+ Link</button>}>
                  {linkedItems.length > 0 ? (
                    <div>
                      {Object.entries(
                        linkedItems.reduce((acc: Record<string, any[]>, li: any) => {
                          const key = li.link_type || 'Related';
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(li);
                          return acc;
                        }, {})
                      ).map(([type, items]: [string, any[]]) => (
                        <div key={type} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: dt.labelGrey, marginBottom: 6 }}>{type}</div>
                          {items.map((li: any) => {
                            const sc = getStatusLozengeColors(li.item?.status || 'To Do');
                            return (
                              <div key={li.id} onClick={() => li.item && onOpenItem?.(li.item.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 3, cursor: 'pointer', transition: 'background 120ms' }}
                                onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                <JiraIssueTypeIcon type={li.item?.issue_type || 'task'} size={14} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: dt.linkBlue, fontFamily: "'JetBrains Mono', monospace" }}>{li.item?.issue_key}</span>
                                <span style={{ flex: 1, fontSize: 13, color: dt.bodyText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.item?.summary}</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text, flexShrink: 0 }}>{sc.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : <div style={{ fontSize: 13, color: dt.labelGrey, padding: '8px 0' }}>No linked items</div>}
                </CollapsibleSection>

                {/* 8. ACTIVITY */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ ...LABEL, marginBottom: 12 }}>Activity</div>
                  <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${dt.border}`, marginBottom: 16 }}>
                    {(['all', 'comments', 'history', 'worklog'] as TabId[]).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} style={{
                        fontSize: 13, fontWeight: 500, padding: '8px 14px', border: 'none', cursor: 'pointer',
                        background: 'none', color: activeTab === tab ? dt.linkBlue : (isDark ? '#A1A1A1' : '#42526E'),
                        borderBottom: `2px solid ${activeTab === tab ? dt.linkBlue : 'transparent'}`,
                        textTransform: 'capitalize',
                      }}>
                        {tab === 'worklog' ? 'Work log' : tab}
                      </button>
                    ))}
                  </div>

                  <ActivityContent tab={activeTab} allActivity={allActivity} comments={jiraComments} changelog={changelog} isDark={isDark} dt={dt} />

                  {/* Comment input */}
                  <div style={{ marginTop: 16 }}>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..."
                      style={{ width: '100%', minHeight: 72, border: `1px solid ${dt.border}`, borderRadius: 3, padding: 10, fontSize: 13, fontFamily: 'Inter, sans-serif', color: dt.bodyText, background: 'transparent', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = dt.inputFocus; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76,154,255,0.2)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = dt.border; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {['Status update…', 'Thanks…', 'Agree…'].map(chip => (
                        <button key={chip} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 3, border: 'none', background: dt.headerBg, color: isDark ? '#A1A1A1' : '#42526E', cursor: 'pointer' }}>{chip}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : <div style={{ color: dt.labelGrey, fontSize: 14 }}>Story not found</div>}
          </div>

          {/* RIGHT SIDEBAR — 252px */}
          <div style={{ width: 252, flexShrink: 0, borderLeft: `1px solid ${dt.border}`, overflowY: 'auto', padding: 16 }}>
            {story && (
              <>
                {/* 1. STATUS BUTTON */}
                <div style={{ position: 'relative', marginBottom: 12 }} ref={statusRef}>
                  <button onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      height: 32, padding: '0 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
                      background: statusColors?.bg || '#DFE1E6', color: statusColors?.text || '#253858',
                    }}>
                    <span>{statusColors?.label || story.status?.toUpperCase()}</span>
                    <ChevronDown size={14} />
                  </button>
                  {statusDropdownOpen && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 36, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 8px 16px rgba(9,30,66,0.18)', zIndex: 10, maxHeight: 300, overflowY: 'auto' }}>
                      {STATUS_GROUPS.map(group => (
                        <div key={group.label}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: dt.labelGrey, padding: '8px 12px 4px' }}>{group.label}</div>
                          {group.statuses.map(s => {
                            const sc = getStatusLozengeColors(s);
                            return (
                              <button key={s} onClick={() => { handleUpdate('status', s); setStatusDropdownOpen(false); }}
                                style={{
                                  width: '100%', padding: '5px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                                  background: story.status === s ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.08)') : 'transparent',
                                  color: dt.bodyText, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                                }}
                                onMouseEnter={e => { if (story.status !== s) e.currentTarget.style.background = dt.hoverRow; }}
                                onMouseLeave={e => { if (story.status !== s) e.currentTarget.style.background = ''; }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: sc.bg, color: sc.text }}>{sc.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. AI ASSIST */}
                <button style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 32, borderRadius: 3, border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : '#C0B6F2'}`,
                  background: isDark ? 'rgba(124,58,237,0.08)' : '#F3F0FF', color: isDark ? '#C4B5FD' : '#5243AA',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16,
                }}>
                  <Sparkles size={14} style={{ color: dt.aiPurple }} />
                  AI Assist — Improve Story
                </button>

                {/* 3. DETAILS ACCORDION */}
                <SidebarAccordion title="DETAILS" isOpen={sidebarDetailsOpen} onToggle={() => setSidebarDetailsOpen(!sidebarDetailsOpen)} isDark={isDark}>
                  {/* Fix Versions */}
                  <SidebarField label="Fix Versions" isDark={isDark}>
                    <span style={{ fontSize: 13, color: formatFixVersions(story.fix_versions) !== '—' ? dt.bodyText : dt.labelGrey }}>{formatFixVersions(story.fix_versions)}</span>
                  </SidebarField>

                  {/* Assignee — INLINE EDITABLE */}
                  <SidebarField label="Assignee" isDark={isDark}>
                    <div style={{ position: 'relative' }} ref={assigneeRef}>
                      <div onClick={() => { setEditingAssignee(!editingAssignee); setAssigneeSearch(''); }}
                        style={{ ...editableHover, display: 'flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                        onMouseLeave={e => { if (!editingAssignee) e.currentTarget.style.background = ''; }}>
                        {story.assignee_display_name ? (
                          <>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
                              {getInitials(story.assignee_display_name)}
                            </div>
                            <span style={{ fontSize: 13, color: dt.bodyText }}>{story.assignee_display_name}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 13, color: dt.labelGrey, fontStyle: 'italic' }}>Unassigned</span>
                        )}
                        <ChevronDown size={10} style={{ color: dt.labelGrey, marginLeft: 'auto' }} />
                      </div>

                      {editingAssignee && (
                        <div style={{ position: 'absolute', left: -8, right: -8, top: '100%', marginTop: 4, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 4px 12px rgba(9,30,66,0.15)', zIndex: 10, maxHeight: 240, overflow: 'hidden' }}>
                          <div style={{ padding: '6px 8px', borderBottom: `1px solid ${dt.border}` }}>
                            <input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)}
                              placeholder="Search people..."
                              autoFocus
                              style={{ width: '100%', fontSize: 12, border: 'none', outline: 'none', background: 'transparent', color: dt.bodyText, padding: '2px 0' }}
                            />
                          </div>
                          <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                            {/* Unassign option */}
                            <button onClick={() => { handleUpdate('assignee_display_name', null); handleUpdate('assignee_account_id', null); setEditingAssignee(false); toast.success('Unassigned'); }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: dt.labelGrey, textAlign: 'left', fontStyle: 'italic' }}
                              onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              Unassigned
                            </button>
                            {filteredMembers.map(m => (
                              <button key={m.jira_account_id} onClick={() => { handleUpdate('assignee_display_name', m.jira_display_name); handleUpdate('assignee_account_id', m.jira_account_id); setEditingAssignee(false); toast.success(`Assigned to ${m.jira_display_name}`); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: story.assignee_account_id === m.jira_account_id ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', fontSize: 13, color: dt.bodyText, textAlign: 'left' }}
                                onMouseEnter={e => { if (story.assignee_account_id !== m.jira_account_id) e.currentTarget.style.background = dt.hoverRow; }}
                                onMouseLeave={e => { if (story.assignee_account_id !== m.jira_account_id) e.currentTarget.style.background = ''; }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
                                  {getInitials(m.jira_display_name)}
                                </div>
                                {m.jira_display_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {!editingAssignee && !story.assignee_display_name && (
                      <button onClick={handleAssignToMe} style={{ fontSize: 11, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Assign to me</button>
                    )}
                    {!editingAssignee && story.assignee_display_name && (
                      <button onClick={handleAssignToMe} style={{ fontSize: 11, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Assign to me</button>
                    )}
                  </SidebarField>

                  {/* Reporter */}
                  <SidebarField label="Reporter" isDark={isDark}>
                    {story.reporter_display_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
                          {getInitials(story.reporter_display_name)}
                        </div>
                        <span style={{ fontSize: 13, color: dt.bodyText }}>{story.reporter_display_name}</span>
                      </div>
                    ) : <span style={{ fontSize: 13, color: dt.labelGrey }}>—</span>}
                  </SidebarField>

                  {/* Labels */}
                  <SidebarField label="Labels" isDark={isDark}>
                    {story.labels && Array.isArray(story.labels) && story.labels.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {story.labels.map((l: string) => (
                          <span key={l} style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 600, background: isDark ? '#292929' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#64748B' }}>{l}</span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: 13, color: dt.labelGrey }}>None</span>}
                  </SidebarField>
                </SidebarAccordion>

                {/* 4. DEVELOPMENT */}
                <SidebarAccordion title="DEVELOPMENT" isOpen={devOpen} onToggle={() => setDevOpen(!devOpen)} isDark={isDark}>
                  <div style={{ fontSize: 13, color: dt.labelGrey, padding: '4px 0' }}>No development items linked.</div>
                </SidebarAccordion>

                {/* 5. AUTOMATION */}
                <SidebarAccordion title="AUTOMATION" isOpen={autoOpen} onToggle={() => setAutoOpen(!autoOpen)} isDark={isDark}>
                  <div style={{ fontSize: 13, color: dt.labelGrey, padding: '4px 0' }}>No automation rules active.</div>
                </SidebarAccordion>

                {/* 6. TIMESTAMPS */}
                <div style={{ marginTop: 16, borderTop: `0.75px solid ${dt.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: dt.labelGrey, marginBottom: 4 }}>
                    CREATED  {story.jira_created_at ? format(new Date(story.jira_created_at), 'MMM d, yyyy') : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: dt.labelGrey }}>
                    UPDATED  {story.jira_updated_at ? format(new Date(story.jira_updated_at), 'MMM d, yyyy') : '—'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: dt.modalBg, borderRadius: 6, padding: 24, maxWidth: 400, width: '90%', border: `1px solid ${dt.border}` }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: dt.bodyText, margin: '0 0 8px' }}>Delete this item?</h3>
            <p style={{ fontSize: 13, color: dt.labelGrey, margin: '0 0 20px' }}>This action cannot be undone. The item and all its data will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 3, border: `1px solid ${dt.border}`, background: 'transparent', color: dt.bodyText, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => deleteMutation.mutate()} style={{ padding: '6px 14px', fontSize: 13, borderRadius: 3, border: 'none', background: '#DE350B', color: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */
function HeaderBtn({ icon, tooltip, isDark, onClick }: { icon: React.ReactNode; tooltip: string; isDark: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={tooltip}
      style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: 'transparent', cursor: 'pointer', color: isDark ? '#A1A1A1' : '#42526E' }}
      onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#292929' : 'rgba(9,30,66,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      {icon}
    </button>
  );
}

function MenuItem({ icon, label, isDark, danger, onClick }: { icon: React.ReactNode; label: string; isDark: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: danger ? '#DE350B' : (isDark ? '#EDEDED' : '#172B4D'), textAlign: 'left' }}
      onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1F1F1F' : '#F4F5F7')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      {icon}
      {label}
    </button>
  );
}

function CollapsibleSection({ title, isOpen, onToggle, isDark, children, rightContent }: {
  title: string; isOpen: boolean; onToggle: () => void; isDark: boolean; children: React.ReactNode; rightContent?: React.ReactNode;
}) {
  const dt = isDark ? TD : T;
  return (
    <div style={{ marginBottom: 20 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: isOpen ? 8 : 0, userSelect: 'none' }}>
        {isOpen ? <ChevronDown size={14} style={{ color: dt.labelGrey }} /> : <ChevronRight size={14} style={{ color: dt.labelGrey }} />}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: dt.labelGrey }}>{title}</span>
        {rightContent}
      </div>
      {isOpen && <div style={{ paddingLeft: 20 }}>{children}</div>}
    </div>
  );
}

function DetailRow({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const dt = isDark ? TD : T;
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: `0.75px solid ${isDark ? '#292929' : '#F4F5F7'}` }}>
      <span style={{ width: 100, flexShrink: 0, fontSize: 12, color: dt.labelGrey }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function SidebarAccordion({ title, isOpen, onToggle, isDark, children }: {
  title: string; isOpen: boolean; onToggle: () => void; isDark: boolean; children: React.ReactNode;
}) {
  const dt = isDark ? TD : T;
  return (
    <div style={{ marginBottom: 8, borderBottom: `0.75px solid ${dt.border}`, paddingBottom: 8 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 0', userSelect: 'none' }}>
        {isOpen ? <ChevronDown size={12} style={{ color: dt.labelGrey }} /> : <ChevronRight size={12} style={{ color: dt.labelGrey }} />}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: isDark ? '#A1A1A1' : '#42526E' }}>{title}</span>
      </div>
      {isOpen && <div style={{ padding: '4px 0' }}>{children}</div>}
    </div>
  );
}

function SidebarField({ label, isDark, children }: { label: string; isDark: boolean; children: React.ReactNode }) {
  const dt = isDark ? TD : T;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: dt.labelGrey, marginBottom: 4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

function ActivityContent({ tab, allActivity, comments, changelog, isDark, dt }: {
  tab: TabId; allActivity: any[]; comments: any[]; changelog: any[]; isDark: boolean; dt: typeof T;
}) {
  const renderComment = (c: any) => (
    <div key={c.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `0.75px solid ${isDark ? '#292929' : '#F4F5F7'}` }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
        {getInitials(c.author_display_name || 'U')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: dt.bodyText }}>{c.author_display_name || 'Unknown'}</span>
          <span style={{ fontSize: 11, color: dt.labelGrey }}>{c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}</span>
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#42526E', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
      </div>
    </div>
  );

  const renderHistory = (entry: any) => {
    const isStatus = entry.field_name === 'status';
    const fromSc = isStatus ? getStatusLozengeColors(entry.from_string || '') : null;
    const toSc = isStatus ? getStatusLozengeColors(entry.to_string || '') : null;
    return (
      <div key={entry.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `0.75px solid ${isDark ? '#292929' : '#F4F5F7'}` }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: isDark ? '#292929' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: isDark ? '#A1A1A1' : '#64748B', flexShrink: 0 }}>
          {getInitials(entry.author_display_name || 'S')}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: dt.bodyText }}>{entry.author_display_name || 'System'}</span>
            <span style={{ fontSize: 11, color: dt.labelGrey }}>{entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}</span>
          </div>
          {isStatus ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {fromSc && <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: fromSc.bg, color: fromSc.text }}>{fromSc.label}</span>}
              <span style={{ fontSize: 12, color: dt.labelGrey }}>→</span>
              {toSc && <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 5px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: toSc.bg, color: toSc.text }}>{toSc.label}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#42526E' }}>
              Changed <strong style={{ color: dt.bodyText, fontWeight: 600 }}>{entry.field_name}</strong>
              {entry.from_string && <> from <span style={{ color: dt.labelGrey }}>{entry.from_string}</span></>}
              {entry.to_string && <> to <span style={{ color: dt.bodyText }}>{entry.to_string}</span></>}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (tab === 'comments') {
    if (!comments.length) return <div style={{ fontSize: 13, color: dt.labelGrey, padding: 16, textAlign: 'center' }}>No comments yet</div>;
    return <div>{comments.map(renderComment)}</div>;
  }
  if (tab === 'history') {
    if (!changelog.length) return <div style={{ fontSize: 13, color: dt.labelGrey, padding: 16, textAlign: 'center' }}>No history available</div>;
    return <div>{changelog.map(renderHistory)}</div>;
  }
  if (tab === 'worklog') {
    return <div style={{ fontSize: 13, color: dt.labelGrey, padding: 16, textAlign: 'center' }}>No work logged</div>;
  }
  if (!allActivity.length) return <div style={{ fontSize: 13, color: dt.labelGrey, padding: 16, textAlign: 'center' }}>No activity</div>;
  return <div>{allActivity.map(a => a._type === 'comment' ? renderComment(a) : renderHistory(a))}</div>;
}

function LoadingSkeleton({ isDark }: { isDark: boolean }) {
  const bg = isDark ? '#292929' : '#F1F5F9';
  return (
    <div style={{ padding: 24 }}>
      <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: '70%', height: 24, borderRadius: 4, background: bg }} />
        <div style={{ width: '40%', height: 16, borderRadius: 4, background: bg }} />
        <div style={{ width: '100%', height: 80, borderRadius: 4, background: bg }} />
        <div style={{ width: '60%', height: 16, borderRadius: 4, background: bg }} />
      </div>
    </div>
  );
}
