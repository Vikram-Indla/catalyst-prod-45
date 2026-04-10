/**
 * StoryDetailModal — V15 Rebuild · Full v2 Integration
 * Jira-style two-panel detail modal with:
 *   - ChildIssuesSection v2 (ColumnPicker + date columns)
 *   - DefectsSection (collapsible, inline create)
 *   - IncidentsSection (collapsible)
 *   - TestHubSection (tabbed: Test Cases | Test Executions)
 *   - LinkedIssuesSection (ph_issue_links, link-type chips)
 *   - EditableAssignee, EditablePriority, EditableLabels (right panel)
 *   - ParentField (searchable epic picker)
 *   - AIImprovePanel (AI-powered story improvement)
 *   - AcceptanceCriteria section (editable)
 *   - Ring-fenced CSS via data-sdm-scope
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  X, ChevronDown, ChevronRight, Plus, Paperclip,
  ExternalLink, Share2, Pencil, Search, MessageSquare, Clock,
  GripVertical, Edit2, Link2, Trash2, Check,
  Eye, EyeOff, Sparkles, Loader2, RotateCcw, Settings2, AlertTriangle,
} from 'lucide-react';

// Ring-fenced CSS for extension components
import './story-detail-extensions.css';

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
  acceptance_criteria?: string | null;
  position?: number | null;
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
  assignee?: Profile; assignee_display_name?: string | null;
  updated_at?: string;
}

interface TmTestCaseLink {
  test_case_id: string; linked_item_id: string; linked_item_type: string;
  linked_at: string; test_case?: TmTestCase;
}

interface ThTestExecution {
  id?: string; test_case_id: string; cycle_scope_id?: string | null;
  test_cycle_id: string; execution_number?: number; result: string;
  executed_by: string; executed_at: string; cycle_name?: string;
  case_key?: string; case_title?: string;
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
  user_id: string; role: string; full_name: string; avatar_url: string | null;
}

// ── v2 Extension types ────────────────────────
type StatusCategory = 'todo' | 'in_progress' | 'done';
type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
type TestResult = 'passed' | 'failed' | 'blocked' | 'skipped' | 'not_run';

interface PhIssueRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: StatusCategory;
  issue_type: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
  priority: string;
  position: number;
  jira_created_at: string | null;
  jira_updated_at: string | null;
  deleted_at: string | null;
}

interface ColumnConfig {
  status: boolean;
  assignee: boolean;
  priority: boolean;
  created: boolean;
  updated: boolean;
}

type ChildIssueType = 'task' | 'bug' | 'Sub-task';

interface ParentIssue {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: 'todo' | 'in_progress' | 'done';
}

type AIImproveType =
  | 'improve_clarify'
  | 'expand_detail'
  | 'add_acceptance_criteria'
  | 'convert_user_story'
  | 'shorten_focus'
  | 'add_edge_cases';

interface AIOutput {
  description: string;
  acceptance_criteria: string;
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const DEFAULT_COLUMNS: ColumnConfig = {
  status: true, assignee: true, priority: true, created: false, updated: true,
};

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

/** StatusLozenge — IMMUTABLE 3-color (V12 guardrail) */
const LOZENGE_STYLES: Record<'grey' | 'blue' | 'green', React.CSSProperties> = {
  grey:  { background: '#DFE1E6', color: '#253858' },
  blue:  { background: '#DEEBFF', color: '#0747A6' },
  green: { background: '#E3FCEF', color: '#006644' },
};

const LOZENGE: Record<StatusCategory, React.CSSProperties> = {
  todo:        { background: '#DFE1E6', color: '#253858' },
  in_progress: { background: '#DEEBFF', color: '#0747A6' },
  done:        { background: '#E3FCEF', color: '#006644' },
};

/** Priority → dot color */
const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#FF5630', High: '#FF5630', Medium: '#FFAB00', Low: '#36B37E', Lowest: '#8993A4',
};

const PRIORITY_STYLES: Record<string, { color: string; symbol: string }> = {
  Highest: { color: '#AE2A19', symbol: '▲▲' }, High: { color: '#DE350B', symbol: '▲' },
  Medium: { color: '#D97706', symbol: '—' }, Low: { color: '#36B37E', symbol: '▼' },
  Lowest: { color: '#6B778C', symbol: '▼▼' },
};

const PRIORITY_ICONS: Record<string, string> = {
  Highest: '⬆⬆', High: '⬆', Medium: '→', Low: '⬇', Lowest: '⬇⬇',
};

