#!/usr/bin/env node
/**
 * CAT-DS-TOKEN-POISON-20260710-001 — Goal 3: phantom + legacy token sweep.
 *
 * postcss + TypeScript-AST codemod (no naive sed). Handles:
 *  - CSS declarations (real properties AND custom-property values)
 *  - TS/TSX/JSX string & template literals containing var() chains
 *    (style objects, Tailwind arbitrary values, token() fallbacks, CSS-in-string)
 *
 * Chain-collapse rules (spec, 02_CANONICAL_DISCOVERY.md B.3/B.6):
 *  - any var() chain containing a phantom or deleted legacy token collapses to ONE token
 *  - lead is --ds-*                     -> keep just the lead, no fallback
 *  - lead is a live (root-declared) app token -> keep just the lead
 *  - lead is a sweep target             -> same-category --ds-* replacement keyed by
 *                                          the consuming CSS property (per-token tables)
 *  - --cp-drawer-* -> replaced by their literal fallback value
 *  - --cp-ink-1 background/unknown refs -> LEFT untouched (deferred ambiguous slice)
 *  - never introduce new fallbacks, never introduce hex
 *  - legacy definitions are deleted once their consumer count is 0
 *
 * Usage: node scripts/token-sweep/sweep.mjs [--dry] [--report <path>]
 * Idempotent: a second run makes zero changes.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
import {
  TARGETS, DELETE_DEFS, cssPropCategory, nameCategory,
  styleKeyCategory, tailwindPrefixCategory, adsIdCategory,
} from './mappings.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--dry');
const reportArg = process.argv.indexOf('--report');
const REPORT_PATH = reportArg > -1 ? process.argv[reportArg + 1] : null;

// ---------- sanity: every replacement token must be a real ADS token ----------
const adsTokenNames = require('@atlaskit/tokens/token-names').default;
const ADS_VARS = new Set(Object.values(adsTokenNames));
for (const [tok, m] of Object.entries(TARGETS)) {
  for (const t of [...Object.values(m.byCat || {}), ...(m.def ? [m.def] : [])]) {
    if (!ADS_VARS.has(t)) throw new Error(`Mapping for ${tok} -> ${t} is not a real ADS token`);
  }
}

const TARGET_NAMES = Object.keys(TARGETS);
const TARGET_RE = new RegExp(`(${TARGET_NAMES.join('|')})(?![\\w-])`);
const rel = (p) => path.relative(ROOT, p);

// ---------- file collection ----------
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
const tsFiles = walk(SRC, ['.ts', '.tsx', '.jsx']);

// ---------- pass 0: which app tokens are live at :root/light? ----------
const liveRoot = new Set(); // declared under :root/html/body/[data-theme=light] (not dark-only)
const anyDecl = new Set(); // declared anywhere
{
  for (const file of cssFiles) {
    const src = fs.readFileSync(file, 'utf8');
    let root;
    try { root = postcss.parse(src, { from: file }); } catch { continue; }
    root.walkDecls((decl) => {
      if (!decl.prop.startsWith('--')) return;
      anyDecl.add(decl.prop);
      let sel = '';
      let darkMedia = false;
      for (let n = decl.parent; n; n = n.parent) {
        if (n.type === 'rule') sel = n.selector + ' ' + sel;
        if (n.type === 'atrule' && n.name === 'media' && /prefers-color-scheme:\s*dark/.test(n.params)) darkMedia = true;
      }
      const darkish = /(\.dark|\[data-theme=["']?dark|\[data-color-mode=["']?dark)/.test(sel) || darkMedia;
      const rootish = /(^|,|\s)(:root|html|body)([\s,{[:]|$)|\[data-theme=["']?light|\[data-color-mode=["']?light/.test(sel.trim() + ' ');
      if (rootish && !darkish) liveRoot.add(decl.prop);
    });
  }
}
const isTarget = (t) => Object.prototype.hasOwnProperty.call(TARGETS, t);
const isLive = (t) => !isTarget(t) && (t.startsWith('--ds-') || liveRoot.has(t) ||
  ['--tw-', '--radix-', '--rt-', '--recharts', '--cm-', '--sb-'].some((p) => t.startsWith(p)));

// ---------- report ----------
const report = {
  rewrittenByToken: {}, // token -> count of occurrences resolved (collapsed or replaced)
  filesTouched: new Set(),
  strays: [], // cross-category replacements (judgment calls)
  left: [], // refs deliberately left (ink-1 bg/unknown, unresolvable)
  deletedDefs: [], // removed declarations
  keptDefs: [], // definitions kept because consumers remain
  pruned: [], // chains reduced (scoped-live lead kept with live remainder)
};
const bump = (tok) => { report.rewrittenByToken[tok] = (report.rewrittenByToken[tok] || 0) + 1; };

// ---------- var() chain parsing ----------
/** Extract balanced `var(...)` expression starting at s[i] (s.slice(i, i+4) === 'var('). */
function extractVarExpr(s, i) {
  let depth = 0;
  for (let j = i + 3; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') { depth--; if (depth === 0) return s.slice(i, j + 1); }
  }
  return null; // unbalanced (e.g. split across template substitution)
}
/** Split 'var(--x, fallback)' -> { token, fallback|null }. */
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
/** Parse strict nested chain: var(a, var(b, var(c, <terminal>))). */
function parseChain(expr) {
  const { token, fallback } = splitVar(expr);
  if (fallback === null) return { tokens: [token], terminal: null };
  if (fallback.startsWith('var(') && extractVarExpr(fallback, 0) === fallback) {
    const sub = parseChain(fallback);
    return { tokens: [token, ...sub.tokens], terminal: sub.terminal };
  }
  return { tokens: [token], terminal: fallback };
}

