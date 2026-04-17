/**
 * Zod boundary schemas for the ProjectHub Kanban board (ENABLE_KANBAN_V2).
 *
 * Two boundaries are validated:
 *   1. URL filter state on hydrate — protects against malformed
 *      ?group=XYZ coming from a shared or stale link.
 *   2. DnD status-change payload — guards the persistStatusChange
 *      call site, which is the one mutation the user can trigger in
 *      a tight race (rapid drag before a previous drop has settled).
 *
 * Both schemas are shape-only. Domain rules (hierarchy, permissions)
 * stay in their existing modules.
 */
import { z } from 'zod';

/** GroupBy modes actually used by KanbanBoardPage (kanban-types). */
export const groupBySchema = z.enum(['none', 'assignee', 'epic', 'priority', 'fixVersion']);
export type GroupByModeParsed = z.infer<typeof groupBySchema>;

/** Priority names accepted by the board filter (matches the UI options). */
export const prioritySchema = z.enum(['Critical', 'High', 'Medium', 'Low']);

/**
 * URL-hydrated filter state. Arrays default to empty. Unknown strings
 * survive as strings — no string-enum coercion, the board renders
 * unknown values as "no match" without crashing.
 */
export const filterStateSchema = z.object({
  search: z.string().default(''),
  group: groupBySchema.default('none'),
  assignees: z.array(z.string()).default([]),
  epics: z.array(z.string()).default([]),
  types: z.array(z.string()).default([]),
  priorities: z.array(prioritySchema).default([]),
});
export type FilterStateParsed = z.infer<typeof filterStateSchema>;

/**
 * Status-change payload validated at the mutation boundary.
 * issueId/status come from DnD; both must be non-empty strings.
 * issueId is a Supabase UUID — we do NOT re-validate UUID shape
 * here because the id originated from a fetched row (trusted).
 */
export const statusChangeSchema = z.object({
  issueId: z.string().min(1),
  newStatus: z.string().min(1),
});
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

/**
 * Parse known query-string values into a validated filter state.
 * Used by useBoardUrlState on mount and on navigation events.
 */
export function parseSearchParams(params: URLSearchParams): FilterStateParsed {
  const raw = {
    search: params.get('search') ?? '',
    group: params.get('group') ?? 'none',
    assignees: params.get('assignees')?.split(',').filter(Boolean) ?? [],
    epics: params.get('epics')?.split(',').filter(Boolean) ?? [],
    types: params.get('types')?.split(',').filter(Boolean) ?? [],
    priorities: params.get('priorities')?.split(',').filter(Boolean) ?? [],
  };
  const parsed = filterStateSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Bad link: fall back to defaults, drop the unparseable bits.
  return filterStateSchema.parse({});
}
