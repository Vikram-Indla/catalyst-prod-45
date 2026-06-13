import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { AtlaskitPageShell } from '@/components/ads';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import SearchIcon from '@atlaskit/icon/glyph/search';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import EditorDoneIcon from '@atlaskit/icon/glyph/editor/done';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { GanttChart, Calendar } from '@/lib/atlaskit-icons';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProjectHubTimeline, type TimelineIssue } from '@/hooks/useProjectHubTimeline';
import { useFiltersForProject } from '@/hooks/workhub/useSavedFilters';
import Spinner from '@atlaskit/spinner';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';
import Checkbox from '@atlaskit/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────────────────────── types ─────────────────────────────── */

type ZoomLevel = 'week' | 'month' | 'quarter';
type OpenDropdown = 'epic' | 'status' | 'assignee' | 'quick' | 'more' | null;

interface FlatRow {
  issue: TimelineIssue;
  depth: number;
}

interface EpicProgress {
  done: number;
  inProgress: number;
  toDo: number;
  total: number;
}

/* ─────────────────────────────── constants ──────────────────────────── */

const ROW_H = 40;
const DEFAULT_SIDEBAR_W = 384;
const MIN_SIDEBAR_W = 160;
const MAX_SIDEBAR_W = 560;
const HEADER_H = 40;
const BAR_H = 22;
const MIN_BAR_W = 18;
const TODAY = new Date();

const ZOOM_PX_PER_DAY: Record<ZoomLevel, number> = { week: 28, month: 8, quarter: 3 };

const STATUS_CAT_OPTIONS = [
  { value: 'done', label: 'Done', color: 'var(--ds-chart-success-bold, #94C748)' },
  { value: 'progress', label: 'In Progress', color: 'var(--ds-chart-information-bold, #8FB8F6)' },
  { value: 'default', label: 'To Do', color: 'var(--ds-background-neutral, #DDDEE1)' },
];

const BUILT_IN_QUICK_FILTERS = [
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'no_assignee', label: 'Unassigned' },
];

/* ─────────────────────────────── date helpers ───────────────────────── */

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─────────────────────────────── progress helpers ───────────────────── */

function computeEpicProgress(issue: TimelineIssue): EpicProgress {
  function countAll(items: TimelineIssue[]): EpicProgress {
    let done = 0, inProgress = 0, toDo = 0;
    for (const i of items) {
      const cat = (i.statusCategory ?? '').toLowerCase();
      if (cat.includes('done')) done++;
      else if (cat.includes('progress')) inProgress++;
      else toDo++;
      if (i.children.length) {
        const sub = countAll(i.children);
        done += sub.done; inProgress += sub.inProgress; toDo += sub.toDo;
      }
    }
    return { done, inProgress, toDo, total: done + inProgress + toDo };
  }
  return countAll(issue.children);
}

/* ─────────────────────────────── date range ────────────────────────── */

function computeDateRange(issues: TimelineIssue[]): { start: Date; end: Date } {
  let minMs = Infinity, maxMs = -Infinity;
  function scan(list: TimelineIssue[]) {
    for (const i of list) {
      const s = parseDate(i.startDate), e = parseDate(i.dueDate);
      if (s) { minMs = Math.min(minMs, s.getTime()); maxMs = Math.max(maxMs, s.getTime()); }
      if (e) { minMs = Math.min(minMs, e.getTime()); maxMs = Math.max(maxMs, e.getTime()); }
      if (i.children.length) scan(i.children);
    }
  }
  scan(issues);
  const now = new Date();
  const rangeStart = isFinite(minMs) ? new Date(minMs) : addDays(now, -90);
  const rangeEnd = isFinite(maxMs) ? new Date(maxMs) : addDays(now, 90);
  return { start: addDays(rangeStart, -28), end: addDays(rangeEnd, 28) };
}

/* ─────────────────────────────── tree flatten ───────────────────────── */

function flattenTree(issues: TimelineIssue[], collapsed: Set<string>, depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const issue of issues) {
    rows.push({ issue, depth });
    if (issue.children.length && !collapsed.has(issue.issueKey)) {
      rows.push(...flattenTree(issue.children, collapsed, depth + 1));
    }
  }
  return rows;
}

/* ─────────────────────────────── bar color ─────────────────────────── */

function barColor(issue: TimelineIssue): string {
  const cat = (issue.statusCategory ?? '').toLowerCase();
  if (cat.includes('done')) return 'var(--ds-background-success-bold, #1F845A)';
  if (cat.includes('progress')) return 'var(--ds-background-information-bold, #0055CC)';
  return 'var(--ds-background-neutral-bold, #626F86)';
}

/* ─────────────────────────────── header/grid builders ───────────────── */

interface HeaderCol { label: string; left: number; width: number; }

function buildHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
  const cols: HeaderCol[] = [];
  if (zoom === 'week') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      cols.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getDate()}`, left, width: 7 * pxPerDay });
      cur = addDays(cur, 7);
    }
  } else if (zoom === 'month') {
    let cur = startOfMonth(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      cols.push({ label: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`, left, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  } else {
    let cur = startOfQuarter(start);
    while (cur <= end) {
      const left = daysBetween(start, cur) * pxPerDay;
      const q = Math.floor(cur.getMonth() / 3) + 1;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 3, 1);
      cols.push({ label: `Q${q} ${cur.getFullYear()}`, left, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  }
  return cols;
}

function buildSubHeaderCols(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): HeaderCol[] {
  const cols: HeaderCol[] = [];
  if (zoom === 'week') {
    const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    let cur = new Date(start);
    while (cur <= end) {
      cols.push({ label: DAYS[cur.getDay()], left: daysBetween(start, cur) * pxPerDay, width: pxPerDay });
      cur = addDays(cur, 1);
    }
  } else if (zoom === 'month') {
    let cur = startOfWeek(start);
    while (cur <= end) {
      cols.push({ label: `${cur.getDate()}`, left: daysBetween(start, cur) * pxPerDay, width: 7 * pxPerDay });
      cur = addDays(cur, 7);
    }
  } else {
    let cur = startOfMonth(start);
    while (cur <= end) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      cols.push({ label: MONTHS[cur.getMonth()], left: daysBetween(start, cur) * pxPerDay, width: daysBetween(cur, next) * pxPerDay });
      cur = next;
    }
  }
  return cols;
}

function buildGridLines(start: Date, end: Date, zoom: ZoomLevel, pxPerDay: number): number[] {
  const lines: number[] = [];
  if (zoom === 'week') {
    let cur = startOfWeek(start);
    while (cur <= end) { lines.push(daysBetween(start, cur) * pxPerDay); cur = addDays(cur, 7); }
  } else if (zoom === 'month') {
    let cur = startOfMonth(start);
    while (cur <= end) { lines.push(daysBetween(start, cur) * pxPerDay); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  } else {
    let cur = startOfQuarter(start);
    while (cur <= end) { lines.push(daysBetween(start, cur) * pxPerDay); cur = new Date(cur.getFullYear(), cur.getMonth() + 3, 1); }
  }
  return lines;
}

/* ─────────────────────────────── portal menu (CLAUDE.md §2026-06-13) ── */

interface PortalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  minWidth?: number;
  alignRight?: boolean;
  children: React.ReactNode;
}

