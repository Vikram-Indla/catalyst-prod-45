/**
 * StoryDetailModal — V13 Rebuild · Stage C (Full UI)
 * Jira-style two-panel detail modal for work items.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  X, ChevronDown, ChevronRight, Plus, Paperclip,
  ExternalLink, Share2, Pencil, Search, MessageSquare, Clock,
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
    @keyframes sdm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes sdm-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   TYPESCRIPT INTERFACES
   ═══════════════════════════════════════════════ */

interface PhIssue {
  id: string;
  issue_key: string;
  summary: string;
  description_adf: any | null;
  description_text: string | null;
  status: string;
  status_category: string;
  priority: string | null;
  issue_type: string;
  parent_key: string | null;
  parent_summary: string | null;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  reporter_account_id: string | null;
  reporter_display_name: string | null;
  project_key: string;
  fix_versions: any | null;
  labels: string[] | null;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  deleted_at: string | null;
}

interface FixVersion { id: string; name: string; released: boolean; releaseDate?: string; }

interface PhComment {
  id: string; work_item_id: string; body: string; author_id: string;
  created_at: string; updated_at: string; author?: Profile;
}

interface PhActivityLog {
  id: string; work_item_id: string; action: string; field_name: string | null;
  old_value: string | null; new_value: string | null; user_id: string;
  metadata: any | null; created_at: string; actor?: Profile;
}

interface PhIssueLink {
  id: string; source_id: string; target_id: string; link_type: string;
  created_by: string; created_at: string; target_issue?: PhIssue;
}

interface PhAttachment {
  id: string; work_item_id: string; file_name: string; file_size: number;
  mime_type: string; storage_path: string; uploaded_by: string;
  created_at: string; uploader?: Profile;
}

interface TmTestCase {
  id: string; case_key: string; title: string; type?: string;
  status: string; assigned_to?: string | null; created_at: string;
  assignee?: Profile;
}

interface TmTestCaseLink {
  test_case_id: string; linked_item_id: string; linked_item_type: string;
  linked_at: string; test_case?: TmTestCase;
}

interface ThTestExecution {
  id?: string; test_case_id: string; cycle_scope_id?: string | null;
  test_cycle_id: string; execution_number?: number; result: string;
  executed_by: string; executed_at: string; cycle_name?: string;
}

interface TmTestCycle {
  id: string; name: string; total_cases: number; passed_count: number;
  failed_count: number; blocked_count?: number; skipped_count?: number;
  not_run_count?: number; created_at: string; executions?: ThTestExecution[];
}

interface RhRelease {
  id: string; name: string; key: string; status: string;
  target_date: string | null; project_id: string;
}

interface RhChange {
  id: string; chg_number: string; title: string; status: string;
  release_id: string | null;
}

interface Profile {
  id: string; full_name: string | null; avatar_url: string | null;
  email: string | null;
}

interface ProjectMember {
  user_id: string; role: string; profile?: Profile;
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const STATUS_CATEGORIES: Record<string, string[]> = {
  todo: ['Backlog', 'To Do', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation'],
  in_progress: ['In Development', 'In Progress', 'In Review', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'On Hold', 'Analysis', 'Blocked', 'Awaiting Info'],
  done: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'],
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  todo: { bg: '#F4F5F7', text: '#42526E' }, in_progress: { bg: '#0052CC', text: '#FFFFFF' },
  done: { bg: '#36B37E', text: '#FFFFFF' }, blocked: { bg: '#FF5630', text: '#FFFFFF' },
  on_hold: { bg: '#FF991F', text: '#FFFFFF' }, in_uat: { bg: '#00B8D9', text: '#FFFFFF' },
  in_beta: { bg: '#36B37E', text: '#FFFFFF' }, in_prod: { bg: '#006644', text: '#FFFFFF' },
  in_review: { bg: '#FF991F', text: '#FFFFFF' },
};

function getStatusStyle(status: string, category: string) {
  const s = status.toLowerCase();
  if (s === 'blocked') return STATUS_STYLES.blocked;
  if (s === 'on hold') return STATUS_STYLES.on_hold;
  if (s === 'in uat') return STATUS_STYLES.in_uat;
  if (s === 'in beta') return STATUS_STYLES.in_beta;
  if (s === 'in production') return STATUS_STYLES.in_prod;
  if (s === 'in review') return STATUS_STYLES.in_review;
  return STATUS_STYLES[category] ?? STATUS_STYLES.todo;
}

const PRIORITY_STYLES: Record<string, { color: string; symbol: string }> = {
  Highest: { color: '#AE2A19', symbol: '▲▲' }, High: { color: '#DE350B', symbol: '▲' },
  Medium: { color: '#D97706', symbol: '—' }, Low: { color: '#36B37E', symbol: '▼' },
  Lowest: { color: '#6B778C', symbol: '▼▼' },
};

const LINK_TYPE_LABELS: Record<string, string> = {
  relates_to: 'Relates to', blocks: 'Blocks', is_blocked_by: 'Is blocked by',
  duplicates: 'Duplicates', is_duplicated_by: 'Is duplicated by',
  implements: 'Implements', is_implemented_by: 'Is implemented by',
  clones: 'Clones', is_cloned_by: 'Is cloned by',
};

const STATUS_OPTION_GROUPS = [
  { groupLabel: 'TO DO', category: 'todo', statuses: STATUS_CATEGORIES.todo },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: STATUS_CATEGORIES.in_progress },
  { groupLabel: 'DONE', category: 'done', statuses: STATUS_CATEGORIES.done },
];

const LINK_TYPES = [
  'relates_to', 'blocks', 'is_blocked_by', 'duplicates',
  'is_duplicated_by', 'implements', 'is_implemented_by', 'clones', 'is_cloned_by',
] as const;

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusCategory(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'completed', 'approved', 'closed', 'released'].some(k => lower.includes(k))) return 'done';
  if (['progress', 'review', 'beta', 'active', 'development', 'requirements'].some(k => lower.includes(k))) return 'in_progress';
  return 'todo';
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function getAvatarColor(id: string): string {
  const colors = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#FF991F', '#00B8D9', '#166534', '#9E4C00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getSeverity(priority: string | null): { label: string; bg: string; color: string } {
  if (!priority) return { label: 'SEV-3', bg: '#F1F5F9', color: '#475569' };
  if (priority === 'Highest' || priority === 'High') return { label: 'SEV-1', bg: '#FFE2DD', color: '#AE2A19' };
  if (priority === 'Medium') return { label: 'SEV-2', bg: '#FFF0E6', color: '#9E4C00' };
  return { label: 'SEV-3', bg: '#F1F5F9', color: '#475569' };
}

/* ── CANONICAL WORK ITEM SVGs ─────────────────── */

