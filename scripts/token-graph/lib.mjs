#!/usr/bin/env node
/**
 * Shared token-parsing library — CAT-DS-TOKEN-POISON-20260710-001.
 *
 * Real-parser (postcss + TypeScript compiler API) extraction of the CSS
 * custom-property model used by both:
 *   - scripts/token-graph/build-token-graph.mjs (Goal 1 inventory)
 *   - scripts/token-gate/run-gate.mjs           (Goal 4 immunity gate)
 *
 * Pure extraction only — no policy. Rules live in the consumers.
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
export const postcss = require('postcss');
export const ts = require('typescript');

// ---------- canonical ADS ownership ----------
const adsTokenNames = require('@atlaskit/tokens/token-names').default;
/** cssVar (e.g. '--ds-text') -> ADS token id (e.g. 'color.text') */
export const ADS_VARS = new Map();
for (const [id, cssVar] of Object.entries(adsTokenNames)) ADS_VARS.set(cssVar, id);

/** Prefixes legitimately defined by external systems at runtime. */
export const EXTERNAL_PREFIXES = ['--tw-', '--radix-', '--rt-', '--recharts', '--cm-', '--sb-', '--vh', '--vw'];

export const VAR_REF = /var\(\s*(--[A-Za-z0-9_-]+)/g;

// ---------- semantic categories (gate categories: 8 buckets or null) ----------
export function adsCategory(tokenId) {
  if (!tokenId) return null;
  if (tokenId.startsWith('color.text') || tokenId.startsWith('color.link')) return 'text';
  if (tokenId.startsWith('color.background') || tokenId.startsWith('elevation.surface')) return 'background';
  if (tokenId.startsWith('color.border')) return 'border';
  if (tokenId.startsWith('color.icon')) return 'icon';
  if (tokenId.startsWith('color.chart')) return 'chart';
  if (tokenId.startsWith('elevation.shadow')) return 'shadow';
  if (tokenId.startsWith('font')) return 'font';
  if (tokenId.startsWith('space')) return 'space';
  return null;
}

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
/** Heuristic semantic category from a token's *name*; ADS tokens use their real id. */
export function nameCategory(token) {
  const t = token.toLowerCase();
  if (t.startsWith('--ds-')) {
    const id = ADS_VARS.get(token);
    if (id) return adsCategory(id);
  }
  for (const rule of NAME_CATEGORY_RULES) if (rule.re.test(t)) return rule.cat;
  return null;
}

// ---------- theme-context classification ----------
export function themeContext(node) {
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

// ---------- file collection ----------
export function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x)) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

export const CSS_EXTS = ['.css'];
export const TS_EXTS = ['.ts', '.tsx', '.jsx', '.js'];

/** Expand a mix of files/directories into { cssFiles, tsFiles }. */
export function collectFiles(paths) {
  const cssFiles = [];
  const tsFiles = [];
  for (const p of paths) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      cssFiles.push(...walk(p, CSS_EXTS));
      tsFiles.push(...walk(p, TS_EXTS));
    } else if (CSS_EXTS.some((x) => p.endsWith(x))) cssFiles.push(p);
    else if (TS_EXTS.some((x) => p.endsWith(x)) && !p.endsWith('.d.ts')) tsFiles.push(p);
  }
  return { cssFiles, tsFiles };
}

// ---------- raw color detection ----------
export const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/;
const NAMED_COLORS = new Set(('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown ' +
  'burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray ' +
  'darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue ' +
  'darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite ' +
  'forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory ' +
  'khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen ' +
  'lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime ' +
  'limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
  'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive ' +
  'olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
  'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
  'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke ' +
  'yellow yellowgreen').split(' '));

/** Remove every var(...) expression (fallbacks are judged separately). */
export function stripVarFunctions(value) {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i);
    if (at === -1) { out += value.slice(i); break; }
    out += value.slice(i, at);
    let depth = 0;
    let j = at + 3; // at '('
    for (; j < value.length; j++) {
      if (value[j] === '(') depth++;
      else if (value[j] === ')') { depth--; if (depth === 0) { j++; break; } }
    }
    i = j;
  }
  return out;
}

