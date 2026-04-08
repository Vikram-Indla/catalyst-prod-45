/**
 * StoryDetailModal — Full overlay issue detail panel
 * V3 — ALL 12 GAPS CLOSED: Priority colours, comment CRUD, history merge,
 * assign-to-me, dual-table writes, clone/soft-delete, watchers, flags,
 * link creation, subtask creation, move-to, AI assist
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { ParentEpicChip } from '../shared/ParentEpicChip';
import { getLozengeStyle, STORY_STATUS_LOZENGE, getInitials } from '../../utils/backlog.utils';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useWorkItemActivity, type ActivityEntry } from '@/hooks/useWorkItemActivity';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/lib/auth';
import {
  ChevronDown, ChevronRight, X, Search,
  Eye, Share2, MoreHorizontal, Plus, Settings, Flag, Copy, Move,
  Archive, Trash2, Sparkles, AlertOctagon, ArrowUp, Minus, ArrowDown,
  Calendar, Check,
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
   GAP 1 — PRIORITY CONFIG (replaces getPriorityColor)
   ═══════════════════════════════════════════════ */
const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: '#AE2A19', label: 'Critical' },
  highest: { color: '#AE2A19', label: 'Highest' },
  high: { color: '#DE350B', label: 'High' },
  medium: { color: '#CF7B00', label: 'Medium' },
  low: { color: '#36B37E', label: 'Low' },
  lowest: { color: '#6B778C', label: 'Lowest' },
};

function getPriorityColorFixed(p: string | null): string {
  return PRIORITY_CONFIG[p?.toLowerCase() || '']?.color || '#6B778C';
}
function getPriorityLabelFixed(p: string | null): string {
  return PRIORITY_CONFIG[p?.toLowerCase() || '']?.label || p || '—';
}

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

