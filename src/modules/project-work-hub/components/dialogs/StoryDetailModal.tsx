/**
 * StoryDetailModal — Nuclear V4 Replacement
 * Jira-style overlay issue detail modal with full CRUD.
 * ONLY file: StoryDetailModal.tsx — no other files touched.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  X, Eye, EyeOff, Link2, MoreHorizontal, Copy, Archive, Trash2,
  Zap, ChevronDown, ChevronRight, Plus, Flag, Paperclip, FileText,
  Image as ImageIcon, File as FileIcon, ExternalLink,
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
   DESIGN TOKENS
   ═══════════════════════════════════════════════ */
const DT = {
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
  dangerRed: '#DE350B',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#AE2A19',
  highest: '#AE2A19',
  high: '#DE350B',
  medium: '#CF7B00',
  low: '#36B37E',
  lowest: '#6B778C',
};

const STATUS_OPTIONS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'In Beta', 'Done', 'On Hold'];

function getStatusCategory(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'completed', 'approved', 'closed'].some(k => lower.includes(k))) return 'done';
  if (['progress', 'review', 'beta', 'active', 'development'].some(k => lower.includes(k))) return 'in_progress';
  return 'todo';
}

function lozengeStyle(status: string) {
  const cat = getStatusCategory(status);
  if (cat === 'done') return { background: '#E3FCEF', color: '#006644' };
  if (cat === 'in_progress') return { background: '#DEEBFF', color: '#0747A6' };
  return { background: '#DFE1E6', color: '#253858' };
}

const LOZENGE_BASE: React.CSSProperties = {
  display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
  borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
};

function StatusLozenge({ status }: { status: string }) {
  const s = lozengeStyle(status);
  return <span style={{ ...LOZENGE_BASE, ...s }}>{status}</span>;
}

function initials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function AvatarCircle({ name, size = 24 }: { name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: '#0052CC',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function PriorityDot({ priority }: { priority?: string | null }) {
  const c = PRIORITY_COLORS[(priority || 'medium').toLowerCase()] || '#CF7B00';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5" fill={c} />
    </svg>
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
      month: 'long', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
  } catch { return '—'; }
}

const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  color: DT.labelGrey, letterSpacing: '0.04em',
};

const LINK_TYPES = [
  { value: 'blocks', label: 'Blocks' },
  { value: 'is_blocked_by', label: 'Is blocked by' },
  { value: 'relates_to', label: 'Relates to' },
  { value: 'duplicates', label: 'Duplicates' },
  { value: 'clones', label: 'Clones' },
];

/* ═══════════════════════════════════════════════
   ISSUE TYPE ICON (canonical SVG)
   ═══════════════════════════════════════════════ */
function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A" /><path d="M5 8h6M8 5v6" stroke="#fff" strokeWidth="1.5" /></svg>;
  if (t.includes('epic')) return <svg width={size} height={size} viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#904EE2" /><path d="M9 3L6 8.5h4L7 13" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>;
  if (t.includes('sub')) return <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>;
  if (t.includes('task')) return <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>;
  // Story (default)
  return <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#63BA3C" /><path d="M5 4v8l3-2 3 2V4H5z" fill="#fff" /></svg>;
}

/* ═══════════════════════════════════════════════
   JIRA WRITE-BACK HELPER
   ═══════════════════════════════════════════════ */
