import { JQL_FIELD_MAP } from './fieldMap';

export interface OrderBySpec {
  /** Supabase column on ph_issues */
  column: string;
  ascending: boolean;
}

const ORDER_BY_RE = /\border\s+by\s+(\w+)(?:\s+(asc|desc))?/i;

/**
 * Extract the ORDER BY clause from a JQL string and resolve it to a
 * ph_issues column. translate() drops ORDER BY entirely; callers that
 * execute JQL against Supabase use this to apply the sort.
 * Returns null when there is no clause or the field is not in JQL_FIELD_MAP.
 */
export function parseOrderBy(jql: string): OrderBySpec | null {
  const m = jql.match(ORDER_BY_RE);
  if (!m) return null;
  const fieldDef = JQL_FIELD_MAP[m[1].toLowerCase()];
  if (!fieldDef) return null;
  return {
    column: fieldDef.column,
    ascending: (m[2] ?? 'asc').toLowerCase() !== 'desc',
  };
}
