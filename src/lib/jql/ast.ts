/**
 * parseJqlAst — parse a JQL string into a boolean expression tree (AND / OR /
 * NOT with parentheses), as opposed to translate()'s flat AND-only list.
 *
 * Precedence (highest → lowest): NOT > AND > OR, with parentheses overriding.
 * Leaf comparisons reuse buildLeafFilter() so column routing / value resolution
 * is identical to the flat path.
 *
 * Returns null when the input can't be parsed as a clean boolean tree (unknown
 * field, leftover tokens, unbalanced parens) — callers then fall back to the
 * flat translate() path, preserving existing behaviour for non-boolean JQL.
 */
import { tokenize } from './tokenizer';
import { buildLeafFilter, type JqlFilter } from './translator';

export type JqlAst =
  | { kind: 'cmp'; filter: JqlFilter }
  | { kind: 'and'; children: JqlAst[] }
  | { kind: 'or'; children: JqlAst[] }
  | { kind: 'not'; child: JqlAst };

export function parseJqlAst(jql: string): JqlAst | null {
  const all = tokenize(jql);
  // Drop ORDER BY and everything after it — sorting is handled by parseOrderBy.
  const obIdx = all.findIndex((t) => t.type === 'keyword' && t.value === 'ORDER BY');
  const toks = obIdx >= 0 ? all.slice(0, obIdx) : all;
  if (!toks.length) return null;

  let pos = 0;
  const isKw = (v: string) => { const t = toks[pos]; return !!t && t.type === 'keyword' && t.value === v; };
  const isGroup = (v: string) => { const t = toks[pos]; return !!t && t.type === 'group' && t.value === v; };

  function parseOr(): JqlAst | null {
    const first = parseAnd();
    if (!first) return null;
    const kids = [first];
    while (isKw('OR')) {
      pos++;
      const next = parseAnd();
      if (!next) return null;
      kids.push(next);
    }
    return kids.length === 1 ? first : { kind: 'or', children: kids };
  }

  function parseAnd(): JqlAst | null {
    const first = parseNot();
    if (!first) return null;
    const kids = [first];
    while (isKw('AND')) {
      pos++;
      const next = parseNot();
      if (!next) return null;
      kids.push(next);
    }
    return kids.length === 1 ? first : { kind: 'and', children: kids };
  }

  function parseNot(): JqlAst | null {
    if (isKw('NOT')) {
      pos++;
      const child = parseNot();
      if (!child) return null;
      return { kind: 'not', child };
    }
    return parsePrimary();
  }

  function parsePrimary(): JqlAst | null {
    if (isGroup('(')) {
      pos++;
      const inner = parseOr();
      if (!inner) return null;
      if (!isGroup(')')) return null;
      pos++;
      return inner;
    }
    return parseCmp();
  }

  function parseCmp(): JqlAst | null {
    const f = toks[pos];
    const op = toks[pos + 1];
    const v = toks[pos + 2];
    if (!f || f.type !== 'field') return null;
    if (!op || op.type !== 'operator') return null;
    if (!v) return null;
    pos += 3;
    const value = v.type === 'value-list' ? (v.value as string[]) : (v.value as string);
    const leaf = buildLeafFilter((f.value as string).toLowerCase(), op.value as string, value);
    if (!leaf) return null;
    return { kind: 'cmp', filter: leaf };
  }

  const ast = parseOr();
  if (!ast) return null;
  if (pos !== toks.length) return null; // leftover tokens → malformed → bail
  return ast;
}

/** True when the tree needs the boolean query path (any OR or NOT). A pure
 *  AND-of-comparisons tree is equivalent to the flat list, so callers can keep
 *  using applyJqlToQuery() for it (zero behaviour change). */
export function astNeedsBooleanQuery(node: JqlAst): boolean {
  if (node.kind === 'or' || node.kind === 'not') return true;
  if (node.kind === 'and') return node.children.some(astNeedsBooleanQuery);
  return false;
}
