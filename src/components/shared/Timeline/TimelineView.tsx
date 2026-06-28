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

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AtlaskitPageShell } from "@/components/ads";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/glyph/chevron-up";
import SearchIcon from "@atlaskit/icon/glyph/search";
import SettingsIcon from "@atlaskit/icon/glyph/settings";
import EditorAddIcon from "@atlaskit/icon/glyph/editor/add";
import EditorDoneIcon from "@atlaskit/icon/glyph/editor/done";
import CrossIcon from "@atlaskit/icon/glyph/cross";
import Spinner from "@atlaskit/spinner";
import Tooltip from "@atlaskit/tooltip";
import Avatar from "@atlaskit/avatar";
import AvatarGroup from "@atlaskit/avatar-group";
import Checkbox from "@atlaskit/checkbox";
import Modal, {
  ModalTransition,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@atlaskit/modal-dialog";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import { ProjectIcon } from "@/components/shared/ProjectIcon";
import { useJiraProjects } from "@/hooks/workhub/useJiraProjects";
import { JiraIssueTypeIcon } from "@/lib/jira-issue-type-icons";
import {
  CanonicalFilter,
  emptyCanonicalFilterValue,
  type CanonicalFilterValue,
  type CanonicalStatusOption,
  type CanonicalAssigneeOption,
  type CanonicalWorkTypeOption,
  DEFAULT_CANONICAL_WORK_TYPE_OPTIONS,
} from "@/components/filters/CanonicalFilter";
import { StatusPill } from "@/components/shared/StatusPill";
import { CatalystDetailPanel } from "@/components/shared/CatalystDetailPanel";
import { translate } from "@/lib/jql";
import { resolveAvatarUrl } from "@/lib/avatars";
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
} from "./types";
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
} from "./utils";
import {
  PortalMenu,
  MenuItemRow,
  EmptyRowAdd,
  InlineEmptyOverlay,
  TimelineEmptyState,
  ViewSettingsPanel,
  TimelineBarPopover,
} from "./primitives";
import { EditDatesModal } from "./EditDatesModal";
import { SidebarRow } from "./SidebarRow";
import { TimelineBottomBar } from "./TimelineBottomBar";
import {
  DependencyColumnHeaders,
  DependencyColumnsBody,
  DependencyAggregatePopover,
  RowDependencyCard,
  DEP_PANEL_W,
} from "./dependencies/DependencyUI";
import { useTimelineDependencies } from "./dependencies/useTimelineDependencies";
import { aggregateGroup, relatedKeys } from "./dependencies/aggregate";
import { getEntry } from "./dependencies/normalize";

const CatalystDetailRouter = lazy(
  () => import("@/components/catalyst-detail-views/CatalystDetailRouter")
);