/** True if the value (var() expressions removed) contains a raw color. */
export function hasRawColor(value) {
  const v = stripVarFunctions(value);
  if (RAW_COLOR.test(v)) return true;
  return v.split(/[\s,;()/]+/).some((tok) => NAMED_COLORS.has(tok.toLowerCase()));
}

/** CSS property carries color? (for hard-coded-color scoping) */
export function isColorBearingCssProp(prop) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) return false;
  return /(^|-)color$|background|border|outline|^fill$|^stroke$|shadow|column-rule|text-decoration$|caret/.test(p);
}

export const COLOR_BEARING_TS_KEYS = new Set([
  'color', 'backgroundColor', 'background', 'borderColor', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'outlineColor', 'outline', 'fill', 'stroke', 'caretColor',
  'textDecorationColor', 'boxShadow', 'textShadow', 'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
]);

export const IGNORE_PRAGMA = /ads-scanner:ignore/;

function lineIgnored(lines, line) {
  // pragma on the same line or the line above
  return IGNORE_PRAGMA.test(lines[line - 1] || '') || IGNORE_PRAGMA.test(lines[line - 2] || '');
}

// ---------- CSS scan ----------
export function scanCss(cssFiles, rel) {
  const decls = [];       // custom-property declarations
  const consumers = [];   // var() usage in real properties
  const hardcoded = [];   // raw colors in color-bearing properties
  const tokenValueColors = []; // raw colors baked into a custom-property's OWN declared value
  for (const file of cssFiles) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');
    let root;
    try {
      root = postcss.parse(src, { from: file });
    } catch (e) {
      console.error('CSS parse failure:', rel(file), e.message);
      continue;
    }
    root.walkDecls((decl) => {
      const line = decl.source?.start?.line ?? 0;
      const refs = [...decl.value.matchAll(VAR_REF)].map((m) => m[1]);
      if (decl.prop.startsWith('--')) {
        const { context, selector } = themeContext(decl.parent);
        decls.push({
          token: decl.prop, file: rel(file), line, selector, context,
          value: decl.value.replace(/\s+/g, ' ').slice(0, 300),
          refs, selfRef: refs.includes(decl.prop),
          ignored: lineIgnored(lines, line),
        });
        if (hasRawColor(decl.value)) {
          tokenValueColors.push({
            token: decl.prop, file: rel(file), line,
            value: decl.value.replace(/\s+/g, ' ').slice(0, 120),
            ignored: lineIgnored(lines, line),
          });
        }
      } else {
        if (refs.length) consumers.push({ file: rel(file), line, prop: decl.prop, tokens: refs });
        if (isColorBearingCssProp(decl.prop) && hasRawColor(decl.value)) {
          hardcoded.push({ file: rel(file), line, prop: decl.prop, value: decl.value.slice(0, 120), ignored: lineIgnored(lines, line) });
        }
      }
    });
  }
  return { decls, consumers, hardcoded, tokenValueColors };
}

// ---------- TS/TSX scan ----------
function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  }
  return null;
}