const LINK_TYPES = [
  { value: 'blocks', label: 'blocks' },
  { value: 'is_blocked_by', label: 'is blocked by' },
  { value: 'relates_to', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
  { value: 'clones', label: 'clones' },
];

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
  const color = getPriorityColorFixed(priority);
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
  const avatarsByName = useProfileAvatarsByName();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [commentBody, setCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
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

  // GAP 10 — Subtask creation
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // GAP 9 — Link creation
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkType, setLinkType] = useState('relates_to');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [linkResults, setLinkResults] = useState<any[]>([]);

  // GAP 11 — Move to project
  const [showMovePicker, setShowMovePicker] = useState(false);

  // GAP 12 — AI assist
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

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
        if (showLinkForm) { setShowLinkForm(false); return; }
        if (showSubtaskInput) { setShowSubtaskInput(false); return; }
        if (showAiPanel) { setShowAiPanel(false); return; }
        if (showMovePicker) { setShowMovePicker(false); return; }
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, showMenu, statusDropdownOpen, editingPriority, editingAssignee, editingDueDate, editingTitle, editingDesc, showLinkForm, showSubtaskInput, showAiPanel, showMovePicker]);

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
        .select('id, issue_key, summary, description_text, status, status_category, priority, assignee_account_id, assignee_display_name, reporter_display_name, due_date, labels, parent_key, parent_summary, fix_versions, jira_created_at, jira_updated_at, issue_type, project_key, project_name')
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

  // Resolve ph_work_items ID for dual-table writes
  const { data: resolvedWorkItemId } = useQuery({
    queryKey: ['resolved-work-item-id', story?.issue_key],
    queryFn: async () => {
      if (!story?.issue_key) return null;
      const { data } = await supabase
        .from('ph_work_items')
        .select('id')
        .eq('jira_key', story.issue_key)
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    },
    enabled: isOpen && !!story?.issue_key,
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

  // Comments (Jira sync — read-only)
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

  // History (Jira sync changelog — read-only)
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

  // GAP 3 — Native activity log (ph_comments + ph_activity_log merged)
  const {
    entries: nativeActivity,
    addComment: addNativeComment,
    isAddingComment,
  } = useWorkItemActivity(resolvedWorkItemId);

  // GAP 7 — Watchers
  const { data: watcherData } = useQuery({
    queryKey: ['story-watchers', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_item_watchers')
        .select('id, user_id')
        .eq('work_item_id', itemId)
        .eq('work_item_type', 'ph_issue');
      return data || [];
    },
    enabled: isOpen && !!itemId,
  });
  const watcherCount = watcherData?.length ?? 0;
  const isWatching = watcherData?.some(w => w.user_id === authUser?.id) ?? false;

  // GAP 11 — Available projects for Move
  const { data: availableProjects = [] } = useQuery({
    queryKey: ['available-projects-for-move'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, key, name')
        .order('name')
        .limit(20);
      return (data || []).filter((p: any) => p.key !== story?.project_key);
    },
    enabled: showMovePicker && !!story?.project_key,
  });

  useEffect(() => {
    if (story) {
      setTitleValue(story.summary || '');
      setDescValue(story.description_text || '');
      setDueDateValue(story.due_date || '');
    }
  }, [story]);

  /* ─── GAP 5 — DUAL-TABLE WRITE HELPER ─── */
  const WI_FIELD_MAP: Record<string, string> = {
    summary: 'summary',
    description_text: 'description',
    status: 'status',
    priority: 'priority',
    due_date: 'due_date',
    assignee_display_name: 'assignee_id',
  };

  const updateField = useCallback(async (fieldName: string, value: any) => {
    try {
      const oldValue = story?.[fieldName as keyof typeof story];

      // 1. Update ph_issues
      const updates: Record<string, any> = { [fieldName]: value };
      if (fieldName === 'status') {
        const cat = WORKFLOW_NODES[value] || 'todo';
        updates.status_category = cat === 'done' ? 'Done' : cat === 'in_progress' ? 'In Progress' : 'To Do';
      }
      const { error } = await supabase.from('ph_issues').update(updates).eq('id', itemId);
      if (error) throw error;

      // 2. Write to ph_work_items if record exists
      const wiField = WI_FIELD_MAP[fieldName];
      if (wiField && resolvedWorkItemId) {
        await supabase.from('ph_work_items')
          .update({ [wiField]: value, updated_at: new Date().toISOString() } as any)
          .eq('id', resolvedWorkItemId);
      }

      // 3. Enqueue to jira_write_back_queue
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('jira_write_back_queue').insert({
        ph_issue_id: itemId,
        ph_work_item_id: resolvedWorkItemId ?? null,
        field_name: fieldName,
        new_value: String(value ?? ''),
        operation: 'update',
        operation_payload: { fieldId: fieldName, value } as any,
        created_by: user?.id,
      } as any);

      // 4. Record in ph_activity_log
      if (user && resolvedWorkItemId) {
        await supabase.from('ph_activity_log').insert({
          work_item_id: resolvedWorkItemId,
          user_id: user.id,
          action: 'updated',
          field_name: fieldName,
          old_value: String(oldValue ?? ''),
          new_value: String(value ?? ''),
        });
      }

      // 5. Invalidate
      queryClient.invalidateQueries({ queryKey: ['story-detail-modal', itemId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      queryClient.invalidateQueries({ queryKey: ['story-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['ph-work-item-activity', resolvedWorkItemId] });
    } catch (err) {
      console.error('updateField failed:', err);
      toast.error('Failed to update');
    }
  }, [itemId, resolvedWorkItemId, story, queryClient]);

  // Legacy handleUpdate for backwards compat within JSX
  const handleUpdate = useCallback((field: string, value: any) => {
    updateField(field, value);
  }, [updateField]);

  /* ─── GAP 4 — ASSIGN TO ME ─── */
  const handleAssignToMe = useCallback(async () => {
    if (!authUser?.id) return;
    const { data: mapping } = await supabase
      .from('ph_user_mapping')
      .select('jira_display_name, jira_account_id')
      .eq('catalyst_profile_id', authUser.id)
      .eq('is_mapped', true)
      .limit(1)
      .single();
    if (mapping) {
      await updateField('assignee_display_name', mapping.jira_display_name);
      await updateField('assignee_account_id', mapping.jira_account_id);
      toast.success('Assigned to you');
    } else {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', authUser.id).single();
      if (profile) {
        await updateField('assignee_display_name', profile.full_name);
        toast.success('Assigned to you');
      }
    }
  }, [authUser?.id, updateField]);

  /* ─── GAP 6 — CLONE ─── */
  const cloneMutation = useMutation({
    mutationFn: async () => {
      if (!story) throw new Error('No story');
      const { error } = await supabase.from('ph_issues').insert({
        summary: `[Clone] ${story.summary}`,
        description_text: story.description_text,
        status: 'To Do',
        status_category: 'To Do',
        priority: story.priority,
        issue_type: story.issue_type,
        parent_key: story.parent_key,
        parent_summary: story.parent_summary,
        labels: story.labels,
        fix_versions: story.fix_versions,
        project_key: story.project_key || projectKey,
        project_name: story.project_name,
        issue_key: `CLONE-${Date.now()}`,
        source: 'catalyst',
        jira_created_at: new Date().toISOString(),
        jira_updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      queryClient.invalidateQueries({ queryKey: ['story-backlog'] });
      toast.success('Story cloned');
      setShowMenu(false);
    },
    onError: () => toast.error('Clone failed'),
  });

  /* ─── GAP 6 — SOFT DELETE ─── */
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ph_issues')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', itemId);
      if (error) throw error;
      if (resolvedWorkItemId) {
        await supabase.from('ph_work_items')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', resolvedWorkItemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      queryClient.invalidateQueries({ queryKey: ['story-backlog'] });
      toast.success('Story deleted');
      setShowDeleteConfirm(false);
      onClose();
    },
    onError: () => toast.error('Delete failed'),
  });

  /* ─── GAP 7 — TOGGLE WATCH ─── */
  const toggleWatch = useCallback(async () => {
    if (!authUser?.id) return;
    if (isWatching) {
      await supabase.from('work_item_watchers')
        .delete()
        .eq('work_item_id', itemId)
        .eq('work_item_type', 'ph_issue')
        .eq('user_id', authUser.id);
      toast.success('Unwatched');
    } else {
      await supabase.from('work_item_watchers')
        .insert({ work_item_id: itemId, work_item_type: 'ph_issue', user_id: authUser.id } as any);
      toast.success('Watching');
    }
    queryClient.invalidateQueries({ queryKey: ['story-watchers', itemId] });
  }, [authUser?.id, isWatching, itemId, queryClient]);

  /* ─── GAP 8 — TOGGLE FLAG ─── */
  const [isFlagged, setIsFlagged] = useState(false);
  const toggleFlag = useCallback(async () => {
    if (!resolvedWorkItemId) { toast.info('Flag requires a native work item'); return; }
    const newFlagged = !isFlagged;
    await supabase.from('ph_work_items')
      .update({ is_flagged: newFlagged, flag_reason: newFlagged ? 'Flagged for attention' : null })
      .eq('id', resolvedWorkItemId);
    setIsFlagged(newFlagged);
    toast.success(newFlagged ? 'Flag added' : 'Flag removed');
  }, [resolvedWorkItemId, isFlagged]);

  /* ─── GAP 2 — COMMENT SUBMISSION ─── */
  const handleSubmitComment = useCallback(async () => {
    if (!commentBody.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      if (resolvedWorkItemId) {
        addNativeComment(commentBody.trim());
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { error } = await supabase.from('ph_comments').insert({
          work_item_id: itemId,
          author_id: user.id,
          body: commentBody.trim(),
        });
        if (error) throw error;
        toast.success('Comment added');
      }
      setCommentBody('');
      queryClient.invalidateQueries({ queryKey: ['ph-work-item-activity', resolvedWorkItemId] });
      queryClient.invalidateQueries({ queryKey: ['story-detail-jira-comments'] });
    } catch (err) {
      console.error('Comment save failed:', err);
      toast.error('Failed to save comment');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentBody, isSubmittingComment, resolvedWorkItemId, addNativeComment, itemId, queryClient]);

  /* ─── GAP 9 — LINK SEARCH & CREATE ─── */
  const handleLinkSearch = useCallback(async (query: string) => {
    setLinkSearchQuery(query);
    if (query.length < 2) { setLinkResults([]); return; }
    const { data } = await supabase.from('ph_issues')
      .select('id, issue_key, summary, status, issue_type')
      .ilike('summary', `%${query}%`)
      .neq('id', itemId)
      .limit(6);
    setLinkResults(data || []);
  }, [itemId]);

  const handleCreateLink = useCallback(async (targetId: string) => {
    const sourceId = resolvedWorkItemId || itemId;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('ph_issue_links').insert({
      source_id: sourceId,
      target_id: targetId,
      link_type: linkType,
      created_by: user?.id,
    } as any);
    if (error) { toast.error('Failed to create link'); return; }
    toast.success('Link created');
    setShowLinkForm(false);
    setLinkSearchQuery('');
    setLinkResults([]);
    queryClient.invalidateQueries({ queryKey: ['story-detail-links', itemId] });
  }, [resolvedWorkItemId, itemId, linkType, queryClient]);

  /* ─── GAP 10 — SUBTASK CREATION ─── */
  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !story) return;
    const { error } = await supabase.from('ph_issues').insert({
      summary: newSubtaskTitle.trim(),
      issue_type: 'Sub-task',
      status: 'To Do',
      status_category: 'To Do',
      parent_key: story.issue_key,
      parent_summary: story.summary,
      project_key: story.project_key,
      project_name: story.project_name,
      priority: 'Medium',
      source: 'catalyst',
      issue_key: `SUB-${Date.now()}`,
      jira_created_at: new Date().toISOString(),
      jira_updated_at: new Date().toISOString(),
    } as any);
    if (error) { toast.error('Failed to create subtask'); return; }
    toast.success('Subtask created');
    setNewSubtaskTitle('');
    setShowSubtaskInput(false);
    queryClient.invalidateQueries({ queryKey: ['story-detail-subtasks', story.issue_key] });
    queryClient.invalidateQueries({ queryKey: ['story-backlog'] });
  }, [newSubtaskTitle, story, queryClient]);

  /* ─── GAP 11 — MOVE TO PROJECT ─── */
  const handleMoveToProject = useCallback(async (targetKey: string, targetName: string) => {
    await supabase.from('ph_issues')
      .update({ project_key: targetKey, project_name: targetName } as any)
      .eq('id', itemId);
    toast.success(`Moved to ${targetName}`);
    setShowMovePicker(false);
    setShowMenu(false);
    queryClient.invalidateQueries({ queryKey: ['story-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
    onClose();
  }, [itemId, queryClient, onClose]);

  /* ─── GAP 12 — AI ASSIST ─── */
  const handleAIAssist = useCallback(async () => {
    if (!story) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('kb-query', {
        body: {
          query: `Improve this user story description. Story: "${story.summary}". Current description: "${story.description_text ?? 'No description yet.'}". Return a well-structured description with: Preconditions, Process Flow, User Interface and Functionalities, Acceptance Criteria. Format as plain text with clear section headers.`,
          context: 'story-improvement',
        }
      });
      if (data?.result) {
        setAiSuggestion(data.result);
        setShowAiPanel(true);
      } else {
        toast.info('AI returned no suggestion');
      }
    } catch (err) {
      console.error('AI Assist failed:', err);
      toast.error('AI Assist unavailable');
    } finally {
      setAiLoading(false);
    }
  }, [story]);

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

  // Merge Jira + native activity for All/Comments/History tabs
  const jiraCommentsNorm = jiraComments.map(c => ({
    id: c.id, _type: 'comment' as const, _source: 'jira' as const,
    _date: c.jira_created_at, author_display_name: c.author_display_name,
    body: c.body, jira_created_at: c.jira_created_at,
  }));
  const jiraChangelogNorm = changelog.map(c => ({
    id: c.id, _type: 'history' as const, _source: 'jira' as const,
    _date: c.jira_created_at, author_display_name: c.author_display_name,
    field_name: c.field_name, from_string: c.from_string, to_string: c.to_string,
    jira_created_at: c.jira_created_at,
  }));
  const nativeCommentsNorm = nativeActivity.filter(e => e.kind === 'comment').map(e => ({
    id: e.id, _type: 'comment' as const, _source: 'native' as const,
    _date: e.created_at, author_display_name: e.actor_name,
    body: e.body || '', jira_created_at: e.created_at,
  }));
  const nativeHistoryNorm = nativeActivity.filter(e => e.kind === 'history').map(e => ({
    id: e.id, _type: 'history' as const, _source: 'native' as const,
    _date: e.created_at, author_display_name: e.actor_name,
    field_name: e.field_name || '', from_string: e.old_value || '', to_string: e.new_value || '',
    jira_created_at: e.created_at,
  }));

  const allComments = [...jiraCommentsNorm, ...nativeCommentsNorm]
    .sort((a, b) => new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime());
  const allHistory = [...jiraChangelogNorm, ...nativeHistoryNorm]
    .sort((a, b) => new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime());
  const allActivity = [...allComments, ...allHistory]
    .sort((a, b) => new Date(b._date || 0).getTime() - new Date(a._date || 0).getTime());

  const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: dt.labelGrey };
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
            {/* GAP 8 — Flag indicator */}
            {isFlagged && <Flag size={14} style={{ color: '#DE350B', marginLeft: 4 }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* GAP 7 — Watcher button with live count */}
            <button onClick={toggleWatch} title={isWatching ? 'Unwatch' : 'Watch'} style={{
              display: 'flex', alignItems: 'center', gap: 3, height: 28, padding: '0 6px',
              border: 'none', borderRadius: 3, background: isWatching ? (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)') : 'transparent',
              cursor: 'pointer', color: isWatching ? dt.linkBlue : (isDark ? '#A1A1A1' : '#42526E'), fontSize: 11, fontWeight: 600,
            }}>
              <Eye size={14} />
              {watcherCount > 0 && <span>{watcherCount}</span>}
            </button>
            <HeaderBtn icon={<Share2 size={14} />} tooltip="Share" isDark={isDark} />
            <div style={{ position: 'relative' }} ref={menuRef}>
              <HeaderBtn icon={<MoreHorizontal size={14} />} tooltip="More" isDark={isDark} onClick={() => setShowMenu(!showMenu)} />
              {showMenu && (
                <div style={{ position: 'absolute', right: 0, top: 32, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 8px 16px rgba(9,30,66,0.18)', minWidth: 200, zIndex: 10000, overflow: 'hidden' }}>
                  {/* GAP 8 — Flag toggle */}
                  <MenuItem icon={<Flag size={14} />} label={isFlagged ? 'Remove flag' : 'Add flag'} isDark={isDark} onClick={() => { toggleFlag(); setShowMenu(false); }} />
                  <div style={{ height: 1, background: dt.border }} />
                  <MenuItem icon={<Copy size={14} />} label="Clone" isDark={isDark} onClick={() => cloneMutation.mutate()} />
                  {/* GAP 11 — Move to */}
                  <MenuItem icon={<Move size={14} />} label="Move to…" isDark={isDark} onClick={() => { setShowMovePicker(!showMovePicker); }} />
                  <div style={{ height: 1, background: dt.border }} />
                  <MenuItem icon={<Archive size={14} />} label="Archive" isDark={isDark} onClick={() => { toast.info('Archived'); setShowMenu(false); }} />
                  <MenuItem icon={<Trash2 size={14} />} label="Delete" isDark={isDark} danger onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }} />
                  {/* GAP 11 — Move picker dropdown */}
                  {showMovePicker && (
                    <div style={{ borderTop: `1px solid ${dt.border}`, maxHeight: 200, overflowY: 'auto' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: dt.labelGrey, padding: '8px 12px 4px' }}>Move to project</div>
                      {availableProjects.map((p: any) => (
                        <button key={p.id} onClick={() => handleMoveToProject(p.key, p.name)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: dt.bodyText, textAlign: 'left' }}
                          onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}>
                          <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{p.key}</span>
                          <span>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                        onBlur={() => { updateField('summary', titleValue); setEditingTitle(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateField('summary', titleValue); setEditingTitle(false); } if (e.key === 'Escape') { setTitleValue(story.summary || ''); setEditingTitle(false); } }}
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
                  <button onClick={() => { setShowSubtaskInput(true); setSubtasksOpen(true); }} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: dt.headerBg, cursor: 'pointer', color: dt.labelGrey }} title="Add child item"><Plus size={14} /></button>
                  <button style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 3, background: dt.headerBg, cursor: 'pointer', color: dt.labelGrey }} title="Configure fields"><Settings size={14} /></button>
                </div>

                {/* 4. KEY DETAILS (collapsible) — GAP 1: PRIORITY COLOURS FIXED */}
                <CollapsibleSection title="KEY DETAILS" isOpen={keyDetailsOpen} onToggle={() => setKeyDetailsOpen(!keyDetailsOpen)} isDark={isDark}>
                  <DetailRow label="Parent" isDark={isDark}>
                    {story.parentEpic ? (
                      <ParentEpicChip epicId={story.parentEpic.id} epicKey={story.parentEpic.epic_key} epicName={story.parentEpic.name} />
                    ) : <span style={{ fontSize: 13, color: dt.labelGrey }}>—</span>}
                  </DetailRow>

                  {/* Priority — GAP 1 FIX: correct colours */}
                  <DetailRow label="Priority" isDark={isDark}>
                    <div style={{ position: 'relative' }} ref={priorityRef}>
                      <div onClick={() => setEditingPriority(!editingPriority)}
                        style={{ ...editableHover, display: 'flex', alignItems: 'center', gap: 6 }}
                        onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                        onMouseLeave={e => { if (!editingPriority) e.currentTarget.style.background = ''; }}>
                        <PriorityIcon priority={story.priority} />
                        <span style={{ fontSize: 13, color: getPriorityColorFixed(story.priority), fontWeight: 500 }}>{getPriorityLabelFixed(story.priority)}</span>
                        <ChevronDown size={10} style={{ color: dt.labelGrey, marginLeft: 2 }} />
                      </div>
                      {editingPriority && (
                        <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: dt.modalBg, border: `1px solid ${dt.border}`, borderRadius: 3, boxShadow: '0 4px 12px rgba(9,30,66,0.15)', zIndex: 10, minWidth: 160, overflow: 'hidden' }}>
                          {PRIORITIES.map(p => (
                            <button key={p} onClick={() => { updateField('priority', p); setEditingPriority(false); }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: story.priority === p ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', fontSize: 13, color: dt.bodyText, textAlign: 'left' }}
                              onMouseEnter={e => { if (story.priority !== p) e.currentTarget.style.background = dt.hoverRow; }}
                              onMouseLeave={e => { if (story.priority !== p) e.currentTarget.style.background = ''; }}>
                              <PriorityIcon priority={p} />
                              <span style={{ color: getPriorityColorFixed(p), fontWeight: 500 }}>{p}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </DetailRow>

                  <DetailRow label="Release" isDark={isDark}>
                    <span style={{ fontSize: 13, color: formatFixVersions(story.fix_versions) !== '—' ? dt.bodyText : dt.labelGrey }}>{formatFixVersions(story.fix_versions)}</span>
                  </DetailRow>

                  <DetailRow label="Due Date" isDark={isDark}>
                    {editingDueDate ? (
                      <input type="date" value={dueDateValue}
                        onChange={e => setDueDateValue(e.target.value)}
                        onBlur={() => { updateField('due_date', dueDateValue || null); setEditingDueDate(false); }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateField('due_date', dueDateValue || null); setEditingDueDate(false); } if (e.key === 'Escape') setEditingDueDate(false); }}
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
                      onBlur={() => { updateField('description_text', descValue); setEditingDesc(false); }}
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

                {/* GAP 12 — AI Suggestion Panel */}
                {showAiPanel && aiSuggestion && (
                  <div style={{
                    marginBottom: 20, padding: 16, borderRadius: 6,
                    border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : '#C0B6F2'}`,
                    background: isDark ? 'rgba(124,58,237,0.06)' : '#F3F0FF',
                    transition: 'opacity 200ms',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Sparkles size={14} style={{ color: '#7C3AED' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#C4B5FD' : '#5243AA' }}>AI Suggestion</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#42526E', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 12 }}>{aiSuggestion}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { updateField('description_text', aiSuggestion); setDescValue(aiSuggestion); setShowAiPanel(false); toast.success('AI suggestion applied'); }}
                        style={{ padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#fff', background: '#7C3AED', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
                        Apply suggestion
                      </button>
                      <button onClick={() => setShowAiPanel(false)}
                        style={{ padding: '5px 14px', fontSize: 12, color: dt.labelGrey, background: 'none', border: `1px solid ${dt.border}`, borderRadius: 3, cursor: 'pointer' }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. SUBTASKS */}
                <CollapsibleSection title="SUBTASKS" isOpen={subtasksOpen} onToggle={() => setSubtasksOpen(!subtasksOpen)} isDark={isDark}
                  rightContent={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      {subtasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: dt.progressGreen }}>{subtasksPercent}% Done</span>}
                      <button onClick={() => setShowSubtaskInput(true)} style={{ fontSize: 11, fontWeight: 600, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
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
                  {/* GAP 10 — Inline subtask creation */}
                  {showSubtaskInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 8px', borderRadius: 3, background: isDark ? '#1F1F1F' : '#FAFBFC', border: `1px solid ${dt.inputFocus}`, marginTop: 4 }}>
                      <JiraIssueTypeIcon type="subtask" size={16} />
                      <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(); if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskTitle(''); } }}
                        placeholder="What needs to be done? Press Enter to save"
                        autoFocus
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: dt.bodyText, fontFamily: 'inherit', background: 'transparent' }}
                      />
                      <button onClick={handleCreateSubtask} style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#0052CC', border: 'none', borderRadius: 3, padding: '3px 10px', cursor: 'pointer' }}>Create</button>
                      <button onClick={() => { setShowSubtaskInput(false); setNewSubtaskTitle(''); }} style={{ fontSize: 16, lineHeight: '1', color: dt.labelGrey, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                    </div>
                  )}
                </CollapsibleSection>

                {/* 7. LINKED WORK ITEMS — GAP 9 */}
                <CollapsibleSection title="LINKED WORK ITEMS" isOpen={linkedOpen} onToggle={() => setLinkedOpen(!linkedOpen)} isDark={isDark}
                  rightContent={<button onClick={() => setShowLinkForm(true)} style={{ fontSize: 11, fontWeight: 600, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}>+ Link</button>}>
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
                          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: dt.labelGrey, marginBottom: 6 }}>{type.replace(/_/g, ' ')}</div>
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

                  {/* GAP 9 — Inline link creation form */}
                  {showLinkForm && (
                    <div style={{ marginTop: 8, padding: 12, borderRadius: 4, border: `1px solid ${dt.border}`, background: isDark ? '#111111' : '#FAFBFC' }}>
                      <select value={linkType} onChange={e => setLinkType(e.target.value)}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 3, border: `1px solid ${dt.border}`, marginBottom: 8, width: '100%', background: isDark ? '#1A1A1A' : '#fff', color: dt.bodyText }}>
                        {LINK_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                      </select>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px', height: 32, background: isDark ? '#1A1A1A' : '#fff', borderRadius: 4, border: `1px solid ${dt.border}`, marginBottom: 8 }}>
                        <Search size={14} style={{ color: dt.labelGrey, flexShrink: 0 }} />
                        <input value={linkSearchQuery} onChange={e => handleLinkSearch(e.target.value)}
                          placeholder="Search issues by summary..."
                          autoFocus
                          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: dt.bodyText, fontFamily: 'inherit' }}
                        />
                      </div>
                      {linkResults.map((r: any) => (
                        <div key={r.id} onClick={() => handleCreateLink(r.id)}
                          style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <JiraIssueTypeIcon type={r.issue_type || 'task'} size={14} />
                          <span style={{ fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: dt.linkBlue }}>{r.issue_key}</span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dt.bodyText }}>{r.summary}</span>
                        </div>
                      ))}
                      <button onClick={() => { setShowLinkForm(false); setLinkSearchQuery(''); setLinkResults([]); }}
                        style={{ fontSize: 11, color: dt.labelGrey, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>Cancel</button>
                    </div>
                  )}
                </CollapsibleSection>

                {/* 8. ACTIVITY — GAPS 2 & 3: merged Jira + native */}
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

                  <ActivityContent
                    tab={activeTab}
                    allActivity={allActivity}
                    comments={allComments}
                    changelog={allHistory}
                    isDark={isDark}
                    dt={dt}
                    avatarMap={avatarsByName}
                  />

                  {/* GAP 2 — Comment input with submission */}
                  <div style={{ marginTop: 16 }}>
                    <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment(); }}
                      placeholder="Add a comment... (⌘+Enter to submit)"
                      style={{ width: '100%', minHeight: 72, border: `1px solid ${dt.border}`, borderRadius: 3, padding: 10, fontSize: 13, fontFamily: 'Inter, sans-serif', color: dt.bodyText, background: 'transparent', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                      onFocus={e => { e.currentTarget.style.borderColor = dt.inputFocus; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76,154,255,0.2)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = dt.border; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                      <button onClick={() => setCommentBody(prev => prev + (prev ? '\n' : '') + 'Status update: ')}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 3, border: 'none', background: dt.headerBg, color: isDark ? '#A1A1A1' : '#42526E', cursor: 'pointer' }}>Status update…</button>
                      <button onClick={() => setCommentBody(prev => prev + (prev ? '\n' : '') + 'Thanks!')}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 3, border: 'none', background: dt.headerBg, color: isDark ? '#A1A1A1' : '#42526E', cursor: 'pointer' }}>Thanks…</button>
                      <button onClick={() => setCommentBody(prev => prev + (prev ? '\n' : '') + 'Agreed.')}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 3, border: 'none', background: dt.headerBg, color: isDark ? '#A1A1A1' : '#42526E', cursor: 'pointer' }}>Agree…</button>
                      <button onClick={handleSubmitComment}
                        disabled={!commentBody.trim() || isSubmittingComment}
                        style={{
                          marginLeft: 'auto', padding: '5px 14px', fontSize: 12, fontWeight: 600,
                          color: !commentBody.trim() ? dt.labelGrey : '#fff',
                          background: !commentBody.trim() ? dt.headerBg : '#0052CC',
                          border: 'none', borderRadius: 3, cursor: commentBody.trim() ? 'pointer' : 'default',
                          opacity: isSubmittingComment ? 0.6 : 1,
                        }}>
                        {isSubmittingComment ? 'Saving…' : 'Save'}
                      </button>
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
                              <button key={s} onClick={() => { updateField('status', s); setStatusDropdownOpen(false); }}
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

                {/* 2. AI ASSIST — GAP 12 wired */}
                <button onClick={handleAIAssist} disabled={aiLoading} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  height: 32, borderRadius: 3, border: `1px solid ${isDark ? 'rgba(124,58,237,0.3)' : '#C0B6F2'}`,
                  background: isDark ? 'rgba(124,58,237,0.08)' : '#F3F0FF', color: isDark ? '#C4B5FD' : '#5243AA',
                  fontSize: 12, fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer', marginBottom: 16,
                  opacity: aiLoading ? 0.6 : 1,
                }}>
                  <Sparkles size={14} style={{ color: '#7C3AED' }} />
                  {aiLoading ? 'Generating…' : 'AI Assist — Improve Story'}
                </button>

                {/* 3. DETAILS ACCORDION */}
                <SidebarAccordion title="DETAILS" isOpen={sidebarDetailsOpen} onToggle={() => setSidebarDetailsOpen(!sidebarDetailsOpen)} isDark={isDark}>
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
                            <ActivityAvatar name={story.assignee_display_name} avatarMap={avatarsByName} size={24} isDark={isDark} />
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
                            <input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder="Search people..." autoFocus
                              style={{ width: '100%', fontSize: 12, border: 'none', outline: 'none', background: 'transparent', color: dt.bodyText, padding: '2px 0' }}
                            />
                          </div>
                          <div style={{ maxHeight: 190, overflowY: 'auto' }}>
                            <button onClick={() => { updateField('assignee_display_name', null); updateField('assignee_account_id', null); setEditingAssignee(false); toast.success('Unassigned'); }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: dt.labelGrey, textAlign: 'left', fontStyle: 'italic' }}
                              onMouseEnter={e => (e.currentTarget.style.background = dt.hoverRow)}
                              onMouseLeave={e => (e.currentTarget.style.background = '')}>
                              Unassigned
                            </button>
                            {filteredMembers.map(m => (
                              <button key={m.jira_account_id} onClick={() => { updateField('assignee_display_name', m.jira_display_name); updateField('assignee_account_id', m.jira_account_id); setEditingAssignee(false); toast.success(`Assigned to ${m.jira_display_name}`); }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: 'none', background: story.assignee_account_id === m.jira_account_id ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', fontSize: 13, color: dt.bodyText, textAlign: 'left' }}
                                onMouseEnter={e => { if (story.assignee_account_id !== m.jira_account_id) e.currentTarget.style.background = dt.hoverRow; }}
                                onMouseLeave={e => { if (story.assignee_account_id !== m.jira_account_id) e.currentTarget.style.background = ''; }}>
                                <ActivityAvatar name={m.jira_display_name} avatarMap={avatarsByName} size={24} isDark={isDark} />
                                {m.jira_display_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={handleAssignToMe} style={{ fontSize: 11, color: dt.linkBlue, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Assign to me</button>
                  </SidebarField>

                  {/* Reporter */}
                  <SidebarField label="Reporter" isDark={isDark}>
                    {story.reporter_display_name ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ActivityAvatar name={story.reporter_display_name} avatarMap={avatarsByName} size={24} isDark={isDark} />
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

                <SidebarAccordion title="DEVELOPMENT" isOpen={devOpen} onToggle={() => setDevOpen(!devOpen)} isDark={isDark}>
                  <div style={{ fontSize: 13, color: dt.labelGrey, padding: '4px 0' }}>No development items linked.</div>
                </SidebarAccordion>

                <SidebarAccordion title="AUTOMATION" isOpen={autoOpen} onToggle={() => setAutoOpen(!autoOpen)} isDark={isDark}>
                  <div style={{ fontSize: 13, color: dt.labelGrey, padding: '4px 0' }}>No automation rules active.</div>
                </SidebarAccordion>

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
            <p style={{ fontSize: 13, color: dt.labelGrey, margin: '0 0 20px' }}>This will soft-delete the item. It can be restored by an admin.</p>
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
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#6B778C', marginBottom: 4 }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ACTIVITY AVATAR — with profile photo support
   ═══════════════════════════════════════════════ */
function ActivityAvatar({ name, avatarMap, size = 32, isDark }: { name: string; avatarMap: Map<string, string>; size?: number; isDark: boolean }) {
  const url = avatarMap.get((name || '').toLowerCase());
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  const COLORS = ['#0D9488', '#2563EB', '#DC2626', '#16A34A', '#0891B2', '#EA580C', '#4F46E5', '#059669', '#B91C1C', '#0E7490'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  const bg = COLORS[Math.abs(hash) % COLORS.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#FFFFFF', flexShrink: 0, letterSpacing: '-0.02em' }}>
      {getInitials(name || 'U')}
    </div>
  );
}

function ActivityBadge({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px',
      borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em',
      background: isDark ? '#292929' : '#F1F5F9',
      color: isDark ? '#A1A1A1' : '#42526E',
      border: `1px solid ${isDark ? '#454545' : '#DFE1E6'}`,
    }}>{label}</span>
  );
}

/* ═══════════════════════════════════════════════
   ACTIVITY CONTENT — Jira-style with avatars + badges
   ═══════════════════════════════════════════════ */
function ActivityContent({ tab, allActivity, comments, changelog, isDark, dt, avatarMap }: {
  tab: TabId; allActivity: any[]; comments: any[]; changelog: any[]; isDark: boolean; dt: typeof T; avatarMap: Map<string, string>;
}) {
  const renderComment = (c: any) => (
    <div key={c.id} style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: `0.75px solid ${isDark ? '#292929' : '#F4F5F7'}` }}>
      <ActivityAvatar name={c.author_display_name || 'Unknown'} avatarMap={avatarMap} isDark={isDark} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: dt.bodyText }}>{c.author_display_name || 'Unknown'}</span>
          <span style={{ fontSize: 12, color: dt.labelGrey }}>added a Comment</span>
        </div>
        <div style={{ fontSize: 12, color: dt.labelGrey, marginBottom: 8 }}>
          {c.jira_created_at ? formatDistanceToNow(new Date(c.jira_created_at), { addSuffix: true }) : ''}
        </div>
        <ActivityBadge label={c._source === 'native' ? 'Catalyst' : 'Comments'} isDark={isDark} />
        <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#42526E', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 10 }}>{c.body}</div>
      </div>
    </div>
  );

  const renderHistory = (entry: any) => {
    const fieldName = entry.field_name || 'field';
    const isAssignee = fieldName.toLowerCase() === 'assignee';
    const isStatus = fieldName.toLowerCase() === 'status';
    const fromSc = isStatus ? getStatusLozengeColors(entry.from_string || '') : null;
    const toSc = isStatus ? getStatusLozengeColors(entry.to_string || '') : null;
    const displayField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    return (
      <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '16px 0', borderBottom: `0.75px solid ${isDark ? '#292929' : '#F4F5F7'}` }}>
        <ActivityAvatar name={entry.author_display_name || 'System'} avatarMap={avatarMap} isDark={isDark} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: dt.bodyText }}>{entry.author_display_name || 'System'}</span>
            <span style={{ fontSize: 12, color: dt.labelGrey }}>
              changed the <strong style={{ fontWeight: 700, color: dt.bodyText }}>{displayField}</strong>
            </span>
          </div>
          <div style={{ fontSize: 12, color: dt.labelGrey, marginBottom: 8 }}>
            {entry.jira_created_at ? formatDistanceToNow(new Date(entry.jira_created_at), { addSuffix: true }) : ''}
          </div>
          <ActivityBadge label="History" isDark={isDark} />

          {isAssignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {entry.from_string && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ActivityAvatar name={entry.from_string} avatarMap={avatarMap} size={24} isDark={isDark} />
                  <span style={{ fontSize: 13, color: dt.bodyText }}>{entry.from_string}</span>
                </div>
              )}
              <span style={{ fontSize: 14, color: dt.labelGrey }}>→</span>
              {entry.to_string && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ActivityAvatar name={entry.to_string} avatarMap={avatarMap} size={24} isDark={isDark} />
                  <span style={{ fontSize: 13, color: dt.bodyText }}>{entry.to_string}</span>
                </div>
              )}
            </div>
          ) : isStatus ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {fromSc && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: fromSc.bg, color: fromSc.text, border: `1px solid ${isDark ? '#454545' : '#DFE1E6'}` }}>{fromSc.label}</span>}
              <span style={{ fontSize: 14, color: dt.labelGrey }}>→</span>
              {toSc && <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', background: toSc.bg, color: toSc.text, border: `1px solid ${isDark ? '#454545' : '#DFE1E6'}` }}>{toSc.label}</span>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: isDark ? '#A1A1A1' : '#42526E', marginTop: 10 }}>
              {entry.from_string && <><span style={{ fontFamily: 'monospace', fontSize: 11, background: isDark ? '#292929' : '#F4F5F7', padding: '1px 4px', borderRadius: 2 }}>{entry.from_string}</span> → </>}
              <span style={{ fontFamily: 'monospace', fontSize: 11, background: isDark ? '#292929' : '#F4F5F7', padding: '1px 4px', borderRadius: 2, fontWeight: 600 }}>{entry.to_string || '—'}</span>
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
