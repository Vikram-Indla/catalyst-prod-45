import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  layer: number;
}

const NODE_WIDTH  = 140;
const NODE_HEIGHT = 44;
const H_GAP       = 60;
const V_GAP       = 32;

/**
 * BFS-layer layout starting from the initial status node.
 * Returns one NodePosition per status, plus one for the "Any status · global" node.
 *
 * Pure function — no side effects, fully unit-testable.
 */
export function computeDiagramLayout(
  statuses: TypeStatus[],
  transitions: Transition[],
  initialStatusId: string | null,
): NodePosition[] {
  if (statuses.length === 0) return [];

  // Build adjacency list for type-specific transitions (from → [to])
  const adj = new Map<string, Set<string>>();
  for (const s of statuses) adj.set(s.id, new Set());
  for (const t of transitions) {
    if (t.from_status_id !== null && t.work_item_type !== null) {
      adj.get(t.from_status_id)?.add(t.to_status_id);
    }
  }

  // BFS from initial status
  const layers: string[][] = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; layer: number }> = [];

  const startId = initialStatusId ?? statuses[0].id;
  queue.push({ id: startId, layer: 0 });
  visited.add(startId);

  while (queue.length > 0) {
    const { id, layer } = queue.shift()!;
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(id);

    const neighbours = adj.get(id) ?? new Set();
    for (const neighbour of neighbours) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push({ id: neighbour, layer: layer + 1 });
      }
    }
  }

  // Append unreachable nodes at the end
  const unreachable = statuses.filter((s) => !visited.has(s.id));
  if (unreachable.length > 0) {
    layers.push(unreachable.map((s) => s.id));
  }

  // Convert layers to positions
  const positions: NodePosition[] = [];
  let x = 40;

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalH = layer.length * NODE_HEIGHT + (layer.length - 1) * V_GAP;
    let y = 60 + Math.max(0, (200 - totalH) / 2);

    for (let ni = 0; ni < layer.length; ni++) {
      positions.push({ id: layer[ni], x, y, layer: li });
      y += NODE_HEIGHT + V_GAP;
    }

    x += NODE_WIDTH + H_GAP;
  }

  // "Any status · global" node — place in the last column, at the bottom
  const globalX = x;
  const globalY = 60;
  positions.push({ id: '__global__', x: globalX, y: globalY, layer: layers.length });

  return positions;
}

export const DIAGRAM_NODE_WIDTH  = NODE_WIDTH;
export const DIAGRAM_NODE_HEIGHT = NODE_HEIGHT;
