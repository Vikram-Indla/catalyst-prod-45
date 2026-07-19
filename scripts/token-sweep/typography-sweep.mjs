#!/usr/bin/env node
/**
 * CAT-DS-TOKEN-POISON-20260710-001 — Goal 3, R9 typography sweep.
 *
 * postcss + TypeScript-AST codemod. Ground truth (see typography-mappings.mjs
 * header): ADS ships no standalone font-size token — only composite `font.*`
 * shorthand roles. So every `font-size`/`fontSize` consumer of the app-invented
 * `--ds-font-size-*` / `--ds-line-height-body` tokens is rewritten to the
 * `font` SHORTHAND property consuming the matching `--ds-font-<role>` var.
 *
 * Three consumer shapes, handled differently:
 *  A. Object-literal style property (`{ fontSize: 'var(--ds-font-size-N)' }`,
 *     CSS-in-JS or React.CSSProperties) — rewrite key fontSize->font, value->
 *     the role var, HOISTED to the front of the object literal (so any later
 *     explicit fontWeight/lineHeight/fontFamily sibling keeps overriding it
 *     exactly as before — cascade-safe regardless of original property
 *     order). A sibling `lineHeight: 'var(--ds-line-height-body)'` (exact
 *     match) is dropped as redundant (its value is already the font.body
 *     line-height component). An orphan `lineHeight: 'var(--ds-line-height-
 *     body)'` with no sibling fontSize in the same object literal is treated
 *     as its own trigger (role defaults to `body`, the token's documented
 *     pairing) and collapsed the same way.
 *  B. Non-style contexts that cannot consume the `font` shorthand at all
 *     (SVG `fontSize` presentation attribute, numeric-typed component props,
 *     module-level `const FS = 'var(...)'`) — rewritten to reference
 *     `fontSizePx.<role>`, a plain-number mirror of each role's own
 *     font-size component added to src/theme/tokens.ts (NOT a new --ds-*
 *     custom property — that would resurrect R1).
 *  C. Prose — a string literal that CONTAINS the var() as a substring
 *     inside a larger sentence (rule-table doc strings, test failure
 *     messages) rather than being exactly that var() call — left as
 *     prose, just with the token name substituted in place (no structural
 *     change, it isn't executable style).
 *
 * CSS pass mirrors the same hoist to protect any later font-weight/
 * line-height override in the same rule.
 *
 * Numeric raw fontSize (`fontSize: 14`, R9's other bucket) is folded into
 * the SAME slot table when the value is a clean, unitless/px integer
 * matching the app's own 9-step scale — via nearest-slot distance. Deliberate
 * fractional/rem density scales (7px, 10.5px, 0.62rem, ...) are LEFT
 * UNTOUCHED and reported for manual follow-up: they look like an
 * intentional, distinct compact-density system (resource360, sidebar), and
 * force-fitting them onto the 8-step ADS role scale is a visual-regression
 * risk that needs design confirmation, not a mechanical codemod decision.
 * ads-scanner:ignore-line/-next-line pragmas are honored (skipped), matching
 * the token-gate's own `ignored` semantics.
 *
 * Usage: node scripts/token-sweep/typography-sweep.mjs [--dry] [--report <path>]
 * Idempotent: a second run makes zero changes (nothing left to match).
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';
import {
  SLOT_PX, nearestSlot, roleForSlot, roleVar, ROLE_PX, METRIC_CONTEXT_RE,
} from './typography-mappings.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');
const DRY = process.argv.includes('--dry');
const reportArg = process.argv.indexOf('--report');
const REPORT_PATH = reportArg > -1 ? process.argv[reportArg + 1] : null;
// CAT-DS-TOKEN-POISON-20260710-001, R9 residue slice (2026-07-11): the
// original pass deliberately left clean *fractional* px fontSize values
// (10.5, 11.5, 12.5, 13.5 — a residue at the boards/kanban/resource360
// compact-density spots) unconverted, flagging them for design confirmation
// rather than force-fitting them onto the 8-step ADS role scale. On
// inspection, these sit directly alongside sibling elements in the SAME
// components that were already migrated to `font: var(--ds-font-body-small)`
// / `--ds-font-body` in the first sweep pass (e.g. BoardCard.tsx lines
// 113/115/198/219) — i.e. they are leftover unmigrated one-offs, not a
// deliberately distinct scale. This flag opts a run into converting them too,
// via the exact same nearestSlot distance logic (already float-safe).
const INCLUDE_FRACTIONAL = process.argv.includes('--include-fractional');
const rel = (p) => path.relative(ROOT, p);

// ---------- sanity: every role var must be a real ADS token ----------
const adsTokenNames = require('@atlaskit/tokens/token-names').default;
const ADS_VARS = new Set(Object.values(adsTokenNames));
for (const slot of Object.keys(SLOT_PX)) {
  for (const metric of [false, true]) {
    const role = roleForSlot(Number(slot), metric);
    const v = roleVar(role);
    if (!ADS_VARS.has(v)) throw new Error(`role var ${v} (slot ${slot}, metric=${metric}) is not a real ADS token`);
  }
}

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

// ---------- report ----------
const report = {
  cssRewritten: 0,
  tsObjectCollapsed: 0,   // CASE A
  tsOrphanLineHeight: 0,  // CASE A via orphan lineHeight
  tsNonStyleRewritten: 0, // CASE B
  tsProseRewritten: 0,    // CASE C
  metricContextHits: 0,
  numericRoleSlotConverted: 0,
  numericLeftFractional: [], // {file, line, value} left untouched
  filesTouched: new Set(),
  importsAdded: new Set(),
};

// Fallback clause is optional and accepted-but-discarded (R10 philosophy:
// never keep a hand-typed fallback once the lead resolves through a real
// ADS token) — e.g. var(--ds-font-size-100, 14px) collapses exactly like
// var(--ds-font-size-100).
const FS_VAR_RE = /^var\(\s*--ds-font-size-(\d+)\s*(?:,[^()]*)?\)$/;
const LH_VAR_RE = /^var\(\s*--ds-line-height-body\s*(?:,[^()]*)?\)$/;
const ANY_FS_OR_LH_RE = /var\(\s*--ds-font-size-\d+\s*(?:,[^()]*)?\)|var\(\s*--ds-line-height-body\s*(?:,[^()]*)?\)/g;

function slotFromFsVar(text) {
  const m = FS_VAR_RE.exec(text.trim());
  return m ? Number(m[1]) : null;
}
function isLhVar(text) {
  return LH_VAR_RE.test(text.trim());
}

/** Nearest slot for a clean unitless/px integer, else null (fractional/rem/em -> caller's job to leave alone). */
function slotForCleanInt(numText) {
  const m = /^(\d+)(px)?$/.exec(numText.trim());
  if (!m) return null;
  return nearestSlot(Number(m[1]));
}

