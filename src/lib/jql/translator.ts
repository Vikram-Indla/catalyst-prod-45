import { tokenize } from './tokenizer';
import { JQL_FIELD_MAP, resolveDateShorthand } from './fieldMap';

export type FilterMethod = 'eq' | 'neq' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'is' | 'not_is';

export interface JqlFilter {
  method: FilterMethod;
  column: string;
  value: string | string[] | null;
}

const OPERATOR_TO_METHOD: Record<string, FilterMethod> = {
  '=':      'eq',
  '!=':     'neq',
  'in':     'in',
  'not in': 'not_in',
  '>':      'gt',
  '>=':     'gte',
  '<':      'lt',
  '<=':     'lte',
  'is':     'is',
  'is not': 'not_is',
};

/**
 * Returns true when a JQL user-field value looks like a raw Jira account ID
 * rather than a human display name.
 *
 * Jira has two account ID formats:
 *   Old: 24-char lowercase hex  e.g. "5be3fef965364b69de240fe8"
 *   New: digits:uuid            e.g. "557058:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 */
function isJiraAccountId(value: string): boolean {
  if (/^[a-f0-9]{20,}$/.test(value)) return true;
  if (/^\d+:[a-f0-9-]{30,}$/.test(value)) return true;
  return false;
}

function resolveValue(raw: string): string {
  // Functions
  if (raw === 'currentUser()') return '__currentUser__';
  if (raw === 'startOfWeek()')  return new Date(Date.now() - new Date().getDay() * 86_400_000).toISOString();
  if (raw === 'endOfWeek()')    return new Date(Date.now() + (6 - new Date().getDay()) * 86_400_000).toISOString();
  if (raw === 'startOfMonth()') { const d = new Date(); d.setDate(1); return d.toISOString(); }
  if (raw === 'endOfMonth()')   { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString(); }
  // Relative date shorthands (-7d, -4w, etc.)
  const dateResolved = resolveDateShorthand(raw);
  if (dateResolved) return dateResolved;
  return raw;
}

/**
 * Translate a JQL string into an array of filter descriptors.
 *
 * Unrecognised fields are silently dropped.
 * Callers apply filters via applyJqlToQuery().
 */
export function translate(jql: string): JqlFilter[] {
  const tokens = tokenize(jql);
  if (!tokens.length) return [];

  const filters: JqlFilter[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // Skip conjunctions (AND / OR / NOT)
    if (tok.type === 'keyword' && ['AND', 'OR', 'NOT'].includes(tok.value as string)) {
      i++;
      continue;
    }

    // ORDER BY — skip until end
    if (tok.type === 'keyword' && tok.value === 'ORDER BY') {
      break;
    }

    // Expect: field → operator → value
    if (tok.type !== 'field') { i++; continue; }

    const fieldName = (tok.value as string).toLowerCase();
    const fieldDef  = JQL_FIELD_MAP[fieldName];
    if (!fieldDef) { i += 3; continue; } // skip field + op + value

    const opTok    = tokens[i + 1];
    const valTok   = tokens[i + 2];
    i += 3;

    if (!opTok || opTok.type !== 'operator') continue;
    if (!valTok) continue;

    const method = OPERATOR_TO_METHOD[opTok.value as string];
    if (!method) continue;

    // is / is not with EMPTY / NULL → {method:'is', value:null}
    if (method === 'is' || method === 'not_is') {
      const raw = (typeof valTok.value === 'string' ? valTok.value : '').toUpperCase();
      const isNull = raw === 'EMPTY' || raw === 'NULL';
      filters.push({ method: 'is', column: fieldDef.column, value: isNull ? null : valTok.value as string });
      continue;
    }

    // Value list (in / not in)
    if (valTok.type === 'value-list') {
      const vals = valTok.value as string[];
      // For user fields: if every value in the list looks like an account ID, use the account_id column
      const column =
        fieldDef.type === 'user' && fieldDef.accountIdColumn && vals.every(isJiraAccountId)
          ? fieldDef.accountIdColumn
          : fieldDef.column;
      filters.push({ method, column, value: vals });
      continue;
    }

    // Single value (function, value, direction treated as plain value)
    const raw = valTok.value as string;
    const resolved = resolveValue(raw);
    // For user fields: if the resolved value looks like an account ID, use the account_id column
    const column =
      fieldDef.type === 'user' && fieldDef.accountIdColumn && isJiraAccountId(resolved)
        ? fieldDef.accountIdColumn
        : fieldDef.column;
    filters.push({ method, column, value: resolved });
  }

  return filters;
}
