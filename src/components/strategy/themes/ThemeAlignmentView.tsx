/**
 * ThemeAlignmentView — Full-screen horizontal flow alignment map
 * Theme → Goal → KR → Initiative → Epic with SVG connectors
 * ResizeObserver-based connector recalculation
 */
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, X, ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import { useAlignmentMapData, type AlignmentNode } from '@/hooks/useAlignmentMapData';

// ── Layer colors ──
const LAYER_COLORS = {
  theme: '#2563EB',
  goal: '#0D9488',
  kr: '#7C3AED',
  initiative: '#D97706',
  epic: '#6366F1',
} as const;

const STATUS_DOT: Record<string, string> = {
  on_track: '#16A34A', active: '#16A34A', completed: '#16A34A', in_progress: '#2563EB',
  at_risk: '#D97706', approved: '#D97706',
  off_track: '#EF4444', cancelled: '#EF4444',
  draft: '#94A3B8', not_started: '#94A3B8', proposed: '#94A3B8', analyzing: '#94A3B8',
};
const getStatusColor = (s: string) => STATUS_DOT[s] || '#94A3B8';

interface RenderedPath {
  id: string;
  d: string;
  parentId: string;
  childId: string;
}

// ── Mini components ──
function ProgressBar({ value, height = 4, color }: { value: number; height?: number; color?: string }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#E2E8F0' }}>
      <div className="rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, height, background: color || '#2563EB' }} />
    </div>
  );
}

function StatusDot({ status, size = 8 }: { status: string; size?: number }) {
  return <div className="rounded-full flex-shrink-0" style={{ width: size, height: size, background: getStatusColor(status) }} />;
}

