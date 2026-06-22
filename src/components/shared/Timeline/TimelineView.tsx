/**
 * TimelineView — the canonical Gantt/calendar shell used by both
 * ProjectHubTimelinePage AND ProductHubTimelinePage.
 *
 * Pages own their data layer and (optionally) their mutation adapter. The view
 * is purely presentation + interaction: it renders the toolbar, sidebar tree,
 * date grid, Gantt bars, today line, drag handlers, filter dropdowns,
 * bottom bar and detail side panel. Feature flags toggle interactive surfaces
 * (drag, inline create, more-actions menu, create-epic row, empty-row + button)
 * so the same component serves a fully editable project surface and a
 * read-only product surface.
 *
 * Bars vs diamonds: items with both startDate and dueDate render as bars;
 * items with only dueDate render as diamond markers at the due date. Items
 * with neither render no bar (and may show the empty-row + when the
 * onUpdateDates mutation is wired).
 */

import React, { useState, useMemo, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AtlaskitPageShell } from '@/components/ads';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronUpIcon from '@atlaskit/icon/glyph/chevron-up';
import SearchIcon from '@atlaskit/icon/glyph/search';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import EditorAddIcon from '@atlaskit/icon/glyph/editor/add';
import EditorDoneIcon from '@atlaskit/icon/glyph/editor/done';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import Avatar from '@atlaskit/avatar';
import AvatarGroup from '@atlaskit/avatar-group';
import Checkbox from '@atlaskit/checkbox';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  CanonicalFilter,
  emptyCanonicalFilterValue,
  type CanonicalFilterValue,
  type CanonicalStatusOption,
  type CanonicalAssigneeOption,
  type CanonicalWorkTypeOption,
  DEFAULT_CANONICAL_WORK_TYPE_OPTIONS,
} from '@/components/filters/CanonicalFilter';
import { StatusPill } from '@/components/shared/StatusPill';
import { CatalystDetailPanel } from '@/components/shared/CatalystDetailPanel';
import { translate } from '@/lib/jql';
import { resolveAvatarUrl } from '@/lib/avatars';
import {
  type TimelineIssue,
  type TimelineViewProps,
  type ZoomLevel,
  type OpenDropdown,
  ROW_H,
  DEFAULT_SIDEBAR_W,
  MIN_SIDEBAR_W,
  MAX_SIDEBAR_W,
  HEADER_H,
  BAR_H,
  BAR_RADIUS,
  MIN_BAR_W,
  ZOOM_PX_PER_DAY,
  STATUS_CAT_OPTIONS,
  BUILT_IN_QUICK_FILTERS,
} from './types';
import {
  parseDate,
  daysBetween,
  addDays,
  computeDateRange,
  flattenTree,
  collectParentKeys,
  hasAnyDates as hasAnyDatesFn,
  barColor,
  buildHeaderCols,
  buildSubHeaderCols,
  buildGridLines,
  formatDateCompact,
  dateLabelStyle,
  iconBtnStyle,
} from './utils';
import {
  PortalMenu,
  MenuItemRow,
  EmptyRowAdd,
  InlineEmptyOverlay,
  ViewSettingsPanel,
  TimelineBarPopover,
} from './primitives';
import { EditDatesModal } from './EditDatesModal';
import { SidebarRow } from './SidebarRow';
import { TimelineBottomBar } from './TimelineBottomBar';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

const TODAY = new Date();

