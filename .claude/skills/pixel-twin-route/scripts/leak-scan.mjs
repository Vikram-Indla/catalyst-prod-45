#!/usr/bin/env node
/**
 * Target Leak Scan  (import + route-string level — NOT substring)
 *
 * Detects REAL source-route leaks in target files, not prose coincidences.
 * Two leak classes, both AST/structural:
 *   1. IMPORT leak  — an import whose module specifier references the source
 *      route folder/name (e.g. `from '@/pages/project-hub/...'`).
 *   2. ROUTE-STRING leak — a string literal containing the source route path
 *      (e.g. navigate('/project-hub/...'), href="/project-hub").
 *
 * The old substring scan (flagging the entity word anywhere) is gone: it
 * matched "product" inside a "project" clone and every prose line, producing
 * noise the model learns to ignore. This version reads import declarations and
 * string literals only.
 *
 * Exit codes: 0 = clean, 2 = leaks found, 1 = bad usage.
 *
 * Usage:
 *   node .../leak-scan.mjs --target src/pages/product-hub \
 *                          --source project-hub \
 *                          [--routePath /project-hub]
 */
import fs from "fs";
import path from "path";
import ts from "typescript";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);
const TRACKED_EXT = /\.(ts|tsx|js|jsx)$/;

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      a[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return a;
}

function walk(p) {
  if (!fs.existsSync(p)) throw new Error(`Target path does not exist: ${p}`);
  if (fs.statSync(p).isFile()) return [p];
  const out = [];
  for (const e of fs.readdirSync(p)) {
    if (SKIP_DIRS.has(e)) continue;
    const full = path.join(p, e);
    out.push(...(fs.statSync(full).isDirectory() ? walk(full) : [full]));
  }
  return out;
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target || !args.source) {
    console.error("Usage: leak-scan.mjs --target <dir> --source <source-route-name> [--routePath /source-route]");
    process.exit(1);
  }
  const source = args.source;
  const routePath = args.routePath || `/${source}`;
  // source folder token variants used in import specifiers
  const importNeedles = [source, source.replace(/-/g, "")].filter(Boolean);

  const files = walk(args.target).filter((f) => TRACKED_EXT.test(f));
  const findings = [];

  for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node) => {
      // 1. import specifier leak
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        if (importNeedles.some((n) => spec.includes(`/${n}/`) || spec.endsWith(`/${n}`) || spec.includes(`/${n}/`))) {
          findings.push({ rel, line: lineOf(sf, node), kind: "IMPORT", text: spec });
        }
      }
      // 2. route-path string literal leak (skip import specifiers, already handled)
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text.includes(routePath)) {
        const parent = node.parent;
        const isImportSpec = parent && ts.isImportDeclaration(parent);
        if (!isImportSpec) {
          findings.push({ rel, line: lineOf(sf, node), kind: "ROUTE-STRING", text: node.text });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  console.log("TARGET LEAK SCAN (import + route-string)");
  console.log(`Target: ${args.target}   Source: ${source}   RoutePath: ${routePath}`);
  console.log(`Files scanned: ${files.length}   Findings: ${findings.length}`);

  if (findings.length) {
    console.error("\nSource leaks found:");
    for (const f of findings) console.error(`- [${f.kind}] ${f.rel}:${f.line}  ${f.text}`);
    console.error("\nIMPORT leaks: target pulls a source-route file (breaks autonomy) — remap to the target equivalent.");
    console.error("ROUTE-STRING leaks: target navigates/links to the source route — repoint to the target route.");
    process.exit(2);
  }
  console.log("No source leaks detected: PASS");
}

try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
