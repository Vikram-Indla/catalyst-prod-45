#!/usr/bin/env node
/**
 * CAT-DS-TOKEN-POISON-20260710-001 — R3/R10 residue sweep.
 *
 * postcss + TypeScript-AST codemod (no naive sed). Extends the Goal-3 sweep
 * infrastructure (sweep.mjs) with four ordered value transforms:
 *
 *   1. hsl-collapse     hsl(var(--x)) / hsl(var(--x) / a)  -> var(--ds-…)
 *                       for undefined HSL-triplet tokens (see HSL_WRAP).
 *   2. rename           var(--undefined-token …) -> var(--replacement …)
 *                       (reference sites only; fallbacks survive to pass 4).
 *   3. collapse         var(--x, FB) -> FB for tokens whose fallback is what
 *                       the browser resolves today (COLLAPSE set); plus the
 *                       fallback-aware --ds-border-radius -> --ds-radius-*.
 *   4. ds-fallback strip (Goal A / R10)
 *                       var(--ds-GENUINE, anything) -> var(--ds-GENUINE) for
 *                       every leading token present in @atlaskit/tokens
 *                       token-names (runtime themes guarantee the value).
 *                       App-invented --ds-* leads (font-size scale etc.) are
 *                       left untouched.
 *
 * Plus two declaration-level cleanups (CSS only):
 *   - DEAD_DECLS: consumer-less custom-property declarations that reference
 *     undefined tokens are deleted (verified zero consumers).
 *   - DEAD_VALUE_TOKENS: real-property decls whose whole value is a single
 *     var() of a dead typography token are deleted (invalid today).
 *
 * CSS comments are processed with transform 4 only (the R10 scanner is
 * raw-text and counts comments).
 *
 * Usage: node scripts/token-sweep/residue-sweep.mjs [--dry] [--report <path>]
 * Idempotent: a second run makes zero changes.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
import {
  HSL_WRAP, HSL_OVERRIDES, RENAME, RADIUS_BY_FALLBACK, COLLAPSE,
  DEAD_DECLS, DEAD_VALUE_TOKENS, APP_TOKEN_REPLACEMENTS,
} from './residue-mappings.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--dry');
const reportArg = process.argv.indexOf('--report');
const REPORT_PATH = reportArg > -1 ? process.argv[reportArg + 1] : null;

// ---------- sanity: replacements must be real ADS tokens or declared app tokens
const adsTokenNames = require('@atlaskit/tokens/token-names').default;
const ADS_VARS = new Set(Object.values(adsTokenNames));

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}
const cssFiles = walk(SRC, ['.css']);
const tsFiles = walk(SRC, ['.ts', '.tsx', '.jsx', '.js']);
const rel = (p) => path.relative(ROOT, p);

// declared app tokens (any css decl)
const declared = new Set();
for (const file of cssFiles) {
  let root;
  try { root = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file }); } catch { continue; }
  root.walkDecls((d) => { if (d.prop.startsWith('--')) declared.add(d.prop); });
}
const allRepls = [
  ...Object.values(HSL_WRAP), ...HSL_OVERRIDES.map((o) => o.repl), ...Object.values(RENAME),
  '--ds-radius-xsmall', '--ds-radius-small', '--ds-radius-large', '--ds-radius-xlarge', '--ds-radius-full',
];
for (const r of allRepls) {
  const ok = ADS_VARS.has(r) || (APP_TOKEN_REPLACEMENTS.has(r) && declared.has(r));
  if (!ok) throw new Error(`Replacement ${r} is neither a real ADS token nor a declared app token`);
}

// quick pre-filter regex over file contents
const TOUCH_TOKENS = [
  ...new Set([
    ...Object.keys(HSL_WRAP), ...Object.keys(RENAME), ...COLLAPSE, ...DEAD_DECLS,
    ...DEAD_VALUE_TOKENS, RADIUS_BY_FALLBACK.token,
  ]),
];
const QUICK_RE = new RegExp(`(${TOUCH_TOKENS.join('|')})(?![\\w-])|var\\(\\s*--ds-`);

// ---------- report ----------
const report = {
  hslCollapsed: 0, renamed: 0, collapsed: 0, stripped: 0,
  deadDeclsRemoved: 0, deadValueDeclsRemoved: 0,
  byToken: {}, filesTouched: new Set(), left: [],
};
const bump = (tok, n = 1) => { report.byToken[tok] = (report.byToken[tok] || 0) + n; };

// ---------- var() helpers (shared shape with sweep.mjs) ----------
function extractVarExpr(s, i) {
  let depth = 0;
  for (let j = i + 3; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') { depth--; if (depth === 0) return s.slice(i, j + 1); }
  }
  return null;
}
function splitVar(expr) {
  const inner = expr.slice(4, -1);
  let depth = 0;
  for (let j = 0; j < inner.length; j++) {
    if (inner[j] === '(') depth++;
    else if (inner[j] === ')') depth--;
    else if (inner[j] === ',' && depth === 0) {
      return { token: inner.slice(0, j).trim(), fallback: inner.slice(j + 1).trim() };
    }
  }
  return { token: inner.trim(), fallback: null };
}

// ---------- pass 1: hsl-collapse ----------
const HSL_RE = /hsla?\(\s*var\(\s*(--[A-Za-z0-9_-]+)\s*\)\s*(?:\/\s*[0-9.]+%?\s*)?\)/g;
function passHsl(text, ctx) {
  return text.replace(HSL_RE, (m, tok) => {
    const ov = HSL_OVERRIDES.find((o) => ctx.file.endsWith(o.file) && ctx.line === o.line && o.token === tok);
    const repl = ov ? ov.repl : HSL_WRAP[tok];
    if (!repl) return m;
    report.hslCollapsed++; bump(tok);
    return `var(${repl})`;
  });
}

// ---------- pass 2: rename ----------
const RENAME_RE = new RegExp(
  `var\\(\\s*(${Object.keys(RENAME).sort((a, b) => b.length - a.length).join('|')})(?![\\w-])`, 'g');
function passRename(text) {
  return text.replace(RENAME_RE, (m, tok) => {
    report.renamed++; bump(tok);
    return m.replace(tok, RENAME[tok]);
  });
}

// ---------- pass 3: collapse-to-fallback + fallback-aware radius ----------
function passCollapse(text, ctx) {
  let out = text;
  let pos = 0;
  while (true) {
    const i = out.indexOf('var(', pos);
    if (i === -1) break;
    const expr = extractVarExpr(out, i);
    if (!expr) { pos = i + 4; continue; } // unbalanced (template boundary / attr-prefix matcher) — skip this var(
    const { token, fallback } = splitVar(expr);
    if (token === RADIUS_BY_FALLBACK.token) {
      const repl = `var(${RADIUS_BY_FALLBACK.pick(fallback)})`;
      out = out.slice(0, i) + repl + out.slice(i + expr.length);
      report.renamed++; bump(token);
      pos = i + repl.length;
      continue;
    }
    if (COLLAPSE.has(token)) {
      if (fallback === null) {
        report.left.push({ ...ctx, token, why: 'collapse token without fallback' });
        pos = i + expr.length;
        continue;
      }
      out = out.slice(0, i) + fallback + out.slice(i + expr.length);
      report.collapsed++; bump(token);
      pos = i; // re-scan the substituted fallback (may itself contain var())
      continue;
    }
    pos = i + 4;
  }
  return out;
}

// ---------- pass 4: Goal A — strip fallbacks off genuine ADS leads ----------
function passStrip(text) {
  let out = text;
  let pos = 0;
  while (true) {
    const i = out.indexOf('var(', pos);
    if (i === -1) break;
    const expr = extractVarExpr(out, i);
    if (!expr) { pos = i + 4; continue; } // unbalanced — skip this var(, keep scanning
    const { token, fallback } = splitVar(expr);
    if (fallback !== null && ADS_VARS.has(token)) {
      const repl = `var(${token})`;
      out = out.slice(0, i) + repl + out.slice(i + expr.length);
      report.stripped++; bump(token);
      pos = i + repl.length;
      continue;
    }
    pos = i + 4;
  }
  return out;
}

function rewriteValue(text, ctx) {
  let out = passHsl(text, ctx);
  out = passRename(out);
  out = passCollapse(out, ctx);
  out = passStrip(out);
  return out;
}

// ---------- CSS pass ----------
const newContents = new Map();
let cssDeclsRewritten = 0;

for (const file of cssFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!QUICK_RE.test(src)) continue;
  let root;
  try { root = postcss.parse(src, { from: file }); } catch (e) {
    console.error('CSS parse failure:', rel(file), e.message);
    continue;
  }
  let fileChanged = false;
  root.walkDecls((decl) => {
    const line = decl.source?.start?.line ?? 0;
    // dead custom-property declarations
    if (DEAD_DECLS.has(decl.prop)) {
      decl.remove();
      report.deadDeclsRemoved++; bump(decl.prop);
      fileChanged = true;
      return;
    }
    if (!decl.value || !decl.value.includes('var(')) return;
    // dead-typography whole-value decls
    if (!decl.prop.startsWith('--')) {
      const m = decl.value.trim().match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
      if (m && DEAD_VALUE_TOKENS.has(m[1])) {
        decl.remove();
        report.deadValueDeclsRemoved++; bump(m[1]);
        fileChanged = true;
        return;
      }
    }
    const ctx = { file: rel(file), line, where: `css:${decl.prop}` };
    const next = rewriteValue(decl.value, ctx);
    if (next !== decl.value) { decl.value = next; fileChanged = true; cssDeclsRewritten++; }
  });
  // comments: R10 scanner is raw-text — strip genuine-ADS fallbacks there too
  root.walkComments((c) => {
    const next = passStrip(c.text);
    if (next !== c.text) { c.text = next; fileChanged = true; }
  });
  // selectors: dark-mode remap rules match Tailwind arbitrary-value CLASS
  // STRINGS (e.g. `[class*="text-\[\var(--ds-text, #172B4D)\]"]`). The class
  // literals in TSX get their fallbacks stripped above, so the attribute
  // matchers must be stripped in sync or the remap rules stop matching.
  root.walkRules((rule) => {
    if (!rule.selector || !rule.selector.includes('var(')) return;
    const next = passStrip(rule.selector);
    if (next !== rule.selector) { rule.selector = next; fileChanged = true; }
  });
  if (fileChanged) {
    newContents.set(file, root.toString());
    report.filesTouched.add(rel(file));
  }
}

// ---------- TS pass ----------
let tsLiteralsRewritten = 0;

for (const file of tsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!QUICK_RE.test(src)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
  const edits = []; // {start, end, text}
  const literalRanges = []; // string/template literal spans (comment-scanner exclusion)
  const lineOf = (posn) => sf.getLineAndCharacterOfPosition(posn).line + 1;

  function handleChunk(rawStart, rawEnd) {
    const raw = src.slice(rawStart, rawEnd);
    if (!raw.includes('var(') && !raw.includes('hsl(')) return;
    const ctx = { file: rel(file), line: lineOf(rawStart), where: 'ts-literal' };
    const next = rewriteValue(raw, ctx);
    if (next !== raw) { edits.push({ start: rawStart, end: rawEnd, text: next }); tsLiteralsRewritten++; }
  }

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      literalRanges.push({ start: node.getStart(sf), end: node.getEnd() });
      handleChunk(node.getStart(sf), node.getEnd());
      return;
    }
    if (ts.isTemplateExpression(node)) {
      literalRanges.push({ start: node.getStart(sf), end: node.getEnd() });
      handleChunk(node.head.getStart(sf), node.head.getEnd());
      for (const span of node.templateSpans) {
        visit(span.expression);
        handleChunk(span.literal.getStart(sf), span.literal.getEnd());
      }
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // comments (R10 raw-text scanner counts them): strip pass only, applied to
  // comment ranges that the AST pass cannot reach.
  {
    const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, src);
    let t;
    scanner.setTextPos(0);
    while ((t = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
      if (t === ts.SyntaxKind.SingleLineCommentTrivia || t === ts.SyntaxKind.MultiLineCommentTrivia) {
        const start = typeof scanner.getTokenStart === 'function' ? scanner.getTokenStart() : scanner.getTokenPos();
        const end = scanner.getTextPos();
        // The raw scanner has no parser context: "comments" inside template
        // literals are bogus — the AST literal pass owns those ranges.
        if (literalRanges.some((r) => start < r.end && end > r.start)) continue;
        const raw = src.slice(start, end);
        if (!raw.includes('var(')) continue;
        const next = passStrip(raw);
        if (next !== raw) edits.push({ start, end, text: next });
      }
    }
  }

  if (edits.length) {
    edits.sort((a, b) => b.start - a.start);
    let outSrc = src;
    let lastStart = Infinity;
    for (const e of edits) {
      if (e.end > lastStart) continue; // overlap guard (comment vs literal)
      outSrc = outSrc.slice(0, e.start) + e.text + outSrc.slice(e.end);
      lastStart = e.start;
    }
    newContents.set(file, outSrc);
    report.filesTouched.add(rel(file));
  }
}

// ---------- write ----------
if (!DRY) {
  for (const [file, content] of newContents) fs.writeFileSync(file, content);
}

// ---------- summary ----------
const summary = {
  dryRun: DRY,
  filesTouched: report.filesTouched.size,
  cssDeclsRewritten,
  tsLiteralsRewritten,
  hslCollapsed: report.hslCollapsed,
  renamed: report.renamed,
  collapsed: report.collapsed,
  strippedDsFallbacks: report.stripped,
  deadDeclsRemoved: report.deadDeclsRemoved,
  deadValueDeclsRemoved: report.deadValueDeclsRemoved,
  left: report.left.length,
};
console.log(JSON.stringify(summary, null, 2));
if (report.left.length) {
  console.log('\n--- left untouched ---');
  for (const l of report.left) console.log(`${l.file}:${l.line} ${l.token} — ${l.why}`);
}
if (REPORT_PATH) {
  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    summary,
    byToken: Object.fromEntries(Object.entries(report.byToken).sort((a, b) => b[1] - a[1])),
    filesTouched: [...report.filesTouched].sort(),
    left: report.left,
  }, null, 2));
}