export default function TimelineView(props: TimelineViewProps) {
  const {
    items: tree,
    isLoading,
    error,
    chromeBand,
    hubLabel,
    hubKey,
    filterOptions,
    buildIssueDetailRoute,
    resolveItemType,
    detailRouteOwnerKey,
    mutations,
    enableRowCheckbox = true,
    enableRowProgress = true,
    enableInlineCreate = true,
    enableRowMenu = true,
    enableBarDrag = true,
    enableCreateEpicRow = true,
    enableEmptyRowAdd = true,
    enableDetailPanel = true,
    createTopLevelConfig = { label: 'Create epic', iconType: 'Epic' },
    childTypesOverride,
    childrenOnlyOnGroupRows = false,
    childrenOnlyOnTopLevel = false,
    menuVariant = 'default',
    detailEntityKind,
  } = props;

  const navigate = useNavigate();
  const { workItemTypes, enableSavedFilters, savedFilters = [] } = filterOptions;

  /* row selection */
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const toggleRowSelection = useCallback((key: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  /* detail side panel */
  const [legendOpen, setLegendOpen] = useState(false);
  const [panelItem, setPanelItem] = useState<{ id: string; itemType: string; displayType: string } | null>(null);
  const closePanel = useCallback(() => setPanelItem(null), []);
  const openDetail = useCallback((issue: TimelineIssue) => {
    const itemType = resolveItemType(issue);
    // For task entities the detail panel reads from `tasks` by row UUID.
    // For release entities the detail panel reads from `rh_releases` by row UUID.
    // For ph_issue entities (default) the lookup token is `issue_key`.
    const id = (detailEntityKind === 'task' || detailEntityKind === 'release') ? issue.id : issue.issueKey;
    setPanelItem({ id, itemType, displayType: issue.issueType ?? 'Story' });
  }, [resolveItemType, detailEntityKind]);
  const goToFullPage = useCallback(() => {
    if (!panelItem) return;
    navigate(buildIssueDetailRoute(panelItem.id));
    closePanel();
  }, [panelItem, navigate, buildIssueDetailRoute, closePanel]);

  /* detail panel width */
  const PANEL_MIN_W = 360;
  const PANEL_MAX_W = 520;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 480;
    try {
      const stored = localStorage.getItem(`timeline-panel-width-${hubKey}`);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n)) return Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, n));
      }
    } catch {}
    return 480;
  });
  const persistPanelWidth = useCallback(
    (w: number) => {
      try { localStorage.setItem(`timeline-panel-width-${hubKey}`, String(w)); } catch {}
    },
    [hubKey]
  );

  /* empty overlay dismiss */
  const [emptyOverlayDismissed, setEmptyOverlayDismissed] = useState(false);

  /* today line ref */
  const todayLineRef = useRef<HTMLDivElement>(null);

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
    try {
      const stored = localStorage.getItem(`tl-sidebar-width-${hubKey}`);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n)) return Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, n));
      }
    } catch {}
    return DEFAULT_SIDEBAR_W;
  });

  const [sidebarResizing, setSidebarResizing] = useState<{ originX: number; originWidth: number } | null>(null);
  const sidebarPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarResizing) return;
    const clamp = (w: number) => Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, w));
    const onMove = (e: MouseEvent) => {
      const next = clamp(sidebarResizing.originWidth + e.clientX - sidebarResizing.originX);
      if (sidebarPanelRef.current) sidebarPanelRef.current.style.width = next + 'px';
    };
    const onUp = (e: MouseEvent) => {
      const final = clamp(sidebarResizing.originWidth + e.clientX - sidebarResizing.originX);
      setSidebarWidth(final);
      setSidebarResizing(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem(`tl-sidebar-width-${hubKey}`, String(final)); } catch {}
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [sidebarResizing, hubKey]);

  /* zoom + collapse */
  const [zoom, setZoom] = useState<ZoomLevel>('month');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /* filters */
  const [searchQuery, setSearchQuery] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string[]>([]);
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
  const [sidebarHidden, setSidebarHidden] = useState(false);

  /* create epic */
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [epicSummary, setEpicSummary] = useState('');
  const epicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingEpic && epicInputRef.current) epicInputRef.current.focus();
  }, [creatingEpic]);

  /* drag-to-resize / drag-to-move bars */
  const [dragging, setDragging] = useState<{
    issueKey: string;
    edge: 'start' | 'end' | 'move';
    originX: number;
    originalStart: string | null;
    originalEnd: string | null;
  } | null>(null);
  const [livePixelDelta, setLivePixelDelta] = useState(0);
  const moveArmRef = useRef<{ issueKey: string; startX: number; originalStart: string | null; originalEnd: string | null } | null>(null);
  const suppressClickRef = useRef(false);
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);
  const [gridDatesIssue, setGridDatesIssue] = useState<TimelineIssue | null>(null);

  /* Local visual override map. On drag release we drop the new dates here
     synchronously — the bar renders from this map until the page-side cache
     update + refetch catch up, then we clear the entry. The API call is
     fire-and-forget from the render's point of view: the bar never waits on
     the network, so the position stays put across the entire commit. */
  type DateOverride = { startDate: string | null; dueDate: string | null };
  const [pendingDateOverrides, setPendingDateOverrides] = useState<Map<string, DateOverride>>(new Map());
  const getEffectiveDates = useCallback((issue: TimelineIssue): DateOverride => {
    const override = pendingDateOverrides.get(issue.issueKey);
    if (override) return override;
    return { startDate: issue.startDate, dueDate: issue.dueDate };
  }, [pendingDateOverrides]);

  /* scroll sync refs */
  const gridRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  /* dropdown trigger refs */
  const typeBtnRef = useRef<HTMLButtonElement>(null);
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

  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; avatarUrl: string | null }[] = [];
    for (const row of allRows) {
      const name = row.issue.assigneeDisplayName;
      if (name && !seen.has(name)) {
        seen.add(name);
        result.push({ name, avatarUrl: resolveAvatarUrl(name) });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  const activeSavedFilter = useMemo(
    () => savedFilters.find(f => f.id === activeSavedFilterId) ?? null,
    [savedFilters, activeSavedFilterId],
  );

  const rows = useMemo(() => {
    let result = allRows;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(({ issue }) =>
        issue.summary.toLowerCase().includes(q) || issue.issueKey.toLowerCase().includes(q)
      );
    }
    if (issueTypeFilter.length > 0) {
      result = result.filter(({ issue }) => issueTypeFilter.includes(issue.issueType ?? ''));
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
    if (activeSavedFilter?.filter_config) {
      const cfg = activeSavedFilter.filter_config as any;
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
    const jqlQuery = (activeSavedFilter as any)?.jql_query;
    if (jqlQuery && typeof jqlQuery === 'string' && jqlQuery.trim()) {
      try {
        const jqlFilters = translate(jqlQuery.trim());
        for (const f of jqlFilters) {
          const vals = Array.isArray(f.value) ? f.value : f.value !== null ? [f.value] : [];
          if (vals.length === 0) continue;
          if (f.column === 'issue_type' && (f.method === 'eq' || f.method === 'in')) {
            result = result.filter(({ issue }) => vals.includes(issue.issueType ?? ''));
          } else if (f.column === 'assignee_display_name' && (f.method === 'eq' || f.method === 'in')) {
            result = result.filter(({ issue }) => vals.includes(issue.assigneeDisplayName ?? ''));
          } else if (f.column === 'status' && (f.method === 'eq' || f.method === 'in')) {
            result = result.filter(({ issue }) => vals.includes(issue.status ?? ''));
          } else if (f.column === 'status_category' && (f.method === 'eq' || f.method === 'in')) {
            result = result.filter(({ issue }) => {
              const cat = (issue.statusCategory ?? '').toLowerCase();
              return vals.some((v: string) => cat.includes(v.toLowerCase()));
            });
          }
        }
      } catch {}
    }
    return result;
  }, [allRows, searchQuery, issueTypeFilter, statusFilter, quickFilter, activeSavedFilter, assigneeFilter]);

  const headerCols = useMemo(() => buildHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const subHeaderCols = useMemo(() => buildSubHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);
  const gridLines = useMemo(() => buildGridLines(dateRange.start, dateRange.end, zoom, pxPerDay), [dateRange, zoom, pxPerDay]);

  const hasAnyDates = useMemo(() => hasAnyDatesFn(tree), [tree]);

  const visibleRowCount = releasesCollapsed ? 0 : rows.length;
  const contentHeight = Math.max(visibleRowCount * ROW_H, 240);
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
      if (todayLineRef.current) {
        const x = todayLeft - grid.scrollLeft;
        todayLineRef.current.style.left = x + 'px';
        todayLineRef.current.style.display = (x >= 0 && x <= grid.clientWidth) ? 'block' : 'none';
      }
      isSyncingScroll.current = false;
    });
  }, [todayLeft]);

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
    document.body.style.cursor = dragging.edge === 'move' ? 'grabbing' : 'ew-resize';
    document.body.style.userSelect = 'none';
    return () => { document.body.style.cursor = ''; document.body.style.userSelect = ''; };
  }, [dragging]);

  /* move-arming */
  useEffect(() => {
    if (!enableBarDrag || !mutations?.onUpdateDates) return;
    const onMove = (e: MouseEvent) => {
      const arm = moveArmRef.current;
      if (!arm || dragging) return;
      if (Math.abs(e.clientX - arm.startX) < 4) return;
      suppressClickRef.current = true;
      setDragging({ issueKey: arm.issueKey, edge: 'move', originX: arm.startX, originalStart: arm.originalStart, originalEnd: arm.originalEnd });
      setLivePixelDelta(e.clientX - arm.startX);
      moveArmRef.current = null;
    };
    const onUp = () => { moveArmRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, enableBarDrag, mutations]);

  /* Bar drag tracking + commit. Commit is fully synchronous from the render's
     POV: we compute the new dates, drop them into `pendingDateOverrides`, and
     clear the drag state in one batch. The DB call runs in the background and
     never gates the visual — the bar renders from the override map until the
     network catches up. */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setLivePixelDelta(e.clientX - dragging.originX);
    const onUp = (e: MouseEvent) => {
      const deltaDays = Math.round((e.clientX - dragging.originX) / pxPerDay);
      const { issueKey, edge, originalStart, originalEnd } = dragging;

      /* Suppress the click event that follows a drag mouseup so the bar's
         onClick doesn't open the detail view. */
      suppressClickRef.current = true;

      if (deltaDays === 0 || !mutations?.onUpdateDates) {
        setDragging(null);
        setLivePixelDelta(0);
        return;
      }
      const iso = (d: string | null) => {
        const base = parseDate(d);
        return base ? addDays(base, deltaDays).toISOString().slice(0, 10) : null;
      };
      let newStart = originalStart;
      let newEnd = originalEnd;
      if (edge === 'start') newStart = iso(originalStart);
      else if (edge === 'end') newEnd = iso(originalEnd);
      else {
        if (originalStart) newStart = iso(originalStart);
        if (originalEnd) newEnd = iso(originalEnd);
      }

      /* 1. Drop the new dates into the visual override map FIRST. The bar's
            next render reads from this map → it stays exactly where the
            user dropped it. */
      setPendingDateOverrides(prev => {
        const next = new Map(prev);
        next.set(issueKey, { startDate: newStart, dueDate: newEnd });
        return next;
      });

      /* 2. Reset drag state in the same React batch — single render, no
            intermediate frame where livePixelDelta=0 + override=missing. */
      setDragging(null);
      setLivePixelDelta(0);

      /* 3. Fire the persistence call in the background. The view never
            awaits it; the bar is already at the new position. When the
            mutation resolves (success or failure) we clear the override
            and let the freshly-cached / refetched data drive the render. */
      const persist = mutations.onUpdateDates(issueKey, newStart, newEnd);
      Promise.resolve(persist)
        .catch((err) => { console.warn('timeline date update failed:', err); })
        .finally(() => {
          setPendingDateOverrides(prev => {
            if (!prev.has(issueKey)) return prev;
            const next = new Map(prev);
            next.delete(issueKey);
            return next;
          });
        });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, pxPerDay, mutations]);

  /* re-center grid when side panel opens */
  useEffect(() => {
    if (!panelItem) return;
    const timer = setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollLeft = Math.max(0, todayLeft - gridRef.current.clientWidth / 2);
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [panelItem, todayLeft]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const parentKeys = useMemo(() => collectParentKeys(tree), [tree]);

  const collapseAll = useCallback(() => setCollapsed(new Set(parentKeys)), [parentKeys]);
  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  /* Default-collapsed on load */
  const initialCollapseKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialCollapseKeyRef.current === hubKey) return;
    if (parentKeys.length === 0) return;
    initialCollapseKeyRef.current = hubKey;
    setCollapsed(new Set(parentKeys));
  }, [hubKey, parentKeys]);

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
    setIssueTypeFilter([]);
    setStatusFilter([]);
    setQuickFilter(null);
    setActiveSavedFilterId(null);
    setAssigneeFilter(null);
  }, []);

  const hasActiveFilters = issueTypeFilter.length > 0 || statusFilter.length > 0 || quickFilter !== null || searchQuery.trim() !== '' || activeSavedFilterId !== null || assigneeFilter !== null;

  const handleCreateEpic = async () => {
    if (!epicSummary.trim()) return;
    if (!mutations?.onCreateEpic) return;
    const summary = epicSummary.trim();
    setCreatingEpic(false);
    setEpicSummary('');
    try {
      await mutations.onCreateEpic(summary);
    } catch (err) {
      console.warn('create epic failed:', err);
    }
  };

  if (isLoading) {
    return (
      <AtlaskitPageShell flush chromeBand={chromeBand}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Spinner size="large" />
        </div>
      </AtlaskitPageShell>
    );
  }

  if (error) {
    return (
      <AtlaskitPageShell flush chromeBand={chromeBand}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p style={{ color: 'var(--ds-text-danger, #AE2A19)', fontSize: 14 }}>Failed to load timeline data.</p>
        </div>
      </AtlaskitPageShell>
    );
  }

  const quickFilterActiveCount = (quickFilter || activeSavedFilterId) ? 1 : 0;
  const showCreateEpicRow = enableCreateEpicRow && !!mutations?.onCreateEpic;
  const showEmptyRowAddButton = enableEmptyRowAdd && !!mutations?.onUpdateDates;

  return (
    <AtlaskitPageShell flush chromeBand={chromeBand}>
    <div
      ref={containerRef}
      role="application"
      aria-label="Timeline"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 124px)',
        background: 'var(--ds-surface, #FFFFFF)', overflow: 'hidden',
        border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
      }}
    >
      {/* ── toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: '1px solid var(--ds-border, #DFE1E6)', flexShrink: 0, gap: 8,
        flexWrap: isNarrow ? 'wrap' : 'nowrap',
      }}>
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

          {/* 2026-06-22 — CanonicalFilter migration. Replaces the prior
              Type / Status / Assignee / Quick filters / Saved filters
              dropdowns with a single canonical surface. Bridge: timeline's
              string[] / single-value state ↔ CanonicalFilterValue. */}
          {(() => {
            const canonicalValue: CanonicalFilterValue = {
              ...emptyCanonicalFilterValue,
              workType: issueTypeFilter,
              status:   statusFilter,
              assignee: assigneeFilter ? [assigneeFilter] : [],
            };
            const handleCanonicalChange = (next: CanonicalFilterValue) => {
              setIssueTypeFilter(next.workType);
              setStatusFilter(next.status);
              setAssigneeFilter(next.assignee.length > 0 ? next.assignee[0] : null);
            };
            const canonicalStatusOptions: CanonicalStatusOption[] = STATUS_CAT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }));
            const canonicalAssigneeOptions: CanonicalAssigneeOption[] = assigneeOptions.map((a) => ({
              id: a.name,
              label: a.name,
              avatarUrl: a.avatarUrl ?? undefined,
            }));
            const canonicalWorkTypeOptions: CanonicalWorkTypeOption[] = workItemTypes.length > 0
              ? workItemTypes.map((t) => ({ id: t, label: t, icon: <JiraIssueTypeIcon type={t} size={14} /> }))
              : DEFAULT_CANONICAL_WORK_TYPE_OPTIONS;
            return (
              <CanonicalFilter
                value={canonicalValue}
                onChange={handleCanonicalChange}
                scopeType="timeline"
                scopeKey={hubKey}
                statusOptions={canonicalStatusOptions}
                assigneeOptions={canonicalAssigneeOptions}
                workTypeOptions={canonicalWorkTypeOptions}
                myFilters={(savedFilters ?? []).map((f) => ({ id: f.id, name: f.name }))}
              />
            );
          })()}

          {/* type filter — LEGACY (now hidden, replaced above) */}
          {false && (<>
          {/* type filter */}
          <div style={{ position: 'relative' }}>
            <button
              ref={typeBtnRef}
              onClick={() => toggleDropdown('type')}
              aria-haspopup="menu"
              aria-expanded={openDropdown === 'type'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                height: 32, padding: '0 8px', border: `1px solid ${issueTypeFilter.length > 0 ? 'var(--ds-border-selected, #388BFF)' : 'var(--ds-border, #DFE1E6)'}`,
                borderRadius: 3, background: issueTypeFilter.length > 0 ? 'var(--ds-background-selected, #E9F2FF)' : 'var(--ds-surface, #FFFFFF)',
                cursor: 'pointer', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                fontFamily: 'var(--ds-font-family-body)',
              }}
            >
              Work item type
              {issueTypeFilter.length > 0 && <span style={{ fontSize: 11, background: 'var(--ds-background-selected-bold, #0052CC)', color: 'var(--ds-text-inverse, #FFFFFF)', borderRadius: 2, padding: '0 4px', marginLeft: 4 }}>{issueTypeFilter.length}</span>}
              <ChevronDownIcon label="" size="small" />
            </button>
            <PortalMenu isOpen={openDropdown === 'type'} onClose={closeDropdown} triggerRef={typeBtnRef} minWidth={220}>
              {workItemTypes.map(type => (
                <div
                  key={type}
                  role="menuitem"
                  onClick={() => setIssueTypeFilter(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
                    fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Checkbox label="" isChecked={issueTypeFilter.includes(type)} onChange={() => {}} />
                  <JiraIssueTypeIcon type={type} size={16} />
                  <span>{type}</span>
                </div>
              ))}
              {issueTypeFilter.length > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--ds-border, #DFE1E6)', margin: '4px 0' }} />
                  <MenuItemRow label="Clear type filter" onClick={() => setIssueTypeFilter([])} />
                </>
              )}
            </PortalMenu>
          </div>

          {/* status filter */}
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
                  <StatusPill value={opt.value} label={opt.label} />
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
              {assigneeOptions.map(opt => (
                <div
                  key={opt.name}
                  role="menuitem"
                  onClick={() => { setAssigneeFilter(assigneeFilter === opt.name ? null : opt.name); closeDropdown(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
                    fontSize: 14, color: 'var(--ds-text, #172B4D)', fontFamily: 'var(--ds-font-family-body)',
                    background: assigneeFilter === opt.name ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = assigneeFilter === opt.name ? 'var(--ds-background-selected, #E9F2FE)' : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = assigneeFilter === opt.name ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent'; }}
                >
                  <span style={{ display: 'inline-flex', borderRadius: '50%', outline: assigneeFilter === opt.name ? '2px solid var(--ds-border-selected, #388BFF)' : '2px solid transparent', outlineOffset: 1 }}>
                    <Avatar size="xsmall" src={opt.avatarUrl ?? undefined} name={opt.name} />
                  </span>
                  <span>{opt.name}</span>
                </div>
              ))}
              {assigneeOptions.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>No assignees in view</div>
              )}
            </PortalMenu>
          </div>

          {/* avatar stack */}
          {(() => {
            const active = assigneeOptions.filter(a => a.avatarUrl);
            if (!active.length) return null;
            return (
              <AvatarGroup
                appearance="stack"
                size="small"
                maxCount={5}
                label="Filter by assignee"
                data={active.map(a => ({ key: a.name, name: a.name, src: a.avatarUrl ?? undefined }))}
                onAvatarClick={(_e, _analytics, index) => {
                  const a = active[index];
                  if (!a) return;
                  setAssigneeFilter(prev => prev === a.name ? null : a.name);
                }}
              />
            );
          })()}

          {/* quick filters + saved filters */}
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
              {enableSavedFilters && savedFilters.length > 0 && (
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
          </>)}

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

        {!isNarrow && !sidebarHidden && (
          <div ref={sidebarPanelRef} style={{
            width: sidebarWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div
              role="columnheader"
              aria-label="Work"
              style={{
                height: doubleHeaderH, flexShrink: 0,
                borderBottom: '2px solid var(--ds-border, #DFE1E6)',
                background: 'var(--ds-surface-sunken, #F7F8F9)',
                display: 'flex', alignItems: 'center',
                padding: '0 8px 0 12px',
                justifyContent: 'space-between',
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: 653,
                color: 'var(--ds-text, #172B4D)',
                letterSpacing: '0.01em',
                userSelect: 'none',
              }}>
                Work
              </span>
              {parentKeys.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'var(--ds-surface, #FFFFFF)',
                  boxShadow: '0 1px 2px rgba(9,30,66,0.08)',
                }}>
                  <Tooltip content="Expand all" position="top">
                    <button
                      onClick={expandAll}
                      aria-label="Expand all rows"
                      title="Expand all"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 2,
                        height: 26, padding: '0 7px',
                        border: 'none',
                        borderRight: '1px solid var(--ds-border, #DFE1E6)',
                        background: collapsed.size === 0 ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                        cursor: 'pointer',
                        color: collapsed.size === 0 ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
                        transition: 'background 0.1s, color 0.1s',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronDownIcon label="" size="small" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Collapse all" position="top">
                    <button
                      onClick={collapseAll}
                      aria-label="Collapse all rows"
                      title="Collapse all"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 2,
                        height: 26, padding: '0 7px',
                        border: 'none',
                        background: collapsed.size === parentKeys.length ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
                        cursor: 'pointer',
                        color: collapsed.size === parentKeys.length ? 'var(--ds-link, #0052CC)' : 'var(--ds-text-subtle, #42526E)',
                        transition: 'background 0.1s, color 0.1s',
                        flexShrink: 0,
                      }}
                    >
                      <ChevronUpIcon label="" size="small" />
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>

            <div ref={sidebarBodyRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              {showReleases && (
                <div
                  role="row"
                  style={{
                    height: 36, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4,
                    borderBottom: '1px solid rgba(9,30,66,0.06)',
                    background: 'var(--ds-background-neutral-subtle, #F7F8F9)', cursor: 'pointer',
                  }}
                  onClick={() => setReleasesCollapsed(v => !v)}
                >
                  <div style={{
                    color: 'var(--ds-text-subtlest, #626F86)', lineHeight: 0,
                    transform: releasesCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}>
                    <ChevronDownIcon label={releasesCollapsed ? 'Expand releases' : 'Collapse releases'} size="small" />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)' }}>
                    {hubLabel}
                  </span>
                </div>
              )}

              {!releasesCollapsed && rows.map(({ issue, depth }) => {
                /* Siblings = same-parent peers in render order. Top-level
                   rows share the `tree` array; nested rows share their
                   parent's children. Only consumed by the `jira` menu
                   variant's Move submenu. Walks the whole tree so rows
                   below depth 1 also resolve correctly. */
                let siblings: TimelineIssue[] = [];
                if (menuVariant === 'jira') {
                  if (depth === 0) {
                    siblings = tree;
                  } else {
                    const findSiblings = (list: TimelineIssue[]): TimelineIssue[] | null => {
                      for (const node of list) {
                        if (node.children.some(c => c.issueKey === issue.issueKey)) return node.children;
                        if (node.children.length) {
                          const inner = findSiblings(node.children);
                          if (inner) return inner;
                        }
                      }
                      return null;
                    };
                    siblings = findSiblings(tree) ?? [];
                  }
                }
                return (
                  <SidebarRow
                    key={issue.issueKey}
                    issue={issue}
                    depth={depth}
                    collapsed={collapsed.has(issue.issueKey)}
                    onToggle={toggleCollapse}
                    isSelected={selectedRows.has(issue.issueKey)}
                    onSelect={toggleRowSelection}
                    onOpenDetail={openDetail}
                    buildIssueDetailRoute={buildIssueDetailRoute}
                    allItems={tree}
                    enableCheckbox={enableRowCheckbox}
                    enableProgress={enableRowProgress}
                    enableInlineCreate={enableInlineCreate}
                    enableMenu={enableRowMenu}
                    mutations={mutations}
                    childTypesOverride={childTypesOverride}
                    childrenOnlyOnGroupRows={childrenOnlyOnGroupRows}
                    childrenOnlyOnTopLevel={childrenOnlyOnTopLevel}
                    menuVariant={menuVariant}
                    siblings={siblings}
                  />
                );
              })}

              {rows.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ds-text-subtlest, #626F86)' }}>
                  No issues match your filters
                </div>
              )}

              {/* Create Epic row */}
              {showCreateEpicRow && (
                <div style={{
                  height: ROW_H,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  paddingRight: 4,
                  gap: 6,
                  borderBottom: '1px solid rgba(9,30,66,0.06)',
                }}>
                  {creatingEpic ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                      <div style={{ flexShrink: 0 }}>
                        <JiraIssueTypeIcon type={createTopLevelConfig.iconType} size={14} />
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
                      {createTopLevelConfig.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!isNarrow && !sidebarHidden && (
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            tabIndex={0}
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
              width: 2, flexShrink: 0, position: 'relative', outline: 'none',
              background: sidebarResizing
                ? 'var(--ds-background-selected-bold, #0052CC)'
                : 'var(--ds-border, #DFE1E6)',
              transition: sidebarResizing ? 'none' : 'background 120ms ease',
            }}
            onFocus={e => { e.currentTarget.style.background = 'var(--ds-border-selected, #388BFF)'; }}
            onBlur={e => { if (!sidebarResizing) e.currentTarget.style.background = 'var(--ds-border, #DFE1E6)'; }}
          >
            <div
              aria-hidden
              onMouseDown={e => {
                e.preventDefault();
                setSidebarResizing({ originX: e.clientX, originWidth: sidebarWidth });
              }}
              onMouseEnter={e => { const p = e.currentTarget.parentElement; if (p && !sidebarResizing) p.style.background = 'var(--ds-border-selected, #388BFF)'; }}
              onMouseLeave={e => { const p = e.currentTarget.parentElement; if (p && !sidebarResizing) p.style.background = 'var(--ds-border, #DFE1E6)'; }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: -3, width: 8, cursor: 'col-resize', zIndex: 1 }}
            />
          </div>
        )}

        {/* ── grid panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {todayLeft >= 0 && (
            <div
              ref={todayLineRef}
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: todayLeft,
                width: 1.5,
                background: 'var(--ds-chart-danger-bold, #E34935)',
                zIndex: 8, pointerEvents: 'none',
                display: todayLeft >= 0 ? 'block' : 'none',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: -4,
                width: 0, height: 0,
                borderLeft: '4.5px solid transparent',
                borderRight: '4.5px solid transparent',
                borderTop: '7px solid var(--ds-chart-danger-bold, #E34935)',
              }} />
            </div>
          )}

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
              <div
                role="rowgroup"
                style={{ height: HEADER_H, position: 'relative', borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}
              >
                {headerCols.map((col, i) => (
                  <div
                    key={i}
                    role="columnheader"
                    style={{
                      position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                      display: 'flex', alignItems: 'center', paddingLeft: 8,
                      borderRight: '1px solid var(--ds-border, #DFE1E6)', overflow: 'hidden',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ height: HEADER_H, position: 'relative' }}>
                {subHeaderCols.map((col, i) => (
                  <div key={i} style={{
                    position: 'absolute', left: col.left, width: col.width, height: HEADER_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 0,
                    borderRight: '1px solid var(--ds-border, #DFE1E6)', overflow: 'hidden',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ds-text-subtle, #44546F)', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label="Timeline grid"
            style={{ flex: 1, overflow: 'auto', position: 'relative' }}
          >
            <div style={{ width: gridWidth, height: contentHeight, position: 'relative' }}>

              {showReleases && (
                <div
                  role="row"
                  style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: ROW_H,
                    background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
                    borderBottom: '1px solid rgba(9,30,66,0.06)',
                    display: 'flex', alignItems: 'center',
                  }}
                />
              )}

              {!releasesCollapsed && rows.map(({ issue }, idx) => {
                const rowTop = (showReleases ? ROW_H : 0) + idx * ROW_H;
                return (
                  <div key={issue.issueKey + '_bg'} role="row" style={{
                    position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_H,
                    background: 'transparent',
                    borderBottom: '1px solid rgba(9,30,66,0.06)',
                  }} />
                );
              })}

              {/* gantt bars + diamond markers */}
              {!releasesCollapsed && rows.map(({ issue }, idx) => {
                /* Group rows are sidebar-only — no bar/diamond on the grid. */
                if (issue.isGroup) return null;
                const rowTop = (showReleases ? ROW_H : 0) + idx * ROW_H;
                /* Effective dates read from the override map first — if the
                   user just dropped this bar, the override drives position
                   until the data layer catches up. */
                const effectiveDates = getEffectiveDates(issue);
                const start = parseDate(effectiveDates.startDate);
                const end = parseDate(effectiveDates.dueDate);
                if (!start && !end) return null;

                /* Diamond marker — only dueDate present (typical for Business Requests). */
                const isPointMarker = !start && !!end;
                if (isPointMarker) {
                  const center = daysBetween(dateRange.start, end!) * pxPerDay + pxPerDay / 2;
                  const diamondSize = 18;
                  const left = center - diamondSize / 2;
                  const top = rowTop + (ROW_H - diamondSize) / 2;
                  const fill = barColor(issue);
                  const showLabels = hoveredBarKey === issue.issueKey;
                  return (
                    <React.Fragment key={issue.issueKey}>
                      <TimelineBarPopover issue={issue} disabled={false}>
                        <div
                          onMouseEnter={() => setHoveredBarKey(issue.issueKey)}
                          onMouseLeave={() => setHoveredBarKey(k => (k === issue.issueKey ? null : k))}
                          onClick={e => { e.stopPropagation(); navigate(buildIssueDetailRoute(issue.issueKey)); }}
                          aria-label={`${issue.issueKey} due ${effectiveDates.dueDate}`}
                          role="gridcell"
                          style={{
                            position: 'absolute', top, left, width: diamondSize, height: diamondSize,
                            background: fill,
                            transform: 'rotate(45deg)',
                            borderRadius: 2,
                            cursor: 'pointer',
                            zIndex: 2,
                            boxShadow: '0 1px 2px rgba(9,30,66,0.18)',
                          }}
                        />
                      </TimelineBarPopover>
                      {showLabels && (
                        <div style={dateLabelStyle(left + diamondSize, top, 'start')}>
                          {formatDateCompact(effectiveDates.dueDate)}
                        </div>
                      )}
                    </React.Fragment>
                  );
                }

                const effectiveStart = start ?? end!;
                const effectiveEnd = end ?? start!;
                const baseLeft = daysBetween(dateRange.start, effectiveStart) * pxPerDay;
                const baseWidth = Math.max(daysBetween(effectiveStart, effectiveEnd) * pxPerDay + pxPerDay, MIN_BAR_W);
                const barTop = rowTop + (ROW_H - BAR_H) / 2;

                const isThisDragging = dragging?.issueKey === issue.issueKey;
                const dragEdge = isThisDragging ? dragging!.edge : null;
                const deltaLeft = dragEdge === 'start' || dragEdge === 'move' ? livePixelDelta : 0;
                const deltaWidth = dragEdge === 'start' ? -livePixelDelta : dragEdge === 'end' ? livePixelDelta : 0;
                const finalLeft = baseLeft + deltaLeft;
                const finalWidth = Math.max(MIN_BAR_W, baseWidth + deltaWidth);

                const borderColor = barColor(issue);

                const liveDeltaDays = isThisDragging ? Math.round(livePixelDelta / pxPerDay) : 0;
                const startShift = dragEdge === 'start' || dragEdge === 'move' ? liveDeltaDays : 0;
                const endShift = dragEdge === 'end' || dragEdge === 'move' ? liveDeltaDays : 0;
                const liveStartLabel = effectiveDates.startDate ? formatDateCompact(addDays(effectiveStart, startShift).toISOString().slice(0, 10)) : '';
                const liveEndLabel = effectiveDates.dueDate ? formatDateCompact(addDays(effectiveEnd, endShift).toISOString().slice(0, 10)) : '';
                const showLabels = hoveredBarKey === issue.issueKey || isThisDragging;
                const dragEnabled = enableBarDrag && !!mutations?.onUpdateDates;

                const bar = (
                  <div
                    role="gridcell"
                    aria-label={`${issue.issueKey} ${effectiveDates.startDate ?? 'no start'} to ${effectiveDates.dueDate ?? 'no due'}`}
                    onMouseEnter={() => setHoveredBarKey(issue.issueKey)}
                    onMouseLeave={() => setHoveredBarKey(k => (k === issue.issueKey ? null : k))}
                    onMouseDown={e => {
                      if (!dragEnabled || dragging) return;
                      moveArmRef.current = { issueKey: issue.issueKey, startX: e.clientX, originalStart: effectiveDates.startDate, originalEnd: effectiveDates.dueDate };
                    }}
                    onClick={e => {
                      if (suppressClickRef.current) { suppressClickRef.current = false; e.stopPropagation(); return; }
                      if (!dragging) { e.stopPropagation(); navigate(buildIssueDetailRoute(issue.issueKey)); }
                    }}
                    style={{
                      position: 'absolute', top: barTop, left: finalLeft, width: finalWidth, height: BAR_H,
                      borderRadius: BAR_RADIUS,
                      background: 'var(--ds-surface, #FFFFFF)',
                      border: `2px solid ${borderColor}`,
                      display: 'flex', alignItems: 'center', paddingLeft: 6, paddingRight: 6,
                      overflow: 'hidden',
                      cursor: isThisDragging ? (dragEdge === 'move' ? 'grabbing' : 'ew-resize') : (dragEnabled ? 'grab' : 'pointer'),
                      zIndex: isThisDragging ? 10 : 2,
                      boxShadow: isThisDragging ? 'var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.3))' : 'none',
                      opacity: isThisDragging ? 0.9 : 1,
                      userSelect: 'none',
                      boxSizing: 'border-box',
                      /* No CSS transition on left/width — during drag the bar follows
                         livePixelDelta directly, and on commit the override map already
                         holds the final dates, so any transition would actively animate
                         a snap-back-then-forward and re-introduce the flicker. */
                      transition: 'box-shadow 120ms ease',
                    }}
                  >
                    {dragEnabled && effectiveDates.startDate && (
                      <div
                        onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation();
                          setDragging({ issueKey: issue.issueKey, edge: 'start', originX: e.clientX, originalStart: effectiveDates.startDate, originalEnd: effectiveDates.dueDate });
                          setLivePixelDelta(0);
                        }}
                        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3 }}
                      />
                    )}

                    {finalWidth >= 60 && (
                      <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: 'var(--ds-text, #172B4D)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1, flex: 1,
                        position: 'relative', zIndex: 2, pointerEvents: 'none',
                      }}>
                        {issue.summary}
                      </span>
                    )}

                    {dragEnabled && effectiveDates.dueDate && (
                      <div
                        onMouseDown={e => {
                          e.preventDefault(); e.stopPropagation();
                          setDragging({ issueKey: issue.issueKey, edge: 'end', originX: e.clientX, originalStart: effectiveDates.startDate, originalEnd: effectiveDates.dueDate });
                          setLivePixelDelta(0);
                        }}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', zIndex: 3 }}
                      />
                    )}
                  </div>
                );

                return (
                  <React.Fragment key={issue.issueKey}>
                    <TimelineBarPopover issue={issue} disabled={isThisDragging}>
                      {bar}
                    </TimelineBarPopover>
                    {showLabels && liveStartLabel && (
                      <div style={dateLabelStyle(finalLeft, barTop, 'start')}>{liveStartLabel}</div>
                    )}
                    {showLabels && liveEndLabel && (
                      <div style={dateLabelStyle(finalLeft + finalWidth, barTop, 'end')}>{liveEndLabel}</div>
                    )}
                  </React.Fragment>
                );
              })}

              {showEmptyRowAddButton && !releasesCollapsed && rows.map(({ issue }, idx) => {
                if (issue.isGroup) return null;
                if (issue.startDate || issue.dueDate) return null;
                const rowTop = (showReleases ? ROW_H : 0) + idx * ROW_H;
                return (
                  <EmptyRowAdd
                    key={issue.issueKey + '_add'}
                    rowTop={rowTop}
                    addLeft={Math.max(8, Math.min(todayLeft, gridWidth - 32))}
                    onAdd={() => setGridDatesIssue(issue)}
                  />
                );
              })}

              {!hasAnyDates && !emptyOverlayDismissed && (
                <InlineEmptyOverlay projectKey={hubLabel} onDismiss={() => setEmptyOverlayDismissed(true)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {gridDatesIssue && mutations?.onUpdateDates && (
        <EditDatesModal
          issue={gridDatesIssue}
          onClose={() => setGridDatesIssue(null)}
          onSave={(start, due) => mutations.onUpdateDates!(gridDatesIssue.issueKey, start, due)}
        />
      )}

      <TimelineBottomBar
        zoom={zoom}
        onZoomChange={setZoom}
        onScrollToToday={scrollToToday}
        onToggleLegend={() => setLegendOpen(v => !v)}
        legendOpen={legendOpen}
        onToggleSidePanel={() => setSidebarHidden(v => !v)}
        sidePanelOpen={!sidebarHidden && !isNarrow}
        detailPanelWidth={panelItem ? panelWidth : 0}
      />
    </div>
    {enableDetailPanel && panelItem && (
      <CatalystDetailPanel
        isOpen
        onClose={closePanel}
        itemId={panelItem.id}
        itemType={panelItem.itemType}
        typeIconLabel={panelItem.displayType}
        projectKey={detailRouteOwnerKey}
        onOpenFullPage={goToFullPage}
        width={panelWidth}
        onResize={setPanelWidth}
        onResizeCommit={persistPanelWidth}
        minWidth={PANEL_MIN_W}
        maxWidth={PANEL_MAX_W}
        entityKind={detailEntityKind}
      />
    )}
    </AtlaskitPageShell>
  );
}