/** Same as slotForCleanInt but also accepts a clean fractional px/unitless number (--include-fractional only). */
function slotForCleanNumber(numText) {
  const m = /^(\d+(?:\.\d+)?)(px)?$/.exec(numText.trim());
  if (!m) return null;
  return nearestSlot(Number(m[1]));
}

// ============================================================
// CSS PASS
// ============================================================
const newContents = new Map(); // abs path -> new content

for (const file of cssFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/--ds-font-size-|--ds-line-height-body/.test(src)) continue;
  let root;
  try { root = postcss.parse(src, { from: file }); } catch (e) {
    console.error('CSS parse failure:', rel(file), e.message);
    continue;
  }
  let fileChanged = false;

  root.walkRules((rule) => {
    // Selector-based metric-context heuristic.
    const isMetric = METRIC_CONTEXT_RE.test(rule.selector) || METRIC_CONTEXT_RE.test(rel(file));
    if (isMetric) report.metricContextHits++;

    const decls = rule.nodes ? rule.nodes.filter((n) => n.type === 'decl') : [];
    let fsDecl = null; let fsSlot = null; let important = false;
    let lhDecl = null; let lhIsBodyExact = false;
    for (const d of decls) {
      if (d.prop === 'font-size') {
        const slot = slotFromFsVar(d.value);
        if (slot !== null) { fsDecl = d; fsSlot = slot; important = !!d.important; }
      } else if (d.prop === 'line-height') {
        if (isLhVar(d.value)) { lhDecl = d; lhIsBodyExact = true; }
      }
    }
    if (!fsDecl && !(lhDecl && lhIsBodyExact)) return; // nothing to do in this rule

    let role;
    if (fsDecl) {
      role = roleForSlot(fsSlot, isMetric);
    } else {
      role = 'body'; // orphan line-height-body, documented pairing
    }
    const newDecl = postcss.decl({
      prop: 'font',
      value: `var(${roleVar(role)})${important ? ' !important' : ''}`,
    });
    // Hoist: insert as the first declaration, remove the originals.
    rule.insertBefore(decls[0] || rule.first, newDecl);
    if (fsDecl) fsDecl.remove();
    if (lhDecl && lhIsBodyExact && (fsDecl ? true : true)) lhDecl.remove();
    fileChanged = true;
    report.cssRewritten++;
  });

  let cssOut = fileChanged ? root.toString() : src;
  // Mop-up: comments (postcss doesn't walk comment text for decls above) that
  // still mention the retiring tokens get their text updated too, so the
  // deleted definitions leave no dangling references anywhere in the file.
  if (ANY_FS_OR_LH_RE.test(cssOut)) {
    cssOut = cssOut.replace(ANY_FS_OR_LH_RE, (m) => {
      const s = slotFromFsVar(m);
      const role = s !== null ? roleForSlot(s, false) : 'body';
      return `var(${roleVar(role)})`;
    });
    fileChanged = true;
  }
  if (fileChanged) {
    newContents.set(file, cssOut);
    report.filesTouched.add(rel(file));
  }
}

