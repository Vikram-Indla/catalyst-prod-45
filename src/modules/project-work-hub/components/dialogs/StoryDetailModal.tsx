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
  fix_versions: FixVersion[] | null;
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
  type: string;
  status: string;
  assignee_id?: string | null;
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
  const qc = useQueryClient();
  const { user } = useAuth();

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
        {/* Stage B+ will render content here */}
      </div>
    </div>
  );
}
