import React, { useId, useMemo } from 'react';
import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';

// Map DB category to Tier-1 lozenge color tokens
const CAT_COLOR: Record<string, string> = {
  todo:        'var(--ds-background-neutral, #F1F2F4)',
  in_progress: 'var(--ds-background-information, #E9F2FE)',
  done:        'var(--ds-background-success, #DCFFF1)',
};
const CAT_TEXT: Record<string, string> = {
  todo:        'var(--ds-text-subtle, #42526E)',
  in_progress: 'var(--ds-text-information, #0052CC)',
  done:        'var(--ds-text-success, #006644)',
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
}

interface Layer {
  id: string;
  layer: number;
}

function assignLayers(
  statuses: TypeStatus[],
  transitions: Transition[],
  initialStatusId: string | null,
): Map<string, number> {
  const ids = statuses.map((s) => s.id);
  const idSet = new Set(ids);

  // adjacency (explicit directed edges only; global transitions handled separately)
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const t of transitions) {
    if (t.from_status_id && idSet.has(t.from_status_id) && idSet.has(t.to_status_id)) {
      adj.get(t.from_status_id)!.push(t.to_status_id);
    }
  }

  const layerMap = new Map<string, number>();
  const queue: string[] = [];

  // seed with initial or first status
  const seed = initialStatusId && idSet.has(initialStatusId) ? initialStatusId : ids[0];
  if (seed) {
    layerMap.set(seed, 0);
    queue.push(seed);
  }

  // BFS forward pass
  while (queue.length) {
    const cur = queue.shift()!;
    const curLayer = layerMap.get(cur)!;
    for (const nxt of (adj.get(cur) ?? [])) {
      if (!layerMap.has(nxt)) {
        layerMap.set(nxt, curLayer + 1);
        queue.push(nxt);
      }
    }
  }

  // place unreachable nodes after the deepest known layer
  let maxLayer = 0;
  for (const l of layerMap.values()) if (l > maxLayer) maxLayer = l;
  for (const id of ids) {
    if (!layerMap.has(id)) {
      layerMap.set(id, maxLayer + 1);
      maxLayer += 1;
    }
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
}: CatalystWorkflowDiagramProps) {
  const uid = useId();
  const markerId = `arrow-${uid.replace(/:/g, '')}`;

  const { nodes, edges, svgW, svgH } = useMemo(() => {
    if (!statuses.length) return { nodes: [], edges: [], svgW: 200, svgH: 100 };

    const layerMap = assignLayers(statuses, transitions, initialStatusId);

    // group by layer
    const layers = new Map<number, TypeStatus[]>();
    for (const s of statuses) {
      const l = layerMap.get(s.id) ?? 0;
      if (!layers.has(l)) layers.set(l, []);
      layers.get(l)!.push(s);
    }

    const sortedLayerNums = [...layers.keys()].sort((a, b) => a - b);
    const maxColCount = Math.max(...[...layers.values()].map((a) => a.length));

    // include START pseudo-layer
    const totalLayers = sortedLayerNums.length + 1; // +1 for START
    const svgW = Math.max(
      (NODE_W + H_GAP) * maxColCount + H_GAP,
      START_W + H_GAP * 2,
    );
    const svgH = totalLayers * (NODE_H + V_GAP) + V_GAP + START_H;

    // build node positions
    const posMap = new Map<string, { x: number; y: number }>();

    // START node
    const startX = svgW / 2 - START_W / 2;
    const startY = V_GAP;

    sortedLayerNums.forEach((layerNum, li) => {
      const group = layers.get(layerNum)!;
      const rowW = group.length * NODE_W + (group.length - 1) * H_GAP;
      const rowLeft = (svgW - rowW) / 2;
      const y = startY + START_H + V_GAP + li * (NODE_H + V_GAP);
      group.forEach((s, i) => {
        posMap.set(s.id, { x: rowLeft + i * (NODE_W + H_GAP), y });
      });
    });

    // build edge descriptors
    const idSet = new Set(statuses.map((s) => s.id));
    const edges: Array<{
      from: string | null;
      to: string;
      label?: string;
    }> = transitions
      .filter((t) => idSet.has(t.to_status_id))
      .map((t) => ({ from: t.from_status_id, to: t.to_status_id }));

    const nodes = statuses.map((s) => ({
      ...s,
      pos: posMap.get(s.id) ?? { x: 0, y: 0 },
    }));

    return { nodes, edges, svgW, svgH, startX, startY };
  }, [statuses, transitions, initialStatusId]);

  const startX = svgW / 2 - START_W / 2;
  const startY = V_GAP;

  const scale = zoom / 100;

  return (
    <div style={{ overflow: 'auto', width: '100%', height: '100%' }}>
      <svg
        width={svgW * scale}
        height={svgH * scale}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ display: 'block', fontFamily: "var(--ds-font-family-body, 'Atlassian Sans', sans-serif)" }}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L8,3 z" fill="var(--ds-border, #DFE1E6)" />
          </marker>
        </defs>

        {/* START node */}
        <rect
          x={startX}
          y={startY}
          width={START_W}
          height={START_H}
          rx={START_H / 2}
          fill="var(--ds-text, #172B4D)"
        />
        <text
          x={startX + START_W / 2}
          y={startY + START_H / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="#FFFFFF"
        >
          START
        </text>

        {/* Arrow from START to initial node */}
        {initialStatusId && (() => {
          const targetNode = nodes.find((n) => n.id === initialStatusId);
          if (!targetNode) return null;
          const fx = startX + START_W / 2;
          const fy = startY + START_H;
          const tx = targetNode.pos.x + NODE_W / 2;
          const ty = targetNode.pos.y;
          const cy = (fy + ty) / 2;
          return (
            <path
              d={`M ${fx} ${fy} C ${fx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`}
              fill="none"
              stroke="var(--ds-border, #DFE1E6)"
              strokeWidth={1.5}
              markerEnd={`url(#${markerId})`}
            />
          );
        })()}

        {/* Edges */}
        {edges.map((e, i) => {
          const fromNode = e.from ? nodes.find((n) => n.id === e.from) : null;
          const toNode = nodes.find((n) => n.id === e.to);
          if (!toNode) return null;

          const tx = toNode.pos.x + NODE_W / 2;
          const ty = toNode.pos.y;

          let d: string;
          if (!fromNode) {
            // global transition — draw from left edge
            const fx = 0;
            const fy = toNode.pos.y + NODE_H / 2;
            d = `M ${fx} ${fy} L ${toNode.pos.x} ${fy}`;
          } else {
            const fx = fromNode.pos.x + NODE_W / 2;
            const fy = fromNode.pos.y + NODE_H;
            const cy = (fy + ty) / 2;
            d = `M ${fx} ${fy} C ${fx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
          }

          const midX = fromNode ? (fromNode.pos.x + toNode.pos.x) / 2 + NODE_W / 2 : 40;
          const midY = fromNode
            ? (fromNode.pos.y + NODE_H + toNode.pos.y) / 2
            : toNode.pos.y + NODE_H / 2;

          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke="var(--ds-border, #DFE1E6)"
                strokeWidth={1.5}
                markerEnd={`url(#${markerId})`}
              />
              {showTransitionLabels && (
                <text
                  x={midX}
                  y={midY - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--ds-text-subtlest, #6B778C)"
                >
                  {/* verb labels not available from TypeTransition — show nothing */}
                </text>
              )}
            </g>
          );
        })}

        {/* Status nodes */}
        {nodes.map((node) => {
          const isCurrent = node.id === currentStatusId;
          const bgColor = node.color
            ? node.color
            : (CAT_COLOR[node.category] ?? 'var(--ds-background-neutral, #F1F2F4)');
          const textColor = CAT_TEXT[node.category] ?? 'var(--ds-text, #172B4D)';

          return (
            <g key={node.id}>
              <rect
                x={node.pos.x}
                y={node.pos.y}
                width={NODE_W}
                height={NODE_H}
                rx={4}
                fill={bgColor}
                stroke={isCurrent ? 'var(--ds-border-brand, #0052CC)' : 'var(--ds-border, #DFE1E6)'}
                strokeWidth={isCurrent ? 2 : 1}
              />
              <text
                x={node.pos.x + NODE_W / 2}
                y={node.pos.y + NODE_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight={500}
                fill={isCurrent ? 'var(--ds-text-brand, #0052CC)' : textColor}
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
