/**
 * StoryDetailModal — V12 Full Parity Rebuild
 * Jira-style two-panel detail modal for work items.
 * Data source: ph_issues + ph_issue_links + ph_comments + ph_activity_log + ph_attachments
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  X, Eye, EyeOff, Link2, MoreHorizontal, Copy, Archive, Trash2,
  Zap, ChevronDown, ChevronRight, Plus, Flag, Paperclip, FileText,
  Image as ImageIcon, File as FileIcon, ExternalLink, Maximize2,
  Share2, Sparkles, Settings, Pencil, ListFilter,
  ChevronsUp, ChevronUp, Minus, ChevronsDown,
} from 'lucide-react';

/* ═══════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════ */
interface StoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  projectId: string;
  projectKey: string;
  onOpenItem?: (itemId: string) => void;
}

/* ═══════════════════════════════════════════════
   V12 DESIGN TOKENS (hex only — no HSL)
   ═══════════════════════════════════════════════ */
const V = {
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  headerBg: '#F4F5F7',
  border: '#E2E8F0',
  borderSubtle: '#DFE1E6',
  insetBg: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#CBD5E1',
  linkBlue: '#0052CC',
  primaryBlue: '#2563EB',
  aiPurple: '#7C3AED',
  successGreen: '#16A34A',
  dangerRed: '#DE350B',
  progressGreen: '#36B37E',
  epicChipBg: '#EAE6FF',
  epicChipText: '#5243AA',
  hoverRow: 'rgba(0,0,0,0.04)',
  // StatusLozenge 3-color guardrail
  lozengeGreyBg: '#DFE1E6', lozengeGreyText: '#253858',
  lozengeBlueBg: '#DEEBFF', lozengeBlueText: '#0747A6',
  lozengeGreenBg: '#E3FCEF', lozengeGreenText: '#006644',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#AE2A19', highest: '#AE2A19', high: '#DE350B',
  medium: '#CF7B00', low: '#36B37E', lowest: '#6B778C',
};

const STATUS_OPTIONS = [
  { label: 'To Do', category: 'todo' },
  { label: 'In Requirements', category: 'todo' },
  { label: 'In Progress', category: 'in_progress' },
  { label: 'In Review', category: 'in_progress' },
  { label: 'Done', category: 'done' },
  { label: 'On Hold', category: 'todo' },
];

const LINK_TYPES = [
  { value: 'is_implemented_by', label: 'is implemented by' },
  { value: 'blocks', label: 'blocks' },
  { value: 'is_blocked_by', label: 'is blocked by' },
  { value: 'relates_to', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
  { value: 'clones', label: 'clones' },
];

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function getStatusCategory(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'completed', 'approved', 'closed', 'released'].some(k => lower.includes(k))) return 'done';
  if (['progress', 'review', 'beta', 'active', 'development', 'requirements'].some(k => lower.includes(k))) return 'in_progress';
  return 'todo';
}

function getLozengeColors(status: string, category?: string | null) {
  const cat = category?.toLowerCase() || getStatusCategory(status);
  if (cat === 'done' || cat === 'complete') return { bg: V.lozengeGreenBg, color: V.lozengeGreenText };
  if (cat === 'in_progress' || cat === 'inprogress') return { bg: V.lozengeBlueBg, color: V.lozengeBlueText };
  return { bg: V.lozengeGreyBg, color: V.lozengeGreyText };
}

function StatusLozenge({ status, category }: { status: string; category?: string | null }) {
  const s = getLozengeColors(status, category);
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
    }}>{status}</span>
  );
}

function initials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function AvatarCircle({ name, size = 24 }: { name?: string | null; size?: number }) {
  let hash = 0;
  const n = name || '';
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
  const bg = colors[Math.abs(hash) % colors.length];
  return (
    <div title={name || undefined} style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function PriorityIcon({ priority }: { priority?: string | null }) {
  const p = (priority || 'medium').toLowerCase();
  const c = PRIORITY_COLORS[p] || '#CF7B00';
  if (p === 'highest' || p === 'critical') return <ChevronsUp size={16} color="#AE2A19" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'high') return <ChevronUp size={16} color="#DE350B" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'low') return <ChevronDown size={16} color="#36B37E" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'lowest') return <ChevronsDown size={16} color="#6B778C" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  // Medium — amber equals sign
  return (
    <span style={{ fontSize: 18, fontWeight: 700, color: '#D97706', lineHeight: 1, flexShrink: 0 }}>=</span>
  );
}

function relTime(d: string | null | undefined): string {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
}

function formatFullDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(d));
  } catch { return '—'; }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ═══════════════════════════════════════════════
   CANONICAL WORK ITEM SVG ICONS
   ═══════════════════════════════════════════════ */
function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A" /><circle cx="8" cy="8" r="3" fill="#fff" /></svg>
  );
  if (t.includes('epic')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#904EE2" /><path d="M9 3L6 8.5h4L7 13" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('sub')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('task')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('improvement') || t.includes('new_feature')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#63BA3C" /><path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth="1.5" /></svg>
  );
  // Story (default)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#63BA3C" /><path d="M5 4v8l3-2 3 2V4H5z" fill="#fff" /></svg>
  );
}

/* ═══════════════════════════════════════════════
   JIRA WRITE-BACK
   ═══════════════════════════════════════════════ */
async function enqueueWriteBack(phIssueId: string, fieldName: string, newValue: string) {
  try {
    await supabase.from('jira_write_back_queue').insert({
      ph_issue_id: phIssueId,
      field_name: fieldName,
      new_value: newValue,
      operation: 'UPDATE',
      push_status: 'pending',
    });
  } catch { /* non-critical */ }
}

/* ═══════════════════════════════════════════════
   COLLAPSIBLE SECTION
   ═══════════════════════════════════════════════ */
