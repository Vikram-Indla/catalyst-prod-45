#!/usr/bin/env node
/**
 * Token graph builder — Goal 1 of CAT-DS-TOKEN-POISON-20260710-001.
 *
 * Parser-backed (postcss + TypeScript AST, no regex-only scanning) inventory of
 * every CSS custom property declared or consumed in the app: owners, scope,
 * theme context, reference edges, cycles, undefined references, duplicate
 * global owners, semantic-category mismatches, app-authored --ds-* tokens,
 * runtime customColors bridge mappings, hard-coded colors, and raw typography.
 *
 * Output: design-governance/token-graph/{graph.json,summary.json,SUMMARY.md}
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import url from 'url';

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const ts = require('typescript');

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'design-governance', 'token-graph');

// ---------- canonical ADS ownership ----------
const adsTokenNames = require('@atlaskit/tokens/token-names').default;
const ADS_VARS = new Map(); // cssVar -> tokenId
for (const [id, cssVar] of Object.entries(adsTokenNames)) ADS_VARS.set(cssVar, id);

// External systems that legitimately define vars at runtime (not app-owned, not phantom)
const EXTERNAL_PREFIXES = ['--tw-', '--radix-', '--rt-', '--vh', '--vw', '--recharts', '--cm-', '--sb-'];

// ---------- semantic categories ----------
function adsCategory(tokenId) {
  if (!tokenId) return null;
  if (tokenId.startsWith('color.text') || tokenId.startsWith('color.link')) return 'text';
  if (tokenId.startsWith('color.background')) return 'background';
  if (tokenId.startsWith('elevation.surface')) return 'background';
  if (tokenId.startsWith('color.border')) return 'border';
  if (tokenId.startsWith('color.icon')) return 'icon';
  if (tokenId.startsWith('color.chart')) return 'chart';
  if (tokenId.startsWith('elevation.shadow')) return 'shadow';
  if (tokenId.startsWith('color.blanket')) return 'background';
  if (tokenId.startsWith('color.skeleton')) return 'background';
  if (tokenId.startsWith('font')) return 'font';
  if (tokenId.startsWith('space')) return 'space';
  if (tokenId.startsWith('opacity')) return 'opacity';
  if (tokenId.startsWith('border.radius') || tokenId.startsWith('border.width')) return 'geometry';
  if (tokenId.startsWith('motion')) return 'motion';
  if (tokenId.startsWith('utility')) return 'utility';
  return 'other';
}

// Heuristic category from a custom token's *name* (mirrors audit methodology)
const NAME_CATEGORY_RULES = [
  { cat: 'shadow', re: /(shadow|elevation)/ },
  { cat: 'chart', re: /chart/ },
  { cat: 'icon', re: /icon/ },
  { cat: 'font', re: /(font|typograph|leading|tracking|line-height|letter)/ },
  { cat: 'space', re: /(space|spacing|gap|inset-x|padding|margin)/ },
  { cat: 'border', re: /(border|divider|ring|outline|-bd(-|$)|stroke)/ },
  { cat: 'background', re: /(background|surface|-bg(-|$)|canvas|overlay|backdrop|scrim|fill|-page(-|$)|elevated|sunken|raised|inset(-|$)|track)/ },
  { cat: 'text', re: /(text|-fg(-|$)|foreground|ink|link|-t[0-9](-|$)|label|placeholder|caption|heading)/ },
];
function nameCategory(token) {
  const t = token.toLowerCase();
  if (t.startsWith('--ds-')) {
    const id = ADS_VARS.get(token);
    if (id) return adsCategory(id);
  }
  for (const rule of NAME_CATEGORY_RULES) if (rule.re.test(t)) return rule.cat;
  return null;
}
// Category implied by the CSS property a var() is consumed in
function propCategory(prop) {
  const p = prop.toLowerCase();
  if (p === 'color' || p === '-webkit-text-fill-color' || p === 'caret-color' || p === 'text-decoration-color') return 'text';
  if (p.includes('background')) return 'background';
  if (p.includes('border') && p.includes('color')) return 'border';
  if (p === 'border' || /^border-(top|right|bottom|left)$/.test(p)) return 'border';
  if (p === 'outline-color' || p === 'outline') return 'border';
  if (p === 'fill' || p === 'stroke') return 'icon';
  if (p.includes('shadow')) return 'shadow';
  if (p.startsWith('font') || p === 'line-height' || p === 'letter-spacing') return 'font';
  return null;
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
const cssFiles = walk(path.join(ROOT, 'src'), ['.css']);
const tsFiles = walk(path.join(ROOT, 'src'), ['.ts', '.tsx', '.jsx']);
for (const extra of ['tailwind.config.ts', 'tailwind.config.js', 'index.html']) {
  const p = path.join(ROOT, extra);
  if (fs.existsSync(p)) (extra.endsWith('.html') ? cssFiles : tsFiles).push(p);
}

const rel = (p) => path.relative(ROOT, p);

// ---------- CSS parsing ----------
const VAR_REF = /var\(\s*(--[A-Za-z0-9_-]+)/g;
const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;

/** Remove every var(...) expression (fallbacks judged separately) — a color
 * function that only WRAPS a var() reference, e.g. hsl(var(--x)), is not a
 * raw color. Mirrors scripts/token-graph/lib.mjs's stripVarFunctions. */
