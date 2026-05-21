export type TokenType =
  | 'field'
  | 'operator'
  | 'value'
  | 'value-list'
  | 'function'
  | 'keyword'
  | 'direction';

export interface Token {
  type: TokenType;
  value: string | string[];
}

const KEYWORDS      = ['AND', 'OR', 'NOT', 'ORDER BY'] as const;
const OPERATORS     = ['!=', '<=', '>=', '=', '<', '>', 'in', 'not in', 'is not', 'is', 'was', 'changed'] as const;
const DIRECTIONS    = ['ASC', 'DESC'] as const;
const FUNC_RE       = /^[a-zA-Z][a-zA-Z0-9]*\(\)$/;

/** Strip outer double-quotes from a token value */
function stripQuotes(s: string): string {
  return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

/**
 * Tokenise a JQL string into a flat Token array.
 *
 * Handles:
 *   - Simple equality:          project = BAU
 *   - Quoted values:            issuetype = "QA Bug"
 *   - In lists:                 status in (Done, Blocked)
 *   - Functions:                assignee = currentUser()
 *   - AND conjunction:          ... AND ...
 *   - ORDER BY clause:          ... ORDER BY created DESC
 *   - Comparison operators:     created >= -7d
 */
export function tokenize(jql: string): Token[] {
  const src = jql.trim();
  if (!src) return [];

  const tokens: Token[] = [];
  let i = 0;

  function skipWs() {
    while (i < src.length && /\s/.test(src[i])) i++;
  }

  function readQuotedString(): string {
    i++; // skip opening "
    let s = '';
    while (i < src.length && src[i] !== '"') s += src[i++];
    i++; // skip closing "
    return s;
  }

  function readBareWord(): string {
    let s = '';
    while (i < src.length && !/[\s=!<>(),"]/.test(src[i])) s += src[i++];
    return s;
  }

  function tryReadOperator(): string | null {
    // Multi-char operators first (longest match)
    for (const op of OPERATORS) {
      if (src.slice(i).toLowerCase().startsWith(op.toLowerCase())) {
        // For word-operators (in, is, not in, etc.) confirm word boundary
        if (/[a-z]/i.test(op[op.length - 1])) {
          const after = src[i + op.length];
          if (after && /\w/.test(after)) continue;
        }
        i += op.length;
        return op;
      }
    }
    return null;
  }

  function readValueList(): string[] {
    i++; // skip '('
    const values: string[] = [];
    while (i < src.length && src[i] !== ')') {
      skipWs();
      if (src[i] === '"') {
        values.push(readQuotedString());
      } else if (src[i] !== ')' && src[i] !== ',') {
        values.push(readBareWord());
      }
      skipWs();
      if (src[i] === ',') i++;
    }
    if (src[i] === ')') i++; // skip ')'
    return values.map(v => v.trim()).filter(Boolean);
  }

  // State machine: field → operator → value, repeat after AND/OR
  type State = 'expect-field' | 'expect-operator' | 'expect-value' | 'expect-keyword';
  let state: State = 'expect-field';

  while (i < src.length) {
    skipWs();
    if (i >= src.length) break;

    if (state === 'expect-field') {
      // Check for ORDER BY (two-word keyword)
      if (src.slice(i).toUpperCase().startsWith('ORDER BY')) {
        tokens.push({ type: 'keyword', value: 'ORDER BY' });
        i += 8;
        state = 'expect-value'; // next is column name
        continue;
      }
      // Check single-word keywords
      const kw = KEYWORDS.find(k =>
        src.slice(i).toUpperCase().startsWith(k) &&
        !/\w/.test(src[i + k.length] ?? '')
      );
      if (kw) {
        tokens.push({ type: 'keyword', value: kw });
        i += kw.length;
        state = 'expect-field';
        continue;
      }
      const word = src[i] === '"' ? readQuotedString() : readBareWord();
      // After ORDER BY, words are direction (ASC/DESC)
      const prevKw = tokens[tokens.length - 1];
      if (prevKw?.type === 'keyword' && prevKw.value === 'ORDER BY') {
        tokens.push({ type: 'field', value: word }); // the sort column
        state = 'expect-value'; // then direction
        continue;
      }
      tokens.push({ type: 'field', value: word });
      state = 'expect-operator';
      continue;
    }

    if (state === 'expect-operator') {
      const op = tryReadOperator();
      if (op) {
        tokens.push({ type: 'operator', value: op });
        state = 'expect-value';
      }
      continue;
    }

    if (state === 'expect-value') {
      // Check for ORDER BY
      if (src.slice(i).toUpperCase().startsWith('ORDER BY')) {
        tokens.push({ type: 'keyword', value: 'ORDER BY' });
        i += 8;
        // next token is field then direction
        skipWs();
        const col = readBareWord();
        if (col) tokens.push({ type: 'field', value: col });
        skipWs();
        const dir = readBareWord().toUpperCase();
        if (dir === 'ASC' || dir === 'DESC') {
          tokens.push({ type: 'direction', value: dir });
        }
        break;
      }

      // Direction (ASC/DESC) after ORDER BY field
      const prevTwo = tokens.slice(-2);
      if (prevTwo[0]?.type === 'keyword' && prevTwo[0].value === 'ORDER BY') {
        const dir = readBareWord().toUpperCase();
        if (dir === 'ASC' || dir === 'DESC') {
          tokens.push({ type: 'direction', value: dir });
          state = 'expect-keyword';
          continue;
        }
      }

      // Value list
      if (src[i] === '(') {
        const list = readValueList();
        tokens.push({ type: 'value-list', value: list });
        state = 'expect-keyword';
        continue;
      }

      // Quoted string
      if (src[i] === '"') {
        const s = readQuotedString();
        tokens.push({ type: 'value', value: s });
        state = 'expect-keyword';
        continue;
      }

      // Bare word — may be a function, keyword, or plain value
      const word = readBareWord();
      if (!word) { i++; continue; }

      if (FUNC_RE.test(word)) {
        tokens.push({ type: 'function', value: word });
      } else if (DIRECTIONS.includes(word.toUpperCase() as any)) {
        tokens.push({ type: 'direction', value: word.toUpperCase() });
      } else {
        tokens.push({ type: 'value', value: word });
      }
      state = 'expect-keyword';
      continue;
    }

    if (state === 'expect-keyword') {
      if (src.slice(i).toUpperCase().startsWith('ORDER BY')) {
        tokens.push({ type: 'keyword', value: 'ORDER BY' });
        i += 8;
        skipWs();
        const col = readBareWord();
        if (col) tokens.push({ type: 'field', value: col });
        skipWs();
        const dir = readBareWord().toUpperCase();
        if (dir === 'ASC' || dir === 'DESC') tokens.push({ type: 'direction', value: dir });
        break;
      }
      const kw = KEYWORDS.find(k =>
        src.slice(i).toUpperCase().startsWith(k) &&
        !/\w/.test(src[i + k.length] ?? '')
      );
      if (kw) {
        tokens.push({ type: 'keyword', value: kw });
        i += kw.length;
        state = 'expect-field';
      } else {
        i++; // skip unexpected char
      }
      continue;
    }
  }

  return tokens;
}