const PRIORITY_LIST: PriorityLevel[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

const TEST_RESULT_STYLES: Record<TestResult, React.CSSProperties> = {
  passed:  { background: '#E3FCEF', color: '#006644' },
  failed:  { background: '#FFEDEB', color: '#BF2600' },
  blocked: { background: '#FFF0B3', color: '#974F0C' },
  skipped: { background: '#DFE1E6', color: '#253858' },
  not_run: { background: '#F1F5F9', color: '#6B778C' },
};

const LINK_TYPE_LABELS: Record<string, string> = {
  relates_to: 'Relates to', blocks: 'Blocks', is_blocked_by: 'Is blocked by',
  duplicates: 'Duplicates', is_duplicated_by: 'Is duplicated by',
  implements: 'Implements', is_implemented_by: 'Is implemented by',
  clones: 'Clones', is_cloned_by: 'Is cloned by',
  'relates to': 'Relates to', 'is blocked by': 'Is blocked by',
  'is duplicated by': 'Is duplicated by', 'is cloned by': 'Is cloned by',
};

const LINK_TYPE_STYLES: Record<string, React.CSSProperties> = {
  blocks:           { background: '#FFEDEB', color: '#BF2600' },
  'is blocked by':  { background: '#FFEDEB', color: '#BF2600' },
  'relates to':     { background: '#FFF0B3', color: '#974F0C' },
  relates_to:       { background: '#FFF0B3', color: '#974F0C' },
  duplicates:       { background: '#FFEDEB', color: '#BF2600' },
  'is duplicated by': { background: '#F1F5F9', color: '#6B778C' },
  clones:           { background: '#EFF6FF', color: '#1D4ED8' },
  'is cloned by':   { background: '#EFF6FF', color: '#1D4ED8' },
};

const LINK_TYPE_OPTIONS = [
  'blocks', 'is blocked by', 'relates to', 'duplicates', 'is duplicated by', 'clones',
];

const STATUS_OPTION_GROUPS = [
  { groupLabel: 'TO DO', category: 'todo', statuses: STATUS_CATEGORIES.todo },
  { groupLabel: 'IN PROGRESS', category: 'in_progress', statuses: STATUS_CATEGORIES.in_progress },
  { groupLabel: 'DONE', category: 'done', statuses: STATUS_CATEGORIES.done },
];

/** Work item type icons — canonical SVG */
const WORK_ITEM_ICONS: Record<string, string> = {
  task: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M6,4 C4.8954305,4 4,4.8954305 4,6 L4,18 C4,19.1045695 4.8954305,20 6,20 L18,20 C19.1045695,20 20,19.1045695 20,18 L20,6 C20,4.8954305 19.1045695,4 18,4 L6,4 Z M6,6 L6,18 L18,18 L18,6 L6,6 Z"/></svg>`,
  'Sub-task': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#2684FF" fill-rule="evenodd" d="M13,11 L13,6 C13,5.44771525 12.5522847,5 12,5 L6,5 C5.44771525,5 5,5.44771525 5,6 L5,12 C5,12.5522847 5.44771525,13 6,13 L11,13 L11,18 C11,18.5522847 11.4477153,19 12,19 L18,19 C18.5522847,19 19,18.5522847 19,18 L19,12 C19,11.4477153 18.5522847,11 18,11 L13,11 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M7,7 L11,7 L11,11 L7,11 L7,7 Z M13,13 L17,13 L17,17 L13,17 L13,13 Z"/></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  'QA Bug': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  Defect: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M12,17 C14.7614237,17 17,14.7614237 17,12 C17,9.23857625 14.7614237,7 12,7 C9.23857625,7 7,9.23857625 7,12 C7,14.7614237 9.23857625,17 12,17 Z"/></svg>`,
  'Production Incident': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#FF5630" fill-rule="evenodd" d="M8.82852964,12 L7.92252934,15 L16.0774707,15 L15.1714704,12 L8.82852964,12 Z M9.43252984,10 L14.5674702,10 L12.9572977,4.66830491 C12.8604893,4.34774733 12.6096616,4.09691963 12.289104,4.00011121 C11.7604031,3.84044348 11.20237,4.13960399 11.0427023,4.66830491 L9.43252984,10 Z M17,17 L7,17 L6,17 C5.44771525,17 5,17.4477153 5,18 L5,20 L19,20 L19,18 C19,17.4477153 18.5522847,17 18,17 L17,17 Z M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z"/></svg>`,
  epic: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#6554C0" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M18.1875,9.4 L15.125,9.4 L15.125,4.8 C15.125,3.80261507 14.3098441,3 13.3125,3 L9.875,14.5744 L9.875,19.2 C9.875,20.1973849 10.6901559,21 11.6875,21 L20,11.2 C20,10.2026151 19.1848441,9.4 18.1875,9.4 Z"/></svg>`,
  story: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="#36B37E" fill-rule="evenodd" d="M3,0 L21,0 C22.6568542,-3.04359188e-16 24,1.34314575 24,3 L24,21 C24,22.6568542 22.6568542,24 21,24 L3,24 C1.34314575,24 2.02906125e-16,22.6568542 0,21 L0,3 C-2.02906125e-16,1.34314575 1.34314575,3.04359188e-16 3,0 Z M15.6470004,19.5152539 L16.9369996,17.9868881 L12.0001502,13.8199984 L7.06117589,17.98674 L7,18.1534919 L7,6.68807648 C7,6.34797522 7.41227423,6 8,6 L16,6 C16.5865377,6 17,6.34873697 17,6.68807648 L17,18.1534919 L15.6470004,19.5152539 Z"/></svg>`,
};

const AI_IMPROVE_OPTIONS: { value: AIImproveType; label: string }[] = [
  { value: 'improve_clarify', label: 'Improve & Clarify' },
  { value: 'expand_detail', label: 'Expand & Detail' },
  { value: 'add_acceptance_criteria', label: 'Add Acceptance Criteria' },
  { value: 'convert_user_story', label: 'Convert to User Story format' },
  { value: 'shorten_focus', label: 'Shorten & Focus' },
  { value: 'add_edge_cases', label: 'Add Edge Cases' },
];

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

function getLozengeVariant(statusCategory: 'todo' | 'in_progress' | 'done'): 'grey' | 'blue' | 'green' {
  if (statusCategory === 'done') return 'green';
  if (statusCategory === 'in_progress') return 'blue';
  return 'grey';
}

function nextPos(items: { position: number }[]): number {
  if (!items.length) return 1024;
  return Math.max(...items.map(i => i.position)) + 1024;
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

function Skel({ w, h = 14 }: { w: number | string; h?: number }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: '#F1F5F9', animation: 'sdm-pulse 1.5s ease-in-out infinite' }} />;
}

/* ═══════════════════════════════════════════════
   V2 SHARED COMPONENTS
   ═══════════════════════════════════════════════ */

interface SectionBlockProps {
  title: string;
  count: number;
  doneCount?: number;
  defaultExpanded?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

function SectionBlock({ title, count, doneCount, defaultExpanded = true, headerRight, children }: SectionBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="sdm-child-issues">
      <div className="sdm-child-header">
        <div className="sdm-child-header-left">
          <button className="sdm-chevron-btn" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}>
            {expanded ? <ChevronDown size={11} strokeWidth={2.5} /> : <ChevronRight size={11} strokeWidth={2.5} />}
          </button>
          <span className="sdm-child-title">{title}</span>
          <span className="sdm-count-badge">{count}</span>
        </div>
        {expanded && doneCount !== undefined && count > 0 && (
          <div className="sdm-progress-block" title={`${doneCount} of ${count} done`}>
            <div className="sdm-progress-track">
              <div className="sdm-progress-fill" style={{ width: `${count ? Math.round((doneCount / count) * 100) : 0}%` }} />
            </div>
            <span className="sdm-progress-text">{doneCount} / {count}</span>
          </div>
        )}
        {expanded && headerRight && (
          <div className="sdm-child-header-right">{headerRight}</div>
        )}
      </div>
      {expanded && <div>{children}</div>}
    </div>
  );
}

interface IssueRowProps {
  item: PhIssueRow;
  columns: ColumnConfig;
  onDelete: () => void;
  onCopyLink: () => void;
}

function IssueRow({ item, columns, onDelete, onCopyLink }: IssueRowProps) {
  const isDone = item.status_category === 'done';
  const avatarColor = item.assignee_display_name ? getAvatarColor(item.assignee_display_name) : '#8993A4';
  const avatarInitial = item.assignee_display_name?.charAt(0).toUpperCase() ?? '?';
  return (
    <div className="sdm-child-row" role="listitem">
      <span className="sdm-drag-handle"><GripVertical size={12} /></span>
      <span className="sdm-type-icon" dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[item.issue_type] ?? WORK_ITEM_ICONS.task }} />
      <span className="sdm-child-key" style={isDone ? { color: 'rgba(9,30,66,0.4)' } : {}}>{item.issue_key}</span>
      <span className={`sdm-child-summary${isDone ? ' sdm-child-summary--done' : ''}`}>{item.summary}</span>
      {columns.status && (
        <span className="sdm-status-lozenge" style={LOZENGE[item.status_category]}>{item.status}</span>
      )}
      {columns.assignee && (
        <div className="sdm-child-avatar" style={{ background: avatarColor }} title={item.assignee_display_name ?? 'Unassigned'}>{avatarInitial}</div>
      )}
      {columns.priority && (
        <div className="sdm-priority-dot" style={{ background: PRIORITY_COLORS[item.priority] ?? '#8993A4' }} title={item.priority} />
      )}
      {columns.created && (
        <span className="sdm-date-col" title={item.jira_created_at ?? ''}>{formatDateShort(item.jira_created_at)}</span>
      )}
      {columns.updated && (
        <span className="sdm-date-col" title={item.jira_updated_at ?? ''}>{formatDateShort(item.jira_updated_at)}</span>
      )}
      <div className="sdm-row-actions">
        <button className="sdm-row-action-btn" title="Edit" onClick={e => e.stopPropagation()}><Edit2 size={11} /></button>
        <button className="sdm-row-action-btn" title="Copy link" onClick={e => { e.stopPropagation(); onCopyLink(); }}><Link2 size={11} /></button>
        <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Delete" onClick={e => { e.stopPropagation(); onDelete(); }}><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

function ColumnPicker({ columns, onChange }: { columns: ColumnConfig; onChange: (c: ColumnConfig) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const toggle = (key: keyof ColumnConfig) => onChange({ ...columns, [key]: !columns[key] });
  const COLS: { key: keyof ColumnConfig; label: string }[] = [
    { key: 'status', label: 'Status' }, { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' }, { key: 'created', label: 'Created' },
    { key: 'updated', label: 'Updated' },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="sdm-visibility-btn" onClick={() => setOpen(o => !o)} title="Configure visible columns">
        <Settings2 size={11} /> Columns
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 200, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 60, overflow: 'hidden', paddingBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '.05em', padding: '6px 12px 6px', borderBottom: '1px solid rgba(9,30,66,.1)' }}>Visible columns</div>
          {COLS.map(col => (
            <div key={col.key} onClick={() => toggle(col.key)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer', transition: 'background .12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${columns[col.key] ? '#2563EB' : 'rgba(9,30,66,.24)'}`, background: columns[col.key] ? '#2563EB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .12s, border-color .12s' }}>
                {columns[col.key] && <Check size={9} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: '#172B4D' }}>{col.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface InlineCreateRowProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  typeIcon: string;
  onTypeToggle?: () => void;
  placeholder: string;
}

