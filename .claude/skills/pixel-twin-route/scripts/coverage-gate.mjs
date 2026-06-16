#!/usr/bin/env node
/**
 * Fidelity Coverage Gate  (component + prop granularity)
 *
 * Compares a SOURCE route closure against a DEST route closure and blocks
 * completion when a rendered component — or a prop passed to it — was not
 * reproduced in the destination. For every gap it prints a fix PROPOSAL for
 * the source (never auto-applied; Source Shield is read-only) and a fix for
 * the destination.
 *
 * Honesty rule: props passed via {...spread}, or components rendered behind a
 * spread, cannot be statically enumerated. These are reported as UNVERIFIABLE,
 * never silently counted as covered. (CLAUDE.md 2026-05-19 audit-fraud lesson.)
 *
 * Exit codes:
 *   0  no P0/P1 gaps (UNVERIFIABLE items may still exist — listed, non-blocking)
 *   2  one or more P0 (missing component) or P1 (dropped prop) gaps
 *
 * Usage:
 *   node .../coverage-gate.mjs \
 *     --sourceEntry src/pages/project-hub/ProjectHub.tsx --sourceDir src/pages/project-hub \
 *     --destEntry   src/pages/product-hub/ProductHub.tsx --destDir   src/pages/product-hub \
 *     [--src src] [--ignore CompA,CompB]
 */
import fs from "fs";
import path from "path";
import ts from "typescript";

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

const EXTS = [".tsx", ".ts", ".jsx", ".js"];

function resolveSpecifier(spec, fromFile, srcRootAbs) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(srcRootAbs, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return { resolved: null, external: true };

  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return { resolved: path.resolve(c), external: false };
  }
  return { resolved: null, external: false };
}

function classify(resolved, specifier, routeDirAbs, srcRootAbs) {
  if (specifier && specifier.startsWith("@atlaskit/")) return "atlaskit";
  if (!resolved) return "external";
  if (resolved.startsWith(routeDirAbs + path.sep)) return "route-local";
  if (resolved.startsWith(srcRootAbs + path.sep)) return "shared";
  return "external";
}

function readSource(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function collectImports(sf) {
  const map = new Map(); // identifier -> specifier
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly) {
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause.name) map.set(clause.name.text, spec);
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if (!el.isTypeOnly) map.set(el.name.text, spec);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return map;
}

