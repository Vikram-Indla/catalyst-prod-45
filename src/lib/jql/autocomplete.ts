import { JQL_FIELD_MAP, JQL_FUNCTIONS } from './fieldMap';

export type SuggestionType = 'fields' | 'operators' | 'values' | 'functions' | 'keywords' | 'direction';

export interface Suggestion {
  value: string;
  label?: string;
  description?: string;
  /** Visual category for color-coding in the dropdown */
  category?: 'field' | 'operator' | 'value' | 'keyword' | 'function';
}

export interface SuggestionResult {
  type: SuggestionType;
  items: Suggestion[];
}

const ALL_KEYWORDS: Suggestion[] = [
  { value: 'AND',      description: 'Logical AND',  category: 'keyword' },
  { value: 'OR',       description: 'Logical OR',   category: 'keyword' },
  { value: 'ORDER BY', description: 'Sort results', category: 'keyword' },
];

const ALL_DIRECTIONS: Suggestion[] = [
  { value: 'ASC',  description: 'Ascending',  category: 'keyword' },
  { value: 'DESC', description: 'Descending', category: 'keyword' },
];

const ALL_FIELDS: Suggestion[] = Object.entries(JQL_FIELD_MAP).map(([key, def]) => ({
  value: key,
  label: def.label,
  category: 'field' as const,
}));

const ALL_FUNCTIONS: Suggestion[] = JQL_FUNCTIONS.map(f => ({
  value: f.value,
  description: f.description,
  category: 'function' as const,
}));

const IS_VALUES: Suggestion[] = [
  { value: 'EMPTY', description: 'Field is empty', category: 'value' },
  { value: 'NULL',  description: 'Field is null',  category: 'value' },
];

/** Map of field-name → actual project values. Keys match JQL_FIELD_MAP keys. */
export type ValuePool = Record<string, Suggestion[]>;

// ── Context detection ──────────────────────────────────────────────────────────

type CursorState = 'field' | 'operator' | 'value' | 'keyword' | 'direction';

interface CursorInfo {
  state: CursorState;
  partial: string;
  fieldName?: string;
  operator?: string;
}

/**
 * Tokenise-aware context detection.
 *
 * Works by examining the raw text before the cursor to answer:
 *   - Are we inside an unclosed `(` → value list state
 *   - Did we just pass ORDER BY → field/direction state
 *   - How many meaningful tokens does the current clause have → field/op/value/keyword
 */
