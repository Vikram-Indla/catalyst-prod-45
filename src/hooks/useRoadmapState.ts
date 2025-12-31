/**
 * Catalyst Enterprise Roadmap State Management
 */

import { useState, useCallback, useMemo, useRef } from "react";
import type { 
  RoadmapData, 
  RoadmapState, 
  RoadmapTheme, 
  RoadmapFilters,
  TimesliceMode,
  GroupByMode,
  DependencyType,
  RoadmapGroup,
  TimelineConfig,
} from "@/types/roadmap";

// Initial mock data
const INITIAL_DATA: RoadmapData = {
  themes: [
    {
      id: "dm",
      name: "Digital Maturity 2026",
      color: "#6366f1",
      order: 0,
      objs: [
        { id: "dm1", name: "Achieve top-5 Digital Index ranking", status: "on-track", owner: "AA", start: "2025-12-15", end: "2026-03-30", prog: 35, critical: true },
        { id: "dm2", name: "Digitize investor procedures", status: "on-track", owner: "AA", start: "2025-12-20", end: "2026-03-30", prog: 40 },
        { id: "dm3", name: "Achieve Accessibility Compliance", status: "pending", owner: "AI", start: "2026-02-01", end: "2026-06-30", prog: 0, critical: true },
        { id: "dm4", name: "Top-5 DGA Maturity Index", status: "at-risk", owner: "AL", start: "2026-01-01", end: "2026-03-31", prog: 60 },
        { id: "dm5", name: "Voice of Customer Surveys", status: "on-track", owner: "NA", start: "2026-01-15", end: "2026-03-15", prog: 25 },
      ],
      ms: [{ id: "ms1", name: "Q1 Review Gate", type: "strategic", date: "2026-03-31" }],
    },
    {
      id: "dz",
      name: "Digitization",
      color: "#8b5cf6",
      order: 1,
      objs: [
        { id: "dz1", name: "Automate License Renewals", status: "pending", owner: "MA", start: "2026-03-01", end: "2026-06-30", prog: 0, critical: true },
        { id: "dz2", name: "Digitize 90% investor procedures", status: "on-track", owner: "NA", start: "2026-01-01", end: "2026-09-30", prog: 28 },
        { id: "dz3", name: "Certificate & Permit Updates", status: "at-risk", owner: "KA", start: "2026-01-15", end: "2026-03-31", prog: 45 },
      ],
      ms: [],
    },
    {
      id: "ij",
      name: "Investor Journey",
      color: "#ec4899",
      order: 2,
      objs: [
        { id: "ij1", name: "Deploy Mobile App MVP", status: "on-track", owner: "DD", start: "2026-01-01", end: "2026-02-28", prog: 70 },
      ],
      ms: [{ id: "ms2", name: "Mobile Go/No-Go", type: "decision", date: "2026-02-15" }],
    },
    {
      id: "mp",
      name: "Marketplace",
      color: "#14b8a6",
      order: 3,
      objs: [
        { id: "mp1", name: "Factory Resource Sharing", status: "pending", owner: "TBD", start: "2026-01-01", end: "2026-06-30", prog: 0 },
      ],
      ms: [],
    },
  ],
  deps: [
    { from: "dm1", to: "dm3", type: "fs" },
    { from: "dz2", to: "dz1", type: "ss" },
  ],
};

const INITIAL_STATE: RoadmapState = {
  slice: "monthly",
  zoom: 100,
  snap: true,
  dark: false,
  presentation: false,
  selected: null,
  depMode: false,
  depFrom: null,
  depType: "fs",
  collapsed: new Set(),
  filters: { status: ["on-track", "at-risk", "blocked", "pending"], owners: [] },
  groupBy: "theme",
  editing: null,
};

