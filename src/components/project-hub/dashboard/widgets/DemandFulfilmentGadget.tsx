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
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react';
import { token } from '@atlaskit/tokens';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import ProgressBar from '@atlaskit/progress-bar';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import EmptyState from '@atlaskit/empty-state';
import Popup from '@atlaskit/popup';
import { RadioGroup } from '@atlaskit/radio';
import Select from '@atlaskit/select';
import { Checkbox } from '@atlaskit/checkbox';
import { DatePicker } from '@atlaskit/datetime-picker';
import SectionMessage, { SectionMessageAction } from '@atlaskit/section-message';
import Badge from '@atlaskit/badge';
import Link from '@atlaskit/link';
import AkButton, { IconButton } from '@atlaskit/button/new';
import SettingsIcon from '@atlaskit/icon/core/settings';
import CalendarIcon from '@atlaskit/icon/core/calendar';
import ShortcutIcon from '@atlaskit/icon/core/shortcut';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
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
};

const QUARTER_OPTIONS = [
  { label: 'Q1 2026 · Jan–Mar', value: 'Q1-2026' },
  { label: 'Q2 2026 · Apr–Jun', value: 'Q2-2026' },
  { label: 'Q3 2026 · Jul–Sep', value: 'Q3-2026' },
  { label: 'Q4 2026 · Oct–Dec', value: 'Q4-2026' },
];

const THRESHOLD_OPTIONS = [3, 5, 7, 10, 14].map((n) => ({ label: `${n}`, value: n }));

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

interface UnlinkedEpic {
  id: string;
  issue_key: string;
  summary: string;
  status: string;
  status_category: string | null;
}

function useUnlinkedEpics(projectKey: string) {
  return useQuery({
    queryKey: ['demand-fulfilment-unlinked', projectKey],
    queryFn: async (): Promise<UnlinkedEpic[]> => {
      // Fetch all linked epic ids first
      const { data: links } = await (supabase as any)
        .from('ph_initiative_links')
        .select('issue_id');
      const linkedIds = new Set((links ?? []).map((l: any) => l.issue_id));

      const { data: epics } = await (supabase as any)
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category')
        .eq('issue_type', 'Epic')
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .not('status_category', 'eq', 'Done')
        .limit(500);

      return (epics ?? []).filter((e: any) => !linkedIds.has(e.id));
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
      let children: any[] = [];
      if (childTypes.length > 0) {
        const { data } = await (supabase as any)
          .from('ph_issues')
          .select('issue_key, parent_key, status, status_category')
          .in('parent_key', epicKeys)
          .in('issue_type', childTypes)
          .is('jira_removed_at', null)
          .limit(5000);
        children = data ?? [];
      }

      // 5) Fetch assignee profiles for avatars.
      const assigneeIds = Array.from(new Set(initiatives.map((i: any) => i.assignee_id).filter(Boolean)));
      let profiles: Record<string, any> = {};
      if (assigneeIds.length > 0) {
        const { data: pr } = await (supabase as any)
          .from('profiles')
          .select('id, display_name, full_name, avatar_url')
          .in('id', assigneeIds);
        profiles = Object.fromEntries((pr ?? []).map((p: any) => [p.id, p]));
      }

      // 6) Roll up: bucket children per epic.
      const bucketByEpicKey = new Map<string, { done: number; blocked: number; inprogress: number; todo: number; total: number }>();
      epicKeys.forEach((k) => bucketByEpicKey.set(k, { done: 0, blocked: 0, inprogress: 0, todo: 0, total: 0 }));
      children.forEach((c: any) => {
        const bucket = bucketByEpicKey.get(c.parent_key);
        if (!bucket) return;
        const cls = classifyIssue(c);
        bucket.total += 1;
        if (cls) (bucket as any)[cls] += 1;
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

const RagDot = ({ state }: { state: RagState }) => (
  <span
    style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: ragColors[state].dot,
    }}
  />
);

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
}: {
  initial: GadgetSettings;
  onApply: (s: GadgetSettings) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<GadgetSettings>(initial);

  return (
    <div style={{ width: 300, padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: token('color.text', '#172B4D') }}>
          Gadget Settings
        </span>
        <button
          onClick={onCancel}
          style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 2, color: token('color.text.subtlest', '#6B778C') }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>

      {/* Time scope */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04, textTransform: 'uppercase', color: token('color.text.subtlest', '#6B778C'), marginBottom: 6 }}>
        Time scope
      </div>
      <RadioGroup
        name="scope_type"
        value={draft.scope_type}
        onChange={(e: any) => setDraft({ ...draft, scope_type: e.currentTarget.value as ScopeType })}
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
            <div style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C'), marginBottom: 2 }}>From</div>
            <DatePicker
              locale="en-GB"
              value={draft.date_from ?? ''}
              onChange={(v: string) => setDraft({ ...draft, date_from: v || null })}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C'), marginBottom: 2 }}>To</div>
            <DatePicker
              locale="en-GB"
              value={draft.date_to ?? ''}
              minDate={draft.date_from ?? undefined}
              onChange={(v: string) => setDraft({ ...draft, date_to: v || null })}
            />
          </div>
        </div>
      )}

      <hr style={{ margin: '14px 0 10px', border: 0, borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }} />

      {/* Threshold */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04, textTransform: 'uppercase', color: token('color.text.subtlest', '#6B778C'), marginBottom: 6 }}>
        At-risk threshold
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: token('color.text', '#172B4D') }}>
        <span>Mark as At Risk when</span>
        <div style={{ width: 70 }}>
          <Select
            spacing="compact"
            options={THRESHOLD_OPTIONS}
            value={THRESHOLD_OPTIONS.find((o) => o.value === draft.rag_threshold)}
            onChange={(opt: any) => setDraft({ ...draft, rag_threshold: opt.value })}
          />
        </div>
        <span>or fewer days remain</span>
      </div>

      <hr style={{ margin: '14px 0 10px', border: 0, borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }} />

      {/* Item types */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.04, textTransform: 'uppercase', color: token('color.text.subtlest', '#6B778C'), marginBottom: 6 }}>
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

