/**
 * applyJqlAst — render a JQL boolean AST into a single PostgREST logic-tree
 * filter and apply it to a Supabase query builder via .or().
 *
 * PostgREST supports nested and()/or() inside the `or=` parameter, so the whole
 * tree maps to one .or(<expr>) call:
 *   (assignee=A OR reporter=A) AND (assignee=B OR reporter=B)
 *     → or=(and(or(assignee_display_name.eq."A",reporter_display_name.eq."A"),
 *               or(assignee_display_name.eq."B",reporter_display_name.eq."B")))
 *
 * String values are always double-quoted (PostgREST-safe for spaces, commas,
 * colons in dates, etc.); `is null` is emitted unquoted.
 */
import type { JqlAst } from './ast';
import type { JqlFilter } from './translator';

/** Quote + escape a PostgREST filter value. */
function q(s: string): string {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function leaf(f: JqlFilter, currentUserName?: string): string | null {
  let v = f.value;
  if (v === '__currentUser__') v = currentUserName ?? '';
  const c = f.column;
  const ci = c === 'issue_type'; // case-insensitive for Jira-capitalized type names
  switch (f.method) {
    case 'eq':     return ci ? `${c}.ilike.${q(v as string)}` : `${c}.eq.${q(v as string)}`;
    case 'neq':    return ci ? `${c}.not.ilike.${q(v as string)}` : `${c}.neq.${q(v as string)}`;
    case 'in':     return `${c}.in.(${(v as string[]).map(q).join(',')})`;
    case 'not_in': return `${c}.not.in.(${(v as string[]).map(q).join(',')})`;
    case 'gt':     return `${c}.gt.${q(v as string)}`;
    case 'gte':    return `${c}.gte.${q(v as string)}`;
    case 'lt':     return `${c}.lt.${q(v as string)}`;
    case 'lte':    return `${c}.lte.${q(v as string)}`;
    case 'is':     return v === null ? `${c}.is.null` : `${c}.eq.${q(v as string)}`;
    case 'not_is': return v === null ? `${c}.not.is.null` : `${c}.neq.${q(v as string)}`;
    default:       return null;
  }
}

/** Render an AST node to a PostgREST logic-tree string fragment. */
export function renderAstFilter(node: JqlAst, currentUserName?: string): string | null {
  if (node.kind === 'cmp') return leaf(node.filter, currentUserName);
  if (node.kind === 'not') {
    const inner = renderAstFilter(node.child, currentUserName);
    return inner ? `not(${inner})` : null;
  }
  const parts = node.children.map((c) => renderAstFilter(c, currentUserName));
  if (parts.some((p) => p === null)) return null;
  return `${node.kind}(${parts.join(',')})`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyJqlAst<T>(query: any, node: JqlAst, currentUserName?: string): T {
  const expr = renderAstFilter(node, currentUserName);
  if (expr) query = query.or(expr);
  return query as T;
}
