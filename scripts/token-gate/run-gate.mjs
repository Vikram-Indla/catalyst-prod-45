#!/usr/bin/env node
/**
 * Token immunity gate — Goal 4 of CAT-DS-TOKEN-POISON-20260710-001.
 *
 * Real-parser (postcss + TypeScript AST) hard-fail gate over src/.
 * Rules R1..R10, each with stable ID, file:line evidence, one-line remedy.
 *
 * Usage:
 *   node scripts/token-gate/run-gate.mjs               # scan src/, human output
 *   node scripts/token-gate/run-gate.mjs --json        # machine output
 *   node scripts/token-gate/run-gate.mjs --filter=R1,R7
 *   node scripts/token-gate/run-gate.mjs --self-test   # poisoned-fixture proof
 *
 * Exit codes: 0 clean (or all self-test fixtures behave), 1 otherwise.
 */
import fs from 'fs';
import path from 'path';
import url from 'url';
import {
  ADS_VARS, EXTERNAL_PREFIXES, adsCategory, nameCategory, scanModel,
} from '../token-graph/lib.mjs';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FIXTURES = path.join(HERE, 'fixtures');

// ---------- rule catalogue ----------
const RULES = {
  R1: { title: 'App-authored --ds-* declaration', remedy: 'Delete the declaration — --ds-* names are owned by @atlaskit/tokens; alias under --cp-* or use the real ADS token directly.' },
  R2: { title: 'Custom-property dependency cycle', remedy: 'Break the cycle — every alias chain must terminate at a real ADS --ds-* token, never loop back into app tokens.' },
  R3: { title: 'Reference to undefined token', remedy: 'Replace with a token declared in src/ or a real ADS var(--ds-*) token (or delete the dead reference).' },
  R4: { title: 'Duplicate global owner', remedy: 'Keep exactly one global (:root/html/light/dark) declaration file per token; delete the duplicates.' },
  R5: { title: 'Cross-category --ds-* mapping', remedy: 'Point the token at a --ds-* token of the same semantic category (text->color.text*, background->color.background*/elevation.surface*, ...).' },
  R6: { title: 'customColors passed to setGlobalTheme()', remedy: 'Remove the customColors property — theme only via standard ADS color modes.' },
  R7: { title: 'Banned/ambiguous legacy token name', remedy: 'Rename to a semantic --cp-* token aliased 1:1 to an ADS token, then migrate all references.' },
  R8: { title: 'Hard-coded color', remedy: 'Use var(--ds-*) / token() instead — or add an ads-scanner:ignore pragma with a documented justification.' },
  R9: { title: 'Raw typography', remedy: 'Use ADS typography tokens (e.g. font: var(--ds-font-body)) — no numeric fontSize, no app-invented --ds-font-size-*.' },
  R10: { title: 'var(--ds-*) with color fallback', remedy: 'Drop the fallback — token-only: var(--ds-token).' },
  R11: { title: 'Invalid ADS token() call ID', remedy: 'The token() first argument is not a real @atlaskit/tokens id — fix the id (check token-names for the current name) or use a plain literal if no composite token exists.' },
  R12: { title: "Hard-coded color in token's own declared value", remedy: 'The token\'s value should reference a same-category --ds-*/--cp-* token instead of a literal color — or add an ads-scanner:ignore pragma with a documented justification.' },
};
const RULE_IDS = Object.keys(RULES);

const BANNED_NAMES = [
  /^--cp-t[1-4]$/, /^--cp-ink-/, /^--fg-\d+$/, /^--text-\d+$/, /^--bg-\d+$/,
];
const BANNED_EXACT = new Set(['--cp-bg-neutral', '--cp-border-neutral', '--cp-border-neutral-light']);
const isBannedName = (t) => BANNED_EXACT.has(t) || BANNED_NAMES.some((re) => re.test(t));