function PortalMenu({ isOpen, onClose, triggerRef, minWidth = 200, alignRight = false, children }: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [isOpen, onClose, triggerRef]);
  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  const pos = alignRight
    ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
    : { top: rect.bottom + 4, left: rect.left };
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu options"
      style={{
        position: 'fixed',
        ...pos,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))',
        padding: '4px 0',
        minWidth,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function MenuItemRow({
  label, isChecked, onClick, disabled = false, danger = false,
}: {
  label: string; isChecked?: boolean; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        color: danger
          ? 'var(--ds-text-danger, #AE2A19)'
          : disabled
            ? 'var(--ds-text-disabled, #A5ADBA)'
            : 'var(--ds-text, #172B4D)',
        fontFamily: 'var(--ds-font-family-body)',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {isChecked !== undefined && (
        <div style={{
          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
          border: `2px solid ${isChecked ? 'var(--ds-border-selected, #0052CC)' : 'var(--ds-border, #DFE1E6)'}`,
          background: isChecked ? 'var(--ds-background-selected-bold, #0052CC)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isChecked && <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      )}
      {label}
    </div>
  );
}

/* ─────────────────────────────── inline empty overlay ──────────────── */

function InlineEmptyOverlay({ projectKey }: { projectKey: string }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 32,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8,
      boxShadow: 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.15))',
      zIndex: 20, minWidth: 280,
    }}>
      <GanttChart style={{ width: 40, height: 40, color: 'var(--ds-text-subtlest, #626F86)' }} />
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
          No issues with dates
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--ds-text-subtle, #42526E)' }}>
          Add start or due dates to issues in {projectKey} to see them on the timeline.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────── view settings panel ───────────────── */

interface ViewSettingsPanelProps {
  showProgress: boolean;
  showReleases: boolean;
  onToggleProgress: () => void;
  onToggleReleases: () => void;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function ViewSettingsPanel({ showProgress, showReleases, onToggleProgress, onToggleReleases, onClose, triggerRef }: ViewSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [onClose, triggerRef]);
  if (!triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div ref={panelRef} style={{
      position: 'fixed', top: rect.bottom + 4, right: window.innerWidth - rect.right,
      background: 'var(--ds-surface-overlay, #FFFFFF)',
      border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 8,
      boxShadow: '0 8px 28px var(--ds-shadow-overlay, rgba(9,30,66,0.25))', padding: '12px 0',
      minWidth: 220, zIndex: 9999,
    }}>
      <div style={{ padding: '0 12px 8px', fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', letterSpacing: '0.06em', fontFamily: 'var(--ds-font-family-body)' }}>
        View settings
      </div>
      <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '0 0 8px' }} />
      <div style={{ padding: '4px 12px' }}>
        <Checkbox label="Show progress" isChecked={showProgress} onChange={onToggleProgress} />
      </div>
      <div style={{ padding: '4px 12px' }}>
        <Checkbox label="Show releases" isChecked={showReleases} onChange={onToggleReleases} />
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────── icon button style ─────────────────── */

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 24, height: 24, border: 'none',
  background: 'transparent', cursor: 'pointer', borderRadius: 3, flexShrink: 0,
  color: 'var(--ds-text-subtle, #42526E)',
};

/* ─────────────────────────────── main component ────────────────────── */

export default function ProjectHubTimelinePage() {
  const { key: projectKey } = useParams<{ key: string }>();
  const queryClient = useQueryClient();
  const { data: tree = [], isLoading, error } = useProjectHubTimeline(projectKey);
  const { data: savedFilters = [] } = useFiltersForProject(projectKey, 'project');

  /* responsive container */
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setContainerWidth(entries[0]?.contentRect.width ?? 0);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isNarrow = containerWidth > 0 && containerWidth < 640;

  /* sidebar drag-resize */
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (!projectKey) return DEFAULT_SIDEBAR_W;
    try {
      const stored = localStorage.getItem(`tl-sidebar-width-${projectKey}`);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n)) return Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, n));
      }
    } catch {}
    return DEFAULT_SIDEBAR_W;
  });

  const [sidebarResizing, setSidebarResizing] = useState<{ originX: number; originWidth: number } | null>(null);

  useEffect(() => {
    if (!sidebarResizing) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, sidebarResizing.originWidth + e.clientX - sidebarResizing.originX));
      setSidebarWidth(next);
    };
    const onUp = (e: MouseEvent) => {
      const final = Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, sidebarResizing.originWidth + e.clientX - sidebarResizing.originX));
      setSidebarWidth(final);
      setSidebarResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (projectKey) {
        try { localStorage.setItem(`tl-sidebar-width-${projectKey}`, String(final)); } catch {}
      }
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [sidebarResizing, projectKey]);

  /* zoom + collapse */
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /* filters */
  const [searchQuery, setSearchQuery] = useState('');
  const [epicFilter, setEpicFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  /* view settings */
  const [showProgress, setShowProgress] = useState(true);
  const [showReleases, setShowReleases] = useState(true);
  const [releasesCollapsed, setReleasesCollapsed] = useState(false);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  /* create epic */
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [epicSummary, setEpicSummary] = useState('');
  const epicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingEpic && epicInputRef.current) epicInputRef.current.focus();
  }, [creatingEpic]);

  /* drag-to-resize bars */
  const [dragging, setDragging] = useState<{
    issueKey: string;
    edge: 'start' | 'end';
    originX: number;
    originalDate: string;
  } | null>(null);
  const [livePixelDelta, setLivePixelDelta] = useState(0);

  /* scroll sync refs */
  const gridRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  /* dropdown trigger refs */
  const epicBtnRef = useRef<HTMLButtonElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const assigneeBtnRef = useRef<HTMLButtonElement>(null);
  const quickBtnRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const viewSettingsBtnRef = useRef<HTMLButtonElement>(null);

  const pxPerDay = ZOOM_PX_PER_DAY[zoom];
  const dateRange = useMemo(() => computeDateRange(tree), [tree]);
  const totalDays = daysBetween(dateRange.start, dateRange.end);
  const gridWidth = Math.max(totalDays * pxPerDay, 800);
  const todayLeft = daysBetween(dateRange.start, TODAY) * pxPerDay;

  const allRows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

  /* derive unique epics for epic filter */
  const epicOptions = useMemo(() => {
    const epics: { key: string; summary: string }[] = [];
    for (const row of allRows) {
      if (row.issue.issueType === 'Epic') {
        epics.push({ key: row.issue.issueKey, summary: row.issue.summary });
      }
    }
    return epics;
  }, [allRows]);

  /* derive unique assignees for assignee filter */
  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of allRows) {
      const name = row.issue.assigneeDisplayName;
      if (name && !seen.has(name)) { seen.add(name); result.push(name); }
    }
    return result.sort();
  }, [allRows]);

  /* active saved filter object */
  const activeSavedFilter = useMemo(
    () => savedFilters.find(f => f.id === activeSavedFilterId) ?? null,
    [savedFilters, activeSavedFilterId],
  );

  /* filtered rows */
  const rows = useMemo(() => {
    let result = allRows;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(({ issue }) =>
        issue.summary.toLowerCase().includes(q) || issue.issueKey.toLowerCase().includes(q)
      );
    }
    if (epicFilter) {
      result = result.filter(({ issue }) =>
        issue.issueKey === epicFilter || issue.parentKey === epicFilter
      );
    }
    if (statusFilter.length > 0) {
      result = result.filter(({ issue }) => {
        const cat = (issue.statusCategory ?? '').toLowerCase();
        return statusFilter.some(f => {
          if (f === 'done') return cat.includes('done');
          if (f === 'progress') return cat.includes('progress');
          return !cat.includes('done') && !cat.includes('progress');
        });
      });
    }
    if (quickFilter === 'unscheduled') {
      result = result.filter(({ issue }) => !issue.startDate && !issue.dueDate);
    } else if (quickFilter === 'no_assignee') {
      result = result.filter(({ issue }) => !issue.assigneeDisplayName);
    }
    if (assigneeFilter) {
      result = result.filter(({ issue }) => issue.assigneeDisplayName === assigneeFilter);
    }
    /* apply saved filter config */
    if (activeSavedFilter?.filter_config) {
      const cfg = activeSavedFilter.filter_config;
      if (cfg.unscheduled || cfg.hasNoDates) {
        result = result.filter(({ issue }) => !issue.startDate && !issue.dueDate);
      }
      if (cfg.no_assignee || cfg.noAssignee) {
        result = result.filter(({ issue }) => !issue.assigneeDisplayName);
      }
      if (typeof cfg.assignee === 'string' && cfg.assignee) {
        result = result.filter(({ issue }) =>
          (issue.assigneeDisplayName ?? '').toLowerCase().includes(cfg.assignee.toLowerCase())
        );
      }
      if (Array.isArray(cfg.issueTypes) && cfg.issueTypes.length > 0) {
        result = result.filter(({ issue }) => cfg.issueTypes.includes(issue.issueType));
      }
      if (Array.isArray(cfg.statusCategories) && cfg.statusCategories.length > 0) {
        result = result.filter(({ issue }) => {
          const cat = (issue.statusCategory ?? '').toLowerCase();
          return cfg.statusCategories.some((f: string) => cat.includes(f.toLowerCase()));
        });
      }
    }
    return result;
  }, [allRows, searchQuery, epicFilter, statusFilter, quickFilter, activeSavedFilter, assigneeFilter]);

  const headerCols = useMemo(() => buildHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const subHeaderCols = useMemo(() => buildSubHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const gridLines = useMemo(() => buildGridLines(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);

  const hasAnyDates = useMemo(() => {
    function check(list: TimelineIssue[]): boolean {
      for (const i of list) {
        if (i.startDate || i.dueDate) return true;
        if (i.children.length && check(i.children)) return true;
      }
      return false;
    }
    return check(tree);
  }, [tree]);

  const contentHeight = Math.max(rows.length * ROW_H, 240);
  const doubleHeaderH = HEADER_H * 2;

  /* scroll sync */
  const handleGridScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = grid.scrollLeft;
      if (sidebarBodyRef.current) sidebarBodyRef.current.scrollTop = grid.scrollTop;
      isSyncingScroll.current = false;
    });
  }, []);

  const handleSidebarScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const sidebar = sidebarBodyRef.current;
    if (!sidebar) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (gridRef.current) gridRef.current.scrollTop = sidebar.scrollTop;
      isSyncingScroll.current = false;
    });
  }, []);

  useEffect(() => {
    const grid = gridRef.current, sidebar = sidebarBodyRef.current;
    if (grid) grid.addEventListener('scroll', handleGridScroll, { passive: true });
    if (sidebar) sidebar.addEventListener('scroll', handleSidebarScroll, { passive: true });
    return () => {
      if (grid) grid.removeEventListener('scroll', handleGridScroll);
      if (sidebar) sidebar.removeEventListener('scroll', handleSidebarScroll);
    };
  }, [handleGridScroll, handleSidebarScroll]);

  /* global cursor during bar drag */
  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => { document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  }, [dragging]);

  /* bar drag tracking + supabase commit */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setLivePixelDelta(e.clientX - dragging.originX);
    const onUp = async (e: MouseEvent) => {
      const deltaPx = e.clientX - dragging.originX;
      const deltaDays = Math.round(deltaPx / pxPerDay);
      setDragging(null);
      setLivePixelDelta(0);
      if (deltaDays === 0) return;
      const original = parseDate(dragging.originalDate);
      if (!original) return;
      const newDate = addDays(original, deltaDays);
      const formatted = newDate.toISOString().slice(0, 10);
      const field = dragging.edge === 'start' ? 'customfield_10015' : 'duedate';
      try {
        const { data: row } = await (supabase as any).from('ph_issues').select('raw_json').eq('issue_key', dragging.issueKey).single();
        if (row?.raw_json) {
          const updated = { ...row.raw_json, fields: { ...(row.raw_json.fields ?? {}), [field]: formatted } };
          await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', dragging.issueKey);
          queryClient.invalidateQueries({ queryKey: ['project-hub-timeline', projectKey] });
        }
      } catch (err) { console.warn('timeline date update failed:', err); }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, pxPerDay, queryClient, projectKey]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const scrollToToday = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.scrollLeft = todayLeft - gridRef.current.clientWidth / 2;
  }, [todayLeft]);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);
  const toggleDropdown = useCallback((name: OpenDropdown) => {
    setOpenDropdown(prev => prev === name ? null : name);
  }, []);

  const toggleStatusFilter = useCallback((val: string) => {
    setStatusFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setEpicFilter(null);
    setStatusFilter([]);
    setQuickFilter(null);
    setActiveSavedFilterId(null);
    setAssigneeFilter(null);
  }, []);

  const hasActiveFilters = epicFilter !== null || statusFilter.length > 0 || quickFilter !== null || searchQuery.trim() !== '' || activeSavedFilterId !== null || assigneeFilter !== null;

  const handleCreateEpic = async () => {
    if (!epicSummary.trim() || !projectKey) return;

    const localKey = `${projectKey.toUpperCase()}-LOCAL-${Date.now()}`;
    const optimisticEpic: TimelineIssue = {
      issueKey: localKey,
      projectKey: projectKey.toUpperCase(),
      issueType: 'Epic',
      summary: epicSummary.trim(),
      status: 'To Do',
      statusCategory: 'default',
      startDate: null,
      dueDate: null,
      assigneeDisplayName: null,
      assigneeAvatarUrl: null,
      parentKey: null,
      children: [],
    };

    // 1. Inject into cache immediately (optimistic)
    queryClient.setQueryData(
      ['project-hub-timeline', projectKey],
      (old: TimelineIssue[] | undefined) => [...(old ?? []), optimisticEpic],
    );

    // 2. Reset UI immediately
    setCreatingEpic(false);
    setEpicSummary('');

    // 3. Persist to DB in background
    try {
      await (supabase as any).from('ph_issues').insert({
        issue_key: localKey,
        project_key: projectKey.toUpperCase(),
        issue_type: 'Epic',
        summary: epicSummary.trim(),
        status: 'To Do',
        source: 'catalyst',
        jira_created_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['project-hub-timeline', projectKey] });
    } catch (err) {
      console.warn('create epic failed:', err);
      // Rollback: remove the optimistic entry
      queryClient.setQueryData(
        ['project-hub-timeline', projectKey],
        (old: TimelineIssue[] | undefined) =>
          (old ?? []).filter(i => i.issueKey !== localKey),
      );
    }
  };

  if (isLoading) {
    return (
      <AtlaskitPageShell flush chromeBand={<ProjectHeaderChip projectKey={projectKey} />}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Spinner size="large" />
        </div>
      </AtlaskitPageShell>
    );
  }

  if (error) {
    return (
      <AtlaskitPageShell flush chromeBand={<ProjectHeaderChip projectKey={projectKey} />}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p style={{ color: 'var(--ds-text-danger, #AE2A19)', fontSize: 14 }}>Failed to load timeline data.</p>
        </div>
      </AtlaskitPageShell>
    );
  }

  const quickFilterActiveCount = (quickFilter || activeSavedFilterId) ? 1 : 0;

  return (
    <AtlaskitPageShell flush chromeBand={<ProjectHeaderChip projectKey={projectKey} />}>
    <div
      ref={containerRef}
      role="application"
      aria-label="Timeline"
      style={{
        display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0,
        background: 'var(--ds-surface, #FFFFFF)', overflow: 'hidden',
      }}
    >
      {/* ── toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0, gap: 8,
        flexWrap: isNarrow ? 'wrap' : 'nowrap',
      }}>
        {/* left: search + filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {/* search */}
          <div style={{ position: 'relative', width: isNarrow ? '100%' : 180, flexShrink: 0 }}>
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', lineHeight: 0, pointerEvents: 'none', color: 'var(--ds-text-subtlest, #626F86)' }}>
              <SearchIcon label="" size="small" />
            </div>
            <input
              type="text"
              placeholder="Search timeline"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search timeline"
              style={{
                width: '100%', height: 32, padding: '0 8px 0 32px', boxSizing: 'border-box',
                border: '1px solid var(--ds-border-input, #DFE1E6)', borderRadius: 3,
                fontSize: 14, color: 'var(--ds-text, #172B4D)',
                background: 'var(--ds-background-input, #FFFFFF)',
                outline: 'none', fontFamily: 'var(--ds-font-family-body)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--ds-border-focused, #388BFF)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--ds-border-focused, #388BFF)33'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--ds-border-input, #DFE1E6)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* epic filter */}
          <div style={{ position: 'relative' }}>
            <button
              ref={epicBtnRef}
              onClick={() => toggleDropdown('epic')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'epic'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 8px', border: `1px solid ${epicFilter ? 'var(--ds-border-selected, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 3, background: epicFilter ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Epic
              {epicFilter && <span style={{ fontSize: 11, background: 'var(--ds-background-selected-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 2, padding: '0 4px', marginLeft: 4 }}>1</span>}
              <ChevronDownIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'epic'} onClose={closeDropdown} triggerRef={epicBtnRef} minWidth={220}>
              <MenuItemRow
                label="All epics"
                isChecked={epicFilter === null}
                onClick={() => { setEpicFilter(null); closeDropdown(); }}
              />
              {epicOptions.length > 0 && <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />}
              {epicOptions.map(opt => (
                <MenuItemRow
                  key={opt.key}
                  label={`${opt.key} – ${opt.summary}`}
                  isChecked={epicFilter === opt.key}
                  onClick={() => { setEpicFilter(epicFilter === opt.key ? null : opt.key); closeDropdown(); }}
                />
              ))}
              {epicOptions.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>No epics in view</div>
              )}
            </PortalMenu>
          </div>

          {/* status category filter */}
          <div style={{ position: 'relative' }}>
            <button
              ref={statusBtnRef}
              onClick={() => toggleDropdown('status')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'status'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 8px', border: `1px solid ${statusFilter.length > 0 ? 'var(--ds-border-selected, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 3, background: statusFilter.length > 0 ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Status category
              {statusFilter.length > 0 && <span style={{ fontSize: 11, background: 'var(--ds-background-selected-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 2, padding: '0 4px', marginLeft: 4 }}>{statusFilter.length}</span>}
              <ChevronDownIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'status'} onClose={closeDropdown} triggerRef={statusBtnRef} minWidth={200}>
              {STATUS_CAT_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  role="menuitem"
                  onClick={() => toggleStatusFilter(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer',
                    fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Checkbox label="" isChecked={statusFilter.includes(opt.value)} onChange={() => {}} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  {opt.label}
                </div>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                  <MenuItemRow label="Clear status filter" onClick={() => setStatusFilter([])} />
                </>
              )}
            </PortalMenu>
          </div>

          {/* assignee filter */}
          <div style={{ position: 'relative' }}>
            <button
              ref={assigneeBtnRef}
              onClick={() => toggleDropdown('assignee')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'assignee'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 8px', border: `1px solid ${assigneeFilter ? 'var(--ds-border-selected, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 3, background: assigneeFilter ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Assignee
              {assigneeFilter && <span style={{ fontSize: 11, background: 'var(--ds-background-selected-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 2, padding: '0 4px', marginLeft: 4 }}>1</span>}
              <ChevronDownIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'assignee'} onClose={closeDropdown} triggerRef={assigneeBtnRef} minWidth={200}>
              <MenuItemRow
                label="All assignees"
                isChecked={assigneeFilter === null}
                onClick={() => { setAssigneeFilter(null); closeDropdown(); }}
              />
              {assigneeOptions.length > 0 && <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />}
              {assigneeOptions.map(name => (
                <MenuItemRow
                  key={name}
                  label={name}
                  isChecked={assigneeFilter === name}
                  onClick={() => { setAssigneeFilter(assigneeFilter === name ? null : name); closeDropdown(); }}
                />
              ))}
              {assigneeOptions.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>No assignees in view</div>
              )}
            </PortalMenu>
          </div>

          {/* quick filters + saved filters merged */}
          <div style={{ position: 'relative' }}>
            <button
              ref={quickBtnRef}
              onClick={() => toggleDropdown('quick')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'quick'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 8px',
                border: `1px solid ${quickFilterActiveCount > 0 ? 'var(--ds-border-selected, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 3,
                background: quickFilterActiveCount > 0 ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Quick filters
              {quickFilterActiveCount > 0 && (
                <span style={{ fontSize: 11, background: 'var(--ds-background-selected-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 2, padding: '0 4px', marginLeft: 4 }}>
                  {quickFilterActiveCount}
                </span>
              )}
              <ChevronDownIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'quick'} onClose={closeDropdown} triggerRef={quickBtnRef} minWidth={200}>
              {/* built-in filters section */}
              <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', letterSpacing: '0.06em', fontFamily: 'var(--ds-font-family-body)' }}>
                Built-in
              </div>
              {BUILT_IN_QUICK_FILTERS.map(opt => (
                <MenuItemRow
                  key={opt.value}
                  label={opt.label}
                  isChecked={quickFilter === opt.value}
                  onClick={() => { setQuickFilter(quickFilter === opt.value ? null : opt.value); setActiveSavedFilterId(null); closeDropdown(); }}
                />
              ))}
              {/* saved filters section */}
              {savedFilters.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                  <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)', letterSpacing: '0.06em', fontFamily: 'var(--ds-font-family-body)' }}>
                    Saved filters
                  </div>
                  {savedFilters.map(sf => (
                    <MenuItemRow
                      key={sf.id}
                      label={sf.name}
                      isChecked={activeSavedFilterId === sf.id}
                      onClick={() => { setActiveSavedFilterId(activeSavedFilterId === sf.id ? null : sf.id); setQuickFilter(null); closeDropdown(); }}
                    />
                  ))}
                </>
              )}
              {(quickFilter || activeSavedFilterId) && (
                <>
                  <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                  <MenuItemRow label="Clear quick filters" onClick={() => { setQuickFilter(null); setActiveSavedFilterId(null); }} />
                </>
              )}
            </PortalMenu>
          </div>

          {/* more dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              ref={moreBtnRef}
              onClick={() => toggleDropdown('more')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'more'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3, background: 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', color: 'var(--ds-text-subtle, #42526E)',
              }}
              aria-label="More filters"
            >
              <MoreIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'more'} onClose={closeDropdown} triggerRef={moreBtnRef} minWidth={200}>
              <MenuItemRow label="Show hierarchy" onClick={closeDropdown} />
              <MenuItemRow label="Show dependencies" onClick={closeDropdown} />
              <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
              {hasActiveFilters && <MenuItemRow label="Clear all filters" onClick={() => { clearAllFilters(); closeDropdown(); }} />}
            </PortalMenu>
          </div>

          {/* active filter chips */}
          {activeSavedFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px',
              border: '1px solid var(--ds-border-selected, #388BFF)', borderRadius: 3,
              background: 'var(--ds-background-selected, #E9F2FF)',
              fontSize: 12, color: 'var(--ds-link, #0052CC)', fontFamily: 'var(--ds-font-family-body)' }}>
              {activeSavedFilter.name}
              <button
                onClick={() => setActiveSavedFilterId(null)}
                style={{ display: 'flex', alignItems: 'center', padding: 0, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: 'var(--ds-link, #0052CC)', lineHeight: 1 }}
                aria-label={`Remove filter: ${activeSavedFilter.name}`}
              >×</button>
            </div>
          )}
          {quickFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px',
              border: '1px solid var(--ds-border-selected, #388BFF)', borderRadius: 3,
              background: 'var(--ds-background-selected, #E9F2FF)',
              fontSize: 12, color: 'var(--ds-link, #0052CC)', fontFamily: 'var(--ds-font-family-body)' }}>
              {BUILT_IN_QUICK_FILTERS.find(f => f.value === quickFilter)?.label ?? quickFilter}
              <button
                onClick={() => setQuickFilter(null)}
                style={{ display: 'flex', alignItems: 'center', padding: 0, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: 'var(--ds-link, #0052CC)', lineHeight: 1 }}
                aria-label={`Remove filter: ${quickFilter}`}
              >×</button>
            </div>
          )}
          {assigneeFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px',
              border: '1px solid var(--ds-border-selected, #388BFF)', borderRadius: 3,
              background: 'var(--ds-background-selected, #E9F2FF)',
              fontSize: 12, color: 'var(--ds-link, #0052CC)', fontFamily: 'var(--ds-font-family-body)' }}>
              {assigneeFilter}
              <button
                onClick={() => setAssigneeFilter(null)}
                style={{ display: 'flex', alignItems: 'center', padding: 0, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: 'var(--ds-link, #0052CC)', lineHeight: 1 }}
                aria-label={`Remove assignee filter: ${assigneeFilter}`}
              >×</button>
            </div>
          )}
          {/* clear all filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, height: 28, padding: '0 8px',
                border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
                background: 'var(--ds-background-neutral, #F1F2F4)',
                cursor: 'pointer', fontSize: 12, color: 'var(--ds-text-subtle, #42526E)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* right: view settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            ref={viewSettingsBtnRef}
            onClick={() => setViewSettingsOpen(v => !v)}
            aria-label="View settings"
            aria-haspopup="dialog"
            aria-expanded={viewSettingsOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 8px',
              border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
              background: viewSettingsOpen ? 'var(--ds-background-neutral-hovered, #EBECF0)' : 'var(--ds-surface, #FFFFFF)',
              cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
              fontFamily: 'var(--ds-font-family-body)',
            }}
          >
            <SettingsIcon label="" size="small" />
            {!isNarrow && 'View settings'}
          </button>
          {viewSettingsOpen && (
            <ViewSettingsPanel
              showProgress={showProgress}
              showReleases={showReleases}
              onToggleProgress={() => setShowProgress(v => !v)}
              onToggleReleases={() => setShowReleases(v => !v)}
              onClose={() => setViewSettingsOpen(false)}
              triggerRef={viewSettingsBtnRef}
            />
          )}
        </div>
      </div>

      {/* ── body: sidebar + divider + grid ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── sidebar panel ── */}
        {!isNarrow && (
          <div style={{
            width: sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* sidebar header */}
            <div
              role="columnheader"
              aria-label="Work"
              style={{
                height: doubleHeaderH, flexShrink: 0,
                borderBottom: '1px solid var(--ds-border, #DFE1E6)',
                background: 'var(--ds-surface-sunken, #F7F8F9)',
                display: 'flex', alignItems: 'flex-end', padding: '0 8px 8px', gap: 8,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', letterSpacing: '0.04em' }}>
                Work
              </span>
            </div>

            {/* sidebar body — scrollable */}
            <div ref={sidebarBodyRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {/* releases section */}
              {showReleases && (
                <div
                  role="row"
                  style={{
                    height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4,
                    borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
                    background: 'var(--ds-background-neutral-subtle, #F7F8F9)', cursor: 'pointer',
                  }}
                  onClick={() => setReleasesCollapsed(v => !v)}
                >
                  <div style={{ color: 'var(--ds-text-subtlest, #626F86)', lineHeight: 0 }}>
                    {releasesCollapsed
                      ? <ChevronRightIcon label="Expand releases" size="small" />
                      : <ChevronDownIcon label="Collapse releases" size="small" />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ds-text, #172B4D)' }}>
                    Releases
                  </span>
                </div>
              )}

              {rows.map(({ issue, depth }) => (
                <SidebarRow
                  key={issue.issueKey}
                  issue={issue}
                  depth={depth}
                  collapsed={collapsed.has(issue.issueKey)}
                  onToggle={toggleCollapse}
                  showProgress={showProgress}
                  projectKey={projectKey ?? ''}
                  queryClient={queryClient}
                />
              ))}

              {rows.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>
                  No issues match your filters
                </div>
              )}

              {/* Create Epic — last row in scrollable list, matches Jira pattern */}
              <div style={{
                height: ROW_H,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 8,
                paddingRight: 4,
                gap: 6,
                borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
              }}>
                {creatingEpic ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{ flexShrink: 0 }}>
                      <JiraIssueTypeIcon type="Epic" size={14} />
                    </div>
                    <input
                      ref={epicInputRef}
                      value={epicSummary}
                      onChange={e => setEpicSummary(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateEpic();
                        if (e.key === 'Escape') { setCreatingEpic(false); setEpicSummary(''); }
                      }}
                      placeholder="What needs to be done?"
                      style={{
                        flex: 1,
                        height: 28,
                        padding: '0 8px',
                        border: '1px solid var(--ds-border-focused, #388BFF)',
                        borderRadius: 3,
                        fontSize: 13,
                        background: 'var(--ds-background-input, #FFFFFF)',
                        outline: 'none',
                        fontFamily: 'var(--ds-font-family-body)',
                        color: 'var(--ds-text, #172B4D)',
                      }}
                    />
                    <button
                      onClick={handleCreateEpic}
                      disabled={!epicSummary.trim()}
                      style={{
                        ...iconBtnStyle,
                        color: !epicSummary.trim()
                          ? 'var(--ds-text-disabled, #A5ADBA)'
                          : 'var(--ds-text-success, #1F845A)',
                      }}
                      title="Save epic"
                    >
                      <EditorDoneIcon label="Save" size="small" />
                    </button>
                    <button
                      onClick={() => { setCreatingEpic(false); setEpicSummary(''); }}
                      style={iconBtnStyle}
                      title="Cancel"
                    >
                      <CrossIcon label="Cancel" size="small" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreatingEpic(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      width: '100%',
                      padding: '6px 4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--ds-text-subtle, #42526E)',
                      borderRadius: 3,
                      fontFamily: 'var(--ds-font-family-body)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <EditorAddIcon label="" size="small" />
                    Create epic
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── drag divider ── */}
        {!isNarrow && (
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            tabIndex={0}
            onMouseDown={e => {
              e.preventDefault();
              setSidebarResizing({ originX: e.clientX, originWidth: sidebarWidth });
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setSidebarWidth(w => Math.max(MIN_SIDEBAR_W, w - (e.shiftKey ? 40 : 10)));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setSidebarWidth(w => Math.min(MAX_SIDEBAR_W, w + (e.shiftKey ? 40 : 10)));
              }
            }}
            style={{
              width: 4, flexShrink: 0, cursor: 'col-resize', outline: 'none',
              background: sidebarResizing
                ? 'var(--ds-background-selected-bold, #0052CC)'
                : 'var(--ds-border, #DFE1E6)',
              transition: sidebarResizing ? 'none' : 'background 120ms ease',
            }}
            onFocus={e => { e.currentTarget.style.background = 'var(--ds-border-selected, #388BFF)'; }}
            onBlur={e => { e.currentTarget.style.background = 'var(--ds-border, #DFE1E6)'; }}
            onMouseEnter={e => { if (!sidebarResizing) e.currentTarget.style.background = 'var(--ds-border-selected, #388BFF)'; }}
            onMouseLeave={e => { if (!sidebarResizing) e.currentTarget.style.background = 'var(--ds-border, #DFE1E6)'; }}
          />
        )}

        {/* ── grid panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* sticky date header */}
          <div
            ref={headerScrollRef}
            role="row"
            style={{
              overflow: 'hidden', flexShrink: 0,
              background: 'var(--ds-surface-sunken, #F7F8F9)',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
            }}
          >
            <div style={{ width: gridWidth }}>
              {/* main header */}
              <div
                role="rowgroup"
                style={{ height: HEADER_H, position: 'relative', borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)' }}
              >
                {headerCols.map((col, i) => (
                  <div
                    key={i}
                    role="columnheader"
                    style={{
                      position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                      borderRight: '1px solid var(--ds-border-subtle, #EBECF0)', overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #626F86)', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* sub header */}
              <div style={{ height: HEADER_H, position: 'relative' }}>
                {subHeaderCols.map((col, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                    display: 'flex', alignItems: 'center', paddingLeft: 4,
                    borderRight: '1px solid var(--ds-border-subtle, #EBECF0)', overflow: 'hidden',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--ds-text-subtlest, #626F86)', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* grid body */}
          <div
            ref={gridRef}
            role="grid"
            aria-label="Timeline grid"
            style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          >
            <div style={{ width: gridWidth, height: contentHeight, position: 'relative' }}>

              {/* vertical grid lines */}
              {gridLines.map((x, i) => (
                <div key={i} style={{
                  position: 'absolute', top: 0, bottom: 0, left: x, width: 1,
                  background: 'var(--ds-border-subtle, #EBECF0)', pointerEvents: 'none',
                }} />
              ))}

              {/* today marker */}
              {todayLeft >= 0 && todayLeft <= gridWidth && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: todayLeft, width: 2,
                  background: 'var(--ds-background-information-bold, #388BFF)', zIndex: 5, pointerEvents: 'none',
                }}>
                  <div style={{
                    position: 'absolute', top: -2, left: -4, width: 10, height: 10,
                    borderRadius: '50%', background: 'var(--ds-background-information-bold, #388BFF)',
                  }} />
                </div>
              )}

              {/* releases row in grid */}
              {showReleases && (
                <div
                  role="row"
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H,
                    background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                    borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
                    display: 'flex', alignItems: 'center',
                  }}
                />
              )}

              {/* row backgrounds */}
              {rows.map(({ issue }, idx) => {
                const rowTop = (showReleases ? ROW_H : 0) + idx * ROW_H;
                return (
                  <div key={issue.issueKey + '_bg'} role="row" style={{
                    position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_H,
                    background: idx % 2 !== 0 ? 'var(--ds-background-neutral-subtle, #F7F8F9)' : 'transparent',
                    borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
                  }} />
                );
              })}

              {/* gantt bars */}
              {rows.map(({ issue }, idx) => {
                const rowTop = (showReleases ? ROW_H : 0) + idx * ROW_H;
                const start = parseDate(issue.startDate);
                const end = parseDate(issue.dueDate);
                if (!start && !end) return null;

                const effectiveStart = start ?? end!;
                const effectiveEnd = end ?? start!;
                const baseLeft = daysBetween(dateRange.start, effectiveStart) * pxPerDay;
                const baseWidth = Math.max(daysBetween(effectiveStart, effectiveEnd) * pxPerDay + pxPerDay, MIN_BAR_W);
                const barTop = rowTop + (ROW_H - BAR_H) / 2;

                const isThisDragging = dragging?.issueKey === issue.issueKey;
                const deltaLeft = isThisDragging && dragging!.edge === 'start' ? livePixelDelta : 0;
                const deltaWidth = isThisDragging ? (dragging!.edge === 'start' ? -livePixelDelta : livePixelDelta) : 0;
                const finalLeft = baseLeft + deltaLeft;
                const finalWidth = Math.max(MIN_BAR_W, baseWidth + deltaWidth);

                const isEpic = issue.issueType === 'Epic';
                const progress = isEpic && issue.children.length > 0 ? computeEpicProgress(issue) : null;

                const tooltipContent = (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{issue.issueKey}: {issue.summary}</div>
                    <div style={{ opacity: 0.85 }}>{issue.startDate ?? '–'} → {issue.dueDate ?? '–'}</div>
                    {issue.assigneeDisplayName && <div style={{ opacity: 0.85 }}>{issue.assigneeDisplayName}</div>}
                    {progress && progress.total > 0 && (
                      <div style={{ opacity: 0.85, fontSize: 11, marginTop: 4 }}>
                        Done: {progress.done} · In Progress: {progress.inProgress} · To Do: {progress.toDo}
                      </div>
                    )}
                    <div style={{ opacity: 0.55, fontSize: 10, marginTop: 4 }}>Drag edges to adjust dates</div>
                  </div>
                );

                const bar = (
                  <div
                    role="gridcell"
                    aria-label={`${issue.issueKey} ${issue.startDate ?? 'no start'} to ${issue.dueDate ?? 'no due'}`}
                    style={{
                      position: 'absolute', top: barTop, left: finalLeft, width: finalWidth, height: BAR_H,
                      borderRadius: 4,
                      background: progress && progress.total > 0 ? 'transparent' : barColor(issue),
                      display: 'flex', alignItems: 'center', paddingLeft: 8, paddingRight: 8,
                      overflow: 'hidden', cursor: 'default',
                      zIndex: isThisDragging ? 10 : 2,
                      boxShadow: isThisDragging ? 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.3))' : 'var(--ds-shadow-raised, 0 1px 2px rgba(9,30,66,0.15))',
                      opacity: isThisDragging ? 0.85 : 1,
                      userSelect: 'none',
                    }}
                  >
                    {/* segmented progress bar for epics */}
                    {progress && progress.total > 0 && (
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round((progress.done / progress.total) * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{ position: 'absolute', inset: 0, borderRadius: 4, display: 'flex', overflow: 'hidden' }}
                      >
                        {progress.done > 0 && <div style={{ flex: progress.done, background: 'var(--ds-chart-success-bold, #94C748)', minWidth: 2 }} />}
                        {progress.inProgress > 0 && <div style={{ flex: progress.inProgress, background: 'var(--ds-chart-information-bold, #8FB8F6)', minWidth: 2 }} />}
                        {progress.toDo > 0 && <div style={{ flex: progress.toDo, background: 'var(--ds-background-neutral, #DDDEE1)', minWidth: 2 }} />}
                      </div>
                    )}

                    {/* left drag handle */}
                    {issue.startDate && (
                      <div
                        onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation();
                          setDragging({ issueKey: issue.issueKey, edge: 'start', originX: e.clientX, originalDate: issue.startDate! });
                          setLivePixelDelta(0);
                        }}
                        style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize',
                          background: 'var(--ds-border-inverse, rgba(255,255,255,0.22))',
                          borderRadius: '4px 0 0 4px', zIndex: 1,
                        }}
                      />
                    )}

                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      color: progress && progress.toDo === progress.total ? 'var(--ds-text, #172B4D)' : 'var(--ds-text-inverse, #FFFFFF)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1, flex: 1,
                      position: 'relative', zIndex: 2,
                    }}>
                      {issue.summary}
                    </span>

                    {/* right drag handle */}
                    {issue.dueDate && (
                      <div
                        onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation();
                          setDragging({ issueKey: issue.issueKey, edge: 'end', originX: e.clientX, originalDate: issue.dueDate! });
                          setLivePixelDelta(0);
                        }}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize',
                          background: 'var(--ds-border-inverse, rgba(255,255,255,0.22))',
                          borderRadius: '0 4px 4px 0', zIndex: 1,
                        }}
                      />
                    )}
                  </div>
                );

                return isThisDragging ? (
                  <React.Fragment key={issue.issueKey}>{bar}</React.Fragment>
                ) : (
                  <Tooltip key={issue.issueKey} content={tooltipContent} position="top">
                    {bar}
                  </Tooltip>
                );
              })}

              {/* inline empty overlay */}
              {!hasAnyDates && <InlineEmptyOverlay projectKey={projectKey ?? ''} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── footer: Today + zoom radio group + Legend ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderTop: '1px solid var(--ds-border, #DFE1E6)',
        background: 'var(--ds-surface-sunken, #F7F8F9)', flexShrink: 0, height: 40,
      }}>
        {/* left: Today */}
        <Tooltip content="Scroll to today" position="top">
          <Button
            appearance="default"
            onClick={scrollToToday}
            iconBefore={<Calendar style={{ width: 12, height: 12 }} />}
          >
            Today
          </Button>
        </Tooltip>

        {/* center: zoom radio group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)', whiteSpace: 'nowrap' }}>
            Timeline time period
          </span>
        <div
          role="radiogroup"
          aria-label="Timeline view to show as"
          style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3, overflow: 'hidden' }}
        >
          {(['week', 'month', 'quarter'] as ZoomLevel[]).map((level, i, arr) => (
            <label
              key={level}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 28, padding: '0 12px', cursor: 'pointer',
                background: zoom === level ? 'var(--ds-background-selected-bold, #0052CC)' : 'var(--ds-surface, #FFFFFF)',
                color: zoom === level ? 'var(--ds-text-inverse, #FFFFFF)' : 'var(--ds-text, #172B4D)',
                fontSize: 13, fontWeight: zoom === level ? 600 : 400,
                borderRight: i < arr.length - 1 ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
                transition: 'background 100ms ease, color 100ms ease',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              <input
                type="radio"
                name="timeline-zoom"
                value={level}
                checked={zoom === level}
                onChange={() => setZoom(level)}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                aria-label={level.charAt(0).toUpperCase() + level.slice(1)}
              />
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </label>
          ))}
        </div>
        </div>

        {/* right: Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { color: 'var(--ds-chart-success-bold, #94C748)', label: 'Done' },
            { color: 'var(--ds-chart-information-bold, #8FB8F6)', label: 'In Progress' },
            { color: 'var(--ds-background-neutral, #DDDEE1)', label: 'To Do' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </AtlaskitPageShell>
  );
}

/* ─────────────────────────────── sidebar row ────────────────────────── */

interface SidebarRowProps {
  issue: TimelineIssue;
  depth: number;
  collapsed: boolean;
  onToggle: (key: string) => void;
  showProgress: boolean;
  projectKey: string;
  queryClient: ReturnType<typeof useQueryClient>;
}

function SidebarRow({ issue, depth, collapsed, onToggle, showProgress, projectKey, queryClient }: SidebarRowProps) {
  const hasChildren = issue.children.length > 0;
  const progress = showProgress && hasChildren ? computeEpicProgress(issue) : null;
  const [rowHovered, setRowHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const handleRemoveDates = async () => {
    setMenuOpen(false);
    try {
      const { data: row } = await (supabase as any).from('ph_issues').select('raw_json').eq('issue_key', issue.issueKey).single();
      if (row?.raw_json) {
        const updated = {
          ...row.raw_json,
          fields: { ...(row.raw_json.fields ?? {}), customfield_10015: null, duedate: null },
        };
        await (supabase as any).from('ph_issues').update({ raw_json: updated }).eq('issue_key', issue.issueKey);
        queryClient.invalidateQueries({ queryKey: ['project-hub-timeline', projectKey] });
      }
    } catch (err) {
      console.warn('remove dates failed:', err);
    }
  };

  return (
    <div
      role="rowheader"
      style={{
        height: ROW_H, display: 'flex', alignItems: 'center',
        paddingLeft: 8 + depth * 16, paddingRight: 4, gap: 4,
        borderBottom: '1px solid var(--ds-border-subtle, #EBECF0)',
        overflow: 'hidden', cursor: hasChildren ? 'pointer' : 'default',
        background: rowHovered
          ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.04))'
          : 'transparent',
        transition: 'background 80ms ease',
        position: 'relative',
      }}
      onClick={hasChildren ? () => onToggle(issue.issueKey) : undefined}
      aria-expanded={hasChildren ? !collapsed : undefined}
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => { if (!menuOpen) setRowHovered(false); }}
    >
      {/* row checkbox */}
      <div
        style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: rowHovered ? 1 : 0, transition: 'opacity 80ms ease' }}
        onClick={e => e.stopPropagation()}
      >
        <input
          type="checkbox"
          aria-label={`Select ${issue.issueKey}`}
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--ds-background-selected-bold, #0052CC)', margin: 0 }}
        />
      </div>

      {/* collapse toggle */}
      <div style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-subtlest, #626F86)' }}>
        {hasChildren && (
          collapsed
            ? <ChevronRightIcon label={`Expand ${issue.issueKey}`} size="small" />
            : <ChevronDownIcon label={`Collapse ${issue.issueKey}`} size="small" />
        )}
      </div>

      {/* type icon */}
      <div style={{ flexShrink: 0 }}>
        <JiraIssueTypeIcon type={issue.issueType} size={14} />
      </div>

      {/* text block */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
        <Tooltip content={issue.summary} position="right">
          <span style={{
            fontSize: 14, fontWeight: 400, color: 'var(--ds-text, #172B4D)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
            display: 'block',
          }}>
            {issue.summary}
          </span>
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {issue.issueKey.includes('-LOCAL-') ? (
            <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #626F86)', fontStyle: 'italic', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
              Saving…
            </span>
          ) : (
            <a
              href={`/project-hub/${issue.projectKey}/backlog?issue=${issue.issueKey}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 14, fontWeight: 500, color: 'var(--ds-text-subtlest, #626F86)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
                textDecoration: 'none',
              }}
            >
              {issue.issueKey}
            </a>
          )}
          {/* mini progress bar */}
          {progress && progress.total > 0 && (
            <div
              aria-hidden="true"
              style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', display: 'flex', minWidth: 20, maxWidth: 60 }}
            >
              {progress.done > 0 && <div style={{ flex: progress.done, background: 'var(--ds-chart-success-bold, #94C748)' }} />}
              {progress.inProgress > 0 && <div style={{ flex: progress.inProgress, background: 'var(--ds-chart-information-bold, #8FB8F6)' }} />}
              {progress.toDo > 0 && <div style={{ flex: progress.toDo, background: 'var(--ds-background-neutral, #DDDEE1)' }} />}
            </div>
          )}
        </div>
      </div>

      {/* ⋯ more-actions button — visible on hover */}
      <button
        ref={menuBtnRef}
        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        aria-label={`More actions for ${issue.issueKey}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        style={{
          ...iconBtnStyle,
          opacity: rowHovered || menuOpen ? 1 : 0,
          transition: 'opacity 80ms ease',
          flexShrink: 0,
        }}
      >
        <MoreIcon label="" size="small" />
      </button>

      {/* per-row more-actions portal menu */}
      <PortalMenu
        isOpen={menuOpen}
        onClose={() => { setMenuOpen(false); setRowHovered(false); }}
        triggerRef={menuBtnRef}
        minWidth={220}
        alignRight
      >
        <MenuItemRow
          label={issue.issueType === 'Epic' ? 'Create issue in epic' : 'Create child issue'}
          onClick={() => setMenuOpen(false)}
        />
        <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
        {issue.issueType === 'Epic' && (
          <MenuItemRow label="Change epic color" onClick={() => setMenuOpen(false)} />
        )}
        <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
        <MenuItemRow label="Edit dates" onClick={() => setMenuOpen(false)} />
        {(issue.startDate || issue.dueDate) && (
          <MenuItemRow label="Remove dates" onClick={handleRemoveDates} danger />
        )}
        <div style={{ padding: '6px 12px', fontSize: 11, fontStyle: 'italic', color: 'var(--ds-text-subtlest, #626F86)', fontFamily: 'var(--ds-font-family-body)' }}>
          Move, reparent &amp; more — coming soon
        </div>
      </PortalMenu>
    </div>
  );
}