const InlineCreateRow = React.forwardRef<HTMLInputElement, InlineCreateRowProps>(
  ({ value, onChange, onSubmit, onCancel, pending, typeIcon, onTypeToggle, placeholder }, ref) => (
    <div className="sdm-create-row">
      <button className="sdm-type-select-btn" onClick={onTypeToggle} title="Toggle type">
        <span dangerouslySetInnerHTML={{ __html: typeIcon }} />
      </button>
      <input ref={ref} className="sdm-create-input" type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } if (e.key === 'Escape') onCancel(); }}
        maxLength={255} />
      <button className="sdm-confirm-btn" onClick={onSubmit} disabled={!value.trim() || pending}>
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      </button>
      <button className="sdm-cancel-btn" onClick={onCancel}><X size={13} /></button>
    </div>
  )
);
InlineCreateRow.displayName = 'InlineCreateRow';

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sdm-skeleton-row">
          <div className="sdm-skeleton-pulse" style={{ width: 15, height: 15 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 55, height: 12 }} />
          <div className="sdm-skeleton-pulse" style={{ flex: 1, height: 12 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 55, height: 18 }} />
          <div className="sdm-skeleton-pulse" style={{ width: 22, height: 22, borderRadius: '50%' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ heading, sub, cta, onCta }: { heading: string; sub: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="sdm-child-empty">
      <AlertTriangle size={28} color="#8993A4" />
      <div className="sdm-child-empty-heading">{heading}</div>
      <div className="sdm-child-empty-sub">{sub}</div>
      {cta && onCta && <button className="sdm-child-empty-cta" onClick={onCta}>{cta}</button>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   V2 SECTION: ChildIssuesSection
   ═══════════════════════════════════════════════ */

function ChildIssuesSection({ storyKey, storyId, projectKey }: { storyKey: string; storyId: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showDone, setShowDone] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState<'task' | 'bug'>('task');
  const createRef = useRef<HTMLInputElement>(null);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).in('issue_type', ['task', 'Sub-task']).is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const visible = useMemo(() => showDone ? children : children.filter(c => c.status_category !== 'done'), [children, showDone]);
  const doneCount = children.filter(c => c.status_category === 'done').length;

  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      const tempKey = `${projectKey}-NEW-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey, summary: summary.trim(), issue_type: draftType,
        parent_key: storyKey, project_key: projectKey, status: 'To Do',
        status_category: 'todo', priority: 'Medium', position: nextPos(children),
        reporter_account_id: user?.id, source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }); setDraftSummary(''); setTimeout(() => createRef.current?.focus(), 50); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);

  return (
    <SectionBlock title="Child Issues" count={children.length} doneCount={doneCount} defaultExpanded headerRight={
      <>
        {doneCount > 0 && (
          <button className="sdm-visibility-btn" onClick={() => setShowDone(s => !s)}>
            {showDone ? <><Eye size={11} /> Hide done</> : <><EyeOff size={11} /> Show done ({doneCount})</>}
          </button>
        )}
        <ColumnPicker columns={columns} onChange={setColumns} />
        <button className="sdm-create-btn" onClick={() => setCreating(true)}><Plus size={11} strokeWidth={2.5} /> Create child</button>
      </>
    }>
      {isLoading && <SkeletonRows />}
      {!isLoading && children.length === 0 && <EmptyState heading="No child issues yet" sub="Break this story into tasks to track progress" cta="+ Create child issue" onCta={() => setCreating(true)} />}
      {!isLoading && visible.length > 0 && (
        <div className="sdm-child-list" role="list">
          {visible.map(item => (
            <IssueRow key={item.id} item={item} columns={columns}
              onDelete={() => { if (confirm(`Delete ${item.issue_key}?`)) deleteMutation.mutate(item.id); }}
              onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
          ))}
        </div>
      )}
      {creating && (
        <InlineCreateRow ref={createRef} value={draftSummary} onChange={setDraftSummary}
          onSubmit={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
          onCancel={() => { setCreating(false); setDraftSummary(''); }}
          pending={createMutation.isPending} typeIcon={WORK_ITEM_ICONS[draftType]} onTypeToggle={() => setDraftType(t => t === 'task' ? 'bug' : 'task')} placeholder="What needs to be done?" />
      )}
    </SectionBlock>
  );
}

/* ═══════════════════════════════════════════════
   V2 SECTION: DefectsSection
   ═══════════════════════════════════════════════ */

function DefectsSection({ storyKey, projectKey }: { storyKey: string; projectKey: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const createRef = useRef<HTMLInputElement>(null);

  const { data: defects = [], isLoading } = useQuery({
    queryKey: ['defects', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).in('issue_type', ['QA Bug', 'Defect']).is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      const tempKey = `${projectKey}-DEF-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey, summary: summary.trim(), issue_type: 'Defect',
        parent_key: storyKey, project_key: projectKey, status: 'To Do',
        status_category: 'todo', priority: 'High', position: nextPos(defects),
        reporter_account_id: user?.id, source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['defects', storyKey] }); setDraftSummary(''); setTimeout(() => createRef.current?.focus(), 50); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['defects', storyKey] }),
  });

  useEffect(() => { if (creating) setTimeout(() => createRef.current?.focus(), 50); }, [creating]);
  const doneCount = defects.filter(d => d.status_category === 'done').length;

  return (
    <SectionBlock title="Defects" count={defects.length} doneCount={doneCount} defaultExpanded={defects.length > 0} headerRight={
      <>
        <ColumnPicker columns={columns} onChange={setColumns} />
        <button className="sdm-create-btn" onClick={() => setCreating(true)}><Plus size={11} strokeWidth={2.5} /> Log defect</button>
      </>
    }>
      {isLoading && <SkeletonRows count={2} />}
      {!isLoading && defects.length === 0 && <EmptyState heading="No defects logged" sub="Log defects found during testing" cta="+ Log defect" onCta={() => setCreating(true)} />}
      {!isLoading && defects.length > 0 && (
        <div className="sdm-child-list" role="list">
          {defects.map(item => (
            <IssueRow key={item.id} item={item} columns={columns}
              onDelete={() => { if (confirm(`Delete ${item.issue_key}?`)) deleteMutation.mutate(item.id); }}
              onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
          ))}
        </div>
      )}
      {creating && (
        <InlineCreateRow ref={createRef} value={draftSummary} onChange={setDraftSummary}
          onSubmit={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
          onCancel={() => { setCreating(false); setDraftSummary(''); }}
          pending={createMutation.isPending} typeIcon={WORK_ITEM_ICONS.Defect} placeholder="Describe the defect…" />
      )}
    </SectionBlock>
  );
}

/* ═══════════════════════════════════════════════
   V2 SECTION: IncidentsSection
   ═══════════════════════════════════════════════ */

function IncidentsSection({ storyKey }: { storyKey: string }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_account_id,assignee_display_name,priority,position,jira_created_at,jira_updated_at,deleted_at')
        .eq('parent_key', storyKey).eq('issue_type', 'Production Incident').is('deleted_at', null)
        .order('jira_created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhIssueRow[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', id); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidents', storyKey] }),
  });

  const doneCount = incidents.filter(i => i.status_category === 'done').length;

  return (
    <SectionBlock title="Production Incidents" count={incidents.length} doneCount={doneCount} defaultExpanded={incidents.length > 0} headerRight={
      <>
        <ColumnPicker columns={columns} onChange={setColumns} />
        <button className="sdm-create-btn sdm-visibility-btn"><ExternalLink size={10} /> Link incident</button>
      </>
    }>
      {isLoading && <SkeletonRows count={1} />}
      {!isLoading && incidents.length === 0 && <EmptyState heading="No production incidents" sub="Incidents linked to this story will appear here" />}
      {!isLoading && incidents.length > 0 && (
        <div className="sdm-child-list" role="list">
          {incidents.map(item => (
            <IssueRow key={item.id} item={item} columns={columns}
              onDelete={() => { if (confirm(`Unlink ${item.issue_key}?`)) deleteMutation.mutate(item.id); }}
              onCopyLink={() => navigator.clipboard.writeText(`${window.location.origin}/issues/${item.issue_key}`)} />
          ))}
        </div>
      )}
    </SectionBlock>
  );
}

