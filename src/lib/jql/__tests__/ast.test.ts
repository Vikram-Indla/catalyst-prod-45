import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer';
import { parseJqlAst, astNeedsBooleanQuery } from '../ast';
import { renderAstFilter } from '../astQuery';
import { translate } from '../translator';

describe('tokenizer — grouping parens', () => {
  it('emits group tokens for ( and ) in condition position', () => {
    const toks = tokenize('(status = Open) AND priority = High');
    expect(toks[0]).toEqual({ type: 'group', value: '(' });
    expect(toks.some((t) => t.type === 'group' && t.value === ')')).toBe(true);
  });

  it('does NOT treat in-list parens as group tokens', () => {
    const toks = tokenize('status in (Open, Done)');
    expect(toks.some((t) => t.type === 'group')).toBe(false);
    expect(toks.some((t) => t.type === 'value-list')).toBe(true);
  });

  it('keeps flat translate() output unchanged for non-grouped JQL', () => {
    expect(translate('status = Open AND priority = High')).toEqual([
      { method: 'eq', column: 'status', value: 'Open' },
      { method: 'eq', column: 'priority', value: 'High' },
    ]);
  });
});

describe('parseJqlAst', () => {
  it('parses a flat comparison', () => {
    const ast = parseJqlAst('status = Open');
    expect(ast).toEqual({ kind: 'cmp', filter: { method: 'eq', column: 'status', value: 'Open' } });
    expect(astNeedsBooleanQuery(ast!)).toBe(false);
  });

  it('parses OR into an or-node', () => {
    const ast = parseJqlAst('status = Open OR status = Done');
    expect(ast?.kind).toBe('or');
    expect(astNeedsBooleanQuery(ast!)).toBe(true);
  });

  it('honours parentheses + precedence: (a OR b) AND (c OR d)', () => {
    const ast = parseJqlAst(
      '(assignee = "Vikram Indla" OR reporter = "Vikram Indla") AND (assignee = "Sikander" OR reporter = "Sikander")',
    );
    expect(ast?.kind).toBe('and');
    expect((ast as { children: unknown[] }).children).toHaveLength(2);
    expect(astNeedsBooleanQuery(ast!)).toBe(true);
  });

  it('AND-only grouped JQL does NOT need the boolean path', () => {
    const ast = parseJqlAst('(status = Open) AND priority = High');
    expect(ast?.kind).toBe('and');
    expect(astNeedsBooleanQuery(ast!)).toBe(false);
  });

  it('returns null on unknown field (caller falls back to flat)', () => {
    expect(parseJqlAst('bogusfield = 1 OR status = Open')).toBeNull();
  });

  it('returns null on unbalanced parens', () => {
    expect(parseJqlAst('(status = Open AND priority = High')).toBeNull();
  });
});

describe('renderAstFilter → PostgREST logic tree', () => {
  it('renders the shared-tickets query (both participants, assignee or reporter)', () => {
    const ast = parseJqlAst(
      '(assignee = "Vikram Indla" OR reporter = "Vikram Indla") AND (assignee = "Sikander" OR reporter = "Sikander")',
    )!;
    expect(renderAstFilter(ast)).toBe(
      'and(' +
        'or(assignee_display_name.eq."Vikram Indla",reporter_display_name.eq."Vikram Indla"),' +
        'or(assignee_display_name.eq."Sikander",reporter_display_name.eq."Sikander")' +
      ')',
    );
  });

  it('routes account-id values to the account_id column', () => {
    const ast = parseJqlAst('assignee = "5be3fef965364b69de240fe8" OR status = Open')!;
    expect(renderAstFilter(ast)).toBe(
      'or(assignee_account_id.eq."5be3fef965364b69de240fe8",status.eq."Open")',
    );
  });
});
