#!/usr/bin/env node
/**
 * Dependency Graph Resolver  (C1)
 *
 * Given a route entry file, walk the import graph and classify every imported
 * module + every rendered component. Recurses ONLY into route-local files
 * (files under the route folder) to compute the route-local closure. Shared /
 * @atlaskit / external modules are recorded but NOT recursed — those get mounted,
 * never cloned.
 *
 * Output: JSON to stdout.
 *   {
 *     entry, routeDir,
 *     localFiles: [paths...],                       // the clone-this closure
 *     components: [                                  // every rendered JSX component
 *       { name, importedFrom, resolved, classification, usedIn:[file...] }
 *     ],
 *     unresolved: [ {name, specifier, file} ]        // imports we could not resolve
 *   }
 *
 * Classification:
 *   route-local  -> resolved file under routeDir          (CLONE these leaves)
 *   shared       -> resolved file under src/ outside routeDir (MOUNT via adapter)
 *   atlaskit     -> specifier starts with @atlaskit/       (MOUNT, never replace)
 *   external     -> any other node_modules specifier       (reuse as-is)
 *
 * Usage:
 *   node .../resolve-graph.mjs --entry src/pages/project-hub/ProjectHub.tsx \
 *                              --routeDir src/pages/project-hub \
 *                              [--src src]
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

function resolveSpecifier(spec, fromFile, srcRoot) {
  // alias  @/foo  ->  <srcRoot>/foo
  let base = null;
  if (spec.startsWith("@/")) {
    base = path.join(srcRoot, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return { kind: "external", resolved: null }; // bare specifier = node_modules
  }

  // try direct file, then with extensions, then /index
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return { kind: "file", resolved: path.resolve(c) };
    }
  }
  return { kind: "unresolved", resolved: null };
}

function classify(resolved, specifier, routeDirAbs, srcRootAbs) {
  if (specifier.startsWith("@atlaskit/")) return "atlaskit";
  if (!resolved) return "external";
  if (resolved.startsWith(routeDirAbs + path.sep)) return "route-local";
  if (resolved.startsWith(srcRootAbs + path.sep)) return "shared";
  return "external";
}

function readSource(file) {
  const text = fs.readFileSync(file, "utf8");
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

// Collect JSX tag names used in a source file (top-level identifier only,
// e.g. <Foo>, <Foo.Bar> -> "Foo").
function collectJsxTags(sf) {
  const tags = new Set();
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      let tag = node.tagName;
      while (ts.isPropertyAccessExpression(tag)) tag = tag.expression;
      if (ts.isIdentifier(tag)) tags.add(tag.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return tags;
}

// Collect imports: [{ name, specifier }]  (named + default; ignore type-only)
function collectImports(sf) {
  const imports = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      if (node.importClause.isTypeOnly) return; // skip `import type`
      const spec = node.moduleSpecifier.text;
      const clause = node.importClause;
      if (clause.name) imports.push({ name: clause.name.text, specifier: spec });
      const nb = clause.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) {
          if (el.isTypeOnly) continue;
          imports.push({ name: el.name.text, specifier: spec });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return imports;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.entry || !args.routeDir) {
    console.error("Usage: resolve-graph.mjs --entry <file> --routeDir <dir> [--src src]");
    process.exit(1);
  }
  const srcRoot = args.src || "src";
  const srcRootAbs = path.resolve(srcRoot);
  const routeDirAbs = path.resolve(args.routeDir);
  const entryAbs = path.resolve(args.entry);

  if (!fs.existsSync(entryAbs)) {
    console.error(`Entry not found: ${entryAbs}`);
    process.exit(1);
  }

  const localFiles = new Set();
  const componentMap = new Map(); // name -> { name, importedFrom, resolved, classification, usedIn:Set }
  const unresolved = [];
  const queue = [entryAbs];
  const seen = new Set();

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fs.existsSync(file)) continue;

    localFiles.add(path.relative(process.cwd(), file));
    const sf = readSource(file);
    const tags = collectJsxTags(sf);
    const imports = collectImports(sf);

    for (const imp of imports) {
      const r = resolveSpecifier(imp.specifier, file, srcRootAbs);
      if (r.kind === "unresolved") {
        unresolved.push({ name: imp.name, specifier: imp.specifier, file: path.relative(process.cwd(), file) });
      }
      const cls = classify(r.resolved, imp.specifier, routeDirAbs, srcRootAbs);

      // recurse only into route-local files (the clone closure)
      if (cls === "route-local" && r.resolved && !seen.has(r.resolved)) {
        queue.push(r.resolved);
      }

      // record a component only if the imported identifier is actually rendered as JSX
      if (tags.has(imp.name)) {
        const key = imp.name + "@" + imp.specifier;
        if (!componentMap.has(key)) {
          componentMap.set(key, {
            name: imp.name,
            importedFrom: imp.specifier,
            resolved: r.resolved ? path.relative(process.cwd(), r.resolved) : null,
            classification: cls,
            usedIn: new Set(),
          });
        }
        componentMap.get(key).usedIn.add(path.relative(process.cwd(), file));
      }
    }
  }

  const components = [...componentMap.values()]
    .map((c) => ({ ...c, usedIn: [...c.usedIn] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    entry: path.relative(process.cwd(), entryAbs),
    routeDir: path.relative(process.cwd(), routeDirAbs),
    localFiles: [...localFiles].sort(),
    components,
    unresolved,
    summary: {
      localFiles: localFiles.size,
      components: components.length,
      routeLocal: components.filter((c) => c.classification === "route-local").length,
      shared: components.filter((c) => c.classification === "shared").length,
      atlaskit: components.filter((c) => c.classification === "atlaskit").length,
      external: components.filter((c) => c.classification === "external").length,
      unresolved: unresolved.length,
    },
  };

  console.log(JSON.stringify(out, null, 2));
}

main();
