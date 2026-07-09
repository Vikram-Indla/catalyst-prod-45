#!/usr/bin/env node

/**
 * CATALYST UI-FIXES — Authoritative Route Inventory (static, AST-based)
 * Contract: docs/acceptance/ui-fixes-acceptance-criteria.md §5.1, §8
 *
 * Parses the router source with the TypeScript compiler (real JSX AST, not
 * regex) and resolves NESTED <Route> path prefixes to full, browsable paths.
 * React Router v6 nests routes via JSX children; a pathless layout route
 * (element-only) does not extend the prefix. Absolute child paths reset it.
 *
 * Merges title metadata from src/config/routeRegistry.ts.
 *
 * Outputs:
 *   docs/reports/ui-fixes/00-route-inventory.generated.json  (authoritative)
 *   docs/reports/ui-fixes/00-route-inventory.md               (human view)
 *
 * Usage:
 *   node scripts/route-inventory.cjs            # regenerate inventory
 *   node scripts/route-inventory.cjs --json     # print JSON to stdout only
 *
 * Exit codes:
 *   0 - inventory generated
 *   1 - a router source file is missing or unparseable
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_JSON = path.join(REPO_ROOT, 'docs/reports/ui-fixes/00-route-inventory.generated.json');
const OUT_MD = path.join(REPO_ROOT, 'docs/reports/ui-fixes/00-route-inventory.md');

// Router source files to walk. Add any file that renders <Route> trees.
const ROUTER_FILES = [
  'src/App.tsx',
  'src/routes/FullAppRoutes.tsx',
];
const REGISTRY_FILE = 'src/config/routeRegistry.ts';

const argJsonOnly = process.argv.includes('--json');

function classify(p) {
  if (p == null) return 'index';
  if (p.includes('*')) return 'wildcard';
  if (p.includes(':')) return 'dynamic';
  return 'absolute';
}

function joinPath(prefix, seg) {
  if (seg == null) return prefix; // index / pathless
  if (seg.startsWith('/')) return seg.replace(/\/{2,}/g, '/'); // absolute child
  const joined = (prefix.endsWith('/') ? prefix.slice(0, -1) : prefix) + '/' + seg;
  return joined.replace(/\/{2,}/g, '/');
}

/** Extract a static string from a JSX attribute initializer, or null if dynamic. */
function readPathAttr(attr) {
  if (!attr || !attr.initializer) return { present: false, value: null, dynamic: false };
  const init = attr.initializer;
  if (ts.isStringLiteral(init)) return { present: true, value: init.text, dynamic: false };
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
      return { present: true, value: e.text, dynamic: false };
    }
    // path={someVar} or template with substitution — record as dynamic/unresolved
    return { present: true, value: e.getText(), dynamic: true };
  }
  return { present: true, value: null, dynamic: true };
}

function getAttr(opening, name) {
  const props = opening.attributes && opening.attributes.properties;
  if (!props) return null;
  return props.find(
    (p) => ts.isJsxAttribute(p) && p.name && p.name.escapedText === name
  );
}

function walkFile(relFile, routes) {
  const abs = path.join(REPO_ROOT, relFile);
  if (!fs.existsSync(abs)) {
    console.error(`ROUTE-INVENTORY: missing router file ${relFile}`);
    return false;
  }
  const src = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(relFile, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function lineOf(node) {
    return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  }

  function isRouteTag(opening) {
    const t = opening.tagName;
    return t && t.getText(sf) === 'Route';
  }

  // Recursive JSX walk carrying the resolved path prefix.
  function visit(node, prefix) {
    if (ts.isJsxElement(node) && isRouteTag(node.openingElement)) {
      const pathAttr = getAttr(node.openingElement, 'path');
      const info = readPathAttr(pathAttr);
      const seg = info.present ? info.value : null;
      const full = joinPath(prefix, seg);
      if (info.present) {
        routes.push({
          path: full,
          type: info.dynamic ? 'dynamic-expr' : classify(seg),
          dynamic: info.dynamic,
          source: `${relFile}:${lineOf(node)}`,
          nested: prefix !== '/' && prefix !== '',
        });
      }
      const childPrefix = info.present && seg != null ? full : prefix;
      node.children.forEach((c) => visit(c, childPrefix));
      return;
    }
    if (ts.isJsxSelfClosingElement(node) && isRouteTag(node)) {
      const pathAttr = getAttr(node, 'path');
      const info = readPathAttr(pathAttr);
      const seg = info.present ? info.value : null;
      const full = joinPath(prefix, seg);
      routes.push({
        path: info.present ? full : `${prefix} (index)`,
        type: info.present ? (info.dynamic ? 'dynamic-expr' : classify(seg)) : 'index',
        dynamic: info.dynamic,
        source: `${relFile}:${lineOf(node)}`,
        nested: prefix !== '/' && prefix !== '',
      });
      return;
    }
    node.forEachChild((c) => visit(c, prefix));
  }

  visit(sf, '');
  return true;
}

function readRegistry() {
  const abs = path.join(REPO_ROOT, REGISTRY_FILE);
  const map = {};
  if (!fs.existsSync(abs)) return map;
  const src = fs.readFileSync(abs, 'utf8');
  const re = /['"](\/[^'"]*)['"]\s*:\s*\{[^}]*pageTitle\s*:\s*['"]([^'"]*)['"]/g;
  let m;
  while ((m = re.exec(src))) map[m[1]] = m[2];
  return map;
}

function main() {
  const routes = [];
  let ok = true;
  for (const f of ROUTER_FILES) ok = walkFile(f, routes) && ok;
  if (!ok) process.exit(1);

  // De-dupe by resolved path, keep first source.
  const byPath = new Map();
  for (const r of routes) {
    if (!byPath.has(r.path)) byPath.set(r.path, r);
  }
  const unique = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  const titles = readRegistry();

  const counts = unique.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  const result = {
    generatedFrom: ROUTER_FILES,
    registryTitleKeys: Object.keys(titles).length,
    totalDeclarations: routes.length,
    uniqueResolvedPaths: unique.length,
    countsByType: counts,
    routes: unique.map((r) => ({ ...r, pageTitle: titles[r.path] || null })),
  };

  if (argJsonOnly) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  let md = '# 00 — Route Inventory (AST-resolved, authoritative)\n\n';
  md += '> Generated by `scripts/route-inventory.cjs` (TypeScript AST, nested-prefix resolved).\n';
  md += `> Regenerate: \`node scripts/route-inventory.cjs\`. Machine-readable: \`00-route-inventory.generated.json\`.\n\n`;
  md += '## Summary\n\n';
  md += `- Raw \`<Route>\` declarations: **${routes.length}**\n`;
  md += `- Unique resolved paths: **${unique.length}**\n`;
  md += `- By type: ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ')}\n`;
  md += `- routeRegistry.ts title keys: ${result.registryTitleKeys}\n\n`;
  md += '## Resolved routes (full path — type — source — title)\n\n';
  md += '| Full path | Type | Source | Page title |\n|---|---|---|---|\n';
  for (const r of result.routes) {
    md += `| \`${r.path}\` | ${r.type} | ${r.source} | ${r.pageTitle || ''} |\n`;
  }
  fs.writeFileSync(OUT_MD, md);
  console.log(
    `ROUTE-INVENTORY: ${routes.length} declarations -> ${unique.length} unique resolved paths`
  );
  console.log(`  ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join('  ')}`);
  console.log(`  wrote ${path.relative(REPO_ROOT, OUT_JSON)} and ${path.relative(REPO_ROOT, OUT_MD)}`);
}

main();