/**
 * Collapse one target-containing chain. Returns replacement string or null (leave untouched).
 * ctx: { category, file, line, where }
 */
function collapseChain(chain, ctx) {
  const { tokens, terminal } = chain;
  for (let k = 0; k < tokens.length; k++) {
    const lead = tokens[k];
    if (lead.startsWith('--ds-')) return { text: `var(${lead})`, resolvedBy: lead };
    if (!isTarget(lead)) {
      if (isLive(lead)) return { text: `var(${lead})`, resolvedBy: lead };
      if (anyDecl.has(lead)) {
        // Declared only scoped/dark: keep it (out-of-scope elements need the fallback),
        // and collapse the remainder of the chain to one token.
        const successor = tokens.length > k + 1
          ? collapseChain({ tokens: tokens.slice(k + 1), terminal }, ctx)
          : null;
        if (successor) {
          const text = `var(${lead}, ${successor.text})`;
          report.pruned.push({ ...loc(ctx), chain: tokens.join(' > '), kept: text });
          return { text, resolvedBy: lead };
        }
        report.left.push({ ...loc(ctx), token: lead, why: 'scoped-only lead with no resolvable fallback in chain' });
        return null;
      }
      // undefined non-target token: skip to next chain link (it never resolves anyway)
      continue;
    }
    // lead is a sweep target
    const m = TARGETS[lead];
    if (m.literal) {
      if (terminal) { report.strays.push({ ...loc(ctx), token: lead, category: ctx.category || 'unknown', replacedWith: `literal: ${terminal}` }); return { text: terminal, resolvedBy: 'literal', target: lead }; }
      report.left.push({ ...loc(ctx), token: lead, why: 'drawer token with no literal fallback to inherit' });
      return null;
    }
    const cat = ctx.category || null;
    if (m.leaveCats && cat && m.leaveCats.includes(cat)) {
      report.left.push({ ...loc(ctx), token: lead, why: `deferred: ${cat}-consuming ref of ${lead}` });
      return null;
    }
    if (!cat && m.leaveUnknown) {
      report.left.push({ ...loc(ctx), token: lead, why: `unknown consuming category for ${lead} (deferred)` });
      return null;
    }
    let repl = cat ? (m.byCat || {})[cat] : null;
    if (!repl && cat && m.leaveUnknown) {
      report.left.push({ ...loc(ctx), token: lead, why: `no ${cat} mapping for ${lead} (deferred)` });
      return null;
    }
    if (!repl) {
      // unmapped/unknown category: prefer the chain's first live token (what the browser
      // resolves today — zero visual delta), else the token's default mapping.
      const live = tokens.slice(k + 1).find((t) => t.startsWith('--ds-') || isLive(t));
      repl = live || m.def;
      if (!repl) { report.left.push({ ...loc(ctx), token: lead, why: 'no mapping and no live fallback' }); return null; }
      if (!live || !cat) {
        if (cat && cat !== m.home) report.strays.push({ ...loc(ctx), token: lead, category: cat, replacedWith: repl });
      }
    } else if (cat && m.home && cat !== m.home) {
      report.strays.push({ ...loc(ctx), token: lead, category: cat, replacedWith: repl });
    }
    return { text: `var(${repl})`, resolvedBy: repl, target: lead };
  }
  report.left.push({ ...loc(ctx), token: tokens[0], why: 'chain has only dead tokens and no mapping' });
  return null;
}
const loc = (ctx) => ({ file: ctx.file, line: ctx.line, where: ctx.where });

