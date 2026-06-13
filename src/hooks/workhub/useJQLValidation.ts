import { useState, useRef, useEffect } from 'react';
import { tokenize } from '@/lib/jql';
import { JQL_FIELD_MAP } from '@/lib/jql/fieldMap';

export interface JQLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  isChecking: boolean;
}

// ── Levenshtein distance ──────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const KNOWN_FIELDS = Object.keys(JQL_FIELD_MAP);

function suggestField(name: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const f of KNOWN_FIELDS) {
    const d = levenshtein(name.toLowerCase(), f.toLowerCase());
    if (d < bestDist) { bestDist = d; best = f; }
  }
  return bestDist <= 3 ? best : null;
}

// ── Operator/type compatibility ───────────────────────────────────────────────
const DATE_OPS   = new Set(['=', '!=', '<', '>', '<=', '>=']);
const STRING_OPS = new Set(['=', '!=', 'in', 'not in', 'is', 'is not']);
const ARRAY_OPS  = new Set(['=', '!=', 'in', 'not in', 'is', 'is not']);
const NUM_OPS    = new Set(['=', '!=', '<', '>', '<=', '>=', 'in', 'not in']);

function allowedOps(type: string): Set<string> {
  switch (type) {
    case 'date':   return DATE_OPS;
    case 'array':  return ARRAY_OPS;
    case 'number': return NUM_OPS;
    default:       return STRING_OPS;   // string + user
  }
}

// ── Balance checks ────────────────────────────────────────────────────────────
function checkBalance(jql: string): string[] {
  const errs: string[] = [];
  let depth = 0;
  let inStr = false;

  for (let i = 0; i < jql.length; i++) {
    const ch = jql[i];
    if (ch === '"' && (i === 0 || jql[i - 1] !== '\\')) inStr = !inStr;
    if (inStr) continue;
    if (ch === '(') depth++;
    if (ch === ')') { depth--; if (depth < 0) { errs.push('Unexpected closing parenthesis'); depth = 0; } }
  }
  if (inStr) errs.push('Unclosed double-quote in string value');
  if (depth > 0) errs.push(`Unclosed parenthesis — ${depth} opening paren${depth > 1 ? 's' : ''} not closed`);
  return errs;
}

// ── Main validator ────────────────────────────────────────────────────────────
function validate(jql: string): Pick<JQLValidationResult, 'valid' | 'errors' | 'warnings'> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmed = jql.trim();
  if (!trimmed) return { valid: true, errors, warnings };

  errors.push(...checkBalance(trimmed));

  const tokens = tokenize(trimmed);
  let i = 0;
  const len = tokens.length;

  while (i < len) {
    const tok = tokens[i];

    if (tok.type === 'keyword' && (tok.value === 'AND' || tok.value === 'OR' || tok.value === 'NOT')) {
      i++;
      continue;
    }

    if (tok.type === 'keyword' && tok.value === 'ORDER BY') {
      const fieldTok = tokens[i + 1];
      if (!fieldTok || fieldTok.type !== 'field') {
        errors.push('ORDER BY requires a field name');
        break;
      }
      const fname = (fieldTok.value as string).toLowerCase();
      if (!JQL_FIELD_MAP[fname]) {
        const suggestion = suggestField(fname);
        const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
        errors.push(`Unknown ORDER BY field "${fieldTok.value}".${hint}`);
      }
      const dirTok = tokens[i + 2];
      if (dirTok && dirTok.type !== 'direction' && dirTok.type !== 'keyword') {
        warnings.push(`Expected ASC or DESC after ORDER BY ${fieldTok.value}`);
      }
      break;
    }

    if (tok.type !== 'field') { i++; continue; }

    const fname = (tok.value as string).toLowerCase();
    const fieldDef = JQL_FIELD_MAP[fname];

    if (!fieldDef) {
      const suggestion = suggestField(fname);
      const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
      errors.push(`Unknown field "${tok.value}".${hint}`);
      i += 3;
      continue;
    }

    const opTok  = tokens[i + 1];
    const valTok = tokens[i + 2];
    i += 3;

    if (!opTok || opTok.type !== 'operator') {
      warnings.push(`Field "${tok.value}" has no operator`);
      continue;
    }

    const op = (opTok.value as string).toLowerCase();

    if (!allowedOps(fieldDef.type).has(op)) {
      errors.push(
        `Operator "${opTok.value}" is not valid for field "${tok.value}" (type: ${fieldDef.type})`
      );
    }

    if (!valTok) {
      warnings.push(`Field "${tok.value}" ${opTok.value} has no value`);
      continue;
    }

    if (op === 'is' || op === 'is not') {
      const raw = (typeof valTok.value === 'string' ? valTok.value : '').toUpperCase();
      if (raw !== 'EMPTY' && raw !== 'NULL') {
        errors.push(`"${op.toUpperCase()}" only accepts EMPTY or NULL (got "${valTok.value}")`);
      }
    }

    if ((op === 'in' || op === 'not in') && valTok.type !== 'value-list') {
      errors.push(
        `"${op.toUpperCase()}" requires a list in parentheses, e.g. ${tok.value} ${op} (value1, value2)`
      );
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useJQLValidation(jql: string, debounceMs = 250): JQLValidationResult {
  const [result, setResult] = useState<JQLValidationResult>({
    valid: true, errors: [], warnings: [], isChecking: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jql?.trim()) {
      setResult({ valid: true, errors: [], warnings: [], isChecking: false });
      return;
    }

    setResult(prev => ({ ...prev, isChecking: true }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const { valid, errors, warnings } = validate(jql);
      setResult({ valid, errors, warnings, isChecking: false });
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [jql, debounceMs]);

  return result;
}