export function scanTs(tsFiles, rel) {
  const varRefs = [];       // var(--x) inside string/template literals
  const runtimeDecls = [];  // bare '--x' literals: setProperty targets / style-object keys / other
  const styleColors = [];   // raw colors in color-bearing style values / JSX color attrs
  const fontSizes = [];     // numeric fontSize in style objects
  const customThemeCalls = []; // setGlobalTheme({ customColors }) calls
  const tokenCalls = [];    // token('id', fallback) calls — id validated against the real ADS registry
  for (const file of tsFiles) {
    const src = fs.readFileSync(file, 'utf8');
    if (!/(--|fontSize|setGlobalTheme|[Cc]olor|background|fill|stroke|[Ss]hadow|border|outline)/.test(src)) continue;
    const lines = src.split('\n');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') || file.endsWith('.jsx') ? ts.ScriptKind.TSX : undefined);
    const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

    function checkColorValue(prop, valueNode) {
      const text = literalText(valueNode);
      if (text === null) return;
      if (hasRawColor(text)) {
        const line = lineOf(valueNode);
        styleColors.push({ file: rel(file), line, prop, value: text.slice(0, 120), ignored: lineIgnored(lines, line) });
      }
    }

    function visit(node) {
      const text = literalText(node);
      if (text !== null) {
        if (text.includes('var(--')) {
          const refs = [...text.matchAll(VAR_REF)].map((m) => m[1]);
          if (refs.length) varRefs.push({ file: rel(file), line: lineOf(node), tokens: refs });
        } else if (/^--[A-Za-z0-9_-]+$/.test(text)) {
          const parent = node.parent;
          let via = 'literal';
          if (ts.isCallExpression(parent) && parent.expression.getText(sf).endsWith('setProperty')) via = 'setProperty';
          else if (ts.isPropertyAssignment(parent) && parent.name === node) via = 'style-object-key';
          runtimeDecls.push({ file: rel(file), line: lineOf(node), token: text, via });
        }
      }
      if (ts.isCallExpression(node) && node.expression.getText(sf) === 'token' &&
          node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) {
        tokenCalls.push({ file: rel(file), line: lineOf(node), tokenId: node.arguments[0].text });
      }
      if (ts.isCallExpression(node) && /(^|\.)setGlobalTheme$/.test(node.expression.getText(sf))) {
        const arg = node.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const hit = arg.properties.find((p) =>
            p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 'customColors');
          if (hit) customThemeCalls.push({ file: rel(file), line: lineOf(hit) });
        }
      }
      if (ts.isObjectLiteralExpression(node)) {
        for (const p of node.properties) {
          if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) continue;
          const key = p.name.text;
          if (key === 'fontSize') {
            if (ts.isNumericLiteral(p.initializer) ||
                ((ts.isStringLiteral(p.initializer) || ts.isNoSubstitutionTemplateLiteral(p.initializer)) && /^\d+(\.\d+)?(px|rem|em)?$/.test(p.initializer.text))) {
              const line = lineOf(p.initializer);
              fontSizes.push({ file: rel(file), line, value: p.initializer.getText(sf), ignored: lineIgnored(lines, line) });
            }
          } else if (COLOR_BEARING_TS_KEYS.has(key)) {
            checkColorValue(key, p.initializer);
          }
        }
      }
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) &&
          ['fill', 'stroke', 'color', 'stopColor'].includes(node.name.text) &&
          node.initializer && ts.isStringLiteral(node.initializer)) {
        checkColorValue(node.name.text, node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return { varRefs, runtimeDecls, styleColors, fontSizes, customThemeCalls, tokenCalls };
}

// ---------- raw-text scans (both CSS and TS files) ----------
export function scanRawText(files, rel) {
  const dsFontSizeRefs = [];  // var(--ds-font-size-*) references
  const varColorFallbacks = []; // var(--ds-*|--cp-*, <hex/rgb/hsl fallback>)
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const lineAt = (index) => src.slice(0, index).split('\n').length;
    let m;
    const fsRe = /var\(\s*(--ds-font-size-[A-Za-z0-9-]*)/g;
    while ((m = fsRe.exec(src))) dsFontSizeRefs.push({ file: rel(file), line: lineAt(m.index), token: m[1] });
    const fbRe = /var\(\s*(--(?:ds|cp)-[A-Za-z0-9_-]+)\s*,\s*(#[0-9a-fA-F]{3,8}|rgba?\s*\([^)]*\)|hsla?\s*\([^)]*\))/g;
    while ((m = fbRe.exec(src))) varColorFallbacks.push({ file: rel(file), line: lineAt(m.index), token: m[1], fallback: m[2].replace(/\s+/g, ' ').slice(0, 60) });
  }
  return { dsFontSizeRefs, varColorFallbacks };
}

/** Full scan of a set of paths (files or dirs). rootForRel controls path display. */
export function scanModel(paths, rootForRel) {
  const rel = (p) => path.relative(rootForRel, p);
  const { cssFiles, tsFiles } = collectFiles(paths);
  const css = scanCss(cssFiles, rel);
  const tsx = scanTs(tsFiles, rel);
  const raw = scanRawText([...cssFiles, ...tsFiles], rel);
  return { cssFiles, tsFiles, ...css, ...tsx, ...raw };
}
