import { JQL_FIELD_MAP, JQL_FUNCTIONS } from './fieldMap';

export type SuggestionType = 'fields' | 'operators' | 'values' | 'functions' | 'keywords';

export interface Suggestion {
  value: string;
  label?: string;
  description?: string;
}

export interface SuggestionResult {
  type: SuggestionType;
  items: Suggestion[];
}

const ALL_KEYWORDS: Suggestion[] = [
  { value: 'AND',      description: 'Logical AND'      },
  { value: 'OR',       description: 'Logical OR'       },
  { value: 'ORDER BY', description: 'Sort results'     },
];

const ALL_FIELDS: Suggestion[] = Object.entries(JQL_FIELD_MAP).map(([key, def]) => ({
  value: key,
  label: def.label,
}));

const ALL_FUNCTIONS: Suggestion[] = JQL_FUNCTIONS.map(f => ({
  value: f.value,
  description: f.description,
}));

/** Very cheap JQL state parser — determines what the cursor expects */
type CursorState = 'field' | 'operator' | 'value' | 'keyword';

function inferCursorState(jql: string, cursor: number): {
  state: CursorState;
  partial: string;
  fieldName?: string;
} {
  const src = jql.slice(0, cursor).trimEnd();

  if (!src) return { state: 'field', partial: '' };

  // Split by AND/OR/NOT to get the current clause
  const clauseMatch = src.split(/\bAND\b|\bOR\b|\bNOT\b/i);
  const clause = clauseMatch[clauseMatch.length - 1].trimStart();

  // Tokenise the clause to work out position
  const parts = clause.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { state: 'field', partial: '' };

  // 0 tokens → field expected
  // 1 token  → either partial field or field done → operator expected
  // 2 tokens → operator typed, value expected
  // 3 tokens → value typed, keyword expected

  const lastChar = jql[cursor - 1];
  const endsWithSpace = lastChar === ' ' || lastChar === '\t';

  if (parts.length === 1 && !endsWithSpace) {
    return { state: 'field', partial: parts[0] };
  }

  if (parts.length === 1 && endsWithSpace) {
    return { state: 'operator', partial: '', fieldName: parts[0].toLowerCase() };
  }

  // Multi-word operators: "not in", "is not"
  const joined12 = (parts[1] + (parts[2] ? ' ' + parts[2] : '')).toLowerCase();
  const twoWordOp = ['not in', 'is not'].find(op => joined12.startsWith(op));
  if (twoWordOp) {
    if (parts.length === 3 && !endsWithSpace) {
      return { state: 'operator', partial: parts[2], fieldName: parts[0].toLowerCase() };
    }
    if ((parts.length === 3 && endsWithSpace) || parts.length >= 4) {
      const partial = parts.length === 3 ? '' : parts[3] ?? '';
      return { state: 'value', partial, fieldName: parts[0].toLowerCase() };
    }
  }

  if (parts.length === 2 && !endsWithSpace) {
    return { state: 'operator', partial: parts[1], fieldName: parts[0].toLowerCase() };
  }

  if (parts.length === 2 && endsWithSpace) {
    return { state: 'value', partial: '', fieldName: parts[0].toLowerCase() };
  }

  if (parts.length === 3 && !endsWithSpace) {
    return { state: 'value', partial: parts[2], fieldName: parts[0].toLowerCase() };
  }

  // ≥ 3 parts with trailing space → keyword
  return { state: 'keyword', partial: '' };
}

function filterByPrefix<T extends Suggestion>(items: T[], prefix: string): T[] {
  if (!prefix) return items;
  const p = prefix.toLowerCase();
  return items.filter(s => s.value.toLowerCase().startsWith(p));
}

/**
 * Return autocomplete suggestions for the given JQL string at the cursor position.
 */
export function getSuggestions(jql: string, cursor: number): SuggestionResult {
  const { state, partial, fieldName } = inferCursorState(jql, cursor);

  if (state === 'field') {
    return { type: 'fields', items: filterByPrefix(ALL_FIELDS, partial) };
  }

  if (state === 'operator') {
    const fieldDef = fieldName ? JQL_FIELD_MAP[fieldName] : null;
    const ops: Suggestion[] = fieldDef
      ? fieldDef.operators.map(op => ({ value: op }))
      : ['=', '!=', 'in', 'not in', 'is', 'is not', '<', '>', '<=', '>='].map(op => ({ value: op }));
    return { type: 'operators', items: filterByPrefix(ops, partial) };
  }

  if (state === 'value') {
    const items: Suggestion[] = filterByPrefix(ALL_FUNCTIONS, partial);
    return { type: items.length ? 'functions' : 'values', items };
  }

  // keyword
  return { type: 'keywords', items: filterByPrefix(ALL_KEYWORDS, partial) };
}
