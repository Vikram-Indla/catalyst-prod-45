/**
 * jql-supabase — apply JQL filter descriptors to a Supabase query builder.
 *
 * Thin wrapper around the existing applyJqlToQuery primitive in src/lib/jql/index.ts.
 * Provides a richer API surface: named options, ORDER BY application, and a
 * convenience buildSupabaseQuery() combinator.
 */
import { translate, applyJqlToQuery, parseOrderBy } from '@/lib/jql';
import type { JqlFilter } from '@/lib/jql';

export type { JqlFilter };

export interface ApplyFiltersOptions {
  /** Resolved display name for currentUser() substitution */
  currentUserName?: string;
}

export interface BuildQueryOptions extends ApplyFiltersOptions {
  /** Default column + direction when JQL has no ORDER BY (default: jira_updated_at DESC) */
  defaultOrderBy?: { column: string; ascending: boolean };
  /** Hard limit appended after filter/order (default: 100) */
  limit?: number;
}

/**
 * Apply an array of JqlFilter descriptors to any Supabase query builder.
 * Re-exported for consumers that already call translate() themselves.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyJQLFilters<T = any>(
  query: T,
  filters: JqlFilter[],
  options: ApplyFiltersOptions = {},
): T {
  return applyJqlToQuery<T>(query as any, filters, options.currentUserName) as T;
}

/**
 * Parse the ORDER BY clause from a JQL string and apply it to the query.
 * Falls back to `defaultOrderBy` when the clause is absent or the field is unknown.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyJQLOrderBy<T = any>(
  query: T,
  jql: string,
  defaultOrderBy?: { column: string; ascending: boolean },
): T {
  const order = parseOrderBy(jql) ?? defaultOrderBy ?? { column: 'jira_updated_at', ascending: false };
  return (query as any).order(order.column, { ascending: order.ascending }) as T;
}

/**
 * Convenience: translate JQL → apply filters → apply ORDER BY → apply limit.
 * Call after supabase.from(...).select(...) to get a fully-wired query.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSupabaseQuery<T = any>(
  baseQuery: T,
  jql: string,
  options: BuildQueryOptions = {},
): T {
  const { currentUserName, defaultOrderBy, limit = 100 } = options;
  const filters = translate(jql.trim());
  let query = applyJQLFilters<T>(baseQuery, filters, { currentUserName });
  query = applyJQLOrderBy<T>(query, jql, defaultOrderBy);
  return (query as any).limit(limit) as T;
}
