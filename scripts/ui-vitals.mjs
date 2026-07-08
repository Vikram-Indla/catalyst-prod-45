#!/usr/bin/env node
/**
 * ui-vitals — Lighthouse-for-design. Probes rendered pages against the
 * RUTHLESS UI AUDIT RUBRIC (design-governance/RUTHLESS_UI_AUDIT_RUBRIC.md)
 * and emits measured metrics + hard-fail flags per route.
 *
 * Measures OUTCOMES (computed styles, DOM geometry), not source code —
 * complements the grep-based gates which measure inputs.
 *
 * Usage:
 *   node scripts/ui-vitals.mjs                       # default route set
 *   node scripts/ui-vitals.mjs /release-hub/changes  # specific route(s)
 *   UI_VITALS_BASE=http://localhost:8080 node scripts/ui-vitals.mjs
 *
 * Output: design-governance/ui-vitals.json (one entry per route) +
 * console table. Exit 1 if any route trips a hard-fail (HF1/HF2/HF5).
 *
 * Auth: reuses a persistent storage state at .ui-vitals-auth.json when
 * present (create by running with UI_VITALS_HEADED=1 once and signing in).
 */
import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'node:fs';

const BASE = process.env.UI_VITALS_BASE ?? 'http://localhost:8080';
const AUTH_STATE = '.ui-vitals-auth.json';

const DEFAULT_ROUTES = [
  '/for-you',
  '/release-hub/overview',
  '/release-hub/changes',
  '/release-hub/releases-management',
  '/release-hub/execution',
  '/release-hub/calendar',
  '/release-hub/sign-off-queue',
  '/incident-hub/all-incidents',
  '/testhub/dashboard',
];

const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES;

// The probe — same metrics contract as the audit workflow (2026-07-08).
// sr-only/clipped elements are excluded from the font-size histogram so
// Atlaskit's visually-hidden labels don't trip HF1 mechanically.
const PROBE = () => {
  const vw = innerWidth, vh = innerHeight;
  const els = [...document.querySelectorAll('body *')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.top < vh && r.bottom > 0;
  });
  const cs = els.map((e) => getComputedStyle(e));
  const px = (v) => parseFloat(v) || 0;

  const fs = {};
  els.forEach((e, i) => {
    if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
    const r = e.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return; // clipped sr-only
    if (cs[i].clip === 'rect(0px, 0px, 0px, 0px)' || cs[i].clipPath === 'inset(50%)') return;
    const s = Math.round(px(cs[i].fontSize));
    if (s > 0) fs[s] = (fs[s] || 0) + 1;
  });

  const tc = new Set();
  els.forEach((e, i) => {
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) tc.add(cs[i].color);
  });

  const hues = new Set();
  const addHue = (c) => {
    const m = c?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return;
    const [r, g, b] = [+m[1], +m[2], +m[3]];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx === 0 || (mx - mn) / mx < 0.15) return;
    let h;
    if (mx === mn) h = 0;
    else if (mx === r) h = (60 * (g - b) / (mx - mn) + 360) % 360;
    else if (mx === g) h = 60 * (b - r) / (mx - mn) + 120;
    else h = 60 * (r - g) / (mx - mn) + 240;
    hues.add(Math.round(h / 30) * 30);
  };
  cs.forEach((s) => { addHue(s.color); addHue(s.backgroundColor); addHue(s.borderTopColor); });

  const sp = {};
  cs.forEach((s) => ['gap', 'paddingTop', 'paddingLeft', 'paddingBottom', 'paddingRight'].forEach((p) => {
    const v = Math.round(px(s[p]));
    if (v > 0) sp[v] = (sp[v] || 0) + 1;
  }));
  const offGrid = Object.keys(sp).map(Number).filter((v) => ![0, 1, 2, 4, 8, 12, 16, 24, 32, 40, 48].includes(v));

  const main = document.querySelector('main') || document.body;
  let maxBottom = 0;
  [...main.querySelectorAll('*')].forEach((e) => {
    const r = e.getBoundingClientRect();
    if (r.height > 2 && r.width > 2 && r.top < vh) maxBottom = Math.max(maxBottom, Math.min(r.bottom, vh));
  });

  const radii = new Set();
  cs.forEach((s) => { const r = px(s.borderTopLeftRadius); if (r > 0 && r < 100) radii.add(r); });

  return {
    viewport: [vw, vh],
    fontSizes: fs,
    textColors: tc.size,
    nonNeutralHues: [...hues].sort((a, b) => a - b),
    offGridSpacing: offGrid.sort((a, b) => a - b),
    contentBottomPct: Math.round((maxBottom / vh) * 100),
    radii: [...radii].sort((a, b) => a - b),
    rowsVisible: document.querySelectorAll('tbody tr, [role=row]').length,
    hasHScroll: document.body.scrollWidth > vw + 2,
  };
};

function hardFails(m) {
  const hf = [];
  const tiny = Object.keys(m.fontSizes).map(Number).filter((s) => s < 11);
  if (tiny.length) hf.push(`HF1: visible text at ${tiny.join(',')}px (${tiny.reduce((a, s) => a + m.fontSizes[s], 0)} els)`);
  if (m.nonNeutralHues.length > 8) hf.push(`HF2: ${m.nonNeutralHues.length} non-neutral hues`);
  if (m.hasHScroll) hf.push('HF5: horizontal scrollbar on body');
  return hf;
}

const browser = await chromium.launch({ headless: process.env.UI_VITALS_HEADED !== '1' });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  ...(existsSync(AUTH_STATE) ? { storageState: AUTH_STATE } : {}),
});
const page = await ctx.newPage();

// Headed bootstrap: no auth state yet → give the operator time to sign in,
// then persist the session for future headless runs.
if (process.env.UI_VITALS_HEADED === '1' && !existsSync(AUTH_STATE)) {
  await page.goto(BASE + '/auth', { waitUntil: 'networkidle' });
  console.log('Sign in in the opened browser window. Waiting up to 3 minutes…');
  await page.waitForURL((u) => !String(u).includes('/auth'), { timeout: 180_000 });
  await ctx.storageState({ path: AUTH_STATE });
  console.log(`Auth state saved to ${AUTH_STATE} — future headless runs will reuse it.`);
}

const results = [];
for (const route of routes) {
  try {
    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(1500);
    // A redirect to /auth means the session is missing/expired. Reporting
    // metrics from the sign-in page would be a silent false positive — the
    // exact failure mode this tool exists to prevent. Hard-error instead.
    if (page.url().includes('/auth')) {
      throw new Error(`redirected to sign-in — run once with UI_VITALS_HEADED=1 to mint ${AUTH_STATE}`);
    }
    const metrics = await page.evaluate(PROBE);
    const hf = hardFails(metrics);
    results.push({ route, metrics, hardFails: hf });
    console.log(`${hf.length ? '❌' : '✅'} ${route}  content=${metrics.contentBottomPct}%  hues=${metrics.nonNeutralHues.length}  fontBuckets=${Object.keys(metrics.fontSizes).length}  offGrid=[${metrics.offGridSpacing}]${hf.length ? '\n   ' + hf.join('\n   ') : ''}`);
  } catch (err) {
    results.push({ route, error: String(err) });
    console.log(`⚠️  ${route}  probe failed: ${err.message ?? err}`);
  }
}

await browser.close();
writeFileSync('design-governance/ui-vitals.json', JSON.stringify({ base: BASE, generatedBy: 'scripts/ui-vitals.mjs', results }, null, 2));
console.log(`\nwrote design-governance/ui-vitals.json (${results.length} routes)`);
process.exit(results.some((r) => r.hardFails?.length) ? 1 : 0);