function DemandRowItem({
  row,
  threshold,
  expanded,
  onToggle,
}: {
  row: DemandRow;
  threshold: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { state, daysLeft } = computeRag(row.target_complete, threshold);
  const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
  const c = ragColors[state];
  const productHubUrl = `/producthub/backlog?initiative=${row.initiative_key}`;

  return (
    <div
      style={{
        borderBottom: `1px solid ${token('color.border', '#E2E8F0')}`,
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: 'grid',
          gridTemplateColumns: '14px 8px 60px 1fr 90px 100px 28px',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          cursor: 'pointer',
          background: 'transparent',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <ChevronRight
          size={14}
          style={{
            color: token('color.text.subtlest', '#6B778C'),
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        />
        <RagDot state={state} />
        <a
          href={productHubUrl}
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.brand', '#0C66E4'),
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {row.initiative_key}
        </a>
        <span
          title={row.title}
          style={{
            fontSize: 12,
            color: token('color.text', '#172B4D'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.title}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ProgressBar value={pct / 100} appearance="default" />
          <span style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C'), textAlign: 'right' }}>
            {pct}% · {row.done}/{row.total}
          </span>
        </div>
        <DatePill state={state} daysLeft={daysLeft} dateStr={row.target_complete} />
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
            padding: '8px 12px 12px 34px',
            background: token('elevation.surface.sunken', '#F7F8F9'),
            borderTop: `1px solid ${token('color.border', '#E2E8F0')}`,
          }}
        >
          {row.total === 0 ? (
            <div style={{ fontSize: 12, color: token('color.text.subtle', '#6B778C'), fontStyle: 'italic' }}>
              <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              No stories linked. Add stories under the epics in this demand to track progress.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
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
                return (
                  <div
                    key={epic.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '6px 50px 1fr 56px 36px 52px',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: ragColors[epicState].dot,
                      }}
                    />
                    <a
                      href={`/project-hub/${epic.issue_key.split('-')[0]}/allwork?issue=${epic.issue_key}`}
                      style={{ fontSize: 11, fontWeight: 700, color: token('color.text.brand', '#0C66E4'), textDecoration: 'none' }}
                    >
                      {epic.issue_key}
                    </a>
                    <span
                      title={epic.summary}
                      style={{
                        fontSize: 12,
                        color: token('color.text', '#172B4D'),
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {epic.summary}
                    </span>
                    <div style={{ height: 3, background: token('color.background.neutral', '#DFE1E6'), borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${epicPct}%`, height: '100%', background: ragColors[epicState].bar }} />
                    </div>
                    <span style={{ fontSize: 10, color: token('color.text.subtle', '#6B778C'), textAlign: 'right' }}>
                      {epicPct}%
                    </span>
                    <span style={{ fontSize: 10, color: token('color.text.subtle', '#6B778C'), textAlign: 'right' }}>
                      {epic.done}/{epic.total}
                    </span>
                  </div>
                );
              })}

              {!row.target_complete && (
                <div style={{ marginTop: 8, fontSize: 11, color: token('color.text.subtlest', '#6B778C'), fontStyle: 'italic' }}>
                  <Info size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
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
  const { data: unlinkedEpics = [] } = useUnlinkedEpics(projectKey);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'overdue' | 'all'>('active');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deliveredOpen, setDeliveredOpen] = useState(false);
  const [unlinkedOpen, setUnlinkedOpen] = useState(false);

  // Reset expansion if rows change.
  useEffect(() => {
    if (expandedId && !rows.find((r) => r.id === expandedId)) setExpandedId(null);
  }, [rows, expandedId]);

  const active = useMemo(() => rows.filter((r) => !r.isDelivered), [rows]);
  const delivered = useMemo(() => rows.filter((r) => r.isDelivered), [rows]);
  const overdueRows = useMemo(
    () => active.filter((r) => computeRag(r.target_complete, settings.rag_threshold).state === 'overdue'),
    [active, settings.rag_threshold],
  );

  const visibleByTab =
    tab === 'overdue' ? overdueRows : tab === 'all' ? [...active, ...delivered] : active;
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
          <Popup
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            placement="bottom-end"
            shouldFlip
            content={() => (
              <SettingsPopupBody
                initial={settings}
                onCancel={() => setSettingsOpen(false)}
                onApply={async (next) => {
                  await save(next);
                  setSettingsOpen(false);
                }}
              />
            )}
            trigger={(triggerProps) => (
              <span {...triggerProps}>
                <IconButton
                  icon={SettingsIcon}
                  label="Configure demand gadget"
                  appearance="subtle"
                  spacing="compact"
                  isTooltipDisabled={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettingsOpen((v) => !v);
                  }}
                />
              </span>
            )}
          />
        </span>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/producthub/backlog">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.050', '4px') }}>
              View all in ProductHub
              <ShortcutIcon label="" color="currentColor" />
            </span>
          </Link>
          <span style={{ font: token('font.body.small'), color: token('color.text.subtlest') }}>
            {[settings.include_stories && 'Stories', settings.include_defects && 'Defects'].filter(Boolean).join(' + ')} · Sun–Thu
          </span>
        </div>
      }
    >
      {/* Tabs */}
      <div onClick={(e) => e.stopPropagation()}>
        <Tabs id="df-tabs" selected={tab === 'active' ? 0 : tab === 'overdue' ? 1 : 2} onChange={(i: number) => setTab(i === 0 ? 'active' : i === 1 ? 'overdue' : 'all')}>
          <TabList>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                Active <Badge appearance="default">{active.length}</Badge>
              </span>
            </Tab>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                Overdue <Badge appearance={overdueRows.length > 0 ? 'important' : 'default'}>{overdueRows.length}</Badge>
              </span>
            </Tab>
            <Tab>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.075', '6px') }}>
                All <Badge appearance="default">{active.length + delivered.length}</Badge>
              </span>
            </Tab>
          </TabList>
          <TabPanel><span /></TabPanel>
          <TabPanel><span /></TabPanel>
          <TabPanel><span /></TabPanel>
        </Tabs>
      </div>

      {/* Period strip */}
      <div
        style={{
          background: token('elevation.surface.sunken', '#F7F8F9'),
          borderTop: `1px solid ${token('color.border')}`,
          borderBottom: `1px solid ${token('color.border')}`,
          padding: `${token('space.050', '4px')} ${token('space.150', '12px')}`,
          font: token('font.body.small'),
          color: token('color.text.subtlest'),
        }}
      >
        {periodStrip}
      </div>

      {/* List or empty / all-delivered states */}
      {isLoading ? (
        <div style={{ padding: 20, font: token('font.body.small'), color: token('color.text.subtle') }}>Loading…</div>
      ) : active.length === 0 && delivered.length === 0 ? (
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
      ) : active.length === 0 && delivered.length > 0 ? (
        // All commitments met — show delivered list expanded.
        <div>
          <div style={{ padding: '10px 12px', font: token('font.body'), fontWeight: 600, color: token('color.text') }}>
            ✓ All demand commitments met this period
          </div>
          {delivered.map((r) => (
            <DeliveredRow key={r.id} row={r} />
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
                  expanded={expandedId === row.id}
                  onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                />
              ))
            )}
          </div>

          {visibleByTab.length > 10 && (
            <div style={{ padding: '6px 12px', fontSize: 11, textAlign: 'center', borderTop: `1px solid ${token('color.border', '#E2E8F0')}` }}>
              <a href="/producthub/backlog" style={{ color: token('color.text.brand', '#0C66E4'), textDecoration: 'none' }}>
                View all {visibleByTab.length} in ProductHub ↗
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
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  textAlign: 'left',
                }}
              >
                <CheckCircle2 size={13} color="#36B37E" />
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
              {deliveredOpen && delivered.map((r) => <DeliveredRow key={r.id} row={r} />)}
            </div>
          )}
        </>
      )}

      {/* Unlinked epics warning — always render when present, regardless of tab state */}
      {unlinkedEpics.length > 0 && (
        <div style={{ borderTop: `1px solid ${token('color.border')}` }}>
          <div style={{ padding: token('space.150', '12px') }}>
            <SectionMessage
              appearance="warning"
              title={`${unlinkedEpics.length} epic${unlinkedEpics.length === 1 ? '' : 's'} not linked to any demand ticket`}
              actions={
                <SectionMessageAction onClick={() => setUnlinkedOpen((v) => !v)}>
                  {unlinkedOpen ? 'Hide unlinked epics' : 'View unlinked epics'}
                </SectionMessageAction>
              }
            >
              <p>These epics are progressing but aren't rolled up under any MDT.</p>
            </SectionMessage>
          </div>
          {unlinkedOpen && (
            <div style={{ maxHeight: 200, overflowY: 'auto', background: token('elevation.surface.sunken', '#F7F8F9') }}>
              {unlinkedEpics.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px 60px 1fr auto',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderTop: `1px solid ${token('color.border')}`,
                    font: token('font.body.small'),
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: token('color.text.disabled', '#97A0AF') }} />
                  <Link href={`/project-hub/${e.issue_key.split('-')[0]}/hierarchy/allwork?selectedIssue=${e.issue_key}`}>
                    <span style={{ fontWeight: 700 }}>{e.issue_key}</span>
                  </Link>
                  <span
                    title={e.summary}
                    style={{
                      color: token('color.text'),
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    {e.summary}
                  </span>
                  <Link href={`/producthub/backlog?linkEpic=${e.issue_key}`}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.050', '4px'), whiteSpace: 'nowrap' }}>
                      Link to demand
                      <ShortcutIcon label="" color="currentColor" />
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
}

function DeliveredRow({ row }: { row: DemandRow }) {
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
        padding: '6px 12px',
        borderTop: `1px solid ${token('color.border', '#E2E8F0')}`,
        fontSize: 12,
      }}
    >
      <CheckCircle2 size={14} color="#36B37E" />
      <a
        href={`/producthub/backlog?initiative=${row.initiative_key}`}
        style={{ fontSize: 11, fontWeight: 700, color: token('color.text.brand', '#0C66E4'), textDecoration: 'none' }}
      >
        {row.initiative_key}
      </a>
      <span title={row.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', '#172B4D') }}>
        {row.title}
      </span>
      <span style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C') }}>
        {row.deliveredAt ? format(new Date(row.deliveredAt), 'dd MMM yyyy') : '—'}
      </span>
      <span style={{ fontSize: 11, color: token('color.text.subtle', '#6B778C') }}>
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