function IssueIcon({ type, size = 16 }: { type: string; size?: number }) {
  const t = type?.toLowerCase() || '';
  if (t.includes('epic')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#6554C0"/><path d="M10.5 3.5L6.5 8.5h3l-4 4" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (t.includes('bug') || t.includes('defect')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#FF5630"/><circle cx="8" cy="8" r="3" fill="#FFF"/></svg>
  );
  if (t.includes('sub')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#0052CC"/><rect x="4" y="4" width="4" height="4" rx="0.5" fill="#FFF"/><rect x="8" y="8" width="4" height="4" rx="0.5" fill="#FFF" opacity="0.7"/></svg>
  );
  if (t.includes('incident')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 1L15 14H1L8 1Z" fill="#FF5630"/><rect x="7.25" y="5" width="1.5" height="5" rx="0.75" fill="#FFF"/><circle cx="8" cy="12" r="0.75" fill="#FFF"/></svg>
  );
  if (t.includes('task')) return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect width="16" height="16" rx="3" fill="#4BADE8"/><path d="M4.5 8.5L7 11L11.5 5.5" stroke="#FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  // Default: Story
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M4 1h6.5L14 4.5V13a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" fill="#36B37E"/><path d="M10 1v4h4" fill="#2A9D3E"/></svg>
  );
}

function StatusLozenge({ status, category }: { status: string; category?: string | null }) {
  const cat = category?.toLowerCase() || getStatusCategory(status);
  let bg = '#DFE1E6', color = '#253858';
  if (cat === 'done') { bg = '#E3FCEF'; color = '#006644'; }
  else if (cat === 'in_progress' || cat === 'inprogress') { bg = '#DEEBFF'; color = '#0747A6'; }
  return (
    <span style={{
      display: 'inline-block', height: 20, lineHeight: '20px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      borderRadius: 3, padding: '0 6px', whiteSpace: 'nowrap',
      background: bg, color,
    }}>{status}</span>
  );
}

function JiraStatusPill({ status, category }: { status: string; category: string }) {
  const style = getStatusStyle(status, category);
  return (
    <span style={{
      display: 'inline-block', height: 22, lineHeight: '22px', fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      borderRadius: 4, padding: '0 8px', whiteSpace: 'nowrap',
      background: style.bg, color: style.text,
    }}>{status}</span>
  );
}

/* Skeleton bar */
function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: '#F1F5F9', animation: 'sdm-pulse 1.5s ease-in-out infinite' }} />;
}

/* ═══════════════════════════════════════════════
   PROPS & TYPES
   ═══════════════════════════════════════════════ */

interface StoryDetailModalProps {
  isOpen: boolean; onClose: () => void; itemId: string;
  projectId: string; projectKey: string; onOpenItem?: (itemId: string) => void;
}

type ChildTab = 'subtasks' | 'defects' | 'incidents' | 'testcases' | 'executions';
type ActivityTab = 'comments' | 'history';

/* Table cell style constant */
const TC: React.CSSProperties = {
  padding: '8px 12px', fontSize: 12, fontFamily: 'Inter, sans-serif',
  borderBottom: '0.75px solid #E4E7EC', whiteSpace: 'nowrap', overflow: 'hidden',
  textOverflow: 'ellipsis', maxWidth: 200, color: '#101828',
};
const TH: React.CSSProperties = {
  ...TC, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: '#98A2B3', background: '#F8FAFC',
  position: 'sticky', top: 0, zIndex: 2, borderBottom: '0.75px solid #E4E7EC',
};

