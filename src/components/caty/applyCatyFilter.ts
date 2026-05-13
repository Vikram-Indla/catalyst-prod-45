/**
 * applyCatyFilter — pure function that takes the already-loaded
 * project items array and an AI-parsed CatyFilter spec, and returns
 * the items matching every active criterion (AND across dimensions,
 * OR within a dimension's array values — same semantics as the
 * toolbar facet filters).
 *
 * All matching happens client-side: the AI's only job is to translate
 * the user's natural language into this structured spec, never to do
 * semantic search across the project's tickets.
 */
import type { WorkItem } from '@/types/workItem.types';
import type { CatyFilter } from './catySearchStore';

const DAY_MS = 24 * 60 * 60 * 1000;

export function applyCatyFilter(
  items: WorkItem[],
  filter: CatyFilter | null,
): WorkItem[] {
  if (!filter || Object.keys(filter).length === 0) return items;

  const now = Date.now();

  const matchAssigneeName = lower(filter.assignee_names);
  const matchAssigneeId = new Set(filter.assignee_ids ?? []);
  const matchStatusName = lower(filter.status_names);
  const matchStatusCat = new Set(filter.status_categories ?? []);
  const matchPriority = new Set((filter.priorities ?? []).map((p) => p.toLowerCase()));
  const matchType = new Set((filter.types ?? []).map((t) => t.toLowerCase()));
  const matchLabel = lower(filter.labels);
  const textContains = filter.text_contains?.trim().toLowerCase() || null;
  const createdWithinMs = filter.created_within_days
    ? filter.created_within_days * DAY_MS
    : null;

  return items.filter((item) => {
    // Assignee — either a matching name OR a matching id satisfies
    // the dimension. is_unassigned is a separate exclusive predicate
    // (an "unassigned" filter would conflict with a name/id filter,
    // so we honour is_unassigned only when no name/id is set).
    if (filter.is_unassigned && !matchAssigneeName && matchAssigneeId.size === 0) {
      if (item.assignee || item.assigneeId) return false;
    }
    if (matchAssigneeName && matchAssigneeName.size > 0) {
      const name = item.assignee?.name?.toLowerCase() ?? null;
      if (!name || !matchAssigneeName.has(name)) return false;
    }
    if (matchAssigneeId.size > 0) {
      const id = item.assigneeId ?? item.assignee?.id ?? null;
      if (!id || !matchAssigneeId.has(id)) return false;
    }

    // Status — name OR category match
    if (matchStatusName && matchStatusName.size > 0) {
      const sName = item.statusName?.toLowerCase() ?? null;
      if (!sName || !matchStatusName.has(sName)) return false;
    }
    if (matchStatusCat.size > 0) {
      if (!matchStatusCat.has(item.statusCategory)) return false;
    }

    // Priority (lowercase enum)
    if (matchPriority.size > 0) {
      if (!matchPriority.has(item.priority)) return false;
    }

    // Type — match either the normalised `type` or the raw Jira name
    // (so "Production Incident", "QA Bug" etc. also count when the
    // AI returns "bug" / "task").
    if (matchType.size > 0) {
      const t = item.type?.toLowerCase() ?? '';
      const rt = item.rawType?.toLowerCase() ?? '';
      // Allow common Jira synonyms to count too.
      const synonyms = new Set([t, rt]);
      if (rt.includes('bug') || rt.includes('defect')) synonyms.add('bug');
      if (rt.includes('incident')) synonyms.add('bug');
      if (rt.includes('sub-task') || rt === 'subtask') synonyms.add('subtask');
      if (rt.includes('feature')) synonyms.add('feature');
      let hit = false;
      for (const want of matchType) {
        if (synonyms.has(want)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }

    // Labels — case-insensitive, ANY-of semantics
    if (matchLabel && matchLabel.size > 0) {
      const ls = (item.labels ?? []).map((l) => l.toLowerCase());
      const hit = ls.some((l) => matchLabel.has(l));
      if (!hit) return false;
    }

    // Text contains — fuzzy match on summary
    if (textContains) {
      if (!item.summary?.toLowerCase().includes(textContains)) return false;
    }

    // Created within N days
    if (createdWithinMs !== null) {
      const created = item.createdAt ? Date.parse(item.createdAt) : NaN;
      if (Number.isNaN(created) || now - created > createdWithinMs) return false;
    }

    return true;
  });
}

function lower(arr?: string[]): Set<string> | null {
  if (!arr || arr.length === 0) return null;
  return new Set(arr.map((s) => s.toLowerCase()));
}
