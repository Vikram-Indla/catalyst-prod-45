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
 * Build a single filter descriptor from a field name, operator, and value.
 * Shared by translate() (flat list) and the AST parser (boolean tree) so leaf
 * semantics — account-id column routing, date/function resolution, IS EMPTY —
 * are identical across both. Returns null for unknown fields/operators.
 *
 * `value` is a string for single values (or value-list array for in/not in).
 */
export function buildLeafFilter(
  fieldName: string,
  opStr: string,
  value: string | string[],
): JqlFilter | null {
  const fieldDef = JQL_FIELD_MAP[fieldName];
  if (!fieldDef) return null;

  const method = OPERATOR_TO_METHOD[opStr.toLowerCase()];
  if (!method) return null;

  // is / is not with EMPTY / NULL → {method:'is', value:null}.
  // NB: historically both is and is-not collapse to method:'is' here — kept
  // verbatim so translate() output is unchanged.
  if (method === 'is' || method === 'not_is') {
    const raw = (typeof value === 'string' ? value : '').toUpperCase();
    const isNull = raw === 'EMPTY' || raw === 'NULL';
    return { method: 'is', column: fieldDef.column, value: isNull ? null : (value as string) };
  }

  // Value list (in / not in)
  if (Array.isArray(value)) {
    const column =
      fieldDef.type === 'user' && fieldDef.accountIdColumn && value.every(isJiraAccountId)
        ? fieldDef.accountIdColumn
        : fieldDef.column;
    return { method, column, value };
  }

  // Single value (function, value, direction treated as plain value)
  const resolved = resolveValue(value);
  const column =
    fieldDef.type === 'user' && fieldDef.accountIdColumn && isJiraAccountId(resolved)
      ? fieldDef.accountIdColumn
      : fieldDef.column;
  return { method, column, value: resolved };
}

/**
 * Translate a JQL string into an array of filter descriptors.
 *
 * Unrecognised fields are silently dropped. OR / parentheses are flattened
 * (all clauses ANDed) — for true boolean semantics use parseJqlAst().
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

    // Expect: field → operator → value (group parens are skipped here)
    if (tok.type !== 'field') { i++; continue; }

    const fieldName = (tok.value as string).toLowerCase();
    const opTok    = tokens[i + 1];
    const valTok   = tokens[i + 2];
    i += 3;

    if (!opTok || opTok.type !== 'operator') continue;
    if (!valTok) continue;

    const value = valTok.type === 'value-list' ? (valTok.value as string[]) : (valTok.value as string);
    const leaf = buildLeafFilter(fieldName, opTok.value as string, value);
    if (leaf) filters.push(leaf);
  }

  return filters;
}