function Section({ title, count, defaultOpen = false, actions, children }: {
  title: string; count?: number; defaultOpen?: boolean;
  actions?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 0', borderBottom: `0.75px solid ${V.border}`,
          cursor: 'pointer', userSelect: 'none',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown size={14} color={V.textMuted} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform 200ms ease' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: V.textPrimary }}>{title}</span>
          {count !== undefined && (
            <span style={{ background: V.insetBg, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600, color: V.textMuted }}>{count}</span>
          )}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      <div style={{
        maxHeight: open ? 2000 : 0, overflow: 'hidden',
        transition: 'max-height 200ms ease',
      }}>
        {open && <div style={{ paddingTop: 8 }}>{children}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function StoryDetailModal({
  isOpen, onClose, itemId, projectId, projectKey, onOpenItem,
}: StoryDetailModalProps) {
  const qc = useQueryClient();

  // ── STATE ─────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'history' | 'worklog' | 'sla_history' | 'timepiece'>('all');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkType, setLinkType] = useState('relates_to');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<any[]>([]);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [editingSP, setEditingSP] = useState(false);
  const [spDraft, setSpDraft] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── BODY SCROLL LOCK + KEYBOARD ───────────────
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'm' || e.key === 'M') {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          commentInputRef.current?.focus();
        }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  // ── OUTSIDE CLICK FOR DROPDOWNS ───────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (statusOpen && statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
      if (priorityOpen && priorityRef.current && !priorityRef.current.contains(e.target as Node)) setPriorityOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen, statusOpen, priorityOpen]);

  // ── PRIMARY QUERY ─────────────────────────────
  const { data: story, isLoading, isError, refetch } = useQuery({
    queryKey: ['ph_issue_detail', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!itemId,
  });

  // ── SUBTASKS ──────────────────────────────────
  const { data: subtasks = [] } = useQuery({
    queryKey: ['ph_subtasks', story?.issue_key],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, assignee_display_name, story_points, priority, status_category, issue_type')
        .eq('parent_key', story!.issue_key)
        .is('deleted_at', null)
        .order('jira_created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!story?.issue_key,
  });

  // ── LINKS ─────────────────────────────────────
  const { data: rawLinks = [] } = useQuery({
    queryKey: ['ph_issue_links', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issue_links')
        .select('id, source_id, target_id, link_type')
        .or(`source_id.eq.${itemId},target_id.eq.${itemId}`);
      return data ?? [];
    },
    enabled: !!itemId,
  });

  const { data: linkedIssues = [] } = useQuery({
    queryKey: ['ph_linked_issues', rawLinks.map(l => l.id).join(',')],
    queryFn: async () => {
      const otherIds = rawLinks.map(l => l.source_id === itemId ? l.target_id : l.source_id);
      if (!otherIds.length) return [];
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, priority, status_category, assignee_display_name, issue_type')
        .in('id', otherIds);
      return (data ?? []).map(issue => {
        const link = rawLinks.find(l => l.source_id === issue.id || l.target_id === issue.id);
        return { ...issue, linkId: link?.id, linkType: link?.link_type };
      });
    },
    enabled: rawLinks.length > 0,
  });

  // ── COMMENTS ──────────────────────────────────
  const { data: nativeComments = [] } = useQuery({
    queryKey: ['ph_comments', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, body, created_at, author_id')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      return (data ?? []).map(c => ({ ...c, source: 'catalyst' as const }));
    },
    enabled: !!itemId,
  });

  const { data: jiraComments = [] } = useQuery({
    queryKey: ['jira_comments', story?.issue_key],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_sync_comments')
        .select('id, body, jira_created_at, author_display_name')
        .eq('issue_key', story!.issue_key)
        .order('jira_created_at', { ascending: true });
      return (data ?? []).map(c => ({
        ...c, source: 'jira' as const,
        created_at: c.jira_created_at,
        author_name: c.author_display_name,
      }));
    },
    enabled: !!story?.issue_key,
  });

  const allComments = useMemo(() => {
    const merged = [
      ...nativeComments.map(c => ({ id: c.id, body: c.body, author: c.author_id || 'You', time: c.created_at, src: 'catalyst' })),
      ...jiraComments.map(c => ({ id: c.id, body: c.body, author: c.author_name || 'Jira User', time: c.created_at, src: 'jira' })),
    ];
    merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return merged;
  }, [nativeComments, jiraComments]);

  // ── HISTORY ───────────────────────────────────
  const { data: nativeHistory = [] } = useQuery({
    queryKey: ['ph_activity', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, action, field_name, old_value, new_value, created_at, user_id')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      return (data ?? []).map(h => ({ ...h, source: 'catalyst' as const }));
    },
    enabled: !!itemId,
  });

  const { data: jiraHistory = [] } = useQuery({
    queryKey: ['jira_changelog', story?.issue_key],
    queryFn: async () => {
      const { data } = await supabase
        .from('jira_sync_changelog')
        .select('id, field_name, from_string, to_string, jira_created_at, author_display_name')
        .eq('issue_key', story!.issue_key)
        .order('jira_created_at', { ascending: false });
      return (data ?? []).map(h => ({ ...h, source: 'jira' as const }));
    },
    enabled: !!story?.issue_key,
  });

  const allHistory = useMemo(() => {
    const merged = [
      ...nativeHistory.map(h => ({
        id: h.id, author: h.user_id || 'System', field: h.field_name,
        from: h.old_value, to: h.new_value, time: h.created_at, src: 'catalyst',
      })),
      ...jiraHistory.map(h => ({
        id: h.id, author: h.author_display_name || 'Jira', field: h.field_name,
        from: h.from_string, to: h.to_string, time: h.jira_created_at, src: 'jira',
      })),
    ];
    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return merged;
  }, [nativeHistory, jiraHistory]);

  // ── ATTACHMENTS ───────────────────────────────
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['story-detail-attachments', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_attachments')
        .select('*')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!itemId,
  });

  // ── WATCHERS ──────────────────────────────────
  useEffect(() => {
    if (!isOpen || !itemId) return;
    (async () => {
      const { count } = await supabase
        .from('ph_watchers')
        .select('*', { count: 'exact', head: true })
        .eq('work_item_id', itemId);
      setWatcherCount(count ?? 0);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('ph_watchers')
          .select('work_item_id')
          .eq('work_item_id', itemId)
          .eq('user_id', user.id)
          .maybeSingle();
        setIsWatching(!!data);
      }
    })();
  }, [isOpen, itemId]);

  // ── FIELD SAVE ────────────────────────────────
  const saveField = useCallback(async (field: string, value: any) => {
    await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
    await enqueueWriteBack(itemId, field, String(value));
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
  }, [itemId, qc]);

  // ── ACTIONS ───────────────────────────────────
  const handleSaveTitle = useCallback(async () => {
    if (!titleDraft.trim() || titleDraft.trim() === story?.summary) { setEditingTitle(false); return; }
    await saveField('summary', titleDraft.trim());
    setEditingTitle(false);
  }, [titleDraft, story?.summary, saveField]);

  const handleSaveDesc = useCallback(async () => {
    await saveField('description_text', descDraft);
    setEditingDesc(false);
  }, [descDraft, saveField]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    const cat = getStatusCategory(newStatus);
    await supabase.from('ph_issues').update({ status: newStatus, status_category: cat }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'status', newStatus);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
    setStatusOpen(false);
  }, [itemId, qc]);

  const handlePriorityChange = useCallback(async (p: string) => {
    await saveField('priority', p);
    setPriorityOpen(false);
  }, [saveField]);

  const handleAssignToMe = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('ph_issues').update({
      assignee_account_id: user.id,
      assignee_display_name: user.email,
    }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'assignee', user.email || user.id);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
  }, [itemId, qc]);

  const handleSaveComment = useCallback(async () => {
    if (!commentBody.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_comments').insert({
      work_item_id: itemId,
      author_id: user?.id,
      body: commentBody.trim(),
    });
    setCommentBody('');
    qc.invalidateQueries({ queryKey: ['ph_comments', itemId] });
    toast.success('Comment added');
  }, [commentBody, itemId, qc]);

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !story) return;
    await supabase.from('ph_issues').insert([{
      summary: newSubtaskTitle.trim(),
      parent_key: story.issue_key,
      project_key: story.project_key,
      project_name: (story as any).project_name,
      issue_type: 'Subtask',
      status: 'To Do',
      status_category: 'todo',
      priority: 'Medium',
      jira_created_at: new Date().toISOString(),
      jira_updated_at: new Date().toISOString(),
    } as any]);
    setNewSubtaskTitle('');
    setShowSubtaskInput(false);
    qc.invalidateQueries({ queryKey: ['ph_subtasks', story.issue_key] });
    toast.success('Subtask created');
  }, [newSubtaskTitle, story, qc]);

  const handleClone = useCallback(async () => {
    if (!story) return;
    const { id, issue_key, deleted_at, ...rest } = story as any;
    await supabase.from('ph_issues').insert({
      ...rest,
      issue_key: (issue_key || 'NEW') + '-CLONE',
      summary: 'Clone of ' + (story.summary || ''),
      jira_created_at: new Date().toISOString(),
      jira_updated_at: new Date().toISOString(),
      deleted_at: null,
    });
    toast.success('Issue cloned');
    setMenuOpen(false);
  }, [story]);

  const handleSoftDelete = useCallback(async (label: string) => {
    if (!window.confirm(`${label} this issue?`)) return;
    await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
    toast.success(`Issue ${label.toLowerCase()}d`);
    onClose();
  }, [itemId, onClose]);

  const handleToggleWatch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isWatching) {
      await supabase.from('ph_watchers').delete().eq('work_item_id', itemId).eq('user_id', user.id);
      setIsWatching(false);
      setWatcherCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('ph_watchers').insert({ work_item_id: itemId, user_id: user.id });
      setIsWatching(true);
      setWatcherCount(c => c + 1);
    }
  }, [isWatching, itemId]);

  const handleRemoveLink = useCallback(async (linkId: string) => {
    await supabase.from('ph_issue_links').delete().eq('id', linkId);
    qc.invalidateQueries({ queryKey: ['ph_issue_links', itemId] });
  }, [itemId, qc]);

  const handleLinkSearch = useCallback(async (q: string) => {
    setLinkSearch(q);
    if (q.length < 2) { setLinkResults([]); return; }
    const { data } = await supabase
      .from('ph_issues')
      .select('id, issue_key, summary, status')
      .or(`summary.ilike.%${q}%,issue_key.ilike.%${q}%`)
      .neq('id', itemId)
      .is('deleted_at', null)
      .limit(6);
    setLinkResults(data ?? []);
  }, [itemId]);

  const handleCreateLink = useCallback(async (targetId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_issue_links').insert({
      source_id: itemId,
      target_id: targetId,
      link_type: linkType,
      created_by: user?.id,
    });
    setShowLinkForm(false);
    setLinkSearch('');
    setLinkResults([]);
    qc.invalidateQueries({ queryKey: ['ph_issue_links', itemId] });
  }, [itemId, linkType, qc]);

  const handleAttachmentUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File exceeds 10MB limit'); return; }
    const ext = file.name.split('.').pop();
    const path = `attachments/${itemId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
    if (uploadError) { toast.error('Upload failed'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_attachments').insert([{
      work_item_id: itemId,
      uploaded_by: user?.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: path,
    } as any]);
    refetchAttachments();
    toast.success('File attached');
  }, [itemId, refetchAttachments]);

  const handleAttachmentDelete = useCallback(async (attachmentId: string, storagePath: string) => {
    if (!window.confirm('Remove this attachment?')) return;
    await supabase.storage.from('attachments').remove([storagePath]);
    await supabase.from('ph_attachments').delete().eq('id', attachmentId);
    refetchAttachments();
  }, [refetchAttachments]);

  const getAttachmentUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  // ── RENDER GUARD ──────────────────────────────
  if (!isOpen) return null;

  // ── COMPUTED ──────────────────────────────────
  const doneSubtasks = subtasks.filter(s => getStatusCategory(s.status || '') === 'done').length;
  const totalSubtasks = subtasks.length;
  const progressPct = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0;

  const linkGroups: Record<string, typeof linkedIssues> = {};
  linkedIssues.forEach(li => {
    const t = li.linkType || 'relates_to';
    if (!linkGroups[t]) linkGroups[t] = [];
    linkGroups[t].push(li);
  });

  const activityTabs = [
    { key: 'all', label: 'All' },
    { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
    { key: 'worklog', label: 'Work log' },
    { key: 'sla_history', label: 'SLA History' },
    { key: 'timepiece', label: 'Timepiece' },
  ] as const;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 3, border: 'none',
    background: 'transparent', cursor: 'pointer', color: V.textMuted,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: V.overlay, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 900, maxWidth: 'calc(100vw - 48px)',
          maxHeight: '90vh', background: V.white,
          borderRadius: 8, overflow: 'hidden', display: 'flex',
          flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ═══════════════════════════════════════
           HEADER — 48px, sticky
           ═══════════════════════════════════════ */}
        <div style={{
          background: V.headerBg,
          borderBottom: `0.75px solid ${V.borderSubtle}`,
          height: 48, padding: '0 16px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {story?.parent_key && (
              <>
                <IssueTypeIcon type="epic" size={16} />
                <span
                  style={{ fontSize: 12, color: V.textMuted, cursor: 'pointer' }}
                  onClick={() => {
                    if (onOpenItem && story?.parent_key) {
                      supabase.from('ph_issues').select('id').eq('issue_key', story.parent_key).single()
                        .then(({ data }) => { if (data) onOpenItem(data.id); });
                    }
                  }}
                >
                  {story.parent_key}
                </span>
                <span style={{ fontSize: 12, color: V.textMuted }}>/</span>
              </>
            )}
            <IssueTypeIcon type={story?.issue_type} size={16} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: V.textPrimary }}>
              {story?.issue_key || '—'}
            </span>
            {isFlagged && <Flag size={14} color={V.dangerRed} fill={V.dangerRed} />}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={handleToggleWatch} style={btnBase} title={isWatching ? 'Stop watching' : 'Watch'}>
              {isWatching ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <span style={{ fontSize: 11, color: V.textMuted, minWidth: 12 }}>{watcherCount}</span>
            <button style={btnBase} title="Copy link" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link copied');
            }}>
              <Share2 size={15} />
            </button>
            <button style={btnBase} title="Expand"><Maximize2 size={15} /></button>

            {/* 3-dot menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{ ...btnBase, background: menuOpen ? V.hoverRow : 'transparent' }}>
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 32, right: 0, width: 220,
                  background: V.white, borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  border: `0.75px solid ${V.border}`, zIndex: 20, overflow: 'hidden', padding: '4px 0',
                }}>
                  <MenuBtn icon={<Plus size={14} />} label="Create subtask" shortcut="⇧C" onClick={() => { setShowSubtaskInput(true); setMenuOpen(false); }} />
                  <MenuBtn icon={<Link2 size={14} />} label="Link work item" shortcut="⇧K" onClick={() => { setShowLinkForm(true); setMenuOpen(false); }} />
                  <MenuBtn icon={<Paperclip size={14} />} label="Add attachment" onClick={() => { fileInputRef.current?.click(); setMenuOpen(false); }} />
                  <MenuBtn icon={<Copy size={14} />} label="Clone issue" onClick={handleClone} />
                  <MenuBtn icon={<Flag size={14} />} label={isFlagged ? 'Remove flag' : 'Add flag'} onClick={() => { setIsFlagged(f => !f); setMenuOpen(false); }} />
                  <div style={{ height: 1, background: V.border, margin: '4px 0' }} />
                  <MenuBtn icon={<Archive size={14} />} label="Archive" onClick={() => handleSoftDelete('Archive')} />
                  <MenuBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => handleSoftDelete('Delete')} danger />
                </div>
              )}
            </div>

            <button onClick={onClose} style={btnBase}><X size={18} /></button>
          </div>
        </div>

        {/* ═══════════════════════════════════════
           BODY
           ═══════════════════════════════════════ */}
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.textMuted, padding: 40 }}>
            Loading...
          </div>
        ) : isError || !story ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 }}>
            <span style={{ color: V.dangerRed }}>Failed to load issue</span>
            <button onClick={() => refetch()} style={{ color: V.primaryBlue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {/* ═══ LEFT PANE — scrollable ═══ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 80px' }}>
              {/* TITLE — 24px/600, Sora */}
              {editingTitle ? (
                <textarea
                  autoFocus value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveTitle(); }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  style={{
                    width: '100%', fontSize: 24, fontWeight: 600, color: V.textPrimary,
                    border: `2px solid ${V.primaryBlue}`, background: V.white, borderRadius: 4,
                    padding: '4px 8px', resize: 'none', fontFamily: 'Sora, sans-serif',
                    outline: 'none', lineHeight: 1.3,
                  }}
                  rows={2}
                />
              ) : (
                <h1
                  onClick={() => { setTitleDraft(story.summary || ''); setEditingTitle(true); }}
                  style={{
                    fontSize: 22, fontWeight: 600, color: V.textPrimary, margin: 0,
                    cursor: 'text', lineHeight: 1.3, fontFamily: 'Sora, sans-serif',
                  }}
                >
                  {(story.summary || 'Untitled').includes(' / ') ? (
                    <>
                      <span>{(story.summary || '').split(' / ')[0]}</span>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 400, color: V.textSecondary, marginTop: 4 }}>
                        {(story.summary || '').split(' / ').slice(1).join(' / ')}
                      </span>
                    </>
                  ) : (story.summary || 'Untitled')}
                </h1>
              )}

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <button
                  onClick={() => setMenuOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4,
                    border: `0.75px solid ${V.border}`, background: V.white,
                    cursor: 'pointer', color: V.textMuted,
                  }}
                  title="Actions"
                >
                  <Plus size={16} />
                </button>
                <button
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 4,
                    border: `0.75px solid ${V.border}`, background: V.white,
                    cursor: 'pointer', color: V.textMuted,
                  }}
                  title="Pin/Settings"
                >
                  <Settings size={14} />
                </button>
              </div>

              {/* ── KEY DETAILS ── */}
              <Section title="Key details" defaultOpen={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <span style={{ color: V.textMuted }}>Parent</span>
                  {story.parent_key ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IssueTypeIcon type="epic" size={14} />
                      <span
                        style={{ color: V.linkBlue, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                        onClick={() => {
                          if (onOpenItem && story.parent_key) {
                            supabase.from('ph_issues').select('id').eq('issue_key', story.parent_key).single()
                              .then(({ data }) => { if (data) onOpenItem(data.id); });
                          }
                        }}
                      >
                        {story.parent_key}
                      </span>
                      {(story as any).parent_summary && (
                        <span style={{ color: V.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(story as any).parent_summary}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: V.textMuted }}>None</span>
                  )}

                  <span style={{ color: V.textMuted }}>Priority</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PriorityIcon priority={story.priority} />
                    <span style={{ color: V.textPrimary }}>{story.priority || 'Medium'}</span>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: V.textPrimary, display: 'block', marginBottom: 8 }}>Description</span>
                  {editingDesc ? (
                    <div>
                      <textarea
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%', minHeight: 120, padding: '8px 12px',
                          border: `2px solid ${V.primaryBlue}`, borderRadius: 4,
                          fontSize: 14, color: V.textPrimary, resize: 'vertical',
                          fontFamily: 'Inter, sans-serif', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={handleSaveDesc} style={{
                          background: V.primaryBlue, color: '#fff', border: 'none',
                          borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        }}>Save</button>
                        <button onClick={() => { setEditingDesc(false); setDescDraft(story?.description_text ?? ''); }} style={{
                          background: 'none', color: V.textMuted, border: `0.75px solid ${V.border}`,
                          borderRadius: 6, padding: '6px 16px', fontSize: 13, cursor: 'pointer',
                        }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="group"
                      style={{
                        position: 'relative',
                        fontSize: 14, color: story.description_text ? V.textPrimary : V.textMuted,
                        lineHeight: 1.6, padding: '8px 0', minHeight: 40,
                        whiteSpace: 'pre-wrap', borderRadius: 4,
                        fontStyle: story.description_text ? 'normal' : 'italic',
                        cursor: 'default',
                      }}
                    >
                      {story.description_text || 'Add a description…'}
                      <button
                        onClick={() => { setDescDraft(story.description_text ?? ''); setEditingDesc(true); }}
                        className="opacity-0 group-hover:opacity-100"
                        style={{
                          position: 'absolute', top: 8, right: 0,
                          width: 28, height: 28, borderRadius: 4,
                          border: `0.75px solid ${V.border}`, background: V.white,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: V.textMuted, transition: 'opacity 150ms',
                        }}
                        title="Edit description"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              {/* ── ATTACHMENTS ── */}
              <Section
                title="Attachments"
                count={attachments.length}
                defaultOpen={false}
                actions={
                  <button onClick={() => { setShowUploadZone(z => !z); fileInputRef.current?.click(); }} style={{ ...btnBase, width: 24, height: 24, color: V.primaryBlue }}>
                    <Plus size={14} />
                  </button>
                }
              >
                {attachments.map((att: any) => (
                  <div
                    key={att.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, height: 36,
                      padding: '0 8px', borderRadius: 3,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {att.mime_type?.startsWith('image/') ? <ImageIcon size={16} color="#4BADE8" /> : <FileText size={16} color={V.textMuted} />}
                    <span style={{ flex: 1, fontSize: 13, color: V.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.file_name}
                    </span>
                    <span style={{ fontSize: 11, color: V.textMuted, flexShrink: 0 }}>{formatFileSize(att.file_size || 0)}</span>
                    <button onClick={() => window.open(getAttachmentUrl(att.storage_path), '_blank')} style={{ ...btnBase, width: 24, height: 24, color: V.linkBlue }} title="Download">
                      <ExternalLink size={14} />
                    </button>
                    <button onClick={() => handleAttachmentDelete(att.id, att.storage_path)} style={{ ...btnBase, width: 24, height: 24, color: V.dangerRed }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No attachments yet</div>
                )}
                {/* Upload zone — hidden until [+] clicked */}
                {showUploadZone && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `1.5px dashed ${V.border}`, borderRadius: 6, height: 56,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', marginTop: 8, transition: 'border-color 150ms',
                      fontSize: 12, color: V.textMuted,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = V.primaryBlue}
                    onMouseLeave={e => e.currentTarget.style.borderColor = V.border}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = V.primaryBlue; }}
                    onDragLeave={e => e.currentTarget.style.borderColor = V.border}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = V.border;
                      const file = e.dataTransfer.files[0];
                      if (file) handleAttachmentUpload(file);
                    }}
                  >
                    Drop files here or click to upload (max 10MB)
                  </div>
                )}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAttachmentUpload(file);
                  e.target.value = '';
                }} />
              </Section>

              {/* ── SUBTASKS ── */}
              <Section
                title="Subtasks"
                count={totalSubtasks}
                defaultOpen={false}
                actions={
                  <>
                    {totalSubtasks > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 80, height: 6, background: V.border, borderRadius: 3 }}>
                          <div style={{ width: `${progressPct}%`, height: '100%', background: V.successGreen, borderRadius: 3, transition: 'width 200ms' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: V.textMuted }}>{Math.round(progressPct)}% Done</span>
                      </div>
                    )}
                    <button onClick={() => setShowSubtaskInput(true)} style={{ ...btnBase, width: 24, height: 24, color: V.primaryBlue }}>
                      <Plus size={14} />
                    </button>
                  </>
                }
              >
                {totalSubtasks > 0 && (
                  <>
                    {/* Table header */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 60px 40px 80px 80px',
                      gap: 8, padding: '0 8px', height: 36, alignItems: 'center',
                      background: V.insetBg, borderBottom: `0.75px solid ${V.border}`,
                      fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.04em', color: V.textMuted,
                    }}>
                      <span>Work</span>
                      <span>Priority</span>
                      <span style={{ textAlign: 'center' }}>SP</span>
                      <span>Assignee</span>
                      <span>Status</span>
                    </div>
                    {/* Subtask rows */}
                    {subtasks.map(st => {
                      const isDone = getStatusCategory(st.status || '') === 'done';
                      return (
                        <div
                          key={st.id}
                          onClick={() => onOpenItem?.(st.id)}
                          style={{
                            display: 'grid', gridTemplateColumns: '1fr 60px 40px 80px 80px',
                            gap: 8, padding: '0 8px', height: 36, alignItems: 'center',
                            borderBottom: `0.75px solid ${V.border}`,
                            cursor: 'pointer', background: V.white,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                          onMouseLeave={e => e.currentTarget.style.background = V.white}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <IssueTypeIcon type={st.issue_type || 'subtask'} size={14} />
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: V.linkBlue, flexShrink: 0 }}>{st.issue_key}</span>
                            <span style={{
                              fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: isDone ? V.textMuted : V.textPrimary,
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}>{st.summary}</span>
                          </div>
                          <PriorityIcon priority={st.priority} />
                          <span style={{ fontSize: 12, color: V.textSecondary, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                            {st.story_points ?? '—'}
                          </span>
                          <AvatarCircle name={st.assignee_display_name} size={22} />
                          <StatusLozenge status={st.status || 'To Do'} category={st.status_category} />
                        </div>
                      );
                    })}
                  </>
                )}
                {subtasks.length === 0 && !showSubtaskInput && (
                  <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No subtasks yet</div>
                )}
                {showSubtaskInput && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <IssueTypeIcon type="subtask" size={14} />
                    <input
                      autoFocus value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateSubtask();
                        if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskTitle(''); }
                      }}
                      placeholder="What needs to be done?"
                      style={{
                        flex: 1, border: `0.75px solid ${V.border}`, borderRadius: 4,
                        padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                        height: 32,
                      }}
                    />
                    <button onClick={handleCreateSubtask} style={{
                      padding: '0 12px', fontSize: 12, fontWeight: 600, background: V.primaryBlue,
                      color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', height: 32,
                    }}>Create</button>
                    <button onClick={() => { setShowSubtaskInput(false); setNewSubtaskTitle(''); }} style={{
                      fontSize: 16, color: V.textMuted, background: 'none', border: 'none', cursor: 'pointer',
                    }}>×</button>
                  </div>
                )}
              </Section>

              {/* ── LINKED WORK ITEMS ── */}
              <Section
                title="Linked work items"
                count={linkedIssues.length}
                defaultOpen={false}
                actions={
                  <button onClick={() => setShowLinkForm(true)} style={{ ...btnBase, width: 24, height: 24, color: V.primaryBlue }}>
                    <Plus size={14} />
                  </button>
                }
              >
                {Object.keys(linkGroups).length === 0 && !showLinkForm && (
                  <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No linked work items</div>
                )}
                {Object.entries(linkGroups).map(([type, items]) => (
                  <div key={type} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: V.textSecondary, marginBottom: 4, paddingLeft: 8 }}>
                      {LINK_TYPES.find(l => l.value === type)?.label || type}
                    </div>
                    {items.map(li => {
                      const isDone = getStatusCategory(li.status || '') === 'done';
                      return (
                        <div
                          key={li.id}
                          className="group"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, height: 40,
                            padding: '0 8px', borderRadius: 3, borderBottom: `0.75px solid ${V.border}`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <IssueTypeIcon type={(li as any).issue_type} size={16} />
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: V.linkBlue,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>{li.issue_key}</span>
                          <span style={{
                            flex: 1, fontSize: 13, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: isDone ? V.textMuted : V.textPrimary,
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>{li.summary}</span>
                          <StatusLozenge status={li.status || 'To Do'} category={(li as any).status_category} />
                          <AvatarCircle name={li.assignee_display_name} size={22} />
                          <button
                            onClick={() => handleRemoveLink(li.linkId!)}
                            style={{ ...btnBase, width: 20, height: 20, opacity: 0, transition: 'opacity 100ms' }}
                            className="group-hover:!opacity-100"
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {showLinkForm && (
                  <div style={{ padding: 8, background: V.insetBg, borderRadius: 4, marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {LINK_TYPES.map(lt => (
                        <button
                          key={lt.value}
                          onClick={() => setLinkType(lt.value)}
                          style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                            background: linkType === lt.value ? V.primaryBlue : 'transparent',
                            color: linkType === lt.value ? '#fff' : V.textSecondary,
                            border: `0.75px solid ${linkType === lt.value ? V.primaryBlue : V.border}`,
                          }}
                        >
                          {lt.label}
                        </button>
                      ))}
                    </div>
                    <input
                      autoFocus value={linkSearch}
                      onChange={e => handleLinkSearch(e.target.value)}
                      placeholder="Search by key or title..."
                      style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `0.75px solid ${V.border}`, borderRadius: 4, fontFamily: 'inherit', marginBottom: 4 }}
                    />
                    {linkResults.map(r => (
                      <div
                        key={r.id} onClick={() => handleCreateLink(r.id)}
                        style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, display: 'flex', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ color: V.textMuted, fontFamily: 'JetBrains Mono, monospace' }}>{r.issue_key}</span>
                        <span style={{ color: V.textPrimary }}>{r.summary}</span>
                      </div>
                    ))}
                    <button onClick={() => { setShowLinkForm(false); setLinkSearch(''); setLinkResults([]); }}
                      style={{ fontSize: 11, color: V.textMuted, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                      Cancel
                    </button>
                  </div>
                )}
              </Section>

              {/* ═══ ACTIVITY ═══ */}
              <div style={{ marginTop: 32 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: V.textPrimary }}>Activity</span>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 0, borderBottom: `0.75px solid ${V.border}`, marginTop: 8, alignItems: 'center' }}>
                  {activityTabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        padding: '8px 12px', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                        color: activeTab === tab.key ? V.primaryBlue : V.textMuted,
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        borderBottom: activeTab === tab.key ? `2px solid ${V.primaryBlue}` : '2px solid transparent',
                        marginBottom: -0.75, whiteSpace: 'nowrap',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer', color: V.textMuted, marginBottom: -0.75 }} title="Sort/Filter">
                    <ListFilter size={14} />
                  </button>
                </div>

                {/* Comment input */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-start' }}>
                  <AvatarCircle name="You" size={32} />
                  <div style={{ flex: 1 }}>
                    <textarea
                      ref={commentInputRef}
                      value={commentBody}
                      onChange={e => setCommentBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveComment(); }}
                      placeholder="Add a comment..."
                      style={{
                        width: '100%', border: `0.75px solid ${V.border}`, borderRadius: 6,
                        padding: '8px 12px', fontSize: 13, color: V.textPrimary, minHeight: 60,
                        resize: 'none', fontFamily: 'inherit', outline: 'none',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = V.primaryBlue}
                      onBlur={e => e.currentTarget.style.borderColor = V.border}
                    />
                    {commentBody.trim() && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                        <button onClick={handleSaveComment} style={{
                          padding: '5px 14px', fontSize: 12, fontWeight: 600,
                          color: '#fff', background: V.primaryBlue,
                          border: 'none', borderRadius: 6, cursor: 'pointer',
                        }}>Save</button>
                      </div>
                    )}
                    {/* Quick-reply pills */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {['Status update...', 'Thanks...', 'Agree...'].map(pill => (
                        <button
                          key={pill}
                          onClick={() => { setCommentBody(pill === 'Status update...' ? '' : pill); commentInputRef.current?.focus(); }}
                          style={{
                            padding: '4px 10px', fontSize: 12, borderRadius: 4,
                            border: `0.75px solid ${V.border}`, background: V.white,
                            color: V.textSecondary, cursor: 'pointer',
                          }}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Pro tip: press{' '}
                      <kbd style={{ display: 'inline-block', padding: '1px 5px', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', background: V.insetBg, border: `0.75px solid ${V.border}`, borderRadius: 3, color: V.textSecondary }}>M</kbd>
                      {' '}to comment
                    </div>
                  </div>
                </div>

                {/* Activity entries */}
                <div style={{ marginTop: 16 }}>
                  {/* Comments */}
                  {(activeTab === 'all' || activeTab === 'comments') && allComments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `0.75px solid ${V.insetBg}` }}>
                      <AvatarCircle name={c.author} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: V.textPrimary }}>{c.author}</span>
                          <span style={{ fontSize: 11, color: V.textMuted }}>{relTime(c.time)}</span>
                          {c.src === 'jira' && (
                            <span style={{ fontSize: 9, background: V.borderSubtle, color: '#253858', padding: '1px 4px', borderRadius: 2, fontWeight: 600 }}>Jira</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: V.textPrimary, marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                      </div>
                    </div>
                  ))}

                  {/* History */}
                  {(activeTab === 'all' || activeTab === 'history') && allHistory.map(h => (
                    <div key={h.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `0.75px solid ${V.insetBg}`, alignItems: 'center' }}>
                      <AvatarCircle name={h.author} size={24} />
                      <div style={{ flex: 1, fontSize: 13, color: V.textPrimary }}>
                        <span style={{ fontWeight: 600 }}>{h.author}</span>
                        {' changed '}
                        <span style={{ fontWeight: 600 }}>{h.field}</span>
                        {h.from && (
                          <>
                            {' from '}
                            {h.field?.toLowerCase() === 'status'
                              ? <StatusLozenge status={h.from} />
                              : <code style={{ background: V.insetBg, padding: '1px 4px', borderRadius: 2, fontSize: 12 }}>{h.from}</code>
                            }
                          </>
                        )}
                        {' to '}
                        {h.field?.toLowerCase() === 'status'
                          ? <StatusLozenge status={h.to || ''} />
                          : <code style={{ background: V.insetBg, padding: '1px 4px', borderRadius: 2, fontSize: 12 }}>{h.to}</code>
                        }
                        {' '}
                        <span style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: V.lozengeGreyBg, color: V.lozengeGreyText,
                          padding: '0 4px', borderRadius: 3, letterSpacing: '0.03em',
                        }}>HISTORY</span>
                        {h.src === 'jira' && (
                          <span style={{ fontSize: 9, background: V.borderSubtle, color: '#253858', padding: '1px 4px', borderRadius: 2, fontWeight: 600, marginLeft: 4 }}>Jira</span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: V.textMuted, flexShrink: 0 }}>{relTime(h.time)}</span>
                    </div>
                  ))}

                  {/* Empty state */}
                  {activeTab === 'comments' && allComments.length === 0 && (
                    <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No comments yet</div>
                  )}
                  {activeTab === 'history' && allHistory.length === 0 && (
                    <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No activity yet</div>
                  )}
                  {activeTab === 'worklog' && (
                    <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No work logged</div>
                  )}
                  {activeTab === 'sla_history' && (
                    <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No SLA history</div>
                  )}
                  {activeTab === 'timepiece' && (
                    <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No time entries</div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════
               RIGHT SIDEBAR — 280px, fixed
               ═══════════════════════════════════════ */}
            <div style={{
              width: 280, borderLeft: `0.75px solid ${V.border}`,
              overflowY: 'auto', padding: 16, flexShrink: 0, background: V.white,
            }}>
              {/* STATUS BUTTON */}
              <div ref={statusRef} style={{ position: 'relative', marginBottom: 12 }}>
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', height: 36, borderRadius: 6,
                    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.03em', cursor: 'pointer', border: 'none',
                    ...getLozengeColors(story.status || 'To Do', story.status_category),
                  }}
                >
                  {story.status || 'To Do'}
                  <ChevronDown size={12} />
                </button>
                {statusOpen && (
                  <div style={{
                    position: 'absolute', top: 40, left: 0, right: 0, zIndex: 100,
                    background: V.white, border: `0.75px solid ${V.border}`,
                    borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    padding: '4px 0',
                  }}>
                    {STATUS_OPTIONS.map(opt => (
                      <div
                        key={opt.label}
                        onClick={() => handleStatusChange(opt.label)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <StatusLozenge status={opt.label} category={opt.category} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI BUTTON */}
              <button
                onClick={() => toast('AI analyzing…', { icon: '✨' })}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: 6,
                  fontSize: 12, fontWeight: 500, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  color: V.aiPurple, background: 'transparent',
                  border: 'none', cursor: 'pointer', marginBottom: 12,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Sparkles size={14} />
                Improve with AI
              </button>

              <div style={{ height: 1, background: V.border, marginBottom: 12 }} />

              {/* DETAILS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Fix Versions */}
                <SidebarField label="Fix versions">
                  <span style={{ fontSize: 14, color: story.fix_versions ? V.textPrimary : V.textMuted }}>
                    {story.fix_versions ? String(story.fix_versions) : 'None'}
                  </span>
                </SidebarField>

                {/* Assignee */}
                <SidebarField label="Assignee">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {story.assignee_display_name ? (
                      <>
                        <AvatarCircle name={story.assignee_display_name} size={32} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: V.textPrimary }}>{story.assignee_display_name}</span>
                      </>
                    ) : (
                      <>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `1px dashed ${V.textDisabled}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: V.textMuted }}>?</span>
                        </div>
                        <span style={{ fontSize: 14, color: V.textMuted, fontStyle: 'italic' }}>Unassigned</span>
                      </>
                    )}
                  </div>
                  <button onClick={handleAssignToMe} style={{
                    background: 'none', border: 'none', color: V.primaryBlue, fontSize: 12,
                    cursor: 'pointer', padding: 0, marginTop: 2,
                  }}>Assign to me</button>
                </SidebarField>

                {/* Reporter */}
                <SidebarField label="Reporter">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AvatarCircle name={story.reporter_display_name} size={32} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: V.textPrimary }}>{story.reporter_display_name || '—'}</span>
                  </div>
                </SidebarField>

                {/* Labels */}
                <SidebarField label="Labels">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(story.labels && Array.isArray(story.labels) && (story.labels as string[]).length > 0) ? (story.labels as string[]).map((l: string) => (
                      <span key={l} style={{
                        background: V.borderSubtle, color: '#253858', padding: '2px 6px',
                        borderRadius: 3, fontSize: 11, fontWeight: 600,
                      }}>{l}</span>
                    )) : <span style={{ fontSize: 14, color: V.textMuted }}>None</span>}
                  </div>
                </SidebarField>

                {/* Story Points */}
                <SidebarField label="Story Points">
                  {editingSP ? (
                    <input
                      autoFocus type="number" value={spDraft}
                      onChange={e => setSpDraft(e.target.value)}
                      onBlur={() => {
                        const val = parseInt(spDraft, 10);
                        if (!isNaN(val) && val >= 0) saveField('story_points', val);
                        setEditingSP(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { const val = parseInt(spDraft, 10); if (!isNaN(val) && val >= 0) saveField('story_points', val); setEditingSP(false); }
                        if (e.key === 'Escape') setEditingSP(false);
                      }}
                      style={{
                        width: 64, border: `0.75px solid ${V.primaryBlue}`, borderRadius: 4,
                        padding: '3px 8px', fontSize: 14, color: V.textPrimary,
                        textAlign: 'center', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => { setSpDraft(String(story.story_points ?? '')); setEditingSP(true); }}
                      style={{ fontSize: 14, color: V.textPrimary, cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {story.story_points ?? '—'}
                    </span>
                  )}
                </SidebarField>

                {/* Due Date */}
                <SidebarField label="Due Date">
                  <span style={{ fontSize: 14, color: V.textPrimary }}>
                    {story.due_date
                      ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(story.due_date))
                      : '—'}
                  </span>
                </SidebarField>
              </div>

              <div style={{ height: 1, background: V.border, margin: '16px 0' }} />

              {/* DEVELOPMENT — collapsed */}
              <CollapsibleSidebarSection title="Development">
                <div style={{ fontSize: 13, color: V.textMuted, padding: '4px 0' }}>No branches or pull requests linked</div>
              </CollapsibleSidebarSection>

              {/* AUTOMATION — collapsed */}
              <CollapsibleSidebarSection title="Automation">
                <div style={{ fontSize: 13, color: V.textMuted, padding: '4px 0' }}>
                  No rules configured
                  <br />
                  <span style={{ color: V.primaryBlue, cursor: 'pointer', fontSize: 12 }}>Rule executions</span>
                </div>
              </CollapsibleSidebarSection>

              <div style={{ height: 1, background: V.border, margin: '16px 0' }} />

              {/* TIMESTAMPS */}
              <div>
                <div style={{ fontSize: 12, color: V.textMuted, marginBottom: 4 }}>
                  Created {formatFullDate(story.jira_created_at)}
                </div>
                <div style={{ fontSize: 12, color: V.textMuted, marginBottom: 8 }}>
                  Updated {formatFullDate(story.jira_updated_at)}
                </div>
                <button style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: V.primaryBlue, background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}>
                  <Settings size={12} /> Configure
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */
function MenuBtn({ icon, label, shortcut, onClick, danger = false }: {
  icon: React.ReactNode; label: string; shortcut?: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        fontSize: 13, cursor: 'pointer', color: danger ? V.dangerRed : V.textPrimary,
        height: 36,
      }}
      onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {shortcut && <span style={{ fontSize: 11, color: V.textMuted }}>{shortcut}</span>}
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ fontSize: 12, fontWeight: 400, color: V.textMuted, display: 'block', marginBottom: 4 }}>{label}</span>
      {children}
    </div>
  );
}

function CollapsibleSidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          padding: '4px 0', userSelect: 'none',
        }}
      >
        <ChevronRight size={12} color={V.textMuted} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: V.textPrimary }}>{title}</span>
        {title === 'Automation' && <Zap size={12} color={V.textMuted} />}
      </div>
      {open && <div style={{ paddingLeft: 18 }}>{children}</div>}
    </div>
  );
}