// ---------- rule evaluation over a scanned model ----------
function evaluate(model) {
  const findings = []; // {rule, file, line, detail}
  const add = (rule, file, line, detail) => findings.push({ rule, file, line, detail });

  const declaredBy = new Map(); // token -> decls
  for (const d of model.decls) {
    if (!declaredBy.has(d.token)) declaredBy.set(d.token, []);
    declaredBy.get(d.token).push(d);
  }
  const runtimeSet = new Set(model.runtimeDecls.filter((r) => r.via !== 'literal').map((r) => r.token));

  // R1 — app-authored --ds-* declarations (CSS decls + TS setProperty/style-object keys)
  for (const d of model.decls) {
    if (d.token.startsWith('--ds-')) add('R1', d.file, d.line, `${d.token} declared in \`${d.selector || d.context}\``);
  }
  for (const r of model.runtimeDecls) {
    if (r.via !== 'literal' && r.token.startsWith('--ds-')) add('R1', r.file, r.line, `${r.token} set via ${r.via}`);
  }

  // R2 — cycles (direct self-refs + Tarjan SCC over decl->ref edges)
  const edges = new Map();
  for (const d of model.decls) {
    if (!edges.has(d.token)) edges.set(d.token, new Set());
    for (const r of d.refs) edges.get(d.token).add(r);
  }
  const seenSelf = new Set();
  for (const d of model.decls) {
    if (d.selfRef && !seenSelf.has(`${d.token}@${d.file}:${d.line}`)) {
      seenSelf.add(`${d.token}@${d.file}:${d.line}`);
      add('R2', d.file, d.line, `${d.token} references itself`);
    }
  }
  {
    const idx = new Map(); const low = new Map(); const onStack = new Set(); const stack = [];
    let counter = 0; const sccs = [];
    const strongconnect = (v) => {
      idx.set(v, counter); low.set(v, counter); counter++;
      stack.push(v); onStack.add(v);
      for (const w of edges.get(v) ?? []) {
        if (!edges.has(w)) continue;
        if (!idx.has(w)) { strongconnect(w); low.set(v, Math.min(low.get(v), low.get(w))); }
        else if (onStack.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
      }
      if (low.get(v) === idx.get(v)) {
        const comp = []; let w;
        do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
        if (comp.length > 1) sccs.push(comp);
      }
    };
    for (const v of edges.keys()) if (!idx.has(v)) strongconnect(v);
    for (const comp of sccs) {
      const first = declaredBy.get(comp[0])?.[0];
      const where = comp.map((t) => { const d = declaredBy.get(t)?.[0]; return d ? `${t} (${d.file}:${d.line})` : t; }).join(' -> ');
      add('R2', first?.file ?? '?', first?.line ?? 0, `cycle: ${where}`);
    }
  }

  // R3 — references to undefined tokens
  const allRefs = new Map(); // token -> [{file,line,via}]
  const addRef = (token, ref) => { if (!allRefs.has(token)) allRefs.set(token, []); allRefs.get(token).push(ref); };
  for (const d of model.decls) for (const r of d.refs) addRef(r, { file: d.file, line: d.line, via: `decl ${d.token}` });
  for (const c of model.consumers) for (const t of c.tokens) addRef(t, { file: c.file, line: c.line, via: `css ${c.prop}` });
  for (const c of model.varRefs) for (const t of c.tokens) addRef(t, { file: c.file, line: c.line, via: 'ts literal' });
  for (const [token, refs] of allRefs) {
    if (declaredBy.has(token)) continue;
    if (ADS_VARS.has(token)) continue;
    if (EXTERNAL_PREFIXES.some((p) => token.startsWith(p))) continue;
    if (runtimeSet.has(token)) continue;
    const sample = refs.slice(0, 3).map((r) => `${r.file}:${r.line}`).join(', ');
    add('R3', refs[0].file, refs[0].line, `${token} referenced ${refs.length}x but never declared (${sample}${refs.length > 3 ? ', ...' : ''})`);
  }

  // R4 — duplicate global owner for --cp-*/--status-* tokens
  for (const [token, decls] of declaredBy) {
    if (!token.startsWith('--cp-') && !token.startsWith('--status-')) continue;
    const globals = decls.filter((d) => d.context !== 'scoped');
    const files = [...new Set(globals.map((d) => d.file))];
    if (files.length > 1) {
      const g = globals[0];
      add('R4', g.file, g.line, `${token} globally declared in ${files.length} files: ${files.join(', ')}`);
    }
  }

  // R5 — cross-category mapping onto a --ds-* token (first ref)
  for (const d of model.decls) {
    if (d.token.startsWith('--ds-')) continue; // already R1
    const dc = nameCategory(d.token);
    if (!dc) continue;
    const first = d.refs[0];
    if (!first || !first.startsWith('--ds-') || first === d.token) continue;
    const rc = adsCategory(ADS_VARS.get(first));
    if (!rc || rc === dc) continue;
    add('R5', d.file, d.line, `${d.token} (${dc}) -> ${first} (${rc})`);
  }

  // R6 — customColors into setGlobalTheme()
  for (const c of model.customThemeCalls) add('R6', c.file, c.line, 'setGlobalTheme({ ..., customColors }) — runtime token bridge');

  // R7 — banned legacy names declared OR referenced
  {
    const seen = new Set();
    const hit = (token, file, line, how) => {
      const key = `${token}@${file}:${line}`;
      if (seen.has(key)) return;
      seen.add(key);
      add('R7', file, line, `${token} ${how}`);
    };
    for (const d of model.decls) {
      if (isBannedName(d.token)) hit(d.token, d.file, d.line, 'declared');
      for (const r of d.refs) if (isBannedName(r)) hit(r, d.file, d.line, `referenced by ${d.token}`);
    }
    for (const c of model.consumers) for (const t of c.tokens) if (isBannedName(t)) hit(t, c.file, c.line, `referenced (${c.prop})`);
    for (const c of model.varRefs) for (const t of c.tokens) if (isBannedName(t)) hit(t, c.file, c.line, 'referenced (ts)');
    for (const r of model.runtimeDecls) if (isBannedName(r.token)) hit(r.token, r.file, r.line, `set via ${r.via}`);
  }

  // R8 — hard-coded colors (CSS color-bearing props + TS style values), pragma-exempt
  for (const h of model.hardcoded) if (!h.ignored) add('R8', h.file, h.line, `${h.prop}: ${h.value}`);
  for (const h of model.styleColors) if (!h.ignored) add('R8', h.file, h.line, `${h.prop}: '${h.value}' (ts)`);

  // R9 — raw typography: numeric fontSize + var(--ds-font-size-*) references
  for (const f of model.fontSizes) if (!f.ignored) add('R9', f.file, f.line, `fontSize: ${f.value}`);
  for (const r of model.dsFontSizeRefs) add('R9', r.file, r.line, `var(${r.token}) — app-invented typography token`);

  // R10 — var(--ds-*, <hex/rgb/hsl fallback>)
  for (const f of model.varColorFallbacks) add('R10', f.file, f.line, `var(${f.token}, ${f.fallback})`);

  // R11 — token('id', fallback) call whose id is not a real @atlaskit/tokens id
  const VALID_TOKEN_IDS = new Set(ADS_VARS.values());
  for (const c of model.tokenCalls || []) {
    if (!VALID_TOKEN_IDS.has(c.tokenId)) add('R11', c.file, c.line, `token('${c.tokenId}', ...) — unknown ADS token id`);
  }

  // R12 — hard-coded color baked into a custom-property's own declared value
  for (const t of model.tokenValueColors || []) {
    if (t.ignored) continue;
    if (EXTERNAL_PREFIXES.some((p) => t.token.startsWith(p))) continue; // e.g. --tw-shadow: 0 0 #0000 is Tailwind's own reset convention
    add('R12', t.file, t.line, `${t.token}: ${t.value}`);
  }

  return findings;
}

// ---------- output ----------
function report(findings, { json, filtered }) {
  const counts = Object.fromEntries(RULE_IDS.map((r) => [r, 0]));
  for (const f of findings) counts[f.rule]++;
  if (json) {
    console.log(JSON.stringify({ ok: findings.length === 0, rules: filtered, counts, total: findings.length, findings }, null, 2));
    return;
  }
  if (!findings.length) {
    console.log(`token-gate: CLEAN (rules: ${filtered.join(',')})`);
    return;
  }
  for (const rule of RULE_IDS) {
    const group = findings.filter((f) => f.rule === rule);
    if (!group.length) continue;
    console.log(`\n${rule} — ${RULES[rule].title} — ${group.length} finding(s)`);
    console.log(`  remedy: ${RULES[rule].remedy}`);
    for (const f of group) console.log(`  ${f.file}:${f.line} — ${f.detail}`);
  }
  console.log(`\ntoken-gate: FAIL — ${findings.length} finding(s) across ${RULE_IDS.filter((r) => counts[r]).length} rule(s)`);
}

// ---------- self-test over poisoned fixtures ----------
const SELF_TESTS = [
  { fixture: 'poisoned/r1.css', rule: 'R1' },
  { fixture: 'poisoned/r2.css', rule: 'R2' },
  { fixture: 'poisoned/r3.css', rule: 'R3' },
  { fixture: 'poisoned/r4', rule: 'R4' },
  { fixture: 'poisoned/r5.css', rule: 'R5' },
  { fixture: 'poisoned/r6.ts', rule: 'R6' },
  { fixture: 'poisoned/r7.css', rule: 'R7' },
  { fixture: 'poisoned/r8.css', rule: 'R8' },
  { fixture: 'poisoned/r9.ts', rule: 'R9' },
  { fixture: 'poisoned/r10.css', rule: 'R10' },
  { fixture: 'poisoned/r11.ts', rule: 'R11' },
  { fixture: 'poisoned/r12.css', rule: 'R12' },
  { fixture: 'clean', rule: null },
];

function selfTest() {
  let ok = true;
  for (const t of SELF_TESTS) {
    const p = path.join(FIXTURES, t.fixture);
    if (!fs.existsSync(p)) { console.log(`MISSING  ${t.fixture}`); ok = false; continue; }
    const model = scanModel([p], ROOT);
    const findings = evaluate(model);
    const fired = new Set(findings.map((f) => f.rule));
    if (t.rule === null) {
      const pass = findings.length === 0;
      ok = ok && pass;
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${t.fixture.padEnd(18)} expected: no findings   got: ${findings.length ? [...fired].join(',') : 'none'}`);
      if (!pass) for (const f of findings) console.log(`        unexpected ${f.rule} ${f.file}:${f.line} — ${f.detail}`);
    } else {
      const pass = fired.has(t.rule);
      ok = ok && pass;
      const evidence = findings.filter((f) => f.rule === t.rule)[0];
      console.log(`${pass ? 'PASS' : 'FAIL'}  ${t.fixture.padEnd(18)} expected: ${t.rule.padEnd(4)} fired: ${[...fired].join(',') || 'none'}${evidence ? `   (${evidence.file}:${evidence.line})` : ''}`);
    }
  }
  console.log(ok ? '\nself-test: ALL FIXTURES BEHAVE — gate is armed' : '\nself-test: FAILURES — gate is NOT trustworthy');
  return ok;
}

// ---------- CLI ----------
const args = process.argv.slice(2);
const json = args.includes('--json');
const filterArg = args.find((a) => a.startsWith('--filter='));
const filtered = filterArg
  ? filterArg.slice('--filter='.length).split(',').map((s) => s.trim().toUpperCase()).filter((r) => RULE_IDS.includes(r))
  : RULE_IDS;

if (args.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

const srcDir = path.join(ROOT, 'src');
const model = scanModel([srcDir], ROOT);
const findings = evaluate(model).filter((f) => filtered.includes(f.rule));
report(findings, { json, filtered });
process.exit(findings.length ? 1 : 0);
