import { describe, it, expect } from 'vitest';
import { tokenize } from '../tokenizer';
import { JQL_FIELD_MAP } from '../fieldMap';
import { translate } from '../translator';
import { getSuggestions } from '../autocomplete';

// ─── tokenizer ────────────────────────────────────────────────────────────────

describe('tokenize', () => {
  it('returns empty array for blank input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });

  it('handles simple equality', () => {
    expect(tokenize('project = BAU')).toEqual([
      { type: 'field',    value: 'project' },
      { type: 'operator', value: '='       },
      { type: 'value',    value: 'BAU'     },
    ]);
  });

  it('handles quoted string values', () => {
    expect(tokenize('issuetype = "QA Bug"')).toEqual([
      { type: 'field',    value: 'issuetype' },
      { type: 'operator', value: '='         },
      { type: 'value',    value: 'QA Bug'    },
    ]);
  });

  it('handles in operator with value list', () => {
    expect(tokenize('status in (Done, Blocked)')).toEqual([
      { type: 'field',      value: 'status'               },
      { type: 'operator',   value: 'in'                   },
      { type: 'value-list', value: ['Done', 'Blocked']    },
    ]);
  });

  it('strips leading/trailing whitespace from list values', () => {
    const tokens = tokenize('status in ( Done , "In Progress" )');
    const list = tokens.find(t => t.type === 'value-list');
    expect(list?.value).toEqual(['Done', 'In Progress']);
  });

  it('handles AND conjunction', () => {
    const tokens = tokenize('project = BAU AND status = Done');
    expect(tokens).toHaveLength(7);
    expect(tokens[3]).toEqual({ type: 'keyword', value: 'AND' });
  });

  it('handles function calls', () => {
    expect(tokenize('assignee = currentUser()')).toEqual([
      { type: 'field',    value: 'assignee'      },
      { type: 'operator', value: '='             },
      { type: 'function', value: 'currentUser()' },
    ]);
  });

  it('captures ORDER BY clause as keyword', () => {
    const tokens = tokenize('project = BAU ORDER BY created DESC');
    const ob = tokens.find(t => t.type === 'keyword' && t.value === 'ORDER BY');
    expect(ob).toBeDefined();
  });

  it('handles != operator', () => {
    const tokens = tokenize('resolution != Unresolved');
    expect(tokens[1]).toEqual({ type: 'operator', value: '!=' });
  });

  it('handles is EMPTY', () => {
    const tokens = tokenize('assignee is EMPTY');
    expect(tokens[1]).toEqual({ type: 'operator', value: 'is' });
    expect(tokens[2]).toEqual({ type: 'value',    value: 'EMPTY' });
  });
});

// ─── fieldMap ─────────────────────────────────────────────────────────────────

describe('JQL_FIELD_MAP', () => {
  const REQUIRED_FIELDS = [
    'project', 'issuetype', 'status', 'assignee', 'reporter',
    'priority', 'created', 'updated', 'labels', 'fixVersion',
  ];

  it('contains all required fields', () => {
    for (const f of REQUIRED_FIELDS) {
      expect(JQL_FIELD_MAP, `missing field: ${f}`).toHaveProperty(f);
    }
  });

  it('every field has column, type, and operators array', () => {
    for (const [name, def] of Object.entries(JQL_FIELD_MAP)) {
      expect(def, `${name}.column missing`).toHaveProperty('column');
      expect(def, `${name}.type missing`).toHaveProperty('type');
      expect(Array.isArray(def.operators), `${name}.operators not array`).toBe(true);
      expect(def.operators.length, `${name}.operators empty`).toBeGreaterThan(0);
    }
  });

  it('date fields support comparison operators', () => {
    expect(JQL_FIELD_MAP.created.operators).toContain('>');
    expect(JQL_FIELD_MAP.created.operators).toContain('<');
  });

  it('string fields support in/not in operators', () => {
    expect(JQL_FIELD_MAP.status.operators).toContain('in');
    expect(JQL_FIELD_MAP.status.operators).toContain('not in');
  });
});

// ─── translator ───────────────────────────────────────────────────────────────

describe('translate', () => {
  it('produces eq filter for = operator', () => {
    const filters = translate('project = BAU');
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({ method: 'eq', column: 'project_key', value: 'BAU' });
  });

  it('produces neq filter for != operator', () => {
    const filters = translate('resolution != Unresolved');
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({ method: 'neq', column: 'resolution', value: 'Unresolved' });
  });

  it('produces in filter for in operator', () => {
    const filters = translate('status in (Done, Blocked)');
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({ method: 'in', column: 'status', value: ['Done', 'Blocked'] });
  });

  it('produces gte/lte for >= / <= operators', () => {
    const filters = translate('created >= -7d');
    expect(filters[0]).toMatchObject({ method: 'gte', column: 'jira_created_at' });
    expect(typeof filters[0].value).toBe('string'); // resolved ISO date string
  });

  it('produces multiple filters for AND conditions', () => {
    const filters = translate('project = BAU AND status = Done');
    expect(filters).toHaveLength(2);
    expect(filters[0]).toMatchObject({ column: 'project_key', value: 'BAU' });
    expect(filters[1]).toMatchObject({ column: 'status',      value: 'Done' });
  });

  it('returns empty array for unrecognised field', () => {
    const filters = translate('unknownfield = foo');
    expect(filters).toEqual([]);
  });

  it('uses sentinel __currentUser__ for currentUser() function', () => {
    const filters = translate('assignee = currentUser()');
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({
      method: 'eq',
      column: 'assignee_display_name',
      value: '__currentUser__',
    });
  });

  it('handles is EMPTY → isNull', () => {
    const filters = translate('assignee is EMPTY');
    expect(filters[0]).toMatchObject({ method: 'is', column: 'assignee_display_name', value: null });
  });

  it('returns [] for blank JQL', () => {
    expect(translate('')).toEqual([]);
    expect(translate('   ')).toEqual([]);
  });
});

// ─── autocomplete ─────────────────────────────────────────────────────────────

describe('getSuggestions', () => {
  it('returns field suggestions at start of empty JQL', () => {
    const s = getSuggestions('', 0);
    expect(s.type).toBe('fields');
    expect(s.items.length).toBeGreaterThan(5);
    expect(s.items.map(i => i.value)).toContain('project');
  });

  it('returns operator suggestions immediately after a field name', () => {
    const jql = 'project ';
    const s = getSuggestions(jql, jql.length);
    expect(s.type).toBe('operators');
    expect(s.items.map(i => i.value)).toContain('=');
    expect(s.items.map(i => i.value)).toContain('in');
  });

  it('returns value/function suggestions after operator', () => {
    const jql = 'assignee = ';
    const s = getSuggestions(jql, jql.length);
    expect(['values', 'functions']).toContain(s.type);
    const values = s.items.map(i => i.value);
    expect(values).toContain('currentUser()');
  });

  it('filters field suggestions by what the user has typed', () => {
    const jql = 'ass';
    const s = getSuggestions(jql, jql.length);
    expect(s.type).toBe('fields');
    expect(s.items.map(i => i.value)).toContain('assignee');
    expect(s.items.map(i => i.value)).not.toContain('project');
  });

  it('returns keyword suggestions after a complete condition', () => {
    const jql = 'project = BAU ';
    const s = getSuggestions(jql, jql.length);
    expect(s.type).toBe('keywords');
    expect(s.items.map(i => i.value)).toContain('AND');
    expect(s.items.map(i => i.value)).toContain('ORDER BY');
  });
});
