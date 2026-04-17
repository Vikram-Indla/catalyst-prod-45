/**
 * Midpoint-based position calculator for drag-and-drop reorder.
 *
 * Given an ordered list and the id being moved from `fromIndex` to `toIndex`,
 * returns the new numeric `position` for the moved row only — no bulk update
 * of the rest of the list needed (until positions collide, which takes
 * thousands of moves given the 1024 spacing baseline).
 *
 * - Moving to head  → firstNeighbor.position - 1024
 * - Moving to tail  → lastNeighbor.position + 1024
 * - Between items   → (prev.position + next.position) / 2
 */
export interface Positioned {
  id: string;
  position: number;
}

export function computeNewPosition(
  rows: Positioned[],
  movedId: string,
  toIndex: number,
): number | null {
  // Build the list as it WILL look after the move.
  const fromIndex = rows.findIndex(r => r.id === movedId);
  if (fromIndex === -1) return null;
  if (fromIndex === toIndex) return null;

  const next = rows.filter(r => r.id !== movedId);
  // toIndex is expressed in the original-indexed array; clamp.
  const insertAt = Math.max(0, Math.min(toIndex, next.length));

  const before = insertAt === 0 ? null : next[insertAt - 1];
  const after = insertAt >= next.length ? null : next[insertAt];

  if (!before && after) return after.position - 1024;
  if (before && !after) return before.position + 1024;
  if (before && after) return (before.position + after.position) / 2;
  return 1024; // list was empty (shouldn't happen here)
}
