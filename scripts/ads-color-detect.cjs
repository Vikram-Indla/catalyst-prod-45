#!/usr/bin/env node
/**
 * CATALYST ADS — strict hard-coded-color detector (CAT-ADS-HARDGATE-20260710-001)
 *
 * Replaces the false-0 logic in no-hardcoded-colors.cjs. Key differences:
 *   - Comments are stripped with a real state machine (line + block), so a
 *     stray `/*` inside a string can no longer mark a whole file "clean".
 *   - `var(--ds-*, #hex)` and `token('x','#hex')` FALLBACKS are VIOLATIONS,
 *     not "allowed" — CLAUDE.md bans hex fallbacks; Vikram approved stripping
 *     them (2026-07-10). They are tagged category `fallback-hex` so callers
 *     can bucket them.
 *   - Named CSS colors, SVG fill/stroke literals, and Tailwind numbered
 *     colour utilities are caught.
 *
 * A colour is ALLOWED (never a violation) only when it is:
 *   - `var(--ds-*)` / `var(--cp-*)` with NO fallback argument
 *   - `token('color.*')` / `token('color.*')` single-arg (no hex fallback)
 *   - one of: transparent, currentColor, inherit, initial, unset, none
 *   - a CSS custom-property DEFINITION line (`--x: #hex`) inside a
 *     token-definition file (see TOKEN_DEF_FILES)
 *   - annotated with `ads-scanner:ignore-line` / `ads-scanner:ignore-next-line`
 *
 * Exports: { scanContent(relPath, content) -> Violation[], SCAN_EXTENSIONS,
 *            TOKEN_DEF_FILES, isTokenDefFile }
 * Violation = { line, col, match, category, context }
 * category ∈ 'hex' | 'rgb' | 'hsl' | 'named' | 'tailwind' | 'fallback-hex'
 */
'use strict';

const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'];

// Files where `--x: #hex` custom-property DEFINITIONS are legitimate (they
// define the ADS token surface itself). Bare colours in *other* positions in
// these files are still flagged.
const TOKEN_DEF_FILES = [
  'src/index.css',
  'src/styles/catalyst-ads-chart-tokens.css',
  'src/styles/catalyst-ads-parity.css',
  'src/theme/tokens.ts',
];

// Named CSS colours we treat as violations in a colour context. Keyword
// non-colours (transparent/currentColor/inherit/initial/unset/none) are NOT
// here — they are always allowed.
const NAMED_COLORS = [
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'gold', 'silver', 'brown', 'cyan', 'magenta',
  'lime', 'navy', 'teal', 'olive', 'maroon', 'aqua', 'fuchsia', 'coral',
  'salmon', 'khaki', 'violet', 'indigo', 'crimson', 'tomato', 'orchid',
  'turquoise', 'beige', 'ivory', 'lavender',
];

const TAILWIND_COLOR_RE =
  /\b(bg|text|border|ring|divide|fill|stroke|from|to|via|placeholder|caret|accent|outline|shadow|decoration)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-(50|100|200|300|400|500|600|700|800|900|950)\b/g;

function isTokenDefFile(relPath) {
  const p = relPath.replace(/\\/g, '/');
  return TOKEN_DEF_FILES.some((f) => p.endsWith(f) || p === f);
}

/**
 * Replace comment bodies with spaces (preserving newlines + column offsets) so
 * line/col numbers stay accurate and colours inside comments are ignored.
 * Handles // line comments and block comments for both JS/TS and CSS.
 */
function stripComments(src) {
  const out = src.split('');
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | line | block | sstr | dstr | tstr
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { out[i] = ' '; out[i + 1] = ' '; i += 2; state = 'line'; continue; }
      if (c === '/' && c2 === '*') { out[i] = ' '; out[i + 1] = ' '; i += 2; state = 'block'; continue; }
      if (c === "'") { state = 'sstr'; i++; continue; }
      if (c === '"') { state = 'dstr'; i++; continue; }
      if (c === '`') { state = 'tstr'; i++; continue; }
      i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; i++; continue; }
      out[i] = ' '; i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') { out[i] = ' '; out[i + 1] = ' '; i += 2; state = 'code'; continue; }
      if (c !== '\n') out[i] = ' ';
      i++; continue;
    }
    // string states: keep contents (colours in strings ARE styling literals),
    // just track termination so a `/` inside a string doesn't start a comment.
    if (state === 'sstr') { if (c === '\\') { i += 2; continue; } if (c === "'") state = 'code'; i++; continue; }
    if (state === 'dstr') { if (c === '\\') { i += 2; continue; } if (c === '"') state = 'code'; i++; continue; }
    if (state === 'tstr') { if (c === '\\') { i += 2; continue; } if (c === '`') state = 'code'; i++; continue; }
  }
  return out.join('');
}