// ============================================================
// TS/TSX PASS
// ============================================================

/** Find comma index immediately following `end` (skipping whitespace/comments), return index AFTER that comma, or null. */
function commaAfter(src, end) {
  let i = end;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] === ',') return i + 1;
  return null;
}

/**
 * Remove a set of properties from an ObjectLiteralExpression, returning
 * {start,end,text} edits (cascade-safe: preserves exactly one separator
 * between the nearest kept neighbours on each side of a dropped run).
 */
function dropPropertyEdits(sf, src, obj, dropSet) {
  const props = obj.properties;
  const edits = [];
  let i = 0;
  while (i < props.length) {
    if (!dropSet.has(props[i])) { i++; continue; }
    let j = i;
    while (j + 1 < props.length && dropSet.has(props[j + 1])) j++;
    const keptBefore = i > 0 ? props[i - 1] : null;
    const keptAfter = j + 1 < props.length ? props[j + 1] : null;
    let start; let end; let text;
    if (keptBefore && keptAfter) {
      start = keptBefore.getEnd();
      end = keptAfter.getStart(sf);
      text = ', ';
    } else if (keptBefore && !keptAfter) {
      start = keptBefore.getEnd();
      const afterComma = commaAfter(src, props[j].getEnd());
      end = afterComma !== null ? afterComma : props[j].getEnd();
      text = '';
    } else if (!keptBefore && keptAfter) {
      start = obj.getStart(sf) + 1; // right after '{'
      end = keptAfter.getStart(sf);
      text = ' ';
    } else {
      start = obj.getStart(sf) + 1;
      end = obj.getEnd() - 1; // right before '}'
      text = '';
    }
    edits.push({ start, end, text });
    i = j + 1;
  }
  return edits;
}

let tsxProcessed = 0;