async function enqueueWriteBack(phIssueId: string, fieldName: string, newValue: string) {
  await supabase.from('jira_write_back_queue').insert({
    ph_issue_id: phIssueId,
    field_name: fieldName,
    new_value: newValue,
    operation: 'UPDATE',
    push_status: 'pending',
  });
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
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
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

  // ── BODY SCROLL LOCK ──────────────────────────
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── ESCAPE KEY ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
        .select('id, issue_key, summary, status, assignee_display_name, story_points, priority, status_category')
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

  // resolve linked issues
  const { data: linkedIssues = [] } = useQuery({
    queryKey: ['ph_linked_issues', rawLinks.map(l => l.id).join(',')],
    queryFn: async () => {
      const otherIds = rawLinks.map(l => l.source_id === itemId ? l.target_id : l.source_id);
      if (!otherIds.length) return [];
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, priority')
        .in('id', otherIds);
      return (data ?? []).map(issue => {
        const link = rawLinks.find(l => l.source_id === issue.id || l.target_id === issue.id);
        return { ...issue, linkId: link?.id, linkType: link?.link_type };
      });
    },
    enabled: rawLinks.length > 0,
  });

  // ── COMMENTS (merged) ────────────────────────
  const { data: nativeComments = [] } = useQuery({
    queryKey: ['ph_comments', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, body, created_at, author_id')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      return (data ?? []).map(c => ({ ...c, source: 'catalyst' as const, timestamp: c.created_at }));
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
        timestamp: c.jira_created_at,
        author_name: c.author_display_name,
      }));
    },
    enabled: !!story?.issue_key,
  });

  const allComments = useMemo(() => {
    const merged = [
      ...nativeComments.map(c => ({ id: c.id, body: c.body, author: c.author_id || 'You', time: c.timestamp, src: 'catalyst' })),
      ...jiraComments.map(c => ({ id: c.id, body: c.body, author: c.author_name || 'Jira User', time: c.timestamp, src: 'jira' })),
    ];
    merged.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return merged;
  }, [nativeComments, jiraComments]);

  // ── HISTORY (merged) ──────────────────────────
  const { data: nativeHistory = [] } = useQuery({
    queryKey: ['ph_activity', itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, action, field_name, old_value, new_value, created_at, user_id')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      return (data ?? []).map(h => ({ ...h, source: 'catalyst' as const, timestamp: h.created_at }));
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
      return (data ?? []).map(h => ({ ...h, source: 'jira' as const, timestamp: h.jira_created_at }));
    },
    enabled: !!story?.issue_key,
  });

  const allHistory = useMemo(() => {
    const merged = [
      ...nativeHistory.map(h => ({
        id: h.id, author: h.user_id || 'System', field: h.field_name,
        from: h.old_value, to: h.new_value, time: h.timestamp, src: 'catalyst',
      })),
      ...jiraHistory.map(h => ({
        id: h.id, author: h.author_display_name || 'Jira', field: h.field_name,
        from: h.from_string, to: h.to_string, time: h.timestamp, src: 'jira',
      })),
    ];
    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return merged;
  }, [nativeHistory, jiraHistory]);

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

  // ── ATTACHMENTS ───────────────────────────────
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['story-detail-attachments', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_attachments')
        .select('*')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!itemId,
  });

  const [attachOpen, setAttachOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAttachmentUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }
    const ext = file.name.split('.').pop();
    const path = `attachments/${itemId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(path, file, { upsert: false });
    if (uploadError) { console.error('Upload error', uploadError); toast.error('Upload failed'); return; }
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

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileIcon size={16} color={DT.labelGrey} />;
    if (mimeType.startsWith('image/')) return <ImageIcon size={16} color="#4BADE8" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text'))
      return <FileText size={16} color="#CF7B00" />;
    return <FileIcon size={16} color={DT.labelGrey} />;
  };

  // ── FIELD SAVE HELPER ─────────────────────────
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
  }, [commentBody, itemId, qc]);

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !story) return;
    await supabase.from('ph_issues').insert([{
      summary: newSubtaskTitle.trim(),
      parent_key: story.issue_key,
      project_key: story.project_key,
      project_name: story.project_name,
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
    qc.invalidateQueries({ queryKey: ['story-backlog'] });
    setMenuOpen(false);
  }, [story, qc]);

  const handleSoftDelete = useCallback(async (label: string) => {
    if (!window.confirm(`${label} this issue?`)) return;
    await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
    qc.invalidateQueries({ queryKey: ['story-backlog'] });
    toast.success(`Issue ${label.toLowerCase()}d`);
    onClose();
  }, [itemId, qc, onClose]);

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

  const handleSaveSP = useCallback(async () => {
    const val = parseInt(spDraft, 10);
    if (!isNaN(val) && val >= 0 && val <= 99) {
      await saveField('story_points', val);
    }
    setEditingSP(false);
  }, [spDraft, saveField]);

  // ── RENDER GUARD ──────────────────────────────
  if (!isOpen) return null;

  // ── COMPUTED ──────────────────────────────────
  const doneSubtasks = subtasks.filter(s => getStatusCategory(s.status || '') === 'done').length;
  const totalSubtasks = subtasks.length;
  const progressPct = totalSubtasks > 0 ? (doneSubtasks / totalSubtasks) * 100 : 0;

  // Group links by type
  const linkGroups: Record<string, typeof linkedIssues> = {};
  linkedIssues.forEach(li => {
    const t = li.linkType || 'relates_to';
    if (!linkGroups[t]) linkGroups[t] = [];
    linkGroups[t].push(li);
  });

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 3, border: 'none',
    background: 'transparent', cursor: 'pointer', color: '#42526E',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: DT.overlay, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 1100, maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 48px)', background: DT.modalBg,
          borderRadius: 8, overflow: 'hidden', display: 'flex',
          flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          background: DT.headerBg, borderBottom: `1px solid ${DT.border}`,
          padding: '0 16px', height: 48, display: 'flex', alignItems: 'center',
          flexShrink: 0, gap: 8,
        }}>
          {/* Left breadcrumb */}
          <span style={{ fontSize: 12, color: DT.labelGrey }}>{projectKey}</span>
          <span style={{ fontSize: 12, color: DT.labelGrey }}>›</span>
          <IssueTypeIcon type={story?.issue_type} size={16} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: DT.bodyText }}>
            {story?.issue_key || '—'}
          </span>
          {story?.parent_key && (
            <>
              <span style={{ color: DT.labelGrey, fontSize: 11 }}>in</span>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: DT.epicChipBg, color: DT.epicChipText,
                  padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                  cursor: onOpenItem ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (onOpenItem && story?.parent_key) {
                    supabase.from('ph_issues').select('id').eq('issue_key', story.parent_key).single()
                      .then(({ data }) => { if (data) onOpenItem(data.id); });
                  }
                }}
              >
                <IssueTypeIcon type="epic" size={12} />
                {story.parent_key}
              </span>
            </>
          )}
          {isFlagged && <Flag size={14} color={DT.dangerRed} fill={DT.dangerRed} />}

          {/* Right actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={handleToggleWatch} style={btnBase} title={isWatching ? 'Stop watching' : 'Watch'}>
              {isWatching ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <span style={{ fontSize: 11, color: DT.labelGrey, minWidth: 12 }}>{watcherCount}</span>

            <button style={btnBase} title="Copy link" onClick={() => {
              navigator.clipboard.writeText(window.location.origin + `/project-hub/${projectKey}/story/${itemId}`);
              toast.success('Link copied');
            }}>
              <Link2 size={16} />
            </button>

            {/* 3-dot menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(o => !o)} style={{
                ...btnBase, background: menuOpen ? 'rgba(9,30,66,0.08)' : 'transparent',
              }}>
                <MoreHorizontal size={16} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 32, right: 0, width: 200,
                  background: '#fff', borderRadius: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  border: `1px solid ${DT.border}`, zIndex: 20, overflow: 'hidden',
                }}>
                  <MenuBtn icon={<Copy size={14} />} label="Clone Issue" onClick={handleClone} />
                  <MenuBtn icon={<Zap size={14} />} label="Add to sprint" onClick={() => setMenuOpen(false)} />
                  <MenuBtn icon={<Flag size={14} />} label={isFlagged ? 'Remove flag' : 'Flag as impediment'} onClick={() => { setIsFlagged(f => !f); setMenuOpen(false); }} />
                  <MenuBtn icon={<Archive size={14} />} label="Archive" onClick={() => handleSoftDelete('Archive')} />
                  <div style={{ height: 1, background: DT.border, margin: '4px 0' }} />
                  <MenuBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => handleSoftDelete('Delete')} danger />
                </div>
              )}
            </div>

            <button onClick={onClose} style={btnBase}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        {isLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.labelGrey }}>
            Loading...
          </div>
        ) : isError || !story ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: DT.dangerRed }}>Failed to load issue</span>
            <button onClick={() => refetch()} style={{ color: DT.linkBlue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Retry</button>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            {/* ═══ LEFT PANE ═══ */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* TITLE */}
              {editingTitle ? (
                <textarea
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveTitle(); }
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  style={{
                    width: '100%', fontSize: 24, fontWeight: 600, color: DT.bodyText,
                    border: 'none', background: DT.headerBg, borderRadius: 4,
                    padding: '4px 8px', resize: 'none', fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.3,
                  }}
                  rows={2}
                />
              ) : (
                <h1
                  onClick={() => { setTitleDraft(story.summary || ''); setEditingTitle(true); }}
                  style={{
                    fontSize: 24, fontWeight: 600, color: DT.bodyText, margin: 0,
                    cursor: 'text', lineHeight: 1.3,
                  }}
                >
                  {story.summary || 'Untitled'}
                </h1>
              )}

              {/* DESCRIPTION */}
              <div style={{ marginTop: 24 }}>
                <div style={{ ...LABEL, marginBottom: 8 }}>Description</div>
                {editingDesc ? (
                  <div>
                    <textarea
                      autoFocus
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingDesc(false); }}
                      style={{
                        width: '100%', minHeight: 120, fontSize: 14, color: DT.bodyText,
                        border: `1px solid ${DT.border}`, borderRadius: 4, padding: '8px 12px',
                        fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.7,
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#4C9AFF'}
                      onBlur={e => { e.currentTarget.style.borderColor = DT.border; }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={handleSaveDesc} style={{
                        padding: '4px 12px', fontSize: 12, fontWeight: 600, background: DT.linkBlue,
                        color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
                      }}>Save</button>
                      <button onClick={() => setEditingDesc(false)} style={{
                        padding: '4px 12px', fontSize: 12, color: DT.labelGrey, background: 'none',
                        border: 'none', cursor: 'pointer',
                      }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => { setDescDraft(story.description_text || ''); setEditingDesc(true); }}
                    style={{
                      fontSize: 14, color: story.description_text ? DT.bodyText : DT.labelGrey,
                      fontStyle: story.description_text ? 'normal' : 'italic',
                      whiteSpace: 'pre-wrap', lineHeight: 1.7, cursor: 'text',
                      minHeight: 40, padding: '4px 0',
                    }}
                  >
                    {story.description_text || 'Add a description...'}
                  </div>
                )}
              </div>

              {/* ── CHILD ISSUES ── */}
              <div style={{ marginTop: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={LABEL}>Child Issues</div>
                  {totalSubtasks > 0 && (
                    <span style={{ fontSize: 11, color: DT.labelGrey }}>{doneSubtasks} of {totalSubtasks} done</span>
                  )}
                </div>
                {totalSubtasks > 0 && (
                  <div style={{ height: 4, background: DT.border, borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: DT.progressGreen, borderRadius: 2, transition: 'width 200ms' }} />
                  </div>
                )}
                {subtasks.map(st => (
                  <div
                    key={st.id}
                    onClick={() => onOpenItem?.(st.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, height: 32,
                      padding: '0 8px', borderRadius: 3, cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = DT.hoverRow}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <IssueTypeIcon type={'subtask'} size={14} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: DT.labelGrey }}>{st.issue_key}</span>
                    <span style={{ flex: 1, fontSize: 13, color: DT.bodyText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.summary}
                    </span>
                    <StatusLozenge status={st.status || 'To Do'} />
                    <AvatarCircle name={st.assignee_display_name} size={18} />
                  </div>
                ))}
                {subtasks.length === 0 && !showSubtaskInput && (
                  <div style={{ fontSize: 13, color: DT.labelGrey, fontStyle: 'italic', padding: '4px 0' }}>No child issues</div>
                )}
                {showSubtaskInput ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <IssueTypeIcon type="subtask" size={14} />
                    <input
                      autoFocus
                      value={newSubtaskTitle}
                      onChange={e => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateSubtask();
                        if (e.key === 'Escape') { setShowSubtaskInput(false); setNewSubtaskTitle(''); }
                      }}
                      placeholder="What needs to be done?"
                      style={{
                        flex: 1, border: `1px solid ${DT.border}`, borderRadius: 3,
                        padding: '4px 8px', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <button onClick={handleCreateSubtask} style={{
                      padding: '3px 10px', fontSize: 12, fontWeight: 600, background: DT.linkBlue,
                      color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer',
                    }}>Create</button>
                    <button onClick={() => { setShowSubtaskInput(false); setNewSubtaskTitle(''); }} style={{
                      fontSize: 16, color: DT.labelGrey, background: 'none', border: 'none', cursor: 'pointer',
                    }}>×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSubtaskInput(true)}
                    style={{
                      background: 'none', border: 'none', color: DT.linkBlue,
                      fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 4,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Plus size={12} /> Create child issue
                  </button>
                )}
              </div>

              {/* ── LINKED ISSUES ── */}
              <div style={{ marginTop: 32 }}>
                <div style={{ ...LABEL, marginBottom: 8 }}>Linked Issues</div>
                {Object.keys(linkGroups).length === 0 && !showLinkForm && (
                  <div style={{ fontSize: 13, color: DT.labelGrey, fontStyle: 'italic', padding: '4px 0' }}>No linked issues</div>
                )}
                {Object.entries(linkGroups).map(([type, items]) => (
                  <div key={type} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: DT.labelGrey, textTransform: 'uppercase', marginBottom: 4 }}>
                      {LINK_TYPES.find(l => l.value === type)?.label || type}
                    </div>
                    {items.map(li => {
                      const isDone = getStatusCategory(li.status || '') === 'done';
                      return (
                        <div
                          key={li.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, height: 32,
                            padding: '0 8px', borderRadius: 3, position: 'relative',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = DT.hoverRow;
                            const x = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                            if (x) x.style.opacity = '1';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            const x = e.currentTarget.querySelector('[data-remove]') as HTMLElement;
                            if (x) x.style.opacity = '0';
                          }}
                        >
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: DT.labelGrey }}>{li.issue_key}</span>
                          <span style={{
                            flex: 1, fontSize: 13, color: DT.bodyText, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>{li.summary}</span>
                          <StatusLozenge status={li.status || 'To Do'} />
                          <PriorityDot priority={li.priority} />
                          <button
                            data-remove
                            onClick={() => handleRemoveLink(li.linkId!)}
                            style={{ ...btnBase, opacity: 0, width: 20, height: 20, fontSize: 14, transition: 'opacity 100ms' }}
                          >×</button>
                        </div>
                      );
                    })}
                  </div>
                ))}
                {showLinkForm ? (
                  <div style={{ padding: 8, background: DT.headerBg, borderRadius: 4, marginTop: 4 }}>
                    <select
                      value={linkType}
                      onChange={e => setLinkType(e.target.value)}
                      style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 3, border: `1px solid ${DT.border}`, marginBottom: 8 }}
                    >
                      {LINK_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                    </select>
                    <input
                      autoFocus
                      value={linkSearch}
                      onChange={e => handleLinkSearch(e.target.value)}
                      placeholder="Search by key or title..."
                      style={{ width: '100%', padding: '6px 10px', fontSize: 12, border: `1px solid ${DT.border}`, borderRadius: 3, fontFamily: 'inherit', marginBottom: 4 }}
                    />
                    {linkResults.map(r => (
                      <div
                        key={r.id}
                        onClick={() => handleCreateLink(r.id)}
                        style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, display: 'flex', gap: 8 }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.hoverRow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ color: DT.labelGrey, fontFamily: 'monospace' }}>{r.issue_key}</span>
                        <span style={{ color: DT.bodyText }}>{r.summary}</span>
                      </div>
                    ))}
                    <button onClick={() => { setShowLinkForm(false); setLinkSearch(''); setLinkResults([]); }}
                      style={{ fontSize: 11, color: DT.labelGrey, background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLinkForm(true)}
                    style={{ background: 'none', border: 'none', color: DT.linkBlue, fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <Plus size={12} /> Link an issue
                  </button>
                )}
              </div>

              {/* ── ACTIVITY ── */}
              <div style={{ marginTop: 32 }}>
                <div style={{ ...LABEL, marginBottom: 12 }}>Activity</div>
                <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${DT.border}`, marginBottom: 16 }}>
                  {(['comments', 'history'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{
                      fontSize: 13, fontWeight: 500, padding: '8px 14px', border: 'none', cursor: 'pointer',
                      background: 'none', color: activeTab === tab ? DT.linkBlue : '#42526E',
                      borderBottom: `2px solid ${activeTab === tab ? DT.linkBlue : 'transparent'}`,
                      marginBottom: -1, textTransform: 'capitalize',
                    }}>
                      {tab}{tab === 'history' && allHistory.length > 0 ? ` (${allHistory.length})` : ''}
                    </button>
                  ))}
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'comments' && (
                  <div>
                    {allComments.length === 0 && (
                      <div style={{ fontSize: 13, color: DT.labelGrey, fontStyle: 'italic', padding: '8px 0' }}>
                        No comments yet. Be the first to comment.
                      </div>
                    )}
                    {allComments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `0.75px solid ${DT.headerBg}` }}>
                        <AvatarCircle name={c.author} size={28} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: DT.bodyText }}>{c.author}</span>
                            <span style={{ fontSize: 11, color: DT.labelGrey }}>{relTime(c.time)}</span>
                            {c.src === 'jira' && <span style={{ fontSize: 9, background: DT.border, color: '#253858', padding: '1px 4px', borderRadius: 2, fontWeight: 600 }}>Jira</span>}
                          </div>
                          <div style={{ fontSize: 14, color: DT.bodyText, whiteSpace: 'pre-wrap', lineHeight: 1.6, marginTop: 2 }}>{c.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    {allHistory.length === 0 && (
                      <div style={{ fontSize: 13, color: DT.labelGrey, fontStyle: 'italic', padding: '8px 0' }}>No history</div>
                    )}
                    {allHistory.map(h => (
                      <div key={h.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `0.75px solid ${DT.headerBg}`, minHeight: 28, alignItems: 'center' }}>
                        <AvatarCircle name={h.author} size={24} />
                        <div style={{ flex: 1, fontSize: 13, color: DT.bodyText }}>
                          <span style={{ fontWeight: 600 }}>{h.author}</span>
                          {' changed '}
                          <span style={{ fontWeight: 600 }}>{h.field}</span>
                          {h.from && (
                            <>
                              {' from '}
                              {h.field?.toLowerCase() === 'status'
                                ? <StatusLozenge status={h.from} />
                                : <code style={{ background: DT.headerBg, padding: '1px 4px', borderRadius: 2, fontSize: 12 }}>{h.from}</code>
                              }
                            </>
                          )}
                          {' to '}
                          {h.field?.toLowerCase() === 'status'
                            ? <StatusLozenge status={h.to || ''} />
                            : <code style={{ background: DT.headerBg, padding: '1px 4px', borderRadius: 2, fontSize: 12 }}>{h.to}</code>
                          }
                          {h.src === 'jira' && <span style={{ fontSize: 9, background: DT.border, color: '#253858', padding: '1px 4px', borderRadius: 2, fontWeight: 600, marginLeft: 4 }}>Jira</span>}
                        </div>
                        <span style={{ fontSize: 11, color: DT.labelGrey, flexShrink: 0 }}>{relTime(h.time)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* COMMENT INPUT */}
                <div style={{ marginTop: 16 }}>
                  <textarea
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveComment(); }}
                    placeholder="Add a comment... (⌘+Enter to submit)"
                    style={{
                      width: '100%', border: `1px solid ${DT.border}`, borderRadius: 3,
                      padding: '8px 12px', fontSize: 13, color: DT.bodyText, minHeight: 80,
                      resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#4C9AFF'}
                    onBlur={e => e.currentTarget.style.borderColor = DT.border}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button
                      onClick={handleSaveComment}
                      disabled={!commentBody.trim()}
                      style={{
                        padding: '5px 14px', fontSize: 12, fontWeight: 600,
                        color: commentBody.trim() ? '#fff' : DT.labelGrey,
                        background: commentBody.trim() ? '#2563EB' : DT.headerBg,
                        border: 'none', borderRadius: 3,
                        cursor: commentBody.trim() ? 'pointer' : 'default',
                      }}
                    >Save</button>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT SIDEBAR ═══ */}
            <div style={{
              width: 240, borderLeft: `1px solid ${DT.border}`,
              overflowY: 'auto', padding: 16, flexShrink: 0,
            }}>
              {/* STATUS */}
              <div ref={statusRef} style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Status</div>
                <button
                  onClick={() => setStatusOpen(o => !o)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '5px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    ...lozengeStyle(story.status || 'To Do'),
                  }}
                >
                  {story.status || 'To Do'}
                  <ChevronDown size={12} />
                </button>
                {statusOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#fff', border: `1px solid ${DT.border}`, borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 2,
                  }}>
                    {STATUS_OPTIONS.map(s => (
                      <div key={s} onClick={() => handleStatusChange(s)} style={{
                        padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.hoverRow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <StatusLozenge status={s} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ASSIGNEE */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Assignee</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {story.assignee_display_name ? (
                    <>
                      <AvatarCircle name={story.assignee_display_name} size={24} />
                      <span style={{ fontSize: 13, color: DT.bodyText }}>{story.assignee_display_name}</span>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: `1px dashed #C1C7D0`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, color: DT.labelGrey }}>?</span>
                      </div>
                      <span style={{ fontSize: 13, color: DT.labelGrey, fontStyle: 'italic' }}>Unassigned</span>
                    </>
                  )}
                </div>
                <button onClick={handleAssignToMe} style={{
                  background: 'none', border: 'none', color: DT.linkBlue, fontSize: 11,
                  cursor: 'pointer', padding: '2px 0', marginTop: 2,
                }}>Assign to me</button>
              </div>

              {/* PRIORITY */}
              <div ref={priorityRef} style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Priority</div>
                <button
                  onClick={() => setPriorityOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: DT.bodyText,
                  }}
                >
                  <PriorityDot priority={story.priority} />
                  {story.priority || 'Medium'}
                  <ChevronDown size={10} color={DT.labelGrey} />
                </button>
                {priorityOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, width: 160, zIndex: 10,
                    background: '#fff', border: `1px solid ${DT.border}`, borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)', marginTop: 2,
                  }}>
                    {['Critical', 'High', 'Medium', 'Low', 'Lowest'].map(p => (
                      <div key={p} onClick={() => handlePriorityChange(p)} style={{
                        padding: '6px 10px', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = DT.hoverRow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <PriorityDot priority={p} />
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* REPORTER */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Reporter</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <AvatarCircle name={story.reporter_display_name} size={24} />
                  <span style={{ fontSize: 13, color: DT.bodyText }}>{story.reporter_display_name || '—'}</span>
                </div>
              </div>

              {/* STORY POINTS */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Story Points</div>
                {editingSP ? (
                  <input
                    autoFocus
                    type="number" min={0} max={99}
                    value={spDraft}
                    onChange={e => setSpDraft(e.target.value)}
                    onBlur={handleSaveSP}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSP(); if (e.key === 'Escape') setEditingSP(false); }}
                    style={{ width: 60, fontSize: 13, padding: '2px 6px', border: `1px solid ${DT.border}`, borderRadius: 3 }}
                  />
                ) : (
                  <span
                    onClick={() => { setSpDraft(String(story.story_points ?? '')); setEditingSP(true); }}
                    style={{ fontSize: 13, color: DT.bodyText, cursor: 'text' }}
                  >
                    {story.story_points ?? '—'}
                  </span>
                )}
              </div>

              {/* DUE DATE */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Due Date</div>
                <input
                  type="date"
                  value={story.due_date || ''}
                  onChange={e => saveField('due_date', e.target.value || null)}
                  style={{ fontSize: 12, color: DT.bodyText, border: `1px solid ${DT.border}`, borderRadius: 3, padding: '2px 6px' }}
                />
              </div>

              {/* LABELS */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Labels</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(story.labels && Array.isArray(story.labels) && (story.labels as string[]).length > 0) ? (story.labels as string[]).map((l: string) => (
                    <span key={l} style={{
                      background: DT.border, color: '#253858', padding: '2px 6px',
                      borderRadius: 3, fontSize: 10, fontWeight: 600,
                    }}>{l}</span>
                  )) : <span style={{ fontSize: 13, color: DT.labelGrey }}>None</span>}
                </div>
              </div>

              {/* FIX VERSIONS */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...LABEL, marginBottom: 4 }}>Fix Versions</div>
                <span style={{ fontSize: 13, color: DT.bodyText }}>
                  {String(story.fix_versions || '—')}
                </span>
              </div>

              {/* TIMESTAMPS */}
              <div style={{ borderTop: `1px solid ${DT.border}`, paddingTop: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, color: DT.labelGrey, marginBottom: 4 }}>
                  Created {formatFullDate(story.jira_created_at)}
                </div>
                <div style={{ fontSize: 11, color: DT.labelGrey }}>
                  Updated {formatFullDate(story.jira_updated_at)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MENU BUTTON HELPER
   ═══════════════════════════════════════════════ */
function MenuBtn({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
        fontSize: 13, cursor: 'pointer', color: danger ? '#DE350B' : '#172B4D',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#F4F5F7'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon}{label}
    </div>
  );
}
