/**
 * StoryDetailModal — V15 Rebuild · Thin Orchestrator Shell
 * All types, constants, helpers, shared components, and section components
 * are imported from ./story-detail-modules/
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  X, ChevronDown, ChevronRight, Plus, Paperclip,
  ExternalLink, Share2, Search, MessageSquare, Clock,
  GripVertical, Link2, Trash2, Check,
  Eye, EyeOff, Sparkles, Loader2, RotateCcw, Settings2, AlertTriangle,
  SquarePen, Reply, ThumbsUp, Smile, Pencil, MoreHorizontal, Copy,
} from 'lucide-react';
import { RichTextCommentEditor } from './story-detail-modules/RichTextCommentEditor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


// Ring-fenced CSS for extension components
import './story-detail-extensions.css';
import { useFixVersions } from '../../hooks/useFixVersions';

// ── Module imports ────────────────────────────────
import type {
  PhIssue, PhComment, PhActivityLog, PhAttachment, PhIssueLink,
  TmTestCase, ThTestExecution, RhRelease, RhChange,
  Profile, ProjectMember, PhIssueRow,
  ColumnConfig, ParentIssue, AIOutput,
  StatusCategory, PriorityLevel, TestResult, AIImproveType,
  ActivityTab, StoryDetailModalProps,
} from './story-detail-modules';

import {
  DEFAULT_COLUMNS, STATUS_CATEGORIES, STATUS_STYLES, STATUS_OPTION_GROUPS,
  LOZENGE_STYLES, LOZENGE, PRIORITY_COLORS, PRIORITY_STYLES, PRIORITY_ICONS, PRIORITY_LIST,
  TEST_RESULT_STYLES, LINK_TYPE_LABELS, LINK_TYPE_STYLES, LINK_TYPE_OPTIONS,
  WORK_ITEM_ICONS, AI_IMPROVE_OPTIONS,
  menuItemStyle, detailLabelStyle, detailValueStyle,
} from './story-detail-modules';

import {
  fmtDate, formatDateShort, getStatusCategory, getStatusStyle,
  getInitials, getAvatarColor, getLozengeVariant, nextPos, resolveStatusCategory,
} from './story-detail-modules';

import {
  IssueIcon, StatusLozenge, JiraStatusPill, Skel, DetailRow,
  SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState,
} from './story-detail-modules';

import { SubtasksPanel } from '../SubtasksPanel';
import { DefectsSection } from './story-detail-modules';
import { IncidentsSection } from './story-detail-modules';
import { TestHubSection } from './story-detail-modules';
import { LinkedIssuesSection } from './story-detail-modules';
import { EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker } from './story-detail-modules';
import { StoryRichTextEditor } from '../story-detail/StoryRichTextEditor';
import { adfToHtml, tryAdfStringToHtml } from '../../utils/adfToHtml';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';

/* ═══════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════ */
const ANIM_STYLE_ID = 'story-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes sdm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sdm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes sdm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes sdm-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes sdm-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sdm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes sdm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes sdm-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function StoryDetailModal({
  isOpen, onClose, itemId, projectId, projectKey, onOpenItem,
  panelMode, onTogglePanelMode, navigationItems, onNavigate,
}: StoryDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const avatarsByName = useProfileAvatarsByName();

  /* ── QUERIES ───────────────────────────────── */
  const { data: currentProfile } = useQuery({
    queryKey: ['profile', user?.id], enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', user!.id).single();
      return data as Profile | null;
    },
  });

  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ['ph-issue-detail', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('*').eq('id', itemId).is('deleted_at', null).single();
      return data as unknown as PhIssue | null;
    },
  });

  // Recent epics for breadcrumb "Add parent" dropdown
  const { data: recentEpics = [] } = useQuery({
    queryKey: ['ph-recent-epics', issue?.project_key],
    enabled: !!issue?.project_key && !issue?.parent_key,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .eq('project_key', issue!.project_key)
        .in('issue_type', ['Epic', 'epic', 'Feature', 'feature'])
        .neq('status_category', 'done')
        .order('jira_updated_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    staleTime: 60000,
  });



  // Fetch reporter avatar — resolve via jira_identity_map (assignee_account_id is a Jira ID, not a Catalyst UUID)
  const { data: reporterProfile } = useQuery({
    queryKey: ['profile-avatar-jira', issue?.reporter_account_id],
    queryFn: async () => {
      if (!issue?.reporter_account_id) return null;
      // First try jira_identity_map (Jira account ID → avatar_url)
      const { data: jiraRow } = await supabase.from('jira_identity_map').select('avatar_url, catalyst_user_id').eq('jira_account_id', issue.reporter_account_id).maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      // Fallback: try catalyst_user_id → profiles
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', jiraRow.catalyst_user_id).single();
        if (profile?.avatar_url) return profile;
      }
      // Final fallback: try profiles directly (for catalyst-native users)
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', issue.reporter_account_id).maybeSingle();
      return profile;
    },
    enabled: !!issue?.reporter_account_id,
    staleTime: 60000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['ph-comments', itemId], enabled: !!itemId && isOpen,
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
    queryKey: ['ph-activity-log', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_activity_log').select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      if (!data?.length) return [] as PhActivityLog[];
      const userIds = [...new Set(data.map(e => e.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(e => ({ ...e, actor: profileMap.get(e.user_id) ?? null })) as unknown as PhActivityLog[];
    },
  });

  const { data: rhReleases = { linked: [] as string[], all: [] as RhRelease[] } } = useQuery({
    queryKey: ['rh-releases-for-issue', issue?.issue_key, projectId], enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data: releaseLinks } = await supabase.from('rh_release_issues').select('release_id').eq('issue_key', issue!.issue_key);
      const releaseIds = (releaseLinks ?? []).map(r => r.release_id);
      const { data: allReleases } = await supabase.from('rh_releases').select('id, name, key, status, target_date, project_id').eq('project_id', projectId).order('target_date', { ascending: false });
      return { linked: releaseIds, all: (allReleases ?? []) as RhRelease[] };
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_attachments').select('id, work_item_id, file_name, file_size, mime_type, storage_path, uploaded_by, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      return (data ?? []) as unknown as PhAttachment[];
    },
  });

  // Team members for @mention
  const { data: mentionMembers = [] } = useQuery({
    queryKey: ['team-members-mention', projectId], enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').limit(50);
      return (data ?? []) as Array<{ id: string; full_name: string; avatar_url: string | null }>;
    },
    staleTime: 120000,
  });

  /* ── LOCAL STATE ───────────────────────────── */
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAiRegenConfirm, setShowAiRegenConfirm] = useState(false);
  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaError, setFigmaError] = useState('');
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [parentPickerTrigger, setParentPickerTrigger] = useState(0);
  const [showAddEpicPanel, setShowAddEpicPanel] = useState(false);
  const [epicSearchTerm, setEpicSearchTerm] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [titleFocused, setTitleFocused] = useState(false);
  const [commentSummary, setCommentSummary] = useState<string | null>(null);
  const [commentSummaryLoading, setCommentSummaryLoading] = useState(false);
  const [showCommentSummary, setShowCommentSummary] = useState(true);
  const [showFixVersionDropdown, setShowFixVersionDropdown] = useState(false);
  const [fixVersionSearch, setFixVersionSearch] = useState('');
  const [showAttMenu, setShowAttMenu] = useState(false);
  const [attViewMode, setAttViewMode] = useState<'list' | 'strip'>('list');

  // All epics for "Add epic" panel (breadcrumb)
  const { data: allEpics = [] } = useQuery({
    queryKey: ['ph-all-epics', issue?.project_key],
    enabled: !!issue?.project_key && showAddEpicPanel,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status_category')
        .eq('project_key', issue!.project_key)
        .in('issue_type', ['Epic', 'epic', 'Feature', 'feature'])
        .order('jira_updated_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    staleTime: 60000,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dotsMenuRef = useRef<HTMLDivElement>(null);

  // Resizable splitter state
  const [rightPanelWidth, setRightPanelWidth] = useState(280);
  const isDraggingRef = useRef(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const modalEl = document.querySelector('[data-sdm-scope]') as HTMLElement;
      if (!modalEl) return;
      const rect = modalEl.getBoundingClientRect();
      const newWidth = Math.max(220, Math.min(480, rect.right - e.clientX));
      setRightPanelWidth(newWidth);
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // AI Improve Story state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiImproveType, setAiImproveType] = useState<AIImproveType>('improve_clarify');
  const [aiDropOpen, setAiDropOpen] = useState(false);
  const [aiFocusHint, setAiFocusHint] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiEdited, setAiEdited] = useState(false);
  const aiDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (aiDropRef.current && !aiDropRef.current.contains(e.target as Node)) setAiDropOpen(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setShowAiMenu(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (issue) {
      setLocalStatus(issue.status);
      setLocalPriority(issue.priority ?? 'Medium');
      setAcceptanceCriteria(issue.acceptance_criteria ?? '');
    }
  }, [issue?.id]);

  /* ── MUTATIONS ─────────────────────────────── */

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from('ph_issues').update({ status: newStatus, status_category: resolveStatusCategory(newStatus) }).eq('id', itemId);
      if (error) throw error;
      await supabase.from('jira_write_back_queue').insert({ ph_issue_id: itemId, field_name: 'status', new_value: newStatus, status: 'approved' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); },
    onError: () => toast.error('Failed to update status'),
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value, oldValue }: { field: string; value: string; oldValue: string }) => {
      const { error } = await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
      if (error) throw error;
      await supabase.from('ph_activity_log').insert({
        work_item_id: itemId, action: 'field_updated', field_name: field,
        old_value: oldValue, new_value: value, user_id: user!.id,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); },
    onError: () => toast.error('Failed to update'),
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const { error } = await supabase.from('ph_issues').update({ assignee_account_id: userId, assignee_display_name: displayName }).eq('id', itemId);
      if (error) throw error;
      await supabase.from('jira_write_back_queue').insert({ ph_issue_id: itemId, field_name: 'assignee', new_value: userId, status: 'approved' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); },
    onError: () => toast.error('Failed to update assignee'),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from('ph_comments').insert({ work_item_id: itemId, body, author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { setNewComment(''); toast.success('Comment added'); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); },
    onError: () => toast.error('Failed to add comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('ph_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Comment deleted'); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const { error } = await supabase.from('ph_comments').update({ body }).eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingCommentId(null); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); },
    onError: () => toast.error('Failed to update comment'),
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Ticket deleted'); onClose(); queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `attachments/${itemId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('ph_attachments').insert({ work_item_id: itemId, file_name: file.name, file_size: file.size, mime_type: file.type, storage_path: path, uploaded_by: user!.id });
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success('Attachment uploaded'); queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] }); },
    onError: () => toast.error('Failed to upload'),
  });

  const handleCommentSubmit = (html: string) => { if (html.trim()) addCommentMutation.mutate(html); };

  const assignToMe = () => {
    if (!currentProfile || !user) return;
    updateAssigneeMutation.mutate({ userId: user.id, displayName: currentProfile.full_name ?? user.email ?? 'Me' });
  };

  const saveFigmaLink = useCallback(() => {
    if (!/^https:\/\/(www\.)?figma\.com\//.test(figmaUrl)) { setFigmaError('Only Figma URLs accepted (figma.com)'); return; }
    setFigmaError('');
    supabase.from('ph_attachments').insert({ work_item_id: itemId, file_name: figmaUrl, file_size: 0, mime_type: 'application/figma', storage_path: figmaUrl, uploaded_by: user!.id }).then(({ error }) => {
      if (error) { toast.error(`Failed to save Figma link: ${error.message}`); return; }
      setFigmaUrl(''); setShowFigmaInput(false);
      toast.success('Figma design link added');
      queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
    });
  }, [figmaUrl, itemId, user, queryClient]);

  /* ── AI Apply handlers ─────────────────────── */
  const handleApplyDescription = useCallback(async (newDesc: string, prev: string) => {
    updateFieldMutation.mutate({ field: 'description_text', value: newDesc, oldValue: prev });
    // TipTap editor re-renders via React Query invalidation
  }, [updateFieldMutation]);

  const handleApplyAC = useCallback(async (newAC: string, _prev: string) => {
    setAcceptanceCriteria(newAC);
    await supabase.from('ph_issues').update({ acceptance_criteria: newAC }).eq('id', itemId);
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
  }, [itemId, queryClient]);

  const doAiGenerate = useCallback(async () => {
    setAiGenerating(true); setAiError(null); setAiOutput(null); setAiEdited(false); setShowAiRegenConfirm(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
        body: {
          issue_id: itemId,
          improve_type: aiImproveType,
          focus_hint: aiFocusHint.trim() || null,
          current_description: issue?.description_text || '(empty)',
          current_ac: acceptanceCriteria || '(none)',
          issue_summary: issue?.summary ?? '',
        },
      });
      if (fnError) throw fnError;
      if (!data?.description && !data?.acceptance_criteria) throw new Error('No content returned');
      setAiOutput({ description: data.description ?? '', acceptance_criteria: data.acceptance_criteria ?? '' });
    } catch {
      setAiError('AI features temporarily unavailable. Try again.');
    } finally { setAiGenerating(false); }
  }, [aiImproveType, aiFocusHint, itemId, issue, acceptanceCriteria]);

  const handleAiGenerate = useCallback(async () => {
    if (aiGenerating) return;
    if (aiEdited && aiOutput) {
      setShowAiRegenConfirm(true);
      return;
    }
    doAiGenerate();
  }, [aiGenerating, aiEdited, aiOutput, doAiGenerate]);

  const handleParentChange = useCallback(async (newParentKey: string | null) => {
    await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
    // Write-back to Jira
    await supabase.from('jira_write_back_queue').insert({ ph_issue_id: itemId, field_name: 'parent', new_value: newParentKey ?? '', status: 'approved' });
    // Refresh detail + all table views across Catalyst
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
  }, [itemId, queryClient]);

  /* ── DERIVED ───────────────────────────────── */
  const statusCategory = issue?.status_category ?? 'todo';
  const statusStyle = getStatusStyle(localStatus || 'Backlog', statusCategory);

  const fixVersionNames = useMemo(() => {
    if (!issue?.fix_versions) return [];
    const fv = issue.fix_versions;
    if (Array.isArray(fv)) return fv.map((v: any) => v?.name || v).filter(Boolean);
    return [];
  }, [issue?.fix_versions]);

  const { unreleased: unreleasedVersions, released: releasedVersions, isLoading: versionsLoading } = useFixVersions(issue?.project_key);
  const fixVersionDropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleFixVersion = useCallback((versionName: string) => {
    const current = fixVersionNames;
    let updated: string[];
    if (current.includes(versionName)) {
      updated = current.filter(v => v !== versionName);
    } else {
      updated = [...current, versionName];
    }
    // Save as array of {name} objects to match Jira JSONB format
    const jsonValue = updated.map(n => ({ name: n }));
    supabase.from('ph_issues').update({ fix_versions: jsonValue } as any).eq('id', itemId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    });
  }, [fixVersionNames, itemId, queryClient]);

  // Close fix version dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fixVersionDropdownRef.current && !fixVersionDropdownRef.current.contains(e.target as Node)) {
        setShowFixVersionDropdown(false);
        setFixVersionSearch('');
      }
    };
    if (showFixVersionDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFixVersionDropdown]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?issue=${issue?.issue_key ?? ''}`;
    navigator.clipboard.writeText(url);
    toast(`Link copied to clipboard · ${issue?.issue_key ?? ''}`);
  }, [issue?.issue_key]);

  const labelsArray = useMemo(() => {
    if (!issue?.labels) return [];
    if (Array.isArray(issue.labels)) return issue.labels;
    try { return JSON.parse(issue.labels as any); } catch { return []; }
  }, [issue?.labels]);

  // Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showStatusDropdown && !showDotsMenu && !showAddMenu && !aiDropOpen && !showConfirmDelete && !showWorkflow && !showFigmaInput) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showStatusDropdown, showDotsMenu, showAddMenu, aiDropOpen, showConfirmDelete, showWorkflow, showFigmaInput, onClose]);

  if (!isOpen) return null;

  /* ═════════════════════════════════════════════
     RENDER — Jira-parity layout
     ═════════════════════════════════════════════ */

  // Panel nav helpers
  const currentNavIndex = navigationItems?.findIndex(n => n.id === itemId) ?? -1;
  const canNavPrev = currentNavIndex > 0;
  const canNavNext = navigationItems ? currentNavIndex < navigationItems.length - 1 : false;
  const navPrev = () => { if (canNavPrev && navigationItems) onNavigate?.(navigationItems[currentNavIndex - 1].id); };
  const navNext = () => { if (canNavNext && navigationItems) onNavigate?.(navigationItems[currentNavIndex + 1].id); };

  const OVERLAY: React.CSSProperties = panelMode ? {
    position: 'relative', width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'rgba(9, 30, 66, 0.54)',
    padding: '40px 16px',
    overflowY: 'auto',
    animation: 'sdm-overlay-in 200ms ease-out',
  };

  const MODAL: React.CSSProperties = panelMode ? {
    width: '100%', height: '100%',
    background: '#FFFFFF',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    animation: 'sdm-panel-in 200ms ease-out',
    borderLeft: '1px solid #DFE1E6',
  } : {
    width: 1100, maxWidth: '95vw',
    minHeight: 600, maxHeight: 'calc(100vh - 80px)',
    background: '#FFFFFF', borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
    overflow: 'hidden',
    animation: 'sdm-card-in 250ms ease-out',
  };

  return (
    <>
      {/* OVERLAY */}
      <div style={OVERLAY} onClick={panelMode ? undefined : onClose}>
        <div data-sdm-scope style={MODAL} onClick={e => e.stopPropagation()}>

          {/* ── A. TOP BAR — Jira breadcrumb + actions ─────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px 0 16px', minHeight: 40, flexShrink: 0,
          }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#5E6C84', minWidth: 0 }}>
              {issue?.parent_key ? (
                <>
                  <IssueIcon type="Epic" size={14} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#5E6C84', cursor: 'pointer' }}
                    onClick={() => onOpenItem?.(issue.parent_key!)}
                  >{issue.parent_key}</span>
                </>
              ) : (
                <Popover onOpenChange={(open) => { if (!open) { setShowAddEpicPanel(false); setEpicSearchTerm(''); } }}>
                  <PopoverTrigger asChild>
                    <button
                      style={{
                        background: 'none', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer',
                        padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 13, fontWeight: 500, color: '#1868DB', transition: 'border-color 150ms, background 150ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#DEEBFF'; e.currentTarget.style.background = '#F4F5F7'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
                    >
                      <SquarePen size={13} />
                      Add parent
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" sideOffset={4} className="p-0 z-[10001]" style={{ borderRadius: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.12)', width: showAddEpicPanel ? 480 : 380 }}>
                    {!showAddEpicPanel ? (
                      <>
                        <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Recent epics
                        </div>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {recentEpics.map((epic: any) => (
                            <button
                              key={epic.id}
                              onClick={() => handleParentChange(epic.issue_key)}
                              style={{
                                width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                fontSize: 14, color: '#172B4D', transition: 'background 100ms',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <IssueIcon type="Epic" size={16} />
                              <span>{epic.issue_key} {epic.summary}</span>
                            </button>
                          ))}
                          {recentEpics.length === 0 && (
                            <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>No epics found</div>
                          )}
                        </div>
                        <div style={{ borderTop: '1px solid #EBECF0' }}>
                          <button
                            onClick={() => setShowAddEpicPanel(true)}
                            style={{
                              width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                              textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#172B4D', fontWeight: 500,
                              transition: 'background 100ms',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            View all epics
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Add epic</div>
                        <div style={{ fontSize: 13, color: '#6B778C', marginBottom: 16 }}>
                          Select a parent work item. Work items can only belong to one parent at a time.
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 6 }}>Epic</div>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Choose parent"
                            value={epicSearchTerm}
                            onChange={e => setEpicSearchTerm(e.target.value)}
                            autoFocus
                            style={{
                              width: '100%', padding: '8px 12px', border: '2px solid #4C9AFF', borderRadius: 4,
                              fontSize: 14, color: '#172B4D', outline: 'none', background: '#FFF',
                              boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #DFE1E6', borderTop: 'none', borderRadius: '0 0 4px 4px', background: '#FFF' }}>
                            {(allEpics as any[])
                              .filter((epic: any) => {
                                if (!epicSearchTerm) return true;
                                const term = epicSearchTerm.toLowerCase();
                                return epic.issue_key?.toLowerCase().includes(term) || epic.summary?.toLowerCase().includes(term);
                              })
                              .map((epic: any) => (
                                <button
                                  key={epic.id}
                                  onClick={() => {
                                    handleParentChange(epic.issue_key);
                                    setShowAddEpicPanel(false);
                                    setEpicSearchTerm('');
                                  }}
                                  style={{
                                    width: '100%', padding: '10px 14px', border: 'none', background: 'transparent',
                                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                    fontSize: 14, color: '#172B4D', transition: 'background 100ms',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#DEEBFF')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <IssueIcon type="Epic" size={16} />
                                  <span>{epic.issue_key} {epic.summary}</span>
                                </button>
                              ))}
                            {allEpics.length === 0 && (
                              <div style={{ padding: '12px 14px', fontSize: 13, color: '#6B778C' }}>No epics found</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
              <span style={{ color: '#C1C7D0', fontSize: 12 }}>/</span>
              <IssueIcon type={issue?.issue_type ?? 'Story'} size={14} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#5E6C84' }}>{issue?.issue_key ?? '—'}</span>
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={handleShare} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                borderRadius: 4, color: '#5E6C84', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <Share2 size={14} /> <span style={{ fontSize: 12 }}>Share</span>
              </button>
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                  borderRadius: 4, color: '#5E6C84', fontSize: 14, display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >···</button>
                {showDotsMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 32, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '8px 0', zIndex: 50, minWidth: 200 }}>
                    <button onClick={() => { setShowDotsMenu(false); toast('Ticket cloned'); }} style={menuItemStyle}>Clone ticket</button>
                    <button onClick={() => { setShowDotsMenu(false); toast('Move to project — coming soon'); }} style={menuItemStyle}>Move to project</button>
                    <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowConfirmDelete(true); }} style={{ ...menuItemStyle, color: '#DE350B' }}>Delete ticket</button>
                  </div>
                )}
              </div>
              {/* Expand/Collapse panel toggle */}
              {onTogglePanelMode && (
                <button onClick={onTogglePanelMode} title={panelMode ? 'Show as modal' : 'Show as side panel'} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                  borderRadius: 4, color: '#5E6C84', fontSize: 14, display: 'flex', alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {panelMode ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  )}
                </button>
              )}
              {/* Panel navigation — prev/next */}
              {panelMode && navigationItems && navigationItems.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={navPrev} disabled={!canNavPrev} style={{
                    background: 'none', border: 'none', cursor: canNavPrev ? 'pointer' : 'default',
                    padding: '6px 6px', borderRadius: 4, color: canNavPrev ? '#5E6C84' : '#C1C7D0',
                    display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (canNavPrev) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{ fontSize: 11, color: '#5E6C84', fontFamily: "'JetBrains Mono', monospace", minWidth: 44, textAlign: 'center' }}>
                    {currentNavIndex + 1} / {navigationItems.length}
                  </span>
                  <button onClick={navNext} disabled={!canNavNext} style={{
                    background: 'none', border: 'none', cursor: canNavNext ? 'pointer' : 'default',
                    padding: '6px 6px', borderRadius: 4, color: canNavNext ? '#5E6C84' : '#C1C7D0',
                    display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (canNavNext) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
              <button onClick={onClose} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px',
                borderRadius: 4, color: '#5E6C84', fontSize: 16, display: 'flex', alignItems: 'center',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FFEBE6'; e.currentTarget.style.color = '#DE350B'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#5E6C84'; }}
              ><X size={16} /></button>
            </div>
          </div>

          {/* ── B. BODY — two-column ─────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT PANEL */}
            <div style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 32px 24px',
              borderRight: '1px solid #EBECF0', minWidth: 0,
            }}>
              {issueLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} /><div style={{ height: 20 }} /><Skel w="100%" h={200} />
                </div>
              ) : (
                <>
                  {/* 1. TITLE */}
                  <h1 contentEditable suppressContentEditableWarning
                    onFocus={() => setTitleFocused(true)}
                    onBlur={e => { setTitleFocused(false); const newTitle = e.currentTarget.textContent?.trim() ?? ''; if (newTitle && newTitle !== issue?.summary) { updateFieldMutation.mutate({ field: 'summary', value: newTitle, oldValue: issue?.summary ?? '' }); } }}
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

                  {/* 2. Quick actions */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    <div ref={addMenuRef} style={{ position: 'relative' }}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{
                        width: 28, height: 28, border: '1px solid #DFE1E6', background: '#FAFBFC',
                        borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#5E6C84', transition: 'background 0.15s, border-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
                      ><Plus size={14} /></button>
                      {showAddMenu && (
                        <div style={{ position: 'absolute', left: 0, top: 34, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '8px 0', zIndex: 50, minWidth: 200 }}>
                          <button onClick={() => { setShowAddMenu(false); toast('Create Subtask — use Sub-tasks section below'); }} style={menuItemStyle}>Create Subtask</button>
                          <button onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }} style={menuItemStyle}>Add Attachment</button>
                          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachmentMutation.mutate(f); e.target.value = ''; }} />
                          <button onClick={() => { setShowAddMenu(false); setShowFigmaInput(true); }} style={menuItemStyle}>Add Design (Figma)</button>
                        </div>
                      )}
                    </div>
                    <div ref={aiMenuRef} style={{ position: 'relative' }}>
                      <button onClick={() => setShowAiMenu(o => !o)} style={{
                        width: 28, height: 28, border: '1px solid #DEEBFF', background: '#EFF6FF',
                        borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#2563EB', transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#DEEBFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        title="Catalyst Intelligence"
                      ><Sparkles size={14} /></button>
                      {showAiMenu && (
                        <div style={{
                          position: 'absolute', left: 0, top: 34, background: '#FFF',
                          border: '1px solid #DFE1E6', borderRadius: 8,
                          boxShadow: '0 8px 28px rgba(9,30,66,0.22)', padding: '12px 0 8px',
                          zIndex: 50, minWidth: 280, animation: 'sdm-slide-down 0.15s ease',
                        }}>
                          <div style={{ padding: '0 16px 10px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Catalyst Intelligence
                          </div>
                          {[
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: 'Improve description', action: () => { setShowAiMenu(false); setAiPanelOpen(true); setAiOutput(null); setAiError(null); } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>, label: 'Summarize comments', action: async () => {
                              setShowAiMenu(false);
                              if (comments.length === 0) { toast.info('No comments to summarize'); return; }
                              setCommentSummaryLoading(true); setShowCommentSummary(true); setCommentSummary(null);
                              setActiveActivityTab('comments');
                              try {
                                const commentText = comments.map((c, i) => `[${c.author?.full_name ?? 'Unknown'}]: ${c.body}`).join('\n');
                                const { data, error: fnErr } = await supabase.functions.invoke('ai-improve-story', {
                                  body: {
                                    issue_id: itemId,
                                    improve_type: 'summarize_comments',
                                    focus_hint: 'Summarize the following comments into a concise overview with key bullet points. Return ONLY the summary text, no JSON.',
                                    current_description: commentText,
                                    current_ac: '',
                                    issue_summary: issue?.summary ?? '',
                                  },
                                });
                                if (fnErr) throw fnErr;
                                const summaryText = typeof data === 'string' ? data : (data?.description || data?.summary || JSON.stringify(data));
                                setCommentSummary(summaryText);
                              } catch {
                                setCommentSummary('Unable to generate summary. Please try again.');
                              } finally { setCommentSummaryLoading(false); }
                            } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M13 8h4"/><path d="M13 12h4"/><path d="M13 16h2"/></svg>, label: 'Suggest child work items', action: () => { setShowAiMenu(false); const el = document.querySelector('[data-section="child-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info('Use the AI suggest bar in Sub-tasks section below'); } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>, label: 'Link similar work items', action: () => { setShowAiMenu(false); const el = document.querySelector('[data-section="linked-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info('Use the AI link bar in Linked Issues section below'); } },
                          ].map((item, i) => (
                            <button key={i} onClick={item.action} style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              width: '100%', padding: '10px 16px', border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              fontSize: 14, color: '#172B4D', fontFamily: 'inherit',
                              textAlign: 'left', transition: 'background 0.1s',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI IMPROVE PANEL */}
                  {aiPanelOpen && (
                    <div style={{ marginBottom: 20, border: '1px solid #BFDBFE', borderRadius: 8, overflow: 'hidden', animation: 'sdm-slide-down 0.2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#DBEAFE' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={13} style={{ color: '#2563EB' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Improve Story Requirements</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 6px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: '0.02em' }}>gemini-flash</span>
                        <button onClick={() => { setAiPanelOpen(false); setAiOutput(null); setAiError(null); }}
                          style={{ width: 22, height: 22, borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B778C' }}
                        ><X size={13} /></button>
                      </div>
                      <div style={{ padding: '14px 14px 16px', background: '#FFFFFF' }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Improve type</div>
                          <div ref={aiDropRef} style={{ position: 'relative' }}>
                            <div onClick={() => setAiDropOpen(o => !o)} role="button" tabIndex={0}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, cursor: 'pointer', background: aiDropOpen ? '#F8FAFC' : '#fff', transition: 'border-color 0.12s' }}>
                              <span style={{ fontSize: 13, color: '#172B4D' }}>{AI_IMPROVE_OPTIONS.find(o => o.value === aiImproveType)?.label ?? 'Select…'}</span>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5L6 8L9 5" stroke="#6B778C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            {aiDropOpen && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid rgba(9,30,66,0.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,0.15)', zIndex: 60, overflow: 'hidden' }}>
                                {AI_IMPROVE_OPTIONS.map(opt => (
                                  <div key={opt.value} onClick={() => { setAiImproveType(opt.value); setAiDropOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#172B4D', background: opt.value === aiImproveType ? '#EFF6FF' : 'transparent', transition: 'background 0.1s' }}
                                    onMouseEnter={e => { if (opt.value !== aiImproveType) (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,0.04)'; }}
                                    onMouseLeave={e => { if (opt.value !== aiImproveType) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                  >
                                    <span>{opt.label}</span>
                                    {opt.value === aiImproveType && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4 }}>Focus area <span style={{ fontWeight: 400, color: '#8993A4' }}>(optional)</span></div>
                          <input value={aiFocusHint} onChange={e => setAiFocusHint(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
                            placeholder='e.g. "focus on edge cases" or "make more concise"'
                            style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: '#172B4D', background: '#fff', outline: 'none' }}
                            onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'rgba(9,30,66,0.14)')} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Context from story</div>
                          <div style={{ padding: '8px 10px', background: '#F8FAFC', border: '1px solid rgba(9,30,66,0.08)', borderRadius: 4, fontSize: 12, color: '#42526E', lineHeight: 1.5, maxHeight: 80, overflow: 'auto' }}>
                            {issue?.description_text || <em style={{ color: '#8993A4' }}>No description yet — AI will generate from story title</em>}
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <button onClick={handleAiGenerate} disabled={aiGenerating}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', borderRadius: 4, border: 'none', background: aiGenerating ? '#93C5FD' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: aiGenerating ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                            onMouseEnter={e => { if (!aiGenerating) (e.currentTarget.style.background = '#1D4ED8'); }}
                            onMouseLeave={e => { if (!aiGenerating) (e.currentTarget.style.background = '#2563EB'); }}
                          >
                            {aiGenerating ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'sdm-spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Generating…</>) : (<><Sparkles size={13} /> Generate</>)}
                          </button>
                        </div>
                        {aiError && (
                          <div style={{ marginTop: 4, padding: '8px 10px', background: '#FFF1EF', border: '1px solid #FFBDAD', borderRadius: 4, fontSize: 12, color: '#BF2600', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={13} />{aiError}
                            <button onClick={handleAiGenerate} style={{ marginLeft: 'auto', color: '#BF2600', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Retry</button>
                          </div>
                        )}
                        {aiGenerating && (
                          <div style={{ marginTop: 10, padding: 12, background: '#F8FAFC', borderRadius: 6, border: '1px solid rgba(9,30,66,0.08)' }}>
                            {[100, 85, 70, 55].map((w, i) => (<div key={i} style={{ height: 12, marginBottom: 8, borderRadius: 4, width: `${w}%`, background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'sdm-shimmer 1.5s ease-in-out infinite' }} />))}
                          </div>
                        )}
                        {aiOutput && !aiGenerating && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 6, border: '1px solid rgba(9,30,66,0.08)', fontSize: 13, color: '#172B4D', lineHeight: 1.6 }}>
                              {aiOutput.description && (<><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C', marginBottom: 6 }}>Description</div><p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{aiOutput.description}</p></>)}
                              {aiOutput.acceptance_criteria && (<><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C', marginBottom: 6 }}>Acceptance Criteria</div><pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{aiOutput.acceptance_criteria}</pre></>)}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              <button onClick={handleAiGenerate} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}><RotateCcw size={11} /> Regenerate</button>
                              {aiOutput.description && (<button onClick={() => { handleApplyDescription(aiOutput.description, issue?.description_text ?? ''); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply to Description</button>)}
                              {aiOutput.acceptance_criteria && (<button onClick={() => { handleApplyAC(aiOutput.acceptance_criteria, acceptanceCriteria); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply to AC</button>)}
                              {aiOutput.description && aiOutput.acceptance_criteria && (<button onClick={() => { handleApplyDescription(aiOutput.description, issue?.description_text ?? ''); handleApplyAC(aiOutput.acceptance_criteria, acceptanceCriteria); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#2563EB', fontSize: 12, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply Both</button>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. FIGMA URL INPUT ROW */}
                  {showFigmaInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#F4F5F7', borderRadius: 4, border: '1px solid #DFE1E6' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#5E6C84', whiteSpace: 'nowrap' }}>Figma URL</span>
                      <input value={figmaUrl} onChange={e => { setFigmaUrl(e.target.value); setFigmaError(''); }} placeholder="https://figma.com/..." style={{ flex: 1, height: 32, borderRadius: 4, border: figmaError ? '1px solid #DE350B' : '1px solid #DFE1E6', padding: '0 8px', fontSize: 12, outline: 'none' }} />
                      <button onClick={saveFigmaLink} style={{ padding: '5px 12px', borderRadius: 4, background: '#0052CC', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                      <button onClick={() => { setShowFigmaInput(false); setFigmaUrl(''); setFigmaError(''); }} style={{ padding: '5px 12px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 12, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
                      {figmaError && <span style={{ fontSize: 11, color: '#DE350B' }}>{figmaError}</span>}
                    </div>
                  )}

                  {/* 4. KEY DETAILS — collapsible */}
                  <div style={{ marginBottom: 24 }}>
                    <div onClick={() => setKeyDetailsOpen(!keyDetailsOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: 14, padding: '2px 0' }}>
                      <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#5E6C84', transition: 'transform 0.2s', transform: keyDetailsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}>
                        <ChevronDown size={14} />
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Key details</span>
                    </div>
                    {keyDetailsOpen && (
                      <div>
                        {/* Parent field */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                          <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Parent</span>
                          <div style={{ flex: 1, fontSize: 13, color: '#172B4D' }}>
                            {issue && <ParentFieldPicker storyKey={issue.issue_key} parentKey={issue.parent_key} projectKey={issue.project_key} onParentChange={handleParentChange} triggerOpen={parentPickerTrigger} />}
                          </div>
                        </div>
                        {/* Priority field */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                          <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Priority</span>
                          <div style={{ flex: 1 }}>
                            {issue && <EditablePriority issueId={issue.id} currentPriority={localPriority} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                          </div>
                        </div>

                        {/* Description — ADF auto-save editor */}
                        <h2 style={{ fontSize: 14, fontWeight: 500, color: '#505258', lineHeight: '18.67px', margin: '0 0 8px 0', padding: 0 }}>Description</h2>
                        <StoryRichTextEditor
                          content={adfToHtml(issue?.description_adf) || issue?.description_text || ''}
                          onSave={(html) => { updateFieldMutation.mutate({ field: 'description_text', value: html, oldValue: issue?.description_text ?? '' }); }}
                          placeholder="Add a description..."
                          minHeight={200}
                          autoSave
                          aiLabel="Improve description"
                          onAiImprove={async () => {
                            const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
                              body: {
                                issue_id: itemId,
                                improve_type: 'improve_clarify',
                                current_description: issue?.description_text || '(empty)',
                                current_ac: acceptanceCriteria || '(none)',
                                issue_summary: issue?.summary ?? '',
                              },
                            });
                            if (fnError || !data?.description) {
                              toast.error('AI improve failed. Try again.');
                              return null;
                            }
                            return data.description;
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 5. ACCEPTANCE CRITERIA — ADF auto-save editor */}
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 500, color: '#505258', lineHeight: '18.67px', margin: '0 0 8px 0', padding: 0 }}>Acceptance Criteria</h2>
                    <StoryRichTextEditor
                      content={tryAdfStringToHtml(acceptanceCriteria) ?? acceptanceCriteria ?? ''}
                      onSave={(adfJson) => { setAcceptanceCriteria(adfJson); supabase.from('ph_issues').update({ acceptance_criteria: adfJson }).eq('id', itemId).then(() => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); }); }}
                      placeholder="No acceptance criteria defined · Add manually or use AI →"
                      minHeight={80}
                      autoSave
                      aiLabel="Improve criteria"
                      onAiImprove={async () => {
                        const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
                          body: {
                            issue_id: itemId,
                            improve_type: 'add_acceptance_criteria',
                            current_description: issue?.description_text || '(empty)',
                            current_ac: acceptanceCriteria || '(none)',
                            issue_summary: issue?.summary ?? '',
                          },
                        });
                        if (fnError || !data?.acceptance_criteria) {
                          toast.error('AI improve failed. Try again.');
                          return null;
                        }
                        return data.acceptance_criteria;
                      }}
                    />
                  </div>

                  {/* 6. ATTACHMENTS — Jira list view */}
                  <SectionBlock title="Attachments" count={attachments.length} defaultExpanded={attachments.length > 0}
                    headerRight={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ position: 'relative' }}>
                          <button onClick={() => setShowAttMenu(p => !p)} style={{ background: 'none', border: '1px solid #DFE1E6', borderRadius: 3, cursor: 'pointer', color: '#42526E', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                          </button>
                          {showAttMenu && (
                            <div style={{ position: 'absolute', right: 0, top: 32, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '4px 0', zIndex: 50, minWidth: 200, whiteSpace: 'nowrap' }}>
                              <button onClick={() => { setAttViewMode(v => v === 'list' ? 'strip' : 'list'); setShowAttMenu(false); }} style={menuItemStyle}>
                                {attViewMode === 'list' ? 'Switch to strip view' : 'Switch to list view'}
                              </button>
                              {attachments.length > 0 && (
                                <button onClick={() => { attachments.forEach(att => { const url = supabase.storage.from('attachments').getPublicUrl(att.storage_path).data.publicUrl; window.open(url, '_blank'); }); setShowAttMenu(false); }} style={menuItemStyle}>
                                  Download all <span style={{ background: '#DFE1E6', color: '#42526E', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 3, marginLeft: 8 }}>{attachments.length}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: '1px solid #DFE1E6', borderRadius: 3, cursor: 'pointer', color: '#42526E', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        ><Plus size={14} /></button>
                      </div>
                    }
                  >
                    {attachments.length === 0 ? (
                      <div style={{ padding: '16px 0', textAlign: 'center' }}>
                        <span style={{ fontSize: 13, color: '#97A0AF' }}>No attachments — click + to add</span>
                      </div>
                    ) : attViewMode === 'list' ? (
                      <div>
                        {/* Table header */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #EBECF0', fontSize: 11, fontWeight: 600, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          <span style={{ flex: 1 }}>Name</span>
                          <span style={{ width: 80, textAlign: 'right' }}>Size</span>
                          <span style={{ width: 170, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                            Date added <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                          </span>
                          <span style={{ width: 64 }} />
                        </div>
                        {/* Rows */}
                        {attachments.map(att => {
                          const publicUrl = supabase.storage.from('attachments').getPublicUrl(att.storage_path).data.publicUrl;
                          const isImage = att.mime_type?.startsWith('image/');
                          const isVideo = att.mime_type?.startsWith('video/');
                          const sizeStr = att.file_size >= 1024 * 1024 ? `${(att.file_size / (1024 * 1024)).toFixed(0)} MB` : `${Math.round(att.file_size / 1024)} KB`;
                          const dateStr = new Date(att.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ', ' + new Date(att.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          return (
                            <div key={att.id} className="group" style={{ display: 'flex', alignItems: 'center', padding: '8px 8px', borderBottom: '1px solid #F4F5F7', transition: 'background 0.1s', cursor: 'default' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Thumbnail */}
                              <div style={{ width: 40, height: 40, borderRadius: 3, border: '1px solid #DFE1E6', overflow: 'hidden', marginRight: 10, flexShrink: 0, background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isImage ? (
                                  <img src={publicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : isVideo ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#42526E"><path d="M8 5v14l11-7z"/></svg>
                                ) : (
                                  <Paperclip size={14} style={{ color: '#97A0AF' }} />
                                )}
                              </div>
                              {/* Name */}
                              <span style={{ flex: 1, fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</span>
                              {/* Size */}
                              <span style={{ width: 80, textAlign: 'right', fontSize: 12, color: '#6B778C' }}>{sizeStr}</span>
                              {/* Date */}
                              <span style={{ width: 170, textAlign: 'right', fontSize: 12, color: '#6B778C' }}>{dateStr}</span>
                              {/* Actions */}
                              <div style={{ width: 64, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                <button onClick={() => window.open(publicUrl, '_blank')} title="Preview" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#97A0AF', padding: 2 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#42526E')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#97A0AF')}
                                ><Eye size={15} /></button>
                                <a href={publicUrl} download={att.file_name} title="Download" style={{ color: '#97A0AF', padding: 2 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = '#42526E')}
                                  onMouseLeave={e => (e.currentTarget.style.color = '#97A0AF')}
                                ><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Strip view — thumbnail cards */
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '8px 0' }}>
                        {attachments.map(att => {
                          const publicUrl = supabase.storage.from('attachments').getPublicUrl(att.storage_path).data.publicUrl;
                          const isImage = att.mime_type?.startsWith('image/');
                          return (
                            <div key={att.id} style={{ width: 140, border: '1px solid #DFE1E6', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                              onClick={() => window.open(publicUrl, '_blank')}
                              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(9,30,66,0.15)')}
                              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                            >
                              <div style={{ width: '100%', height: 80, background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isImage ? <img src={publicUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Paperclip size={20} style={{ color: '#97A0AF' }} />}
                              </div>
                              <div style={{ padding: '6px 8px', borderTop: '1px solid #EBECF0' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#172B4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.file_name}</div>
                                <div style={{ fontSize: 10, color: '#97A0AF', marginTop: 2 }}>{fmtDate(att.created_at)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SectionBlock>

                  {/* 7. V2 COLLAPSIBLE SECTIONS */}
                  {issue && (
                    <>
                      <SubtasksPanel storyKey={issue.issue_key} storyId={issue.id} projectKey={issue.project_key} />
                      <LinkedIssuesSection issueId={issue.id} />
                      <DefectsSection storyKey={issue.issue_key} projectKey={issue.project_key} />
                      <IncidentsSection storyKey={issue.issue_key} />
                      <TestHubSection storyId={issue.id} />
                    </>
                  )}

                  {/* 8. ACTIVITY — Jira-exact */}
                  <div style={{ marginTop: 32 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#292A2E', lineHeight: '20px', margin: 0, padding: 0, marginBottom: 12 }}>Activity</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                      {(['all', 'comments', 'history'] as ActivityTab[]).map(tab => {
                        const isActive = activeActivityTab === tab;
                        const label = tab === 'all' ? 'All' : tab === 'comments' ? 'Comments' : 'History';
                        return (
                          <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                            height: 26, padding: '0 12px',
                            border: isActive ? '0.556px solid #1868DB' : '0.556px solid transparent',
                            borderRadius: 2,
                            background: isActive ? '#E9F2FE' : 'transparent',
                            fontSize: 13.33, fontWeight: 500,
                            color: isActive ? '#1868DB' : '#505258',
                            cursor: 'pointer', transition: 'background 150ms, border-color 150ms, color 150ms',
                            lineHeight: 'normal',
                          }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F0F1F2'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                          >{label}</button>
                        );
                      })}
                      {/* Sort toggle — right-aligned */}
                      <button type="button" onClick={() => {/* toggle sort placeholder */}}
                        style={{
                          marginLeft: 'auto', fontSize: 14, fontWeight: 500, color: '#505258',
                          background: 'transparent', border: 'none', borderRadius: 3, padding: '2px 0',
                          height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        Newest first
                      </button>
                    </div>

                    {/* COMMENTS + ALL tabs share comment input */}
                    {(activeActivityTab === 'comments' || activeActivityTab === 'all') && (
                      <div>
                        {/* AI Summary */}
                        {(commentSummary || commentSummaryLoading) && showCommentSummary && activeActivityTab === 'comments' && (
                          <div style={{ border: '1px solid #DFE1E6', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="13" y2="18"/></svg>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Comments summary</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B778C' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  Only visible to you
                                </span>
                              </div>
                              <button onClick={() => { setShowCommentSummary(false); setCommentSummary(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B778C', display: 'flex' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                            {commentSummaryLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#6B778C', fontSize: 14 }}>
                                <div style={{ width: 16, height: 16, border: '2px solid #DFE1E6', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'sdm-spin 0.8s linear infinite' }} />
                                Summarizing comments…
                              </div>
                            ) : (
                              <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: (commentSummary ?? '').replace(/^[-•]\s*/gm, '').split('\n').filter(l => l.trim()).map((line, i) => {
                                  if (i === 0 && !line.startsWith('•')) return `<p style="margin:0 0 12px">${line}</p><ul style="margin:0;padding-left:20px">`;
                                  return `<li style="margin-bottom:6px;color:#172B4D">${line}</li>`;
                                }).join('') + '</ul>' }}
                              />
                            )}
                          </div>
                        )}

                        {/* Comment input — Rich text editor with image paste */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-start' }}>
                          {currentProfile?.avatar_url ? (
                            <img src={currentProfile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 4 }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{getInitials(currentProfile?.full_name)}</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <RichTextCommentEditor
                              onSubmit={handleCommentSubmit}
                              isSubmitting={addCommentMutation.isPending}
                              placeholder="Add a comment…"
                              teamMembers={mentionMembers}
                              workItemId={itemId}
                            />
                            {/* Quick-reply pills */}
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              {['Status update...', 'Thanks...', 'Agree...'].map(chip => (
                                <button key={chip} type="button"
                                  style={{
                                    display: 'inline-flex', background: 'transparent', border: 'none',
                                    borderRadius: 3, color: '#505258', fontSize: 14, fontWeight: 500,
                                    padding: '2px 12px', height: 24, cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#F0F1F2'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >{chip}</button>
                              ))}
                            </div>
                            {/* Pro tip */}
                            <div style={{ fontSize: 14, fontWeight: 400, color: '#292A2E', lineHeight: '20px', marginTop: 4 }}>
                              Pro tip: press <span style={{ fontWeight: 600 }}>M</span> to comment
                            </div>
                          </div>
                        </div>

                        {/* Comments list */}
                        {activeActivityTab === 'comments' && comments.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>}
                        {activeActivityTab === 'comments' && comments.map(c => (
                          <div key={c.id} style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40 }}>
                            {c.author?.avatar_url ? (
                              <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={c.author.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 9999, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                              </div>
                            ) : (
                              <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #FFFFFF' }}>{getInitials(c.author?.full_name)}</div>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#292A2E' }}>{c.author?.full_name ?? 'Unknown'}</span>
                                <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>commented</span>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 400, color: '#292A2E', lineHeight: '16px' }}>{fmtDate(c.created_at)}</div>

                              {editingCommentId === c.id ? (
                                <RichTextCommentEditor
                                  onSubmit={(html) => editCommentMutation.mutate({ commentId: c.id, body: html })}
                                  onCancel={() => setEditingCommentId(null)}
                                  isSubmitting={editCommentMutation.isPending}
                                  initialValue={c.body}
                                  teamMembers={mentionMembers}
                                  workItemId={itemId}
                                />
                              ) : (
                                <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}
                                  dangerouslySetInnerHTML={{ __html: c.body }}
                                />
                              )}

                              {/* Comment action icons — Jira style */}
                              {editingCommentId !== c.id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, position: 'relative' }}>
                                  {[
                                    { icon: <Reply size={14} />, title: 'Reply', onClick: () => {} },
                                    { icon: <ThumbsUp size={14} />, title: 'Like', onClick: () => {} },
                                    { icon: <Smile size={14} />, title: 'React', onClick: () => {} },
                                    { icon: <Pencil size={14} />, title: 'Edit', onClick: () => setEditingCommentId(c.id) },
                                  ].map((action, idx) => (
                                    <button key={idx} onClick={action.onClick} title={action.title}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                                    >{action.icon}</button>
                                  ))}
                                  {/* 3-dot menu */}
                                  <div style={{ position: 'relative' }}>
                                    <button onClick={() => setCommentMenuId(commentMenuId === c.id ? null : c.id)} title="More"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                                    ><MoreHorizontal size={14} /></button>
                                    {commentMenuId === c.id && (
                                      <div style={{
                                        position: 'absolute', left: 0, top: 28, background: '#FFF', border: '1px solid #DFE1E6',
                                        borderRadius: 6, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', zIndex: 50, minWidth: 160, padding: '4px 0',
                                      }}>
                                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/comment/${c.id}`); setCommentMenuId(null); toast.success('Link copied'); }}
                                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        ><Copy size={14} /> Copy link</button>
                                        <button onClick={() => { deleteCommentMutation.mutate(c.id); setCommentMenuId(null); }}
                                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#DE350B', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        ><Trash2 size={14} /> Delete</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* ALL — interleaved with HISTORY badges */}
                        {activeActivityTab === 'all' && (() => {
                          type ME = { type: 'comment'; data: (typeof comments)[number]; ts: string } | { type: 'history'; data: (typeof activityLog)[number]; ts: string };
                          const merged: ME[] = [
                            ...comments.map(c => ({ type: 'comment' as const, data: c, ts: c.created_at })),
                            ...activityLog.map(e => ({ type: 'history' as const, data: e, ts: e.created_at })),
                          ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
                          if (merged.length === 0) return <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity yet</div>;
                          return merged.map((item) => {
                            if (item.type === 'comment') {
                              const c = item.data;
                              return (
                                <div key={`c-${c.id}`} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                  {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{getInitials(c.author?.full_name)}</div>}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ marginBottom: 4 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{c.author?.full_name ?? 'Unknown'}</span> <span style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(c.created_at)}</span></div>
                                    <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                  </div>
                                </div>
                              );
                            }
                            const e = item.data;
                            return (
                              <div key={`h-${e.id}`} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                {e.actor?.avatar_url ? <img src={e.actor.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg></div>}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{e.actor?.full_name ?? 'System'}</span>{' '}{e.action === 'field_updated' ? <>changed the <span style={{ fontWeight: 600 }}>{e.field_name}</span></> : e.action}</div>
                                  <div style={{ fontSize: 13, color: '#6B778C', marginBottom: 6 }}>{fmtDate(e.created_at)}</div>
                                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#172B4D', border: '1px solid #DFE1E6', borderRadius: 3, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.03em', background: '#F4F5F7' }}>HISTORY</span>
                                  {(e.old_value || e.new_value) && (
                                    <div style={{ marginTop: 8, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      <span style={{ color: '#6B778C' }}>{e.old_value || 'None'}</span>
                                      <span style={{ color: '#97A0AF' }}>→</span>
                                      {e.field_name === 'assignee_display_name' && e.new_value ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{(() => { const avu = avatarsByName.get(e.new_value.toLowerCase()); return avu ? <img src={avu} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(e.new_value), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{getInitials(e.new_value)}</div>; })()}<span style={{ fontWeight: 500 }}>{e.new_value}</span></span> : <span style={{ fontWeight: 500 }}>{e.new_value || 'None'}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeActivityTab === 'history' && (
                      <div>
                        {activityLog.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>}
                        {activityLog.map(entry => (
                          <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                            {entry.actor?.avatar_url ? <img src={entry.actor.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg></div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{entry.actor?.full_name ?? 'System'}</span>{' '}{entry.action === 'field_updated' ? <>changed the <span style={{ fontWeight: 600 }}>{entry.field_name}</span></> : entry.action}</div>
                              <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</div>
                              {(entry.old_value || entry.new_value) && (
                                <div style={{ marginTop: 10, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ color: '#6B778C' }}>{entry.old_value || 'Unassigned'}</span>
                                  <span style={{ color: '#97A0AF' }}>→</span>
                                  {entry.field_name === 'assignee_display_name' && entry.new_value ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{(() => { const avu = avatarsByName.get(entry.new_value.toLowerCase()); return avu ? <img src={avu} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(entry.new_value), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{getInitials(entry.new_value)}</div>; })()}<span style={{ fontWeight: 500 }}>{entry.new_value}</span></span> : <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* RESIZABLE SPLITTER — neutral grey, no blue tint */}
            <div
              ref={splitterRef}
              onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              style={{
                width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 1.5, height: 32, borderRadius: 1, background: '#DFE1E6', transition: 'background 0.15s' }} />
            </div>

            {/* RIGHT PANEL — Sidebar details */}
            <div style={{
              width: rightPanelWidth, minWidth: 220, maxWidth: 480,
              background: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status */}
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                    backgroundColor: statusStyle.bg, color: statusStyle.text,
                    padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 700,
                    border: 'none', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: 6, fontFamily: 'inherit', lineHeight: 1,
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {(localStatus || 'Backlog').toUpperCase()}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {showStatusDropdown && (
                    <div onKeyDown={e => { if (e.key === 'Escape') setShowStatusDropdown(false); }} style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#FFFFFF', borderRadius: 4, border: 'none', boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)', padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto', animation: 'sdm-slide-down 0.15s ease-out' }}>
                      {STATUS_OPTION_GROUPS.map(group => (
                        <div key={group.category}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4 }}>{group.groupLabel}</div>
                          {group.statuses.map(st => {
                            const isActive = localStatus === st;
                            const cat = group.category as 'todo' | 'in_progress' | 'done';
                            const lozengeStyle = cat === 'done' ? { background: '#E3FCEF', color: '#006644' } : cat === 'in_progress' ? { background: '#DEEBFF', color: '#0747A6' } : { background: '#DFE1E6', color: '#253858' };
                            return (
                              <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); updateStatusMutation.mutate(st); }} style={{
                                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                              }}
                                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              >
                                <span style={{ ...lozengeStyle, display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{st}</span>
                                {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
                      <div onClick={() => { setShowStatusDropdown(false); setShowWorkflow(true); }}
                        style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#172B4D', transition: 'background 80ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >View workflow</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
                </div>

                {/* Fix versions — Jira-parity editable dropdown */}
                <div style={{ marginBottom: 14, position: 'relative' }} ref={fixVersionDropdownRef}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Fix versions</div>
                  {/* Selected versions + trigger */}
                  <div
                    onClick={() => setShowFixVersionDropdown(!showFixVersionDropdown)}
                    style={{
                      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                      padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      minHeight: 32, transition: 'background 0.12s',
                      border: showFixVersionDropdown ? '2px solid #4C9AFF' : '2px solid transparent',
                      background: showFixVersionDropdown ? '#FFFFFF' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {fixVersionNames.length > 0 ? (
                      fixVersionNames.map((v: string, i: number) => (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
                          background: '#DEEBFF', color: '#0747A6',
                        }}>
                          {v}
                          <button onClick={e => { e.stopPropagation(); handleToggleFixVersion(v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#0747A6' }}>
                            <X size={10} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#6B778C', fontSize: 14 }}>None</span>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showFixVersionDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100,
                      maxHeight: 320, overflow: 'hidden',
                    }}>
                      {/* Search */}
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
                        <input
                          autoFocus
                          value={fixVersionSearch}
                          onChange={e => setFixVersionSearch(e.target.value)}
                          placeholder="Search versions..."
                          style={{
                            width: '100%', border: '1px solid #DFE1E6', borderRadius: 4,
                            padding: '6px 10px', fontSize: 13, color: '#172B4D', outline: 'none',
                            fontFamily: 'inherit',
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
                        />
                      </div>
                      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {versionsLoading && <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>Loading...</div>}

                        {/* Unreleased */}
                        {(() => {
                          const filtered = unreleasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                          if (filtered.length === 0) return null;
                          return (
                            <>
                              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unreleased</div>
                              {filtered.map(v => {
                                const isSelected = fixVersionNames.includes(v.name);
                                return (
                                  <div
                                    key={v.name}
                                    onClick={() => handleToggleFixVersion(v.name)}
                                    style={{
                                      padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      background: isSelected ? '#DEEBFF' : 'transparent',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                                  >
                                    <span>{v.name}</span>
                                    {isSelected && <Check size={14} color="#0747A6" />}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}

                        {/* Released */}
                        {(() => {
                          const filtered = releasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                          if (filtered.length === 0) return null;
                          return (
                            <>
                              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em', borderTop: '1px solid #F4F5F7' }}>Released</div>
                              {filtered.map(v => {
                                const isSelected = fixVersionNames.includes(v.name);
                                return (
                                  <div
                                    key={v.name}
                                    onClick={() => handleToggleFixVersion(v.name)}
                                    style={{
                                      padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      background: isSelected ? '#DEEBFF' : 'transparent',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                                  >
                                    <span>{v.name}</span>
                                    {isSelected && <Check size={14} color="#0747A6" />}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}

                        {!versionsLoading && unreleasedVersions.length === 0 && releasedVersions.length === 0 && (
                          <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No versions found for this project</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignee — Jira parity: avatar + name, no "Assign to me" link */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Assignee</div>
                  {issue && (
                    <EditableAssignee issueId={issue.id} projectId={projectId} currentAssigneeId={issue.assignee_account_id} currentAssigneeName={issue.assignee_display_name}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />
                  )}
                </div>

                {/* Reporter — Jira parity: 28px avatar with real image, 14px name */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
                    {issue?.reporter_display_name ? (
                      <>
                        {reporterProfile?.avatar_url ? (
                          <img src={reporterProfile.avatar_url} alt={issue.reporter_display_name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{getInitials(issue.reporter_display_name)}</span>
                        )}
                        <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{issue.reporter_display_name}</span>
                      </>
                    ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
                  </div>
                </div>

                {/* Labels */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Labels</div>
                  {issue && <EditableLabels issueId={issue.id} currentLabels={labelsArray} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                </div>
              </div>

              {/* Timestamps — bottom */}
              <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
                <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(issue?.jira_created_at)}
                </div>
                <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ────────────────────────── */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw', animation: 'sdm-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>This ticket will be soft-deleted. It can be restored from the admin panel within 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); deleteIssueMutation.mutate(); }} style={{ padding: '7px 16px', borderRadius: 4, background: '#DE350B', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showWorkflow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ background: '#FFF', borderRadius: 8, width: 820, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #DFE1E6' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#172B4D' }}>Workflow — {issue?.issue_type ?? 'Story'} Issue Type</span>
              <button onClick={() => setShowWorkflow(false)} style={{ width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#5E6C84' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', gap: 16, borderBottom: '1px solid #DFE1E6', fontSize: 12 }}>
              <span><span style={{ color: '#5E6C84' }}>Issue Type</span> <span style={{ fontWeight: 600 }}>{issue?.issue_type}</span></span>
              <span><span style={{ color: '#5E6C84' }}>Current Status</span> <JiraStatusPill status={localStatus} category={statusCategory} /></span>
            </div>
            <div style={{ padding: '8px 20px', fontSize: 11, color: '#97A0AF', borderBottom: '1px solid #DFE1E6' }}>Transitions are open — any status can move to any.</div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, textAlign: 'center', color: '#97A0AF', fontSize: 13 }}>
              Workflow visualization — coming soon
            </div>
          </div>
        </div>
      )}

      {/* AI Regen Confirm */}
      {showAiRegenConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }} onClick={() => setShowAiRegenConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 8, padding: 28, width: 400, maxWidth: '95vw', animation: 'sdm-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#172B4D', marginBottom: 8 }}>Regenerate AI output?</h3>
            <p style={{ fontSize: 13, color: '#5E6C84', lineHeight: 1.6, marginBottom: 20 }}>Your edits will be discarded. This cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAiRegenConfirm(false)} style={{ padding: '7px 16px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
              <button onClick={() => doAiGenerate()} style={{ padding: '7px 16px', borderRadius: 4, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Regenerate</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}