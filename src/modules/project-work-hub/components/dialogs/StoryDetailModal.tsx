import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  X, Eye, EyeOff, Link2, MoreHorizontal, Copy, Archive, Trash2,
  ChevronDown, ChevronRight, Plus, Flag, Paperclip, FileText,
  ExternalLink, Maximize2, Minimize2, Share2, Pencil, ListFilter,
  ChevronsUp, ChevronUp, Minus, ChevronsDown, Search,
  AlertTriangle, MessageSquare, Clock, Upload,
} from 'lucide-react';
import WatchButton from '@/components/shared/WatchButton';

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

interface FixVersion {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

interface PhComment {
  id: string;
  work_item_id: string;
  body: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

interface PhActivityLog {
  id: string;
  work_item_id: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  user_id: string;
  metadata: any | null;
  created_at: string;
  actor?: Profile;
}

interface PhIssueLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: string;
  created_by: string;
  created_at: string;
  target_issue?: PhIssue;
}

interface PhAttachment {
  id: string;
  work_item_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
}

interface TmTestCase {
  id: string;
  case_key: string;
  title: string;
  type?: string;
  status: string;
  assigned_to?: string | null;
  created_at: string;
  assignee?: Profile;
}

interface TmTestCaseLink {
  test_case_id: string;
  linked_item_id: string;
  linked_item_type: string;
  linked_at: string;
  test_case?: TmTestCase;
}

interface ThTestExecution {
  id?: string;
  test_case_id: string;
  cycle_scope_id?: string | null;
  test_cycle_id: string;
  execution_number?: number;
  result: string;
  executed_by: string;
  executed_at: string;
  cycle_name?: string;
}

interface TmTestCycle {
  id: string;
  name: string;
  total_cases: number;
  passed_count: number;
  failed_count: number;
  blocked_count?: number;
  skipped_count?: number;
  not_run_count?: number;
  created_at: string;
  executions?: ThTestExecution[];
}

interface RhRelease {
  id: string;
  name: string;
  key: string;
  status: string;
  target_date: string | null;
  project_id: string;
}

interface RhChange {
  id: string;
  chg_number: string;
  title: string;
  status: string;
  release_id: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface ProjectMember {
  user_id: string;
  role: string;
  profile?: Profile;
}

/* ═══════════════════════════════════════════════
   STATUS & PRIORITY CONSTANTS
   ═══════════════════════════════════════════════ */

const STATUS_CATEGORIES: Record<string, string[]> = {
  todo: ['Backlog', 'To Do', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation'],
  in_progress: ['In Development', 'In Progress', 'In Review', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'On Hold', 'Analysis', 'Blocked', 'Awaiting Info'],
  done: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'],
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  todo:        { bg: '#F4F5F7', text: '#42526E' },
  in_progress: { bg: '#0052CC', text: '#FFFFFF' },
  done:        { bg: '#36B37E', text: '#FFFFFF' },
  blocked:     { bg: '#FF5630', text: '#FFFFFF' },
  on_hold:     { bg: '#FF991F', text: '#FFFFFF' },
  in_uat:      { bg: '#00B8D9', text: '#FFFFFF' },
  in_beta:     { bg: '#36B37E', text: '#FFFFFF' },
  in_prod:     { bg: '#006644', text: '#FFFFFF' },
  in_review:   { bg: '#FF991F', text: '#FFFFFF' },
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
  Highest: { color: '#AE2A19', symbol: '▲▲' },
  High:    { color: '#DE350B', symbol: '▲' },
  Medium:  { color: '#D97706', symbol: '—' },
  Low:     { color: '#36B37E', symbol: '▼' },
  Lowest:  { color: '#6B778C', symbol: '▼▼' },
};

const LINK_TYPES = [
  'relates_to', 'blocks', 'is_blocked_by', 'duplicates',
  'is_duplicated_by', 'implements', 'is_implemented_by', 'clones', 'is_cloned_by',
] as const;

const LINK_TYPE_LABELS: Record<string, string> = {
  relates_to: 'Relates to', blocks: 'Blocks', is_blocked_by: 'Is blocked by',
  duplicates: 'Duplicates', is_duplicated_by: 'Is duplicated by',
  implements: 'Implements', is_implemented_by: 'Is implemented by',
  clones: 'Clones', is_cloned_by: 'Is cloned by',
};

const STATUS_OPTION_GROUPS = [
  { groupLabel: 'TO DO', category: 'todo', statuses: ['Backlog', 'In Requirements', 'In Design', 'Ready for Development', 'Technical Validation', 'To Do'] },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: ['In Development', 'On Hold', 'In QA', 'In Entity Integration', 'In UAT', 'In BETA', 'End to End Testing', 'In Progress', 'In Review'] },
  { groupLabel: 'DONE', category: 'done', statuses: ['Production Ready', 'Beta Ready', 'In Production', 'Done', 'Closed'] },
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
  const str = name || '?';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const palette = ['#2563EB', '#0D9488', '#DC2626', '#7C3AED', '#0284C7', '#DB2777', '#D97706', '#059669'];
  const bg = palette[Math.abs(hash) % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

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
   TAB TYPES
   ═══════════════════════════════════════════════ */

type ChildTab = 'subtasks' | 'defects' | 'incidents' | 'testcases' | 'executions';
type ActivityTab = 'comments' | 'history';

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */

export default function StoryDetailModal({
  isOpen, onClose, itemId, projectId, projectKey, onOpenItem,
}: StoryDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  /* ── CURRENT USER PROFILE ─────────────────────── */
  const { data: currentProfile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .eq('id', user!.id)
        .single();
      return data as Profile | null;
    },
  });

  /* ── ISSUE DETAIL ─────────────────────────────── */
  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ['ph-issue-detail', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .single();
      return data as PhIssue | null;
    },
  });