/* ═══════════════════════════════════════════════
   COMPONENT
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

  const { data: subtasks = [] } = useQuery({
    queryKey: ['ph-subtasks', issue?.issue_key], enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('*').eq('parent_key', issue!.issue_key).eq('issue_type', 'Sub-task').is('deleted_at', null).order('jira_created_at', { ascending: true });
      return (data ?? []) as unknown as PhIssue[];
    },
  });

  const { data: defects = [] } = useQuery({
    queryKey: ['ph-defects', issue?.issue_key], enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('*').eq('parent_key', issue!.issue_key).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null).order('jira_created_at', { ascending: false });
      return (data ?? []) as unknown as PhIssue[];
    },
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['ph-incidents', issue?.issue_key], enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('*').eq('parent_key', issue!.issue_key).eq('issue_type', 'Production Incident').is('deleted_at', null).order('jira_created_at', { ascending: false });
      return (data ?? []) as unknown as PhIssue[];
    },
  });

  const { data: issueLinks = [] } = useQuery({
    queryKey: ['ph-issue-links', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data: links } = await supabase.from('ph_issue_links').select('id, source_id, target_id, link_type, created_by, created_at').or(`source_id.eq.${itemId},target_id.eq.${itemId}`).order('created_at', { ascending: false });
      if (!links?.length) return [];
      const targetIds = links.map(l => l.source_id === itemId ? l.target_id : l.source_id);
      const { data: targets } = await supabase.from('ph_issues').select('id, issue_key, summary, issue_type, status, status_category').in('id', targetIds).is('deleted_at', null);
      const targetMap = new Map((targets ?? []).map(t => [t.id, t]));
      return links.map(l => ({ ...l, target_issue: targetMap.get(l.source_id === itemId ? l.target_id : l.source_id) })) as unknown as PhIssueLink[];
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

  const { data: testCases = [] } = useQuery({
    queryKey: ['tm-test-cases', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data: links } = await supabase.from('tm_test_case_links').select('test_case_id, linked_at').eq('linked_item_id', itemId).eq('linked_item_type', 'story');
      if (!links?.length) return [];
      const caseIds = links.map(l => l.test_case_id);
      const { data: cases } = await supabase.from('tm_test_cases').select('id, case_key, title, status, assigned_to, created_at').in('id', caseIds);
      return (cases ?? []) as unknown as TmTestCase[];
    },
  });

  const { data: testCycles = [] } = useQuery({
    queryKey: ['tm-test-cycles', itemId], enabled: testCases.length > 0,
    queryFn: async () => {
      const caseIds = testCases.map(tc => tc.id);
      const { data: executions } = await supabase.from('th_test_executions').select('test_case_id, test_cycle_id, result, executed_by, executed_at, cycle_name').in('test_case_id', caseIds).order('executed_at', { ascending: false });
      if (!executions?.length) return [];
      const cycleMap = new Map<string, TmTestCycle>();
      for (const exec of executions) {
        if (!exec.test_cycle_id) continue;
        if (!cycleMap.has(exec.test_cycle_id)) {
          cycleMap.set(exec.test_cycle_id, { id: exec.test_cycle_id, name: exec.cycle_name ?? exec.test_cycle_id, total_cases: 0, passed_count: 0, failed_count: 0, blocked_count: 0, not_run_count: 0, created_at: exec.executed_at, executions: [] });
        }
        const c = cycleMap.get(exec.test_cycle_id)!;
        c.total_cases++;
        if (exec.result === 'passed') c.passed_count++;
        else if (exec.result === 'failed') c.failed_count++;
        else if (exec.result === 'blocked') c.blocked_count = (c.blocked_count ?? 0) + 1;
        else c.not_run_count = (c.not_run_count ?? 0) + 1;
        c.executions?.push(exec as ThTestExecution);
      }
      return Array.from(cycleMap.values());
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

  const { data: rhChanges = [] } = useQuery({
    queryKey: ['rh-changes-active', projectId], enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('rh_changes').select('id, chg_number, title, status, release_id').in('status', ['new', 'in_beta', 'in_uat']).order('chg_number', { ascending: false });
      return (data ?? []) as RhChange[];
    },
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId], enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_project_members').select('user_id, role').eq('project_id', projectId);
      if (!data?.length) return [];
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => ({ ...d, profile: profileMap.get(d.user_id) })) as unknown as ProjectMember[];
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
  const [activeChildTab, setActiveChildTab] = useState<ChildTab>('subtasks');
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');
  const [showAiImprove, setShowAiImprove] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaError, setFigmaError] = useState('');
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkType, setLinkType] = useState<string>('relates_to');

  const [linkSearchResults, setLinkSearchResults] = useState<PhIssue[]>([]);
  const [selectedLinkTarget, setSelectedLinkTarget] = useState<PhIssue | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (issue) {
      setLocalStatus(issue.status);
      setLocalPriority(issue.priority ?? 'Medium');
    }
  }, [issue?.id]);

  /* ── MUTATIONS ─────────────────────────────── */

  function resolveStatusCategory(status: string): string {
    for (const [cat, statuses] of Object.entries(STATUS_CATEGORIES)) {
      if (statuses.includes(status)) return cat;
    }
    return 'todo';
  }

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase.from('ph_issues')
        .update({ status: newStatus, status_category: resolveStatusCategory(newStatus) })
        .eq('id', itemId);
      if (error) throw error;
      await supabase.from('jira_write_back_queue').insert({
        ph_issue_id: itemId,
        field_name: 'status', new_value: newStatus, status: 'approved',
      });
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to update status: ${err.message}`); },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value, oldValue }: { field: string; value: string; oldValue: string }) => {
      const { error } = await supabase.from('ph_issues').update({ [field]: value }).eq('id', itemId);
      if (error) throw error;
      await supabase.from('ph_activity_log').insert({
        work_item_id: itemId, action: 'updated', field_name: field,
        old_value: oldValue, new_value: value, user_id: user!.id,
      });
      await supabase.from('jira_write_back_queue').insert({
        ph_issue_id: itemId,
        field_name: field, new_value: value, status: 'approved',
      });
    },
    onSuccess: () => {
      toast.success('Field updated');
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph-activity-log', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to update: ${err.message}`); },
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const { error } = await supabase.from('ph_issues')
        .update({ assignee_account_id: userId, assignee_display_name: displayName })
        .eq('id', itemId);
      if (error) throw error;
      await supabase.from('ph_activity_log').insert({
        work_item_id: itemId, action: 'updated', field_name: 'assignee',
        old_value: issue?.assignee_display_name ?? 'Unassigned',
        new_value: displayName, user_id: user!.id,
      });
    },
    onSuccess: () => {
      toast.success('Assignee updated');
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to update assignee: ${err.message}`); },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!body.trim()) throw new Error('Comment cannot be empty');
      const { error } = await supabase.from('ph_comments')
        .insert({ work_item_id: itemId, body: body.trim(), author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      toast.success('Comment added');
      queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to add comment: ${err.message}`); },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('ph_comments').delete().eq('id', commentId).eq('author_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Comment deleted');
      queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to delete comment: ${err.message}`); },
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ph_issues')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${issue?.issue_key} deleted`);
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      onClose();
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to delete: ${err.message}`); },
  });

  const addLinkMutation = useMutation({
    mutationFn: async ({ targetId, linkTypeVal }: { targetId: string; linkTypeVal: string }) => {
      const { error } = await supabase.from('ph_issue_links')
        .insert({ source_id: itemId, target_id: targetId, link_type: linkTypeVal, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setShowLinkModal(false);
      setSelectedLinkTarget(null);
      setLinkSearch('');
      toast.success('Issue linked');
      queryClient.invalidateQueries({ queryKey: ['ph-issue-links', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to link: ${err.message}`); },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `attachments/${itemId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('ph_attachments')
        .insert({ work_item_id: itemId, file_name: file.name, file_size: file.size,
                  mime_type: file.type, storage_path: path, uploaded_by: user!.id });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Attachment uploaded');
      queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
    },
    onError: (err: any) => { console.error('Mutation failed:', err); toast.error(`Failed to upload: ${err.message}`); },
  });

  const handleCommentSubmit = () => {
    if (newComment.trim()) addCommentMutation.mutate(newComment);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  const assignToMe = () => {
    if (!currentProfile || !user) return;
    updateAssigneeMutation.mutate({
      userId: user.id,
      displayName: currentProfile.full_name ?? user.email ?? 'Me',
    });
  };

  const saveFigmaLink = useCallback(() => {
    if (!/^https:\/\/(www\.)?figma\.com\//.test(figmaUrl)) {
      setFigmaError('Only Figma URLs accepted (figma.com)');
      return;
    }
    setFigmaError('');
    supabase.from('ph_attachments').insert({
      work_item_id: itemId, file_name: figmaUrl,
      file_size: 0, mime_type: 'application/figma',
      storage_path: figmaUrl, uploaded_by: user!.id,
    }).then(({ error }) => {
      if (error) { toast.error(`Failed to save Figma link: ${error.message}`); return; }
      setFigmaUrl('');
      setShowFigmaInput(false);
      toast.success('Figma design link added');
      queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
    });
  }, [figmaUrl, itemId, user, queryClient]);

  // Link search query
  const { data: linkSearchData = [] } = useQuery({
    queryKey: ['ph-link-search', linkSearch],
    enabled: linkSearch.length >= 2 && showLinkModal,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .is('deleted_at', null)
        .neq('id', itemId)
        .or(`issue_key.ilike.%${linkSearch}%,summary.ilike.%${linkSearch}%`)
        .limit(10);
      return (data ?? []) as unknown as PhIssue[];
    },
  });

  /* ── DERIVED ───────────────────────────────── */
  const statusCategory = issue?.status_category ?? 'todo';
  const statusStyle = getStatusStyle(localStatus || 'Backlog', statusCategory);
  const doneSubtasks = subtasks.filter(s => getStatusCategory(s.status) === 'done').length;

  const fixVersionNames = useMemo(() => {
    if (!issue?.fix_versions) return [];
    const fv = issue.fix_versions;
    if (Array.isArray(fv)) return fv.map((v: any) => v?.name || v).filter(Boolean);
    return [];
  }, [issue?.fix_versions]);

  /* ── ACTIONS ───────────────────────────────── */
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?issue=${issue?.issue_key ?? ''}`;
    navigator.clipboard.writeText(url);
    toast(`Link copied to clipboard · ${issue?.issue_key ?? ''}`);
  }, [issue?.issue_key]);

  if (!isOpen) return null;

  /* ── CHILD TAB DATA ────────────────────────── */
  const childTabDefs: { key: ChildTab; label: string; count: number }[] = [
    { key: 'subtasks', label: 'Subtasks', count: subtasks.length },
    { key: 'defects', label: 'Defects', count: defects.length },
    { key: 'incidents', label: 'Production Incidents', count: incidents.length },
    { key: 'testcases', label: 'Test Cases', count: testCases.length },
    { key: 'executions', label: 'Test Executions', count: testCycles.length },
  ];

  /* ── RENDER CHILD TABLE ────────────────────── */
  function renderChildTable() {
    if (activeChildTab === 'subtasks') return renderIssueTable(subtasks, ['key', 'title', 'status', 'priority', 'assignee', 'reporter', 'fixVersion', 'created', 'updated']);
    if (activeChildTab === 'defects') return renderDefectTable();
    if (activeChildTab === 'incidents') return renderIncidentTable();
    if (activeChildTab === 'testcases') return renderTestCaseTable();
    if (activeChildTab === 'executions') return renderTestExecutionTable();
    return null;
  }

  function renderIssueTable(items: PhIssue[], cols: string[]) {
    if (!items.length) return renderEmptyState('subtasks');
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            {cols.includes('key') && <th style={TH}>Key</th>}
            {cols.includes('title') && <th style={{ ...TH, maxWidth: 280 }}>Title</th>}
            {cols.includes('status') && <th style={TH}>Status</th>}
            {cols.includes('priority') && <th style={TH}>Priority</th>}
            {cols.includes('assignee') && <th style={TH}>Assignee</th>}
            {cols.includes('reporter') && <th style={TH}>Reporter</th>}
            {cols.includes('fixVersion') && <th style={TH}>Fix Version</th>}
            {cols.includes('created') && <th style={TH}>Created</th>}
            {cols.includes('updated') && <th style={TH}>Updated</th>}
          </tr></thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ cursor: 'pointer', height: 36 }}
                onClick={() => onOpenItem?.(item.id)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                {cols.includes('key') && <td style={TC}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IssueIcon type={item.issue_type} size={14} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#0052CC' }}>{item.issue_key}</span></span></td>}
                {cols.includes('title') && <td style={{ ...TC, maxWidth: 280, fontWeight: 500 }}>{item.summary}</td>}
                {cols.includes('status') && <td style={TC}><JiraStatusPill status={item.status} category={item.status_category ?? getStatusCategory(item.status)} /></td>}
                {cols.includes('priority') && <td style={TC}>{renderPriority(item.priority)}</td>}
                {cols.includes('assignee') && <td style={TC}>{renderAvatar(item.assignee_display_name, item.assignee_account_id)}</td>}
                {cols.includes('reporter') && <td style={TC}>{renderAvatar(item.reporter_display_name, item.reporter_account_id)}</td>}
                {cols.includes('fixVersion') && <td style={TC}>{renderFixVersion(item.fix_versions)}</td>}
                {cols.includes('created') && <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(item.jira_created_at)}</td>}
                {cols.includes('updated') && <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(item.jira_updated_at)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderDefectTable() {
    if (!defects.length) return renderEmptyState('defects');
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={TH}>Key</th><th style={{ ...TH, maxWidth: 280 }}>Title</th><th style={TH}>Status</th>
            <th style={TH}>Severity</th><th style={TH}>Assignee</th><th style={TH}>Reporter</th>
            <th style={TH}>Created</th><th style={TH}>Updated</th>
          </tr></thead>
          <tbody>
            {defects.map(d => {
              const sev = getSeverity(d.priority);
              return (
                <tr key={d.id} style={{ cursor: 'pointer', height: 36 }} onClick={() => onOpenItem?.(d.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={TC}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IssueIcon type="Bug" size={14} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#0052CC' }}>{d.issue_key}</span></span></td>
                  <td style={{ ...TC, maxWidth: 280, fontWeight: 500 }}>{d.summary}</td>
                  <td style={TC}><JiraStatusPill status={d.status} category={d.status_category ?? getStatusCategory(d.status)} /></td>
                  <td style={TC}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: sev.bg, color: sev.color }}>{sev.label}</span></td>
                  <td style={TC}>{renderAvatar(d.assignee_display_name, d.assignee_account_id)}</td>
                  <td style={TC}>{renderAvatar(d.reporter_display_name, d.reporter_account_id)}</td>
                  <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(d.jira_created_at)}</td>
                  <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(d.jira_updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderIncidentTable() {
    if (!incidents.length) return renderEmptyState('incidents');
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={TH}>Key</th><th style={{ ...TH, maxWidth: 240 }}>Title</th><th style={TH}>Status</th>
            <th style={TH}>Severity</th><th style={TH}>Environment</th><th style={TH}>Assignee</th>
            <th style={TH}>Reporter</th><th style={TH}>Created</th><th style={TH}>Updated</th>
          </tr></thead>
          <tbody>
            {incidents.map(inc => {
              const sev = getSeverity(inc.priority);
              return (
                <tr key={inc.id} style={{ cursor: 'pointer', height: 36 }} onClick={() => onOpenItem?.(inc.id)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <td style={TC}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IssueIcon type="Incident" size={14} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#0052CC' }}>{inc.issue_key}</span></span></td>
                  <td style={{ ...TC, maxWidth: 240, fontWeight: 500 }}>{inc.summary}</td>
                  <td style={TC}><JiraStatusPill status={inc.status} category={inc.status_category ?? getStatusCategory(inc.status)} /></td>
                  <td style={TC}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: sev.bg, color: sev.color }}>{sev.label}</span></td>
                  <td style={TC}><span style={{ fontSize: 11, color: '#475569' }}>Production</span></td>
                  <td style={TC}>{renderAvatar(inc.assignee_display_name, inc.assignee_account_id)}</td>
                  <td style={TC}>{renderAvatar(inc.reporter_display_name, inc.reporter_account_id)}</td>
                  <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(inc.jira_created_at)}</td>
                  <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(inc.jira_updated_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTestCaseTable() {
    if (!testCases.length) return renderEmptyState('testcases');
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={TH}>Case Key</th><th style={{ ...TH, maxWidth: 280 }}>Title</th>
            <th style={TH}>Type</th><th style={TH}>Status</th><th style={TH}>Created</th>
          </tr></thead>
          <tbody>
            {testCases.map(tc => (
              <tr key={tc.id} style={{ height: 36 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={TC}><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#2563EB' }}>{tc.case_key}</span></td>
                <td style={{ ...TC, maxWidth: 280, fontWeight: 500 }}>{tc.title}</td>
                <td style={TC}>{tc.type === 'Automated'
                  ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F0FFF4', color: '#166534' }}>Automated</span>
                  : <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#EEF2FF', color: '#3730A3' }}>Manual</span>
                }</td>
                <td style={TC}><StatusLozenge status={tc.status} /></td>
                <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(tc.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderTestExecutionTable() {
    if (!testCycles.length) return renderEmptyState('executions');
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={TH}>Cycle</th><th style={TH}>Cases</th><th style={TH}>Passed</th>
            <th style={TH}>Failed</th><th style={TH}>Blocked</th><th style={TH}>Not Run</th>
            <th style={TH}>Progress</th><th style={TH}>Last Run</th>
          </tr></thead>
          <tbody>
            {testCycles.map(cyc => {
              const total = cyc.total_cases || 1;
              const latestExec = cyc.executions?.[0];
              return (
                <tr key={cyc.id} style={{ height: 36 }}>
                  <td style={{ ...TC, fontWeight: 650 }}>{cyc.name}</td>
                  <td style={TC}>{cyc.total_cases}</td>
                  <td style={{ ...TC, color: '#16A34A', fontWeight: 600 }}>{cyc.passed_count}</td>
                  <td style={{ ...TC, color: '#DC2626', fontWeight: 600 }}>{cyc.failed_count}</td>
                  <td style={{ ...TC, color: '#9E4C00', fontWeight: 600 }}>{cyc.blocked_count ?? 0}</td>
                  <td style={{ ...TC, color: '#98A2B3' }}>{cyc.not_run_count ?? 0}</td>
                  <td style={TC}>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: '#F1F5F9', display: 'flex', overflow: 'hidden' }}>
                      <div style={{ width: `${(cyc.passed_count / total) * 100}%`, background: '#16A34A' }} />
                      <div style={{ width: `${(cyc.failed_count / total) * 100}%`, background: '#DC2626' }} />
                      <div style={{ width: `${((cyc.blocked_count ?? 0) / total) * 100}%`, background: '#9E4C00' }} />
                    </div>
                  </td>
                  <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(latestExec?.executed_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderEmptyState(tab: string) {
    const labels: Record<string, string> = { subtasks: 'subtasks', defects: 'defects', incidents: 'production incidents', testcases: 'test cases', executions: 'test executions' };
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#98A2B3' }}>
        <div style={{ fontSize: 13, marginBottom: 4 }}>No {labels[tab] ?? tab} found</div>
        <button onClick={() => setShowAddMenu(true)} style={{ fontSize: 12, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Click + Add to create one</button>
      </div>
    );
  }

  function renderPriority(priority: string | null) {
    const p = PRIORITY_STYLES[priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;
    return <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.symbol} {priority ?? 'Medium'}</span>;
  }

  function renderAvatar(name: string | null, id: string | null) {
    if (!name) return <span style={{ color: '#98A2B3', fontSize: 11 }}>—</span>;
    const bg = getAvatarColor(id ?? name);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', background: bg, color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{getInitials(name)}</span>
        <span style={{ fontSize: 12, color: '#101828', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{name}</span>
      </span>
    );
  }

  function renderFixVersion(fv: any) {
    if (!fv) return <span style={{ color: '#98A2B3' }}>—</span>;
    const arr = Array.isArray(fv) ? fv : [];
    const first = arr[0];
    if (!first) return <span style={{ color: '#98A2B3' }}>—</span>;
    const name = typeof first === 'string' ? first : first?.name ?? '—';
    return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', color: '#475569' }}>{name}</span>;
  }

  /* ═════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════ */

  return (
    <>
      {/* OVERLAY */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', animation: 'sdm-overlay-in 200ms ease-out' }}
        onClick={onClose}
      >
        {/* MODAL PANEL */}
        <div
          style={{ width: 1100, maxWidth: '95vw', maxHeight: 'calc(100vh - 96px)', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E7EC', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'sdm-card-in 250ms ease-out' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── A. TOP BAR ─────────────────────── */}
          <div style={{ height: 44, minHeight: 44, background: '#F8FAFC', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <IssueIcon type="Epic" size={14} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#475467' }}>{issue?.parent_key ?? '—'}</span>
              <span style={{ color: '#C9CDD4', fontSize: 11 }}>/</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#475467', background: '#EEF2F7', padding: '2px 6px', borderRadius: 3 }}>{issue?.issue_key ?? '—'}</span>
            </div>
            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={handleShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', fontSize: 11, fontWeight: 500, color: '#475467', cursor: 'pointer' }}>
                <Share2 size={13} /> Share
              </button>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#475467' }}>···</button>
                {showDotsMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 32, background: '#FFF', border: '1px solid #E4E7EC', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', zIndex: 50, minWidth: 180 }}>
                    <button onClick={() => { setShowDotsMenu(false); toast('Ticket cloned'); }} style={menuItem}>Clone ticket</button>
                    <button onClick={() => { setShowDotsMenu(false); toast('Move to project — coming soon'); }} style={menuItem}>Move to project</button>
                    <div style={{ height: 1, background: '#E4E7EC', margin: '4px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowConfirmDelete(true); }} style={{ ...menuItem, color: '#DC2626' }}>Delete ticket</button>
                  </div>
                )}
              </div>
              <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#98A2B3', fontSize: 16 }}><X size={16} /></button>
            </div>
          </div>

          {/* ── B. BODY ────────────────────────── */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* LEFT PANEL */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 40px', minWidth: 0 }}>
              {issueLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} />
                  <div style={{ height: 20 }} /><Skel w="100%" h={200} />
                </div>
              ) : (
                <>
                  {/* 1. ISSUE KEY ROW */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <IssueIcon type={issue?.issue_type ?? 'Story'} size={14} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#98A2B3', letterSpacing: '0.02em' }}>{issue?.issue_key} · {issue?.issue_type ?? 'Story'}</span>
                  </div>

                  {/* 2. TITLE */}
                  <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#101828', lineHeight: 1.3, letterSpacing: '-0.01em', margin: '0 0 4px' }}>{issue?.summary ?? '—'}</h1>

                  {/* 3. ARABIC SUBTITLE */}
                  {issue?.description_text && (
                    <div style={{ direction: 'rtl', textAlign: 'right', fontSize: 15, color: '#98A2B3', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>{issue.description_text.substring(0, 80)}</div>
                  )}

                  {/* 4. TITLE TOOLBAR */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                    {/* +Add button */}
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                        <Plus size={13} /> Add
                      </button>
                      {showAddMenu && (
                        <div style={{ position: 'absolute', left: 0, top: 34, background: '#FFF', border: '1px solid #E4E7EC', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', zIndex: 50, minWidth: 200 }}>
                          <button onClick={() => { setShowAddMenu(false); toast('Create Subtask — coming in Stage D'); }} style={menuItem}>Create Subtask</button>
                          <button onClick={() => { setShowAddMenu(false); setShowLinkModal(true); }} style={menuItem}>Link Work Item</button>
                          <button onClick={() => { setShowAddMenu(false); toast('Add Attachment — coming in Stage D'); }} style={menuItem}>Add Attachment</button>
                          <button onClick={() => { setShowAddMenu(false); setShowFigmaInput(true); }} style={menuItem}>Add Design (Figma)</button>
                        </div>
                      )}
                    </div>
                    {/* Improve Story */}
                    <button onClick={() => setShowAiImprove(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 5.2L15 8l-5.2 1.8L8 15l-1.8-5.2L1 8l5.2-1.8L8 1z" fill="#2563EB"/></svg>
                      Improve Story
                    </button>
                    {/* Share */}
                    <button onClick={handleShare} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#98A2B3' }}><Share2 size={13} /></button>
                    {/* ··· */}
                    <button onClick={() => setShowDotsMenu(!showDotsMenu)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#98A2B3' }}>···</button>
                  </div>

                  {/* 5. FIGMA URL INPUT ROW */}
                  {showFigmaInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E4E7EC' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#475467', whiteSpace: 'nowrap' }}>Figma URL</span>
                      <input value={figmaUrl} onChange={e => { setFigmaUrl(e.target.value); setFigmaError(''); }} placeholder="https://figma.com/..." style={{ flex: 1, height: 32, borderRadius: 4, border: figmaError ? '1px solid #DC2626' : '1px solid #E4E7EC', padding: '0 8px', fontSize: 12, outline: 'none' }} />
                      <button onClick={saveFigmaLink} style={{ padding: '5px 12px', borderRadius: 6, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                      <button onClick={() => { setShowFigmaInput(false); setFigmaUrl(''); setFigmaError(''); }} style={{ padding: '5px 12px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 12, cursor: 'pointer', color: '#475467' }}>Cancel</button>
                      {figmaError && <span style={{ fontSize: 11, color: '#DC2626' }}>{figmaError}</span>}
                    </div>
                  )}

                  {/* 6. AI IMPROVE PANEL */}
                  {showAiImprove && (
                    <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 5.2L15 8l-5.2 1.8L8 15l-1.8-5.2L1 8l5.2-1.8L8 1z" fill="#2563EB"/></svg>
                        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#101828' }}>Improved Story</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: '#DBEAFE', color: '#2563EB', textTransform: 'uppercase' }}>AI SUGGESTION</span>
                      </div>
                      <div style={{ background: '#FFF', border: '1px solid #BFDBFE', borderRadius: 8, padding: 12, fontSize: 13, color: '#344054', lineHeight: 1.6, marginBottom: 12 }}>
                        As a <strong>portfolio manager</strong>, I need the ability to view all active work items grouped by delivery status so that I can quickly identify bottlenecks and make informed resource allocation decisions during weekly governance reviews.
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setShowAiImprove(false); toast('Story updated with AI suggestion'); }} style={{ padding: '6px 14px', borderRadius: 6, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Accept</button>
                        <button onClick={() => setShowAiImprove(false)} style={{ padding: '6px 14px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#475467' }}>Dismiss</button>
                      </div>
                    </div>
                  )}

                  {/* 7. KEY DETAILS COLLAPSIBLE */}
                  <div style={{ marginBottom: 20 }}>
                    <button onClick={() => setKeyDetailsOpen(!keyDetailsOpen)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
                      {keyDetailsOpen ? <ChevronDown size={14} color="#475467" /> : <ChevronRight size={14} color="#475467" />}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#475467' }}>Key Details</span>
                    </button>
                    {keyDetailsOpen && (
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 0 }}>
                        {/* Parent */}
                        <div style={detailLabel}>Parent</div>
                        <div style={detailValue}>
                          {issue?.parent_key ? (
                            <button onClick={() => { /* resolve parentId and onOpenItem */ }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F1F5F9', border: '1px solid #E4E7EC', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', color: '#0052CC' }}>
                              <IssueIcon type="Epic" size={12} /> {issue.parent_key} {issue.parent_summary ? `— ${issue.parent_summary}` : ''}
                            </button>
                          ) : <span style={{ color: '#98A2B3' }}>—</span>}
                        </div>
                        {/* Priority */}
                        <div style={detailLabel}>Priority</div>
                        <div style={detailValue}>{renderPriority(localPriority)}</div>
                        {/* Description */}
                        <div style={{ ...detailLabel, alignSelf: 'start', paddingTop: 10 }}>Description</div>
                        <div style={{ ...detailValue, paddingTop: 8, paddingBottom: 8 }}>
                          <div style={{ fontSize: 13, color: '#344054', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{issue?.description_text || <span style={{ color: '#98A2B3', fontStyle: 'normal' }}>No description provided.</span>}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 8. DIVIDER */}
                  <div style={{ height: 1, background: '#F7F8FA', margin: '20px 0' }} />

                  {/* 9. CHILD ITEMS SECTION */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#101828' }}>Child Items</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: '#F1F5F9', color: '#475467' }}>{subtasks.length + defects.length + incidents.length + testCases.length}</span>
                    </div>

                    {/* Progress bar (subtasks) */}
                    {activeChildTab === 'subtasks' && subtasks.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${subtasks.length ? (doneSubtasks / subtasks.length) * 100 : 0}%`, background: '#16A34A', borderRadius: 3, transition: 'width 300ms' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#475467', whiteSpace: 'nowrap' }}>{doneSubtasks} of {subtasks.length} done</span>
                      </div>
                    )}

                    {/* TABS */}
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E4E7EC', marginBottom: 0 }}>
                      {childTabDefs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveChildTab(tab.key)} style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: activeChildTab === tab.key ? 650 : 500,
                          color: activeChildTab === tab.key ? '#2563EB' : '#98A2B3',
                          background: 'none', border: 'none', borderBottom: activeChildTab === tab.key ? '2.5px solid #2563EB' : '2.5px solid transparent',
                          cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
                        }}>
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* TABLE */}
                    {renderChildTable()}
                  </div>

                  {/* 10. DIVIDER */}
                  <div style={{ height: 1, background: '#F7F8FA', margin: '20px 0' }} />

                  {/* 11. LINKED WORK ITEMS */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#101828' }}>Linked Work Items</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: '#F1F5F9', color: '#475467' }}>{issueLinks.length}</span>
                      <button onClick={() => setShowLinkModal(true)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #E4E7EC', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#98A2B3', fontSize: 14 }}><Plus size={12} /></button>
                    </div>
                    {issueLinks.length === 0 ? (
                      <div style={{ padding: '24px 20px', textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>No linked items</div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead><tr>
                            <th style={TH}>Key</th><th style={{ ...TH, maxWidth: 260 }}>Title</th>
                            <th style={TH}>Type</th><th style={TH}>Link Type</th><th style={TH}>Created</th>
                          </tr></thead>
                          <tbody>
                            {issueLinks.map(link => (
                              <tr key={link.id} style={{ height: 36, cursor: 'pointer' }}
                                onClick={() => link.target_issue && onOpenItem?.(link.target_issue.id)}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                                onMouseLeave={e => (e.currentTarget.style.background = '')}
                              >
                                <td style={TC}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IssueIcon type={link.target_issue?.issue_type ?? 'Story'} size={14} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#0052CC' }}>{link.target_issue?.issue_key ?? '—'}</span></span></td>
                                <td style={{ ...TC, maxWidth: 260, fontWeight: 500 }}>{link.target_issue?.summary ?? '—'}</td>
                                <td style={{ ...TC, fontSize: 11, color: '#98A2B3' }}>{link.target_issue?.issue_type ?? '—'}</td>
                                <td style={TC}><span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', color: '#475569' }}>{LINK_TYPE_LABELS[link.link_type] ?? link.link_type}</span></td>
                                <td style={{ ...TC, fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(link.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 12. DIVIDER */}
                  <div style={{ height: 1, background: '#F7F8FA', margin: '20px 0' }} />

                  {/* 13. ACTIVITY SECTION */}
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 12 }}>Activity</div>
                    {/* TABS */}
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E4E7EC', marginBottom: 16 }}>
                      {(['comments', 'history'] as ActivityTab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: activeActivityTab === tab ? 650 : 500,
                          color: activeActivityTab === tab ? '#2563EB' : '#98A2B3',
                          background: 'none', border: 'none', borderBottom: activeActivityTab === tab ? '2.5px solid #2563EB' : '2.5px solid transparent',
                          cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize',
                        }}>
                          {tab === 'comments' ? <><MessageSquare size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Comments</> : <><Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />History</>}
                        </button>
                      ))}
                    </div>

                    {/* COMMENTS TAB */}
                    {activeActivityTab === 'comments' && (
                      <div>
                        {comments.length === 0 && <div style={{ padding: '20px 0', color: '#98A2B3', fontSize: 13, textAlign: 'center' }}>No comments yet</div>}
                        {comments.map(c => {
                          const bg = getAvatarColor(c.author_id);
                          return (
                            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{getInitials(c.author?.full_name)}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 650, color: '#101828' }}>{c.author?.full_name ?? 'Unknown'}</span>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3' }}>{fmtDate(c.created_at)}</span>
                                </div>
                                <div style={{ background: '#F7F8FA', border: '1px solid #E4E7EC', borderRadius: 8, padding: 12, fontSize: 13, color: '#344054', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                                  <button style={{ fontSize: 11, color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                                  <button style={{ fontSize: 11, color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                                  <button style={{ fontSize: 11, color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer' }}>👍 0</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* New comment input */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{getInitials(currentProfile?.full_name)}</div>
                          <div style={{ flex: 1 }}>
                            <textarea
                              value={newComment}
                              onChange={e => setNewComment(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && newComment.trim()) {
                                  toast('Comment submitted — mutation wired in Stage D');
                                  setNewComment('');
                                }
                              }}
                              placeholder="Add a comment…"
                              style={{ width: '100%', minHeight: 40, borderRadius: 8, border: '1px solid #E4E7EC', padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                            />
                            <div style={{ fontSize: 10, color: '#C9CDD4', marginTop: 4 }}>
                              <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#F1F5F9', border: '1px solid #E4E7EC', fontSize: 9 }}>M</kbd> to comment · <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#F1F5F9', border: '1px solid #E4E7EC', fontSize: 9 }}>Ctrl+Enter</kbd> to submit
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeActivityTab === 'history' && (
                      <div>
                        {activityLog.length === 0 && <div style={{ padding: '20px 0', color: '#98A2B3', fontSize: 13, textAlign: 'center' }}>No activity recorded</div>}
                        {activityLog.map(entry => (
                          <div key={entry.id} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9CDD4', flexShrink: 0, marginTop: 6 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: '#344054', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 650 }}>{entry.actor?.full_name ?? 'System'}</span>
                                {' changed '}
                                <span style={{ fontWeight: 500 }}>{entry.field_name ?? entry.action}</span>
                                {entry.old_value && <> from <span style={{ textDecoration: 'line-through', color: '#98A2B3' }}>{entry.old_value}</span></>}
                                {entry.new_value && <> to <span style={{ fontWeight: 600, color: '#2563EB' }}>{entry.new_value}</span></>}
                              </div>
                              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: '#98A2B3', marginTop: 2 }}>{fmtDate(entry.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* RIGHT PANEL */}
            <div style={{ width: 280, minWidth: 280, background: '#FFFFFF', borderLeft: '1px solid #E4E7EC', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* 1. STATUS ZONE */}
              <div style={{ padding: 16, borderBottom: '1px solid #E4E7EC' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#98A2B3', marginBottom: 8 }}>STATUS</div>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 4,
                    background: statusStyle.bg, color: statusStyle.text, border: 'none', cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', width: '100%', justifyContent: 'space-between',
                  }}>
                    {localStatus || 'Backlog'}
                    <ChevronDown size={12} />
                  </button>
                  {showStatusDropdown && (
                    <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#FFF', border: '1px solid #E4E7EC', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '4px 0', zIndex: 50, width: '100%', maxHeight: 300, overflowY: 'auto' }}>
                      {STATUS_OPTION_GROUPS.map(group => (
                        <div key={group.category}>
                          <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: '#98A2B3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.groupLabel}</div>
                          {group.statuses.map(st => {
                            const isActive = localStatus === st;
                            const stStyle = getStatusStyle(st, group.category);
                            return (
                              <button key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); }} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '6px 12px',
                                background: isActive ? 'rgba(37,99,235,0.08)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12,
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stStyle.bg, border: stStyle.bg === '#F4F5F7' ? '1px solid #C9CDD4' : 'none' }} />
                                  <span style={{ color: '#101828', fontWeight: isActive ? 650 : 400 }}>{st}</span>
                                </span>
                                {isActive && <span style={{ color: '#2563EB', fontWeight: 700 }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid #E4E7EC', margin: '4px 0' }} />
                      <button onClick={() => { setShowStatusDropdown(false); setShowWorkflow(true); }} style={{ ...menuItem, color: '#2563EB', fontSize: 12 }}>View Workflow</button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. DETAILS SECTION */}
              <div style={{ padding: 14, borderBottom: '1px solid #E4E7EC' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#98A2B3', marginBottom: 12 }}>DETAILS</div>

                {/* Fix Version */}
                <DetailRow label="Fix Version">
                  {fixVersionNames.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {fixVersionNames.map((v: string, i: number) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', color: '#475569' }}>{v}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: '#98A2B3', fontSize: 12 }}>—</span>
                  )}
                </DetailRow>

                {/* Change No */}
                <DetailRow label="Change No.">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#0052CC' }}>—</span>
                </DetailRow>

                {/* Assignee */}
                <DetailRow label="Assignee">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {issue?.assignee_display_name ? renderAvatar(issue.assignee_display_name, issue.assignee_account_id) : <span style={{ color: '#98A2B3', fontSize: 12 }}>Unassigned</span>}
                  </div>
                  <button onClick={() => { /* assign to me - Stage D */ toast('Assigned to me'); }} style={{ fontSize: 11, color: '#0052CC', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Assign to me</button>
                </DetailRow>

                {/* Reporter — READ ONLY */}
                <DetailRow label="Reporter">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {issue?.reporter_display_name ? renderAvatar(issue.reporter_display_name, issue.reporter_account_id) : <span style={{ color: '#98A2B3', fontSize: 12 }}>—</span>}
                  </div>
                  <span style={{ fontSize: 10, color: '#98A2B3' }}>(read-only)</span>
                </DetailRow>

                {/* Labels */}
                <DetailRow label="Labels">
                  {issue?.labels?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {issue.labels.map((l, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', border: '1px solid #E4E7EC', color: '#475569' }}>{l}</span>
                      ))}
                    </div>
                  ) : <span style={{ color: '#98A2B3', fontSize: 12 }}>—</span>}
                </DetailRow>
              </div>

              {/* 3. TIMESTAMPS */}
              <div style={{ padding: 12, borderTop: '1px solid #E4E7EC', marginTop: 'auto' }}>
                <div style={{ fontSize: 10, color: '#98A2B3', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Created</span> <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}>{fmtDate(issue?.jira_created_at)}</span>
                </div>
                <div style={{ fontSize: 10, color: '#98A2B3' }}>
                  <span style={{ fontWeight: 600 }}>Updated</span> <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}>{fmtDate(issue?.jira_updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. MODALS ────────────────────────── */}

      {/* CONFIRM DELETE */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 12, padding: 28, width: 400, maxWidth: '95vw', animation: 'sdm-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#475467', lineHeight: 1.6, marginBottom: 20 }}>This ticket will be soft-deleted (deleted_at timestamp set). It can be restored from the admin panel within 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#475467' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); toast(`${issue?.issue_key} deleted`); onClose(); }} style={{ padding: '7px 16px', borderRadius: 6, background: '#DC2626', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* WORKFLOW MODAL */}
      {showWorkflow && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ background: '#FFF', borderRadius: 14, width: 820, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E4E7EC' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#101828' }}>Workflow — {issue?.issue_type ?? 'Story'} Issue Type</span>
              <button onClick={() => setShowWorkflow(false)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#98A2B3' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', gap: 16, borderBottom: '1px solid #E4E7EC', fontSize: 12 }}>
              <span><span style={{ color: '#98A2B3' }}>Issue Type</span> <span style={{ fontWeight: 600 }}>{issue?.issue_type}</span></span>
              <span><span style={{ color: '#98A2B3' }}>Current Status</span> <JiraStatusPill status={localStatus} category={statusCategory} /></span>
              <span><span style={{ color: '#98A2B3' }}>Total Statuses</span> <span style={{ fontWeight: 600 }}>{STATUS_CATEGORIES.todo.length + STATUS_CATEGORIES.in_progress.length + STATUS_CATEGORIES.done.length}</span></span>
            </div>
            <div style={{ padding: '8px 20px', fontSize: 11, color: '#98A2B3', borderBottom: '1px solid #E4E7EC' }}>Transitions are open — any status can move to any. Colours customisable in Admin Panel → Workflows.</div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <svg width="760" height="200" viewBox="0 0 760 200">
                {/* TODO row */}
                {STATUS_CATEGORIES.todo.map((st, i) => {
                  const x = 20 + i * 120;
                  const isActive = localStatus === st;
                  return <g key={st}><rect x={x} y={10} width={110} height={32} rx={6} fill="#F4F5F7" stroke={isActive ? '#2563EB' : '#DFE1E6'} strokeWidth={isActive ? 2.5 : 1} /><text x={x + 55} y={30} textAnchor="middle" fontSize={9} fontWeight={600} fill="#42526E">{st}</text></g>;
                })}
                {/* IN PROGRESS row */}
                {STATUS_CATEGORIES.in_progress.map((st, i) => {
                  const x = 20 + i * 75;
                  const isActive = localStatus === st;
                  return <g key={st}><rect x={x} y={75} width={70} height={32} rx={6} fill="#DEEBFF" stroke={isActive ? '#2563EB' : '#B3D4FF'} strokeWidth={isActive ? 2.5 : 1} /><text x={x + 35} y={95} textAnchor="middle" fontSize={7} fontWeight={600} fill="#0747A6">{st}</text></g>;
                })}
                {/* DONE row */}
                {STATUS_CATEGORIES.done.map((st, i) => {
                  const x = 20 + i * 130;
                  const isActive = localStatus === st;
                  return <g key={st}><rect x={x} y={140} width={120} height={32} rx={6} fill="#E3FCEF" stroke={isActive ? '#2563EB' : '#ABF5D1'} strokeWidth={isActive ? 2.5 : 1} /><text x={x + 60} y={160} textAnchor="middle" fontSize={9} fontWeight={600} fill="#006644">{st}</text></g>;
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* LINK WORK ITEM MODAL */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 12, width: 520, maxWidth: '95vw', overflow: 'hidden', animation: 'sdm-confirm-in 200ms ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E4E7EC' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#101828' }}>Link Work Item</span>
              <button onClick={() => setShowLinkModal(false)} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#98A2B3' }}><X size={16} /></button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Link type */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475467', marginBottom: 4 }}>Link Type</div>
                <div style={{ position: 'relative' }}>
                  <button style={{ width: '100%', height: 36, borderRadius: 4, border: '1px solid #E4E7EC', background: '#FFF', padding: '0 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#101828' }}>
                    {LINK_TYPE_LABELS[linkType] ?? linkType} <ChevronDown size={12} color="#98A2B3" />
                  </button>
                </div>
              </div>
              {/* Search */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475467', marginBottom: 4 }}>Search Issues</div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#98A2B3' }} />
                  <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)} placeholder="Search by key or title…" style={{ width: '100%', height: 36, borderRadius: 4, border: '1px solid #E4E7EC', paddingLeft: 32, paddingRight: 12, fontSize: 12, outline: 'none' }} />
                </div>
              </div>
              <div style={{ height: 120, overflow: 'auto', border: '1px solid #E4E7EC', borderRadius: 4, padding: 4 }}>
                <div style={{ padding: '16px 0', textAlign: 'center', color: '#98A2B3', fontSize: 12 }}>Type to search for issues…</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #E4E7EC' }}>
              <button onClick={() => setShowLinkModal(false)} style={{ padding: '7px 16px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#475467' }}>Cancel</button>
              <button style={{ padding: '7px 16px', borderRadius: 6, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: 0.5 }} disabled>Link</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── DETAIL ROW HELPER ─────────────────────── */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #F7F8FA' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#98A2B3' }}>{label}</span>
      {children}
    </div>
  );
}

/* Menu item style */
const menuItem: React.CSSProperties = {
  display: 'block', width: '100%', padding: '7px 14px', background: 'none',
  border: 'none', cursor: 'pointer', fontSize: 13, color: '#344054',
  textAlign: 'left', fontFamily: 'Inter, sans-serif',
};
const detailLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#98A2B3', padding: '8px 0',
  borderBottom: '1px solid #F7F8FA',
};
const detailValue: React.CSSProperties = {
  fontSize: 12, color: '#101828', padding: '8px 0',
  borderBottom: '1px solid #F7F8FA', display: 'flex', flexDirection: 'column', gap: 2,
};
