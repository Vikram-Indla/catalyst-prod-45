// @ts-nocheck
/**
 * DemandFulfilmentGadget — Replaces the legacy "Key Milestones" gadget.
 *
 * Shows MDT (demand) tickets that have at least one linked epic, and rolls up
 * Story + Defect completion under each MDT via the two-hop chain:
 *   MDT (ph_initiatives) → Epics (es_initiative_epics) → Stories/Bugs (ph_issues.parent_key)
 *
 * Spec: Apr 23 2026 — Demand Fulfilment gadget (replaces Key Milestones)
 *
 * Schema notes (verified against live DB Apr 23 2026):
 *   - MDT/initiative status enum: new_demand | in_progress | on_hold | closed
 *     ("in_progress" = Under Implementation, "closed" = Delivered)
 *   - Per spec clarification: DO NOT filter on mdt.status — show every MDT
 *     that has ≥1 linked epic.
 *   - Epic↔MDT linkage: es_initiative_epics(initiative_id, epic_id)
 *   - Story↔Epic linkage: ph_issues.parent_key → epic ph_issues.issue_key
 *   - Story status uses ph_issues.status_category ('Done' / 'In Progress' /
 *     'To Do'), with 'Blocked' carved out from In Progress by status name.
 *
 * Chrome reuses WidgetWrapper (same shell as every other dashboard gadget).
 */
