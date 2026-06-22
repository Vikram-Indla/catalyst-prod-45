/**
 * Bidirectional converters between a JQL string and CanonicalFilterValue.
 *
 *   jqlToCanonicalFilterValue(jql)         → CanonicalFilterValue (lossy when
 *                                              JQL uses operators outside the
 *                                              Basic facet model — those clauses
 *                                              are dropped).
 *   canonicalFilterValueToJql(value, ctx)  → JQL string (round-trip from Basic).
 */
import { translate } from './index';
import {
  emptyCanonicalFilterValue,
  NO_PARENT_SENTINEL,
  type CanonicalFilterValue,
} from '@/components/filters/CanonicalFilter';

export function jqlToCanonicalFilterValue(jql: string): CanonicalFilterValue {
  if (!jql?.trim()) return { ...emptyCanonicalFilterValue };
  const result: CanonicalFilterValue = {
    parent: [],
    assignee: [],
    status: [],
    labels: [],
    workType: [],
  };
  const filters = translate(jql);
  for (const f of filters) {
    const col = f.column;
    const op = (f as any).operator as string | undefined;
    const raw: string[] = Array.isArray((f as any).values)
      ? (f as any).values
      : (f as any).value != null ? [(f as any).value] : [];
    if (!col || !raw.length) continue;

    if (col === 'status') {
      result.status = uniq([...result.status, ...raw]);
    } else if (col === 'assignee_display_name' || col === 'assignee_account_id') {
      result.assignee = uniq([...result.assignee, ...raw]);
    } else if (col === 'labels') {
      result.labels = uniq([...result.labels, ...raw]);
    } else if (col === 'issue_type') {
      result.workType = uniq([...result.workType, ...raw]);
    } else if (col === 'parent_key') {
      // `parent is empty` / `parent = null` → No-parent sentinel.
      const isEmpty = op === 'is' && raw.some((v) => /^(empty|null)$/i.test(v));
      const isNotNull = op === 'is not' && raw.some((v) => /^(empty|null)$/i.test(v));
      if (isEmpty) {
        result.parent = uniq([...result.parent, NO_PARENT_SENTINEL]);
      } else if (!isNotNull) {
        result.parent = uniq([...result.parent, ...raw]);
      }
    }
  }
  return result;
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

/**
 * Serialize a CanonicalFilterValue back into JQL. Caller may supply a
 * `projectKey` to inject a leading `project = "<key>"` clause (matches Jira's
 * default-scoped query). Empty value → empty string.
 */
export function canonicalFilterValueToJql(
  value: CanonicalFilterValue,
  ctx?: { projectKey?: string },
): string {
  const clauses: string[] = [];
  if (ctx?.projectKey) clauses.push(`project = ${quote(ctx.projectKey)}`);

  if (value.parent.length) {
    const wantsNone = value.parent.includes(NO_PARENT_SENTINEL);
    const named = value.parent.filter((p) => p !== NO_PARENT_SENTINEL);
    if (wantsNone && named.length === 0) {
      clauses.push(`parent is empty`);
    } else if (named.length === 1 && !wantsNone) {
      clauses.push(`parent = ${quote(named[0])}`);
    } else if (named.length > 1 && !wantsNone) {
      clauses.push(`parent in (${named.map(quote).join(', ')})`);
    } else if (wantsNone && named.length > 0) {
      // Mixed — cannot be expressed as a single clause; emit OR.
      const ors = [
        ...named.map((n) => `parent = ${quote(n)}`),
        `parent is empty`,
      ].join(' OR ');
      clauses.push(`(${ors})`);
    }
  }

  if (value.assignee.length) {
    clauses.push(emitMulti('assignee', value.assignee));
  }
  if (value.status.length) {
    clauses.push(emitMulti('status', value.status));
  }
  if (value.labels.length) {
    clauses.push(emitMulti('labels', value.labels));
  }
  if (value.workType.length) {
    clauses.push(emitMulti('issuetype', value.workType));
  }
  return clauses.join(' AND ');
}

function emitMulti(field: string, values: string[]): string {
  if (values.length === 1) return `${field} = ${quote(values[0])}`;
  return `${field} in (${values.map(quote).join(', ')})`;
}

function quote(v: string): string {
  // Always quote — safer than guessing which values are bare-identifier safe.
  // Escape embedded quotes.
  return `"${v.replace(/"/g, '\\"')}"`;
}