/** Sentinel rowKey used by the group-header band's aggregate dependency popover. */
const GROUP_DEP_KEY = "__group__";

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
    enableInlineCreate = true,
    enableRowMenu = true,
    enableBarDrag = true,
    enableCreateEpicRow = true,
    enableEmptyRowAdd = true,
    enableDetailPanel = true,
    createTopLevelConfig = { label: "Create epic", iconType: "Epic" },
    childTypesOverride,
    childrenOnlyOnGroupRows = false,
    childrenOnlyOnTopLevel = false,
    menuVariant = "default",
    detailEntityKind,
    buildDependenciesRoute,
    locatedKey,
  } = props;

  const navigate = useNavigate();
  const {
    workItemTypes,
    enableSavedFilters,
    savedFilters = [],
  } = filterOptions;

  /* Jira locate-in-timeline highlight (magenta). Set from the locatedKey
     prop, cleared when the user opens another work item. */
  const [locatedActive, setLocatedActive] = useState<string | null>(null);

  /* row selection */
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const toggleRowSelection = useCallback((key: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /* Shared row hover for List mode — syncs the sidebar + dependency columns. */
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  /* Which row has its inline-create open — the gantt inserts a matching
     #dddee1 row after it so both panels stay aligned. */
  const [inlineCreateKey, setInlineCreateKey] = useState<string | null>(null);
  const handleInlineCreateChange = useCallback((key: string, open: boolean) => {
    setInlineCreateKey(prev => (open ? key : prev === key ? null : prev));
  }, []);

  /* detail side panel */
  const [legendOpen, setLegendOpen] = useState(false);
  const [panelItem, setPanelItem] = useState<{
    id: string;
    itemType: string;
    displayType: string;
  } | null>(null);
  const closePanel = useCallback(() => setPanelItem(null), []);
  const openDetail = useCallback(
    (issue: TimelineIssue) => {
      setLocatedActive(null);
      const itemType = resolveItemType(issue);
      // For task entities the detail panel reads from `tasks` by row UUID.
      // For release entities the detail panel reads from `rh_releases` by row UUID.
      // For ph_issue entities (default) the lookup token is `issue_key`.
      const id =
        detailEntityKind === "task" || detailEntityKind === "release"
          ? issue.id
          : issue.issueKey;
      setPanelItem({ id, itemType, displayType: issue.issueType ?? "Story" });
    },
    [resolveItemType, detailEntityKind]
  );
  const goToFullPage = useCallback(() => {
    if (!panelItem) return;
    navigate(buildIssueDetailRoute(panelItem.id));
    closePanel();
  }, [panelItem, navigate, buildIssueDetailRoute, closePanel]);

  /* detail panel width */
  const PANEL_MIN_W = 360;
  const PANEL_MAX_W = 520;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 480;
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
      try {
        localStorage.setItem(`timeline-panel-width-${hubKey}`, String(w));
      } catch {}
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
    const obs = new ResizeObserver((entries) => {
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
        if (!isNaN(n))
          return Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, n));
      }
    } catch {}
    return DEFAULT_SIDEBAR_W;
  });

  const [sidebarResizing, setSidebarResizing] = useState<{
    originX: number;
    originWidth: number;
  } | null>(null);
  const sidebarPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarResizing) return;
    const clamp = (w: number) =>
      Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, w));
    const onMove = (e: MouseEvent) => {
      const next = clamp(
        sidebarResizing.originWidth + e.clientX - sidebarResizing.originX
      );
      if (sidebarPanelRef.current)
        sidebarPanelRef.current.style.width = next + "px";
    };
    const onUp = (e: MouseEvent) => {
      const final = clamp(
        sidebarResizing.originWidth + e.clientX - sidebarResizing.originX
      );
      setSidebarWidth(final);
      setSidebarResizing(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(`tl-sidebar-width-${hubKey}`, String(final));
      } catch {}
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [sidebarResizing, hubKey]);

  /* zoom + collapse */
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /* filters */
  const [searchQuery, setSearchQuery] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(
    null
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  /* view settings */
  const [showProgress, setShowProgress] = useState(true);
  const [showReleases, setShowReleases] = useState(true);
  const [releasesCollapsed, setReleasesCollapsed] = useState(false);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);

  /* create epic (inline bottom row) */
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [epicSummary, setEpicSummary] = useState("");
  const epicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creatingEpic && epicInputRef.current) epicInputRef.current.focus();
  }, [creatingEpic]);

  /* create work modal */
  const [createWorkOpen, setCreateWorkOpen] = useState(false);
  const [createWorkSummary, setCreateWorkSummary] = useState("");
  const [createWorkType, setCreateWorkType] = useState(
    createTopLevelConfig.iconType
  );
  const [createAnother, setCreateAnother] = useState(false);
  const [isCreatingWork, setIsCreatingWork] = useState(false);
  const workItemBtnRef = useRef<HTMLButtonElement>(null);

  /* Project picker for the Create-work modal (Phase 2). */
  const { data: jiraProjects = [] } = useJiraProjects();
  const currentProjectKey = hubKey
    .replace(/^(project|product)-/, "")
    .toUpperCase();
  const [createProjectKey, setCreateProjectKey] = useState(currentProjectKey);

  const openCreateWork = useCallback(() => {
    setCreateWorkType(createTopLevelConfig.iconType);
    setCreateWorkSummary("");
    setCreateAnother(false);
    setCreateProjectKey(currentProjectKey);
    setCreateWorkOpen(true);
  }, [createTopLevelConfig.iconType, currentProjectKey]);

  const handleCreateWork = useCallback(async () => {
    if (!createWorkSummary.trim() || !mutations?.onCreateEpic) return;
    setIsCreatingWork(true);
    try {
      await mutations.onCreateEpic(createWorkSummary.trim(), createWorkType);
      if (createAnother) {
        setCreateWorkSummary("");
      } else {
        setCreateWorkOpen(false);
        setCreateWorkSummary("");
        setCreateAnother(false);
      }
    } finally {
      setIsCreatingWork(false);
    }
  }, [createWorkSummary, createAnother, mutations]);

  /* drag-to-resize / drag-to-move bars */
  const [dragging, setDragging] = useState<{
    issueKey: string;
    edge: "start" | "end" | "move";
    originX: number;
    originalStart: string | null;
    originalEnd: string | null;
  } | null>(null);
  const [livePixelDelta, setLivePixelDelta] = useState(0);
  const moveArmRef = useRef<{
    issueKey: string;
    startX: number;
    originalStart: string | null;
    originalEnd: string | null;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);
  const [gridDatesIssue, setGridDatesIssue] = useState<TimelineIssue | null>(
    null
  );

  /* Local visual override map. On drag release we drop the new dates here
     synchronously — the bar renders from this map until the page-side cache
     update + refetch catch up, then we clear the entry. The API call is
     fire-and-forget from the render's point of view: the bar never waits on
     the network, so the position stays put across the entire commit. */
  type DateOverride = { startDate: string | null; dueDate: string | null };
  const [pendingDateOverrides, setPendingDateOverrides] = useState<
    Map<string, DateOverride>
  >(new Map());
  const getEffectiveDates = useCallback(
    (issue: TimelineIssue): DateOverride => {
      const override = pendingDateOverrides.get(issue.issueKey);
      if (override) return override;
      return { startDate: issue.startDate, dueDate: issue.dueDate };
    },
    [pendingDateOverrides]
  );

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
  const viewSettingsBtnRef = useRef<HTMLButtonElement>(null);

  /* dependency mode (Show dependencies / saved-view "Dependencies") */
  const depBodyRef = useRef<HTMLDivElement>(null);
  const viewMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [depMode, setDepMode] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [depFilterKey, setDepFilterKey] = useState<string | null>(null);
  const [depCard, setDepCard] = useState<{
    key: string;
    anchor: DOMRect;
  } | null>(null);
  const [depPopover, setDepPopover] = useState<{
    key: string;
    dir: "blockedBy" | "blocks";
    anchor: DOMRect;
  } | null>(null);

  const pxPerDay = ZOOM_PX_PER_DAY[zoom];
  const dateRange = useMemo(() => computeDateRange(tree), [tree]);
  const totalDays = daysBetween(dateRange.start, dateRange.end);
  const gridWidth = Math.max(totalDays * pxPerDay, 800);
  const todayLeft = daysBetween(dateRange.start, TODAY) * pxPerDay;

  const allRows = useMemo(
    // In dependency mode the rows stay fully expanded — collapse state must not
    // hide dependency children (band collapse/expand toggles all of them).
    () => flattenTree(tree, depMode ? new Set<string>() : collapsed),
    [tree, collapsed, depMode]
  );

  /* ── dependency data (single source of truth: ph_issue_dependencies) ── */
  const projectKeysInTree = useMemo(() => {
    const s = new Set<string>();
    const walk = (l: TimelineIssue[]) =>
      l.forEach((n) => {
        if (n.projectKey) s.add(n.projectKey);
        walk(n.children);
      });
    walk(tree);
    return Array.from(s);
  }, [tree]);
  const deps = useTimelineDependencies(projectKeysInTree);
  const keyToIssue = useMemo(() => {
    const m = new Map<string, TimelineIssue>();
    const walk = (l: TimelineIssue[]) =>
      l.forEach((n) => {
        m.set(n.issueKey, n);
        walk(n.children);
      });
    walk(tree);
    /* Enrich with dependency targets that aren't in the loaded (2026-gated)
       tree — synthetic reference rows so the dependency popovers render the
       same icon + summary on BOTH ends. Type is real (from ph_issues) or null
       (no icon — never a fabricated default). */
    for (const [k, meta] of deps.issueMeta) {
      if (m.has(k)) continue;
      m.set(k, {
        id: "",
        issueKey: k,
        projectKey: k.includes("-") ? k.split("-")[0] : "",
        issueType: meta.issueType ?? "",
        summary: meta.summary,
        status: meta.status ?? "",
        statusCategory: null,
        priority: null,
        assigneeDisplayName: meta.assigneeDisplayName,
        assigneeAvatarUrl: resolveAvatarUrl(meta.assigneeDisplayName),
        parentKey: null,
        startDate: null,
        dueDate: meta.dueDate,
        epicColor: null,
        fixVersions: [],
        sprintEndDate: meta.sprintEndDate,
        sprintName: meta.sprintName,
        releaseDate: meta.releaseDate,
        releaseName: meta.releaseName,
        children: [],
      });
    }
    return m;
  }, [tree, deps.issueMeta]);
  const depCandidateOptions = useMemo(() => {
    const out: { label: string; value: string; issueType: string | null }[] =
      [];
    const walk = (l: TimelineIssue[]) =>
      l.forEach((n) => {
        if (!n.isGroup)
          out.push({
            label: `${n.issueKey} — ${n.summary || "(no summary)"}`,
            value: n.issueKey,
            issueType: n.issueType ?? null,
          });
        walk(n.children);
      });
    walk(tree);
    return out;
  }, [tree]);

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
    () => savedFilters.find((f) => f.id === activeSavedFilterId) ?? null,
    [savedFilters, activeSavedFilterId]
  );

  const rows = useMemo(() => {
    let result = allRows;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        ({ issue }) =>
          issue.summary.toLowerCase().includes(q) ||
          issue.issueKey.toLowerCase().includes(q)
      );
    }
    if (issueTypeFilter.length > 0) {
      result = result.filter(({ issue }) =>
        issueTypeFilter.includes(issue.issueType ?? "")
      );
    }
    if (statusFilter.length > 0) {
      result = result.filter(({ issue }) => {
        const cat = (issue.statusCategory ?? "").toLowerCase();
        return statusFilter.some((f) => {
          if (f === "done") return cat.includes("done");
          if (f === "progress") return cat.includes("progress");
          return !cat.includes("done") && !cat.includes("progress");
        });
      });
    }
    if (quickFilter === "unscheduled") {
      result = result.filter(({ issue }) => !issue.startDate && !issue.dueDate);
    } else if (quickFilter === "no_assignee") {
      result = result.filter(({ issue }) => !issue.assigneeDisplayName);
    }
    if (assigneeFilter) {
      result = result.filter(
        ({ issue }) => issue.assigneeDisplayName === assigneeFilter
      );
    }
    if (activeSavedFilter?.filter_config) {
      const cfg = activeSavedFilter.filter_config as any;
      if (cfg.unscheduled || cfg.hasNoDates) {
        result = result.filter(
          ({ issue }) => !issue.startDate && !issue.dueDate
        );
      }
      if (cfg.no_assignee || cfg.noAssignee) {
        result = result.filter(({ issue }) => !issue.assigneeDisplayName);
      }
      if (typeof cfg.assignee === "string" && cfg.assignee) {
        result = result.filter(({ issue }) =>
          (issue.assigneeDisplayName ?? "")
            .toLowerCase()
            .includes(cfg.assignee.toLowerCase())
        );
      }
      if (Array.isArray(cfg.issueTypes) && cfg.issueTypes.length > 0) {
        result = result.filter(({ issue }) =>
          cfg.issueTypes.includes(issue.issueType)
        );
      }
      if (
        Array.isArray(cfg.statusCategories) &&
        cfg.statusCategories.length > 0
      ) {
        result = result.filter(({ issue }) => {
          const cat = (issue.statusCategory ?? "").toLowerCase();
          return cfg.statusCategories.some((f: string) =>
            cat.includes(f.toLowerCase())
          );
        });
      }
    }
    const jqlQuery = (activeSavedFilter as any)?.jql_query;
    if (jqlQuery && typeof jqlQuery === "string" && jqlQuery.trim()) {
      try {
        const jqlFilters = translate(jqlQuery.trim());
        for (const f of jqlFilters) {
          const vals = Array.isArray(f.value)
            ? f.value
            : f.value !== null
            ? [f.value]
            : [];
          if (vals.length === 0) continue;
          if (
            f.column === "issue_type" &&
            (f.method === "eq" || f.method === "in")
          ) {
            result = result.filter(({ issue }) =>
              vals.includes(issue.issueType ?? "")
            );
          } else if (
            f.column === "assignee_display_name" &&
            (f.method === "eq" || f.method === "in")
          ) {
            result = result.filter(({ issue }) =>
              vals.includes(issue.assigneeDisplayName ?? "")
            );
          } else if (
            f.column === "status" &&
            (f.method === "eq" || f.method === "in")
          ) {
            result = result.filter(({ issue }) =>
              vals.includes(issue.status ?? "")
            );
          } else if (
            f.column === "status_category" &&
            (f.method === "eq" || f.method === "in")
          ) {
            result = result.filter(({ issue }) => {
              const cat = (issue.statusCategory ?? "").toLowerCase();
              return vals.some((v: string) => cat.includes(v.toLowerCase()));
            });
          }
        }
      } catch {}
    }
    /* Dependency mode row filter.
       - Focused (depFilterKey): keep the focused item + its directly-related
         dependency items only.
       - Otherwise: keep ONLY tickets that have at least one dependency edge
         (plus their ancestors, so parent rows stay for tree context). */
    if (depMode) {
      if (depFilterKey) {
        const keep = relatedKeys(deps.index, depFilterKey);
        result = result.filter(({ issue }) => keep.has(issue.issueKey));
      } else {
        /* Keep the WHOLE subtree of any top-level unit (epic/feature, or a
           standalone story under the orphan bucket) that contains a dependency
           anywhere — so a parent's dependency surfaces all its children, and a
           child's dependency surfaces the whole epic. */
        const hasDep = (key: string) => {
          const e = getEntry(deps.index, key);
          return e.blockedBy.length + e.blocks.length > 0;
        };
        const anyDepInSubtree = (node: TimelineIssue): boolean =>
          hasDep(node.issueKey) || node.children.some(anyDepInSubtree);
        const addSubtree = (node: TimelineIssue, acc: Set<string>) => {
          acc.add(node.issueKey);
          node.children.forEach((c) => addSubtree(c, acc));
        };
        const keep = new Set<string>();
        for (const root of tree) {
          if (root.isGroup) {
            let anyKept = false;
            for (const ch of root.children) {
              if (anyDepInSubtree(ch)) {
                addSubtree(ch, keep);
                anyKept = true;
              }
            }
            if (anyKept) keep.add(root.issueKey);
          } else if (anyDepInSubtree(root)) {
            addSubtree(root, keep);
          }
        }
        result = result.filter(({ issue }) => keep.has(issue.issueKey));
      }
    }
    return result;
  }, [
    allRows,
    tree,
    searchQuery,
    issueTypeFilter,
    statusFilter,
    quickFilter,
    activeSavedFilter,
    assigneeFilter,
    depMode,
    depFilterKey,
    deps.index,
  ]);

  /* Per-row dependency counts. Jira shows each work item's OWN direct edges
     (verified: a collapsed epic still shows only its own deps, never a subtree
     roll-up). Only the group-header band aggregates — see groupDepCounts. */
  const depCounts = useMemo(() => {
    const m = new Map<string, { blockedBy: number; blocks: number }>();
    if (!depMode) return m;
    for (const { issue } of rows) {
      const entry = getEntry(deps.index, issue.issueKey);
      m.set(issue.issueKey, {
        blockedBy: entry.blockedBy.length,
        blocks: entry.blocks.length,
      });
    }
    return m;
  }, [depMode, rows, deps.index]);

  /* Group-band roll-up ("N Work items") — total dependency edges across every
     visible row, deduped by edge. Mirrors Jira's space/type group header. */
  const groupDeps = useMemo(
    () =>
      aggregateGroup(
        rows.map((r) => r.issue.issueKey),
        deps.index
      ),
    [rows, deps.index]
  );
  const groupDepCounts = useMemo(
    () => ({
      blockedBy: groupDeps.blockedBy.length,
      blocks: groupDeps.blocks.length,
    }),
    [groupDeps]
  );

  const headerCols = useMemo(
    () => buildHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay]
  );
  const subHeaderCols = useMemo(
    () => buildSubHeaderCols(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay]
  );
  const gridLines = useMemo(
    () => buildGridLines(dateRange.start, dateRange.end, zoom, pxPerDay),
    [dateRange, zoom, pxPerDay]
  );

  const hasAnyDates = useMemo(() => hasAnyDatesFn(tree), [tree]);

  /* Inline-create insertion: the gantt inserts one extra ROW_H row right after
     the row whose inline-create is open, and shifts everything below it down. */
  const inlineInsertIdx = useMemo(
    () =>
      inlineCreateKey
        ? rows.findIndex((r) => r.issue.issueKey === inlineCreateKey)
        : -1,
    [inlineCreateKey, rows]
  );
  const rowTopFor = (idx: number) =>
    (showReleases ? ROW_H : 0) +
    idx * ROW_H +
    (inlineInsertIdx >= 0 && idx > inlineInsertIdx ? ROW_H : 0);

  const visibleRowCount = releasesCollapsed ? 0 : rows.length;
  const contentHeight = Math.max(
    (visibleRowCount + (inlineInsertIdx >= 0 ? 1 : 0)) * ROW_H,
    240
  );
  const doubleHeaderH = HEADER_H * 2;

  /* scroll sync */
  const handleGridScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    isSyncingScroll.current = true;
    requestAnimationFrame(() => {
      if (headerScrollRef.current)
        headerScrollRef.current.scrollLeft = grid.scrollLeft;
      if (sidebarBodyRef.current)
        sidebarBodyRef.current.scrollTop = grid.scrollTop;
      if (depBodyRef.current) depBodyRef.current.scrollTop = grid.scrollTop;
      if (todayLineRef.current) {
        const x = todayLeft - grid.scrollLeft;
        todayLineRef.current.style.left = x + "px";
        todayLineRef.current.style.display =
          x >= 0 && x <= grid.clientWidth ? "block" : "none";
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
      if (depBodyRef.current) depBodyRef.current.scrollTop = sidebar.scrollTop;
      isSyncingScroll.current = false;
    });
  }, []);

  useEffect(() => {
    const grid = gridRef.current,
      sidebar = sidebarBodyRef.current;
    if (grid)
      grid.addEventListener("scroll", handleGridScroll, { passive: true });
    if (sidebar)
      sidebar.addEventListener("scroll", handleSidebarScroll, {
        passive: true,
      });
    return () => {
      if (grid) grid.removeEventListener("scroll", handleGridScroll);
      if (sidebar) sidebar.removeEventListener("scroll", handleSidebarScroll);
    };
  }, [handleGridScroll, handleSidebarScroll]);

  /* global cursor during bar drag */
  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor =
      dragging.edge === "move" ? "grabbing" : "ew-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  /* move-arming */
  useEffect(() => {
    if (!enableBarDrag || !mutations?.onUpdateDates) return;
    const onMove = (e: MouseEvent) => {
      const arm = moveArmRef.current;
      if (!arm || dragging) return;
      if (Math.abs(e.clientX - arm.startX) < 4) return;
      suppressClickRef.current = true;
      setDragging({
        issueKey: arm.issueKey,
        edge: "move",
        originX: arm.startX,
        originalStart: arm.originalStart,
        originalEnd: arm.originalEnd,
      });
      setLivePixelDelta(e.clientX - arm.startX);
      moveArmRef.current = null;
    };
    const onUp = () => {
      moveArmRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, enableBarDrag, mutations]);

  /* Bar drag tracking + commit. Commit is fully synchronous from the render's
     POV: we compute the new dates, drop them into `pendingDateOverrides`, and
     clear the drag state in one batch. The DB call runs in the background and
     never gates the visual — the bar renders from the override map until the
     network catches up. */
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) =>
      setLivePixelDelta(e.clientX - dragging.originX);
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
        return base
          ? addDays(base, deltaDays).toISOString().slice(0, 10)
          : null;
      };
      let newStart = originalStart;
      let newEnd = originalEnd;
      if (edge === "start") newStart = iso(originalStart);
      else if (edge === "end") newEnd = iso(originalEnd);
      else {
        if (originalStart) newStart = iso(originalStart);
        if (originalEnd) newEnd = iso(originalEnd);
      }

      /* 1. Drop the new dates into the visual override map FIRST. The bar's
            next render reads from this map → it stays exactly where the
            user dropped it. */
      setPendingDateOverrides((prev) => {
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
        .catch((err) => {
          console.warn("timeline date update failed:", err);
        })
        .finally(() => {
          setPendingDateOverrides((prev) => {
            if (!prev.has(issueKey)) return prev;
            const next = new Map(prev);
            next.delete(issueKey);
            return next;
          });
        });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, pxPerDay, mutations]);

  /* re-center grid when side panel opens */
  useEffect(() => {
    if (!panelItem) return;
    const timer = setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollLeft = Math.max(
          0,
          todayLeft - gridRef.current.clientWidth / 2
        );
      }
    }, 160);
    return () => clearTimeout(timer);
  }, [panelItem, todayLeft]);

  const toggleCollapse = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const parentKeys = useMemo(() => collectParentKeys(tree), [tree]);

  /* Zebra by top-level stripe unit — each epic/feature (depth 0) AND each
     standalone story directly under the orphan "Story" bucket counts as one
     stripe; its WHOLE subtree shares that stripe's colour. Even stripes
     (1-based) get #F0F1F2, odd none. Group/bucket rows themselves stay clear. */
  const stripedKeys = useMemo(() => {
    const colored = new Set<string>();
    let stripeIdx = -1;
    let inBucket = false;
    for (const { issue, depth } of rows) {
      if (depth === 0) {
        inBucket = !!issue.isGroup;
        if (!issue.isGroup) stripeIdx++;
      } else if (depth === 1 && inBucket) {
        stripeIdx++;
      }
      if (!issue.isGroup && stripeIdx >= 0 && stripeIdx % 2 === 1)
        colored.add(issue.issueKey);
    }
    return colored;
  }, [rows]);

  const collapseAll = useCallback(
    () => setCollapsed(new Set(parentKeys)),
    [parentKeys]
  );
  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  /* Default-collapsed on load */
  const initialCollapseKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialCollapseKeyRef.current === hubKey) return;
    if (parentKeys.length === 0) return;
    initialCollapseKeyRef.current = hubKey;
    setCollapsed(new Set(parentKeys));
  }, [hubKey, parentKeys]);

  /* ── Jira "Locate work item in timeline" ──────────────────────────────
     locatedKey arrives via ?locate=<key>. Highlight the row (magenta title
     pill) + its ancestor chevrons (magenta), expand every ancestor so the
     row is visible, and scroll it into view. The highlight persists until
     the user opens another work item (cleared in openDetail). */

  /* Ancestor keys of the located row (every parent up the chain). */
  const locatedAncestors = useMemo(() => {
    const out = new Set<string>();
    if (!locatedActive) return out;
    const path: string[] = [];
    const walk = (list: TimelineIssue[]): boolean => {
      for (const n of list) {
        if (n.issueKey === locatedActive) return true;
        if (n.children.length) {
          path.push(n.issueKey);
          if (walk(n.children)) return true;
          path.pop();
        }
      }
      return false;
    };
    if (walk(tree)) path.forEach((k) => out.add(k));
    return out;
  }, [tree, locatedActive]);

  /* Sync internal state from the prop (re-fires if the user re-locates). */
  useEffect(() => {
    setLocatedActive(locatedKey ?? null);
  }, [locatedKey]);

  /* Expand ancestors + scroll the located row into view. Runs AFTER the
     default-collapse effect above so the expand isn't clobbered. */
  useEffect(() => {
    if (!locatedActive) return;
    if (locatedAncestors.size === 0) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      locatedAncestors.forEach((k) => next.delete(k));
      return next;
    });
    const t = setTimeout(() => {
      const el = sidebarBodyRef.current?.querySelector(
        `[data-row-key="${locatedActive}"]`
      );
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => clearTimeout(t);
  }, [locatedActive, locatedAncestors]);

  const scrollToToday = useCallback(() => {
    if (!gridRef.current) return;
    gridRef.current.scrollLeft = todayLeft - gridRef.current.clientWidth / 2;
  }, [todayLeft]);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);
  const toggleDropdown = useCallback((name: OpenDropdown) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }, []);

  const toggleStatusFilter = useCallback((val: string) => {
    setStatusFilter((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setIssueTypeFilter([]);
    setStatusFilter([]);
    setQuickFilter(null);
    setActiveSavedFilterId(null);
    setAssigneeFilter(null);
  }, []);

  const hasActiveFilters =
    issueTypeFilter.length > 0 ||
    statusFilter.length > 0 ||
    quickFilter !== null ||
    searchQuery.trim() !== "" ||
    activeSavedFilterId !== null ||
    assigneeFilter !== null;

  const handleCreateEpic = async () => {
    if (!epicSummary.trim()) return;
    if (!mutations?.onCreateEpic) return;
    const summary = epicSummary.trim();
    setCreatingEpic(false);
    setEpicSummary("");
    try {
      await mutations.onCreateEpic(summary);
    } catch (err) {
      console.warn("create epic failed:", err);
    }
  };

  if (isLoading) {
    return (
      <AtlaskitPageShell flush chromeBand={chromeBand}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Spinner size="large" />
        </div>
      </AtlaskitPageShell>
    );
  }

  if (error || tree.length === 0) {
    return (
      <AtlaskitPageShell flush chromeBand={chromeBand}>
        <TimelineEmptyState projectKey={hubLabel} />
      </AtlaskitPageShell>
    );
  }

  const quickFilterActiveCount = quickFilter || activeSavedFilterId ? 1 : 0;
  const showCreateEpicRow =
    enableCreateEpicRow && !!mutations?.onCreateEpic && !depMode;
  const showEmptyRowAddButton = enableEmptyRowAdd && !!mutations?.onUpdateDates;

  return (
    <AtlaskitPageShell flush chromeBand={chromeBand}>
      <div
        ref={containerRef}
        role="application"
        aria-label="Timeline"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 124px)",
          background: "var(--ds-surface, #FFFFFF)",
          overflow: "hidden",
          border: "1px solid var(--ds-border, #DFE1E6)",
          borderRadius: 3,
        }}
      >
        {/* ── toolbar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid var(--ds-border, #DFE1E6)",
            flexShrink: 0,
            gap: 8,
            flexWrap: isNarrow ? "wrap" : "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flex: 1,
              minWidth: 0,
              flexWrap: "wrap",
            }}
          >
            {/* search */}
            <div
              style={{
                position: "relative",
                width: isNarrow ? "100%" : 180,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  lineHeight: 0,
                  pointerEvents: "none",
                  color: "var(--ds-text-subtlest, #626F86)",
                }}
              >
                <SearchIcon label="" size="small" />
              </div>
              <input
                type="text"
                placeholder="Search timeline"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search timeline"
                style={{
                  width: "100%",
                  height: 32,
                  padding: "0 8px 0 32px",
                  boxSizing: "border-box",
                  border: "1px solid var(--ds-border-input, #DFE1E6)",
                  borderRadius: 3,
                  fontSize: 14,
                  color: "var(--ds-text, #172B4D)",
                  background: "var(--ds-background-input, #FFFFFF)",
                  outline: "none",
                  fontFamily: "var(--ds-font-family-body)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--ds-border-focused, #388BFF)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px var(--ds-border-focused, #388BFF)33";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    "var(--ds-border-input, #DFE1E6)";
                  e.currentTarget.style.boxShadow = "none";
                }}
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
                status: statusFilter,
                assignee: assigneeFilter ? [assigneeFilter] : [],
              };
              const handleCanonicalChange = (next: CanonicalFilterValue) => {
                setIssueTypeFilter(next.workType);
                setStatusFilter(next.status);
                setAssigneeFilter(
                  next.assignee.length > 0 ? next.assignee[0] : null
                );
              };
              const canonicalStatusOptions: CanonicalStatusOption[] =
                STATUS_CAT_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }));
              const canonicalAssigneeOptions: CanonicalAssigneeOption[] =
                assigneeOptions.map((a) => ({
                  id: a.name,
                  label: a.name,
                  avatarUrl: a.avatarUrl ?? undefined,
                }));
              const canonicalWorkTypeOptions: CanonicalWorkTypeOption[] =
                workItemTypes.length > 0
                  ? workItemTypes.map((t) => ({
                      id: t,
                      label: t,
                      icon: <JiraIssueTypeIcon type={t} size={14} />,
                    }))
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
                  myFilters={(savedFilters ?? []).map((f) => ({
                    id: f.id,
                    name: f.name,
                  }))}
                />
              );
            })()}

            {/* Show dependencies toggle — when off, full hierarchy shows automatically */}
            <button
              type="button"
              aria-pressed={depMode}
              onClick={() => {
                if (depMode) {
                  setDepMode(false);
                  setDepFilterKey(null);
                } else {
                  setDepMode(true);
                  setDepFilterKey(null);
                  expandAll();
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                height: 32,
                padding: "0 12px",
                border: "1px solid var(--ds-border, #DFE1E6)",
                borderRadius: 3,
                background: depMode
                  ? "var(--ds-background-selected, #E9F2FF)"
                  : "var(--ds-surface, #FFFFFF)",
                color: depMode
                  ? "var(--ds-text-selected, #0C66E4)"
                  : "var(--ds-text, #172B4D)",
                fontWeight: depMode ? 600 : 400,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "var(--ds-font-family-body)",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!depMode)
                  e.currentTarget.style.background =
                    "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
              }}
              onMouseLeave={(e) => {
                if (!depMode)
                  e.currentTarget.style.background =
                    "var(--ds-surface, #FFFFFF)";
              }}
            >
              Show dependencies
            </button>

            {/* type filter — LEGACY (now hidden, replaced above) */}
            {false && (
              <>
                {/* type filter */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={typeBtnRef}
                    onClick={() => toggleDropdown("type")}
                    aria-haspopup="menu"
                    aria-expanded={openDropdown === "type"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      height: 32,
                      padding: "0 8px",
                      border: `1px solid ${
                        issueTypeFilter.length > 0
                          ? "var(--ds-border-selected, #388BFF)"
                          : "var(--ds-border, #DFE1E6)"
                      }`,
                      borderRadius: 3,
                      background:
                        issueTypeFilter.length > 0
                          ? "var(--ds-background-selected, #E9F2FF)"
                          : "var(--ds-surface, #FFFFFF)",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--ds-text, #172B4D)",
                      fontFamily: "var(--ds-font-family-body)",
                    }}
                  >
                    Work item type
                    {issueTypeFilter.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          background:
                            "var(--ds-background-selected-bold, #0052CC)",
                          color: "var(--ds-text-inverse, #FFFFFF)",
                          borderRadius: 2,
                          padding: "0 4px",
                          marginLeft: 4,
                        }}
                      >
                        {issueTypeFilter.length}
                      </span>
                    )}
                    <ChevronDownIcon label="" size="small" />
                  </button>
                  <PortalMenu
                    isOpen={openDropdown === "type"}
                    onClose={closeDropdown}
                    triggerRef={typeBtnRef}
                    minWidth={220}
                  >
                    {workItemTypes.map((type) => (
                      <div
                        key={type}
                        role="menuitem"
                        onClick={() =>
                          setIssueTypeFilter((prev) =>
                            prev.includes(type)
                              ? prev.filter((t) => t !== type)
                              : [...prev, type]
                          )
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "var(--ds-text, #172B4D)",
                          fontFamily: "var(--ds-font-family-body)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Checkbox
                          label=""
                          isChecked={issueTypeFilter.includes(type)}
                          onChange={() => {}}
                        />
                        <JiraIssueTypeIcon type={type} size={16} />
                        <span>{type}</span>
                      </div>
                    ))}
                    {issueTypeFilter.length > 0 && (
                      <>
                        <div
                          style={{
                            height: 1,
                            background: "var(--ds-border, #DFE1E6)",
                            margin: "4px 0",
                          }}
                        />
                        <MenuItemRow
                          label="Clear type filter"
                          onClick={() => setIssueTypeFilter([])}
                        />
                      </>
                    )}
                  </PortalMenu>
                </div>

                {/* status filter */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={statusBtnRef}
                    onClick={() => toggleDropdown("status")}
                    aria-haspopup="menu"
                    aria-expanded={openDropdown === "status"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      height: 32,
                      padding: "0 8px",
                      border: `1px solid ${
                        statusFilter.length > 0
                          ? "var(--ds-border-selected, #388BFF)"
                          : "var(--ds-border, #DFE1E6)"
                      }`,
                      borderRadius: 3,
                      background:
                        statusFilter.length > 0
                          ? "var(--ds-background-selected, #E9F2FF)"
                          : "var(--ds-surface, #FFFFFF)",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--ds-text, #172B4D)",
                      fontFamily: "var(--ds-font-family-body)",
                    }}
                  >
                    Status category
                    {statusFilter.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          background:
                            "var(--ds-background-selected-bold, #0052CC)",
                          color: "var(--ds-text-inverse, #FFFFFF)",
                          borderRadius: 2,
                          padding: "0 4px",
                          marginLeft: 4,
                        }}
                      >
                        {statusFilter.length}
                      </span>
                    )}
                    <ChevronDownIcon label="" size="small" />
                  </button>
                  <PortalMenu
                    isOpen={openDropdown === "status"}
                    onClose={closeDropdown}
                    triggerRef={statusBtnRef}
                    minWidth={200}
                  >
                    {STATUS_CAT_OPTIONS.map((opt) => (
                      <div
                        key={opt.value}
                        role="menuitem"
                        onClick={() => toggleStatusFilter(opt.value)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "var(--ds-text, #172B4D)",
                          fontFamily: "var(--ds-font-family-body)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Checkbox
                          label=""
                          isChecked={statusFilter.includes(opt.value)}
                          onChange={() => {}}
                        />
                        <StatusPill value={opt.value} label={opt.label} />
                      </div>
                    ))}
                    {statusFilter.length > 0 && (
                      <>
                        <div
                          style={{
                            height: 1,
                            background: "var(--ds-border, #DFE1E6)",
                            margin: "4px 0",
                          }}
                        />
                        <MenuItemRow
                          label="Clear status filter"
                          onClick={() => setStatusFilter([])}
                        />
                      </>
                    )}
                  </PortalMenu>
                </div>

                {/* assignee filter */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={assigneeBtnRef}
                    onClick={() => toggleDropdown("assignee")}
                    aria-haspopup="menu"
                    aria-expanded={openDropdown === "assignee"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      height: 32,
                      padding: "0 8px",
                      border: `1px solid ${
                        assigneeFilter
                          ? "var(--ds-border-selected, #388BFF)"
                          : "var(--ds-border, #DFE1E6)"
                      }`,
                      borderRadius: 3,
                      background: assigneeFilter
                        ? "var(--ds-background-selected, #E9F2FF)"
                        : "var(--ds-surface, #FFFFFF)",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--ds-text, #172B4D)",
                      fontFamily: "var(--ds-font-family-body)",
                    }}
                  >
                    Assignee
                    {assigneeFilter && (
                      <span
                        style={{
                          fontSize: 11,
                          background:
                            "var(--ds-background-selected-bold, #0052CC)",
                          color: "var(--ds-text-inverse, #FFFFFF)",
                          borderRadius: 2,
                          padding: "0 4px",
                          marginLeft: 4,
                        }}
                      >
                        1
                      </span>
                    )}
                    <ChevronDownIcon label="" size="small" />
                  </button>
                  <PortalMenu
                    isOpen={openDropdown === "assignee"}
                    onClose={closeDropdown}
                    triggerRef={assigneeBtnRef}
                    minWidth={200}
                  >
                    <MenuItemRow
                      label="All assignees"
                      isChecked={assigneeFilter === null}
                      onClick={() => {
                        setAssigneeFilter(null);
                        closeDropdown();
                      }}
                    />
                    {assigneeOptions.length > 0 && (
                      <div
                        style={{
                          height: 1,
                          background: "var(--ds-border, #DFE1E6)",
                          margin: "4px 0",
                        }}
                      />
                    )}
                    {assigneeOptions.map((opt) => (
                      <div
                        key={opt.name}
                        role="menuitem"
                        onClick={() => {
                          setAssigneeFilter(
                            assigneeFilter === opt.name ? null : opt.name
                          );
                          closeDropdown();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 12px",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "var(--ds-text, #172B4D)",
                          fontFamily: "var(--ds-font-family-body)",
                          background:
                            assigneeFilter === opt.name
                              ? "var(--ds-background-selected, #E9F2FE)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            assigneeFilter === opt.name
                              ? "var(--ds-background-selected, #E9F2FE)"
                              : "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            assigneeFilter === opt.name
                              ? "var(--ds-background-selected, #E9F2FE)"
                              : "transparent";
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            borderRadius: "50%",
                            outline:
                              assigneeFilter === opt.name
                                ? "2px solid var(--ds-border-selected, #388BFF)"
                                : "2px solid transparent",
                            outlineOffset: 1,
                          }}
                        >
                          <Avatar
                            size="xsmall"
                            src={opt.avatarUrl ?? undefined}
                            name={opt.name}
                          />
                        </span>
                        <span>{opt.name}</span>
                      </div>
                    ))}
                    {assigneeOptions.length === 0 && (
                      <div
                        style={{
                          padding: "8px 12px",
                          fontSize: 13,
                          color: "var(--ds-text-subtlest, #626F86)",
                        }}
                      >
                        No assignees in view
                      </div>
                    )}
                  </PortalMenu>
                </div>

                {/* avatar stack */}
                {(() => {
                  const active = assigneeOptions.filter((a) => a.avatarUrl);
                  if (!active.length) return null;
                  return (
                    <AvatarGroup
                      appearance="stack"
                      size="small"
                      maxCount={5}
                      label="Filter by assignee"
                      data={active.map((a) => ({
                        key: a.name,
                        name: a.name,
                        src: a.avatarUrl ?? undefined,
                      }))}
                      onAvatarClick={(_e, _analytics, index) => {
                        const a = active[index];
                        if (!a) return;
                        setAssigneeFilter((prev) =>
                          prev === a.name ? null : a.name
                        );
                      }}
                    />
                  );
                })()}

                {/* quick filters + saved filters */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={quickBtnRef}
                    onClick={() => toggleDropdown("quick")}
                    aria-haspopup="menu"
                    aria-expanded={openDropdown === "quick"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      height: 32,
                      padding: "0 8px",
                      border: `1px solid ${
                        quickFilterActiveCount > 0
                          ? "var(--ds-border-selected, #388BFF)"
                          : "var(--ds-border, #DFE1E6)"
                      }`,
                      borderRadius: 3,
                      background:
                        quickFilterActiveCount > 0
                          ? "var(--ds-background-selected, #E9F2FF)"
                          : "var(--ds-surface, #FFFFFF)",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--ds-text, #172B4D)",
                      fontFamily: "var(--ds-font-family-body)",
                    }}
                  >
                    Quick filters
                    {quickFilterActiveCount > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          background:
                            "var(--ds-background-selected-bold, #0052CC)",
                          color: "var(--ds-text-inverse, #FFFFFF)",
                          borderRadius: 2,
                          padding: "0 4px",
                          marginLeft: 4,
                        }}
                      >
                        {quickFilterActiveCount}
                      </span>
                    )}
                    <ChevronDownIcon label="" size="small" />
                  </button>
                  <PortalMenu
                    isOpen={openDropdown === "quick"}
                    onClose={closeDropdown}
                    triggerRef={quickBtnRef}
                    minWidth={200}
                  >
                    <div
                      style={{
                        padding: "4px 12px 2px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--ds-text-subtlest, #6B778C)",
                        letterSpacing: "0.06em",
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                    >
                      Built-in
                    </div>
                    {BUILT_IN_QUICK_FILTERS.map((opt) => (
                      <MenuItemRow
                        key={opt.value}
                        label={opt.label}
                        isChecked={quickFilter === opt.value}
                        onClick={() => {
                          setQuickFilter(
                            quickFilter === opt.value ? null : opt.value
                          );
                          setActiveSavedFilterId(null);
                          closeDropdown();
                        }}
                      />
                    ))}
                    {enableSavedFilters && savedFilters.length > 0 && (
                      <>
                        <div
                          style={{
                            height: 1,
                            background: "var(--ds-border, #DFE1E6)",
                            margin: "4px 0",
                          }}
                        />
                        <div
                          style={{
                            padding: "4px 12px 2px",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--ds-text-subtlest, #6B778C)",
                            letterSpacing: "0.06em",
                            fontFamily: "var(--ds-font-family-body)",
                          }}
                        >
                          Saved filters
                        </div>
                        {savedFilters.map((sf) => (
                          <MenuItemRow
                            key={sf.id}
                            label={sf.name}
                            isChecked={activeSavedFilterId === sf.id}
                            onClick={() => {
                              setActiveSavedFilterId(
                                activeSavedFilterId === sf.id ? null : sf.id
                              );
                              setQuickFilter(null);
                              closeDropdown();
                            }}
                          />
                        ))}
                      </>
                    )}
                    {(quickFilter || activeSavedFilterId) && (
                      <>
                        <div
                          style={{
                            height: 1,
                            background: "var(--ds-border, #DFE1E6)",
                            margin: "4px 0",
                          }}
                        />
                        <MenuItemRow
                          label="Clear quick filters"
                          onClick={() => {
                            setQuickFilter(null);
                            setActiveSavedFilterId(null);
                          }}
                        />
                      </>
                    )}
                  </PortalMenu>
                </div>
              </>
            )}

            {/* active filter chips */}
            {activeSavedFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 28,
                  padding: "0 8px",
                  border: "1px solid var(--ds-border-selected, #388BFF)",
                  borderRadius: 3,
                  background: "var(--ds-background-selected, #E9F2FF)",
                  fontSize: 12,
                  color: "var(--ds-link, #0052CC)",
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                {activeSavedFilter.name}
                <button
                  onClick={() => setActiveSavedFilterId(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ds-link, #0052CC)",
                    lineHeight: 1,
                  }}
                  aria-label={`Remove filter: ${activeSavedFilter.name}`}
                >
                  ×
                </button>
              </div>
            )}
            {quickFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 28,
                  padding: "0 8px",
                  border: "1px solid var(--ds-border-selected, #388BFF)",
                  borderRadius: 3,
                  background: "var(--ds-background-selected, #E9F2FF)",
                  fontSize: 12,
                  color: "var(--ds-link, #0052CC)",
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                {BUILT_IN_QUICK_FILTERS.find((f) => f.value === quickFilter)
                  ?.label ?? quickFilter}
                <button
                  onClick={() => setQuickFilter(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ds-link, #0052CC)",
                    lineHeight: 1,
                  }}
                  aria-label={`Remove filter: ${quickFilter}`}
                >
                  ×
                </button>
              </div>
            )}
            {assigneeFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 28,
                  padding: "0 8px",
                  border: "1px solid var(--ds-border-selected, #388BFF)",
                  borderRadius: 3,
                  background: "var(--ds-background-selected, #E9F2FF)",
                  fontSize: 12,
                  color: "var(--ds-link, #0052CC)",
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                {assigneeFilter}
                <button
                  onClick={() => setAssigneeFilter(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--ds-link, #0052CC)",
                    lineHeight: 1,
                  }}
                  aria-label={`Remove assignee filter: ${assigneeFilter}`}
                >
                  ×
                </button>
              </div>
            )}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  height: 28,
                  padding: "0 8px",
                  border: "1px solid var(--ds-border, #DFE1E6)",
                  borderRadius: 3,
                  background: "var(--ds-background-neutral, #F1F2F4)",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--ds-text-subtle, #42526E)",
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Create work panel (portal → escapes overflow:hidden) ── */}
        {createWorkOpen &&
          createPortal(
            <>
              <div
                onClick={() => {
                  setCreateWorkOpen(false);
                  setCreateWorkSummary("");
                  setCreateAnother(false);
                }}
                aria-hidden
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "var(--ds-blanket, rgba(9,30,66,0.54))",
                  zIndex: 9998,
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Create work item"
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 480,
                  maxHeight: "85vh",
                  background: "var(--ds-surface-overlay, #FFFFFF)",
                  borderRadius: 8,
                  boxShadow:
                    "var(--ds-shadow-overlay, 0 8px 24px rgba(9,30,66,0.25))",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 9999,
                  fontFamily: "var(--ds-font-family-body)",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid var(--ds-border, #DFE1E6)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "var(--ds-text, #172B4D)",
                    }}
                  >
                    Create work item
                  </span>
                  <button
                    onClick={() => {
                      setCreateWorkOpen(false);
                      setCreateWorkSummary("");
                      setCreateAnother(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--ds-text-subtle, #42526E)",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                    }}
                    aria-label="Close"
                  >
                    <CrossIcon label="Close" size="small" />
                  </button>
                </div>
                <div
                  style={{
                    padding: "12px 24px 0",
                    fontSize: 13,
                    color: "var(--ds-text-subtle, #42526E)",
                  }}
                >
                  Required fields are marked with an asterisk{" "}
                  <span style={{ color: "var(--ds-text-danger, #AE2A19)" }}>
                    *
                  </span>
                </div>
                {/* Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "16px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {/* Project */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ds-text-subtlest, #626F86)",
                        marginBottom: 6,
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                    >
                      Project{" "}
                      <span style={{ color: "var(--ds-text-danger, #AE2A19)" }}>
                        *
                      </span>
                    </div>
                    <Select
                      inputId="create-project"
                      placeholder="Choose project"
                      value={(() => {
                        const p = jiraProjects.find(
                          (p) => p.project_key === createProjectKey
                        );
                        return p
                          ? { value: p.project_key, label: p.name }
                          : { value: createProjectKey, label: hubLabel };
                      })()}
                      onChange={(opt: any) =>
                        opt && setCreateProjectKey(opt.value)
                      }
                      options={jiraProjects.map((p) => ({
                        value: p.project_key,
                        label: p.name,
                      }))}
                      formatOptionLabel={(opt: any) => (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <ProjectIcon
                            projectKey={opt.value}
                            size="small"
                            name={opt.label}
                          />
                          <span>{opt.label}</span>
                        </div>
                      )}
                    />
                  </div>
                  {/* Work item type */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ds-text-subtlest, #626F86)",
                        marginBottom: 8,
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                    >
                      Work type{" "}
                      <span style={{ color: "var(--ds-text-danger, #AE2A19)" }}>
                        *
                      </span>
                    </div>
                    <Select
                      inputId="create-work-type"
                      placeholder="Choose work type"
                      value={
                        createWorkType
                          ? { value: createWorkType, label: createWorkType }
                          : null
                      }
                      onChange={(opt: any) =>
                        opt && setCreateWorkType(opt.value)
                      }
                      options={workItemTypes.map((t) => ({
                        value: t,
                        label: t,
                      }))}
                      formatOptionLabel={(opt: any) => (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <JiraIssueTypeIcon type={opt.value} size={16} />
                          <span>{opt.label}</span>
                        </div>
                      )}
                    />
                  </div>
                  {/* Summary */}
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ds-text-subtlest, #626F86)",
                        marginBottom: 6,
                        fontFamily: "var(--ds-font-family-body)",
                      }}
                    >
                      Summary{" "}
                      <span style={{ color: "var(--ds-text-danger, #AE2A19)" }}>
                        *
                      </span>
                    </div>
                    <TextField
                      value={createWorkSummary}
                      onChange={(e) =>
                        setCreateWorkSummary(
                          (e.target as HTMLInputElement).value
                        )
                      }
                      placeholder="Enter summary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && createWorkSummary.trim())
                          handleCreateWork();
                      }}
                    />
                  </div>
                </div>
                {/* Footer */}
                <div
                  style={{
                    borderTop: "1px solid var(--ds-border, #DFE1E6)",
                    padding: "12px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button
                      appearance="subtle"
                      onClick={() => {
                        setCreateWorkOpen(false);
                        setCreateWorkSummary("");
                        setCreateAnother(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      appearance="primary"
                      onClick={handleCreateWork}
                      isDisabled={!createWorkSummary.trim() || isCreatingWork}
                      isLoading={isCreatingWork}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}

        {/* ── body: sidebar + divider + grid ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {!isNarrow && !sidebarHidden && (
            <div
              ref={sidebarPanelRef}
              style={{
                width: sidebarWidth,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                role="columnheader"
                aria-label="Work item"
                style={{
                  height: doubleHeaderH,
                  flexShrink: 0,
                  borderBottom: "2px solid var(--ds-border, #DFE1E6)",
                  background: "var(--ds-surface-sunken, #F7F8F9)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                {/* Work item ▾ + Create work (vertically centered) */}
                <div
                  style={{
                    height: HEADER_H,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 8px 0 12px",
                  }}
                >
                  <button
                    ref={workItemBtnRef}
                    onClick={() => toggleDropdown("workitem")}
                    aria-haspopup="menu"
                    aria-expanded={openDropdown === "workitem"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "none",
                      border: "none",
                      padding: "0 2px",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--ds-text-subtle, #505258)",
                      fontFamily: "var(--ds-font-family-body)",
                      userSelect: "none",
                    }}
                  >
                    Work item
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <PortalMenu
                    isOpen={openDropdown === "workitem"}
                    onClose={closeDropdown}
                    triggerRef={workItemBtnRef}
                    minWidth={160}
                  >
                    <MenuItemRow
                      label="Expand all"
                      onClick={() => {
                        expandAll();
                        closeDropdown();
                      }}
                    />
                    <MenuItemRow
                      label="Collapse all"
                      onClick={() => {
                        collapseAll();
                        closeDropdown();
                      }}
                    />
                  </PortalMenu>
                  {enableCreateEpicRow && mutations?.onCreateEpic && (
                    <button
                      onClick={openCreateWork}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        height: 26,
                        padding: "4px 10px",
                        border: "1px solid rgba(11,18,14,0.14)", // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
                        borderRadius: 3,
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--ds-text-subtle, #505258)",
                        fontFamily: "var(--ds-font-family-body)",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <EditorAddIcon label="" size="small" />
                      {!isNarrow && "Create work"}
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={sidebarBodyRef}
                style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
              >
                {showReleases && (
                  <div
                    role="row"
                    style={{
                      height: ROW_H,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                      gap: 6,
                      borderBottom: depMode
                        ? "none"
                        : "1px solid var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))",
                      background:
                        "var(--ds-background-neutral-subtle, #F7F8F9)",
                      cursor: "pointer",
                    }}
                    onClick={() => setReleasesCollapsed((v) => !v)}
                  >
                    <div
                      style={{
                        width: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ds-text-subtle, #44546F)",
                      }}
                      aria-label={
                        releasesCollapsed
                          ? "Expand releases"
                          : "Collapse releases"
                      }
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {releasesCollapsed ? (
                          <path d="M9 6l6 6-6 6" />
                        ) : (
                          <path d="M6 9l6 6 6-6" />
                        )}
                      </svg>
                    </div>
                    <ProjectIcon
                      projectKey={hubKey.replace(/^(project|product)-/, "")}
                      size="small"
                      name={hubLabel}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ds-text, #172B4D)",
                      }}
                    >
                      {hubLabel}
                    </span>
                    {enableCreateEpicRow && mutations?.onCreateEpic && (
                      <button
                        type="button"
                        aria-label={`Add work to ${hubLabel}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateWork();
                        }}
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          color: "var(--ds-text-subtle, #44546F)",
                          borderRadius: 3,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <EditorAddIcon label="" size="medium" />
                      </button>
                    )}
                  </div>
                )}

                {!releasesCollapsed &&
                  rows.map(({ issue, depth }, rowIdx) => {
                    /* Siblings = same-parent peers in render order. Top-level
                   rows share the `tree` array; nested rows share their
                   parent's children. Only consumed by the `jira` menu
                   variant's Move submenu. Walks the whole tree so rows
                   below depth 1 also resolve correctly. */
                    let siblings: TimelineIssue[] = [];
                    if (menuVariant === "jira") {
                      if (depth === 0) {
                        siblings = tree;
                      } else {
                        const findSiblings = (
                          list: TimelineIssue[]
                        ): TimelineIssue[] | null => {
                          for (const node of list) {
                            if (
                              node.children.some(
                                (c) => c.issueKey === issue.issueKey
                              )
                            )
                              return node.children;
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
                        enableInlineCreate={enableInlineCreate}
                        enableMenu={enableRowMenu}
                        mutations={mutations}
                        childTypesOverride={childTypesOverride}
                        childrenOnlyOnGroupRows={childrenOnlyOnGroupRows}
                        childrenOnlyOnTopLevel={childrenOnlyOnTopLevel}
                        menuVariant={menuVariant}
                        siblings={siblings}
                        isLocated={locatedActive === issue.issueKey}
                        isLocatedAncestor={locatedAncestors.has(issue.issueKey)}
                        tinted={stripedKeys.has(issue.issueKey)}
                        sharedHoveredKey={depMode ? hoveredKey : null}
                        onSharedHover={depMode ? setHoveredKey : undefined}
                        hideRowBorder={true}
                        onInlineCreateChange={handleInlineCreateChange}
                        activeInlineCreateKey={inlineCreateKey}
                        topLevelType={createTopLevelConfig.iconType}
                      />
                    );
                  })}

                {rows.length === 0 && (
                  <div
                    style={{
                      padding: "24px 16px",
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--ds-text-subtlest, #626F86)",
                    }}
                  >
                    No issues match your filters
                  </div>
                )}

                {/* Create Epic row */}
                {showCreateEpicRow && (
                  <div
                    style={{
                      height: ROW_H,
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      paddingRight: 4,
                      gap: 6,
                      borderBottom:
                        "1px solid var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))",
                    }}
                  >
                    {creatingEpic ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flex: 1,
                        }}
                      >
                        <div style={{ flexShrink: 0 }}>
                          <JiraIssueTypeIcon
                            type={createTopLevelConfig.iconType}
                            size={14}
                          />
                        </div>
                        <input
                          ref={epicInputRef}
                          value={epicSummary}
                          onChange={(e) => setEpicSummary(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateEpic();
                            if (e.key === "Escape") {
                              setCreatingEpic(false);
                              setEpicSummary("");
                            }
                          }}
                          placeholder="What needs to be done?"
                          style={{
                            flex: 1,
                            height: 28,
                            padding: "0 8px",
                            border:
                              "1px solid var(--ds-border-focused, #388BFF)",
                            borderRadius: 3,
                            fontSize: 13,
                            background: "var(--ds-background-input, #FFFFFF)",
                            outline: "none",
                            fontFamily: "var(--ds-font-family-body)",
                            color: "var(--ds-text, #172B4D)",
                          }}
                        />
                        <button
                          onClick={handleCreateEpic}
                          disabled={!epicSummary.trim()}
                          style={{
                            ...iconBtnStyle,
                            color: !epicSummary.trim()
                              ? "var(--ds-text-disabled, #A5ADBA)"
                              : "var(--ds-text-success, #1F845A)",
                          }}
                          title="Save epic"
                        >
                          <EditorDoneIcon label="Save" size="small" />
                        </button>
                        <button
                          onClick={() => {
                            setCreatingEpic(false);
                            setEpicSummary("");
                          }}
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
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          width: "100%",
                          padding: "6px 4px",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 13,
                          color: "var(--ds-text-subtle, #42526E)",
                          borderRadius: 3,
                          fontFamily: "var(--ds-font-family-body)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
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

          {/* ── dependency columns (Blocked by / Blocks) — depMode only ── */}
          {depMode && !isNarrow && !sidebarHidden && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                overflow: "hidden",
                background: "var(--ds-surface, #FFFFFF)",
              }}
            >
              <DependencyColumnHeaders height={doubleHeaderH} />
              <DependencyColumnsBody
                ref={depBodyRef}
                rows={rows}
                counts={depCounts}
                groupCounts={groupDepCounts}
                groupHeight={ROW_H}
                showReleases={showReleases}
                releasesCollapsed={releasesCollapsed}
                showCreateEpicRow={showCreateEpicRow}
                tintKeys={stripedKeys}
                hoveredKey={hoveredKey}
                onHover={setHoveredKey}
                onOpenAggregate={(key, _dir, anchor) => {
                  // Every work item (leaf OR parent epic) opens the rich card —
                  // matches Jira, which shows each item's own deps in the columnar card.
                  setDepCard({ key, anchor });
                  setDepPopover(null);
                }}
                onOpenGroupAggregate={(dir, anchor) => {
                  // Group-header band opens the aggregate "Dependencies (...)" list.
                  setDepPopover({ key: GROUP_DEP_KEY, dir, anchor });
                  setDepCard(null);
                }}
              />
            </div>
          )}

          {!isNarrow && !sidebarHidden && (
            <div
              role="separator"
              aria-label="Resize sidebar"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  setSidebarWidth((w) =>
                    Math.max(MIN_SIDEBAR_W, w - (e.shiftKey ? 40 : 10))
                  );
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  setSidebarWidth((w) =>
                    Math.min(MAX_SIDEBAR_W, w + (e.shiftKey ? 40 : 10))
                  );
                }
              }}
              style={{
                width: 2,
                flexShrink: 0,
                position: "relative",
                outline: "none",
                background: sidebarResizing
                  ? "var(--ds-background-selected-bold, #0052CC)"
                  : "var(--ds-border, #DFE1E6)",
                transition: sidebarResizing ? "none" : "background 120ms ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.background =
                  "var(--ds-border-selected, #388BFF)";
              }}
              onBlur={(e) => {
                if (!sidebarResizing)
                  e.currentTarget.style.background =
                    "var(--ds-border, #DFE1E6)";
              }}
            >
              <div
                aria-hidden
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSidebarResizing({
                    originX: e.clientX,
                    originWidth: sidebarWidth,
                  });
                }}
                onMouseEnter={(e) => {
                  const p = e.currentTarget.parentElement;
                  if (p && !sidebarResizing)
                    p.style.background = "var(--ds-border-selected, #388BFF)";
                }}
                onMouseLeave={(e) => {
                  const p = e.currentTarget.parentElement;
                  if (p && !sidebarResizing)
                    p.style.background = "var(--ds-border, #DFE1E6)";
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: -3,
                  width: 8,
                  cursor: "col-resize",
                  zIndex: 1,
                }}
              />
            </div>
          )}

          {/* ── grid panel ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {todayLeft >= 0 && (
              <div
                ref={todayLineRef}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: todayLeft,
                  width: 1.5,
                  background: "var(--ds-chart-danger-bold, #E34935)",
                  zIndex: 8,
                  pointerEvents: "none",
                  display: todayLeft >= 0 ? "block" : "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: -4,
                    width: 0,
                    height: 0,
                    borderLeft: "4.5px solid transparent",
                    borderRight: "4.5px solid transparent",
                    borderTop: "7px solid var(--ds-chart-danger-bold, #E34935)",
                  }}
                />
              </div>
            )}

            <div
              ref={headerScrollRef}
              role="row"
              style={{
                overflow: "hidden",
                flexShrink: 0,
                background: "var(--ds-surface-sunken, #F7F8F9)",
                borderBottom: "1px solid var(--ds-border, #DFE1E6)",
              }}
            >
              <div style={{ width: gridWidth }}>
                <div
                  role="rowgroup"
                  style={{
                    height: HEADER_H,
                    position: "relative",
                    borderBottom: "1px solid var(--ds-border, #DFE1E6)",
                  }}
                >
                  {headerCols.map((col, i) => (
                    <div
                      key={i}
                      role="columnheader"
                      style={{
                        position: "absolute",
                        left: col.left,
                        width: col.width,
                        height: HEADER_H,
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: 8,
                        borderRight: "1px solid var(--ds-border, #DFE1E6)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ds-text-subtle, #44546F)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ height: HEADER_H, position: "relative" }}>
                  {subHeaderCols.map((col, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: col.left,
                        width: col.width,
                        height: HEADER_H,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingLeft: 0,
                        borderRight: "1px solid var(--ds-border, #DFE1E6)",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: "var(--ds-text-subtle, #44546F)",
                          whiteSpace: "nowrap",
                        }}
                      >
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
              style={{ flex: 1, overflow: "auto", position: "relative" }}
            >
              <div
                style={{
                  width: gridWidth,
                  height: contentHeight,
                  position: "relative",
                }}
              >
                {showReleases && (
                  <div
                    role="row"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: ROW_H,
                      background:
                        "var(--ds-background-neutral-subtle, #F7F8F9)",
                      borderBottom:
                        "1px solid var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))",
                      display: "flex",
                      alignItems: "center",
                    }}
                  />
                )}
                {/* inline-create row in the gantt — #dddee1, shorter band centered in the slot. */}
                {inlineInsertIdx >= 0 && (
                  <div
                    role="row"
                    aria-hidden
                    style={{
                      position: "absolute",
                      top:
                        (showReleases ? ROW_H : 0) +
                        (inlineInsertIdx + 1) * ROW_H,
                      left: 0,
                      right: 0,
                      height: ROW_H,
                      background: "var(--cat-inline-create-bg, #dddee1)",
                    }}
                  />
                )}

                {!releasesCollapsed &&
                  rows.map(({ issue }, idx) => {
                    const rowTop = rowTopFor(idx);
                    return (
                      <div
                        key={issue.issueKey + "_bg"}
                        role="row"
                        style={{
                          position: "absolute",
                          top: rowTop,
                          left: 0,
                          right: 0,
                          height: ROW_H,
                          background: "transparent",
                          borderBottom:
                            "1px solid var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))",
                        }}
                      />
                    );
                  })}

                {/* gantt bars + diamond markers */}
                {!releasesCollapsed &&
                  rows.map(({ issue }, idx) => {
                    /* Group rows are sidebar-only — no bar/diamond on the grid. */
                    if (issue.isGroup) return null;
                    const rowTop = rowTopFor(idx);
                    /* Effective dates read from the override map first — if the
                   user just dropped this bar, the override drives position
                   until the data layer catches up. */
                    const effectiveDates = getEffectiveDates(issue);
                    let start = parseDate(effectiveDates.startDate);
                    const end = parseDate(effectiveDates.dueDate);
                    if (!start && !end) return null;

                    /* Start-less items (only a due date — Business Requests,
                       incidents) draw a short 7-day bar ending on the due date
                       instead of a point diamond. */
                    if (!start && end) {
                      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
                    }

                    /* Diamond marker — only dueDate present (now superseded by the
                       synthesized start above, so this never triggers). */
                    const isPointMarker = !start && !!end;
                    if (isPointMarker) {
                      const center =
                        daysBetween(dateRange.start, end!) * pxPerDay +
                        pxPerDay / 2;
                      const diamondSize = 18;
                      const left = center - diamondSize / 2;
                      const top = rowTop + (ROW_H - diamondSize) / 2;
                      const fill = barColor(issue);
                      const showLabels = hoveredBarKey === issue.issueKey;
                      return (
                        <React.Fragment key={issue.issueKey}>
                          <TimelineBarPopover issue={issue} disabled={false}>
                            <div
                              onMouseEnter={() =>
                                setHoveredBarKey(issue.issueKey)
                              }
                              onMouseLeave={() =>
                                setHoveredBarKey((k) =>
                                  k === issue.issueKey ? null : k
                                )
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(buildIssueDetailRoute(issue.issueKey));
                              }}
                              aria-label={`${issue.issueKey} due ${effectiveDates.dueDate}`}
                              role="gridcell"
                              style={{
                                position: "absolute",
                                top,
                                left,
                                width: diamondSize,
                                height: diamondSize,
                                background: fill,
                                transform: "rotate(45deg)",
                                borderRadius: 2,
                                cursor: "pointer",
                                zIndex: 2,
                                boxShadow:
                                  "0 1px 2px var(--ds-shadow-raised, rgba(9,30,66,0.18))",
                              }}
                            />
                          </TimelineBarPopover>
                          {showLabels && (
                            <div
                              style={dateLabelStyle(
                                left + diamondSize,
                                top,
                                "start"
                              )}
                            >
                              {formatDateCompact(effectiveDates.dueDate)}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    }

                    const effectiveStart = start ?? end!;
                    const effectiveEnd = end ?? start!;
                    const baseLeft =
                      daysBetween(dateRange.start, effectiveStart) * pxPerDay;
                    const baseWidth = Math.max(
                      daysBetween(effectiveStart, effectiveEnd) * pxPerDay +
                        pxPerDay,
                      MIN_BAR_W
                    );
                    const barTop = rowTop + (ROW_H - BAR_H) / 2;

                    const isThisDragging =
                      dragging?.issueKey === issue.issueKey;
                    const dragEdge = isThisDragging ? dragging!.edge : null;
                    const deltaLeft =
                      dragEdge === "start" || dragEdge === "move"
                        ? livePixelDelta
                        : 0;
                    const deltaWidth =
                      dragEdge === "start"
                        ? -livePixelDelta
                        : dragEdge === "end"
                        ? livePixelDelta
                        : 0;
                    const finalLeft = baseLeft + deltaLeft;
                    const finalWidth = Math.max(
                      MIN_BAR_W,
                      baseWidth + deltaWidth
                    );

                    const borderColor = barColor(issue);

                    const liveDeltaDays = isThisDragging
                      ? Math.round(livePixelDelta / pxPerDay)
                      : 0;
                    const startShift =
                      dragEdge === "start" || dragEdge === "move"
                        ? liveDeltaDays
                        : 0;
                    const endShift =
                      dragEdge === "end" || dragEdge === "move"
                        ? liveDeltaDays
                        : 0;
                    const liveStartLabel = effectiveDates.startDate
                      ? formatDateCompact(
                          addDays(effectiveStart, startShift)
                            .toISOString()
                            .slice(0, 10)
                        )
                      : "";
                    const liveEndLabel = effectiveDates.dueDate
                      ? formatDateCompact(
                          addDays(effectiveEnd, endShift)
                            .toISOString()
                            .slice(0, 10)
                        )
                      : "";
                    const showLabels =
                      hoveredBarKey === issue.issueKey || isThisDragging;
                    const dragEnabled =
                      enableBarDrag && !!mutations?.onUpdateDates;

                    const bar = (
                      <div
                        role="gridcell"
                        aria-label={`${issue.issueKey} ${
                          effectiveDates.startDate ?? "no start"
                        } to ${effectiveDates.dueDate ?? "no due"}`}
                        onMouseEnter={() => setHoveredBarKey(issue.issueKey)}
                        onMouseLeave={() =>
                          setHoveredBarKey((k) =>
                            k === issue.issueKey ? null : k
                          )
                        }
                        onMouseDown={(e) => {
                          if (!dragEnabled || dragging) return;
                          moveArmRef.current = {
                            issueKey: issue.issueKey,
                            startX: e.clientX,
                            originalStart: effectiveDates.startDate,
                            originalEnd: effectiveDates.dueDate,
                          };
                        }}
                        onClick={(e) => {
                          if (suppressClickRef.current) {
                            suppressClickRef.current = false;
                            e.stopPropagation();
                            return;
                          }
                          if (!dragging) {
                            e.stopPropagation();
                            navigate(buildIssueDetailRoute(issue.issueKey));
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: barTop,
                          left: finalLeft,
                          width: finalWidth,
                          height: BAR_H,
                          borderRadius: BAR_RADIUS,
                          background: "var(--ds-surface, #FFFFFF)",
                          border: `2px solid ${borderColor}`,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 6,
                          paddingRight: 6,
                          overflow: "hidden",
                          cursor: isThisDragging
                            ? dragEdge === "move"
                              ? "grabbing"
                              : "ew-resize"
                            : dragEnabled
                            ? "grab"
                            : "pointer",
                          zIndex: isThisDragging ? 10 : 2,
                          boxShadow: isThisDragging
                            ? "var(--ds-shadow-overlay, 0 8px 16px rgba(9,30,66,0.3))"
                            : "none",
                          opacity: isThisDragging ? 0.9 : 1,
                          userSelect: "none",
                          boxSizing: "border-box",
                          /* No CSS transition on left/width — during drag the bar follows
                         livePixelDelta directly, and on commit the override map already
                         holds the final dates, so any transition would actively animate
                         a snap-back-then-forward and re-introduce the flicker. */
                          transition: "box-shadow 120ms ease",
                        }}
                      >
                        {dragEnabled && effectiveDates.startDate && (
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragging({
                                issueKey: issue.issueKey,
                                edge: "start",
                                originX: e.clientX,
                                originalStart: effectiveDates.startDate,
                                originalEnd: effectiveDates.dueDate,
                              });
                              setLivePixelDelta(0);
                            }}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 8,
                              cursor: "ew-resize",
                              zIndex: 3,
                            }}
                          />
                        )}

                        {finalWidth >= 60 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              color: "var(--ds-text, #172B4D)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1,
                              flex: 1,
                              position: "relative",
                              zIndex: 2,
                              pointerEvents: "none",
                            }}
                          >
                            {issue.summary}
                          </span>
                        )}

                        {dragEnabled && effectiveDates.dueDate && (
                          <div
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragging({
                                issueKey: issue.issueKey,
                                edge: "end",
                                originX: e.clientX,
                                originalStart: effectiveDates.startDate,
                                originalEnd: effectiveDates.dueDate,
                              });
                              setLivePixelDelta(0);
                            }}
                            style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              bottom: 0,
                              width: 8,
                              cursor: "ew-resize",
                              zIndex: 3,
                            }}
                          />
                        )}
                      </div>
                    );

                    return (
                      <React.Fragment key={issue.issueKey}>
                        <TimelineBarPopover
                          issue={issue}
                          disabled={isThisDragging}
                        >
                          {bar}
                        </TimelineBarPopover>
                        {showLabels && liveStartLabel && (
                          <div
                            style={dateLabelStyle(finalLeft, barTop, "start")}
                          >
                            {liveStartLabel}
                          </div>
                        )}
                        {showLabels && liveEndLabel && (
                          <div
                            style={dateLabelStyle(
                              finalLeft + finalWidth,
                              barTop,
                              "end"
                            )}
                          >
                            {liveEndLabel}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                {showEmptyRowAddButton &&
                  !releasesCollapsed &&
                  rows.map(({ issue }, idx) => {
                    if (issue.isGroup) return null;
                    if (issue.startDate || issue.dueDate) return null;
                    const rowTop = rowTopFor(idx);
                    return (
                      <EmptyRowAdd
                        key={issue.issueKey + "_add"}
                        rowTop={rowTop}
                        addLeft={Math.max(
                          8,
                          Math.min(todayLeft, gridWidth - 32)
                        )}
                        onAdd={() => setGridDatesIssue(issue)}
                      />
                    );
                  })}

                {!hasAnyDates && !emptyOverlayDismissed && (
                  <InlineEmptyOverlay
                    projectKey={hubLabel}
                    onDismiss={() => setEmptyOverlayDismissed(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {gridDatesIssue && mutations?.onUpdateDates && (
          <EditDatesModal
            issue={gridDatesIssue}
            onClose={() => setGridDatesIssue(null)}
            onSave={(start, due) =>
              mutations.onUpdateDates!(gridDatesIssue.issueKey, start, due)
            }
          />
        )}

        {/* ── dependency aggregate popover (group-header band roll-up) ── */}
        {depPopover &&
          (() => {
            if (depPopover.key !== GROUP_DEP_KEY) return null;
            const relations =
              depPopover.dir === "blockedBy"
                ? groupDeps.blockedBy
                : groupDeps.blocks;
            const title =
              depPopover.dir === "blockedBy"
                ? "Dependencies (blocked by)"
                : "Dependencies (blocks)";
            return (
              <DependencyAggregatePopover
                title={title}
                dir={depPopover.dir}
                relations={relations}
                keyToIssue={keyToIssue}
                anchor={depPopover.anchor}
                onClose={() => setDepPopover(null)}
                onOpenItem={(k) => {
                  setDepPopover(null);
                  navigate(
                    buildDependenciesRoute
                      ? buildDependenciesRoute(k)
                      : buildIssueDetailRoute(k)
                  );
                }}
              />
            );
          })()}

        {/* ── row dependency card (leaf rows) ── */}
        {depCard && (
          <RowDependencyCard
            rowKey={depCard.key}
            index={deps.index}
            keyToIssue={keyToIssue}
            candidateOptions={depCandidateOptions.filter(
              (o) => o.value !== depCard.key
            )}
            anchor={depCard.anchor}
            isFiltered={depFilterKey === depCard.key}
            onClose={() => setDepCard(null)}
            onRemove={deps.removeDependency}
            onAdd={(direction, otherKey) =>
              deps.addDependency({
                rowKey: depCard.key,
                direction,
                otherKey,
                projectKey:
                  keyToIssue.get(depCard.key)?.projectKey ??
                  projectKeysInTree[0] ??
                  "",
              })
            }
            onShowOnCanvas={(k) => {
              setDepCard(null);
              navigate(
                buildDependenciesRoute
                  ? buildDependenciesRoute(k)
                  : buildIssueDetailRoute(k)
              );
            }}
            onFilter={(k) => setDepFilterKey(k)}
            onClearFilter={() => setDepFilterKey(null)}
          />
        )}

        <TimelineBottomBar
          zoom={zoom}
          onZoomChange={setZoom}
          onScrollToToday={scrollToToday}
          onToggleLegend={() => setLegendOpen((v) => !v)}
          legendOpen={legendOpen}
          onToggleSidePanel={() => setSidebarHidden((v) => !v)}
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
