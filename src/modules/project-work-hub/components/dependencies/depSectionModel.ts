import type { DependencyEntry } from '@/components/shared/Timeline/dependencies/normalize';

export type DepRelationship = 'blocks' | 'is_blocked_by';

export interface DependencyRow {
  key: string;
  relationship: DepRelationship;
  edgeId: number | string;
  createdAt: string | null;
}

/** Flatten a per-issue entry: blockedBy → is_blocked_by, blocks → blocks. */
export function toDependencyRows(entry: DependencyEntry): DependencyRow[] {
  const rows: DependencyRow[] = [];
  for (const r of entry.blockedBy) {
    rows.push({ key: r.key, relationship: 'is_blocked_by', edgeId: r.edgeId, createdAt: r.createdAt });
  }
  for (const r of entry.blocks) {
    rows.push({ key: r.key, relationship: 'blocks', edgeId: r.edgeId, createdAt: r.createdAt });
  }
  return rows;
}

/** All keys already related to the current issue (both directions). */
export function relatedKeysFor(entry: DependencyEntry): Set<string> {
  const s = new Set<string>();
  for (const r of entry.blockedBy) s.add(r.key);
  for (const r of entry.blocks) s.add(r.key);
  return s;
}

export const RELATIONSHIP_LABEL: Record<DepRelationship, string> = {
  blocks: 'blocks',
  is_blocked_by: 'is blocked by',
};

export interface CandidateIssue {
  issue_key: string;
  issue_type: string | null;
  parent_key: string | null;
}

export interface CandidateFilterArgs {
  issueKey: string;
  /** keys already in a live dependency with issueKey (both directions) */
  relatedKeys: Set<string>;
  /** lowercased subtask-family type names to exclude */
  subtaskTypesLower: Set<string>;
}

/** Same-project candidate filter: excludes self, subtasks, direct children, already-related. */
export function filterCandidateIssues(
  candidates: CandidateIssue[],
  { issueKey, relatedKeys, subtaskTypesLower }: CandidateFilterArgs,
): CandidateIssue[] {
  return candidates.filter((c) => {
    if (!c.issue_key || c.issue_key === issueKey) return false;
    if (c.parent_key === issueKey) return false;
    if (relatedKeys.has(c.issue_key)) return false;
    const t = (c.issue_type ?? '').toLowerCase();
    if (subtaskTypesLower.has(t)) return false;
    return true;
  });
}
