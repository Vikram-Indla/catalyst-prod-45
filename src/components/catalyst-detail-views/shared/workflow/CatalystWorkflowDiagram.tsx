import React, { useId, useMemo, useState } from 'react';
import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';
import { STATUS_CATEGORY_BG, STATUS_TEXT } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

const CAT_COLOR: Record<string, string> = {
  todo:        STATUS_CATEGORY_BG.todo,        // var(--ds-border) grey
  in_progress: STATUS_CATEGORY_BG.in_progress, // var(--ds-background-information) periwinkle blue
  done:        STATUS_CATEGORY_BG.done,         // var(--ds-background-success-bold) lime green
};

const NODE_W = 155;
const NODE_H = 36;
const H_GAP = 56;
const V_GAP = 32;
const START_W = 48;
const START_H = 24;

export interface CatalystWorkflowDiagramProps {
  statuses: TypeStatus[];
  transitions: Transition[];
  initialStatusId: string | null;
  currentStatusId?: string;
  showTransitionLabels: boolean;
  zoom: number;
  selectedNodeId?: string;
  connectingFromId?: string;
  highlightedTransitionIds?: Set<string>;
  onNodeClick?: (statusId: string) => void;
  onEdgeDelete?: (transitionId: string) => void;
}

function assignLayers(
  statuses: TypeStatus[],
  transitions: Transition[],
  initialStatusId: string | null,
): Map<string, number> {
  const ids = statuses.map((s) => s.id);
  const idSet = new Set(ids);
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const t of transitions) {
    if (t.from_status_id && idSet.has(t.from_status_id) && idSet.has(t.to_status_id)) {
      adj.get(t.from_status_id)!.push(t.to_status_id);
    }
  }
  const layerMap = new Map<string, number>();
  const queue: string[] = [];
  const seed = initialStatusId && idSet.has(initialStatusId) ? initialStatusId : ids[0];
  if (seed) { layerMap.set(seed, 0); queue.push(seed); }
  while (queue.length) {
    const cur = queue.shift()!;
    const curLayer = layerMap.get(cur)!;
    for (const nxt of (adj.get(cur) ?? [])) {
      if (!layerMap.has(nxt)) { layerMap.set(nxt, curLayer + 1); queue.push(nxt); }
    }
  }
  let maxLayer = 0;
  for (const l of layerMap.values()) if (l > maxLayer) maxLayer = l;
  for (const id of ids) {
    if (!layerMap.has(id)) { layerMap.set(id, maxLayer + 1); maxLayer += 1; }
  }
  return layerMap;
}

