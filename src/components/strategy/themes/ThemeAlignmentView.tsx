/**
 * ThemeAlignmentView — CIO-Grade Full-Screen Strategy Alignment Map
 * Complete rebuild: fixed overlay, dark toolbar, SVG connectors with ResizeObserver
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, X, Minus, Plus, RotateCcw, Unlink, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAlignmentMapData, type AlignmentNode, type AlignmentRow } from '@/hooks/useAlignmentMapData';

// ── Layer colors (NO purple for KRs) ──
const LAYER = {
  theme:      { color: '#2563EB', badgeBg: '#EFF6FF', badgeText: '#1E40AF', border: '#2563EB' },
  goal:       { color: '#0D9488', badgeBg: '#F0FDFA', badgeText: '#115E59', border: '#0D9488' },
  kr:         { color: '#2563EB', badgeBg: '#DBEAFE', badgeText: '#1E40AF', border: '#2563EB' },
  initiative: { color: '#D97706', badgeBg: '#FFFBEB', badgeText: '#92400E', border: '#D97706' },
  epic:       { color: '#4F46E5', badgeBg: '#EEF2FF', badgeText: '#3730A3', border: '#4F46E5' },
} as const;

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active:       { dot: '#16A34A', bg: '#F0FDF4', text: '#166534', label: 'Active' },
  on_track:     { dot: '#16A34A', bg: '#F0FDF4', text: '#166534', label: 'On Track' },
  at_risk:      { dot: '#D97706', bg: '#FFFBEB', text: '#92400E', label: 'At Risk' },
  off_track:    { dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', label: 'Off Track' },
  draft:        { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Draft' },
  planned:      { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Planned' },
  completed:    { dot: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', label: 'Done' },
  cancelled:    { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Cancelled' },
  in_progress:  { dot: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', label: 'In Progress' },
  not_started:  { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Not Started' },
  approved:     { dot: '#0D9488', bg: '#F0FDFA', text: '#115E59', label: 'Approved' },
  proposed:     { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Proposed' },
  analyzing:    { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: 'Analyzing' },
};

function getProgressColor(v: number) {
  if (v >= 60) return '#16A34A';
  if (v >= 40) return '#D97706';
  return '#EF4444';
}

// ── Sub-components ──

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.draft;
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md shrink-0"
      style={{ background: c.bg, color: c.text, fontSize: 9, fontWeight: 600 }}>
      <div className="rounded-full shrink-0" style={{ width: 5, height: 5, background: c.dot }} />
      {c.label}
    </div>
  );
}

function ChainStat({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const clr = pct >= 70 ? 'rgb(52,211,153)' : pct >= 40 ? 'rgb(251,191,36)' : 'rgb(248,113,113)';
  return (
    <div className="text-center" style={{ minWidth: 100 }}>
      <div className="flex items-baseline justify-center gap-1">
        <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{value}</span>
        <span style={{ color: '#475569', fontSize: 12 }}>/{total}</span>
        <span style={{ color: clr, fontSize: 12, fontWeight: 600 }}>({pct}%)</span>
      </div>
      <div style={{ color: '#64748B', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

function GhostNode({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 border border-dashed rounded-lg"
      style={{ width: 180, padding: 12, borderColor: '#CBD5E1', background: 'rgba(248,250,252,0.5)' }}>
      <Unlink size={12} style={{ color: '#94A3B8' }} />
      <span style={{ fontSize: 11, color: '#94A3B8' }}>No linked {label}</span>
    </div>
  );
}

interface RenderedPath {
  id: string;
  d: string;
  sourceId: string;
  targetId: string;
  layerColor: string;
}

// ══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export function ThemeAlignmentView({ onBack }: { onBack?: () => void }) {
  const { data, isLoading } = useAlignmentMapData();
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string>('all');
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<RenderedPath[]>([]);

  // ── Filter data by selected theme ──
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (selectedThemeFilter === 'all') return data;

    const goalIds = data.themeToGoals.get(selectedThemeFilter) || new Set();
    const krIds = new Set<string>();
    goalIds.forEach(gid => { const krs = data.goalToKrs.get(gid); if (krs) krs.forEach(k => krIds.add(k)); });
    const iniIds = new Set<string>();
    krIds.forEach(kid => { const inis = data.krToInitiatives.get(kid); if (inis) inis.forEach(i => iniIds.add(i)); });
    const epicIds = new Set<string>();
    iniIds.forEach(iid => { const eps = data.initiativeToEpics.get(iid); if (eps) eps.forEach(e => epicIds.add(e)); });

    return {
      ...data,
      themes: data.themes.filter(t => t.id === selectedThemeFilter),
      goals: data.goals.filter(g => goalIds.has(g.id)),
      krs: data.krs.filter(k => krIds.has(k.id)),
      initiatives: data.initiatives.filter(i => iniIds.has(i.id)),
      epics: data.epics.filter(e => epicIds.has(e.id)),
    };
  }, [data, selectedThemeFilter]);

  // ── Highlight chain on hover ──
  const highlightChain = useCallback((nodeId: string) => {
    if (!data) return;
    const connected = new Set<string>();
    data.rows.forEach((row: AlignmentRow) => {
      const ids: Record<string, string | null> = {
        [`theme-${row.theme_key}`]: row.theme_id,
        [`goal-${row.goal_key}`]: row.goal_id,
        [`kr-${row.kr_key}`]: row.kr_id,
        [`initiative-${row.initiative_key}`]: row.initiative_id,
        [`epic-${row.epic_key}`]: row.epic_id,
      };
      const nodeIds = Object.keys(ids).filter(k => ids[k] != null);
      if (nodeIds.includes(nodeId)) {
        nodeIds.forEach(n => connected.add(n));
      }
    });
    setHighlightedNodes(connected);
  }, [data]);

  const clearHighlight = useCallback(() => setHighlightedNodes(new Set()), []);

  // ── Build connections list ──
  const connections = useMemo(() => {
    if (!filteredData) return [];
    const conns: { id: string; sourceId: string; targetId: string; layerColor: string }[] = [];

    const addConns = (map: Map<string, Set<string>>, srcPrefix: string, tgtPrefix: string, color: string,
      srcNodes: AlignmentNode[], tgtNodes: AlignmentNode[]) => {
      const srcKeyMap = new Map(srcNodes.map(n => [n.id, n.key]));
      const tgtKeyMap = new Map(tgtNodes.map(n => [n.id, n.key]));
      for (const [parentId, childIds] of map.entries()) {
        const srcKey = srcKeyMap.get(parentId);
        if (!srcKey) continue;
        childIds.forEach(childId => {
          const tgtKey = tgtKeyMap.get(childId);
          if (!tgtKey) return;
          conns.push({
            id: `${srcPrefix}-${srcKey}-${tgtPrefix}-${tgtKey}`,
            sourceId: `${srcPrefix}-${srcKey}`,
            targetId: `${tgtPrefix}-${tgtKey}`,
            layerColor: color,
          });
        });
      }
    };

    addConns(filteredData.themeToGoals, 'theme', 'goal', LAYER.theme.color, filteredData.themes, filteredData.goals);
    addConns(filteredData.goalToKrs, 'goal', 'kr', LAYER.goal.color, filteredData.goals, filteredData.krs);
    addConns(filteredData.krToInitiatives, 'kr', 'initiative', LAYER.kr.color, filteredData.krs, filteredData.initiatives);
    addConns(filteredData.initiativeToEpics, 'initiative', 'epic', LAYER.initiative.color, filteredData.initiatives, filteredData.epics);

    return conns;
  }, [filteredData]);

  // ── Connector recalculation ──
  const recalculateConnections = useCallback(() => {
    if (!innerRef.current || connections.length === 0) { setPaths([]); return; }
    const container = innerRef.current;
    const containerRect = container.getBoundingClientRect();

    const positions = new Map<string, { right: number; left: number; centerY: number }>();
    container.querySelectorAll('[data-node-id]').forEach(el => {
      const id = el.getAttribute('data-node-id')!;
      const r = el.getBoundingClientRect();
      positions.set(id, {
        right: (r.right - containerRect.left) / zoom,
        left: (r.left - containerRect.left) / zoom,
        centerY: (r.top + r.height / 2 - containerRect.top) / zoom,
      });
    });

    const newPaths = connections.map(conn => {
      const src = positions.get(conn.sourceId);
      const tgt = positions.get(conn.targetId);
      if (!src || !tgt) return null;
      const x1 = src.right + 6;
      const y1 = src.centerY;
      const x2 = tgt.left - 6;
      const y2 = tgt.centerY;
      const cp = Math.min(Math.abs(x2 - x1) * 0.4, 50);
      return {
        id: conn.id,
        d: `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
        layerColor: conn.layerColor,
      };
    }).filter(Boolean) as RenderedPath[];

    setPaths(newPaths);
  }, [connections, zoom]);

  // ResizeObserver + window resize
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const raf = () => requestAnimationFrame(recalculateConnections);
    requestAnimationFrame(() => requestAnimationFrame(recalculateConnections));
    const ro = new ResizeObserver(raf);
    ro.observe(inner);
    window.addEventListener('resize', raf);
    return () => { ro.disconnect(); window.removeEventListener('resize', raf); };
  }, [recalculateConnections]);

  // Recalc on zoom/pan/filter
  useEffect(() => {
    requestAnimationFrame(recalculateConnections);
  }, [zoom, pan, selectedThemeFilter, recalculateConnections]);

  // ── Pan handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.x),
      y: panStart.current.py + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => { setZoom(0.85); setPan({ x: 0, y: 0 }); }, []);

  const handleExit = useCallback(() => onBack?.(), [onBack]);

  // ── Loading / empty states ──
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="animate-pulse" style={{ fontSize: 14, color: '#94A3B8' }}>Loading alignment data…</div>
      </div>
    );
  }

  if (!filteredData || filteredData.themes.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3" style={{ background: '#F8FAFC' }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>No alignment data available.</p>
        <button onClick={handleExit} className="text-sm font-medium" style={{ color: '#2563EB' }}>
          ← Back to Strategic Themes
        </button>
      </div>
    );
  }

  const anyHover = highlightedNodes.size > 0;
  const stats = data?.stats;

  // Check which KRs have no initiative, which initiatives have no epic
  const krsWithoutInitiative = filteredData.krs.filter(kr => {
    for (const [, children] of filteredData.krToInitiatives) {
      if (filteredData.krToInitiatives.get(kr.id)?.size) return false;
    }
    return !filteredData.krToInitiatives.has(kr.id);
  });
  const initsWithoutEpic = filteredData.initiatives.filter(ini => !filteredData.initiativeToEpics.has(ini.id));

  const columns = [
    { key: 'themes', label: 'Strategic Themes', color: LAYER.theme.color, count: filteredData.themes.length },
    { key: 'goals', label: 'Goals', color: LAYER.goal.color, count: filteredData.goals.length },
    { key: 'keyResults', label: 'Key Results', color: LAYER.kr.color, count: filteredData.krs.length },
    { key: 'initiatives', label: 'Initiatives', color: LAYER.initiative.color, count: filteredData.initiatives.length },
    { key: 'epics', label: 'Epics', color: LAYER.epic.color, count: filteredData.epics.length },
  ];

  const getNodeOpacity = (nodeId: string) => {
    if (!anyHover) return '';
    return highlightedNodes.has(nodeId) ? 'opacity-100 ring-2 ring-blue-400/50 scale-[1.02]' : 'opacity-20';
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#fff' }}>
      {/* ═══ TOOLBAR ═══ */}
      <div className="flex items-center justify-between shrink-0 px-5" style={{ height: 52, background: '#0F172A' }}>
        {/* Left */}
        <div className="flex items-center gap-4">
          <button onClick={handleExit}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}>
            <ArrowLeft size={16} />
            <span className="font-medium">Exit</span>
          </button>
          <div style={{ width: 1, height: 24, background: '#334155' }} />
          <div>
            <h1 style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
              Strategy Alignment Map
            </h1>
            <p style={{ color: '#64748B', fontSize: 11 }}>
              Ministry of Industry — FY2026 Strategic Alignment
            </p>
          </div>
        </div>

        {/* Center: Stats */}
        {stats && (
          <div className="flex items-center gap-5">
            <ChainStat label="Linked KRs" value={stats.linkedKrs} total={stats.totalKrs} />
            <div style={{ width: 1, height: 20, background: '#334155' }} />
            <ChainStat label="Linked Initiatives" value={stats.linkedInitiatives} total={stats.totalInitiatives} />
            <div style={{ width: 1, height: 20, background: '#334155' }} />
            <ChainStat label="Linked Epics" value={stats.linkedEpics} total={stats.totalEpics} />
            <div style={{ width: 1, height: 20, background: '#334155' }} />
            <div className="text-center">
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{stats.fullChains}</div>
              <div style={{ color: '#64748B', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Chains</div>
            </div>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          <Select value={selectedThemeFilter} onValueChange={setSelectedThemeFilter}>
            <SelectTrigger
              className="h-8 w-[200px] text-xs border-slate-700 bg-slate-800 text-slate-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <SelectValue placeholder="All Themes" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg">
              <SelectItem value="all" className="text-sm">
                All Themes
              </SelectItem>
              {data?.themes.map(t => (
                <SelectItem key={t.id} value={t.id} className="text-sm">
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 rounded-md px-1.5 py-1" style={{ background: '#1E293B' }}>
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
              className="flex items-center justify-center rounded" style={{ width: 24, height: 24, color: '#94A3B8' }}>
              <Minus size={12} />
            </button>
            <span className="font-mono text-center" style={{ fontSize: 10, color: '#64748B', width: 28 }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="flex items-center justify-center rounded" style={{ width: 24, height: 24, color: '#94A3B8' }}>
              <Plus size={12} />
            </button>
            <button onClick={resetView} title="Reset view"
              className="flex items-center justify-center rounded ml-0.5" style={{ width: 24, height: 24, color: '#94A3B8' }}>
              <RotateCcw size={12} />
            </button>
          </div>

          <button onClick={handleExit} title="Exit Alignment Map"
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 32, height: 32, color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#1E293B'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ═══ CHAIN EXPLANATION BANNER ═══ */}
      <div className="flex items-center justify-center shrink-0 px-6"
        style={{ height: 40, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2" style={{ fontSize: 12, color: '#64748B' }}>
          <span className="font-semibold" style={{ color: '#334155' }}>Reading this map:</span>
          <span>Each</span>
          <span className="inline-flex items-center gap-1 font-semibold rounded px-1.5 py-0.5"
            style={{ fontSize: 11, color: '#1E40AF', background: '#EFF6FF' }}>● Theme</span>
          <span>breaks down into</span>
          <span className="inline-flex items-center gap-1 font-semibold rounded px-1.5 py-0.5"
            style={{ fontSize: 11, color: '#115E59', background: '#F0FDFA' }}>● Goals</span>
          <span>measured by</span>
          <span className="inline-flex items-center gap-1 font-semibold rounded px-1.5 py-0.5"
            style={{ fontSize: 11, color: '#1E40AF', background: '#DBEAFE' }}>● Key Results</span>
          <span>delivered through</span>
          <span className="inline-flex items-center gap-1 font-semibold rounded px-1.5 py-0.5"
            style={{ fontSize: 11, color: '#92400E', background: '#FFFBEB' }}>● Initiatives</span>
          <span>executed as</span>
          <span className="inline-flex items-center gap-1 font-semibold rounded px-1.5 py-0.5"
            style={{ fontSize: 11, color: '#3730A3', background: '#EEF2FF' }}>● Epics</span>
        </div>
      </div>

      {/* ═══ COLUMN HEADERS ═══ */}
      <div className="flex shrink-0" style={{ borderBottom: '2px solid #E2E8F0', background: '#fff' }}>
        {columns.map(col => (
          <div key={col.key} className="flex items-center gap-2 px-4"
            style={{ height: 44, minWidth: col.key === 'themes' ? 220 : col.key === 'goals' || col.key === 'initiatives' ? 210 : 200, borderLeft: `3px solid ${col.color}` }}>
            <div className="rounded-full" style={{ width: 8, height: 8, background: col.color }} />
            <span className="font-bold uppercase" style={{ fontSize: 13, color: '#0F172A', letterSpacing: '0.03em' }}>
              {col.label}
            </span>
            <span className="font-semibold" style={{ fontSize: 12, color: '#94A3B8' }}>
              ({col.count})
            </span>
          </div>
        ))}
      </div>

      {/* ═══ CANVAS ═══ */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto select-none"
        style={{ background: '#F8FAFC', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          ref={innerRef}
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            minWidth: 'fit-content',
            minHeight: 'fit-content',
          }}
        >
          {/* SVG connectors */}
          <svg className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
            {paths.map(p => {
              const isLit = anyHover && highlightedNodes.has(p.sourceId) && highlightedNodes.has(p.targetId);
              const isDimmed = anyHover && !isLit;
              return (
                <path key={p.id} d={p.d}
                  stroke={isLit ? p.layerColor : '#D1D5DB'}
                  strokeWidth={isLit ? 2.5 : 1}
                  fill="none"
                  opacity={isDimmed ? 0.08 : isLit ? 1 : 0.35}
                  className="transition-all duration-300" />
              );
            })}
          </svg>

          {/* Node columns */}
          <div className="relative flex gap-6 p-6" style={{ zIndex: 2 }}>
            {/* THEMES */}
            <div data-column="themes" className="flex flex-col gap-2" style={{ minWidth: 200 }}>
              {filteredData.themes.map(t => {
                const nid = `theme-${t.key}`;
                return (
                  <div key={t.id} data-node-id={nid}
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getNodeOpacity(nid)}`}
                    style={{ width: 200 }}
                    onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                    <div style={{ borderLeft: `4px solid ${t.color || LAYER.theme.border}` }}
                      className="bg-white border border-slate-200/80 rounded-lg shadow-sm">
                      <div className="p-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-bold rounded-md px-2 py-0.5"
                            style={{ fontSize: 10, background: LAYER.theme.badgeBg, color: LAYER.theme.badgeText, letterSpacing: '0.02em' }}>
                            {t.key}
                          </span>
                          <StatusBadge status={t.status} />
                        </div>
                        <p className="font-semibold leading-snug line-clamp-2" style={{ fontSize: 13, color: '#0F172A' }}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: '#E2E8F0' }}>
                            <div className="rounded-full transition-all" style={{ width: `${t.progress || 0}%`, height: 5, background: getProgressColor(t.progress || 0) }} />
                          </div>
                          <span className="font-bold" style={{ fontSize: 11, color: '#334155' }}>{Math.round(t.progress || 0)}%</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 8 }}>
                          {t.goalCount || 0} goals · {t.krCount || 0} KRs
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* GOALS */}
            <div data-column="goals" className="flex flex-col gap-2" style={{ minWidth: 190 }}>
              {filteredData.goals.map(g => {
                const nid = `goal-${g.key}`;
                return (
                  <div key={g.id} data-node-id={nid}
                    className={`group bg-white rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getNodeOpacity(nid)}`}
                    style={{ width: 190 }}
                    onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                    <div style={{ borderLeft: `4px solid ${LAYER.goal.border}` }}
                      className="border border-slate-200/80 rounded-lg">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold rounded-md px-2 py-0.5"
                            style={{ fontSize: 10, background: LAYER.goal.badgeBg, color: LAYER.goal.badgeText }}>{g.key}</span>
                          <StatusBadge status={g.status} />
                        </div>
                        <p className="font-semibold leading-snug line-clamp-2" style={{ fontSize: 12, color: '#1E293B' }}>{g.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#E2E8F0' }}>
                            <div className="rounded-full" style={{ width: `${g.progress || 0}%`, height: 4, background: getProgressColor(g.progress || 0) }} />
                          </div>
                          <span className="font-bold" style={{ fontSize: 10, color: '#475569' }}>{Math.round(g.progress || 0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* KEY RESULTS — Blue, NOT purple */}
            <div data-column="krs" className="flex flex-col gap-2" style={{ minWidth: 180 }}>
              {filteredData.krs.map(kr => {
                const nid = `kr-${kr.key}`;
                return (
                  <div key={kr.id} data-node-id={nid}
                    className={`group bg-white rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getNodeOpacity(nid)}`}
                    style={{ width: 180 }}
                    onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                    <div style={{ borderLeft: `4px solid ${LAYER.kr.border}` }}
                      className="border border-slate-200/80 rounded-lg">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold rounded-md px-2 py-0.5"
                            style={{ fontSize: 10, background: LAYER.kr.badgeBg, color: LAYER.kr.badgeText }}>{kr.key}</span>
                          <StatusBadge status={kr.status} />
                        </div>
                        <p className="font-medium leading-snug line-clamp-2" style={{ fontSize: 11, color: '#334155' }}>{kr.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: '#E2E8F0' }}>
                            <div className="rounded-full" style={{ width: `${kr.progress || 0}%`, height: 3, background: getProgressColor(kr.progress || 0) }} />
                          </div>
                          <span className="font-bold" style={{ fontSize: 10, color: '#475569' }}>{Math.round(kr.progress || 0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {krsWithoutInitiative.length > 0 && filteredData.initiatives.length === 0 && (
                <GhostNode label="initiative" />
              )}
            </div>

            {/* INITIATIVES */}
            <div data-column="initiatives" className="flex flex-col gap-2" style={{ minWidth: 190 }}>
              {filteredData.initiatives.length > 0 ? filteredData.initiatives.map(ini => {
                const nid = `initiative-${ini.key}`;
                return (
                  <div key={ini.id} data-node-id={nid}
                    className={`group bg-white rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getNodeOpacity(nid)}`}
                    style={{ width: 190 }}
                    onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                    <div style={{ borderLeft: `4px solid ${LAYER.initiative.border}` }}
                      className="border border-slate-200/80 rounded-lg">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold rounded-md px-2 py-0.5"
                            style={{ fontSize: 10, background: LAYER.initiative.badgeBg, color: LAYER.initiative.badgeText }}>{ini.key}</span>
                          <StatusBadge status={ini.status} />
                        </div>
                        <p className="font-semibold leading-snug line-clamp-2" style={{ fontSize: 12, color: '#1E293B' }}>{ini.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#E2E8F0' }}>
                            <div className="rounded-full" style={{ width: `${ini.progress || 0}%`, height: 4, background: getProgressColor(ini.progress || 0) }} />
                          </div>
                          <span className="font-bold" style={{ fontSize: 10, color: '#475569' }}>{Math.round(ini.progress || 0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <GhostNode label="initiative" />
              )}
              {initsWithoutEpic.length > 0 && filteredData.epics.length === 0 && (
                <GhostNode label="epic" />
              )}
            </div>

            {/* EPICS */}
            <div data-column="epics" className="flex flex-col gap-2" style={{ minWidth: 180 }}>
              {filteredData.epics.length > 0 ? filteredData.epics.map(epic => {
                const nid = `epic-${epic.key}`;
                return (
                  <div key={epic.id} data-node-id={nid}
                    className={`group bg-white rounded-lg shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${getNodeOpacity(nid)}`}
                    style={{ width: 180 }}
                    onMouseEnter={() => highlightChain(nid)} onMouseLeave={clearHighlight}>
                    <div style={{ borderLeft: `4px solid ${LAYER.epic.border}` }}
                      className="border border-slate-200/80 rounded-lg">
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold rounded-md px-2 py-0.5"
                            style={{ fontSize: 10, background: LAYER.epic.badgeBg, color: LAYER.epic.badgeText }}>{epic.key}</span>
                          <StatusBadge status={epic.status} />
                        </div>
                        <p className="font-medium leading-snug line-clamp-2" style={{ fontSize: 11, color: '#334155' }}>{epic.title}</p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <GhostNode label="epic" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LEGEND BAR ═══ */}
      <div className="flex items-center justify-center gap-6 shrink-0"
        style={{ height: 36, background: '#fff', borderTop: '1px solid #E2E8F0' }}>
        {[
          { label: 'Strategic Theme', color: LAYER.theme.color },
          { label: 'Goal', color: LAYER.goal.color },
          { label: 'Key Result', color: LAYER.kr.color },
          { label: 'Initiative', color: LAYER.initiative.color },
          { label: 'Epic', color: LAYER.epic.color },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 font-medium"
            style={{ fontSize: 11, color: '#475569' }}>
            <div className="rounded-full" style={{ width: 10, height: 3, background: item.color }} />
            {item.label}
          </div>
        ))}
        <div style={{ width: 1, height: 12, background: '#E2E8F0', margin: '0 4px' }} />
        <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#94A3B8' }}>
          <div style={{ width: 10, height: 0, borderTop: '1px dashed #94A3B8' }} />
          Unlinked
        </div>
      </div>
    </div>
  );
}