// A colour at index `idx` is inside a var()/token() FALLBACK position iff, when
// we walk the line up to idx with a paren stack, some still-open var(/token(
// frame has already seen a comma (i.e. we're past the first argument of a var
// or token call). Balanced-paren aware, so a colour AFTER a closed
// `var(--x, #a)` on the same line is NOT treated as a fallback.
function fallbackWrap(line, idx) {
  const stack = [];
  for (let i = 0; i < idx; i++) {
    const ch = line[i];
    if (ch === '(') {
      const head = line.slice(Math.max(0, i - 5), i + 1);
      if (/var\($/.test(head)) stack.push({ fb: false, kind: 'var' });
      else if (/token\($/.test(head)) stack.push({ fb: false, kind: 'token' });
      else stack.push({ fb: false, kind: 'other' });
    } else if (ch === ')') {
      stack.pop();
    } else if (ch === ',' && stack.length) {
      const top = stack[stack.length - 1];
      if (top.kind === 'var' || top.kind === 'token') top.fb = true;
    }
  }
  return stack.some((f) => (f.kind === 'var' || f.kind === 'token') && f.fb);
}

function scanContent(relPath, content) {
  const violations = [];
  const isTokenDef = isTokenDefFile(relPath);
  const stripped = stripComments(content);
  const rawLines = content.split('\n');
  const lines = stripped.split('\n');

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const raw = rawLines[li];
    if (/ads-scanner:ignore-line/.test(raw)) continue;
    if (li > 0 && /ads-scanner:ignore-next-line/.test(rawLines[li - 1])) continue;

    const push = (col, match, category) =>
      violations.push({ line: li + 1, col: col + 1, match, category, context: raw.trim().slice(0, 120) });

    // Is this a CSS custom-property DEFINITION line? (`--x: value`)
    const isPropDef = /^\s*--[a-zA-Z0-9-]+\s*:/.test(line);

    // 1) hex colours
    let m;
    const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
    while ((m = hexRe.exec(line))) {
      // skip 5/7-length (not valid css hex) to cut false positives on ids
      const len = m[0].length - 1;
      if (![3, 4, 6, 8].includes(len)) continue;
      const fb = fallbackWrap(line, m.index);
      if (fb) { push(m.index, m[0], 'fallback-hex'); continue; }
      if (isTokenDef && isPropDef) continue; // legit token definition
      push(m.index, m[0], 'hex');
    }

    // 2) rgb()/rgba()/hsl()/hsla() with a literal (not rgb(var(...)))
    const fnRe = /\b(rgba?|hsla?)\s*\(\s*([^)]*)\)/gi;
    while ((m = fnRe.exec(line))) {
      const inner = m[2] || '';
      if (/^\s*var\s*\(/.test(inner)) continue;        // rgb(var(--x)) allowed
      if (!/\d/.test(inner)) continue;                  // no numbers → skip
      const fb = fallbackWrap(line, m.index);
      const cat = fb ? 'fallback-hex' : (/^hsl/i.test(m[1]) ? 'hsl' : 'rgb');
      if (isTokenDef && isPropDef && !fb) continue;
      push(m.index, m[0].slice(0, 24), cat);
    }

    // 3) Tailwind numbered colour utilities
    TAILWIND_COLOR_RE.lastIndex = 0;
    while ((m = TAILWIND_COLOR_RE.exec(line))) push(m.index, m[0], 'tailwind');

    // 4) Named CSS colours in a colour context (css decl OR jsx style value OR
    //    fill/stroke attr). Require a colour-ish property name before it to
    //    avoid matching words like "border-collapse" or identifiers.
    const namedRe = new RegExp(
      '(color|background|background-color|border|border-color|fill|stroke|outline|box-shadow|text-shadow|caret-color|accent-color)' +
      '\\s*[:=]\\s*["\']?\\s*(' + NAMED_COLORS.join('|') + ')\\b',
      'gi'
    );
    while ((m = namedRe.exec(line))) {
      const col = m.index + m[0].toLowerCase().lastIndexOf(m[2].toLowerCase());
      if (isTokenDef && isPropDef) continue;
      push(col, m[2], 'named');
    }
  }
  return violations;
}

module.exports = { scanContent, SCAN_EXTENSIONS, TOKEN_DEF_FILES, isTokenDefFile };
