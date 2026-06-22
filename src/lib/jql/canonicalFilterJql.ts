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
  const result: CanonicalFilterValue = { ...emptyCanonicalFilterValue };
  const filters = translate(jql);
  for (const f of filters) {
    const col = f.column;
    const op = (f as any).operator as string | undefined;
    const raw: string[] = Array.isArray((f as any).values)
      ? (f as any).values
      : (f as any).value != null ? [(f as any).value] : [];
    if (!col || !raw.length) continue;

    const isExclude = op === '!=' || op === 'not in';

    if (col === 'status') {
      if (isExclude) result.statusExclude = uniq([...result.statusExclude, ...raw]);
      else result.status = uniq([...result.status, ...raw]);
    } else if (col === 'assignee_display_name' || col === 'assignee_account_id') {
      if (isExclude) result.assigneeExclude = uniq([...result.assigneeExclude, ...raw]);
      else result.assignee = uniq([...result.assignee, ...raw]);
    } else if (col === 'labels') {
      if (isExclude) result.labelsExclude = uniq([...result.labelsExclude, ...raw]);
      else result.labels = uniq([...result.labels, ...raw]);
    } else if (col === 'issue_type') {
      if (isExclude) result.workTypeExclude = uniq([...result.workTypeExclude, ...raw]);
      else result.workType = uniq([...result.workType, ...raw]);
    } else if (col === 'priority') {
      if (isExclude) result.priorityExclude = uniq([...result.priorityExclude, ...raw]);
      else result.priority = uniq([...result.priority, ...raw]);
    } else if (col === 'severity') {
      if (isExclude) result.severityExclude = uniq([...result.severityExclude, ...raw]);
      else result.severity = uniq([...result.severity, ...raw]);
    } else if (col === 'parent_key') {
      // `parent is empty` → include No-parent sentinel.
      // `parent is not empty` → exclude No-parent sentinel.
      const isEmpty = op === 'is' && raw.some((v) => /^(empty|null)$/i.test(v));
      const isNotEmpty = op === 'is not' && raw.some((v) => /^(empty|null)$/i.test(v));
      if (isEmpty) {
        result.parent = uniq([...result.parent, NO_PARENT_SENTINEL]);
      } else if (isNotEmpty) {
        result.parentExclude = uniq([...result.parentExclude, NO_PARENT_SENTINEL]);
      } else if (isExclude) {
        result.parentExclude = uniq([...result.parentExclude, ...raw]);
      } else {
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

  if (value.assignee.length)  clauses.push(emitMulti('assignee', value.assignee));
  if (value.status.length)    clauses.push(emitMulti('status', value.status));
  if (value.labels.length)    clauses.push(emitMulti('labels', value.labels));
  if (value.workType.length)  clauses.push(emitMulti('issuetype', value.workType));
  if (value.priority.length)  clauses.push(emitMulti('priority', value.priority));
  if (value.severity.length)  clauses.push(emitMulti('severity', value.severity));

  // Exclude clauses (Advanced tab `!=` operator).
  if (value.parentExclude?.length) {
    const wantsNotNone = value.parentExclude.includes(NO_PARENT_SENTINEL);
    const named = value.parentExclude.filter((p) => p !== NO_PARENT_SENTINEL);
    if (wantsNotNone) clauses.push('parent is not empty');
    if (named.length) clauses.push(emitMultiNot('parent', named));
  }
  if (value.assigneeExclude?.length)  clauses.push(emitMultiNot('assignee', value.assigneeExclude));
  if (value.statusExclude?.length)    clauses.push(emitMultiNot('status', value.statusExclude));
  if (value.labelsExclude?.length)    clauses.push(emitMultiNot('labels', value.labelsExclude));
  if (value.workTypeExclude?.length)  clauses.push(emitMultiNot('issuetype', value.workTypeExclude));
  if (value.priorityExclude?.length)  clauses.push(emitMultiNot('priority', value.priorityExclude));
  if (value.severityExclude?.length)  clauses.push(emitMultiNot('severity', value.severityExclude));

  return clauses.join(' AND ');
}

function emitMultiNot(field: string, values: string[]): string {
  if (values.length === 1) return `${field} != ${quote(values[0])}`;
  return `${field} not in (${values.map(quote).join(', ')})`;
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