export function useRoadmapState() {
  const [data, setData] = useState<RoadmapData>(INITIAL_DATA);
  const [state, setState] = useState<RoadmapState>(INITIAL_STATE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; id: string } | null>(null);
  
  const history = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const timelineRef = useRef<HTMLDivElement>(null);

  // Save state for undo
  const saveState = useCallback(() => {
    history.current.past.push(JSON.stringify(data));
    if (history.current.past.length > 50) history.current.past.shift();
    history.current.future = [];
  }, [data]);

  // Actions
  const actions = useMemo(() => ({
    undo: () => {
      if (!history.current.past.length) return;
      history.current.future.push(JSON.stringify(data));
      setData(JSON.parse(history.current.past.pop()!));
    },
    redo: () => {
      if (!history.current.future.length) return;
      history.current.past.push(JSON.stringify(data));
      setData(JSON.parse(history.current.future.pop()!));
    },
    setSlice: (slice: TimesliceMode) => setState(s => ({ ...s, slice })),
    zoomIn: () => setState(s => ({ ...s, zoom: Math.min(150, s.zoom + 25) })),
    zoomOut: () => setState(s => ({ ...s, zoom: Math.max(50, s.zoom - 25) })),
    toggleSnap: () => setState(s => ({ ...s, snap: !s.snap })),
    toggleFilter: () => setFilterOpen(o => !o),
    toggleDark: () => setState(s => ({ ...s, dark: !s.dark })),
    togglePresentation: () => setState(s => ({ ...s, presentation: !s.presentation })),
    showHelp: () => setHelpOpen(true),
    hideHelp: () => setHelpOpen(false),
    select: (id: string | null) => setState(s => ({ ...s, selected: id })),
    toggleCollapse: (id: string) => setState(s => {
      const collapsed = new Set(s.collapsed);
      collapsed.has(id) ? collapsed.delete(id) : collapsed.add(id);
      return { ...s, collapsed };
    }),
    setFilters: (filters: RoadmapFilters) => setState(s => ({ ...s, filters })),
    setGroupBy: (groupBy: GroupByMode) => setState(s => ({ ...s, groupBy, collapsed: new Set() })),
    clearFilters: () => setState(s => ({ 
      ...s, 
      filters: { status: ["on-track", "at-risk", "blocked", "pending"], owners: [] } 
    })),
    moveBar: (id: string, newStart: string, newEnd: string) => {
      saveState();
      setData(d => ({
        ...d,
        themes: d.themes.map(t => ({
          ...t,
          objs: t.objs.map(o => o.id === id ? { ...o, start: newStart, end: newEnd } : o)
        }))
      }));
    },
    resizeBar: (id: string, newStart: string, newEnd: string) => {
      saveState();
      setData(d => ({
        ...d,
        themes: d.themes.map(t => ({
          ...t,
          objs: t.objs.map(o => o.id === id ? { ...o, start: newStart, end: newEnd } : o)
        }))
      }));
    },
    startEdit: (id: string) => setState(s => ({ ...s, editing: id })),
    finishEdit: (id: string, newName: string) => {
      saveState();
      setData(d => ({
        ...d,
        themes: d.themes.map(t => ({
          ...t,
          objs: t.objs.map(o => o.id === id ? { ...o, name: newName } : o)
        }))
      }));
      setState(s => ({ ...s, editing: null }));
    },
    cancelEdit: () => setState(s => ({ ...s, editing: null })),
    reorderThemes: (fromId: string, toId: string) => {
      saveState();
      setData(d => {
        const themes = [...d.themes];
        const fromIdx = themes.findIndex(t => t.id === fromId);
        const toIdx = themes.findIndex(t => t.id === toId);
        const [moved] = themes.splice(fromIdx, 1);
        themes.splice(toIdx, 0, moved);
        themes.forEach((t, i) => t.order = i);
        return { ...d, themes };
      });
    },
    addDependency: (from: string, to: string, type: DependencyType) => {
      saveState();
      setData(d => ({ ...d, deps: [...d.deps, { from, to, type }] }));
      setState(s => ({ ...s, depMode: false, depFrom: null }));
    },
    removeDependencies: (id: string) => {
      saveState();
      setData(d => ({ ...d, deps: d.deps.filter(dep => dep.from !== id && dep.to !== id) }));
    },
    startDepMode: (fromId: string, type: DependencyType = "fs") => {
      setState(s => ({ ...s, depMode: true, depFrom: fromId, depType: type }));
    },
    cancelDepMode: () => {
      setState(s => ({ ...s, depMode: false, depFrom: null }));
    },
    showContextMenu: (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, id });
    },
    hideContextMenu: () => setContextMenu(null),
    showTooltip: (e: React.MouseEvent, id: string) => {
      setTooltip({ x: e.clientX, y: e.clientY, id });
    },
    hideTooltip: () => setTooltip(null),
    scrollToToday: () => {
      if (timelineRef.current) {
        // Scroll to today position
        const container = timelineRef.current;
        const todayPercent = computed.todayPosition;
        const scrollPos = (todayPercent / 100) * container.scrollWidth - container.clientWidth / 2;
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    },
  }), [data, saveState]);

  // Computed values
  const computed = useMemo(() => {
    const allObjs = data.themes.flatMap(t => t.objs);
    
    // Apply filters
    const filteredObjs = allObjs.filter(o => {
      if (!state.filters.status.includes(o.status)) return false;
      if (state.filters.owners.length > 0 && !state.filters.owners.includes(o.owner)) return false;
      return true;
    });

    const statusCounts = {
      "on-track": allObjs.filter(o => o.status === "on-track").length,
      "at-risk": allObjs.filter(o => o.status === "at-risk").length,
      "blocked": allObjs.filter(o => o.status === "blocked").length,
      "pending": allObjs.filter(o => o.status === "pending").length,
    };
    
    const allOwners = [...new Set(allObjs.map(o => o.owner))].sort();
    
    const healthPercent = allObjs.length 
      ? Math.round((statusCounts["on-track"] / allObjs.length) * 100)
      : 0;

    const allMs = data.themes.flatMap(t => t.ms || []);
    const today = new Date();
    const nextMilestone = allMs
      .filter(m => new Date(m.date) > today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    // Group data based on groupBy mode
    let groups: RoadmapGroup[];
    if (state.groupBy === "theme") {
      groups = [...data.themes]
        .sort((a, b) => a.order - b.order)
        .map(t => ({
          ...t,
          objs: t.objs.filter(o => filteredObjs.some(fo => fo.id === o.id))
        }));
    } else if (state.groupBy === "status") {
      const statusColors = {
        "on-track": "#0d9488",
        "at-risk": "#d97706",
        "blocked": "#dc2626",
        "pending": "#737373",
      };
      groups = (["on-track", "at-risk", "blocked", "pending"] as const).map(s => ({
        id: s,
        name: s.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase()),
        color: statusColors[s],
        order: 0,
        objs: filteredObjs.filter(o => o.status === s),
        ms: [],
      }));
    } else if (state.groupBy === "owner") {
      groups = allOwners.map(owner => ({
        id: owner,
        name: owner,
        color: "#6366f1",
        order: 0,
        objs: filteredObjs.filter(o => o.owner === owner),
        ms: [],
      }));
    } else {
      // Quarter grouping
      const quarters = ["Q4 2025", "Q1 2026", "Q2 2026", "Q3 2026"];
      groups = quarters.map(q => ({
        id: q,
        name: q,
        color: "#6366f1",
        order: 0,
        objs: filteredObjs.filter(o => {
          const m = new Date(o.start).getMonth();
          const y = new Date(o.start).getFullYear();
          const quarter = m < 3 ? `Q1 ${y}` : m < 6 ? `Q2 ${y}` : m < 9 ? `Q3 ${y}` : `Q4 ${y}`;
          return quarter === q;
        }),
        ms: [],
      }));
    }

    // Filter out empty groups
    groups = groups.filter(g => g.objs.length > 0 || (state.groupBy === 'theme' && !state.collapsed.has(g.id)));

    const timelineConfig: TimelineConfig = {
      start: new Date("2025-10-01"),
      end: new Date("2026-09-30"),
      today: new Date(),
    };

    const total = timelineConfig.end.getTime() - timelineConfig.start.getTime();
    const todayPos = timelineConfig.today.getTime() - timelineConfig.start.getTime();
    const todayPosition = Math.max(0, Math.min(100, (todayPos / total) * 100));

    return {
      totalObjectives: allObjs.length,
      filteredCount: filteredObjs.length,
      onTrackCount: statusCounts["on-track"],
      atRiskCount: statusCounts["at-risk"],
      blockedCount: statusCounts["blocked"],
      pendingCount: statusCounts["pending"],
      statusCounts,
      allOwners,
      healthPercent,
      nextMilestone,
      groups,
      canUndo: history.current.past.length > 0,
      canRedo: history.current.future.length > 0,
      timelineConfig,
      todayPosition,
      activeFiltersCount: 
        (4 - state.filters.status.length) + 
        state.filters.owners.length,
    };
  }, [data, state.groupBy, state.filters, state.collapsed]);

  return {
    data,
    state: { ...state, filterOpen, helpOpen },
    actions,
    computed,
    contextMenu,
    tooltip,
    timelineRef,
  };
}