/**
 * Rewrite all target-containing var() chains inside a value string.
 * categoryOf(offset) resolves the consuming category for an occurrence at a string offset.
 */
function rewriteValue(value, categoryOf, ctxBase) {
  let out = value;
  let pos = 0;
  let changed = false;
  while (true) {
    const i = out.indexOf('var(', pos);
    if (i === -1) break;
    const expr = extractVarExpr(out, i);
    if (!expr) { // unbalanced (template substitution boundary)
      if (TARGET_RE.test(out.slice(i))) report.left.push({ ...ctxBase, token: '(unparseable)', why: 'var() spans a template substitution' });
      break;
    }
    if (!TARGET_RE.test(expr)) { pos = i + expr.length; continue; }
    const chain = parseChain(expr);
    const chainHasTarget = chain.tokens.some(isTarget);
    if (!chainHasTarget) {
      // target lives inside the terminal literal (e.g. gradient piece) — recurse into it
      const terminalStart = expr.lastIndexOf(chain.terminal);
      const rewrittenTerminal = rewriteValue(chain.terminal, categoryOf, ctxBase);
      if (rewrittenTerminal.changed) {
        const newExpr = expr.slice(0, terminalStart) + rewrittenTerminal.value + expr.slice(terminalStart + chain.terminal.length);
        out = out.slice(0, i) + newExpr + out.slice(i + expr.length);
        changed = true;
        pos = i + newExpr.length;
      } else pos = i + expr.length;
      continue;
    }
    const category = categoryOf ? categoryOf(i, out) : null;
    const res = collapseChain(chain, { ...ctxBase, category });
    if (res) {
      // count every sweep-target occurrence resolved by this collapse
      for (const t of chain.tokens) if (isTarget(t)) bump(t);
      out = out.slice(0, i) + res.text + out.slice(i + expr.length);
      changed = true;
      pos = i + res.text.length;
    } else {
      pos = i + expr.length;
    }
  }
  return { value: out, changed };
}

// ---------- CSS pass ----------
const newContents = new Map(); // abs path -> new content (post-rewrite)
let cssDeclsRewritten = 0;

for (const file of cssFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!TARGET_RE.test(src)) continue;
  let root;
  try { root = postcss.parse(src, { from: file }); } catch (e) {
    console.error('CSS parse failure:', rel(file), e.message);
    continue;
  }
  let fileChanged = false;
  root.walkDecls((decl) => {
    if (!decl.value || !decl.value.includes('var(')) return;
    if (!TARGET_RE.test(decl.value)) return;
    const category = decl.prop.startsWith('--') ? nameCategory(decl.prop) : cssPropCategory(decl.prop);
    const ctx = { file: rel(file), line: decl.source?.start?.line ?? 0, where: `css:${decl.prop}` };
    const res = rewriteValue(decl.value, () => category, ctx);
    if (res.changed) { decl.value = res.value; fileChanged = true; cssDeclsRewritten++; }
  });
  if (fileChanged) {
    newContents.set(file, root.toString());
    report.filesTouched.add(rel(file));
  }
}