  /* ── SUBTASKS (parent_key text FK) ────────────── */
  const { data: subtasks = [] } = useQuery({
    queryKey: ['ph-subtasks', issue?.issue_key],
    enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('parent_key', issue!.issue_key)
        .eq('issue_type', 'Sub-task')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      return (data ?? []) as PhIssue[];
    },
  });

  /* ── DEFECTS ──────────────────────────────────── */
  const { data: defects = [] } = useQuery({
    queryKey: ['ph-defects', issue?.issue_key],
    enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('parent_key', issue!.issue_key)
        .in('issue_type', ['QA Bug', 'Defect'])
        .is('deleted_at', null)
        .order('jira_created_at', { ascending: false });
      return (data ?? []) as PhIssue[];
    },
  });

  /* ── PRODUCTION INCIDENTS ─────────────────────── */
  const { data: incidents = [] } = useQuery({
    queryKey: ['ph-incidents', issue?.issue_key],
    enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('parent_key', issue!.issue_key)
        .eq('issue_type', 'Production Incident')
        .is('deleted_at', null)
        .order('jira_created_at', { ascending: false });
      return (data ?? []) as PhIssue[];
    },
  });

  /* ── LINKED ITEMS (ph_issue_links) ────────────── */
  const { data: issueLinks = [] } = useQuery({
    queryKey: ['ph-issue-links', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('ph_issue_links')
        .select('id, source_id, target_id, link_type, created_by, created_at')
        .or(`source_id.eq.${itemId},target_id.eq.${itemId}`)
        .order('created_at', { ascending: false });
      if (!links?.length) return [];
      const targetIds = links.map(l => l.target_id);
      const { data: targets } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .in('id', targetIds)
        .is('deleted_at', null);
      const targetMap = new Map((targets ?? []).map(t => [t.id, t]));
      return links.map(l => ({ ...l, target_issue: targetMap.get(l.target_id) })) as PhIssueLink[];
    },
  });

  /* ── COMMENTS ─────────────────────────────────── */
  const { data: comments = [] } = useQuery({
    queryKey: ['ph-comments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_comments')
        .select('id, work_item_id, body, author_id, created_at, updated_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: true });
      return (data ?? []) as unknown as PhComment[];
    },
  });

  /* ── ACTIVITY LOG ─────────────────────────────── */
  const { data: activityLog = [] } = useQuery({
    queryKey: ['ph-activity-log', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      return (data ?? []) as unknown as PhActivityLog[];
    },
  });

  /* ── TEST CASES (via tm_test_case_links) ──────── */
  const { data: testCases = [] } = useQuery({
    queryKey: ['tm-test-cases', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('tm_test_case_links')
        .select('test_case_id, linked_at')
        .eq('linked_item_id', itemId)
        .eq('linked_item_type', 'story');
      if (!links?.length) return [];
      const caseIds = links.map(l => l.test_case_id);
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, case_key, title, status, assigned_to, created_at')
        .in('id', caseIds);
      return (cases ?? []) as unknown as TmTestCase[];
    },
  });

  /* ── TEST CYCLES ──────────────────────────────── */
  const { data: testCycles = [] } = useQuery({
    queryKey: ['tm-test-cycles', itemId],
    enabled: testCases.length > 0,
    queryFn: async () => {
      if (!testCases.length) return [];
      const caseIds = testCases.map(tc => tc.id);
      const { data: executions } = await supabase
        .from('th_test_executions')
        .select('test_case_id, test_cycle_id, result, executed_by, executed_at, cycle_name')
        .in('test_case_id', caseIds)
        .order('executed_at', { ascending: false });
      if (!executions?.length) return [];
      const cycleMap = new Map<string, TmTestCycle>();
      for (const exec of executions) {
        if (!exec.test_cycle_id) continue;
        if (!cycleMap.has(exec.test_cycle_id)) {
          cycleMap.set(exec.test_cycle_id, {
            id: exec.test_cycle_id,
            name: exec.cycle_name ?? exec.test_cycle_id,
            total_cases: 0, passed_count: 0, failed_count: 0,
            blocked_count: 0, not_run_count: 0,
            created_at: exec.executed_at,
            executions: [],
          });
        }
        const cycle = cycleMap.get(exec.test_cycle_id)!;
        cycle.total_cases++;
        if (exec.result === 'passed') cycle.passed_count++;
        else if (exec.result === 'failed') cycle.failed_count++;
        else if (exec.result === 'blocked') cycle.blocked_count = (cycle.blocked_count ?? 0) + 1;
        else cycle.not_run_count = (cycle.not_run_count ?? 0) + 1;
        cycle.executions?.push(exec as ThTestExecution);
      }
      return Array.from(cycleMap.values()) as TmTestCycle[];
    },
  });

  /* ── FIX VERSIONS — ReleaseHub ────────────────── */
  const { data: rhReleases = { linked: [] as string[], all: [] as RhRelease[] } } = useQuery({
    queryKey: ['rh-releases-for-issue', issue?.issue_key, projectId],
    enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data: releaseLinks } = await supabase
        .from('rh_release_issues')
        .select('release_id')
        .eq('issue_key', issue!.issue_key);
      const releaseIds = (releaseLinks ?? []).map(r => r.release_id);
      const { data: allReleases } = await supabase
        .from('rh_releases')
        .select('id, name, key, status, target_date, project_id')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false });
      return { linked: releaseIds, all: (allReleases ?? []) as RhRelease[] };
    },
  });

  /* ── CHANGE NUMBERS ───────────────────────────── */
  const { data: rhChanges = [] } = useQuery({
    queryKey: ['rh-changes-active', projectId],
    enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('rh_changes')
        .select('id, chg_number, title, status, release_id')
        .in('status', ['new', 'in_beta', 'in_uat'])
        .order('chg_number', { ascending: false });
      return (data ?? []) as RhChange[];
    },
  });

  /* ── PROJECT MEMBERS ──────────────────────────── */
  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', projectId],
    enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_project_members')
        .select('user_id, role, profile:profiles!ph_project_members_user_id_fkey(id, full_name, avatar_url, email)')
        .eq('project_id', projectId);
      return (data ?? []) as ProjectMember[];
    },
  });

  /* ── ATTACHMENTS ──────────────────────────────── */
  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', itemId],
    enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_attachments')
        .select('*, uploader:profiles!ph_attachments_uploaded_by_fkey(id, full_name, avatar_url, email)')
        .eq('work_item_id', itemId)
        .order('created_at', { ascending: false });
      return (data ?? []) as PhAttachment[];
    },
  });

  /* ── LOCAL STATE ──────────────────────────────── */
  const [activeChildTab, setActiveChildTab] = useState<ChildTab>('subtasks');
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');
  const [showAiImprove, setShowAiImprove] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<string>('');

  /* ── SYNC LOCAL STATE FROM ISSUE ──────────────── */
  useEffect(() => {
    if (issue) {
      setLocalStatus(issue.status);
      setLocalPriority(issue.priority ?? 'Medium');
    }
  }, [issue?.id]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: V.overlay,
        animation: 'sdm-overlay-in 200ms ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 960, maxWidth: '95vw', maxHeight: '90vh',
          background: V.white, borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'sdm-card-in 250ms ease-out',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Stage C+ will render content here */}
      </div>
    </div>
  );
}
