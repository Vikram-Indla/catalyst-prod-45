/**
 * Midpoint-based position calculator for drag-and-drop reorder.
 *
 * `ph_issues.position` is PostgreSQL `bigint` — only integer values are
 * accepted. We always floor the midpoint; if the floor collides with one
 * of the neighbours (i.e. the two neighbours are adjacent integers and
 * there is no whole-number slot between them), we signal the caller to
 * rebalance the list with larger spacing instead of attempting a write
 * that the DB would reject.
 *
 * - Moving to head  → firstNeighbor.position - 1024
 * - Moving to tail  → lastNeighbor.position + 1024
 * - Between items   → floor((prev + next) / 2), or rebalance on collision
 */
export interface Positioned {
  id: string;
  position: number;
}

export interface NewPositionResult {
  /** Integer position to write, or null if the move is a no-op. */
  position: number | null;
  /** True when there is no integer slot between neighbours — caller must rebalance. */
  needsRebalance: boolean;
}

export function computeNewPosition(
  rows: Positioned[],
  movedId: string,
  toIndex: number,
): NewPositionResult {
  const fromIndex = rows.findIndex(r => r.id === movedId);
  if (fromIndex === -1 || fromIndex === toIndex) {
    return { position: null, needsRebalance: false };
  }

  const next = rows.filter(r => r.id !== movedId);
  const insertAt = Math.max(0, Math.min(toIndex, next.length));

  const before = insertAt === 0 ? null : next[insertAt - 1];
  const after = insertAt >= next.length ? null : next[insertAt];

  if (!before && after) return { position: after.position - 1024, needsRebalance: false };
  if (before && !after) return { position: before.position + 1024, needsRebalance: false };
  if (before && after) {
    const pos = Math.floor((before.position + after.position) / 2);
    if (pos <= before.position || pos >= after.position) {
      // No integer slot available — caller must renumber the list.
      return { position: null, needsRebalance: true };
    }
    return { position: pos, needsRebalance: false };
  }
  return { position: 1024, needsRebalance: false };
}

/**
 * Produce a fresh 1024-spaced position sequence for an ordered list of ids.
 * Use after a drag that triggered `needsRebalance` so future drags have slack.
 */
export function rebalancePositions(orderedIds: string[]): Array<{ id: string; position: number }> {
  return orderedIds.map((id, i) => ({ id, position: (i + 1) * 1024 }));
}