import { useState, useMemo, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';

import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import EmptyState from '@atlaskit/empty-state';

import { RadioGroup } from '@atlaskit/radio';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import SectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import Tooltip from '@atlaskit/tooltip';
import Badge from '@atlaskit/badge';
import Link from '@atlaskit/link';
import AkButton, { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/core/settings';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import ShortcutIcon from '@atlaskit/icon/core/shortcut';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import InformationIcon from '@atlaskit/icon/core/information';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import CrossIcon from '@atlaskit/icon/utility/cross';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO, eachDayOfInterval, getDay } from 'date-fns';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ads';
import WidgetWrapper from '../WidgetWrapper';
import type { WidgetProps } from '../widget-registry';

// ─────────────────────────────────────────────────────────────────────────────
// Settings types & defaults
// ─────────────────────────────────────────────────────────────────────────────

type ScopeType = 'quarter' | 'custom' | 'all';

interface GadgetSettings {
  scope_type: ScopeType;
  quarter: string;
  date_from: string | null;
  date_to: string | null;
  rag_threshold: number;
  include_stories: boolean;
  include_defects: boolean;
  status_filter: string[];
}

const currentQuarter = (): string => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q}-${now.getFullYear()}`;
};

const DEFAULT_SETTINGS: GadgetSettings = {
  scope_type: 'quarter',
  quarter: currentQuarter(),
  date_from: null,
  date_to: null,
  rag_threshold: 7,
  include_stories: true,
  include_defects: true,
  status_filter: [],
};

const QUARTER_OPTIONS = [
  { label: 'Q1 2026 · Jan–Mar', value: 'Q1-2026' },
  { label: 'Q2 2026 · Apr–Jun', value: 'Q2-2026' },
  { label: 'Q3 2026 · Jul–Sep', value: 'Q3-2026' },
  { label: 'Q4 2026 · Oct–Dec', value: 'Q4-2026' },
];

const THRESHOLD_OPTIONS = [
  { label: '3 days', value: 3 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

const quarterRange = (q: string): { start: string; end: string; label: string } => {
  const [qPart, yPart] = q.split('-');
  const year = parseInt(yPart, 10);
  const idx = parseInt(qPart.replace('Q', ''), 10);
  const startMonth = (idx - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = `${months[startMonth]}–${months[startMonth + 2]}`;
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label,
  };
};

// Working-day diff (Saudi week: Sun–Thu, exclude Fri/Sat).
const workingDaysBetween = (target: Date, today: Date): number => {
  const direction = target >= today ? 1 : -1;
  const [from, to] = direction === 1 ? [today, target] : [target, today];
  const all = eachDayOfInterval({ start: from, end: to });
  // Exclude both endpoints' double-counting + weekends (Fri=5, Sat=6).
  const working = all.filter((d) => {
    const wd = getDay(d);
    return wd !== 5 && wd !== 6;
  });
  // Subtract 1 because eachDayOfInterval is inclusive on both ends.
  const count = Math.max(0, working.length - 1);
  return direction * count;
};

type RagState = 'overdue' | 'risk' | 'ontrack' | 'none';

const ragColors: Record<RagState, { dot: string; bg: string; fg: string; border: string; bar: string }> = {
  overdue: { dot: '#FF5630', bg: '#FFECEB', fg: '#AE2A19', border: '#FFB8AC', bar: '#FF5630' },
  risk:    { dot: '#FFAB00', bg: '#FFF7D6', fg: '#7F5F01', border: '#F5CD47', bar: '#FFAB00' },
  ontrack: { dot: '#36B37E', bg: '#DCFFF1', fg: '#216E4E', border: '#4BCE97', bar: '#36B37E' },
  none:    { dot: '#97A0AF', bg: '#F4F5F7', fg: '#6B778C', border: '#DFE1E6', bar: '#97A0AF' },
};

const computeRag = (targetDate: string | null, threshold: number): { state: RagState; daysLeft: number | null } => {
  if (!targetDate) return { state: 'none', daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseISO(targetDate);
  const days = workingDaysBetween(target, today);
  if (days < 0) return { state: 'overdue', daysLeft: days };
  if (days <= threshold) return { state: 'risk', daysLeft: days };
  return { state: 'ontrack', daysLeft: days };
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings persistence
// ─────────────────────────────────────────────────────────────────────────────

const GADGET_KEY = 'demand_fulfilment';

function useGadgetSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['gadget-settings', GADGET_KEY, user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_SETTINGS;
      const { data } = await (supabase as any)
        .from('gadget_settings')
        .select('settings')
        .eq('user_id', user.id)
        .eq('gadget_key', GADGET_KEY)
        .maybeSingle();
      return { ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) } as GadgetSettings;
    },
    enabled: !!user,
  });

  const save = useMutation({
    mutationFn: async (next: GadgetSettings) => {
      if (!user) return;
      await (supabase as any)
        .from('gadget_settings')
        .upsert(
          { user_id: user.id, gadget_key: GADGET_KEY, settings: next },
          { onConflict: 'user_id,gadget_key' },
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gadget-settings', GADGET_KEY] });
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    save: save.mutateAsync,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────

interface EpicStoryRow {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  assignee_display_name?: string | null;
  assignee_avatar?: string | null;
}

interface EpicRow {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  total: number;
  done: number;
  blocked: number;
  inprogress: number;
  todo: number;
  stories?: EpicStoryRow[];
  status_category?: string;
}

interface DemandRow {
  id: string;
  initiative_key: string;
  title: string;
  status: string;
  target_complete: string | null;
  target_quarter: string | null;
  assignee_id: string | null;
  assignee_name: string;
  assignee_avatar: string | null;
  total: number;
  done: number;
  blocked: number;
  inprogress: number;
  todo: number;
  epics: EpicRow[];
  isDelivered: boolean;
  deliveredAt: string | null;
  isUnlinkedEpic?: boolean;
}

const BLOCKED_STATUSES = new Set(['On Hold', 'Blocked', 'Awaiting Info']);

const classifyIssue = (issue: any): 'done' | 'blocked' | 'inprogress' | 'todo' | null => {
  const cat = issue.status_category;
  const status = issue.status;
  if (BLOCKED_STATUSES.has(status)) return 'blocked';
  if (cat === 'Done') return 'done';
  if (cat === 'In Progress') return 'inprogress';
  if (cat === 'To Do') return 'todo';
  return null;
};

interface UnlinkedEpicStory {
  issue_key: string;
  summary: string;
  status: string;
  status_category: string;
  assignee_display_name: string | null;
  assignee_avatar?: string | null;
}

interface UnlinkedEpic {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: string | null;
  assignee_id: string | null;
  assignee_name: string;
  assignee_avatar: string | null;
  total: number;
  done: number;
  blocked: number;
  inprogress: number;
  todo: number;
  stories: UnlinkedEpicStory[];
}

function useUnlinkedEpics(projectKey: string, settings: GadgetSettings) {
  return useQuery({
    queryKey: ['demand-fulfilment-unlinked', projectKey, settings.include_stories, settings.include_defects],
    queryFn: async (): Promise<UnlinkedEpic[]> => {
      // Fetch all linked epic ids first
      const { data: links } = await (supabase as any)
        .from('ph_initiative_links')
        .select('issue_id');
      const linkedIds = new Set((links ?? []).map((l: any) => l.issue_id));

      const { data: epics } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, assignee_user_id, assignee_display_name')
        .eq('issue_type', 'Epic')
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .not('status_category', 'eq', 'Done')
        .limit(500);

      const unlinked = (epics ?? []).filter((e: any) => !linkedIds.has(e.id));
      if (unlinked.length === 0) return [];

      // Fetch child stories/bugs for these epics to compute roll-up counts.
      const childTypes: string[] = [];
      if (settings.include_stories) childTypes.push('Story');
      if (settings.include_defects) childTypes.push('Bug', 'Defect');
      if (childTypes.length === 0) childTypes.push('Story');

      const epicKeys = unlinked.map((e: any) => e.issue_key);
      const { data: children } = await (supabase as any)
        .from('ph_issues')
        .select('parent_key, issue_key, summary, status, status_category, assignee_user_id, assignee_display_name, jira_removed_at')
        .in('parent_key', epicKeys)
        .in('issue_type', childTypes)
        .is('jira_removed_at', null)
        .limit(5000);

      // Fetch assignee avatars for both epics + child stories.
      const assigneeIds = Array.from(
        new Set([
          ...unlinked.map((e: any) => e.assignee_user_id).filter(Boolean),
          ...((children ?? []).map((c: any) => c.assignee_user_id).filter(Boolean)),
        ]),
      );
      let profiles: Record<string, any> = {};
      if (assigneeIds.length > 0) {
        const { data: pr } = await (supabase as any)
          .from('profiles')
          .select('id, display_name, full_name, avatar_url')
          .in('id', assigneeIds);
        profiles = Object.fromEntries((pr ?? []).map((p: any) => [p.id, p]));
      }

      const bucketByEpic = new Map<string, { total: number; done: number; blocked: number; inprogress: number; todo: number }>();
      const storyRowsByEpic = new Map<string, UnlinkedEpicStory[]>();
      epicKeys.forEach((k) => {
        bucketByEpic.set(k, { total: 0, done: 0, blocked: 0, inprogress: 0, todo: 0 });
        storyRowsByEpic.set(k, []);
      });
      (children ?? []).forEach((c: any) => {
        const b = bucketByEpic.get(c.parent_key);
        if (!b) return;
        const cls = classifyIssue(c);
        b.total += 1;
        if (cls) (b as any)[cls] += 1;
        const list = storyRowsByEpic.get(c.parent_key) ?? [];
        const childProfile = c.assignee_user_id ? profiles[c.assignee_user_id] : null;
        list.push({
          issue_key: c.issue_key,
          summary: c.summary ?? '',
          status: c.status,
          status_category: c.status_category,
          assignee_display_name:
            childProfile?.display_name ?? childProfile?.full_name ?? c.assignee_display_name ?? null,
          assignee_avatar: childProfile?.avatar_url ?? null,
        });
        storyRowsByEpic.set(c.parent_key, list);
      });

      return unlinked.map((e: any) => {
        const b = bucketByEpic.get(e.issue_key) ?? { total: 0, done: 0, blocked: 0, inprogress: 0, todo: 0 };
        const profile = e.assignee_user_id ? profiles[e.assignee_user_id] : null;
        return {
          id: e.id,
          issue_key: e.issue_key,
          summary: e.summary ?? '',
          status: e.status,
          status_category: e.status_category,
          assignee_id: e.assignee_user_id ?? null,
          assignee_name: profile?.display_name ?? profile?.full_name ?? e.assignee_display_name ?? '—',
          assignee_avatar: profile?.avatar_url ?? null,
          ...b,
          stories: storyRowsByEpic.get(e.issue_key) ?? [],
        };
      });
    },
    enabled: !!projectKey,
  });
}

function useDemandData(projectKey: string, settings: GadgetSettings) {
  return useQuery({
    queryKey: ['demand-fulfilment', projectKey, settings],
    queryFn: async (): Promise<DemandRow[]> => {
      // 1) Fetch epic↔initiative links (ph_initiative_links).
      const { data: links } = await (supabase as any)
        .from('ph_initiative_links')
        .select('initiative_id, issue_id');

      if (!links || links.length === 0) return [];

      const initiativeIds = Array.from(new Set(links.map((l: any) => l.initiative_id)));
      const epicIds = Array.from(new Set(links.map((l: any) => l.issue_id)));

      // 2) Fetch initiatives (filtered later by scope; do not filter on status).
      const { data: initiatives } = await (supabase as any)
        .from('ph_initiatives')
        .select('id, initiative_key, title, status, target_complete, target_quarter, assignee_id, updated_at')
        .in('id', initiativeIds)
        .eq('is_deleted', false);

      if (!initiatives || initiatives.length === 0) return [];

      // 3) Fetch epics (need issue_key for child lookup, summary, status).
      const { data: epics } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, summary, status, project_key')
        .in('id', epicIds)
        .eq('issue_type', 'Epic')
        .eq('project_key', projectKey)
        .is('jira_removed_at', null);

      const epicByKey = new Map<string, any>();
      const epicByIdToKey = new Map<string, string>();
      (epics ?? []).forEach((e: any) => {
        epicByKey.set(e.issue_key, e);
        epicByIdToKey.set(e.id, e.issue_key);
      });

      const epicKeys = Array.from(epicByKey.keys());
      if (epicKeys.length === 0) return [];

      // 4) Story/Defect children — filter by include_stories/include_defects.
      const childTypes: string[] = [];
      if (settings.include_stories) childTypes.push('Story');
      if (settings.include_defects) childTypes.push('Bug', 'Defect');
      if (childTypes.length === 0) childTypes.push('Story');
      let children: any[] = [];
      if (childTypes.length > 0) {
        const { data } = await (supabase as any)
          .from('ph_issues')
          .select('issue_key, parent_key, summary, status, status_category, assignee_user_id, assignee_display_name')
          .in('parent_key', epicKeys)
          .in('issue_type', childTypes)
          .is('jira_removed_at', null)
          .limit(5000);
        children = data ?? [];
      }

      // 5) Fetch assignee profiles for avatars (initiatives + child stories).
      const assigneeIds = Array.from(
        new Set([
          ...initiatives.map((i: any) => i.assignee_id).filter(Boolean),
          ...children.map((c: any) => c.assignee_user_id).filter(Boolean),
        ]),
      );
      let profiles: Record<string, any> = {};
      if (assigneeIds.length > 0) {
        const { data: pr } = await (supabase as any)
          .from('profiles')
          .select('id, display_name, full_name, avatar_url')
          .in('id', assigneeIds);
        profiles = Object.fromEntries((pr ?? []).map((p: any) => [p.id, p]));
      }

      // 6) Roll up: bucket children per epic, and collect individual story rows.
      const bucketByEpicKey = new Map<string, { done: number; blocked: number; inprogress: number; todo: number; total: number }>();
      const storyListByEpicKey = new Map<string, EpicStoryRow[]>();
      epicKeys.forEach((k) => {
        bucketByEpicKey.set(k, { done: 0, blocked: 0, inprogress: 0, todo: 0, total: 0 });
        storyListByEpicKey.set(k, []);
      });
      children.forEach((c: any) => {
        const bucket = bucketByEpicKey.get(c.parent_key);
        if (!bucket) return;
        const cls = classifyIssue(c);
        bucket.total += 1;
        if (cls) (bucket as any)[cls] += 1;
        const list = storyListByEpicKey.get(c.parent_key) ?? [];
        const childProfile = c.assignee_user_id ? profiles[c.assignee_user_id] : null;
        list.push({
          issue_key: c.issue_key,
          summary: c.summary ?? '',
          status: c.status,
          status_category: c.status_category,
          assignee_display_name:
            childProfile?.display_name ?? childProfile?.full_name ?? c.assignee_display_name ?? null,
          assignee_avatar: childProfile?.avatar_url ?? null,
        });
        storyListByEpicKey.set(c.parent_key, list);
      });

      // Group epics under their MDT.
      const epicsByInitiative = new Map<string, EpicRow[]>();
      links.forEach((l: any) => {
        const epicKey = epicByIdToKey.get(l.issue_id);
        if (!epicKey) return;
        const epic = epicByKey.get(epicKey);
        if (!epic) return;
        const b = bucketByEpicKey.get(epicKey)!;
        const arr = epicsByInitiative.get(l.initiative_id) ?? [];
        arr.push({
          id: epic.id,
          issue_key: epic.issue_key,
          summary: epic.summary ?? '',
          status: epic.status,
          ...b,
          stories: storyListByEpicKey.get(epicKey) ?? [],
        });
        epicsByInitiative.set(l.initiative_id, arr);
      });

      // 7) Build demand rows; only include MDTs that actually have ≥1 epic in this project.
      const rows: DemandRow[] = initiatives
        .filter((i: any) => (epicsByInitiative.get(i.id) ?? []).length > 0)
        .map((i: any) => {
          const epicRows = epicsByInitiative.get(i.id) ?? [];
          const totals = epicRows.reduce(
            (acc, e) => {
              acc.total += e.total;
              acc.done += e.done;
              acc.blocked += e.blocked;
              acc.inprogress += e.inprogress;
              acc.todo += e.todo;
              return acc;
            },
            { total: 0, done: 0, blocked: 0, inprogress: 0, todo: 0 },
          );
          const profile = i.assignee_id ? profiles[i.assignee_id] : null;
          return {
            id: i.id,
            initiative_key: i.initiative_key,
            title: i.title,
            status: i.status,
            target_complete: i.target_complete,
            target_quarter: i.target_quarter,
            assignee_id: i.assignee_id,
            assignee_name: profile?.display_name ?? profile?.full_name ?? '—',
            assignee_avatar: profile?.avatar_url ?? null,
            ...totals,
            epics: epicRows,
            isDelivered: i.status === 'closed',
            deliveredAt: i.status === 'closed' ? i.updated_at : null,
          };
        });

      // 8) Apply scope filter.
      const inScope = (r: DemandRow): boolean => {
        if (settings.scope_type === 'all') return true;
        if (settings.scope_type === 'quarter') {
          if (r.target_quarter === settings.quarter) return true;
          if (r.target_complete) {
            const { start, end } = quarterRange(settings.quarter);
            return r.target_complete >= start && r.target_complete <= end;
          }
          return false;
        }
        if (settings.scope_type === 'custom') {
          if (!r.target_complete || !settings.date_from || !settings.date_to) return false;
          return r.target_complete >= settings.date_from && r.target_complete <= settings.date_to;
        }
        return true;
      };

      return rows
        .filter(inScope)
        .sort((a, b) => {
          if (!a.target_complete && !b.target_complete) return 0;
          if (!a.target_complete) return 1;
          if (!b.target_complete) return -1;
          return a.target_complete.localeCompare(b.target_complete);
        });
    },
    enabled: !!projectKey,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

const RagDot = ({ state }: { state: RagState }) => {
  if (state === 'none') {
    // Preserve grid column width when no target date.
    return <span style={{ width: 8, flexShrink: 0 }} />;
  }
  const tooltipContent =
    state === 'overdue' ? 'Overdue' :
    state === 'risk' ? 'At risk' :
    'On track';
  return (
    <Tooltip content={tooltipContent}>
      <span
        tabIndex={0}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: ragColors[state].dot,
          cursor: 'help',
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
    </Tooltip>
  );
};

const DatePill = ({ state, daysLeft, dateStr }: { state: RagState; daysLeft: number | null; dateStr: string | null }) => {
  if (state === 'none' || !dateStr) {
    return (
      <span style={{ fontSize: 11, color: token('color.text.subtlest', '#6B778C') }}>
        No target date
      </span>
    );
  }
  const c = ragColors[state];
  const label =
    state === 'overdue'
      ? `+${Math.abs(daysLeft ?? 0)}d overdue`
      : `${daysLeft}d left`;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 20,
        padding: '0 6px',
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.02,
        whiteSpace: 'nowrap',
      }}
    >
      {state === 'overdue' ? <AlertTriangle size={11} /> : <Calendar size={11} />}
      {label}
    </span>
  );
};

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '—';

// ─────────────────────────────────────────────────────────────────────────────
// Settings popup
// ─────────────────────────────────────────────────────────────────────────────

function SettingsPopupBody({
  initial,
  onApply,
  onCancel,
  projectKey,
}: {
  initial: GadgetSettings;
  onApply: (s: GadgetSettings) => void;
  onCancel: () => void;
  projectKey: string;
}) {
  const [draft, setDraft] = useState<GadgetSettings>(initial);

  const { data: statusOptions = [] } = useQuery<Array<{ label: string; options: Array<{ label: string; value: string }> }>>({
    queryKey: ['demand-fulfilment-distinct-statuses', projectKey],
    queryFn: async () => {
      // Fetch all distinct status + status_category combos for the project
      // (across every issue type — Epic, Story, Bug, Defect, Sub-task, etc.).
      const { data } = await (supabase as any)
        .from('ph_issues')
        .select('status, status_category')
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .not('status', 'is', null)
        .limit(10000);

      if (!data) return [];

      const categoryMap = new Map<string, Set<string>>();
      (data as any[]).forEach((row) => {
        const cat = row.status_category ?? 'Other';
        const set = categoryMap.get(cat) ?? new Set<string>();
        if (row.status) set.add(row.status);
        categoryMap.set(cat, set);
      });

      const categoryOrder = ['To Do', 'In Progress', 'Done', 'Other'];
      const sortedCategories = [...categoryMap.keys()].sort((a, b) => {
        const ia = categoryOrder.indexOf(a);
        const ib = categoryOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      return sortedCategories.map((cat) => ({
        label: cat,
        options: [...(categoryMap.get(cat) ?? [])].sort().map((s) => ({
          label: s,
          value: s,
        })),
      }));
    },
    enabled: !!projectKey,
  });

  const today = new Date().toISOString().split('T')[0];
  const oneMonthAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const sectionHeadingStyle = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: token('color.text.subtlest', '#626F86'),
    marginBottom: 6,
  };
  const subLabelStyle = {
    fontSize: 11,
    lineHeight: '16px',
    fontWeight: 400,
    color: token('color.text.subtle', '#6B778C'),
    marginBottom: 2,
  };

  return (
    <div style={{ width: 300, padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ font: token('font.heading.small'), color: token('color.text', '#172B4D') }}>
          Gadget Settings
        </span>
        <IconButton
          icon={CrossIcon}
          label="Close settings"
          appearance="subtle"
          spacing="compact"
          onClick={onCancel}
        />
      </div>

      {/* Time scope */}
      <div style={sectionHeadingStyle}>
        Time scope
      </div>
      <RadioGroup
        name="scope_type"
        value={draft.scope_type}
        onChange={(e: any) => {
          const newScope = e.currentTarget.value as ScopeType;
          setDraft((prev) => ({
            ...prev,
            scope_type: newScope,
            date_from: newScope === 'custom' && !prev.date_from ? today : prev.date_from,
            date_to: newScope === 'custom' && !prev.date_to ? oneMonthAhead : prev.date_to,
          }));
        }}
        options={[
          { name: 'scope_type', value: 'quarter', label: 'This Quarter' },
          { name: 'scope_type', value: 'custom', label: 'Custom timeline' },
          { name: 'scope_type', value: 'all', label: 'All active demands' },
        ]}
      />

      {/* Sub-controls */}
      {draft.scope_type === 'quarter' && (
        <div style={{ marginTop: 8 }}>
          <Select
            spacing="compact"
            options={QUARTER_OPTIONS}
            value={QUARTER_OPTIONS.find((o) => o.value === draft.quarter)}
            onChange={(opt: any) => setDraft({ ...draft, quarter: opt.value })}
          />
        </div>
      )}
      {draft.scope_type === 'custom' && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={subLabelStyle}>From</div>
            <DatePicker
              locale="en-GB"
              value={draft.date_from ?? today}
              onChange={(v: string) => setDraft({ ...draft, date_from: v || null })}
            />
          </div>
          <div>
            <div style={subLabelStyle}>To</div>
            <DatePicker
              locale="en-GB"
              value={draft.date_to ?? oneMonthAhead}
              minDate={draft.date_from ?? undefined}
              onChange={(v: string) => setDraft({ ...draft, date_to: v || null })}
            />
          </div>
        </div>
      )}

      <hr style={{ margin: '14px 0 10px', border: 0, borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }} />

      {/* Threshold */}
      <div style={sectionHeadingStyle}>
        At-risk threshold
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: token('color.text', '#172B4D') }}>
        <span>Mark as At Risk when</span>
        <div style={{ width: 100 }}>
          <Select
            spacing="compact"
            options={THRESHOLD_OPTIONS}
            value={THRESHOLD_OPTIONS.find((o) => o.value === Number(draft.rag_threshold))}
            onChange={(opt: any) => setDraft({ ...draft, rag_threshold: Number(opt.value) })}
          />
        </div>
        <span>or fewer days remain</span>
      </div>

      <hr style={{ margin: '14px 0 10px', border: 0, borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }} />

      {/* Item types */}
      <div style={sectionHeadingStyle}>
        Count toward completion
      </div>
      <Checkbox
        isChecked={draft.include_stories}
        onChange={(e: any) => setDraft({ ...draft, include_stories: e.target.checked })}
        label="Stories"
      />
      <Checkbox
        isChecked={draft.include_defects}
        onChange={(e: any) => setDraft({ ...draft, include_defects: e.target.checked })}
        label="Defects / Bugs"
      />

      <hr style={{ margin: '14px 0 10px', border: 0, borderTop: `1px solid ${token('color.border', '#DCDFE4')}` }} />

      {/* Filter by status — grouped by status_category */}
      <div style={sectionHeadingStyle}>Filter by status</div>
      <Select
        isMulti
        isClearable
        spacing="compact"
        placeholder="All statuses (no filter)"
        options={statusOptions}
        value={(draft.status_filter ?? []).map((v: string) => ({ label: v, value: v }))}
        onChange={(selected: any) =>
          setDraft({
            ...draft,
            status_filter: Array.isArray(selected) ? selected.map((o: any) => o.value) : [],
          })
        }
        formatGroupLabel={(group: any) => (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: token('color.text.subtlest', '#626F86'),
              fontFamily: ATLAS_SANS,
            }}
          >
            {group.label}
          </span>
        )}
      />
      <div
        style={{
          fontSize: 11,
          color: token('color.text.subtlest', '#626F86'),
          marginTop: 4,
          fontFamily: ATLAS_SANS,
        }}
      >
        Leave empty to show all statuses
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 14 }}>
        <Button appearance="subtle" spacing="compact" onClick={onCancel}>
          Cancel
        </Button>
        <Button appearance="primary" spacing="compact" onClick={() => onApply(draft)}>
          Apply
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Demand row
// ─────────────────────────────────────────────────────────────────────────────

const ATLAS_SANS =
  '"Atlassian Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Map a Jira status_category (+ optional status name for blocked carve-out)
 * to an ADS Lozenge appearance. Never hardcode colors for status labels —
 * always use the Lozenge component with one of these appearances.
 */
const lozengeAppearance = (
  statusCategory?: string | null,
  status?: string | null,
): 'default' | 'success' | 'removed' | 'inprogress' | 'moved' | 'new' => {
  if (status && ['on hold', 'blocked', 'awaiting info'].includes(status.toLowerCase())) {
    return 'moved';
  }
  if (!statusCategory) return 'default';
  const cat = statusCategory.toLowerCase();
  if (cat === 'done') return 'success';
  if (cat === 'in progress') return 'inprogress';
  if (cat === 'to do') return 'default';
  return 'default';
};

function DemandRowItem({
  row,
  threshold,
  expanded,
  onToggle,
  projectKey,
  isUnlinkedEpic,
}: {
  row: DemandRow;
  threshold: number;
  expanded: boolean;
  onToggle: () => void;
  projectKey: string;
  isUnlinkedEpic?: boolean;
}) {
  const { state, daysLeft } = computeRag(row.target_complete, threshold);
  const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
  const detailUrl = `/project-hub/${projectKey}/hierarchy/allwork?selectedIssue=${row.initiative_key}`;

  // Track which linked epics are expanded (Mode 1 only).
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const toggleEpic = (id: string) =>
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div style={{ borderBottom: `1px solid ${token('color.border', '#DCDFE4')}` }}>
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '28px 100px 1fr 160px 110px 28px',
          alignItems: 'center',
          gap: 8,
          padding: `0 ${token('space.200', '16px')}`,
          minHeight: 40,
          background: 'transparent',
          transition: 'background 120ms',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Chevron */}
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'transform 150ms',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <ChevronRightIcon label="" color={token('color.icon.subtle', '#626F86')} LEGACY_size="small" />
        </span>

        {/* Key (with leading RAG dot) */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <RagDot state={state} />
          <a
            href={detailUrl}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '16px',
              fontFamily: ATLAS_SANS,
              color: token('color.link', '#0C66E4'),
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.initiative_key}
          </a>
        </span>

        {/* Title */}
        <span
          title={row.title}
          style={{
            fontSize: 13,
            lineHeight: '20px',
            fontWeight: 400,
            fontFamily: ATLAS_SANS,
            color: token('color.text', '#172B4D'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.title}
        </span>

        {/* Progress + stat — inline (bar left, text right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 72,
              height: 6,
              flexShrink: 0,
              borderRadius: 3,
              background: '#DFE1E6',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 3,
                transition: 'width 200ms ease',
                background:
                  pct === 100 ? '#1F845A' : pct > 0 ? '#0C66E4' : 'transparent',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              lineHeight: '16px',
              fontWeight: 400,
              fontFamily: ATLAS_SANS,
              color: pct === 100 ? '#1F845A' : token('color.text.subtle', '#44546F'),
              whiteSpace: 'nowrap',
            }}
          >
            {pct}% · {row.done}/{row.total}
          </span>
        </div>

        {/* Date / RAG pill */}
        <DatePill state={state} daysLeft={daysLeft} dateStr={row.target_complete} />

        {/* Avatar */}
        <Avatar size="xsmall" name={row.assignee_name} src={row.assignee_avatar ?? undefined}>
          {() => (
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: token('color.background.accent.gray.subtle', '#DFE1E6'),
                color: token('color.text.subtle', '#42526E'),
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              {initialsOf(row.assignee_name)}
            </span>
          )}
        </Avatar>
      </div>

      {expanded && (
        <div
          style={{
            background: token('elevation.surface.sunken', '#F7F8F9'),
            borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
            paddingTop: 4,
            paddingBottom: 6,
          }}
        >
          {row.total === 0 ? (
            <div
              style={{
                fontSize: 12,
                lineHeight: '16px',
                fontWeight: 400,
                fontFamily: ATLAS_SANS,
                color: token('color.text.subtle', '#44546F'),
                fontStyle: 'italic',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 16px 6px 28px',
              }}
            >
              <InformationIcon label="" color={token('color.icon.subtle', '#626F86')} LEGACY_size="small" />
              {isUnlinkedEpic
                ? 'No stories under this epic yet.'
                : 'No stories linked. Add stories under the epics in this demand to track progress.'}
            </div>
          ) : isUnlinkedEpic ? (
            // ── MODE 2: Unlinked epic — render its stories directly ──
            row.epics.map((story) => {
              const storyUrl = `/project-hub/${projectKey}/hierarchy/allwork?selectedIssue=${story.issue_key}`;
              return (
                <div
                  key={story.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '20px 90px 1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px 10px 28px',
                    minHeight: 40,
                    borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                    borderLeft: `3px solid ${token('color.border.brand', '#0C66E4')}`,
                  }}
                >
                  <span />
                  <a
                    href={storyUrl}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      lineHeight: '16px',
                      fontFamily: ATLAS_SANS,
                      color: token('color.link', '#0C66E4'),
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {story.issue_key}
                  </a>
                  <span
                    title={story.summary}
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      lineHeight: '20px',
                      fontFamily: ATLAS_SANS,
                      color: token('color.text', '#172B4D'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {story.summary}
                  </span>
                  <Lozenge appearance={lozengeAppearance(story.status_category, story.status)}>
                    {story.status}
                  </Lozenge>
                </div>
              );
            })
          ) : (
            // ── MODE 1: MDT — render epic sub-rows; each can expand to its stories ──
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 16px 8px 28px' }}>
                <Lozenge appearance="default">To Do {row.todo}</Lozenge>
                <Lozenge appearance="inprogress">In Progress {row.inprogress}</Lozenge>
                {row.blocked > 0 && <Lozenge appearance="removed">Blocked {row.blocked}</Lozenge>}
                <Lozenge appearance="success">Done {row.done}</Lozenge>
              </div>

              {row.epics.map((epic) => {
                const epicPct = epic.total > 0 ? Math.round((epic.done / epic.total) * 100) : 0;
                const epicState: RagState =
                  epic.total === 0
                    ? 'none'
                    : epic.done === epic.total
                    ? 'ontrack'
                    : epic.done > 0
                    ? 'risk'
                    : 'overdue';
                const epicUrl = `/project-hub/${projectKey}/hierarchy/allwork?selectedIssue=${epic.issue_key}`;
                const epicExpanded = expandedEpics.has(epic.id);
                const hasStories = (epic.stories?.length ?? 0) > 0;

                return (
                  <div key={epic.id}>
                    <div
                      onClick={() => hasStories && toggleEpic(epic.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 90px 1fr 80px auto',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px 6px 28px',
                        borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                        cursor: hasStories ? 'pointer' : 'default',
                      }}
                    >
                      <span
                        onClick={(e) => { e.stopPropagation(); if (hasStories) toggleEpic(epic.id); }}
                        style={{
                          cursor: hasStories ? 'pointer' : 'default',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'transform 150ms',
                          transform: epicExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          opacity: hasStories ? 1 : 0,
                        }}
                      >
                        <ChevronRightIcon label="" color={token('color.icon.subtle', '#626F86')} LEGACY_size="small" />
                      </span>
                      <a
                        href={epicUrl}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          lineHeight: '16px',
                          fontFamily: ATLAS_SANS,
                          color: token('color.link', '#0C66E4'),
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {epic.issue_key}
                      </a>
                      <span
                        title={epic.summary}
                        style={{
                          fontSize: 13,
                          lineHeight: '20px',
                          fontWeight: 400,
                          fontFamily: ATLAS_SANS,
                          color: token('color.text', '#172B4D'),
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {epic.summary}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          borderRadius: 3,
                          background: '#DFE1E6',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${epicPct}%`,
                            height: '100%',
                            borderRadius: 3,
                            transition: 'width 200ms ease',
                            background:
                              epicPct === 100 ? '#1F845A' : epicPct > 0 ? '#0C66E4' : 'transparent',
                          }}
                        />
                      </div>
                      <Lozenge appearance={lozengeAppearance(epic.status_category, epic.status)}>
                        {epic.status}
                      </Lozenge>
                    </div>

                    {epicExpanded && (epic.stories ?? []).map((story) => {
                      const storyUrl = `/project-hub/${projectKey}/hierarchy/allwork?selectedIssue=${story.issue_key}`;
                      return (
                        <div
                          key={story.issue_key}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '20px 90px 1fr auto',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 16px 10px 28px',
                            minHeight: 40,
                            borderTop: `1px solid ${token('color.border', '#DCDFE4')}`,
                            borderLeft: `3px solid ${token('color.border.brand', '#0C66E4')}`,
                            background: token('elevation.surface.sunken', '#F7F8F9'),
                          }}
                        >
                          <span />
                          <a
                            href={storyUrl}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              lineHeight: '16px',
                              fontFamily: ATLAS_SANS,
                              color: token('color.link', '#0C66E4'),
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {story.issue_key}
                          </a>
                          <span
                            title={story.summary}
                            style={{
                              fontSize: 13,
                              fontWeight: 400,
                              lineHeight: '20px',
                              fontFamily: ATLAS_SANS,
                              color: token('color.text', '#172B4D'),
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {story.summary}
                          </span>
                          <Lozenge appearance={lozengeAppearance(story.status_category, story.status)}>
                            {story.status}
                          </Lozenge>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {!row.target_complete && (
                <div
                  style={{
                    margin: '8px 16px 0 28px',
                    fontSize: 11,
                    lineHeight: '16px',
                    fontWeight: 400,
                    fontFamily: ATLAS_SANS,
                    color: token('color.text.subtlest', '#626F86'),
                    fontStyle: 'italic',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <InformationIcon label="" color={token('color.icon.subtle', '#626F86')} LEGACY_size="small" />
                  Set a target date on {row.initiative_key} in ProductHub to enable RAG tracking.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main gadget
// ─────────────────────────────────────────────────────────────────────────────

export default function DemandFulfilmentGadget({ projectKey, collapsed, onToggleCollapse }: WidgetProps) {
  const navigate = useNavigate();
  const { settings, save } = useGadgetSettings();
  const { data: rows = [], isLoading } = useDemandData(projectKey, settings);
  const { data: unlinkedEpics = [] } = useUnlinkedEpics(projectKey, settings);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => setExpandedRows((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [tab, setTab] = useState<'active' | 'overdue' | 'all'>('active');
  // status filter intentionally omitted — to be reintroduced in a future iteration.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deliveredOpen, setDeliveredOpen] = useState(false);
  const gearRef = useRef<HTMLSpanElement>(null);

  // Reset expansion if rows change.
  useEffect(() => {
    setExpandedRows((prev) => {
      const validIds = new Set(rows.map((r) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => { if (validIds.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  // Click-outside handler for settings popup.
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const gearEl = gearRef.current;
      const popupEl = document.getElementById('demand-settings-popup');
      if (gearEl && !gearEl.contains(target) && popupEl && !popupEl.contains(target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  const active = useMemo(() => rows.filter((r) => !r.isDelivered), [rows]);
  const delivered = useMemo(() => rows.filter((r) => r.isDelivered), [rows]);

  const mergedActive = useMemo(() => {
    const epicRows: DemandRow[] = unlinkedEpics.map((epic) => ({
      id: epic.id,
      initiative_key: epic.issue_key,
      title: epic.summary,
      status: epic.status,
      target_complete: null,
      target_quarter: null,
      assignee_id: epic.assignee_id ?? null,
      assignee_name: epic.assignee_name ?? '—',
      assignee_avatar: epic.assignee_avatar ?? null,
      done: epic.done ?? 0,
      total: epic.total ?? 0,
      todo: epic.todo ?? 0,
      inprogress: epic.inprogress ?? 0,
      blocked: epic.blocked ?? 0,
      epics: (epic.stories ?? []).map((s) => ({
        id: s.issue_key,
        issue_key: s.issue_key,
        summary: s.summary,
        total: 1,
        done: s.status_category === 'Done' ? 1 : 0,
        todo: s.status_category === 'To Do' ? 1 : 0,
        inprogress: s.status_category === 'In Progress' ? 1 : 0,
        blocked: ['On Hold', 'Blocked', 'Awaiting Info'].includes(s.status) ? 1 : 0,
        status: s.status,
        status_category: s.status_category,
        stories: [],
      })),
      isDelivered: false,
      deliveredAt: null,
      isUnlinkedEpic: true,
    }));
    return [...active, ...epicRows];
  }, [active, unlinkedEpics]);

  const overdueRows = useMemo(
    () => mergedActive.filter((r) => computeRag(r.target_complete, settings.rag_threshold).state === 'overdue'),
    [mergedActive, settings.rag_threshold],
  );

  const visibleByTab =
    tab === 'overdue' ? overdueRows : tab === 'all' ? [...mergedActive, ...delivered] : mergedActive;

  const visibleRows = visibleByTab.slice(0, 10);




  // Period badge text (icon rendered separately as ADS CalendarIcon)
  const periodBadge = (() => {
    if (settings.scope_type === 'quarter') {
      const { label } = quarterRange(settings.quarter);
      return `${settings.quarter.replace('-', ' ')} · ${label}`;
    }
    if (settings.scope_type === 'custom') return 'Custom range';
    return 'All active demands';
  })();

  // Period strip text
  const periodStrip = (() => {
    if (settings.scope_type === 'quarter') {
      const { start, end, label } = quarterRange(settings.quarter);
      const today = new Date();
      const endDate = parseISO(end);
      const remaining = Math.max(0, differenceInCalendarDays(endDate, today));
      return `${settings.quarter.replace('-', ' ')} · ${label} ${start.slice(0, 4)} · ${remaining} days remaining`;
    }
    if (settings.scope_type === 'custom') {
      if (!settings.date_from || !settings.date_to) return 'Custom · pick a date range';
      return `Custom · ${format(parseISO(settings.date_from), 'dd MMM')} → ${format(parseISO(settings.date_to), 'dd MMM yyyy')}`;
    }
    return 'All active demands · no date filter';
  })();

  return (
    <WidgetWrapper
      title="Demand Fulfilment"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      span={2}
      flushBody
      headerBadges={
        <span
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: token('space.050', '4px'),
              font: token('font.body.small'),
              color: token('color.text.subtle'),
              background: token('color.background.neutral'),
              borderRadius: token('border.radius.100', '4px'),
              padding: `${token('space.050', '4px')} ${token('space.100', '8px')}`,
              whiteSpace: 'nowrap',
            }}
          >
            <CalendarIcon label="" color="currentColor" />
            {periodBadge}
          </span>
          <span ref={gearRef} style={{ display: 'inline-flex' }}>
            <IconButton
              icon={SettingsIcon}
              label="Configure demand gadget"
              appearance="subtle"
              spacing="compact"
              isTooltipDisabled={false}
              onClick={(e) => {
                e.stopPropagation();
                setSettingsOpen((prev) => !prev);
              }}
            />
          </span>
          {settingsOpen && (() => {
            const rect = gearRef.current?.getBoundingClientRect();
            return ReactDOM.createPortal(
              <div
                id="demand-settings-popup"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: (rect?.bottom ?? 0) + 4,
                  right: window.innerWidth - (rect?.right ?? 0),
                  zIndex: 510,
                  background: token('elevation.surface.overlay', '#FFFFFF'),
                  borderRadius: token('border.radius.100', '4px'),
                  boxShadow: '0 4px 8px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
                  minWidth: 300,
                }}
              >
                <SettingsPopupBody
                  initial={settings}
                  projectKey={projectKey}
                  onCancel={() => setSettingsOpen(false)}
                  onApply={async (next) => {
                    await save(next);
                    setSettingsOpen(false);
                  }}
                />
              </div>,
              document.body,
            );
          })()}
        </span>
      }
    >
      {/* Tabs */}
      <div onClick={(e) => e.stopPropagation()} style={{ padding: `0 ${token('space.200', '16px')}` }}>
        <Tabs id="df-tabs" selected={tab === 'active' ? 0 : tab === 'overdue' ? 1 : 2} onChange={(i: number) => setTab(i === 0 ? 'active' : i === 1 ? 'overdue' : 'all')}>
          <TabList>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                Active <Badge appearance="default">{mergedActive.length}</Badge>
              </span>
            </Tab>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                Overdue <Badge appearance={overdueRows.length > 0 ? 'important' : 'default'}>{overdueRows.length}</Badge>
              </span>
            </Tab>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                All <Badge appearance="default">{mergedActive.length + delivered.length}</Badge>
              </span>
            </Tab>
          </TabList>
          <TabPanel><span /></TabPanel>
          <TabPanel><span /></TabPanel>
          <TabPanel><span /></TabPanel>
        </Tabs>
      </div>

      {/* Status filter moved to gadget settings popup */}

      {/* List or empty / all-delivered states */}
      {isLoading ? (
        <div style={{ padding: 20, font: token('font.body.small'), color: token('color.text.subtle') }}>Loading…</div>
      ) : mergedActive.length === 0 && delivered.length === 0 ? (
        // Empty state: differentiate Case A (MDTs exist but none linked → unlinked epics
        // are visible elsewhere) vs Case B (truly nothing in scope).
        unlinkedEpics.length > 0 ? (
          <div style={{ padding: 16 }}>
            <EmptyState
              header="No epics linked to demand tickets yet"
              description="MDTs exist for this quarter but no epics have been linked to them. Open ProductHub to link epics to MDTs so progress can be rolled up here."
              primaryAction={
                <AkButton appearance="primary" onClick={() => navigate('/producthub/backlog')}>
                  Open ProductHub
                </AkButton>
              }
            />
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <EmptyState
              header="No demand tickets for this period"
              description="There are no MDTs matching the selected scope. Create MDTs in ProductHub, set their target quarter, then link epics to track delivery here."
              primaryAction={
                <AkButton appearance="primary" onClick={() => navigate('/producthub/backlog')}>
                  Create MDT in ProductHub
                </AkButton>
              }
            />
          </div>
        )
      ) : mergedActive.length === 0 && delivered.length > 0 ? (
        // All commitments met — show delivered list expanded.
        <div>
          <div style={{ padding: '10px 16px', font: token('font.body'), fontWeight: 600, color: token('color.text') }}>
            ✓ All demand commitments met this period
          </div>
          {delivered.map((r) => (
            <DeliveredRow key={r.id} row={r} projectKey={projectKey} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {visibleRows.length === 0 ? (
              <div style={{ padding: 20, fontSize: 12, color: token('color.text.subtle', '#6B778C'), textAlign: 'center' }}>
                Nothing in this filter.
              </div>
            ) : (
              visibleRows.map((row) => (
                <DemandRowItem
                  key={row.id}
                  row={row}
                  threshold={settings.rag_threshold}
                  expanded={expandedRows.has(row.id)}
                  onToggle={() => toggleRow(row.id)}
                  projectKey={projectKey}
                  isUnlinkedEpic={row.isUnlinkedEpic}
                />
              ))
            )}
          </div>

          {visibleByTab.length > 10 && (
            <div style={{ padding: '6px 16px', textAlign: 'center', borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }}>
              <a
                href={`/project-hub/${projectKey}/hierarchy/allwork`}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  lineHeight: '18px',
                  fontFamily: ATLAS_SANS,
                  color: token('color.link', '#0C66E4'),
                  textDecoration: 'none',
                }}
              >
                View all {visibleByTab.length} in ProjectHub ↗
              </a>
            </div>
          )}

          {delivered.length > 0 && (
            <div style={{ background: token('elevation.surface.sunken', '#F7F8F9'), borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }}>
              <button
                onClick={() => setDeliveredOpen((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  textAlign: 'left',
                }}
              >
                <CheckCircleIcon label="" color={token('color.icon.success', '#1F845A')} LEGACY_size="small" />
                {delivered.length} delivered this period
                <ChevronDown
                  size={12}
                  style={{
                    marginLeft: 'auto',
                    transform: deliveredOpen ? 'rotate(0)' : 'rotate(-90deg)',
                    transition: 'transform 150ms',
                  }}
                />
              </button>
              {deliveredOpen && delivered.map((r) => <DeliveredRow key={r.id} row={r} projectKey={projectKey} />)}
            </div>
          )}
        </>
      )}
    </WidgetWrapper>
  );
}

function DeliveredRow({ row, projectKey }: { row: DemandRow; projectKey: string }) {
  const onTime =
    row.target_complete && row.deliveredAt
      ? new Date(row.deliveredAt) <= new Date(row.target_complete)
      : true;
  const lateBy =
    !onTime && row.target_complete && row.deliveredAt
      ? differenceInCalendarDays(new Date(row.deliveredAt), new Date(row.target_complete))
      : 0;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 60px 1fr 90px 70px 80px',
        alignItems: 'center',
        gap: 8,
        padding: '6px 16px',
        borderTop: `1px solid ${token('color.border', '#E2E8F0')}`,
        font: token('font.body.small'),
      }}
    >
      <CheckCircleIcon label="" color={token('color.icon.success', '#1F845A')} LEGACY_size="small" />
      <a
        href={`/project-hub/${projectKey}/hierarchy/allwork?selectedIssue=${row.initiative_key}`}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: token('color.link', '#0C66E4'),
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {row.initiative_key}
      </a>
      <span title={row.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', '#172B4D') }}>
        {row.title}
      </span>
      <span style={{ fontSize: 11, lineHeight: '16px', fontWeight: 400, color: token('color.text.subtle', '#6B778C') }}>
        {row.deliveredAt ? format(new Date(row.deliveredAt), 'dd MMM yyyy') : '—'}
      </span>
      <span style={{ fontSize: 11, lineHeight: '16px', fontWeight: 400, color: token('color.text.subtle', '#6B778C') }}>
        {row.total} {row.total === 1 ? 'story' : 'stories'}
      </span>
      {onTime ? (
        <Lozenge appearance="success">ON TIME</Lozenge>
      ) : (
        <Lozenge appearance="removed">LATE +{lateBy}d</Lozenge>
      )}
    </div>
  );
}
