/**
 * Shared-tickets deep link for a huddle: the filter showing tickets where the
 * given participants are involved (each as assignee OR reporter), e.g.
 *   (assignee = "A" OR reporter = "A") AND (assignee = "B" OR reporter = "B")
 *
 * The JQL engine now supports OR + parentheses (see src/lib/jql/ast.ts), so the
 * grouped query parses and returns results. Used by HuddleAutoFilters (auto
 * 5s after connect) and the FAB "shared tickets" button (manual refresh / open).
 */
export function buildSharedTicketsJql(names: string[]): string {
  const clean = names.map((n) => (n ?? '').trim()).filter(Boolean);
  if (!clean.length) return '';
  return clean.map((n) => `(assignee = "${n}" OR reporter = "${n}")`).join(' AND ');
}

export function buildSharedTicketsPath(names: string[]): string {
  const jql = buildSharedTicketsJql(names);
  const qs = jql ? `?jql=${encodeURIComponent(jql)}` : '';
  return `/project-hub/BAU/filters/create${qs}`;
}
