/**
 * ThemeAlignmentView — Horizontal flow alignment map
 * Theme → Goal → KR → Initiative → Epic with SVG connectors
 */
import { useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
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
  draft: '#94A3B8', not_started: '#94A3B8', proposed: '#94A3B8',
};

const getStatusColor = (s: string) => STATUS_DOT[s] || '#94A3B8';

// ── Mini progress bar ──
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

// ── Stats Bar ──
function StatsBar({ stats }: { stats: ReturnType<typeof useAlignmentMapData>['data'] extends infer D ? D extends { stats: infer S } ? S : never : never }) {
  if (!stats) return null;
  const items = [
    { label: 'Linked KRs', value: stats.linkedKrs, total: stats.totalKrs },
    { label: 'Linked Initiatives', value: stats.linkedInitiatives, total: stats.totalInitiatives },
    { label: 'Linked Epics', value: stats.linkedEpics, total: stats.totalEpics },
    { label: 'Full Chain', value: stats.fullChains, total: undefined },
  ];
  return (
    <div className="flex items-center gap-6 px-4 border-b" style={{ height: 36, background: '#FFF', borderColor: '#E2E8F0' }}>
      {items.map((item, i) => {
        const pct = item.total ? Math.round((item.value / item.total) * 100) : null;
        const pctColor = pct !== null ? (pct >= 60 ? '#16A34A' : pct >= 30 ? '#D97706' : '#EF4444') : '#0F172A';
        return (
          <div key={i} className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#64748B' }}>
            <span>{item.label}:</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.value}</span>
            {item.total !== undefined && (
              <>
                <span>/{item.total}</span>
                <span style={{ fontWeight: 600, color: pctColor }}>({pct}%)</span>
              </>
            )}
            {i < items.length - 1 && <span style={{ margin: '0 4px', color: '#CBD5E1' }}>|</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Node Card ──
function NodeCard({
  node, layerColor, hoverBorder, isHighlighted, isDimmed, onMouseEnter, onMouseLeave, onClick,
}: {
  node: AlignmentNode; layerColor: string; hoverBorder: string;
  isHighlighted: boolean; isDimmed: boolean;
  onMouseEnter: () => void; onMouseLeave: () => void; onClick: () => void;
}) {
  const w = layerColor === LAYER_COLORS.theme ? 180 : layerColor === LAYER_COLORS.goal || layerColor === LAYER_COLORS.initiative ? 170 : 160;
  const keyBg = `${layerColor}15`;
  const keyColor = layerColor;

  return (
    <div
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
      data-node-id={node.id}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {layerColor === LAYER_COLORS.theme && node.color && (
          <div className="rounded-full flex-shrink-0" style={{ width: 10, height: 10, background: node.color }} />
        )}
        <span className="font-mono font-semibold rounded px-1.5 py-0.5" style={{ fontSize: 9, background: keyBg, color: keyColor }}>
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

// ── Legend ──
function Legend() {
  const items = [
    { label: 'Theme', color: LAYER_COLORS.theme },
    { label: 'Goal', color: LAYER_COLORS.goal },
    { label: 'Key Result', color: LAYER_COLORS.kr },
    { label: 'Initiative', color: LAYER_COLORS.initiative },
    { label: 'Epic', color: LAYER_COLORS.epic },
  ];
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-4 px-3 py-1.5 rounded-md border" style={{ background: '#FFFFFFEE', borderColor: '#E2E8F0', zIndex: 10 }}>
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1.5">
          <div className="rounded-full" style={{ width: 8, height: 8, background: i.color }} />
          <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{i.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Column Header ──
function ColumnHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b mb-2" style={{ background: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: '6px 6px 0 0' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>({count})</span>
    </div>
  );
}

// ── Main Component ──
export function ThemeAlignmentView() {
  const { data, isLoading } = useAlignmentMapData();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedThemeFilter, setSelectedThemeFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [connectorPaths, setConnectorPaths] = useState<{ id: string; d: string; parentId: string; childId: string }[]>([]);

  // Build the highlight set for hover
  const highlightedIds = useMemo(() => {
    if (!hoveredNode || !data) return new Set<string>();
    const ids = new Set<string>();
    ids.add(hoveredNode);

    const addDownstream = (nodeId: string, maps: Map<string, Set<string>>[]) => {
      if (maps.length === 0) return;
      const [currentMap, ...rest] = maps;
      const children = currentMap.get(nodeId);
      if (children) {
        children.forEach(cid => { ids.add(cid); addDownstream(cid, rest); });
      }
    };

    const addUpstream = (nodeId: string, maps: Map<string, Set<string>>[]) => {
      for (const map of maps) {
        for (const [parent, children] of map.entries()) {
          if (children.has(nodeId)) {
            ids.add(parent);
            addUpstream(parent, maps);
          }
        }
      }
    };

    const allMaps = [data.themeToGoals, data.goalToKrs, data.krToInitiatives, data.initiativeToEpics];
    addDownstream(hoveredNode, allMaps);
    addUpstream(hoveredNode, allMaps);

    // Also trace partial chains
    const downMaps = [
      { map: data.themeToGoals, next: [data.goalToKrs, data.krToInitiatives, data.initiativeToEpics] },
      { map: data.goalToKrs, next: [data.krToInitiatives, data.initiativeToEpics] },
      { map: data.krToInitiatives, next: [data.initiativeToEpics] },
      { map: data.initiativeToEpics, next: [] },
    ];

    for (const { map, next } of downMaps) {
      const children = map.get(hoveredNode);
      if (children) {
        children.forEach(cid => {
          ids.add(cid);
          addDownstream(cid, next);
        });
      }
    }

    return ids;
  }, [hoveredNode, data]);

  // Filter data by selected theme
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!selectedThemeFilter) return data;

    const goalIds = data.themeToGoals.get(selectedThemeFilter) || new Set();
    const krIds = new Set<string>();
    goalIds.forEach(gid => {
      const krs = data.goalToKrs.get(gid);
      if (krs) krs.forEach(k => krIds.add(k));
    });
    const iniIds = new Set<string>();
    krIds.forEach(kid => {
      const inis = data.krToInitiatives.get(kid);
      if (inis) inis.forEach(i => iniIds.add(i));
    });
    const epicIds = new Set<string>();
    iniIds.forEach(iid => {
      const eps = data.initiativeToEpics.get(iid);
      if (eps) eps.forEach(e => epicIds.add(e));
    });

    return {
      ...data,
      themes: data.themes.filter(t => t.id === selectedThemeFilter),
      goals: data.goals.filter(g => goalIds.has(g.id)),
      krs: data.krs.filter(k => krIds.has(k.id)),
      initiatives: data.initiatives.filter(i => iniIds.has(i.id)),
      epics: data.epics.filter(e => epicIds.has(e.id)),
    };
  }, [data, selectedThemeFilter]);

  // Compute SVG connectors after layout
  useLayoutEffect(() => {
    if (!filteredData || !contentRef.current) return;
    const timer = setTimeout(() => {
      const container = contentRef.current;
      if (!container) return;
      const paths: typeof connectorPaths = [];
      const rect = container.getBoundingClientRect();

      const getNodeRect = (id: string) => {
        const el = container.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          left: r.left - rect.left,
          right: r.right - rect.left,
          centerY: r.top - rect.top + r.height / 2,
        };
      };

      const addConnections = (parentMap: Map<string, Set<string>>) => {
        for (const [parentId, childIds] of parentMap.entries()) {
          const pr = getNodeRect(parentId);
          if (!pr) continue;
          childIds.forEach(childId => {
            const cr = getNodeRect(childId);
            if (!cr) return;
            const x1 = pr.right;
            const y1 = pr.centerY;
            const x2 = cr.left;
            const y2 = cr.centerY;
            const midX = (x1 + x2) / 2;
            paths.push({
              id: `${parentId}-${childId}`,
              d: `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`,
              parentId,
              childId,
            });
          });
        }
      };

      addConnections(filteredData.themeToGoals);
      addConnections(filteredData.goalToKrs);
      addConnections(filteredData.krToInitiatives);
      addConnections(filteredData.initiativeToEpics);

      setConnectorPaths(paths);
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredData, zoom, pan]);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current && !(e.target as HTMLElement).closest('.alignment-map-content')) return;
    if ((e.target as HTMLElement).closest('[data-node-id]')) return;
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

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl border flex items-center justify-center" style={{ background: '#F8FAFC', borderColor: '#E2E8F0', minHeight: 400 }}>
        <div className="animate-pulse text-sm" style={{ color: '#94A3B8' }}>Loading alignment data…</div>
      </div>
    );
  }

  if (!filteredData || filteredData.themes.length === 0) {
    return (
      <div className="rounded-xl border flex flex-col items-center justify-center" style={{ background: '#F8FAFC', borderColor: '#E2E8F0', minHeight: 400, padding: 40 }}>
        <p style={{ fontSize: 14, color: '#64748B' }}>No alignment data available.</p>
      </div>
    );
  }

  const anyHover = hoveredNode !== null;

  return (
    <div className="flex flex-col rounded-xl border overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
      <StatsBar stats={data?.stats!} />

      {/* Filter chip */}
      {selectedThemeFilter && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b" style={{ borderColor: '#E2E8F0', background: '#EFF6FF' }}>
          <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 500 }}>
            Filtered: {filteredData.themes[0]?.title}
          </span>
          <button
            onClick={() => setSelectedThemeFilter(null)}
            className="text-xs font-medium hover:underline"
            style={{ color: '#2563EB' }}
          >Show All</button>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative select-none"
        style={{ background: '#F8FAFC', height: 'calc(100vh - 340px)', overflow: 'hidden', cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded-md border bg-white hover:bg-slate-50" style={{ borderColor: '#E2E8F0' }}>
            <ZoomIn size={14} color="#64748B" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-md border bg-white hover:bg-slate-50" style={{ borderColor: '#E2E8F0' }}>
            <ZoomOut size={14} color="#64748B" />
          </button>
          <button onClick={resetView} className="p-1.5 rounded-md border bg-white hover:bg-slate-50" style={{ borderColor: '#E2E8F0' }}>
            <RotateCcw size={14} color="#64748B" />
          </button>
          <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>{Math.round(zoom * 100)}%</span>
        </div>

        {/* Transformed content */}
        <div
          ref={contentRef}
          className="alignment-map-content"
          style={{
            display: 'flex', gap: 60, padding: 24, minWidth: 'fit-content',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connectors */}
          <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
            {connectorPaths.map(conn => {
              const isLit = anyHover && highlightedIds.has(conn.parentId) && highlightedIds.has(conn.childId);
              return (
                <path
                  key={conn.id}
                  d={conn.d}
                  stroke={isLit ? '#2563EB' : '#CBD5E1'}
                  strokeWidth={isLit ? 2 : 1.5}
                  fill="none"
                  opacity={anyHover ? (isLit ? 1 : 0.15) : 0.6}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>

          {/* Column: Themes */}
          <div className="flex flex-col" style={{ minWidth: 180, gap: 8 }}>
            <ColumnHeader label="Themes" count={filteredData.themes.length} />
            {filteredData.themes.map(t => (
              <NodeCard
                key={t.id} node={t}
                layerColor={LAYER_COLORS.theme} hoverBorder="#93C5FD"
                isHighlighted={anyHover ? highlightedIds.has(t.id) : false}
                isDimmed={anyHover ? !highlightedIds.has(t.id) : false}
                onMouseEnter={() => setHoveredNode(t.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => setSelectedThemeFilter(prev => prev === t.id ? null : t.id)}
              />
            ))}
          </div>

          {/* Column: Goals */}
          <div className="flex flex-col" style={{ minWidth: 170, gap: 8 }}>
            <ColumnHeader label="Goals" count={filteredData.goals.length} />
            {filteredData.goals.length === 0
              ? <GhostNode label="No goals" width={170} />
              : filteredData.goals.map(g => (
                <NodeCard
                  key={g.id} node={g}
                  layerColor={LAYER_COLORS.goal} hoverBorder="#5EEAD4"
                  isHighlighted={anyHover ? highlightedIds.has(g.id) : false}
                  isDimmed={anyHover ? !highlightedIds.has(g.id) : false}
                  onMouseEnter={() => setHoveredNode(g.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {}}
                />
              ))
            }
          </div>

          {/* Column: KRs */}
          <div className="flex flex-col" style={{ minWidth: 160, gap: 8 }}>
            <ColumnHeader label="Key Results" count={filteredData.krs.length} />
            {filteredData.krs.length === 0
              ? <GhostNode label="No KRs" />
              : filteredData.krs.map(k => (
                <NodeCard
                  key={k.id} node={k}
                  layerColor={LAYER_COLORS.kr} hoverBorder="#C4B5FD"
                  isHighlighted={anyHover ? highlightedIds.has(k.id) : false}
                  isDimmed={anyHover ? !highlightedIds.has(k.id) : false}
                  onMouseEnter={() => setHoveredNode(k.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {}}
                />
              ))
            }
          </div>

          {/* Column: Initiatives */}
          <div className="flex flex-col" style={{ minWidth: 170, gap: 8 }}>
            <ColumnHeader label="Initiatives" count={filteredData.initiatives.length} />
            {filteredData.initiatives.length === 0
              ? <GhostNode label="No linked initiative" width={170} />
              : filteredData.initiatives.map(i => (
                <NodeCard
                  key={i.id} node={i}
                  layerColor={LAYER_COLORS.initiative} hoverBorder="#FCD34D"
                  isHighlighted={anyHover ? highlightedIds.has(i.id) : false}
                  isDimmed={anyHover ? !highlightedIds.has(i.id) : false}
                  onMouseEnter={() => setHoveredNode(i.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {}}
                />
              ))
            }
          </div>

          {/* Column: Epics */}
          <div className="flex flex-col" style={{ minWidth: 160, gap: 8 }}>
            <ColumnHeader label="Epics" count={filteredData.epics.length} />
            {filteredData.epics.length === 0
              ? <GhostNode label="No linked epic" />
              : filteredData.epics.map(e => (
                <NodeCard
                  key={e.id} node={e}
                  layerColor={LAYER_COLORS.epic} hoverBorder="#A5B4FC"
                  isHighlighted={anyHover ? highlightedIds.has(e.id) : false}
                  isDimmed={anyHover ? !highlightedIds.has(e.id) : false}
                  onMouseEnter={() => setHoveredNode(e.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {}}
                />
              ))
            }
          </div>
        </div>

        <Legend />
      </div>
    </div>
  );
}
