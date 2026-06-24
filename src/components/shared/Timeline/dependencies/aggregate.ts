/**
 * Subtree aggregation for timeline dependency roll-up rows.
 *
 * Leaf rows show their own dependencies. Parent / group rows show the
 * EXTERNAL dependencies of their subtree (edges whose other end is outside
 * the subtree) — matching Jira Plans' roll-up count semantics, where a
 * dependency between two children of the same epic is internal and not
 * counted at the epic level.
 */

import type { DependencyIndex } from './normalize';
import { getEntry } from './normalize';

export interface AggRelation {
  /** Subtree member on this side of the relationship (the row itself for leaves). */
  memberKey: string;
  /** The work item on the other side. */
  otherKey: string;
  edgeId: number | string;
  createdAt: string | null;
}

export interface AggregatedDeps {
  blockedBy: AggRelation[];
  blocks: AggRelation[];
}

/** Minimal tree node shape (matches TimelineIssue). */
export interface TreeNode {
  issueKey: string;
  children: TreeNode[];
}

export function collectSubtreeKeys(node: TreeNode): string[] {
  const out: string[] = [node.issueKey];
  for (const c of node.children) out.push(...collectSubtreeKeys(c));
  return out;
}

/** Aggregate external dependencies for a row's whole subtree, deduped by edge. */
export function aggregateRelations(node: TreeNode, index: DependencyIndex): AggregatedDeps {
  const subtree = new Set(collectSubtreeKeys(node));
  const blockedBy: AggRelation[] = [];
  const blocks: AggRelation[] = [];
  const seenBlockedBy = new Set<string | number>();
  const seenBlocks = new Set<string | number>();

  for (const memberKey of subtree) {
    const entry = getEntry(index, memberKey);
    for (const rel of entry.blockedBy) {
      if (subtree.has(rel.key)) continue;            // internal — skip
      if (seenBlockedBy.has(rel.edgeId)) continue;
      seenBlockedBy.add(rel.edgeId);
      blockedBy.push({ memberKey, otherKey: rel.key, edgeId: rel.edgeId, createdAt: rel.createdAt });
    }
    for (const rel of entry.blocks) {
      if (subtree.has(rel.key)) continue;
      if (seenBlocks.has(rel.edgeId)) continue;
      seenBlocks.add(rel.edgeId);
      blocks.push({ memberKey, otherKey: rel.key, edgeId: rel.edgeId, createdAt: rel.createdAt });
    }
  }
  return { blockedBy, blocks };
}

/**
 * Group-band roll-up. Jira's space / type group header shows the TOTAL count
 * of dependency edges across every member of the group (internal + external,
 * deduped by edge) — e.g. "5 Work items" blocked by. Unlike `aggregateRelations`
 * it does NOT skip internal edges, because Jira counts a dependency between two
 * members of the same group at the group level.
 */
export function aggregateGroup(memberKeys: string[], index: DependencyIndex): AggregatedDeps {
  const blockedBy: AggRelation[] = [];
  const blocks: AggRelation[] = [];
  const seenBlockedBy = new Set<string | number>();
  const seenBlocks = new Set<string | number>();
  for (const memberKey of memberKeys) {
    const entry = getEntry(index, memberKey);
    for (const rel of entry.blockedBy) {
      if (seenBlockedBy.has(rel.edgeId)) continue;
      seenBlockedBy.add(rel.edgeId);
      blockedBy.push({ memberKey, otherKey: rel.key, edgeId: rel.edgeId, createdAt: rel.createdAt });
    }
    for (const rel of entry.blocks) {
      if (seenBlocks.has(rel.edgeId)) continue;
      seenBlocks.add(rel.edgeId);
      blocks.push({ memberKey, otherKey: rel.key, edgeId: rel.edgeId, createdAt: rel.createdAt });
    }
  }
  return { blockedBy, blocks };
}

/** Keys directly related to `key` in EITHER direction (for the timeline filter). */
export function relatedKeys(index: DependencyIndex, key: string): Set<string> {
  const entry = getEntry(index, key);
  const out = new Set<string>([key]);
  for (const r of entry.blockedBy) out.add(r.key);
  for (const r of entry.blocks) out.add(r.key);
  return out;
}

/**
 * Keys to KEEP when "Show dependencies" is on (no focused filter): every work
 * item that has at least one dependency edge (either direction), PLUS each of
 * its ancestors so the parent rows stay visible for tree context.
 */
export function keysWithAnyDependency(
  rows: { issueKey: string; parentKey: string | null }[],
  index: DependencyIndex,
): Set<string> {
  const parentOf = new Map<string, string | null>(rows.map(r => [r.issueKey, r.parentKey]));
  const keep = new Set<string>();
  for (const row of rows) {
    const entry = getEntry(index, row.issueKey);
    if (entry.blockedBy.length + entry.blocks.length === 0) continue;
    keep.add(row.issueKey);
    let p = row.parentKey;
    while (p && !keep.has(p)) { keep.add(p); p = parentOf.get(p) ?? null; }
  }
  return keep;
}