/* ═══════════════════════════════════════════════
   V2 SECTION: TestHubSection
   ═══════════════════════════════════════════════ */

function TestHubSection({ storyId }: { storyId: string }) {
  const [activeTab, setActiveTab] = useState<'cases' | 'executions'>('cases');
  const queryClient = useQueryClient();

  const { data: testCases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['testCases', storyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tm_test_case_links')
        .select(`id, test_case:tm_test_cases ( id, case_key, title, status, priority, assigned_to, created_at )`)
        .eq('linked_item_id', storyId).eq('linked_item_type', 'story');
      if (error) throw error;
      return (data?.map((r: any) => r.test_case).filter(Boolean) ?? []) as TmTestCase[];
    },
  });

  const { data: executions = [], isLoading: execLoading } = useQuery({
    queryKey: ['testExecutions', storyId],
    queryFn: async () => {
      const { data: links } = await supabase.from('tm_test_case_links')
        .select('test_case_id:tm_test_cases(id,case_key,title)')
        .eq('linked_item_id', storyId).eq('linked_item_type', 'story');
      if (!links?.length) return [];
      const caseIds = links.map((l: any) => l.test_case_id?.id).filter(Boolean);
      const { data, error } = await supabase.from('th_test_executions')
        .select('id,test_case_id,cycle_name,result,executed_by,executed_at')
        .in('test_case_id', caseIds).order('executed_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ThTestExecution[];
    },
    enabled: activeTab === 'executions',
  });

  const unlinkCase = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase.from('tm_test_case_links').delete()
        .eq('linked_item_id', storyId).eq('test_case_id', caseId).eq('linked_item_type', 'story');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['testCases', storyId] }),
  });

  return (
    <SectionBlock title="TestHub" count={testCases.length} defaultExpanded={testCases.length > 0} headerRight={
      <>
        <button className="sdm-visibility-btn" style={{ gap: 4 }}><ExternalLink size={10} /> Open TestHub</button>
        <button className="sdm-create-btn sdm-visibility-btn"><Plus size={10} /> Link test</button>
      </>
    }>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(9,30,66,.14)', background: '#F8FAFC' }}>
        {([{ key: 'cases' as const, label: 'Test Cases', count: testCases.length }, { key: 'executions' as const, label: 'Test Executions', count: executions.length }]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, height: 33, fontSize: 12, fontWeight: 500, border: 'none', background: 'transparent', cursor: 'pointer',
            color: activeTab === tab.key ? '#2563EB' : '#6B778C',
            borderBottom: `2px solid ${activeTab === tab.key ? '#2563EB' : 'transparent'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'color .12s, border-color .12s',
            fontFamily: 'var(--cp-font-ui, Inter, system-ui, sans-serif)',
          }}>
            {tab.label}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8, background: activeTab === tab.key ? '#DEEBFF' : '#DFE1E6', color: activeTab === tab.key ? '#0747A6' : '#42526E' }}>{tab.count}</span>
          </button>
        ))}
      </div>
      {activeTab === 'cases' && (
        <>
          {casesLoading && <SkeletonRows />}
          {!casesLoading && testCases.length === 0 && <EmptyState heading="No test cases linked" sub="Link test cases from TestHub to track coverage" />}
          {!casesLoading && testCases.length > 0 && (
            <div className="sdm-child-list" role="list">
              {testCases.map(tc => (
                <div key={tc.id} className="sdm-child-row">
                  <span className="sdm-type-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#36B37E" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </span>
                  <span className="sdm-child-key" style={{ color: '#42526E' }}>{tc.case_key}</span>
                  <span className="sdm-child-summary">{tc.title}</span>
                  <span className="sdm-status-lozenge" style={LOZENGE[tc.status === 'active' ? 'in_progress' : 'todo']}>{tc.status}</span>
                  <span className="sdm-date-col">{formatDateShort(tc.created_at)}</span>
                  <div className="sdm-row-actions">
                    <button className="sdm-row-action-btn" title="Open in TestHub"><ExternalLink size={11} /></button>
                    <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Unlink" onClick={e => { e.stopPropagation(); unlinkCase.mutate(tc.id); }}><X size={11} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {activeTab === 'executions' && (
        <>
          {execLoading && <SkeletonRows />}
          {!execLoading && executions.length === 0 && <EmptyState heading="No test executions" sub="Run test cases from TestHub to see results here" />}
          {!execLoading && executions.length > 0 && (
            <div className="sdm-child-list" role="list">
              {executions.map(ex => (
                <div key={ex.id ?? ex.test_case_id} className="sdm-child-row">
                  <span style={{
                    ...TEST_RESULT_STYLES[ex.result as TestResult] ?? TEST_RESULT_STYLES.not_run,
                    display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 6px', borderRadius: 3,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', flexShrink: 0,
                  }}>{ex.result?.replace('_', ' ') ?? 'N/A'}</span>
                  <span className="sdm-child-key" style={{ color: '#42526E' }}>{ex.case_key ?? '—'}</span>
                  <span className="sdm-child-summary">{ex.cycle_name ?? 'Manual execution'}</span>
                  {ex.executed_by && (
                    <div className="sdm-child-avatar" style={{ background: getAvatarColor(ex.executed_by) }}>{ex.executed_by.charAt(0).toUpperCase()}</div>
                  )}
                  <span className="sdm-date-col">{formatDateShort(ex.executed_at)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </SectionBlock>
  );
}

/* ═══════════════════════════════════════════════
   V2 SECTION: LinkedIssuesSection
   ═══════════════════════════════════════════════ */

function LinkedIssuesSection({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['linkedIssues', issueId],
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase.from('ph_issue_links')
        .select('id, link_type, created_at, source_id, target_id')
        .eq('source_id', issueId).order('created_at', { ascending: false });
      if (error) throw error;
      if (!rawLinks?.length) return [];
      const targetIds = rawLinks.map(l => l.target_id);
      const { data: targets } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, jira_updated_at, deleted_at')
        .in('id', targetIds).is('deleted_at', null);
      const targetMap = new Map((targets ?? []).map((t: any) => [t.id, t]));
      return rawLinks.map(l => ({ ...l, target: targetMap.get(l.target_id) })).filter(l => l.target) as any[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => { const { error } = await supabase.from('ph_issue_links').delete().eq('id', linkId); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }),
  });

  return (
    <SectionBlock title="Linked Issues" count={links.length} defaultExpanded={links.length > 0} headerRight={
      <button className="sdm-create-btn" onClick={() => setShowAdd(true)}><Plus size={11} strokeWidth={2.5} /> Link issue</button>
    }>
      {isLoading && <SkeletonRows />}
      {!isLoading && links.length === 0 && <EmptyState heading="No linked issues" sub="Link related, blocking, or duplicate issues" cta="+ Link issue" onCta={() => setShowAdd(true)} />}
      {!isLoading && links.length > 0 && (
        <div className="sdm-child-list" role="list">
          {links.map((link: any) => {
            const target = link.target;
            const avatarColor = target.assignee_display_name ? getAvatarColor(target.assignee_display_name) : '#8993A4';
            const linkStyle = LINK_TYPE_STYLES[link.link_type] ?? { background: '#F1F5F9', color: '#6B778C' };
            return (
              <div key={link.id} className="sdm-child-row">
                <span style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0, whiteSpace: 'nowrap' }}>{link.link_type}</span>
                <span className="sdm-type-icon" dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[target.issue_type?.toLowerCase()] ?? WORK_ITEM_ICONS.story }} />
                <span className="sdm-child-key">{target.issue_key}</span>
                <span className={`sdm-child-summary${target.status_category === 'done' ? ' sdm-child-summary--done' : ''}`}>{target.summary}</span>
                <span className="sdm-status-lozenge" style={LOZENGE[target.status_category as StatusCategory] ?? LOZENGE.todo}>{target.status}</span>
                {target.assignee_display_name && (
                  <div className="sdm-child-avatar" style={{ background: avatarColor }}>{target.assignee_display_name.charAt(0).toUpperCase()}</div>
                )}
                <span className="sdm-date-col" title={`Linked: ${link.created_at}`}>{formatDateShort(link.created_at)}</span>
                <div className="sdm-row-actions">
                  <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Remove link" onClick={e => { e.stopPropagation(); removeMutation.mutate(link.id); }}><X size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAdd && <AddLinkRow issueId={issueId} onClose={() => setShowAdd(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }); setShowAdd(false); }} />}
    </SectionBlock>
  );
}

function AddLinkRow({ issueId, onClose, onSuccess }: { issueId: string; onClose: () => void; onSuccess: () => void }) {
  const [linkType, setLinkType] = useState(LINK_TYPE_OPTIONS[0]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; issue_key: string; summary: string } | null>(null);

  const { data: results = [] } = useQuery({
    queryKey: ['linkSearch', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase.from('ph_issues').select('id, issue_key, summary')
        .or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`)
        .is('deleted_at', null).neq('id', issueId).limit(10);
      return data ?? [];
    },
    enabled: search.length > 0,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase.from('ph_issue_links').insert({ source_id: issueId, target_id: selected.id, link_type: linkType });
      if (error) throw error;
    },
    onSuccess,
  });

  return (
    <div style={{ padding: '8px 12px', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={linkType} onChange={e => setLinkType(e.target.value)} style={{ height: 28, border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', padding: '0 6px', background: '#fff', flex: '0 0 auto' }}>
          {LINK_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by issue key or title…"
          style={{ flex: 1, height: 28, padding: '0 7px', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <button className="sdm-confirm-btn" onClick={() => linkMutation.mutate()} disabled={!selected || linkMutation.isPending}>
          {linkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button className="sdm-cancel-btn" onClick={onClose}><X size={13} /></button>
      </div>
      {results.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, background: '#fff' }}>
          {results.map((r: any) => (
            <div key={r.id} onClick={() => setSelected(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', background: selected?.id === r.id ? '#EFF6FF' : 'transparent', fontSize: 12 }}
              onMouseEnter={e => { if (selected?.id !== r.id) (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,.04)'; }}
              onMouseLeave={e => { if (selected?.id !== r.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'var(--cp-font-mono, monospace)', fontSize: 11, fontWeight: 600, color: '#2563EB', flexShrink: 0 }}>{r.issue_key}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#172B4D' }}>{r.summary}</span>
              {selected?.id === r.id && <Check size={12} color="#2563EB" />}
            </div>
          ))}
        </div>
      )}
      {selected && <div style={{ fontSize: 11, color: '#6B778C' }}>Will link: <strong>{selected.issue_key}</strong> as &quot;{linkType}&quot;</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   V2 EDITABLE RIGHT PANEL FIELDS
   ═══════════════════════════════════════════════ */

function EditableAssignee({ issueId, projectId, currentAssigneeId, currentAssigneeName, onUpdate }: {
  issueId: string; projectId: string; currentAssigneeId: string | null; currentAssigneeName: string | null; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['projectMembers-edit', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_project_members').select('user_id, role').eq('project_id', projectId);
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => ({ user_id: d.user_id, full_name: profileMap.get(d.user_id)?.full_name ?? 'Unknown', avatar_url: profileMap.get(d.user_id)?.avatar_url ?? null, role: d.role })) as ProjectMember[];
    },
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const { error } = await supabase.from('ph_issues').update({
        assignee_account_id: userId,
        assignee_display_name: members.find(m => m.user_id === userId)?.full_name ?? null,
      }).eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => { onUpdate(); setOpen(false); },
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = members.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()));
  const avatarColor = currentAssigneeName ? getAvatarColor(currentAssigneeName) : '#8993A4';

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 7px 2px 2px', borderRadius: 13, background: '#F8FAFC', border: '1px solid rgba(9,30,66,.14)', cursor: 'pointer', transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')} onMouseLeave={e => (e.currentTarget.style.background = '#F8FAFC')}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{currentAssigneeName?.charAt(0).toUpperCase() ?? '?'}</div>
        <span style={{ fontSize: 12, color: '#172B4D' }}>{currentAssigneeName ?? 'Unassigned'}</span>
        <Edit2 size={10} color="#8993A4" />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 220, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: 6, borderBottom: '1px solid rgba(9,30,66,.1)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{ width: '100%', height: 28, padding: '0 7px', border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div onClick={() => updateMutation.mutate(null)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DFE1E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6B778C' }}>?</div>
              <span>Unassigned</span>
              {!currentAssigneeId && <Check size={12} color="#2563EB" style={{ marginLeft: 'auto' }} />}
            </div>
            {filtered.map(m => (
              <div key={m.user_id} onClick={() => updateMutation.mutate(m.user_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13, background: m.user_id === currentAssigneeId ? '#EFF6FF' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = m.user_id === currentAssigneeId ? '#DBEAFE' : 'rgba(9,30,66,.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = m.user_id === currentAssigneeId ? '#EFF6FF' : 'transparent')}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: getAvatarColor(m.full_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.full_name.charAt(0).toUpperCase()}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</span>
                {m.user_id === currentAssigneeId && <Check size={12} color="#2563EB" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditablePriority({ issueId, currentPriority, onUpdate }: { issueId: string; currentPriority: string; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateMutation = useMutation({
    mutationFn: async (priority: string) => { const { error } = await supabase.from('ph_issues').update({ priority }).eq('id', issueId); if (error) throw error; },
    onSuccess: () => { onUpdate(); setOpen(false); },
  });
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span style={{ color: PRIORITY_COLORS[currentPriority] ?? '#8993A4', fontSize: 12 }}>{PRIORITY_ICONS[currentPriority] ?? '—'}</span>
        <span style={{ fontSize: 13, color: PRIORITY_COLORS[currentPriority] ?? '#8993A4' }}>{currentPriority}</span>
        <Edit2 size={10} color="#8993A4" />
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 160, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 50, overflow: 'hidden' }}>
          {PRIORITY_LIST.map(p => (
            <div key={p} onClick={() => updateMutation.mutate(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13, background: p === currentPriority ? '#EFF6FF' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = p === currentPriority ? '#DBEAFE' : 'rgba(9,30,66,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = p === currentPriority ? '#EFF6FF' : 'transparent')}>
              <span style={{ color: PRIORITY_COLORS[p], fontSize: 12, width: 16 }}>{PRIORITY_ICONS[p]}</span>
              <span style={{ color: PRIORITY_COLORS[p], flex: 1 }}>{p}</span>
              {p === currentPriority && <Check size={12} color="#2563EB" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditableLabels({ issueId, currentLabels, onUpdate }: { issueId: string; currentLabels: string[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => { const { error } = await supabase.from('ph_issues').update({ labels: JSON.stringify(labels) as any }).eq('id', issueId); if (error) throw error; },
    onSuccess: () => onUpdate(),
  });
  const addLabel = (label: string) => {
    const trimmed = label.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || currentLabels.includes(trimmed)) return;
    updateMutation.mutate([...currentLabels, trimmed]);
    setDraft('');
  };
  const removeLabel = (label: string) => updateMutation.mutate(currentLabels.filter(l => l !== label));
  return (
    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, padding: '2px 0' }}>
      {currentLabels.map(label => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 18, padding: '0 6px', borderRadius: 3, background: '#DEEBFF', color: '#0747A6', fontSize: 11, fontWeight: 500 }}>
          {label}
          <button onClick={() => removeLabel(label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0747A6', padding: 0, display: 'flex', alignItems: 'center' }}><X size={10} /></button>
        </span>
      ))}
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(draft); } if (e.key === 'Escape') { setEditing(false); setDraft(''); } }}
          onBlur={() => { if (draft) addLabel(draft); setEditing(false); }}
          placeholder="Type + Enter" style={{ height: 20, padding: '0 6px', border: '1px solid #2563EB', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', outline: 'none', width: 90 }} />
      ) : (
        <button onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 18, padding: '0 6px', borderRadius: 3, border: '1px dashed rgba(9,30,66,.24)', color: '#8993A4', fontSize: 11, background: 'none', cursor: 'pointer' }}>
          <Plus size={9} /> Add label
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EXTENSION: ParentFieldPicker
   ═══════════════════════════════════════════════ */

function ParentFieldPicker({ storyKey, parentKey, projectKey, onParentChange }: {
  storyKey: string; parentKey: string | null; projectKey: string;
  onParentChange: (newParentKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: currentParent } = useQuery({
    queryKey: ['parentIssue', parentKey],
    queryFn: async () => {
      if (!parentKey) return null;
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', parentKey).is('deleted_at', null).single();
      if (error) return null;
      return data as ParentIssue;
    },
    enabled: !!parentKey,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['parentSearch', projectKey, search],
    queryFn: async () => {
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null).neq('issue_key', storyKey)
        .order('jira_updated_at', { ascending: false }).limit(10);
      if (search.trim()) {
        query = query.or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ParentIssue[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);
  const handleSelect = (key: string | null) => { onParentChange(key); setOpen(false); setSearch(''); };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      {parentKey && currentParent ? (
        <div className="sdm-parent-field" onClick={() => setOpen(o => !o)}>
          <span dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[currentParent.issue_type.toLowerCase()] ?? WORK_ITEM_ICONS.epic }} />
          <span className="sdm-parent-key">{currentParent.issue_key}</span>
          <span className="sdm-parent-name">{currentParent.summary}</span>
          <span className="sdm-parent-chevron"><ChevronRight size={10} /></span>
        </div>
      ) : (
        <div className="sdm-parent-field sdm-parent-field--empty" onClick={() => setOpen(o => !o)} role="button">None — Add parent</div>
      )}
      {open && (
        <div className="sdm-parent-popover" role="dialog" aria-label="Select parent issue">
          <div className="sdm-popover-search">
            <input ref={searchInputRef} className="sdm-popover-input" type="text" placeholder="Search epics…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }} />
          </div>
          <div className="sdm-popover-results">
            {parentKey && <div className="sdm-popover-none-option" onClick={() => handleSelect(null)} role="button">✕ Remove parent</div>}
            {searchResults.map(result => (
              <div key={result.id} className={`sdm-popover-result${result.issue_key === parentKey ? ' sdm-popover-result--active' : ''}`} onClick={() => handleSelect(result.issue_key)} role="button">
                <span dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS.epic }} />
                <span className="sdm-popover-result-key">{result.issue_key}</span>
                <span className="sdm-popover-result-name">{result.summary}</span>
                {result.issue_key === parentKey && <Check size={12} style={{ color: '#2563EB', flexShrink: 0 }} />}
              </div>
            ))}
            {searchResults.length === 0 && search && <div style={{ padding: 12, fontSize: 12, color: '#6B778C', textAlign: 'center' }}>No epics found for "{search}"</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EXTENSION: AIImprovePanel
   ═══════════════════════════════════════════════ */

function AIImprovePanel({ storyId, issueKey, currentDescription, currentAcceptanceCriteria, onApplyDescription, onApplyAcceptanceCriteria }: {
  storyId: string; issueKey: string; currentDescription: string; currentAcceptanceCriteria: string;
  onApplyDescription: (text: string, prev: string) => void; onApplyAcceptanceCriteria: (text: string, prev: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [improveType, setImproveType] = useState<AIImproveType>('improve_clarify');
  const [focusHint, setFocusHint] = useState('');
  const [output, setOutput] = useState<AIOutput | null>(null);
  const [editedOutput, setEditedOutput] = useState<AIOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasEdited, setWasEdited] = useState(false);
  const effectiveOutput = editedOutput ?? output;

  const handleGenerate = async () => {
    if (wasEdited && output) { if (!confirm('Regenerating will discard your edits. Continue?')) return; }
    setLoading(true); setError(null); setOutput(null); setEditedOutput(null); setWasEdited(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
        body: { issue_id: storyId, improve_type: improveType, focus_hint: focusHint.trim() || null, current_description: currentDescription || '(empty)', current_ac: currentAcceptanceCriteria || '(none)', issue_summary: issueKey },
      });
      if (fnError) throw fnError;
      if (!data?.description && !data?.acceptance_criteria) throw new Error('AI returned empty response');
      setOutput({ description: data.description ?? '', acceptance_criteria: data.acceptance_criteria ?? '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI features are temporarily unavailable. Try again later.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <button className="sdm-ai-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}><Sparkles size={12} /> AI Improve Story</button>
      {open && (
        <div className="sdm-ai-panel" id="sdm-ai-panel" role="dialog" aria-label="AI Improve Story Requirements">
           <div className="sdm-ai-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <div className="sdm-ai-panel-title" style={{ flex: 1 }}><Sparkles size={11} /> AI Improve Story Requirements</div>
             <span style={{ fontSize: 10, color: '#1D4ED8', background: '#DBEAFE', padding: '1px 6px', borderRadius: 3, fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.02em' }}>gemini-flash</span>
             <button className="sdm-chevron-btn" onClick={() => setOpen(false)}><X size={12} /></button>
           </div>
          <div className="sdm-ai-panel-body">
            <div className="sdm-ai-field"><div className="sdm-ai-field-label">Improve type</div>
              <Select value={improveType} onValueChange={(val) => setImproveType(val as AIImproveType)}>
                <SelectTrigger className="w-full h-8 bg-white border-[rgba(9,30,66,0.14)] text-[13px] focus:border-[#2563EB]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[rgba(9,30,66,0.14)] rounded-md shadow-md z-50">
                  {AI_IMPROVE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-[13px] text-[#172B4D] focus:bg-[#EFF6FF] focus:text-[#1D4ED8] data-[state=checked]:bg-[#EFF6FF] data-[state=checked]:text-[#1D4ED8] cursor-pointer">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sdm-ai-field"><div className="sdm-ai-field-label">Focus area <span style={{ color: '#8993A4' }}>(optional)</span></div>
              <input className="sdm-ai-focus-input" type="text" placeholder='e.g. "focus on edge cases"' value={focusHint} onChange={e => setFocusHint(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }} />
            </div>
            <div className="sdm-ai-field"><div className="sdm-ai-field-label">Context from story</div>
              <div className="sdm-ai-context-box">{currentDescription || <em style={{ color: '#8993A4' }}>No description yet — AI will generate from story title and context</em>}</div>
            </div>
            <button className="sdm-ai-generate-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}
            </button>
            {error && <div style={{ marginTop: 8, padding: '8px 10px', background: '#FFF1EF', border: '1px solid #FFBDAD', borderRadius: 4, fontSize: 12, color: '#BF2600' }}>⚠ {error} <button onClick={handleGenerate} style={{ marginLeft: 8, color: '#BF2600', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>Retry</button></div>}
            {loading && <div className="sdm-ai-output" style={{ marginTop: 10 }}><div style={{ padding: 12 }}><div className="sdm-ai-shimmer-line" style={{ width: '40%' }} /><div className="sdm-ai-shimmer-line" /><div className="sdm-ai-shimmer-line" style={{ width: '85%' }} /><div className="sdm-ai-shimmer-line" style={{ width: '60%' }} /></div></div>}
            {!loading && effectiveOutput && (
              <div className="sdm-ai-output">
                <div className="sdm-ai-output-content" contentEditable suppressContentEditableWarning onInput={() => setWasEdited(true)}>
                  {effectiveOutput.description && <><strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C' }}>Description</strong><p style={{ marginTop: 6 }}>{effectiveOutput.description}</p></>}
                  {effectiveOutput.acceptance_criteria && <><strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C', display: 'block', marginTop: 10 }}>Acceptance Criteria</strong><pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', marginTop: 6, fontSize: 12 }}>{effectiveOutput.acceptance_criteria}</pre></>}
                  {wasEdited && <div style={{ marginTop: 8, fontSize: 11, color: '#6B778C' }}>✏ Edited — your changes preserved on Apply</div>}
                </div>
                <div className="sdm-ai-actions-row">
                  <button className="sdm-ai-action-btn sdm-ai-action-btn--regen" onClick={handleGenerate}><RotateCcw size={11} style={{ marginRight: 4 }} /> Regenerate</button>
                  {effectiveOutput.description && <button className="sdm-ai-action-btn sdm-ai-action-btn--apply" onClick={() => { onApplyDescription(effectiveOutput.description, currentDescription); setOpen(false); }}>← Apply to Description</button>}
                  {effectiveOutput.acceptance_criteria && <button className="sdm-ai-action-btn sdm-ai-action-btn--apply" onClick={() => { onApplyAcceptanceCriteria(effectiveOutput.acceptance_criteria, currentAcceptanceCriteria); setOpen(false); }}>← Apply to AC</button>}
                  {effectiveOutput.description && effectiveOutput.acceptance_criteria && <button className="sdm-ai-action-btn sdm-ai-action-btn--apply-both" onClick={() => { onApplyDescription(effectiveOutput.description, currentDescription); onApplyAcceptanceCriteria(effectiveOutput.acceptance_criteria, currentAcceptanceCriteria); setOpen(false); }}>← Apply Both</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════
   PROPS & LAYOUT HELPERS
   ═══════════════════════════════════════════════ */

interface StoryDetailModalProps {
  isOpen: boolean; onClose: () => void; itemId: string;
  projectId: string; projectKey: string; onOpenItem?: (itemId: string) => void;
}

type ActivityTab = 'comments' | 'history';

const menuItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 14px',
  background: 'none', border: 'none', fontSize: 13, color: '#344054', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  textAlign: 'left',
};

const detailLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#98A2B3', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.04em',
};
const detailValue: React.CSSProperties = {
  fontSize: 13, color: '#101828', padding: '6px 0',
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div style={detailLabel}>{label}</div>
      <div style={detailValue}>{children}</div>
    </>
  );
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
  const descriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (issue) {
      setLocalStatus(issue.status);
      setLocalPriority(issue.priority ?? 'Medium');
      setAcceptanceCriteria(issue.acceptance_criteria ?? '');
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
     RENDER
     ═════════════════════════════════════════════ */

  return (
    <>
      {/* OVERLAY */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', animation: 'sdm-overlay-in 200ms ease-out' }} onClick={onClose}>
        <div data-sdm-scope style={{ width: 1100, maxWidth: '95vw', maxHeight: 'calc(100vh - 96px)', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E4E7EC', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'sdm-card-in 250ms ease-out' }} onClick={e => e.stopPropagation()}>

          {/* ── A. TOP BAR ─────────────────────── */}
          <div style={{ height: 44, minHeight: 44, background: '#F8FAFC', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              {issue?.parent_key ? (
                <><IssueIcon type="Epic" size={14} /><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#475467' }}>{issue.parent_key}</span><span style={{ color: '#CBD5E1', fontSize: 11 }}>/</span></>
              ) : (
                <><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#98A2B3' }}>{issue?.project_key ?? projectKey}</span><span style={{ color: '#CBD5E1', fontSize: 11 }}>/</span></>
              )}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#475467', background: '#EEF2F7', padding: '2px 6px', borderRadius: 3 }}>{issue?.issue_key ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={handleShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', fontSize: 11, fontWeight: 500, color: '#475467', cursor: 'pointer' }}><Share2 size={13} /> Share</button>
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
                  <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} /><div style={{ height: 20 }} /><Skel w="100%" h={200} />
                </div>
              ) : (
                <>
                  {/* 1. ISSUE KEY ROW */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <IssueIcon type={issue?.issue_type ?? 'Story'} size={14} />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: '#98A2B3', letterSpacing: '0.02em' }}>{issue?.issue_key} · {issue?.issue_type ?? 'Story'}</span>
                  </div>

                  {/* 2. TITLE */}
                  <h1 contentEditable suppressContentEditableWarning
                    onBlur={e => { const newTitle = e.currentTarget.textContent?.trim() ?? ''; if (newTitle && newTitle !== issue?.summary) { updateFieldMutation.mutate({ field: 'summary', value: newTitle, oldValue: issue?.summary ?? '' }); } }}
                    style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#101828', lineHeight: 1.3, letterSpacing: '-0.01em', margin: '0 0 4px', outline: 'none', cursor: 'text', borderRadius: 4 }}
                  >{issue?.summary ?? '—'}</h1>

                  {/* 3. TITLE TOOLBAR */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', fontSize: 12, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}><Plus size={13} /> Add</button>
                      {showAddMenu && (
                        <div style={{ position: 'absolute', left: 0, top: 34, background: '#FFF', border: '1px solid #E4E7EC', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 0', zIndex: 50, minWidth: 200 }}>
                          <button onClick={() => { setShowAddMenu(false); toast('Create Subtask — use Child Issues section below'); }} style={menuItem}>Create Subtask</button>
                          <button onClick={() => { setShowAddMenu(false); fileInputRef.current?.click(); }} style={menuItem}>Add Attachment</button>
                          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachmentMutation.mutate(f); e.target.value = ''; }} />
                          <button onClick={() => { setShowAddMenu(false); setShowFigmaInput(true); }} style={menuItem}>Add Design (Figma)</button>
                        </div>
                      )}
                    </div>
                    <AIImprovePanel storyId={itemId} issueKey={issue?.issue_key ?? ''} currentDescription={issue?.description_text ?? ''} currentAcceptanceCriteria={acceptanceCriteria} onApplyDescription={handleApplyDescription} onApplyAcceptanceCriteria={handleApplyAC} />
                    <button onClick={handleShare} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E4E7EC', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#98A2B3' }}><Share2 size={13} /></button>
                  </div>

                  {/* 4. FIGMA URL INPUT ROW */}
                  {showFigmaInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E4E7EC' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#475467', whiteSpace: 'nowrap' }}>Figma URL</span>
                      <input value={figmaUrl} onChange={e => { setFigmaUrl(e.target.value); setFigmaError(''); }} placeholder="https://figma.com/..." style={{ flex: 1, height: 32, borderRadius: 4, border: figmaError ? '1px solid #DC2626' : '1px solid #E4E7EC', padding: '0 8px', fontSize: 12, outline: 'none' }} />
                      <button onClick={saveFigmaLink} style={{ padding: '5px 12px', borderRadius: 6, background: '#2563EB', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                      <button onClick={() => { setShowFigmaInput(false); setFigmaUrl(''); setFigmaError(''); }} style={{ padding: '5px 12px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 12, cursor: 'pointer', color: '#475467' }}>Cancel</button>
                      {figmaError && <span style={{ fontSize: 11, color: '#DC2626' }}>{figmaError}</span>}
                    </div>
                  )}

                  {/* 5. KEY DETAILS: Description */}
                  <div style={{ marginBottom: 20 }}>
                    <button onClick={() => setKeyDetailsOpen(!keyDetailsOpen)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
                      {keyDetailsOpen ? <ChevronDown size={14} color="#475467" /> : <ChevronRight size={14} color="#475467" />}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#475467' }}>Key Details</span>
                    </button>
                    {keyDetailsOpen && (
                      <div>
                        <div style={{ border: '1px solid #E4E7EC', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderBottom: '1px solid #E4E7EC', background: '#F7F8FA', flexWrap: 'wrap' }}>
                            {[
                              { cmd: 'bold', label: 'B', fw: 'bold', fs: 'normal', td: 'none' },
                              { cmd: 'italic', label: 'I', fw: 'normal', fs: 'italic', td: 'none' },
                              { cmd: 'underline', label: 'U', fw: 'normal', fs: 'normal', td: 'underline' },
                              { cmd: 'strikeThrough', label: 'S', fw: 'normal', fs: 'normal', td: 'line-through' },
                            ].map(btn => (
                              <button key={btn.cmd} onMouseDown={(e) => { e.preventDefault(); document.execCommand(btn.cmd); }}
                                style={{ width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#475467', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: btn.fw as any, fontStyle: btn.fs as any, textDecoration: btn.td }}>{btn.label}</button>
                            ))}
                            <div style={{ width: 1, height: 16, background: '#E4E7EC', margin: '0 4px' }} />
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertUnorderedList'); }} style={{ width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#475467', background: 'transparent', border: 'none', cursor: 'pointer' }}>•</button>
                            <button onMouseDown={(e) => { e.preventDefault(); document.execCommand('insertOrderedList'); }} style={{ width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#475467', background: 'transparent', border: 'none', cursor: 'pointer' }}>1.</button>
                          </div>
                          <div ref={descriptionRef} contentEditable suppressContentEditableWarning
                            onBlur={(e) => { const newText = e.currentTarget.innerText; if (newText !== (issue?.description_text ?? '')) { updateFieldMutation.mutate({ field: 'description_text', value: newText, oldValue: issue?.description_text ?? '' }); } }}
                            data-placeholder="Add a description..."
                            style={{ minHeight: 120, maxHeight: 260, overflowY: 'auto', padding: 12, fontSize: 13, color: '#101828', lineHeight: 1.6, outline: 'none', fontFamily: 'Inter, sans-serif' }}
                            dangerouslySetInnerHTML={{ __html: issue?.description_text ?? '' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: '1px solid #F7F8FA' }}>
                            <span style={{ fontSize: 10.5, color: '#98A2B3' }}>Tip: <kbd style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, background: '#F1F5F9', border: '1px solid #E4E7EC', borderRadius: 3, padding: '1px 4px' }}>Ctrl+B</kbd> bold</span>
                            <span style={{ fontSize: 10.5, color: '#98A2B3' }}>Auto-saved</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. ACCEPTANCE CRITERIA */}
                  <div className="sdm-ac-section">
                    <div className="sdm-ac-header"><span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: '#475467' }}>Acceptance Criteria</span></div>
                    <div className="sdm-ac-body" contentEditable suppressContentEditableWarning
                      onBlur={e => { const newAC = e.currentTarget.innerText.trim(); if (newAC !== acceptanceCriteria) { setAcceptanceCriteria(newAC); supabase.from('ph_issues').update({ acceptance_criteria: newAC }).eq('id', itemId).then(() => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); }); } }}>
                      {acceptanceCriteria || <span className="sdm-ac-empty">No acceptance criteria defined · Add manually or use AI →</span>}
                    </div>
                  </div>

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

                  {/* 8. DIVIDER */}
                  <div style={{ height: 1, background: '#F7F8FA', margin: '20px 0' }} />

                  {/* 9. ACTIVITY SECTION */}
                  <div>
                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 12 }}>Activity</div>
                    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E4E7EC', marginBottom: 16 }}>
                      {(['comments', 'history'] as ActivityTab[]).map(tab => {
                        const isActive = activeActivityTab === tab;
                        return (
                          <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                            padding: '6px 12px', fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                            color: isActive ? '#0052CC' : '#98A2B3', background: 'none', border: 'none',
                            borderBottom: isActive ? '2.5px solid #0052CC' : '2.5px solid transparent',
                            cursor: 'pointer', marginBottom: -1, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            {tab === 'comments' ? <><MessageSquare size={12} />Comments</> : <><Clock size={12} />History</>}
                          </button>
                        );
                      })}
                    </div>
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
                                  <button onClick={() => deleteCommentMutation.mutate(c.id)} style={{ fontSize: 11, color: '#98A2B3', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{getInitials(currentProfile?.full_name)}</div>
                          <div style={{ flex: 1 }}>
                            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={handleCommentKeyDown} placeholder="Add a comment…" style={{ width: '100%', minHeight: 40, borderRadius: 8, border: '1px solid #E4E7EC', padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                            <div style={{ fontSize: 10, color: '#C9CDD4', marginTop: 4 }}>
                              <kbd style={{ padding: '1px 4px', borderRadius: 3, background: '#F1F5F9', border: '1px solid #E4E7EC', fontSize: 9 }}>Ctrl+Enter</kbd> to submit
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeActivityTab === 'history' && (
                      <div>
                        {activityLog.length === 0 && <div style={{ padding: '20px 0', color: '#98A2B3', fontSize: 13, textAlign: 'center' }}>No activity recorded</div>}
                        {activityLog.map(entry => (
                          <div key={entry.id} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9CDD4', flexShrink: 0, marginTop: 6 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, color: '#344054', lineHeight: 1.5 }}>
                                <span style={{ fontWeight: 650 }}>{entry.actor?.full_name ?? 'System'}</span>
                                {' changed '}<span style={{ fontWeight: 500 }}>{entry.field_name ?? entry.action}</span>
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
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E4E7EC' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#98A2B3', marginBottom: 8 }}>STATUS</div>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} style={{
                    backgroundColor: statusStyle.bg, color: statusStyle.text, padding: '6px 12px', borderRadius: 4, fontSize: 11.5, fontWeight: 700,
                    letterSpacing: '0.05em', textTransform: 'uppercase' as const, border: 'none', cursor: 'pointer', display: 'inline-flex',
                    alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: 1, lineHeight: 1,
                  }}>
                    {localStatus || 'Backlog'}
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                              <button key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); updateStatusMutation.mutate(st); }} style={{
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
                <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 0 }}>
                  <DetailRow label="Parent">
                    {issue && <ParentFieldPicker storyKey={issue.issue_key} parentKey={issue.parent_key} projectKey={issue.project_key} onParentChange={handleParentChange} />}
                  </DetailRow>

                  <DetailRow label="Assignee">
                    {issue && (
                      <EditableAssignee issueId={issue.id} projectId={projectId} currentAssigneeId={issue.assignee_account_id} currentAssigneeName={issue.assignee_display_name}
                        onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />
                    )}
                    <button onClick={assignToMe} style={{ fontSize: 11, color: '#0052CC', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Assign to me</button>
                  </DetailRow>

                  <DetailRow label="Reporter">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {issue?.reporter_display_name ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: getAvatarColor(issue.reporter_account_id ?? issue.reporter_display_name), color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{getInitials(issue.reporter_display_name)}</span>
                          <span style={{ fontSize: 12, color: '#101828' }}>{issue.reporter_display_name}</span>
                        </span>
                      ) : <span style={{ color: '#98A2B3', fontSize: 12 }}>—</span>}
                    </div>
                    <span style={{ fontSize: 10, color: '#98A2B3' }}>(read-only)</span>
                  </DetailRow>

                  <DetailRow label="Priority">
                    {issue && <EditablePriority issueId={issue.id} currentPriority={localPriority} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                  </DetailRow>

                  <DetailRow label="Labels">
                    {issue && <EditableLabels issueId={issue.id} currentLabels={labelsArray} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                  </DetailRow>

                  <DetailRow label="Fix Version">
                    {fixVersionNames.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {fixVersionNames.map((v: string, i: number) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: '#F1F5F9', color: '#475569' }}>{v}</span>
                        ))}
                      </div>
                    ) : <span style={{ color: '#98A2B3', fontSize: 12 }}>—</span>}
                  </DetailRow>
                </div>
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

      {/* ── MODALS ────────────────────────── */}
      {showConfirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,30,66,0.4)' }}>
          <div style={{ background: '#FFF', borderRadius: 12, padding: 28, width: 400, maxWidth: '95vw', animation: 'sdm-confirm-in 200ms ease-out' }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 8 }}>Delete {issue?.issue_key}?</h3>
            <p style={{ fontSize: 13, color: '#475467', lineHeight: 1.6, marginBottom: 20 }}>This ticket will be soft-deleted. It can be restored from the admin panel within 30 days.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 6, background: '#FFF', border: '1px solid #E4E7EC', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#475467' }}>Cancel</button>
              <button onClick={() => { setShowConfirmDelete(false); deleteIssueMutation.mutate(); }} style={{ padding: '7px 16px', borderRadius: 6, background: '#DC2626', color: '#FFF', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

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
            </div>
            <div style={{ padding: '8px 20px', fontSize: 11, color: '#98A2B3', borderBottom: '1px solid #E4E7EC' }}>Transitions are open — any status can move to any.</div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, textAlign: 'center', color: '#98A2B3', fontSize: 13 }}>
              Workflow visualization — coming soon
            </div>
          </div>
        </div>
      )}
    </>
  );
}
