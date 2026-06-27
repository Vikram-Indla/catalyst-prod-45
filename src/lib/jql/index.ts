export { tokenize } from './tokenizer';
export type { Token, TokenType } from './tokenizer';

export { JQL_FIELD_MAP, JQL_FUNCTIONS, resolveDateShorthand } from './fieldMap';
export type { FieldDef, FieldType } from './fieldMap';

export { translate, buildLeafFilter } from './translator';
export type { JqlFilter, FilterMethod } from './translator';

export { parseJqlAst, astNeedsBooleanQuery } from './ast';
export type { JqlAst } from './ast';
export { applyJqlAst, renderAstFilter } from './astQuery';

export { parseOrderBy } from './orderBy';
export type { OrderBySpec } from './orderBy';

export { getSuggestions } from './autocomplete';
export type { Suggestion, SuggestionResult, SuggestionType, ValuePool } from './autocomplete';

/**
 * Apply an array of JQL filter descriptors to a Supabase query builder.
 *
 * The caller obtains `query` via `supabase.from('ph_issues').select(...)`.
 * Filters that reference `__currentUser__` need the resolved display name
 * passed in via `currentUserName`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyJqlToQuery<T>(query: any, filters: import('./translator').JqlFilter[], currentUserName?: string): T {
  for (const f of filters) {
    let val = f.value;

    // Resolve __currentUser__ sentinel
    if (typeof val === 'string' && val === '__currentUser__') {
      val = currentUserName ?? null;
    }

    switch (f.method) {
      case 'eq':      query = query.eq(f.column, val); break;
      case 'neq':     query = query.neq(f.column, val); break;
      case 'in':      query = query.in(f.column, val as string[]); break;
      case 'not_in':  query = query.not(f.column, 'in', `(${(val as string[]).join(',')})`); break;
      case 'gt':      query = query.gt(f.column, val); break;
      case 'gte':     query = query.gte(f.column, val); break;
      case 'lt':      query = query.lt(f.column, val); break;
      case 'lte':     query = query.lte(f.column, val); break;
      case 'is':      query = query.is(f.column, val); break;
      case 'not_is':  query = query.not(f.column, 'is', val); break;
    }
  }
  return query as T;
}