const POISON_TOKEN_RE = /--ds-font-size-|--ds-line-height-body/;
// Bare numeric `fontSize:` is only trustworthy as "this is a real CSS style
// object" in .tsx/.jsx files (JSX `style={{...}}` idiom) OR in a .ts file
// that explicitly types the constant as CSSProperties (a genuine CSS-in-JS
// style module, e.g. dashboardTypography.ts, story-detail-modules/
// constants.ts). Absent either signal, a plain .ts file using the same
// property name is just as likely a legitimate, unrelated numeric API for
// a third-party library this repo integrates with — pptxgenjs `.addText()`
// options, jsPDF-autotable `styles.fontSize` (PDF points, not px) — so we
// only act on numeric-only .ts files when the poison token itself is
// already present (proven-safe: e.g. select-portal-styles.ts).
const RAW_NUMERIC_FONTSIZE_RE = /fontSize\s*:\s*['"]?\d/;
const CSS_PROPERTIES_TYPE_RE = /:\s*(React\.)?CSSProperties\b/;
for (const file of tsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const isJsx = file.endsWith('.tsx') || file.endsWith('.jsx');
  const looksLikeCss = isJsx || CSS_PROPERTIES_TYPE_RE.test(src);
  const prefilterHit = POISON_TOKEN_RE.test(src) || (looksLikeCss && RAW_NUMERIC_FONTSIZE_RE.test(src));
  if (!prefilterHit) continue;
  const lines = src.split('\n');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const lineIgnored = (ln) => {
    const cur = lines[ln - 1] || '';
    const prev = lines[ln - 2] || '';
    return /ads-scanner:ignore-line/.test(cur) || /ads-scanner:ignore-next-line/.test(prev);
  };

  const edits = []; // {start,end,text}
  let needsFontSizePxImport = false;
  const relFile = rel(file);
  const nameStack = [];

  function pushNameIfNamed(node) {
    let nm = null;
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) nm = node.name.text;
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) nm = node.name.text;
    else if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) nm = node.name.text;
    if (nm) nameStack.push(nm);
    return !!nm;
  }
  function isMetricHere() {
    if (METRIC_CONTEXT_RE.test(relFile)) return true;
    return nameStack.some((n) => METRIC_CONTEXT_RE.test(n));
  }

  // ---- CASE A: object literals containing fontSize/lineHeight PropertyAssignments ----
  function handleObjectLiteral(obj) {
    const props = obj.properties;
    let fontSizeProp = null; let fsSlot = null; let fsIsIgnored = false;
    let lineHeightProp = null; let lhIsBodyExact = false;
    for (const p of props) {
      if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) continue;
      const key = p.name.text;
      const init = p.initializer;
      if (key === 'fontSize') {
        const ln = lineOf(init.getStart(sf));
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
          const slot = slotFromFsVar(init.text);
          if (slot !== null) { fontSizeProp = p; fsSlot = slot; fsIsIgnored = lineIgnored(ln); }
          else {
            const clean = slotForCleanInt(init.text) ?? (INCLUDE_FRACTIONAL ? slotForCleanNumber(init.text) : null);
            if (clean !== null) { fontSizeProp = p; fsSlot = clean; fsIsIgnored = lineIgnored(ln); }
            else if (/^\d+(\.\d+)?(px|rem|em)?$/.test(init.text.trim())) {
              report.numericLeftFractional.push({ file: relFile, line: ln, value: init.text });
            }
          }
        } else if (ts.isNumericLiteral(init)) {
          const ln2 = lineOf(init.getStart(sf));
          const num = Number(init.text);
          if (Number.isInteger(num) || INCLUDE_FRACTIONAL) { fontSizeProp = p; fsSlot = nearestSlot(num); fsIsIgnored = lineIgnored(ln2); }
          else report.numericLeftFractional.push({ file: relFile, line: ln2, value: init.text });
        }
      } else if (key === 'lineHeight') {
        if ((ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) && isLhVar(init.text)) {
          lineHeightProp = p; lhIsBodyExact = true;
        }
      }
    }
    if (!fontSizeProp && !(lineHeightProp && lhIsBodyExact)) return;
    if (fontSizeProp && fsIsIgnored) return; // respect ads-scanner:ignore on the numeric fontSize site

    const isMetric = isMetricHere();
    if (isMetric) report.metricContextHits++;
    const role = fontSizeProp ? roleForSlot(fsSlot, isMetric) : 'body';
    const dropSet = new Set();
    if (fontSizeProp) dropSet.add(fontSizeProp);
    if (lineHeightProp && lhIsBodyExact) dropSet.add(lineHeightProp);

    const propEdits = dropPropertyEdits(sf, src, obj, dropSet);
    const isMultiline = src.slice(obj.getStart(sf), obj.getEnd()).includes('\n');
    const indent = isMultiline ? (lines[lineOf(props[0].getStart(sf)) - 1] || '').match(/^\s*/)[0] : '';
    const decl = `font: 'var(${roleVar(role)})'`;
    const firstDropped = props.findIndex((p) => dropSet.has(p));
    if (firstDropped === 0) {
      const hadKeptAfter = propEdits[0].text === ' ';
      propEdits[0].text = isMultiline
        ? (hadKeptAfter ? `\n${indent}${decl},\n${indent}` : `${decl}`)
        : (hadKeptAfter ? `${decl}, ` : `${decl}`);
    } else {
      const insertText = isMultiline ? `\n${indent}${decl},` : `${decl}, `;
      edits.push({ start: obj.getStart(sf) + 1, end: obj.getStart(sf) + 1, text: insertText });
    }
    edits.push(...propEdits);

    if (fontSizeProp && lineHeightProp && lhIsBodyExact) report.tsObjectCollapsed++;
    else if (fontSizeProp) report.tsObjectCollapsed++;
    else report.tsOrphanLineHeight++;
  }

  // ---- CASE B / C: bare string/template literals outside object-literal PropertyAssignment ----
  function handleBareLiteral(node) {
    const text = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
    if (text === null) return;
    const exactSlot = slotFromFsVar(text);
    const exactLh = isLhVar(text);
    if (exactSlot === null && !exactLh) {
      // prose case: substring mention only
      if (ANY_FS_OR_LH_RE.test(text)) {
        const isMetric = isMetricHere();
        const start = node.getStart(sf) + 1; // inside the quotes
        const raw = src.slice(start, node.getEnd() - 1);
        const rewritten = raw.replace(ANY_FS_OR_LH_RE, (m) => {
          const s = slotFromFsVar(m);
          const role = s !== null ? roleForSlot(s, isMetric) : 'body';
          return `var(${roleVar(role)})`;
        });
        if (rewritten !== raw) {
          edits.push({ start, end: node.getEnd() - 1, text: rewritten });
          report.tsProseRewritten++;
        }
      }
      return;
    }
    // Exact var() — is this a functional non-object-literal consumer (CASE B)?
    const parent = node.parent;
    const isPropAssignValue = ts.isPropertyAssignment(parent) && parent.initializer === node;
    if (isPropAssignValue) return; // handled by handleObjectLiteral via its own object walk
    // CASE B: JsxAttribute, BindingElement default, VariableDeclaration initializer, or any other expression position.
    const isMetric = isMetricHere();
    const role = exactSlot !== null ? roleForSlot(exactSlot, isMetric) : 'body';
    const camel = role.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `fontSizePx.${camel}` });
    needsFontSizePxImport = true;
    report.tsNonStyleRewritten++;
  }

  function visit(node) {
    const pushed = pushNameIfNamed(node);
    if (ts.isObjectLiteralExpression(node)) handleObjectLiteral(node);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) handleBareLiteral(node);
    ts.forEachChild(node, visit);
    if (pushed) nameStack.pop();
  }
  visit(sf);

  if (!edits.length && !ANY_FS_OR_LH_RE.test(src)) continue;

  // Import for fontSizePx, if needed and not already present.
  if (needsFontSizePxImport && !/\bfontSizePx\b/.test(src.split('\n').find((l) => /^import/.test(l.trim())) || '') && !new RegExp(`import\\s*\\{[^}]*\\bfontSizePx\\b[^}]*\\}\\s*from\\s*['"]@/theme/tokens['"]`).test(src)) {
    // Insert right after the last top-level import statement (or at file top if none).
    let insertPos = 0;
    for (const stmt of sf.statements) {
      if (ts.isImportDeclaration(stmt)) insertPos = stmt.getEnd();
      else break;
    }
    const importText = `${insertPos > 0 ? '\n' : ''}import { fontSizePx } from '@/theme/tokens';${insertPos === 0 ? '\n' : ''}`;
    edits.push({ start: insertPos, end: insertPos, text: importText });
    report.importsAdded.add(relFile);
  }

  edits.sort((a, b) => (b.start - a.start) || (b.end - b.start) - (a.end - a.start));
  let outSrc = src;
  for (const e of edits) outSrc = outSrc.slice(0, e.start) + e.text + outSrc.slice(e.end);

  // Mop-up: comments/JSDoc still mentioning the retiring tokens (not visited
  // by the AST walk above, which only inspects string/template literals) —
  // rewrite the text so no dangling reference to the deleted tokens remains.
  if (ANY_FS_OR_LH_RE.test(outSrc)) {
    outSrc = outSrc.replace(ANY_FS_OR_LH_RE, (m) => {
      const s = slotFromFsVar(m);
      const role = s !== null ? roleForSlot(s, isMetricHere()) : 'body';
      return `var(${roleVar(role)})`;
    });
  }

  if (outSrc === src) continue;
  newContents.set(file, outSrc);
  report.filesTouched.add(relFile);
  tsxProcessed++;
}

// ============================================================
// WRITE
// ============================================================
if (!DRY) {
  for (const [file, content] of newContents) fs.writeFileSync(file, content);
}

const summary = {
  dryRun: DRY,
  filesTouched: report.filesTouched.size,
  cssRewritten: report.cssRewritten,
  tsObjectCollapsed: report.tsObjectCollapsed,
  tsOrphanLineHeight: report.tsOrphanLineHeight,
  tsNonStyleRewritten: report.tsNonStyleRewritten,
  tsProseRewritten: report.tsProseRewritten,
  metricContextHits: report.metricContextHits,
  numericLeftFractionalCount: report.numericLeftFractional.length,
  importsAdded: report.importsAdded.size,
};
console.log(JSON.stringify(summary, null, 2));
const full = { summary, numericLeftFractional: report.numericLeftFractional, filesTouched: [...report.filesTouched].sort(), importsAdded: [...report.importsAdded].sort() };
if (REPORT_PATH) fs.writeFileSync(REPORT_PATH, JSON.stringify(full, null, 2));
