#!/usr/bin/env node
/**
 * Computed-style diff  (C5, part 2)
 *
 * Diffs two measurement blobs produced by probe-styles.js (source route vs
 * target route) and reports per-selector, per-property deltas. This replaces the
 * unenforceable manual "pixel parity checkbox" list with an objective diff.
 *
 * px properties tolerate a small delta (--tol, default 1). Colors / weights /
 * transforms must match exactly. Missing selector or count mismatch is flagged.
 *
 * Exit codes: 0 = within tolerance, 2 = mismatches, 1 = bad usage.
 *
 * Usage:
 *   node .../style-diff.mjs --source source.json --dest dest.json \
 *        [--tol 1] [--ignore width,height,x,y]
 */
import fs from "fs";

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

const PX_PROP = /^(fontSize|lineHeight|letterSpacing|padding|margin|border.*Width|borderRadius|width|height|gap)/;

function pxVal(v) {
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v).trim());
  return m ? parseFloat(m[1]) : null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source || !args.dest) {
    console.error("Usage: style-diff.mjs --source <a.json> --dest <b.json> [--tol 1] [--ignore p1,p2]");
    process.exit(1);
  }
  const tol = args.tol != null ? parseFloat(args.tol) : 1;
  const ignore = new Set((args.ignore || "").split(",").map((s) => s.trim()).filter(Boolean));

  const src = JSON.parse(fs.readFileSync(args.source, "utf8"));
  const dst = JSON.parse(fs.readFileSync(args.dest, "utf8"));

  const dstBySel = new Map(dst.results.map((r) => [r.selector, r]));
  const gaps = [];

  for (const sRes of src.results) {
    const dRes = dstBySel.get(sRes.selector);
    if (!dRes) {
      gaps.push({ sel: sRes.selector, kind: "SELECTOR-MISSING", detail: "not measured on target" });
      continue;
    }
    if (sRes.count !== dRes.count) {
      gaps.push({ sel: sRes.selector, kind: "COUNT", detail: `source ${sRes.count} vs target ${dRes.count}` });
    }
    const n = Math.min(sRes.samples.length, dRes.samples.length);
    for (let i = 0; i < n; i++) {
      const sStyles = sRes.samples[i].styles || {};
      const dStyles = dRes.samples[i].styles || {};
      for (const prop of Object.keys(sStyles)) {
        if (ignore.has(prop)) continue;
        const sv = sStyles[prop], dv = dStyles[prop];
        if (sv === dv) continue;
        if (PX_PROP.test(prop)) {
          const a = pxVal(sv), b = pxVal(dv);
          if (a != null && b != null && Math.abs(a - b) <= tol) continue;
        }
        gaps.push({ sel: sRes.selector, kind: "STYLE", detail: `[#${i}] ${prop}: source "${sv}" vs target "${dv}"` });
      }
    }
  }

  console.log("COMPUTED-STYLE DIFF");
  console.log(`Source: ${src.url || args.source}`);
  console.log(`Target: ${dst.url || args.dest}`);
  console.log(`px tolerance: ${tol}   Mismatches: ${gaps.length}`);
  console.log("─".repeat(72));
  for (const g of gaps) console.log(`[${g.kind}] ${g.sel}  ${g.detail}`);

  if (gaps.length) {
    console.log("\nRESULT: FAIL — target diverges from source. Fix the TARGET only.");
    process.exit(2);
  }
  console.log("\nRESULT: PASS — computed styles within tolerance.");
}

main();