// ---------- TS pass ----------
let tsLiteralsRewritten = 0;

function baseCategoryFor(node, sf) {
  // Walk up from the literal to find its consuming context.
  let cur = node;
  for (let p = node.parent; p; cur = p, p = p.parent) {
    if (ts.isPropertyAssignment(p) && p.name !== cur) {
      const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : null;
      return name ? styleKeyCategory(name) : null;
    }
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText(sf);
      if (name === 'color') return 'text';
      if (name === 'fill' || name === 'stroke') return 'icon';
      return null;
    }
    if (ts.isCallExpression(p)) {
      if (p.expression.getText(sf) === 'token' && p.arguments[1] &&
          (p.arguments[1] === cur || p.arguments[1].getStart(sf) <= node.getStart(sf) && node.getEnd() <= p.arguments[1].getEnd()) &&
          p.arguments[0] && ts.isStringLiteralLike(p.arguments[0])) {
        return adsIdCategory(p.arguments[0].text);
      }
      return null;
    }
    if (ts.isVariableDeclaration(p) || ts.isBlock(p) || ts.isSourceFile(p) ||
        ts.isJsxElement(p) || ts.isArrowFunction(p) || ts.isFunctionDeclaration(p)) return null;
  }
  return null;
}

/** Per-occurrence refinement inside the literal text: Tailwind prefix or `prop:` lookbehind. */
function occurrenceCategory(text, offset, base) {
  const before = text.slice(0, offset);
  const tw = before.match(/(?:^|[\s'"`])(?:[a-z-]+:)*([a-zA-Z][a-zA-Z-]*)-\[$/);
  if (tw) { const c = tailwindPrefixCategory(tw[1]); if (c) return c; }
  const cssm = before.match(/([a-zA-Z-]{2,})\s*:\s*[^;:{}'"]*$/);
  if (cssm) { const c = cssPropCategory(cssm[1]); if (c) return c; }
  return base;
}

for (const file of tsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!TARGET_RE.test(src)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
  const edits = []; // {start, end, text}
  const lineOf = (posn) => sf.getLineAndCharacterOfPosition(posn).line + 1;

  function handleLiteralChunk(rawStart, rawEnd, base, node) {
    const raw = src.slice(rawStart, rawEnd);
    if (!raw.includes('var(') || !TARGET_RE.test(raw)) return;
    const ctx = { file: rel(file), line: lineOf(rawStart), where: 'ts-literal' };
    const res = rewriteValue(raw, (off, cur) => occurrenceCategory(cur, off, base), ctx);
    if (res.changed) { edits.push({ start: rawStart, end: rawEnd, text: res.value }); tsLiteralsRewritten++; }
  }

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const base = baseCategoryFor(node, sf);
      handleLiteralChunk(node.getStart(sf), node.getEnd(), base, node);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const base = baseCategoryFor(node, sf);
      handleLiteralChunk(node.head.getStart(sf), node.head.getEnd(), base, node);
      for (const span of node.templateSpans) {
        visit(span.expression);
        handleLiteralChunk(span.literal.getStart(sf), span.literal.getEnd(), base, node);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (edits.length) {
    edits.sort((a, b) => b.start - a.start);
    let outSrc = src;
    for (const e of edits) outSrc = outSrc.slice(0, e.start) + e.text + outSrc.slice(e.end);
    newContents.set(file, outSrc);
    report.filesTouched.add(rel(file));
  }
}

// ---------- deletion of legacy definitions (consumer count must be 0) ----------
const contentOf = (file) => newContents.get(file) ?? fs.readFileSync(file, 'utf8');
function residualConsumers(token) {
  // Precise count: CSS decl values (not comments) + TS string/template literal text
  // (not comments) — mirrors what the token-graph builder counts as consumers.
  const hits = [];
  const refRe = new RegExp(`var\\(\\s*${token}(?![\\w-])`);
  const bareRe = new RegExp(`^${token}$`);
  const quickRe = new RegExp(`${token}(?![\\w-])`);
  for (const file of cssFiles) {
    const c = contentOf(file);
    if (!quickRe.test(c)) continue;
    let root;
    try { root = postcss.parse(c, { from: file }); } catch { continue; }
    root.walkDecls((decl) => {
      if (decl.prop === token) return; // its own definition
      if (refRe.test(decl.value)) hits.push(`${rel(file)}:${decl.source?.start?.line ?? 0} css:${decl.prop}`);
    });
  }
  for (const file of tsFiles) {
    const c = contentOf(file);
    if (!quickRe.test(c)) continue;
    const sf = ts.createSourceFile(file, c, ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
    const check = (text, posn) => {
      if (refRe.test(text) || bareRe.test(text.trim())) {
        hits.push(`${rel(file)}:${sf.getLineAndCharacterOfPosition(posn).line + 1} ts`);
      }
    };
    (function visitR(node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node.text, node.getStart(sf));
      else if (ts.isTemplateExpression(node)) {
        check(node.head.text, node.head.getStart(sf));
        for (const span of node.templateSpans) { visitR(span.expression); check(span.literal.text, span.literal.getStart(sf)); }
        return;
      }
      ts.forEachChild(node, visitR);
    })(sf);
  }
  return hits;
}

for (const token of DELETE_DEFS) {
  const remaining = residualConsumers(token);
  if (remaining.length > 0) {
    report.keptDefs.push({ token, remainingConsumers: remaining });
    continue;
  }
  for (const file of cssFiles) {
    const content = contentOf(file);
    const declRe = new RegExp(`${token}\\s*:`);
    if (!declRe.test(content)) continue;
    let root;
    try { root = postcss.parse(content, { from: file }); } catch { continue; }
    let changed = false;
    root.walkDecls(token, (decl) => {
      report.deletedDefs.push({ token, file: rel(file), line: decl.source?.start?.line ?? 0 });
      const parent = decl.parent;
      decl.remove();
      if (parent && parent.type === 'rule' && parent.nodes.every((n) => n.type === 'comment')) parent.remove();
      changed = true;
    });
    if (changed) { newContents.set(file, root.toString()); report.filesTouched.add(rel(file)); }
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
  occurrencesResolvedByToken: Object.fromEntries(Object.entries(report.rewrittenByToken).sort((a, b) => b[1] - a[1])),
  totalOccurrencesResolved: Object.values(report.rewrittenByToken).reduce((a, b) => a + b, 0),
  deletedDefs: report.deletedDefs.length,
  keptDefs: report.keptDefs,
  strays: report.strays.length,
  left: report.left.length,
  pruned: report.pruned.length,
};
console.log(JSON.stringify(summary, null, 2));
const full = { summary, strays: report.strays, left: report.left, pruned: report.pruned, deletedDefs: report.deletedDefs, filesTouched: [...report.filesTouched].sort() };
if (REPORT_PATH) fs.writeFileSync(REPORT_PATH, JSON.stringify(full, null, 2));
else {
  console.log('\n--- strays (cross-category judgment calls) ---');
  for (const s of report.strays) console.log(`${s.file}:${s.line} ${s.token} [${s.category}] -> ${s.replacedWith}`);
  console.log('\n--- left untouched ---');
  for (const l of report.left) console.log(`${l.file}:${l.line} ${l.token} — ${l.why}`);
  console.log('\n--- pruned chains ---');
  for (const p of report.pruned) console.log(`${p.file}:${p.line} ${p.chain} => ${p.kept}`);
}
