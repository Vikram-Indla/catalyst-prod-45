/**
 * Parse JQL string for issuetype / type constraints.
 * Returns the matched work type names or empty array.
 *
 * Examples:
 *   'issuetype = Bug'                          → ['Bug']
 *   'issuetype in (Story, Bug, "QA Bug")'      → ['Story', 'Bug', 'QA Bug']
 *   'type = Feature'                            → ['Feature']
 *   'project = BAU AND status = Done'          → []
 */
export function parseJqlWorkTypes(jql: string | null | undefined): string[] {
  if (!jql) return [];

  // Match `issuetype = "Foo"` or `type = Foo` (single value)
  const singleMatch = jql.match(/(?:issuetype|type)\s*=\s*"?([^"&|(),\s][^"&|(),]*)"?/i);
  if (singleMatch?.[1]) return [singleMatch[1].trim()];

  // Match `issuetype in (Foo, "Bar Baz", Qux)` (multi value)
  const inMatch = jql.match(/(?:issuetype|type)\s+in\s*\(([^)]+)\)/i);
  if (inMatch?.[1]) {
    return inMatch[1]
      .split(',')
      .map(s => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return [];
}
