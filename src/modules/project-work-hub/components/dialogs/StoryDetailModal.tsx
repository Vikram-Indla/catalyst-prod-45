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
  ExternalLink, Share2, Pencil, Search, MessageSquare, Clock,
  GripVertical, Edit2, Link2, Trash2, Check,
  Eye, EyeOff, Sparkles, Loader2, RotateCcw, Settings2, AlertTriangle,
} from 'lucide-react';

// Ring-fenced CSS for extension components
import './story-detail-extensions.css';

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

import { ChildIssuesSection } from './story-detail-modules';
import { DefectsSection } from './story-detail-modules';
import { IncidentsSection } from './story-detail-modules';
import { TestHubSection } from './story-detail-modules';
import { LinkedIssuesSection } from './story-detail-modules';
import { EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker } from './story-detail-modules';

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
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function StoryDetailModal({
  isOpen, onClose, itemId, projectId, projectKey, onOpenItem,
}: StoryDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  const { data: comments = [] } = useQuery({
    queryKey: ['ph-comments', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_comments').select('id, work_item_id, body, author_id, created_at, updated_at').eq('work_item_id', itemId).order('created_at', { ascending: true });
      return (data ?? []) as unknown as PhComment[];
    },
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['ph-activity-log', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_activity_log').select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      return (data ?? []) as unknown as PhActivityLog[];
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

  /* ── LOCAL STATE ───────────────────────────── */
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaError, setFigmaError] = useState('');
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

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
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); },
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
    onSuccess: () => { toast.success('Updated'); queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); },
    onError: () => toast.error('Failed to update'),
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const { error } = await supabase.from('ph_issues').update({ assignee_account_id: userId, assignee_display_name: displayName }).eq('id', itemId);
      if (error) throw error;
      await supabase.from('jira_write_back_queue').insert({ ph_issue_id: itemId, field_name: 'assignee', new_value: userId, status: 'approved' });
    },
    onSuccess: () => { toast.success('Assignee updated'); queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); },
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

  const handleCommentSubmit = () => { if (newComment.trim()) addCommentMutation.mutate(newComment); };
  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleCommentSubmit(); } };

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
    if (descriptionRef.current) descriptionRef.current.innerText = newDesc;
  }, [updateFieldMutation]);

  const handleApplyAC = useCallback(async (newAC: string, _prev: string) => {
    setAcceptanceCriteria(newAC);
    await supabase.from('ph_issues').update({ acceptance_criteria: newAC }).eq('id', itemId);
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    toast.success('Acceptance criteria updated by AI');
  }, [itemId, queryClient]);

  const handleAiGenerate = useCallback(async () => {
    if (aiGenerating) return;
    if (aiEdited && aiOutput) {
      if (!confirm('Regenerating will discard your edits. Continue?')) return;
    }
    setAiGenerating(true); setAiError(null); setAiOutput(null); setAiEdited(false);
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
  }, [aiGenerating, aiEdited, aiOutput, aiImproveType, aiFocusHint, itemId, issue, acceptanceCriteria]);

  const handleParentChange = useCallback(async (newParentKey: string | null) => {
    await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    toast.success('Parent updated');
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

  if (!isOpen) return null;

  /* ═════════════════════════════════════════════
     RENDER — Jira-parity layout
     ═════════════════════════════════════════════ */

  const OVERLAY: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'rgba(9, 30, 66, 0.54)',
    padding: '40px 16px',
    overflowY: 'auto',
    animation: 'sdm-overlay-in 200ms ease-out',
  };

  const MODAL: React.CSSProperties = {
    width: 980, maxWidth: '95vw',
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
      <div style={OVERLAY} onClick={onClose}>
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
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#5E6C84' }}>{issue?.project_key ?? projectKey}</span>
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
              <div style={{ position: 'relative' }}>
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
                    onBlur={e => { const newTitle = e.currentTarget.textContent?.trim() ?? ''; if (newTitle && newTitle !== issue?.summary) { updateFieldMutation.mutate({ field: 'summary', value: newTitle, oldValue: issue?.summary ?? '' }); } }}
                    style={{
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      fontSize: 22, fontWeight: 700, color: '#172B4D', lineHeight: 1.3,
                      margin: '0 0 12px', outline: 'none', cursor: 'text', borderRadius: 3,
                      padding: '2px 4px', wordBreak: 'break-word', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
                          <button onClick={() => { setShowAddMenu(false); toast('Create Subtask — use Child Issues section below'); }} style={menuItemStyle}>Create Subtask</button>
                          <button onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }} style={menuItemStyle}>Add Attachment</button>
                          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachmentMutation.mutate(f); e.target.value = ''; }} />
                          <button onClick={() => { setShowAddMenu(false); setShowFigmaInput(true); }} style={menuItemStyle}>Add Design (Figma)</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setAiPanelOpen(o => !o); setAiOutput(null); setAiError(null); }} style={{
                      width: 28, height: 28, border: '1px solid #DFE1E6', background: '#FAFBFC',
                      borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#5E6C84', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; }}
                      title="AI Improve Story"
                    ><Sparkles size={14} /></button>
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
                            {issue && <ParentFieldPicker storyKey={issue.issue_key} parentKey={issue.parent_key} projectKey={issue.project_key} onParentChange={handleParentChange} />}
                          </div>
                        </div>
                        {/* Priority field */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                          <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Priority</span>
                          <div style={{ flex: 1 }}>
                            {issue && <EditablePriority issueId={issue.id} currentPriority={localPriority} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                          </div>
                        </div>

                        {/* Description */}
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#172B4D', marginBottom: 10 }}>Description</div>
                        <div style={{ border: '1px solid #DFE1E6', borderRadius: 4, overflow: 'hidden' }}>
                          {/* Toolbar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 1, padding: '5px 10px', borderBottom: '1px solid #EBECF0', background: '#FAFBFC', flexWrap: 'wrap' }}>
                            {[
                              { cmd: 'bold', label: 'B', fw: 'bold' as const, fs: 'normal' as const, td: 'none' },
                              { cmd: 'italic', label: 'I', fw: 'normal' as const, fs: 'italic' as const, td: 'none' },
                              { cmd: 'underline', label: 'U', fw: 'normal' as const, fs: 'normal' as const, td: 'underline' },
                              { cmd: 'strikeThrough', label: 'S', fw: 'normal' as const, fs: 'normal' as const, td: 'line-through' },
                            ].map(btn => (
                              <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); document.execCommand(btn.cmd); }}
                                style={{ width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#344054', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: btn.fw, fontStyle: btn.fs, textDecoration: btn.td, transition: 'background 0.12s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >{btn.label}</button>
                            ))}
                            <div style={{ width: 1, height: 18, background: '#DFE1E6', margin: '0 6px' }} />
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList'); }}
                              style={{ width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#344054', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >•</button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList'); }}
                              style={{ width: 28, height: 28, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#344054', background: 'transparent', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#EBECF0')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >1.</button>
                          </div>
                          {/* Description content area — supports 5000+ words */}
                          <div ref={descriptionRef} contentEditable suppressContentEditableWarning
                            onBlur={(e) => { const newText = e.currentTarget.innerText; if (newText !== (issue?.description_text ?? '')) { updateFieldMutation.mutate({ field: 'description_text', value: newText, oldValue: issue?.description_text ?? '' }); } }}
                            data-placeholder="Add a description..."
                            style={{ minHeight: 200, maxHeight: 600, overflowY: 'auto', padding: '14px 16px', fontSize: 14, color: '#172B4D', lineHeight: 1.6, outline: 'none', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", wordBreak: 'break-word' }}
                            dangerouslySetInnerHTML={{ __html: issue?.description_text ?? '' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid #EBECF0', background: '#FAFBFC' }}>
                            <span style={{ fontSize: 11, color: '#97A0AF' }}>Tip: <kbd style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: 3, padding: '1px 4px' }}>Ctrl+B</kbd> bold</span>
                            <span style={{ fontSize: 11, color: '#97A0AF' }}>Auto-saved</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. ACCEPTANCE CRITERIA */}
                  <div className="sdm-ac-section">
                    <div className="sdm-ac-header"><span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Acceptance Criteria</span></div>
                    <div className="sdm-ac-body" contentEditable suppressContentEditableWarning
                      onBlur={e => { const newAC = e.currentTarget.innerText.trim(); if (newAC !== acceptanceCriteria) { setAcceptanceCriteria(newAC); supabase.from('ph_issues').update({ acceptance_criteria: newAC }).eq('id', itemId).then(() => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); }); } }}>
                      {acceptanceCriteria || <span className="sdm-ac-empty">No acceptance criteria defined · Add manually or use AI →</span>}
                    </div>
                  </div>

                  {/* 6. ATTACHMENTS */}
                  {attachments.length > 0 && (
                    <div style={{ marginBottom: 24, marginTop: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Attachments</span>
                          <span style={{ background: '#DFE1E6', color: '#5E6C84', fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10 }}>{attachments.length}</span>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E6C84', padding: '4px 8px', borderRadius: 4, fontSize: 13, transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        ><Plus size={14} /></button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {attachments.map(att => (
                          <div key={att.id} style={{ width: 140, border: '1px solid #DFE1E6', borderRadius: 4, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(9,30,66,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                          >
                            <div style={{ width: '100%', height: 80, background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#97A0AF', fontSize: 24 }}>
                              <Paperclip size={20} />
                            </div>
                            <div style={{ padding: '6px 8px', borderTop: '1px solid #EBECF0' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#172B4D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.file_name}</div>
                              <div style={{ fontSize: 10, color: '#97A0AF', marginTop: 2 }}>{fmtDate(att.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 7. V2 COLLAPSIBLE SECTIONS */}
                  {issue && (
                    <>
                      <ChildIssuesSection storyKey={issue.issue_key} storyId={issue.id} projectKey={issue.project_key} />
                      <DefectsSection storyKey={issue.issue_key} projectKey={issue.project_key} />
                      <IncidentsSection storyKey={issue.issue_key} />
                      <TestHubSection storyId={issue.id} />
                      <LinkedIssuesSection issueId={issue.id} />
                    </>
                  )}

                  {/* 8. ACTIVITY */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#172B4D', marginBottom: 14 }}>Activity</div>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                      {(['comments', 'history'] as ActivityTab[]).map(tab => {
                        const isActive = activeActivityTab === tab;
                        return (
                          <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                            padding: '5px 12px', borderRadius: 20, border: 'none',
                            background: isActive ? '#DEEBFF' : 'none',
                            fontSize: 13, fontWeight: 500,
                            color: isActive ? '#0052CC' : '#5E6C84',
                            cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#EBECF0'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#DEEBFF' : 'none'; }}
                          >
                            {tab === 'comments' ? <><MessageSquare size={12} />Comments</> : <><Clock size={12} />History</>}
                          </button>
                        );
                      })}
                    </div>
                    {activeActivityTab === 'comments' && (
                      <div>
                        {comments.length === 0 && <div style={{ padding: '20px 0', color: '#97A0AF', fontSize: 13, textAlign: 'center' }}>No comments yet</div>}
                        {comments.map(c => {
                          const bg = getAvatarColor(c.author_id);
                          return (
                            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{getInitials(c.author?.full_name)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#172B4D' }}>{c.author?.full_name ?? 'Unknown'}</span>
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#97A0AF' }}>{fmtDate(c.created_at)}</span>
                                </div>
                                <div style={{ background: '#F4F5F7', border: '1px solid #EBECF0', borderRadius: 4, padding: 12, fontSize: 13, color: '#172B4D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                  <button style={{ fontSize: 11, color: '#97A0AF', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                                  <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ fontSize: 11, color: '#97A0AF', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* Comment input */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{getInitials(currentProfile?.full_name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ border: '1px solid #DFE1E6', borderRadius: 4, overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                              onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76,154,255,0.2)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={handleCommentKeyDown}
                                placeholder="Add a comment…"
                                style={{ width: '100%', minHeight: 60, padding: '10px 12px', border: 'none', outline: 'none', fontSize: 14, color: '#172B4D', resize: 'none', fontFamily: 'inherit', background: '#FAFBFC' }} />
                              <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#FAFBFC', borderTop: '1px solid #EBECF0', flexWrap: 'wrap' }}>
                                <button onClick={() => setNewComment('Status update: ')} style={{ padding: '4px 10px', border: '1px solid #DFE1E6', borderRadius: 3, background: '#FFFFFF', fontSize: 12, color: '#5E6C84', cursor: 'pointer', transition: 'background 0.15s' }}>Status update...</button>
                                <button onClick={() => setNewComment('Thanks! ')} style={{ padding: '4px 10px', border: '1px solid #DFE1E6', borderRadius: 3, background: '#FFFFFF', fontSize: 12, color: '#5E6C84', cursor: 'pointer', transition: 'background 0.15s' }}>Thanks...</button>
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#97A0AF', marginTop: 8 }}>
                              <strong style={{ fontWeight: 700, color: '#5E6C84' }}>Pro tip:</strong> press <kbd style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: '#F4F5F7', border: '1px solid #DFE1E6', borderRadius: 3, padding: '1px 4px' }}>Ctrl+Enter</kbd> to submit
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeActivityTab === 'history' && (
                      <div>
                        {activityLog.length === 0 && <div style={{ padding: '20px 0', color: '#97A0AF', fontSize: 13, textAlign: 'center' }}>No activity recorded</div>}
                        {activityLog.map(entry => (
                          <div key={entry.id} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C1C7D0', flexShrink: 0, marginTop: 6 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: '#172B4D', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 600 }}>{entry.actor?.full_name ?? 'System'}</span>
                                {' changed '}<span style={{ fontWeight: 500 }}>{entry.field_name ?? entry.action}</span>
                                {entry.old_value && <> from <span style={{ textDecoration: 'line-through', color: '#97A0AF' }}>{entry.old_value}</span></>}
                                {entry.new_value && <> to <span style={{ fontWeight: 600, color: '#0052CC' }}>{entry.new_value}</span></>}
                              </div>
                              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: '#97A0AF', marginTop: 2 }}>{fmtDate(entry.created_at)}</div>
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
              background: '#FFFFFF', overflowY: 'auto', overflowX: 'visible',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status */}
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
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
                    <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '8px 0', zIndex: 100, minWidth: 200, maxHeight: 300, overflowY: 'auto' }}>
                      {STATUS_OPTION_GROUPS.map(group => (
                        <div key={group.category}>
                          <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.groupLabel}</div>
                          {group.statuses.map(st => {
                            const isActive = localStatus === st;
                            const stStyle = getStatusStyle(st, group.category);
                            return (
                              <button key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); updateStatusMutation.mutate(st); }} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 14px',
                                background: isActive ? '#F4F5F7' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, color: '#172B4D',
                                transition: 'background 0.15s',
                              }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F4F5F7'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? '#F4F5F7' : 'transparent'; }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stStyle.bg, border: stStyle.bg === '#F4F5F7' ? '1px solid #C1C7D0' : 'none' }} />
                                  <span style={{ fontWeight: isActive ? 600 : 400 }}>{st}</span>
                                </span>
                                {isActive && <span style={{ color: '#0052CC', fontWeight: 700 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />
                      <div onClick={() => { setShowStatusDropdown(false); setShowWorkflow(true); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#5E6C84', transition: 'background 0.15s' }}
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
                  <ChevronDown size={14} color="#5E6C84" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Details</span>
                </div>

                {/* Fix versions */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6C84', marginBottom: 4 }}>Fix versions</div>
                  {fixVersionNames.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {fixVersionNames.map((v: string, i: number) => (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F4F5F7', color: '#5E6C84' }}>{v}</span>
                      ))}
                    </div>
                  ) : <span style={{ color: '#97A0AF', fontSize: 13, fontStyle: 'italic' }}>None</span>}
                </div>

                {/* Assignee */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6C84', marginBottom: 4 }}>Assignee</div>
                  {issue && (
                    <EditableAssignee issueId={issue.id} projectId={projectId} currentAssigneeId={issue.assignee_account_id} currentAssigneeName={issue.assignee_display_name}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />
                  )}
                  <button onClick={assignToMe} style={{ display: 'inline-block', fontSize: 12, color: '#0052CC', cursor: 'pointer', textDecoration: 'none', background: 'none', border: 'none', padding: '2px 0', marginTop: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >Assign to me</button>
                </div>

                {/* Reporter */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6C84', marginBottom: 4 }}>Reporter</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 6px', borderRadius: 3 }}>
                    {issue?.reporter_display_name ? (
                      <>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{getInitials(issue.reporter_display_name)}</span>
                        <span style={{ fontSize: 13, color: '#172B4D', fontWeight: 500 }}>{issue.reporter_display_name}</span>
                      </>
                    ) : <span style={{ color: '#97A0AF', fontSize: 13 }}>—</span>}
                  </div>
                </div>

                {/* Labels */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6C84', marginBottom: 4 }}>Labels</div>
                  {issue && <EditableLabels issueId={issue.id} currentLabels={labelsArray} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                </div>
              </div>

              {/* Timestamps — bottom */}
              <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
                <div style={{ fontSize: 11, color: '#97A0AF', marginBottom: 6, lineHeight: 1.6 }}>
                  <span style={{ color: '#5E6C84' }}>Created</span> {fmtDate(issue?.jira_created_at)}
                </div>
                <div style={{ fontSize: 11, color: '#97A0AF', lineHeight: 1.6 }}>
                  <span style={{ color: '#5E6C84' }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
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
    </>
  );
}