function inferCursorState(jql: string, cursor: number): CursorInfo {
  const src = jql.slice(0, cursor);
  const trimmed = src.trimEnd();

  if (!trimmed) return { state: 'field', partial: '' };

  // ── ORDER BY context ──────────────────────────────────────────────────────
  // Find the last ORDER BY in the prefix (case-insensitive)
  const orderByRe = /\bORDER\s+BY\b/gi;
  let orderByMatch: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = orderByRe.exec(trimmed)) !== null) orderByMatch = m;

  if (orderByMatch) {
    const afterOrderBy = trimmed.slice(orderByMatch.index + orderByMatch[0].length).trimStart();
    const parts = afterOrderBy.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return { state: 'field', partial: '' };

    // Still typing the sort column?
    const endsWithSpace = /\s$/.test(src.slice(0, cursor));
    if (parts.length === 1 && !endsWithSpace) {
      return { state: 'field', partial: parts[0] };
    }

    // Typed column; now need direction
    if (parts.length === 1 && endsWithSpace) {
      return { state: 'direction', partial: '' };
    }

    // Typing the direction word
    if (parts.length === 2 && !endsWithSpace) {
      return { state: 'direction', partial: parts[1] };
    }

    // After direction — could have another comma-separated sort col
    return { state: 'field', partial: '' };
  }

  // ── Value list: cursor inside unclosed ( ─────────────────────────────────
  let depth = 0;
  let lastOpenParen = -1;
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '(') { depth++; lastOpenParen = i; }
    else if (trimmed[i] === ')') { depth--; }
  }

  if (depth > 0 && lastOpenParen >= 0) {
    // We're inside a value list — find the field and operator before the (
    const beforeParen = trimmed.slice(0, lastOpenParen).trimEnd();
    const { fieldName, operator } = extractFieldOp(beforeParen);

    // Partial: text after last comma or ( inside the list section
    const listSection = trimmed.slice(lastOpenParen + 1);
    const lastComma   = listSection.lastIndexOf(',');
    const rawPartial  = lastComma >= 0
      ? listSection.slice(lastComma + 1).trim()
      : listSection.trim();
    const partial = rawPartial.replace(/^["']|["']$/g, '');

    return { state: 'value', partial, fieldName, operator };
  }

  // ── Multi-word operator detection: NOT IN, IS NOT ────────────────────────
  // These confuse the simple parts-split because they look like 3-token clauses
  const lastClause = getLastClause(trimmed);
  const parts = lastClause.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { state: 'field', partial: '' };

  const endsWithSpace = /\s$/.test(src.slice(0, cursor));

  // Still typing the field name (1 token, no trailing space)
  if (parts.length === 1 && !endsWithSpace) {
    return { state: 'field', partial: parts[0] };
  }

  // Field done, need operator (1 token with trailing space)
  if (parts.length === 1 && endsWithSpace) {
    return { state: 'operator', partial: '', fieldName: parts[0].toLowerCase() };
  }

  // Multi-word operators: "not in", "is not"
  const joined12 = (parts[1] + (parts[2] ? ' ' + parts[2] : '')).toLowerCase();
  const twoWordOp = ['not in', 'is not'].find(op => joined12.startsWith(op));
  if (twoWordOp) {
    if (parts.length === 3 && !endsWithSpace) {
      // Typing the second word of the operator
      return { state: 'operator', partial: parts[2], fieldName: parts[0].toLowerCase() };
    }
    if ((parts.length === 3 && endsWithSpace) || parts.length >= 4) {
      const partial = (parts.length === 3 && endsWithSpace) ? '' : (parts[3] ?? '');
      return { state: 'value', partial, fieldName: parts[0].toLowerCase(), operator: twoWordOp };
    }
  }

  // Still typing the operator (2 tokens, no trailing space)
  if (parts.length === 2 && !endsWithSpace) {
    return { state: 'operator', partial: parts[1], fieldName: parts[0].toLowerCase() };
  }

  // Operator done, need value (2 tokens with trailing space)
  if (parts.length === 2 && endsWithSpace) {
    const op = parts[1].toLowerCase();
    return { state: 'value', partial: '', fieldName: parts[0].toLowerCase(), operator: op };
  }

  // Still typing the value (3 tokens, no trailing space)
  if (parts.length === 3 && !endsWithSpace) {
    return {
      state: 'value',
      partial: parts[2],
      fieldName: parts[0].toLowerCase(),
      operator: parts[1].toLowerCase(),
    };
  }

  // ≥3 parts with trailing space → keyword (AND / OR / ORDER BY)
  return { state: 'keyword', partial: '' };
}

/** Extract the last AND/OR clause from a JQL prefix.
 * Split only on AND/OR — NOT is part of compound operators (IS NOT, NOT IN) and must not split. */
function getLastClause(src: string): string {
  const clauses = src.split(/\bAND\b|\bOR\b/i);
  return clauses[clauses.length - 1].trimStart();
}

/** Extract field name and operator from the text before an opening ( */
function extractFieldOp(src: string): { fieldName?: string; operator?: string } {
  const clause = getLastClause(src);
  const parts  = clause.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const fieldName = parts[0].toLowerCase();
  const joined = parts.slice(1).join(' ').toLowerCase();
  const op = ['not in', 'is not', 'in', 'is', '=', '!=', '<', '>'].find(o => joined.startsWith(o));
  return { fieldName, operator: op };
}

function filterByPrefix<T extends Suggestion>(items: T[], prefix: string): T[] {
  if (!prefix) return items;
  const p = prefix.toLowerCase();
  return items.filter(s => s.value.toLowerCase().startsWith(p));
}

/**
 * Return autocomplete suggestions for the given JQL string at the cursor position.
 * Pass `valuePool` to surface actual project data (status names, assignees, etc.)
 * in addition to the built-in JQL functions.
 */
export function getSuggestions(jql: string, cursor: number, valuePool?: ValuePool): SuggestionResult {
  const { state, partial, fieldName, operator } = inferCursorState(jql, cursor);

  if (state === 'field') {
    return { type: 'fields', items: filterByPrefix(ALL_FIELDS, partial) };
  }

  if (state === 'operator') {
    const fieldDef = fieldName ? JQL_FIELD_MAP[fieldName] : null;
    const ops: Suggestion[] = fieldDef
      ? fieldDef.operators.map(op => ({ value: op, category: 'operator' as const }))
      : ['=', '!=', 'in', 'not in', 'is', 'is not', '<', '>', '<=', '>=']
          .map(op => ({ value: op, category: 'operator' as const }));
    return { type: 'operators', items: filterByPrefix(ops, partial) };
  }

  if (state === 'value') {
    // is / is not → only EMPTY / NULL
    const op = (operator ?? '').toLowerCase();
    if (op === 'is' || op === 'is not') {
      return { type: 'values', items: filterByPrefix(IS_VALUES, partial) };
    }

    // Pool values for this field (priority: project data > JQL functions)
    const poolValues: Suggestion[] = fieldName && valuePool?.[fieldName]
      ? valuePool[fieldName].map(s => ({ ...s, category: 'value' as const }))
      : [];

    const functionItems = filterByPrefix(ALL_FUNCTIONS, partial);
    const poolFiltered  = filterByPrefix(poolValues, partial);

    if (poolFiltered.length > 0) {
      const seen   = new Set(poolFiltered.map(s => s.value.toLowerCase()));
      const deduped = functionItems.filter(f => !seen.has(f.value.toLowerCase()));
      return { type: 'values', items: [...poolFiltered, ...deduped].slice(0, 20) };
    }

    return { type: functionItems.length ? 'functions' : 'values', items: functionItems };
  }

  if (state === 'direction') {
    return { type: 'direction', items: filterByPrefix(ALL_DIRECTIONS, partial) };
  }

  // keyword
  return { type: 'keywords', items: filterByPrefix(ALL_KEYWORDS, partial) };
}