function NodeCard({
  node, layerColor, hoverBorder, isHighlighted, isDimmed,
  onMouseEnter, onMouseLeave, onClick,
}: {
  node: AlignmentNode; layerColor: string; hoverBorder: string;
  isHighlighted: boolean; isDimmed: boolean;
  onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void;
}) {
  const w = layerColor === LAYER_COLORS.theme ? 180 : layerColor === LAYER_COLORS.goal || layerColor === LAYER_COLORS.initiative ? 170 : 160;
  return (
    <div
      data-node-id={node.id}
      className="bg-white border rounded-lg shadow-sm cursor-pointer transition-all"
      style={{
        width: w, padding: w >= 170 ? 10 : 8,
        borderColor: isHighlighted ? hoverBorder : '#E2E8F0',
        boxShadow: isHighlighted ? `0 2px 8px ${layerColor}20` : undefined,
        opacity: isDimmed ? 0.3 : 1,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {layerColor === LAYER_COLORS.theme && node.color && (
          <div className="rounded-full flex-shrink-0" style={{ width: 10, height: 10, background: node.color }} />
        )}
        <span className="font-mono font-semibold rounded px-1.5 py-0.5" style={{ fontSize: 9, background: `${layerColor}15`, color: layerColor }}>
          {node.key}
        </span>
        <StatusDot status={node.status} size={6} />
      </div>
      <p className="font-medium leading-tight line-clamp-2" style={{ fontSize: w >= 170 ? 12 : 11, color: '#334155' }}>
        {node.title}
      </p>
      {node.progress !== undefined && (
        <div className="mt-1.5">
          <ProgressBar value={node.progress} height={w >= 170 ? 4 : 3} color={layerColor} />
        </div>
      )}
    </div>
  );
}

function GhostNode({ label, width = 160 }: { label: string; width?: number }) {
  return (
    <div className="border border-dashed rounded-md flex items-center justify-center" style={{ width, padding: 8, borderColor: '#CBD5E1', background: '#F8FAFC80' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}>{label}</p>
    </div>
  );
}

function ColumnHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b mb-2" style={{ background: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: '6px 6px 0 0' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>({count})</span>
    </div>
  );
}

// ── Main Component ──
export function ThemeAlignmentView({ onBack }: { onBack?: () => void }) {
  const { data, isLoading } = useAlignmentMapData();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [connectorPaths, setConnectorPaths] = useState<RenderedPath[]>([]);

  // Highlight set
  const highlightedIds = useMemo(() => {
    if (!hoveredNode || !data) return new Set<string>();
    const ids = new Set<string>();
    ids.add(hoveredNode);

    const allMaps = [data.themeToGoals, data.goalToKrs, data.krToInitiatives, data.initiativeToEpics];

    // Downstream
    const addDown = (nodeId: string, maps: Map<string, Set<string>>[]) => {
      for (const map of maps) {
        const children = map.get(nodeId);
        if (children) children.forEach(c => { ids.add(c); addDown(c, maps); });
      }
    };
    addDown(hoveredNode, allMaps);

    // Upstream
    const addUp = (nodeId: string) => {
      for (const map of allMaps) {
        for (const [parent, children] of map.entries()) {
          if (children.has(nodeId) && !ids.has(parent)) {
            ids.add(parent);
            addUp(parent);
          }
        }
      }
    };
    addUp(hoveredNode);

    return ids;
  }, [hoveredNode, data]);

  // Filter
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!selectedThemeFilter) return data;

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

  // ── Connector recalculation ──
  const recalculateConnections = useCallback(() => {
    if (!filteredData || !innerRef.current) return;
    const container = innerRef.current;
    const containerRect = container.getBoundingClientRect();
    const paths: RenderedPath[] = [];

    const getPos = (id: string) => {
      const el = container.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        right: (r.right - containerRect.left) / zoom,
        left: (r.left - containerRect.left) / zoom,
        centerY: (r.top + r.height / 2 - containerRect.top) / zoom,
      };
    };

    const addConns = (parentMap: Map<string, Set<string>>) => {
      for (const [parentId, childIds] of parentMap.entries()) {
        const pr = getPos(parentId);
        if (!pr) continue;
        childIds.forEach(childId => {
          const cr = getPos(childId);
          if (!cr) return;
          const x1 = pr.right + 4;
          const y1 = pr.centerY;
          const x2 = cr.left - 4;
          const y2 = cr.centerY;
          const dx = Math.abs(x2 - x1);
          const cp = Math.min(dx * 0.4, 60);
          paths.push({
            id: `${parentId}-${childId}`,
            d: `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`,
            parentId,
            childId,
          });
        });
      }
    };

    addConns(filteredData.themeToGoals);
    addConns(filteredData.goalToKrs);
    addConns(filteredData.krToInitiatives);
    addConns(filteredData.initiativeToEpics);

    setConnectorPaths(paths);
  }, [filteredData, zoom]);

  // ResizeObserver + window resize
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const raf = () => requestAnimationFrame(recalculateConnections);

    // Initial calc (double rAF to let layout settle)
    requestAnimationFrame(() => requestAnimationFrame(recalculateConnections));

    const ro = new ResizeObserver(raf);
    ro.observe(inner);
    inner.querySelectorAll('[data-column]').forEach(col => ro.observe(col));

    window.addEventListener('resize', raf);
    return () => { ro.disconnect(); window.removeEventListener('resize', raf); };
  }, [recalculateConnections]);

  // Recalc when zoom/pan/filter changes
  useEffect(() => {
    requestAnimationFrame(recalculateConnections);
  }, [zoom, pan, selectedThemeFilter, recalculateConnections]);

  // ── Full-screen: hide shell ──
  useEffect(() => {
    const sidebar = document.querySelector('[data-catalyst-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-catalyst-header]') as HTMLElement;
    const main = document.querySelector('[data-catalyst-main]') as HTMLElement;

    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';
    if (main) {
      main.style.marginLeft = '0';
      main.style.maxWidth = '100vw';
      main.style.width = '100vw';
      main.style.padding = '0';
    }

    return () => {
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (main) {
        main.style.marginLeft = '';
        main.style.maxWidth = '';
        main.style.width = '';
        main.style.padding = '';
      }
    };
  }, []);

  // ── Pan handlers ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => { setZoom(0.85); setPan({ x: 0, y: 0 }); }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <div className="animate-pulse text-sm" style={{ color: '#94A3B8' }}>Loading alignment data…</div>
      </div>
    );
  }

  if (!filteredData || filteredData.themes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: '#F8FAFC' }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>No alignment data available.</p>
      </div>
    );
  }

  const anyHover = hoveredNode !== null;
  const stats = data?.stats;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#F8FAFC' }}>
      {/* ─── Top toolbar ─── */}
      <div className="flex items-center justify-between h-12 px-4 bg-white border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack?.()}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: '#64748B' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
          >
            <ArrowLeft size={16} />
            Back to Strategic Themes
          </button>
          <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />
          <h1 className="text-sm font-semibold" style={{ color: '#0F172A' }}>Strategy Alignment Map</h1>
        </div>

        {/* Center: Stats */}
        {stats && (
          <div className="flex items-center gap-4 text-xs" style={{ color: '#64748B' }}>
            <StatItem label="Linked KRs" value={stats.linkedKrs} total={stats.totalKrs} />
            <span style={{ width: 1, height: 16, background: '#E2E8F0' }} />
            <StatItem label="Initiatives" value={stats.linkedInitiatives} total={stats.totalInitiatives} />
            <span style={{ width: 1, height: 16, background: '#E2E8F0' }} />
            <StatItem label="Epics" value={stats.linkedEpics} total={stats.totalEpics} />
            <span style={{ width: 1, height: 16, background: '#E2E8F0' }} />
            <span>Full Chains: <strong style={{ color: '#0F172A' }}>{stats.fullChains}</strong></span>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Theme filter */}
          <select
            className="h-7 text-xs border rounded-md px-2 bg-white"
            style={{ borderColor: '#E2E8F0', color: '#334155' }}
            value={selectedThemeFilter || 'all'}
            onChange={e => setSelectedThemeFilter(e.target.value === 'all' ? null : e.target.value)}
          >
            <option value="all">All Themes</option>
            {data?.themes.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>

          {/* Zoom */}
          <div className="flex items-center gap-0.5 ml-2">
            <ToolBtn onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}><ZoomOut size={14} /></ToolBtn>
            <span className="text-[10px] font-mono w-8 text-center" style={{ color: '#94A3B8' }}>{Math.round(zoom * 100)}%</span>
            <ToolBtn onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn size={14} /></ToolBtn>
            <ToolBtn onClick={resetView} title="Reset view"><Crosshair size={14} /></ToolBtn>
          </div>

          <ToolBtn onClick={() => onBack?.()} title="Exit" className="ml-2"><X size={16} /></ToolBtn>
        </div>
      </div>

      {/* ─── Canvas ─── */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto select-none"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
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
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
            {connectorPaths.map(conn => {
              const isLit = anyHover && highlightedIds.has(conn.parentId) && highlightedIds.has(conn.childId);
              const isDimmed = anyHover && !isLit;
              return (
                <path
                  key={conn.id}
                  d={conn.d}
                  stroke={isLit ? '#2563EB' : '#CBD5E1'}
                  strokeWidth={isLit ? 2 : 1.5}
                  fill="none"
                  opacity={isDimmed ? 0.12 : isLit ? 1 : 0.5}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* Column headers */}
          <div className="flex gap-12 px-6 pt-4 pb-2" style={{ zIndex: 2, position: 'relative' }}>
            <div style={{ minWidth: 180 }}><ColumnHeader label="Themes" count={filteredData.themes.length} color={LAYER_COLORS.theme} /></div>
            <div style={{ minWidth: 170 }}><ColumnHeader label="Goals" count={filteredData.goals.length} color={LAYER_COLORS.goal} /></div>
            <div style={{ minWidth: 160 }}><ColumnHeader label="Key Results" count={filteredData.krs.length} color={LAYER_COLORS.kr} /></div>
            <div style={{ minWidth: 170 }}><ColumnHeader label="Initiatives" count={filteredData.initiatives.length} color={LAYER_COLORS.initiative} /></div>
            <div style={{ minWidth: 160 }}><ColumnHeader label="Epics" count={filteredData.epics.length} color={LAYER_COLORS.epic} /></div>
          </div>

          {/* Node columns */}
          <div className="relative flex gap-12 px-6 pb-6" style={{ zIndex: 2 }}>
            {/* Themes */}
            <div data-column="themes" className="flex flex-col gap-2" style={{ minWidth: 180 }}>
              {filteredData.themes.map(t => (
                <NodeCard key={t.id} node={t} layerColor={LAYER_COLORS.theme} hoverBorder="#93C5FD"
                  isHighlighted={anyHover ? highlightedIds.has(t.id) : false}
                  isDimmed={anyHover ? !highlightedIds.has(t.id) : false}
                  onMouseEnter={() => setHoveredNode(t.id)} onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setSelectedThemeFilter(prev => prev === t.id ? null : t.id)}
                />
              ))}
            </div>

            {/* Goals */}
            <div data-column="goals" className="flex flex-col gap-2" style={{ minWidth: 170 }}>
              {filteredData.goals.length === 0 ? <GhostNode label="No goals" width={170} /> :
                filteredData.goals.map(g => (
                  <NodeCard key={g.id} node={g} layerColor={LAYER_COLORS.goal} hoverBorder="#5EEAD4"
                    isHighlighted={anyHover ? highlightedIds.has(g.id) : false}
                    isDimmed={anyHover ? !highlightedIds.has(g.id) : false}
                    onMouseEnter={() => setHoveredNode(g.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => {}}
                  />
                ))
              }
            </div>

            {/* KRs */}
            <div data-column="krs" className="flex flex-col gap-2" style={{ minWidth: 160 }}>
              {filteredData.krs.length === 0 ? <GhostNode label="No KRs" /> :
                filteredData.krs.map(k => (
                  <NodeCard key={k.id} node={k} layerColor={LAYER_COLORS.kr} hoverBorder="#C4B5FD"
                    isHighlighted={anyHover ? highlightedIds.has(k.id) : false}
                    isDimmed={anyHover ? !highlightedIds.has(k.id) : false}
                    onMouseEnter={() => setHoveredNode(k.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => {}}
                  />
                ))
              }
            </div>

            {/* Initiatives */}
            <div data-column="initiatives" className="flex flex-col gap-2" style={{ minWidth: 170 }}>
              {filteredData.initiatives.length === 0 ? <GhostNode label="No linked initiative" width={170} /> :
                filteredData.initiatives.map(i => (
                  <NodeCard key={i.id} node={i} layerColor={LAYER_COLORS.initiative} hoverBorder="#FCD34D"
                    isHighlighted={anyHover ? highlightedIds.has(i.id) : false}
                    isDimmed={anyHover ? !highlightedIds.has(i.id) : false}
                    onMouseEnter={() => setHoveredNode(i.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => {}}
                  />
                ))
              }
            </div>

            {/* Epics */}
            <div data-column="epics" className="flex flex-col gap-2" style={{ minWidth: 160 }}>
              {filteredData.epics.length === 0 ? <GhostNode label="No linked epic" /> :
                filteredData.epics.map(e => (
                  <NodeCard key={e.id} node={e} layerColor={LAYER_COLORS.epic} hoverBorder="#A5B4FC"
                    isHighlighted={anyHover ? highlightedIds.has(e.id) : false}
                    isDimmed={anyHover ? !highlightedIds.has(e.id) : false}
                    onMouseEnter={() => setHoveredNode(e.id)} onMouseLeave={() => setHoveredNode(null)} onClick={() => {}}
                  />
                ))
              }
            </div>
          </div>
        </div>
      </div>

      {/* ─── Legend bar ─── */}
      <div className="flex items-center justify-center gap-6 h-8 bg-white border-t shrink-0" style={{ borderColor: '#E2E8F0' }}>
        {[
          { label: 'Theme', color: LAYER_COLORS.theme },
          { label: 'Goal', color: LAYER_COLORS.goal },
          { label: 'Key Result', color: LAYER_COLORS.kr },
          { label: 'Initiative', color: LAYER_COLORS.initiative },
          { label: 'Epic', color: LAYER_COLORS.epic },
        ].map(i => (
          <div key={i.label} className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: 8, height: 8, background: i.color }} />
            <span style={{ fontSize: 10, color: '#64748B' }}>{i.label}</span>
          </div>
        ))}
        <div style={{ width: 1, height: 12, background: '#E2E8F0', margin: '0 4px' }} />
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 0, borderTop: '1px dashed #94A3B8' }} />
          <span style={{ fontSize: 10, color: '#64748B' }}>Unlinked</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──
function StatItem({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const pctColor = pct >= 60 ? '#16A34A' : '#D97706';
  return (
    <span>
      {label}: <strong style={{ color: '#0F172A' }}>{value}</strong>
      <span style={{ color: '#94A3B8' }}>/{total}</span>
      <span style={{ fontWeight: 600, color: pctColor, marginLeft: 2 }}>({pct}%)</span>
    </span>
  );
}

function ToolBtn({ onClick, title, className, children }: { onClick: () => void; title?: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors ${className || ''}`}
      style={{ color: '#64748B' }}
    >
      {children}
    </button>
  );
}
