/**
 * Dependency normalization + indexing — single source of truth for direction
 * semantics across the timeline dependency mode AND the canvas.
 *
 * Store: `ph_issue_dependencies` rows ({ source_issue_key, target_issue_key,
 * dependency_type: 'blocks' | 'is_blocked_by' }).
 *
 * Canonical edge: ALWAYS expressed as "blocker blocks dependent".
 *   - dependency_type 'blocks'        → blocker = source, dependent = target
 *   - dependency_type 'is_blocked_by' → blocker = target, dependent = source
 *
 * For a work item X:
 *   - "Blocked by"  (incoming) = edges where dependent === X  → list of blockers
 *   - "Blocks"      (outgoing) = edges where blocker   === X  → list of dependents
 */

export type RawDependencyRow = {
  id: number | string;
  project_key: string;
  source_issue_key: string;
  target_issue_key: string;
  dependency_type: 'blocks' | 'is_blocked_by';
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export interface NormalizedEdge {
  id: number | string;
  /** Canonical: blockerKey blocks dependentKey. */
  blockerKey: string;
  dependentKey: string;
  /** Always 'blocks' in canonical form. */
  linkType: 'blocks';
  createdAt: string | null;
  createdBy: string | null;
}

/** Normalize ONE raw row into canonical "blocker blocks dependent" form. */
export function normalizeDependencyEdge(raw: RawDependencyRow): NormalizedEdge {
  const isBlockedBy = raw.dependency_type === 'is_blocked_by';
  return {
    id: raw.id,
    blockerKey: isBlockedBy ? raw.target_issue_key : raw.source_issue_key,
    dependentKey: isBlockedBy ? raw.source_issue_key : raw.target_issue_key,
    linkType: 'blocks',
    createdAt: raw.created_at ?? null,
    createdBy: raw.created_by ?? null,
  };
}

export interface DependencyRelation {
  /** The other work item key. */
  key: string;
  /** The edge id (for removal). */
  edgeId: number | string;
  createdAt: string | null;
}

export interface DependencyEntry {
  /** Incoming: items that block THIS item ("Blocked by" column). */
  blockedBy: DependencyRelation[];
  /** Outgoing: items THIS item blocks ("Blocks" column). */
  blocks: DependencyRelation[];
}

export interface DependencyIndex {
  edges: NormalizedEdge[];
  byKey: Map<string, DependencyEntry>;
}

/** Build a per-issue dependency index from raw rows (live rows only — caller
 *  should pre-filter deleted_at IS NULL, but we defensively skip soft-deleted). */
export function buildDependencyIndex(rows: RawDependencyRow[]): DependencyIndex {
  const edges: NormalizedEdge[] = [];
  const byKey = new Map<string, DependencyEntry>();
  const ensure = (k: string): DependencyEntry => {
    let e = byKey.get(k);
    if (!e) { e = { blockedBy: [], blocks: [] }; byKey.set(k, e); }
    return e;
  };

  for (const row of rows) {
    if (row.deleted_at) continue;
    const edge = normalizeDependencyEdge(row);
    edges.push(edge);
    // blocker BLOCKS dependent  → dependent.blockedBy += blocker
    ensure(edge.dependentKey).blockedBy.push({ key: edge.blockerKey, edgeId: edge.id, createdAt: edge.createdAt });
    // blocker BLOCKS dependent  → blocker.blocks += dependent
    ensure(edge.blockerKey).blocks.push({ key: edge.dependentKey, edgeId: edge.id, createdAt: edge.createdAt });
  }
  return { edges, byKey };
}

export function getEntry(index: DependencyIndex, key: string): DependencyEntry {
  return index.byKey.get(key) ?? { blockedBy: [], blocks: [] };
}

/** UI relationship direction relative to the row the user is acting on. */
export type UiDirection = 'blocks' | 'is_blocked_by';

/** Resolve the canonical {blocker, dependent} for a UI action on `rowKey`. */
export function resolveCanonical(rowKey: string, direction: UiDirection, otherKey: string): { blockerKey: string; dependentKey: string } {
  return direction === 'blocks'
    ? { blockerKey: rowKey, dependentKey: otherKey }   // row blocks other
    : { blockerKey: otherKey, dependentKey: rowKey };  // row is blocked by other
}

/** Does a canonical blocks-edge from `blocker`→`dependent` create a cycle? */
export function wouldCreateCycle(index: DependencyIndex, blockerKey: string, dependentKey: string): boolean {
  // A cycle forms if `blocker` is already reachable from `dependent` by
  // following blocks-edges (dependent → … → blocker).
  const seen = new Set<string>();
  const stack = [dependentKey];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === blockerKey) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const rel of getEntry(index, cur).blocks) stack.push(rel.key);
  }
  return false;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a NEW dependency before insert. Mirrors DB constraints + adds
 *  cycle + reverse-duplicate prevention (spec §14). */
export function validateNewDependency(
  index: DependencyIndex,
  rowKey: string,
  direction: UiDirection,
  otherKey: string,
): ValidationResult {
  if (!otherKey) return { ok: false, error: 'Choose a work item' };
  const { blockerKey, dependentKey } = resolveCanonical(rowKey, direction, otherKey);

  if (blockerKey === dependentKey) {
    return { ok: false, error: 'A work item cannot depend on itself' };
  }
  // Duplicate (same canonical direction).
  const existsForward = getEntry(index, blockerKey).blocks.some(r => r.key === dependentKey);
  if (existsForward) {
    return { ok: false, error: 'This dependency already exists' };
  }
  // Reverse duplicate (the inverse relationship already exists).
  const existsReverse = getEntry(index, dependentKey).blocks.some(r => r.key === blockerKey);
  if (existsReverse) {
    return { ok: false, error: 'The reverse dependency already exists' };
  }
  if (wouldCreateCycle(index, blockerKey, dependentKey)) {
    return { ok: false, error: 'This would create a circular dependency' };
  }
  return { ok: true };
}
