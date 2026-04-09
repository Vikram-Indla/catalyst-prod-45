/**
 * StoryDetailModal — V12 Enhanced · GOD-TIER UI
 * Jira-style two-panel detail modal for work items.
 * Data: ph_issues + ph_issue_links + ph_comments + ph_activity_log + ph_attachments
 *
 * Enhancements over previous version:
 * - Key Details horizontal strip (always visible, not collapsed)
 * - Description as standalone section with save/cancel
 * - ConfirmDialog replacing window.confirm
 * - Custom dropdown replacing native <select> in LinkWorkItemModal
 * - Enhanced breadcrumb with parent name
 * - Richer empty states with icons
 * - Priority picker in sidebar
 * - Comment edit/delete
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  X, Eye, EyeOff, Link2, MoreHorizontal, Copy, Archive, Trash2,
  ChevronDown, ChevronRight, Plus, Flag, Paperclip, FileText,
  ExternalLink, Maximize2, Minimize2, Share2, Pencil, ListFilter,
  ChevronsUp, ChevronUp, Minus, ChevronsDown, Search,
  AlertTriangle, MessageSquare, Clock, Upload,
} from 'lucide-react';

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
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes sdm-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   V12 DESIGN TOKENS
   ═══════════════════════════════════════════════ */
const V = {
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  headerBg: '#F4F5F7',
  border: '#E2E8F0',
  borderSubtle: '#DFE1E6',
  insetBg: '#F1F5F9',
  surfaceBg: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#CBD5E1',
  linkBlue: '#0052CC',
  primaryBlue: '#2563EB',
  primaryBlueHover: '#1D4ED8',
  successGreen: '#16A34A',
  dangerRed: '#DE350B',
  hoverRow: 'rgba(0,0,0,0.04)',
  pressRow: 'rgba(0,0,0,0.08)',
  selectedRow: 'rgba(37,99,235,0.08)',
  lozengeGreyBg: '#DFE1E6', lozengeGreyText: '#253858',
  lozengeBlueBg: '#DEEBFF', lozengeBlueText: '#0747A6',
  lozengeGreenBg: '#E3FCEF', lozengeGreenText: '#006644',
  statusBorder: 'rgba(9, 30, 66, 0.29)',
};

const STATUS_OPTIONS = [
  { label: 'To Do', category: 'todo' },
  { label: 'Backlog', category: 'todo' },
  { label: 'In Requirements', category: 'in_progress' },
  { label: 'In Progress', category: 'in_progress' },
  { label: 'In Review', category: 'in_progress' },
  { label: 'Done', category: 'done' },
  { label: 'On Hold', category: 'todo' },
];

const PRIORITY_OPTIONS = [
  { label: 'Highest', value: 'Highest' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
  { label: 'Lowest', value: 'Lowest' },
];

const LINK_TYPES = [
  { value: 'blocks', label: 'blocks' },
  { value: 'is_blocked_by', label: 'is blocked by' },
  { value: 'relates_to', label: 'relates to' },
  { value: 'duplicates', label: 'duplicates' },
  { value: 'is_duplicated_by', label: 'is duplicated by' },
  { value: 'is_implemented_by', label: 'is implemented by' },
  { value: 'implements', label: 'implements' },
  { value: 'clones', label: 'clones' },
  { value: 'is_cloned_by', label: 'is cloned by' },
];

const FIELD_LABELS: Record<string, string> = {
  IssueParentAssociation: 'Parent', summary: 'Summary', assignee: 'Assignee',
  status: 'Status', priority: 'Priority', description: 'Description',
  Story_Points: 'Story Points', story_points: 'Story Points', labels: 'Labels',
  fix_versions: 'Fix Versions', duedate: 'Due Date', due_date: 'Due Date',
  issuetype: 'Issue Type', resolution: 'Resolution', Sprint: 'Sprint',
  reporter: 'Reporter', Component: 'Component',
};

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

function getInitials(name?: string | null): string {
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
      {getInitials(name)}
    </div>
  );
}

function PriorityIcon({ priority, size = 16 }: { priority?: string | null; size?: number }) {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'highest' || p === 'critical') return <ChevronsUp size={size} color="#AE2A19" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'high') return <ChevronUp size={size} color="#DE350B" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'low') return <ChevronDown size={size} color="#36B37E" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  if (p === 'lowest') return <ChevronsDown size={size} color="#6B778C" strokeWidth={2.5} style={{ flexShrink: 0 }} />;
  return <span style={{ fontSize: size + 2, fontWeight: 700, color: '#D97706', lineHeight: 1, flexShrink: 0 }}>=</span>;
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

function humanFieldName(raw: string | null | undefined): string {
  if (!raw) return 'field';
  return FIELD_LABELS[raw] || raw.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

/* ═══════════════════════════════════════════════
   CANONICAL WORK ITEM SVG ICONS
   ═══════════════════════════════════════════════ */
function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#FF5630" /><circle cx="8" cy="8" r="3" fill="#fff" /></svg>
  );
  if (t.includes('epic')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#6554C0" /><path d="M9 3L6 8.5h4L7 13" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('sub')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#2684FF" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('task')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('incident')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 2L14 13H2L8 2z" fill="#FF5630" /><path d="M8 6v4M8 11.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
  );
  if (t.includes('improvement') || t.includes('new_feature') || t.includes('new feature')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#36B37E" /><path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth="1.5" /></svg>
  );
  // Default: Story (green bookmark)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#36B37E" /><path d="M5 4v8l3-2 3 2V4H5z" fill="#fff" /></svg>
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
   CONFIRM DIALOG
   ═══════════════════════════════════════════════ */
function ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  isOpen: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(9,30,66,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
    }} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={{
        width: 400, maxWidth: 'calc(100vw - 48px)', background: V.white,
        borderRadius: 8, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
        animation: 'sdm-confirm-in 150ms ease-out both',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: V.textPrimary, fontFamily: 'Sora, sans-serif' }}>{title}</h3>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: V.textSecondary, lineHeight: 1.5 }}>{message}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px' }}>
          <button onClick={onCancel} style={{
            padding: '6px 16px', fontSize: 13, border: `0.75px solid ${V.border}`,
            borderRadius: 6, background: V.white, color: V.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '6px 16px', fontSize: 13, fontWeight: 600,
            border: 'none', borderRadius: 6, cursor: 'pointer',
            background: danger ? V.dangerRed : V.primaryBlue, color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
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
          <span style={{ fontSize: 14, fontWeight: 650, color: V.textPrimary }}>{title}</span>
          {count !== undefined && (
            <span style={{ background: V.insetBg, borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600, color: V.textMuted }}>{count}</span>
          )}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>{actions}</div>}
      </div>
      <div style={{ maxHeight: open ? 5000 : 0, overflow: 'hidden', transition: 'max-height 250ms ease' }}>
        {open && <div style={{ paddingTop: 8 }}>{children}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   useCurrentUser
   ═══════════════════════════════════════════════ */
function useCurrentUserProfile() {
  const [profile, setProfile] = useState<{ id: string; name: string; initials: string; color: string } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      const name = p?.full_name || user.email?.split('@')[0] || 'User';
      const parts = name.trim().split(/\s+/);
      const ini = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
      let hash = 0;
      for (let i = 0; i < user.id.length; i++) hash = user.id.charCodeAt(i) + ((hash << 5) - hash);
      const colors = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];
      setProfile({ id: user.id, name, initials: ini, color: colors[Math.abs(hash) % colors.length] });
    })();
  }, []);
  return profile;
}