function stripVarFunctions(value) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i);
    if (at === -1) { out += value.slice(i); break; }
    out += value.slice(i, at);
    let depth = 0;
    let j = at + 3;
    for (; j < value.length; j++) {
      if (value[j] === '(') depth++;
      else if (value[j] === ')') { depth--; if (depth === 0) { j++; break; } }
    }
    i = j;
  }
  return out;
}
function hasRawColor(value) {
  return RAW_COLOR.test(stripVarFunctions(value));
}

function themeContext(node) {
  // Walk selector + at-rule ancestry to classify root/light/dark/scoped.
  let sel = '';
  let dark = false;
  let light = false;
  let inMedia = false;
  for (let n = node; n; n = n.parent) {
    if (n.type === 'rule') sel = n.selector + ' ' + sel;
    if (n.type === 'atrule' && n.name === 'media') {
      inMedia = true;
      if (/prefers-color-scheme:\s*dark/.test(n.params)) dark = true;
      if (/prefers-color-scheme:\s*light/.test(n.params)) light = true;
    }
  }
  const s = sel.trim();
  // A theme qualifier (.dark / [data-theme=...] / [data-color-mode=...]) only makes a
  // branch globally "dark"/"light" when the REST of that branch is root-like (:root,
  // html, body, or nothing) — a descendant combinator onto anything else (e.g.
  // `.dark [data-module="x"]`) is a module/component-scoped override, not a global one.
  const hasThemeQualifier = /(\.dark|\[data-theme=["']?dark|\[data-color-mode=["']?dark|\[data-color-mode=["']?light)/.test(s);
  const stripTheme = (part) => part
    .replace(/\.dark\b/g, '')
    .replace(/\[data-theme=["']?dark["']?\]/g, '')
    .replace(/\[data-color-mode=["']?(dark|light)["']?\]/g, '')
    .trim();
  const isGlobalThemeBranch = (part) => {
    const rest = stripTheme(part.trim());
    return rest === '' || /^(:root|html|body)(\[[^\]]*\])*$/.test(rest);
  };
  if (hasThemeQualifier || dark) {
    const parts = s.split(',').map((p) => p.trim());
    const allGlobal = parts.every(isGlobalThemeBranch);
    if (allGlobal) return { context: 'dark', selector: s };
    return { context: 'scoped', selector: s };
  }
  if (/\[data-color-mode=["']?light/.test(s) || light) return { context: 'light', selector: s };
  const rootish = s.split(',').every((part) => /^\s*(:root|html|body)(\s*[,{]|\s*$|\[)/.test(part.trim()) || /^\s*(:root|html|body)$/.test(part.trim()));
  if (rootish && !inMedia) return { context: 'root', selector: s };
  return { context: 'scoped', selector: s };
}

const declarations = []; // custom property declarations
const consumers = []; // var() usage in real CSS properties
const hardcoded = []; // raw colors in CSS
const importOrder = [];

for (const file of cssFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.html')) continue;
  // Same-line trailing comments are a separate PostCSS AST sibling, not part of
  // decl.toString() — check the raw source line (same or one above) instead of
  // the serialized declaration, matching lib.mjs's lineIgnored() used by the
  // actual enforcement gate (scripts/token-gate/run-gate.mjs).
  const lines = src.split('\n');
  const lineIgnored = (line) => /ads-scanner:ignore/.test(lines[line - 1] || '') || /ads-scanner:ignore/.test(lines[line - 2] || '');
  let root;
  try {
    root = postcss.parse(src, { from: file });
  } catch (e) {
    console.error('CSS parse failure:', rel(file), e.message);
    continue;
  }
  root.walkAtRules('import', (at) => importOrder.push({ file: rel(file), line: at.source.start.line, imports: at.params }));
  root.walkDecls((decl) => {
    const line = decl.source?.start?.line ?? 0;
    const refs = [...decl.value.matchAll(VAR_REF)].map((m) => m[1]);
    if (decl.prop.startsWith('--')) {
      const { context, selector } = themeContext(decl.parent);
      declarations.push({
        token: decl.prop, file: rel(file), line, selector, context,
        value: decl.value.replace(/\s+/g, ' ').slice(0, 300),
        refs, selfRef: refs.includes(decl.prop),
        hasRawColor: hasRawColor(decl.value),
        ignored: lineIgnored(line),
      });
    } else {
      if (refs.length) {
        consumers.push({ file: rel(file), line, prop: decl.prop, tokens: refs, kind: 'css' });
      }
      if (hasRawColor(decl.value) && propCategory(decl.prop)) {
        hardcoded.push({ file: rel(file), line, prop: decl.prop, value: decl.value.slice(0, 120), ignored: lineIgnored(line) });
      }
    }
  });
}

// ---------- TS/TSX parsing (AST) ----------
const tsConsumers = []; // var(--x) inside string/template literals
const runtimeSets = []; // style.setProperty('--x', ...)
const customColorMappings = []; // {cp, light, dark, atlaskit} objects
const tokenCalls = []; // token('...') calls
const rawFontSizes = []; // numeric fontSize in style objects
const dsFontSizeRefs = []; // --ds-font-size-* direct refs

function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  }
  return null;
}

for (const file of tsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('--') && !src.includes('fontSize') && !src.includes('token(')) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : undefined);
  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  function visit(node) {
    const text = literalText(node);
    if (text !== null) {
      if (text.includes('var(--')) {
        const refs = [...text.matchAll(VAR_REF)].map((m) => m[1]);
        if (refs.length) tsConsumers.push({ file: rel(file), line: lineOf(node), tokens: refs, kind: 'ts-literal' });
      } else if (/^--[A-Za-z0-9_-]+$/.test(text)) {
        // bare '--x' literal: setProperty target or CSS-var key in a style object
        const parent = node.parent;
        let via = 'literal';
        if (ts.isCallExpression(parent) && parent.expression.getText(sf).endsWith('setProperty')) via = 'setProperty';
        else if (ts.isPropertyAssignment(parent) && parent.name === node) via = 'style-object-key';
        runtimeSets.push({ file: rel(file), line: lineOf(node), token: text, via });
      }
    }
    if (ts.isCallExpression(node) && node.expression.getText(sf) === 'token' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      tokenCalls.push({ file: rel(file), line: lineOf(node), tokenId: node.arguments[0].text });
    }
    if (ts.isObjectLiteralExpression(node)) {
      const props = {};
      for (const p of node.properties) {
        if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
          props[p.name.text] = p.initializer;
        }
      }
      if (props.atlaskit && (props.light || props.dark)) {
        const get = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : n ? n.getText(sf).slice(0, 120) : null);
        customColorMappings.push({
          file: rel(file), line: lineOf(node),
          cp: get(props.cp), light: get(props.light), dark: get(props.dark), atlaskit: get(props.atlaskit),
        });
      }
      if (props.fontSize && (ts.isNumericLiteral(props.fontSize) || (ts.isStringLiteral(props.fontSize) && /^\d+(px|rem|em)?$/.test(props.fontSize.text)))) {
        rawFontSizes.push({ file: rel(file), line: lineOf(props.fontSize), value: props.fontSize.getText(sf) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  // direct --ds-font-size-* references (any literal)
  let m;
  const fsRe = /--ds-font-size-[a-z0-9-]*/g;
  while ((m = fsRe.exec(src))) {
    const line = src.slice(0, m.index).split('\n').length;
    dsFontSizeRefs.push({ file: rel(file), line, token: m[0] });
  }
}

// ---------- graph analysis ----------
const declaredBy = new Map(); // token -> decls
for (const d of declarations) {
  if (!declaredBy.has(d.token)) declaredBy.set(d.token, []);
  declaredBy.get(d.token).push(d);
}
const allRefs = new Map(); // token -> [{file,line,via}]
function addRef(token, ref) {
  if (!allRefs.has(token)) allRefs.set(token, []);
  allRefs.get(token).push(ref);
}
for (const d of declarations) for (const r of d.refs) addRef(r, { file: d.file, line: d.line, via: 'decl:' + d.token });
for (const c of consumers) for (const t of c.tokens) addRef(t, { file: c.file, line: c.line, via: 'css:' + c.prop });
for (const c of tsConsumers) for (const t of c.tokens) addRef(t, { file: c.file, line: c.line, via: 'ts' });

const runtimeDefined = new Set(runtimeSets.filter((r) => r.via !== 'literal').map((r) => r.token));

function ownerOf(token) {
  if (ADS_VARS.has(token)) return 'atlaskit';
  if (EXTERNAL_PREFIXES.some((p) => token.startsWith(p))) return 'external';
  if (token.startsWith('--ds-')) return 'app-claims-ads'; // app-invented --ds-* name not in ADS!
  return 'app';
}

// undefined references: consumed but never declared anywhere, not ADS, not external, not runtime-set
const undefinedRefs = [];
for (const [token, refs] of allRefs) {
  if (declaredBy.has(token)) continue;
  if (ADS_VARS.has(token)) continue;
  if (EXTERNAL_PREFIXES.some((p) => token.startsWith(p))) continue;
  if (runtimeDefined.has(token)) continue;
  undefinedRefs.push({ token, count: refs.length, files: [...new Set(refs.map((r) => r.file))].length, refs });
}
undefinedRefs.sort((a, b) => b.count - a.count);

// cycles: edges token -> referenced tokens (from declarations only)
const edges = new Map();
for (const d of declarations) {
  if (!edges.has(d.token)) edges.set(d.token, new Set());
  for (const r of d.refs) edges.get(d.token).add(r);
}
const directSelfRefs = declarations.filter((d) => d.selfRef);
// Tarjan SCC for indirect cycles
const idx = new Map(); const low = new Map(); const onStack = new Set(); const stack = [];
let counter = 0; const sccs = [];
function strongconnect(v) {
  idx.set(v, counter); low.set(v, counter); counter++;
  stack.push(v); onStack.add(v);
  for (const w of edges.get(v) ?? []) {
    if (!edges.has(w)) continue;
    if (!idx.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
    else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
  }
  if (low.get(v) === idx.get(v)) {
    const comp = [];
    let w;
    do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
    if (comp.length > 1) sccs.push(comp);
  }
}
for (const v of edges.keys()) if (!idx.has(v)) strongconnect(v);

// duplicate global owners: token declared in global contexts (root/light/dark) in >1 file
const duplicateGlobalOwners = [];
for (const [token, decls] of declaredBy) {
  const globals = decls.filter((d) => d.context !== 'scoped');
  const files = [...new Set(globals.map((d) => d.file))];
  if (files.length > 1) duplicateGlobalOwners.push({ token, files, declCount: globals.length });
}
duplicateGlobalOwners.sort((a, b) => b.declCount - a.declCount);

// app-authored --ds-* declarations
const appDsDecls = declarations.filter((d) => d.token.startsWith('--ds-'));

// category mismatches (decl name category vs first-ref category), mirroring the audit
const categoryMismatches = [];
for (const d of declarations) {
  const dc = nameCategory(d.token);
  if (!dc || !d.refs.length) continue;
  const first = d.refs[0];
  if (first === d.token) continue;
  const rc = nameCategory(first);
  if (!rc || rc === dc) continue;
  // background<->? surface aliases: background may reference elevation surfaces — same cat already
  categoryMismatches.push({ token: d.token, tokenCat: dc, ref: first, refCat: rc, file: d.file, line: d.line, context: d.context });
}

// customColors poisoning: light/dark values that reference --ds-* vars or wrong category
const customColorFindings = customColorMappings.map((m) => {
  const findings = [];
  for (const mode of ['light', 'dark']) {
    const v = m[mode];
    if (!v) continue;
    const refs = [...String(v).matchAll(VAR_REF)].map((x) => x[1]);
    for (const r of refs) {
      if (r.startsWith('--ds-')) {
        const targetCat = adsCategory(ADS_VARS.get(r)) ?? nameCategory(r);
        const sourceCat = m.atlaskit ? adsCategory(m.atlaskit) : null;
        findings.push({ mode, ref: r, refCat: targetCat, atlaskitCat: sourceCat, crossCategory: !!(sourceCat && targetCat && sourceCat !== targetCat), refsDs: true });
      }
    }
  }
  return { ...m, findings, poisoned: findings.length > 0 };
});

// ---------- classification ----------
function classifyDecl(d) {
  if (d.token.startsWith('--ds-')) return 'poison:app-authored-ds';
  if (d.selfRef) return 'poison:self-reference';
  const dc = nameCategory(d.token);
  const firstRef = d.refs[0];
  if (firstRef && dc) {
    const rc = nameCategory(firstRef);
    if (rc && rc !== dc && firstRef !== d.token) return 'poison:cross-category';
  }
  if (d.refs.some((r) => undefinedRefs.some((u) => u.token === r))) return 'poison:phantom-fallback';
  if (d.hasRawColor && !d.ignored && !EXTERNAL_PREFIXES.some((p) => d.token.startsWith(p))) return 'unsafe:raw-color';
  const dup = duplicateGlobalOwners.find((x) => x.token === d.token);
  if (dup && d.context !== 'scoped') return 'unsafe:duplicate-global-owner';
  if (d.refs.length === 1 && d.refs[0].startsWith('--ds-') && dc) return 'alias:ads-backed';
  if (!allRefs.has(d.token)) return 'debt:unreferenced';
  return 'unresolved-risk';
}
const classified = declarations.map((d) => ({ ...d, class: classifyDecl(d) }));
const classCounts = {};
for (const d of classified) classCounts[d.class] = (classCounts[d.class] || 0) + 1;

// ---------- output ----------
const summary = {
  generatedAt: process.env.TOKEN_GRAPH_TS || 'run',
  root: ROOT,
  files: { css: cssFiles.length, ts: tsFiles.length },
  declarations: declarations.length,
  uniqueTokens: declaredBy.size,
  cpDeclarations: declarations.filter((d) => d.token.startsWith('--cp-')).length,
  cpUnique: [...declaredBy.keys()].filter((t) => t.startsWith('--cp-')).length,
  appDsDeclarations: appDsDecls.length,
  appDsUnique: [...new Set(appDsDecls.map((d) => d.token))].length,
  directSelfRefs: directSelfRefs.length,
  indirectCycleGroups: sccs.length,
  duplicateGlobalOwners: duplicateGlobalOwners.length,
  undefinedTokens: undefinedRefs.length,
  undefinedRefOccurrences: undefinedRefs.reduce((a, b) => a + b.count, 0),
  categoryMismatchDeclarations: categoryMismatches.length,
  customColorMappings: customColorMappings.length,
  customColorPoisoned: customColorFindings.filter((m) => m.poisoned).length,
  hardcodedColorDecls: hardcoded.filter((h) => !h.ignored).length,
  rawFontSizes: rawFontSizes.length,
  dsFontSizeRefs: dsFontSizeRefs.length,
  classCounts,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'graph.json'), JSON.stringify({
  summary,
  declarations: classified,
  consumers: consumers.length > 20000 ? consumers.slice(0, 20000) : consumers,
  tsConsumers,
  runtimeSets,
  customColors: customColorFindings,
  tokenCalls,
  undefinedRefs: undefinedRefs.map(({ refs, ...rest }) => ({ ...rest, sample: refs.slice(0, 5) })),
  duplicateGlobalOwners,
  directSelfRefs: directSelfRefs.map((d) => ({ token: d.token, file: d.file, line: d.line })),
  indirectCycles: sccs,
  categoryMismatches,
  appDsDecls: appDsDecls.map((d) => ({ token: d.token, file: d.file, line: d.line, context: d.context })),
  hardcoded,
  rawFontSizes,
  dsFontSizeRefs,
  importOrder,
}, null, 1));
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

const md = [
  '# Token graph summary (Goal 1)',
  '',
  '| metric | value |', '|---|---|',
  ...Object.entries(summary).filter(([k, v]) => typeof v !== 'object').map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '## Class counts', ...Object.entries(classCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Top undefined tokens', ...undefinedRefs.slice(0, 15).map((u) => `- ${u.token}: ${u.count} refs / ${u.files} files`),
  '',
  '## App-authored --ds-* by file',
  ...Object.entries(appDsDecls.reduce((acc, d) => { acc[d.file] = (acc[d.file] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([f, n]) => `- ${f}: ${n}`),
  '',
  '## Poisoned customColors mappings', ...customColorFindings.filter((m) => m.poisoned).map((m) => `- ${m.file}:${m.line} ${m.atlaskit} → ${(m.findings || []).map((f) => `${f.mode}:${f.ref}${f.crossCategory ? ' (CROSS-CATEGORY)' : ''}`).join(', ')}`),
].join('\n');
fs.writeFileSync(path.join(OUT_DIR, 'SUMMARY.md'), md);

console.log(JSON.stringify(summary, null, 2));
console.log('\nWrote', rel(path.join(OUT_DIR, 'graph.json')));
