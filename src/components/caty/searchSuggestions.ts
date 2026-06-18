/**
 * searchSuggestions — curated, surface-aware predictive queries for the
 * canonical AI search (CatyAiSearch). This is the INSTANT half of the hybrid
 * prediction model: shown immediately on open, then swapped for AI-probed
 * suggestions when they return.
 *
 * Each surface gets its own set scoped to what the user typically does there
 * (refine on backlog, track on list, unblock on kanban).
 */

export type SearchSurface = "backlog" | "list" | "kanban";

const SUGGESTIONS: Record<SearchSurface, string[]> = {
  backlog: [
    "Show stories in ${project} that are not yet estimated",
    "Which items in ${project} have been blocked for more than three days?",
    "Unassigned bugs in ${project} that need triage",
  ],
  list: [
    "Show me high-priority bugs assigned to me in ${project} that are still open",
    "Find work items in ${project} updated this week",
    "Which tasks in ${project} are due before the end of this week?",
  ],
  kanban: [
    "Show items in ${project} that are in code review",
    "What's in progress and assigned to me in ${project}?",
    "Find stories in ${project} that haven't moved in over a week",
  ],
};

/**
 * Returns 2-3 curated suggestions for a surface, with the project key
 * interpolated. When projectKey is null/empty we use a neutral phrase
 * ("this project") — never a fabricated key (zero-assumption rule).
 */
export function getCuratedSuggestions(
  surface: SearchSurface,
  projectKey: string | null,
): string[] {
  const label = projectKey && projectKey.trim() ? projectKey : "this project";
  return SUGGESTIONS[surface].map((s) => s.split("${project}").join(label));
}