/* ═══════════════════════════════════════════════
   CUSTOM DROPDOWN (replaces native <select>)
   ═══════════════════════════════════════════════ */
function CustomDropdown({ value, options, onChange, placeholder = 'Select...' }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px', fontSize: 13,
          border: `0.75px solid ${V.border}`, borderRadius: 4,
          background: V.white, color: V.textPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={14} color={V.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: V.white, border: `0.75px solid ${V.border}`, borderRadius: 6,
          boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
          maxHeight: 240, overflowY: 'auto', marginTop: 4, padding: '4px 0',
        }}>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                background: o.value === value ? V.selectedRow : 'transparent',
                color: V.textPrimary,
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = V.hoverRow; }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LINK WORK ITEM MODAL (with custom dropdown)
   ═══════════════════════════════════════════════ */
function LinkWorkItemModal({ isOpen, onClose, issueId, onLinked }: {
  isOpen: boolean; onClose: () => void; issueId: string; onLinked: () => void;
}) {
  const [linkType, setLinkType] = useState('relates_to');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type')
        .or(`summary.ilike.%${q}%,issue_key.ilike.%${q}%`)
        .neq('id', issueId)
        .is('deleted_at', null)
        .limit(10);
      setResults(data ?? []);
    }, 300);
  }, [issueId]);

  const handleLink = useCallback(async () => {
    if (!selected) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_issue_links').insert({
      source_id: issueId,
      target_id: selected.id,
      link_type: linkType,
      created_by: user?.id,
    });
    setSaving(false);
    onLinked();
    onClose();
    setSearch(''); setResults([]); setSelected(null);
    toast.success('Issue linked');
  }, [selected, issueId, linkType, onLinked, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.4)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 520, maxWidth: 'calc(100vw - 48px)', background: V.white,
        borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', maxHeight: '70vh',
        animation: 'sdm-confirm-in 150ms ease-out both',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `0.75px solid ${V.border}`,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: V.textPrimary, fontFamily: 'Sora, sans-serif' }}>Link work item</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: V.textMuted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, flex: 1, overflow: 'auto' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Link type</label>
          <CustomDropdown value={linkType} onChange={setLinkType} options={LINK_TYPES} />

          <label style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search for work item</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: V.textMuted }} />
            <input
              autoFocus value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by key or title..."
              style={{
                width: '100%', padding: '8px 12px 8px 30px', fontSize: 13,
                border: `0.75px solid ${V.border}`, borderRadius: 4,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map(r => {
              const isSelected = selected?.id === r.id;
              return (
                <div
                  key={r.id} onClick={() => setSelected(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 4,
                    background: isSelected ? V.selectedRow : 'transparent',
                    borderBottom: `0.75px solid ${V.insetBg}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = V.hoverRow; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <IssueTypeIcon type={r.issue_type} size={14} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: V.linkBlue, flexShrink: 0 }}>{r.issue_key}</span>
                  <span style={{ flex: 1, fontSize: 13, color: V.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</span>
                  <StatusLozenge status={r.status || 'To Do'} category={r.status_category} />
                </div>
              );
            })}
            {search.length >= 2 && results.length === 0 && (
              <div style={{ fontSize: 13, color: V.textMuted, textAlign: 'center', padding: 16 }}>No results found</div>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          padding: '12px 20px', borderTop: `0.75px solid ${V.border}`,
        }}>
          <button onClick={onClose} style={{
            padding: '6px 16px', fontSize: 13, border: `0.75px solid ${V.border}`,
            borderRadius: 6, background: V.white, color: V.textPrimary, cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={handleLink} disabled={!selected || saving}
            style={{
              padding: '6px 16px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 6, cursor: selected ? 'pointer' : 'not-allowed',
              background: selected ? V.primaryBlue : V.textDisabled, color: '#fff', opacity: saving ? 0.6 : 1,
            }}
          >Link</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════ */
function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 16px' }}>
      <div style={{ color: V.textDisabled }}>{icon}</div>
      <span style={{ fontSize: 13, color: V.textMuted, textAlign: 'center' }}>{message}</span>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   KEY DETAILS STRIP
   ═══════════════════════════════════════════════ */
function KeyDetailsStrip({ story, onAssigneeClick, onFixVersionClick }: {
  story: any;
  onAssigneeClick?: () => void;
  onFixVersionClick?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 0,
      background: V.surfaceBg, borderRadius: 8,
      border: `0.75px solid ${V.borderSubtle}`,
      marginTop: 16, overflow: 'hidden',
    }}>
      <StripField label="Type">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IssueTypeIcon type={story.issue_type} size={16} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.issue_type || 'Story'}</span>
        </div>
      </StripField>
      <StripField label="Priority">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PriorityIcon priority={story.priority} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.priority || 'Medium'}</span>
        </div>
      </StripField>
      <StripField label="Assignee">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderRadius: 4, padding: '2px 4px', margin: '-2px -4px', transition: 'background 120ms' }}
          onClick={onAssigneeClick}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Click to change assignee"
        >
          <AvatarCircle name={story.assignee_display_name} size={20} />
          <span style={{ fontSize: 13, fontWeight: 500, color: story.assignee_display_name ? V.textPrimary : V.textMuted }}>
            {story.assignee_display_name || 'Unassigned'}
          </span>
          <ChevronDown size={12} style={{ color: V.textMuted, marginLeft: 2 }} />
        </div>
      </StripField>
      <StripField label="Reporter">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AvatarCircle name={story.reporter_display_name} size={20} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.reporter_display_name || '—'}</span>
        </div>
      </StripField>
      {story.parent_key && (
        <StripField label="Epic">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IssueTypeIcon type="epic" size={14} />
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: V.linkBlue }}>{story.parent_key}</span>
          </div>
        </StripField>
      )}
      <StripField label="Fix Versions">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', borderRadius: 4, padding: '2px 4px', margin: '-2px -4px', transition: 'background 120ms' }}
          onClick={onFixVersionClick}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Click to change fix version"
        >
          {story.fix_versions ? (
            <span style={{
              display: 'inline-block', background: V.lozengeGreyBg, color: V.lozengeGreyText,
              padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600,
            }}>
              {String(story.fix_versions)}
            </span>
          ) : (
            <span style={{ fontSize: 13, color: V.textMuted }}>—</span>
          )}
          <ChevronDown size={12} style={{ color: V.textMuted, marginLeft: 2 }} />
        </div>
      </StripField>
    </div>
  );
}

function StripField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 16px', minWidth: 120, flex: '1 0 auto', borderRight: `0.75px solid ${V.borderSubtle}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      {children}
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
  const currentUser = useCurrentUserProfile();

  // ── STATE ─────────────────────────────────────
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'history'>('all');
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watcherCount, setWatcherCount] = useState(0);
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [editingAssignee, setEditingAssignee] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [assigneeResults, setAssigneeResults] = useState<any[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState('');
  const [editingFixVersion, setEditingFixVersion] = useState(false);
  const [fixVersionResults, setFixVersionResults] = useState<any[]>([]);
  const [fixVersionSearch, setFixVersionSearch] = useState('');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; confirmLabel: string;
    danger: boolean; onConfirm: () => void;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const fixVersionRef = useRef<HTMLDivElement>(null);

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
      if (plusMenuOpen && plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
      if (statusOpen && statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
      if (priorityOpen && priorityRef.current && !priorityRef.current.contains(e.target as Node)) setPriorityOpen(false);
      if (editingAssignee && assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setEditingAssignee(false);
      if (editingFixVersion && fixVersionRef.current && !fixVersionRef.current.contains(e.target as Node)) setEditingFixVersion(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen, plusMenuOpen, statusOpen, priorityOpen, editingAssignee, editingFixVersion]);

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
      if (!data || data.length === 0) return [];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
        (profiles ?? []).forEach(p => { profileMap[p.id] = p.full_name || 'Unknown'; });
      }
      return data.map(c => ({
        ...c,
        author_name: c.author_id ? (profileMap[c.author_id] || 'User') : 'User',
        source: 'catalyst' as const,
      }));
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
      ...nativeComments.map(c => ({ id: c.id, body: c.body, author: c.author_name || 'User', authorId: c.author_id, time: c.created_at, src: 'catalyst' })),
      ...jiraComments.map(c => ({ id: c.id, body: c.body, author: c.author_name || 'User', authorId: null as string | null, time: c.created_at, src: 'jira' })),
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
        id: h.id, author: h.author_display_name || 'System', field: h.field_name,
        from: h.from_string, to: h.to_string, time: h.jira_created_at, src: 'jira',
      })),
    ];
    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return merged;
  }, [nativeHistory, jiraHistory]);

  // ── ATTACHMENTS ───────────────────────────────
  const { data: attachments = [] } = useQuery({
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
      const { count } = await supabase.from('ph_watchers').select('*', { count: 'exact', head: true }).eq('work_item_id', itemId);
      setWatcherCount(count ?? 0);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('ph_watchers').select('work_item_id').eq('work_item_id', itemId).eq('user_id', user.id).maybeSingle();
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
    toast.success('Description saved');
  }, [descDraft, saveField]);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    const cat = getStatusCategory(newStatus);
    await supabase.from('ph_issues').update({ status: newStatus, status_category: cat }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'status', newStatus);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
    setStatusOpen(false);
    toast.success(`Status → ${newStatus}`);
  }, [itemId, qc]);

  const handlePriorityChange = useCallback(async (newPriority: string) => {
    await saveField('priority', newPriority);
    setPriorityOpen(false);
    toast.success(`Priority → ${newPriority}`);
  }, [saveField]);

  const handleAssignToMe = useCallback(async () => {
    if (!currentUser) return;
    await supabase.from('ph_issues').update({
      assignee_account_id: currentUser.id,
      assignee_display_name: currentUser.name,
    }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'assignee', currentUser.name);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
  }, [itemId, qc, currentUser]);

  const handleAssigneeSelect = useCallback(async (profileId: string, displayName: string) => {
    await supabase.from('ph_issues').update({
      assignee_account_id: profileId,
      assignee_display_name: displayName,
    }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'assignee', displayName);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
    setEditingAssignee(false);
  }, [itemId, qc]);

  const handleAssigneeSearch = useCallback(async (q: string) => {
    setAssigneeSearch(q);
    if (q.length < 1) {
      const { data } = await supabase.from('profiles').select('id, full_name').limit(10);
      setAssigneeResults(data ?? []);
      return;
    }
    const { data } = await supabase.from('profiles').select('id, full_name').ilike('full_name', `%${q}%`).limit(10);
    setAssigneeResults(data ?? []);
  }, []);

  const handleFixVersionSearch = useCallback(async (q: string) => {
    setFixVersionSearch(q);
    let query = (supabase as any).from('wh_fix_versions').select('id, name').eq('project_id', projectId).is('deleted_at', null).order('sort_order', { ascending: true }).limit(20);
    if (q.length >= 1) query = query.ilike('name', `%${q}%`);
    const { data } = await query;
    setFixVersionResults(data ?? []);
  }, [projectId]);

  const handleFixVersionSelect = useCallback(async (versionName: string) => {
    await supabase.from('ph_issues').update({
      fix_versions: versionName || null,
    }).eq('id', itemId);
    await enqueueWriteBack(itemId, 'fix_versions', versionName);
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
    setEditingFixVersion(false);
    if (versionName) toast.success(`Fix version → ${versionName}`);
    else toast.success('Fix version cleared');
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
    setCommentFocused(false);
    qc.invalidateQueries({ queryKey: ['ph_comments', itemId] });
    toast.success('Comment added');
  }, [commentBody, itemId, qc]);

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editCommentDraft.trim()) return;
    await supabase.from('ph_comments').update({ body: editCommentDraft.trim() }).eq('id', commentId);
    setEditingCommentId(null);
    setEditCommentDraft('');
    qc.invalidateQueries({ queryKey: ['ph_comments', itemId] });
    toast.success('Comment updated');
  }, [editCommentDraft, itemId, qc]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    setConfirmDialog({
      title: 'Delete comment',
      message: 'This comment will be permanently deleted. This action cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await supabase.from('ph_comments').delete().eq('id', commentId);
        qc.invalidateQueries({ queryKey: ['ph_comments', itemId] });
        setConfirmDialog(null);
        toast.success('Comment deleted');
      },
    });
  }, [itemId, qc]);

  const handleCreateSubtask = useCallback(async () => {
    if (!newSubtaskTitle.trim() || !story) return;
    const { data: { user } } = await supabase.auth.getUser();
    const tempKey = `${story.project_key || 'NEW'}-SUB-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await supabase.from('ph_issues').insert([{
      issue_key: tempKey,
      summary: newSubtaskTitle.trim(),
      parent_key: story.issue_key,
      project_key: story.project_key,
      project_name: (story as any).project_name,
      issue_type: 'Sub-task',
      status: 'To Do',
      status_category: 'todo',
      priority: 'Medium',
      reporter_display_name: currentUser?.name || user?.email || 'Unknown',
      reporter_account_id: user?.id,
      source: 'catalyst',
      jira_created_at: new Date().toISOString(),
      jira_updated_at: new Date().toISOString(),
    } as any]);
    setNewSubtaskTitle('');
    setShowSubtaskInput(false);
    qc.invalidateQueries({ queryKey: ['ph_subtasks', story.issue_key] });
    qc.invalidateQueries({ queryKey: ['ph_issue_detail', itemId] });
    toast.success('Subtask created');
  }, [newSubtaskTitle, story, qc, itemId, currentUser]);

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

  const handleSoftDelete = useCallback((label: string) => {
    setConfirmDialog({
      title: `${label} this issue?`,
      message: label === 'Delete'
        ? 'This action cannot be undone. The issue and all its data will be permanently removed.'
        : 'The issue will be archived and hidden from active views. You can restore it later.',
      confirmLabel: label,
      danger: label === 'Delete',
      onConfirm: async () => {
        await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
        toast.success(`Issue ${label.toLowerCase()}d`);
        setConfirmDialog(null);
        onClose();
      },
    });
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
    setConfirmDialog({
      title: 'Remove link',
      message: 'This will remove the link between these two issues.',
      confirmLabel: 'Remove',
      danger: false,
      onConfirm: async () => {
        await supabase.from('ph_issue_links').delete().eq('id', linkId);
        qc.invalidateQueries({ queryKey: ['ph_issue_links', itemId] });
        setConfirmDialog(null);
        toast.success('Link removed');
      },
    });
  }, [itemId, qc]);

  const handleAttachmentUpload = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File exceeds 10MB limit'); return; }
    const ext = file.name.split('.').pop();
    const path = `attachments/${itemId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('ph_attachments').insert([{
      work_item_id: itemId,
      uploaded_by: user?.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: path,
    } as any]);
    qc.invalidateQueries({ queryKey: ['story-detail-attachments', itemId] });
    setShowUploadZone(false);
    toast.success('File attached');
  }, [itemId, qc]);

  const handleAttachmentDelete = useCallback(async (attachmentId: string, storagePath: string) => {
    setConfirmDialog({
      title: 'Delete attachment',
      message: 'This attachment will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        await supabase.storage.from('attachments').remove([storagePath]);
        await supabase.from('ph_attachments').delete().eq('id', attachmentId);
        qc.invalidateQueries({ queryKey: ['story-detail-attachments', itemId] });
        setConfirmDialog(null);
        toast.success('Attachment deleted');
      },
    });
  }, [itemId, qc]);

  const getAttachmentUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleSaveDueDate = useCallback(async (dateStr: string) => {
    await saveField('due_date', dateStr || null);
    setEditingDueDate(false);
  }, [saveField]);

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
  ] as const;

  const btnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 3, border: 'none',
    background: 'transparent', cursor: 'pointer', color: V.textMuted,
    transition: 'background 120ms, color 120ms',
  };

  const FILE_TYPE_COLORS: Record<string, string> = {
    pdf: '#DC2626', png: '#7C3AED', jpg: '#7C3AED', jpeg: '#7C3AED',
    xlsx: '#16A34A', xls: '#16A34A', csv: '#16A34A',
    docx: '#2563EB', doc: '#2563EB', figma: '#7C3AED',
  };

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: V.overlay, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
          animation: 'sdm-overlay-in 180ms ease-out both',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          style={{
            width: isExpanded ? '96%' : 960,
            maxWidth: isExpanded ? '96%' : 'calc(100vw - 48px)',
            height: isExpanded ? '95vh' : 'auto',
            minHeight: 400,
            maxHeight: isExpanded ? '95vh' : '90vh',
            borderRadius: isExpanded ? 8 : 12,
            transition: 'width 200ms ease, max-width 200ms ease, max-height 200ms ease, border-radius 200ms',
            overflow: 'hidden', display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
            background: V.white,
            animation: 'sdm-card-in 220ms ease-out both',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ═══════════════════════════════════════
             HEADER — 48px
             ═══════════════════════════════════════ */}
          <div style={{
            background: V.headerBg,
            borderBottom: `0.75px solid ${V.borderSubtle}`,
            height: 48, padding: '0 16px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
          }}>
            {/* Breadcrumb — enhanced with parent name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              {story?.parent_key && (
                <>
                  <IssueTypeIcon type="epic" size={16} />
                  <span
                    style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: V.linkBlue, cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => {
                      if (onOpenItem && story?.parent_key) {
                        supabase.from('ph_issues').select('id').eq('issue_key', story.parent_key).single()
                          .then(({ data }) => { if (data) onOpenItem(data.id); });
                      }
                    }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {story.parent_key}
                  </span>
                  {(story as any).parent_summary && (
                    <span style={{ fontSize: 12, color: V.textSecondary, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      — {(story as any).parent_summary}
                    </span>
                  )}
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
              <button onClick={handleToggleWatch} style={{ ...btnBase, color: isWatching ? V.primaryBlue : V.textMuted }} title={isWatching ? 'Stop watching' : 'Watch'}>
                {isWatching ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <span style={{ fontSize: 11, color: V.textMuted, minWidth: 12 }}>{watcherCount}</span>
              <button style={btnBase} title="Copy link" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied');
              }}>
                <Share2 size={15} />
              </button>
              <button style={{ ...btnBase, color: isExpanded ? V.primaryBlue : undefined }} title={isExpanded ? 'Collapse' : 'Expand'} onClick={() => setIsExpanded(e => !e)}>
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* 3-dot menu */}
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(o => !o)} style={{ ...btnBase, background: menuOpen ? V.hoverRow : 'transparent' }}>
                  <MoreHorizontal size={16} />
                </button>
                {menuOpen && (
                  <div style={{
                    position: 'absolute', top: 32, right: 0, width: 220,
                    background: V.white, borderRadius: 6,
                    boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                    border: `0.75px solid ${V.border}`, zIndex: 20, overflow: 'hidden', padding: '4px 0',
                  }}>
                    <MenuBtn icon={<Copy size={14} />} label="Clone issue" onClick={handleClone} />
                    <MenuBtn icon={<Flag size={14} />} label={isFlagged ? 'Remove flag' : 'Add flag'} onClick={() => { setIsFlagged(f => !f); setMenuOpen(false); }} />
                    <div style={{ height: 1, background: V.border, margin: '4px 0' }} />
                    <MenuBtn icon={<Archive size={14} />} label="Archive" onClick={() => { handleSoftDelete('Archive'); setMenuOpen(false); }} />
                    <MenuBtn icon={<Trash2 size={14} />} label="Delete" onClick={() => { handleSoftDelete('Delete'); setMenuOpen(false); }} danger />
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.textMuted, padding: 40, minHeight: 300 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: 13 }}>Loading…</span>
              </div>
            </div>
          ) : isError || !story ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 }}>
              <AlertTriangle size={24} color={V.dangerRed} />
              <span style={{ color: V.dangerRed, fontWeight: 600 }}>Failed to load issue</span>
              <button onClick={() => refetch()} style={{ color: V.primaryBlue, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Retry</button>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
              {/* ═══ LEFT PANE — scrollable ═══ */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 80px' }}>
                {/* TITLE — Sora 22px, hover border */}
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
                      width: '100%', fontSize: 22, fontWeight: 600, color: V.textPrimary,
                      border: `2px solid ${V.primaryBlue}`, background: V.white, borderRadius: 4,
                      padding: '4px 8px', resize: 'none', fontFamily: 'Sora, sans-serif',
                      outline: 'none', lineHeight: 1.3, boxSizing: 'border-box',
                    }}
                    rows={2}
                  />
                ) : (
                  <h1
                    onClick={() => { setTitleDraft(story.summary || ''); setEditingTitle(true); }}
                    style={{
                      fontSize: 22, fontWeight: 600, color: V.textPrimary, margin: 0,
                      cursor: 'text', lineHeight: 1.3, fontFamily: 'Sora, sans-serif',
                      padding: '4px 8px', borderRadius: 4,
                      border: '2px solid transparent',
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = V.border}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
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

                {/* ── KEY DETAILS STRIP (always visible) ── */}
                <div style={{ position: 'relative' }}>
                  <KeyDetailsStrip
                    story={story}
                    onAssigneeClick={() => { setEditingAssignee(true); handleAssigneeSearch(''); }}
                    onFixVersionClick={() => { setEditingFixVersion(true); handleFixVersionSearch(''); }}
                  />

                  {/* Assignee picker popover (anchored to strip) */}
                  {editingAssignee && (
                    <div ref={assigneeRef} style={{
                      position: 'absolute', top: '100%', left: 240, width: 240, zIndex: 50,
                      background: V.white, border: `0.75px solid ${V.border}`,
                      borderRadius: 6, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      padding: 8, marginTop: 4,
                    }}>
                      <input
                        autoFocus value={assigneeSearch}
                        onChange={e => handleAssigneeSearch(e.target.value)}
                        placeholder="Search team members..."
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: 12,
                          border: `0.75px solid ${V.border}`, borderRadius: 4,
                          outline: 'none', marginBottom: 4, boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <div
                          onClick={() => handleAssigneeSelect('', '')}
                          style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, color: V.textMuted, fontStyle: 'italic' }}
                          onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >Unassigned</div>
                        {assigneeResults.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleAssigneeSelect(p.id, p.full_name || 'User')}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3 }}
                            onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <AvatarCircle name={p.full_name} size={20} />
                            <span>{p.full_name || 'Unknown'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fix Version picker popover (anchored to strip) */}
                  {editingFixVersion && (
                    <div ref={fixVersionRef} style={{
                      position: 'absolute', top: '100%', right: 0, width: 240, zIndex: 50,
                      background: V.white, border: `0.75px solid ${V.border}`,
                      borderRadius: 6, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      padding: 8, marginTop: 4,
                    }}>
                      <input
                        autoFocus value={fixVersionSearch}
                        onChange={e => handleFixVersionSearch(e.target.value)}
                        placeholder="Search versions..."
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: 12,
                          border: `0.75px solid ${V.border}`, borderRadius: 4,
                          outline: 'none', marginBottom: 4, boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        <div
                          onClick={() => handleFixVersionSelect('')}
                          style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, color: V.textMuted, fontStyle: 'italic' }}
                          onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >None</div>
                        {fixVersionResults.map(v => (
                          <div
                            key={v.id}
                            onClick={() => handleFixVersionSelect(v.name)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px',
                              fontSize: 12, cursor: 'pointer', borderRadius: 3,
                              background: String(story.fix_versions) === v.name ? V.selectedRow : 'transparent',
                            }}
                            onMouseEnter={e => { if (String(story.fix_versions) !== v.name) e.currentTarget.style.background = V.hoverRow; }}
                            onMouseLeave={e => { if (String(story.fix_versions) !== v.name) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span>{v.name}</span>
                          </div>
                        ))}
                        {fixVersionResults.length === 0 && fixVersionSearch && (
                          <div style={{ padding: '8px', fontSize: 12, color: V.textMuted, textAlign: 'center' }}>No versions found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action row — + button */}
                <div ref={plusMenuRef} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, position: 'relative' }}>
                  <button
                    onClick={() => setPlusMenuOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 4,
                      border: `0.75px solid ${V.border}`, background: V.white,
                      cursor: 'pointer', color: V.textMuted,
                      transition: 'border-color 150ms, color 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = V.primaryBlue; e.currentTarget.style.color = V.primaryBlue; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = V.border; e.currentTarget.style.color = V.textMuted; }}
                    title="Actions"
                  >
                    <Plus size={16} />
                  </button>
                  {plusMenuOpen && (
                    <div style={{
                      position: 'absolute', top: 32, left: 0, width: 220,
                      background: V.white, borderRadius: 6,
                      boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      border: `0.75px solid ${V.border}`, zIndex: 20, overflow: 'hidden', padding: '4px 0',
                    }}>
                      <MenuBtn icon={<Plus size={14} />} label="Create subtask" shortcut="⇧C" onClick={() => { setShowSubtaskInput(true); setPlusMenuOpen(false); }} />
                      <MenuBtn icon={<Link2 size={14} />} label="Link work item" shortcut="⇧K" onClick={() => { setShowLinkModal(true); setPlusMenuOpen(false); }} />
                      <MenuBtn icon={<Paperclip size={14} />} label="Add attachment" onClick={() => { fileInputRef.current?.click(); setPlusMenuOpen(false); }} />
                    </div>
                  )}
                </div>

                {/* ── DESCRIPTION — standalone section ── */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 650, color: V.textPrimary }}>Description</span>
                  </div>
                  {editingDesc ? (
                    <div>
                      <textarea
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%', minHeight: 140, padding: '12px 16px',
                          border: `2px solid ${V.primaryBlue}`, borderRadius: 6,
                          fontSize: 14, color: V.textPrimary, resize: 'vertical',
                          fontFamily: 'Inter, sans-serif', outline: 'none',
                          boxSizing: 'border-box', lineHeight: 1.65,
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
                        position: 'relative', fontSize: 14, lineHeight: 1.65,
                        color: story.description_text ? V.textPrimary : V.textMuted,
                        padding: '10px 14px', minHeight: 60, whiteSpace: 'pre-wrap',
                        borderRadius: 6, fontStyle: story.description_text ? 'normal' : 'italic',
                        cursor: 'default', border: `0.75px solid transparent`,
                        transition: 'border-color 150ms, background 150ms',
                        background: 'transparent',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = V.surfaceBg; e.currentTarget.style.borderColor = V.borderSubtle; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      {story.description_text || 'Add a description…'}
                      <button
                        onClick={() => { setDescDraft(story.description_text ?? ''); setEditingDesc(true); }}
                        className="opacity-0 group-hover:opacity-100"
                        style={{
                          position: 'absolute', top: 10, right: 10,
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

                {/* ── SUBTASKS ── */}
                <Section
                  title="Child issues"
                  count={totalSubtasks}
                  defaultOpen={totalSubtasks > 0}
                  actions={
                    <>
                      {totalSubtasks > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 80, height: 6, background: V.border, borderRadius: 3 }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: V.successGreen, borderRadius: 3, transition: 'width 300ms' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: V.successGreen, fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(progressPct)}%</span>
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
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px',
                        gap: 8, padding: '0 8px', height: 36, alignItems: 'center',
                        background: V.insetBg, borderBottom: `0.75px solid ${V.border}`,
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.04em', color: V.textMuted,
                      }}>
                        <span>Work</span>
                        <span>Priority</span>
                        <span>Assignee</span>
                        <span>Status</span>
                      </div>
                      {subtasks.map(st => {
                        const isDone = getStatusCategory(st.status || '') === 'done';
                        return (
                          <div
                            key={st.id}
                            onClick={() => onOpenItem?.(st.id)}
                            style={{
                              display: 'grid', gridTemplateColumns: '1fr 60px 80px 80px',
                              gap: 8, padding: '0 8px', height: 36, alignItems: 'center',
                              borderBottom: `0.75px solid ${V.border}`,
                              cursor: 'pointer', background: V.white,
                              transition: 'background 120ms',
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
                            <AvatarCircle name={st.assignee_display_name} size={22} />
                            <StatusLozenge status={st.status || 'To Do'} category={st.status_category} />
                          </div>
                        );
                      })}
                    </>
                  )}
                  {subtasks.length === 0 && !showSubtaskInput && (
                    <EmptyState
                      icon={<Plus size={24} />}
                      message="No child issues yet. Create one to break down this work item."
                      action={
                        <button onClick={() => setShowSubtaskInput(true)} style={{
                          fontSize: 12, fontWeight: 600, color: V.primaryBlue,
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}>+ Create subtask</button>
                      }
                    />
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
                          height: 32, boxSizing: 'border-box',
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

                {/* ── ATTACHMENTS ── */}
                <Section
                  title="Attachments"
                  count={attachments.length}
                  defaultOpen={attachments.length > 0}
                  actions={
                    <button onClick={() => setShowUploadZone(z => !z)} style={{ ...btnBase, width: 24, height: 24, color: V.primaryBlue }}>
                      <Plus size={14} />
                    </button>
                  }
                >
                  {attachments.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {attachments.map(att => {
                        const ext = att.file_name?.split('.').pop()?.toLowerCase() || '';
                        const iconColor = FILE_TYPE_COLORS[ext] || V.textMuted;
                        return (
                          <div key={att.id} className="group" style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                            border: `0.75px solid ${V.borderSubtle}`, borderRadius: 6,
                            position: 'relative', transition: 'border-color 150ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = V.border}
                          onMouseLeave={e => e.currentTarget.style.borderColor = V.borderSubtle}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 4, background: `${iconColor}15`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              {att.mime_type?.startsWith('image/') ? (
                                <img src={getAttachmentUrl(att.storage_path)} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              ) : (
                                <FileText size={16} color={iconColor} />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: V.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</div>
                              <div style={{ fontSize: 11, color: V.textMuted }}>{formatFileSize(att.file_size)} · {relTime(att.created_at)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 2, position: 'absolute', top: 4, right: 4 }} className="opacity-0 group-hover:opacity-100">
                              <a href={getAttachmentUrl(att.storage_path)} target="_blank" rel="noopener noreferrer"
                                style={{ ...btnBase, width: 22, height: 22, borderRadius: '50%', background: V.white, border: `0.75px solid ${V.border}` }} title="Download">
                                <ExternalLink size={12} />
                              </a>
                              <button onClick={() => handleAttachmentDelete(att.id, att.storage_path)}
                                style={{ ...btnBase, width: 22, height: 22, borderRadius: '50%', background: V.white, border: `0.75px solid ${V.border}`, color: V.dangerRed }} title="Delete">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : !showUploadZone ? (
                    <EmptyState
                      icon={<Upload size={24} />}
                      message="No attachments. Drag files here or click + to add."
                    />
                  ) : null}
                  {showUploadZone && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `1.5px dashed ${V.border}`, borderRadius: 6, height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', marginTop: 8, transition: 'border-color 150ms',
                        fontSize: 12, color: V.textMuted, gap: 6,
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
                      <Upload size={14} /> Drop files here or click to upload (max 10MB)
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleAttachmentUpload(file);
                    e.target.value = '';
                  }} />
                </Section>

                {/* ── LINKED WORK ITEMS ── */}
                <Section
                  title="Linked work items"
                  count={linkedIssues.length}
                  defaultOpen={linkedIssues.length > 0}
                  actions={
                    <button onClick={() => setShowLinkModal(true)} style={{ ...btnBase, width: 24, height: 24, color: V.primaryBlue }}>
                      <Plus size={14} />
                    </button>
                  }
                >
                  {Object.keys(linkGroups).length === 0 && (
                    <EmptyState
                      icon={<Link2 size={24} />}
                      message="No linked work items. Use + menu to create a link."
                    />
                  )}
                  {Object.entries(linkGroups).map(([type, items]) => (
                    <div key={type} style={{ marginBottom: 8 }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.04em', color: V.textMuted,
                        marginBottom: 4, padding: '4px 8px', background: V.insetBg, borderRadius: 3,
                      }}>
                        {LINK_TYPES.find(l => l.value === type)?.label || type.replace(/_/g, ' ')}
                      </div>
                      {items.map(li => {
                        const isDone = getStatusCategory(li.status || '') === 'done';
                        return (
                          <div
                            key={li.id} className="group"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, height: 36,
                              padding: '0 8px', borderBottom: `0.75px solid ${V.border}`,
                              transition: 'background 120ms',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <IssueTypeIcon type={(li as any).issue_type} size={16} />
                            <span
                              style={{
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: V.linkBlue,
                                textDecoration: isDone ? 'line-through' : 'none', cursor: 'pointer',
                              }}
                              onClick={() => onOpenItem?.(li.id)}
                            >{li.issue_key}</span>
                            <span style={{
                              flex: 1, fontSize: 13, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              color: isDone ? V.textMuted : V.textPrimary,
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}>{li.summary}</span>
                            <StatusLozenge status={li.status || 'To Do'} category={(li as any).status_category} />
                            <AvatarCircle name={li.assignee_display_name} size={22} />
                            <PriorityIcon priority={li.priority} />
                            <button
                              onClick={() => handleRemoveLink(li.linkId!)}
                              className="opacity-0 group-hover:opacity-100"
                              style={{ ...btnBase, width: 20, height: 20, transition: 'opacity 100ms' }}
                              title="Remove link"
                            >×</button>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </Section>

                {/* ═══ ACTIVITY ═══ */}
                <div style={{ marginTop: 32 }}>
                  <span style={{ fontSize: 14, fontWeight: 650, color: V.textPrimary }}>Activity</span>

                  <div style={{ display: 'flex', gap: 0, borderBottom: `0.75px solid ${V.border}`, marginTop: 8, alignItems: 'center' }}>
                    {activityTabs.map(tab => (
                      <button
                        key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                          padding: '8px 12px', fontSize: 13, fontWeight: activeTab === tab.key ? 650 : 400,
                          color: activeTab === tab.key ? V.primaryBlue : V.textMuted,
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          borderBottom: activeTab === tab.key ? `2px solid ${V.primaryBlue}` : '2px solid transparent',
                          marginBottom: -0.75, whiteSpace: 'nowrap', transition: 'color 150ms',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button style={{ ...btnBase, marginBottom: -0.75 }} title="Sort/Filter">
                      <ListFilter size={14} />
                    </button>
                  </div>

                  {/* Comment input */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-start' }}>
                    <AvatarCircle name={currentUser?.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <textarea
                        ref={commentInputRef}
                        value={commentBody}
                        onChange={e => setCommentBody(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveComment(); }}
                        placeholder="Add a comment..."
                        onFocus={() => setCommentFocused(true)}
                        style={{
                          width: '100%', border: `0.75px solid ${V.border}`, borderRadius: 6,
                          padding: '8px 12px', fontSize: 13, color: V.textPrimary,
                          minHeight: commentFocused ? 60 : 36,
                          resize: 'none', fontFamily: 'inherit', outline: 'none',
                          boxSizing: 'border-box', transition: 'min-height 150ms, border-color 150ms',
                        }}
                        onMouseEnter={e => { if (!commentFocused) e.currentTarget.style.borderColor = V.textDisabled; }}
                        onMouseLeave={e => { if (!commentFocused) e.currentTarget.style.borderColor = V.border; }}
                      />
                      {(commentBody.trim() || commentFocused) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={handleSaveComment} disabled={!commentBody.trim()} style={{
                            padding: '5px 14px', fontSize: 12, fontWeight: 600,
                            color: '#fff', background: commentBody.trim() ? V.primaryBlue : V.textDisabled,
                            border: 'none', borderRadius: 6, cursor: commentBody.trim() ? 'pointer' : 'not-allowed',
                          }}>Save</button>
                          <button onClick={() => { setCommentBody(''); setCommentFocused(false); }} style={{
                            padding: '5px 14px', fontSize: 12,
                            color: V.textMuted, background: 'none',
                            border: `0.75px solid ${V.border}`, borderRadius: 6, cursor: 'pointer',
                          }}>Cancel</button>
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: V.textDisabled, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <kbd style={{ display: 'inline-block', padding: '1px 4px', fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', background: V.insetBg, border: `0.75px solid ${V.border}`, borderRadius: 2, color: V.textMuted }}>⌘</kbd>
                        <span>+</span>
                        <kbd style={{ display: 'inline-block', padding: '1px 4px', fontSize: 10, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', background: V.insetBg, border: `0.75px solid ${V.border}`, borderRadius: 2, color: V.textMuted }}>↵</kbd>
                        <span>to save</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity entries */}
                  <div style={{ marginTop: 16 }}>
                    {(activeTab === 'all' || activeTab === 'comments') && allComments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 8, padding: '10px 0', borderBottom: `0.75px solid ${V.insetBg}` }}>
                        <AvatarCircle name={c.author} size={28} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 650, color: V.textPrimary }}>{c.author}</span>
                            <span style={{ fontSize: 11, color: V.textMuted }}>{relTime(c.time)}</span>
                          </div>
                          {editingCommentId === c.id ? (
                            <div style={{ marginTop: 4 }}>
                              <textarea
                                autoFocus value={editCommentDraft}
                                onChange={e => setEditCommentDraft(e.target.value)}
                                style={{
                                  width: '100%', minHeight: 60, padding: '8px 12px',
                                  border: `2px solid ${V.primaryBlue}`, borderRadius: 4,
                                  fontSize: 13, fontFamily: 'inherit', outline: 'none',
                                  boxSizing: 'border-box', resize: 'vertical',
                                }}
                              />
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button onClick={() => handleEditComment(c.id)} style={{
                                  padding: '4px 12px', fontSize: 12, fontWeight: 600,
                                  background: V.primaryBlue, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer',
                                }}>Save</button>
                                <button onClick={() => { setEditingCommentId(null); setEditCommentDraft(''); }} style={{
                                  padding: '4px 12px', fontSize: 12, color: V.textMuted,
                                  background: 'none', border: `0.75px solid ${V.border}`, borderRadius: 6, cursor: 'pointer',
                                }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: 13, color: V.textPrimary, marginTop: 4, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                              {c.src === 'catalyst' && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  <button onClick={() => { setEditingCommentId(c.id); setEditCommentDraft(c.body); }} style={{
                                    fontSize: 12, color: V.textMuted, background: 'none', border: 'none', cursor: 'pointer',
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.color = V.primaryBlue}
                                    onMouseLeave={e => e.currentTarget.style.color = V.textMuted}
                                  >Edit</button>
                                  <button onClick={() => handleDeleteComment(c.id)} style={{
                                    fontSize: 12, color: V.textMuted, background: 'none', border: 'none', cursor: 'pointer',
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.color = V.dangerRed}
                                    onMouseLeave={e => e.currentTarget.style.color = V.textMuted}
                                  >Delete</button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {(activeTab === 'all' || activeTab === 'history') && allHistory.map(h => (
                      <div key={h.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `0.75px solid ${V.insetBg}`, alignItems: 'center' }}>
                        <AvatarCircle name={h.author} size={24} />
                        <div style={{ flex: 1, fontSize: 13, color: V.textPrimary }}>
                          <span style={{ fontWeight: 650 }}>{h.author}</span>
                          {' changed '}
                          <span style={{ fontWeight: 650 }}>{humanFieldName(h.field)}</span>
                          {h.from && (
                            <>
                              {' from '}
                              {h.field?.toLowerCase() === 'status'
                                ? <StatusLozenge status={h.from} />
                                : <code style={{ background: V.insetBg, padding: '1px 4px', borderRadius: 2, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{h.from}</code>
                              }
                            </>
                          )}
                          {' to '}
                          {h.field?.toLowerCase() === 'status'
                            ? <StatusLozenge status={h.to || ''} />
                            : <code style={{ background: V.insetBg, padding: '1px 4px', borderRadius: 2, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{h.to}</code>
                          }
                        </div>
                        <span style={{ fontSize: 11, color: V.textMuted, flexShrink: 0 }}>{relTime(h.time)}</span>
                      </div>
                    ))}

                    {activeTab === 'comments' && allComments.length === 0 && (
                      <EmptyState icon={<MessageSquare size={24} />} message="No comments yet. Be the first to add one." />
                    )}
                    {activeTab === 'history' && allHistory.length === 0 && (
                      <EmptyState icon={<Clock size={24} />} message="No changes recorded yet." />
                    )}
                    {activeTab === 'all' && allComments.length === 0 && allHistory.length === 0 && (
                      <EmptyState icon={<Clock size={24} />} message="No activity yet." />
                    )}
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════
                 RIGHT SIDEBAR — 280px
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
                      letterSpacing: '0.03em', cursor: 'pointer',
                      border: `1px solid ${V.statusBorder}`,
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
                      borderRadius: 6, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                      padding: '4px 0',
                    }}>
                      {STATUS_OPTIONS.map(opt => (
                        <div
                          key={opt.label} onClick={() => handleStatusChange(opt.label)}
                          style={{
                            padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'background 120ms',
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

                <div style={{ height: 1, background: V.border, marginBottom: 12 }} />

                {/* DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Priority — clickable picker */}
                  <SidebarField label="Priority">
                    <div ref={priorityRef} style={{ position: 'relative' }}>
                      <div
                        onClick={() => setPriorityOpen(o => !o)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '4px 0' }}
                      >
                        <PriorityIcon priority={story.priority} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: V.textPrimary }}>{story.priority || 'Medium'}</span>
                        <ChevronDown size={12} color={V.textMuted} />
                      </div>
                      {priorityOpen && (
                        <div style={{
                          position: 'absolute', top: 32, left: 0, width: 180, zIndex: 50,
                          background: V.white, border: `0.75px solid ${V.border}`,
                          borderRadius: 6, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                          padding: '4px 0',
                        }}>
                          {PRIORITY_OPTIONS.map(p => (
                            <div
                              key={p.value} onClick={() => handlePriorityChange(p.value)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                                background: story.priority === p.value ? V.selectedRow : 'transparent',
                                transition: 'background 120ms',
                              }}
                              onMouseEnter={e => { if (story.priority !== p.value) e.currentTarget.style.background = V.hoverRow; }}
                              onMouseLeave={e => { if (story.priority !== p.value) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <PriorityIcon priority={p.value} size={14} />
                              <span>{p.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SidebarField>

                  {/* Fix Versions */}
                  <SidebarField label="Fix versions">
                    <span style={{ fontSize: 14, color: story.fix_versions ? V.textPrimary : V.textMuted }}>
                      {story.fix_versions ? (
                        <span style={{
                          display: 'inline-block', background: V.lozengeGreyBg, color: V.lozengeGreyText,
                          padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                        }}>{String(story.fix_versions)}</span>
                      ) : 'None'}
                    </span>
                  </SidebarField>

                  {/* Assignee */}
                  <SidebarField label="Assignee">
                    <div ref={assigneeRef} style={{ position: 'relative' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        onClick={() => { setEditingAssignee(true); handleAssigneeSearch(''); }}
                      >
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

                      {editingAssignee && (
                        <div style={{
                          position: 'absolute', top: 40, left: 0, width: 240, zIndex: 50,
                          background: V.white, border: `0.75px solid ${V.border}`,
                          borderRadius: 6, boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
                          padding: 8,
                        }}>
                          <input
                            autoFocus value={assigneeSearch}
                            onChange={e => handleAssigneeSearch(e.target.value)}
                            placeholder="Search team members..."
                            style={{
                              width: '100%', padding: '6px 8px', fontSize: 12,
                              border: `0.75px solid ${V.border}`, borderRadius: 4,
                              outline: 'none', marginBottom: 4, boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                            <div
                              onClick={() => handleAssigneeSelect('', '')}
                              style={{ padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3, color: V.textMuted, fontStyle: 'italic' }}
                              onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >Unassigned</div>
                            {assigneeResults.map(p => (
                              <div
                                key={p.id}
                                onClick={() => handleAssigneeSelect(p.id, p.full_name || 'User')}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 3 }}
                                onMouseEnter={e => e.currentTarget.style.background = V.hoverRow}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <AvatarCircle name={p.full_name} size={20} />
                                <span>{p.full_name || 'Unknown'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                          background: V.borderSubtle, color: V.lozengeGreyText, padding: '2px 8px',
                          borderRadius: 9999, fontSize: 11, fontWeight: 600,
                        }}>{l}</span>
                      )) : <span style={{ fontSize: 14, color: V.textMuted }}>None</span>}
                    </div>
                  </SidebarField>

                  {/* Due Date */}
                  <SidebarField label="Due Date">
                    {editingDueDate ? (
                      <input
                        type="date" autoFocus value={dueDateDraft}
                        onChange={e => { setDueDateDraft(e.target.value); handleSaveDueDate(e.target.value); }}
                        onBlur={() => setEditingDueDate(false)}
                        style={{
                          border: `0.75px solid ${V.primaryBlue}`, borderRadius: 4,
                          padding: '4px 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <span
                        onClick={() => { setDueDateDraft(story.due_date || ''); setEditingDueDate(true); }}
                        style={{
                          fontSize: 14, cursor: 'pointer',
                          color: story.due_date
                            ? (new Date(story.due_date) < new Date() ? V.dangerRed : V.textPrimary)
                            : V.textMuted,
                        }}
                      >
                        {story.due_date
                          ? new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(story.due_date))
                          : 'None'}
                      </span>
                    )}
                  </SidebarField>
                </div>

                <div style={{ height: 1, background: V.border, margin: '16px 0' }} />

                {/* TIMESTAMPS */}
                <div>
                  <div style={{ fontSize: 12, color: V.textMuted, marginBottom: 4 }}>
                    Created {formatFullDate(story.jira_created_at)}
                  </div>
                  <div style={{ fontSize: 12, color: V.textMuted }}>
                    Updated {formatFullDate(story.jira_updated_at)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Link Work Item Modal */}
      <LinkWorkItemModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        issueId={itemId}
        onLinked={() => qc.invalidateQueries({ queryKey: ['ph_issue_links', itemId] })}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        danger={confirmDialog?.danger || false}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </>
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
        height: 36, transition: 'background 120ms',
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
      <span style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      {children}
    </div>
  );
}