// Build an inventory for one route closure.
// name -> { props:Set<string>, spread:boolean, classification, files:Set<string> }
function buildInventory(entryAbs, routeDirAbs, srcRootAbs) {
  const inv = new Map();
  const seen = new Set();
  const queue = [entryAbs];

  const ensure = (name) => {
    if (!inv.has(name)) inv.set(name, { props: new Set(), spread: false, classification: "unknown", files: new Set() });
    return inv.get(name);
  };

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);

    const sf = readSource(file);
    const imports = collectImports(sf);
    const rel = path.relative(process.cwd(), file);

    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        let tag = node.tagName;
        while (ts.isPropertyAccessExpression(tag)) tag = tag.expression;
        if (ts.isIdentifier(tag)) {
          const name = tag.text;
          // only track component-like tags (Capitalized) — skip html elements
          if (/^[A-Z]/.test(name)) {
            const rec = ensure(name);
            rec.files.add(rel);
            const spec = imports.get(name);
            if (spec) {
              const r = resolveSpecifier(spec, file, srcRootAbs);
              rec.classification = classify(r.resolved, spec, routeDirAbs, srcRootAbs);
            } else if (rec.classification === "unknown") {
              rec.classification = "local-inline"; // defined in-file, not imported
            }
            for (const attr of node.attributes.properties) {
              if (ts.isJsxAttribute(attr) && attr.name) rec.props.add(attr.name.getText(sf));
              else if (ts.isJsxSpreadAttribute(attr)) rec.spread = true;
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    // recurse into route-local imports
    for (const [, spec] of imports) {
      const r = resolveSpecifier(spec, file, srcRootAbs);
      if (r.resolved && classify(r.resolved, spec, routeDirAbs, srcRootAbs) === "route-local" && !seen.has(r.resolved)) {
        queue.push(r.resolved);
      }
    }
  }
  return inv;
}

function fixForMissingComponent(name, rec) {
  switch (rec.classification) {
    case "shared":
    case "atlaskit":
      return {
        source: `none — ${name} is ${rec.classification}; do NOT copy it`,
        dest: `MOUNT ${name} in the destination route, fed by the data adapter`,
      };
    case "route-local":
    case "local-inline":
      return {
        source: `none — ${name} is route-local; safe to clone as a leaf`,
        dest: `CLONE ${name} into the destination route folder, rewire its data`,
      };
    default:
      return {
        source: `verify ${name} is generic and reusable`,
        dest: `reuse or mount ${name} in the destination route`,
      };
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const k of ["sourceEntry", "sourceDir", "destEntry", "destDir"]) {
    if (!args[k]) {
      console.error("Usage: coverage-gate.mjs --sourceEntry <f> --sourceDir <d> --destEntry <f> --destDir <d> [--src src] [--ignore A,B]");
      process.exit(1);
    }
  }
  const srcRootAbs = path.resolve(args.src || "src");
  const ignore = new Set((args.ignore || "").split(",").map((s) => s.trim()).filter(Boolean));

  const srcInv = buildInventory(path.resolve(args.sourceEntry), path.resolve(args.sourceDir), srcRootAbs);
  const dstInv = buildInventory(path.resolve(args.destEntry), path.resolve(args.destDir), srcRootAbs);

  const p0 = []; // missing components
  const p1 = []; // dropped props
  const unverifiable = [];

  for (const [name, rec] of srcInv) {
    if (ignore.has(name)) continue;
    const dst = dstInv.get(name);

    if (!dst) {
      p0.push({ name, rec, fix: fixForMissingComponent(name, rec) });
      continue;
    }
    // component reproduced. prop coverage:
    if (rec.spread) {
      unverifiable.push({ name, reason: "source renders it with {...spread} — source props cannot be enumerated" });
    }
    if (dst.spread) {
      unverifiable.push({ name, reason: "dest renders it with {...spread} — prop coverage cannot be confirmed" });
      continue; // a dest spread may cover any prop; do not flag drops
    }
    for (const prop of rec.props) {
      if (!dst.props.has(prop)) {
        p1.push({ name, prop, srcFiles: [...rec.files], dstFiles: [...dst.files] });
      }
    }
  }

  const line = "─".repeat(72);
  console.log("FIDELITY COVERAGE GATE");
  console.log(line);
  console.log(`Source components: ${srcInv.size}   Dest components: ${dstInv.size}`);
  console.log(`P0 missing components: ${p0.length}   P1 dropped props: ${p1.length}   Unverifiable: ${unverifiable.length}`);
  console.log(line);

  for (const g of p0) {
    console.log(`\nGAP [P0] component not reproduced`);
    console.log(`  Component: ${g.name}  (${g.rec.classification})`);
    console.log(`  Source:    ${[...g.rec.files].join(", ")}`);
    console.log(`  Dest:      MISSING`);
    console.log(`  Fix (source, PROPOSAL — needs approval): ${g.fix.source}`);
    console.log(`  Fix (dest): ${g.fix.dest}`);
  }
  for (const g of p1) {
    console.log(`\nGAP [P1] prop dropped`);
    console.log(`  Component: ${g.name}   Prop: ${g.prop}`);
    console.log(`  Source:    ${g.srcFiles.join(", ")}`);
    console.log(`  Dest:      ${g.dstFiles.join(", ")} (prop absent)`);
    console.log(`  Fix (source, PROPOSAL): if prop drives behavior the dest needs, ensure it is exposed`);
    console.log(`  Fix (dest): pass ${g.prop}={...adapter value} at the ${g.name} call site`);
  }
  if (unverifiable.length) {
    console.log(`\nUNVERIFIABLE (manual check required — NOT counted as covered):`);
    for (const u of unverifiable) console.log(`  - ${u.name}: ${u.reason}`);
  }

  console.log(`\n${line}`);
  if (p0.length || p1.length) {
    console.log("RESULT: FAIL — unreproduced components/props above. Resolve or --ignore explicitly.");
    process.exit(2);
  }
  console.log(unverifiable.length ? "RESULT: PASS (with unverifiable items to confirm manually)" : "RESULT: PASS — full component + prop coverage");
}

main();