export function CatalystWorkflowDiagram({
  statuses,
  transitions,
  initialStatusId,
  currentStatusId,
  showTransitionLabels,
  zoom,
  selectedNodeId,
  connectingFromId,
  highlightedTransitionIds,
  onNodeClick,
  onEdgeDelete,
}: CatalystWorkflowDiagramProps) {
  const uid = useId();
  const markerId = `arrow-${uid.replace(/:/g, '')}`;
  const markerHlId = `arrow-hl-${uid.replace(/:/g, '')}`;
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const { nodes, edges, svgW, svgH } = useMemo(() => {
    if (!statuses.length) return { nodes: [], edges: [], svgW: 200, svgH: 100 };
    const layerMap = assignLayers(statuses, transitions, initialStatusId);
    const layers = new Map<number, TypeStatus[]>();
    for (const s of statuses) {
      const l = layerMap.get(s.id) ?? 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(s);
    }
    const sortedLayerNums = [...layers.keys()].sort((a, b) => a - b);
    const maxColCount = Math.max(...[...layers.values()].map((a) => a.length));
    const totalLayers = sortedLayerNums.length + 1;
    const svgW = Math.max((NODE_W + H_GAP) * maxColCount + H_GAP, START_W + H_GAP * 2);
    const svgH = totalLayers * (NODE_H + V_GAP) + V_GAP + START_H;
    const posMap = new Map<string, { x: number; y: number }>();
    const startY = V_GAP;
    sortedLayerNums.forEach((layerNum, li) => {
      const group = layers.get(layerNum)!;
      const rowW = group.length * NODE_W + (group.length - 1) * H_GAP;
      const rowLeft = (svgW - rowW) / 2;
      const y = startY + START_H + V_GAP + li * (NODE_H + V_GAP);
      group.forEach((s, i) => { posMap.set(s.id, { x: rowLeft + i * (NODE_W + H_GAP), y }); });
    });
    const idSet = new Set(statuses.map((s) => s.id));
    const edges = transitions
      .filter((t) => idSet.has(t.to_status_id))
      .map((t) => ({
        id: t.id,
        from: t.from_status_id,
        to: t.to_status_id,
      }));
    const nodes = statuses.map((s) => ({ ...s, pos: posMap.get(s.id) ?? { x: 0, y: 0 } }));
    return { nodes, edges, svgW, svgH };
  }, [statuses, transitions, initialStatusId]);

  const startX = svgW / 2 - START_W / 2;
  const startY = V_GAP;
  const scale = zoom / 100;
  const isInteractive = !!onNodeClick || !!onEdgeDelete;

  return (
    <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
      <svg
        width={svgW * scale}
        height={svgH * scale}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', fontFamily: "var(--ds-font-family-body, 'Atlassian Sans', sans-serif)" }}
      >
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--ds-border)" />
          </marker>
          <marker id={markerHlId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--ds-link)" />
          </marker>
        </defs>

        {/* START node */}
        <rect x={startX} y={startY} width={START_W} height={START_H} rx={START_H / 2} fill="var(--ds-text)" />
        <text x={startX + START_W / 2} y={startY + START_H / 2 + 1} textAnchor="middle" dominantBaseline="middle"
          fontSize={'var(--ds-font-size-50)'} fontWeight={600} fill="var(--ds-surface)">START</text>

        {/* Arrow from START to initial */}
        {initialStatusId && (() => {
          const targetNode = nodes.find((n) => n.id === initialStatusId);
          if (!targetNode) return null;
          const fx = startX + START_W / 2;
          const fy = startY + START_H;
          const tx = targetNode.pos.x + NODE_W / 2;
          const ty = targetNode.pos.y;
          const cy = (fy + ty) / 2;
          return (
            <path d={`M ${fx} ${fy} C ${fx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`}
              fill="none" stroke="var(--ds-border)" strokeWidth={1.5}
              markerEnd={`url(#${markerId})`} />
          );
        })()}

        {/* Edges */}
        {edges.map((e) => {
          const fromNode = e.from ? nodes.find((n) => n.id === e.from) : null;
          const toNode = nodes.find((n) => n.id === e.to);
          if (!toNode) return null;

          const tx = toNode.pos.x + NODE_W / 2;
          const ty = toNode.pos.y;

          let d: string;
          let midX: number;
          let midY: number;

          if (!fromNode) {
            const fx = 0;
            const fy = toNode.pos.y + NODE_H / 2;
            d = `M ${fx} ${fy} L ${toNode.pos.x} ${fy}`;
            midX = toNode.pos.x / 2;
            midY = fy;
          } else {
            const fx = fromNode.pos.x + NODE_W / 2;
            const fy = fromNode.pos.y + NODE_H;
            const cy = (fy + ty) / 2;
            d = `M ${fx} ${fy} C ${fx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
            midX = (fx + tx) / 2;
            midY = (fy + ty) / 2;
          }

          const isHighlighted = highlightedTransitionIds?.has(e.id);
          const isHovered = hoveredEdgeId === e.id;
          const strokeColor = isHighlighted
            ? 'var(--ds-link)'
            : 'var(--ds-border)';
          const strokeW = isHighlighted ? 2 : 1.5;
          const arrowRef = isHighlighted ? `url(#${markerHlId})` : `url(#${markerId})`;

          return (
            <g
              key={e.id}
              style={{ cursor: onEdgeDelete ? 'pointer' : 'default' }}
              onMouseEnter={() => setHoveredEdgeId(e.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              onClick={() => onEdgeDelete?.(e.id)}
            >
              {/* Invisible wide path for easy clicking */}
              <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
              {/* Visible path */}
              <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeW}
                markerEnd={arrowRef} />
              {/* Delete badge — shown on hover when onEdgeDelete wired */}
              {onEdgeDelete && isHovered && (
                <>
                  <circle cx={midX} cy={midY} r={8} fill="var(--ds-background-danger-bold)" />
                  <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="middle"
                    fontSize={'var(--ds-font-size-100)'} fontWeight={600} fill="var(--ds-surface)" style={{ pointerEvents: 'none' }}>
                    ×
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Status nodes */}
        {nodes.map((node) => {
          const isCurrent = node.id === currentStatusId;
          const isSelected = node.id === selectedNodeId;
          const isConnectSource = node.id === connectingFromId;
          const isConnectTarget = connectingFromId && node.id !== connectingFromId;
          const bgColor = node.color ? node.color : (CAT_COLOR[node.category] ?? STATUS_CATEGORY_BG.todo);

          return (
            <g
              key={node.id}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              onClick={() => onNodeClick?.(node.id)}
            >
              {/* Connect-source ring — solid amber, thicker */}
              {isConnectSource && (
                <rect x={node.pos.x - 4} y={node.pos.y - 4} width={NODE_W + 8} height={NODE_H + 8}
                  rx={8} fill="none" stroke="var(--ds-background-warning-bold)" strokeWidth={3} />
              )}
              {/* Selection ring — dashed blue (non-connect-mode) */}
              {isSelected && !isConnectSource && (
                <rect x={node.pos.x - 3} y={node.pos.y - 3} width={NODE_W + 6} height={NODE_H + 6}
                  rx={7} fill="none" stroke="var(--ds-border-brand)" strokeWidth={2}
                  strokeDasharray="4 2" />
              )}
              {/* Connect-target hint — faint highlight on non-source nodes */}
              {isConnectTarget && (
                <rect x={node.pos.x - 2} y={node.pos.y - 2} width={NODE_W + 4} height={NODE_H + 4}
                  rx={6} fill="var(--ds-link, rgba(12,102,228,0.08))" stroke="none" />
              )}
              <rect
                x={node.pos.x} y={node.pos.y} width={NODE_W} height={NODE_H} rx={4}
                fill={bgColor}
                stroke={isCurrent ? 'var(--ds-border-brand)' : 'var(--ds-border)'}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={node.pos.x + NODE_W / 2} y={node.pos.y + NODE_H / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={'var(--ds-font-size-100)'} fontWeight={500} fill={STATUS_TEXT}
                style={{ pointerEvents: 'none' }}
              >
                {node.name.length > 22 ? `${node.name.slice(0, 21)}…` : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
