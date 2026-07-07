#!/usr/bin/env node

/**
 * CATALYST UI-FIXES — Live Route Visual / A11y / Contrast Gate
 * Contract: docs/acceptance/ui-fixes-acceptance-criteria.md §1(#12), §5.2-5.3, §5.8, §8
 *
 * Drives the RUNNING Catalyst app (default http://localhost:8080) with
 * Playwright — the real app shell, not Storybook (blindspot #12). For each
 * route × theme it:
 *   • forces the theme via localStorage 'catalyst-theme' (light|dark) before
 *     boot, so the ThemeProvider applies it with no flash;
 *   • runs @axe-core/playwright (WCAG 2.1 AA)               [unless --only=contrast]
 *   • computes alpha-composited WCAG contrast for every visible text node
 *     against its effective background                       [unless --only=a11y]
 *   • saves a screenshot to docs/reports/ui-fixes/screenshots/.
 *
 * Emits docs/reports/ui-fixes/02-dom-css-contrast-report.json.
 *
 * Usage:
 *   node scripts/route-visual-a11y-gate.cjs                        # smoke: /for-you, dark+light
 *   node scripts/route-visual-a11y-gate.cjs --routes=/for-you,/backlog
 *   node scripts/route-visual-a11y-gate.cjs --all                  # every static route from inventory
 *   node scripts/route-visual-a11y-gate.cjs --themes=dark          # one theme
 *   node scripts/route-visual-a11y-gate.cjs --base=http://localhost:8080
 *   node scripts/route-visual-a11y-gate.cjs --only=contrast|a11y
 *   node scripts/route-visual-a11y-gate.cjs --strict               # exit 1 on any violation
 *
 * Exit codes:
 *   0 - completed (report written). With --strict: no violations.
 *   1 - dev server unreachable, Playwright missing, or (--strict) violations found.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INVENTORY = path.join(REPO_ROOT, 'docs/reports/ui-fixes/00-route-inventory.generated.json');
const SHOT_DIR = path.join(REPO_ROOT, 'docs/reports/ui-fixes/screenshots');
const OUT = path.join(REPO_ROOT, 'docs/reports/ui-fixes/02-dom-css-contrast-report.json');

function arg(name, def) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
}
const has = (f) => process.argv.slice(2).includes(`--${f}`);

const BASE = arg('base', 'http://localhost:8080').replace(/\/$/, '');
const ONLY = arg('only', 'both'); // both | contrast | a11y
const THEMES = arg('themes', 'dark,light').split(',').map((s) => s.trim()).filter(Boolean);
const STRICT = has('strict');
// Playwright storageState JSON (cookies + localStorage) exported from a
// logged-in session — required to reach the auth-gated app. Without it every
// route renders the login page. Build one with: node scripts/export-auth-state.cjs
const AUTH = arg('auth', null);

function resolveRoutes() {
  const explicit = arg('routes', null);
  if (explicit) return explicit.split(',').map((s) => s.trim()).filter(Boolean);
  if (has('all')) {
    if (!fs.existsSync(INVENTORY)) {
      console.error('--all: run `node scripts/route-inventory.cjs` first to generate the inventory.');
      process.exit(1);
    }
    const inv = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
    // Static, browsable routes only. Dynamic (:param) routes need a seed map
    // (future --seed) so they are skipped here and logged as coverage gaps.
    return inv.routes
      .filter((r) => r.type === 'absolute' && !r.path.includes('*') && !r.path.includes('('))
      .map((r) => r.path);
  }
  return ['/for-you']; // smoke default
}

// In-page: alpha-composited WCAG contrast for visible text nodes.
const CONTRAST_FN = `(() => {
  const rgb = s => { const m = s && s.match(/[\\d.]+/g); return m ? m.slice(0,4).map(Number) : null; };
  const comp = (fg,bg) => { const a = fg[3]===undefined?1:fg[3]; return [0,1,2].map(i=>Math.round(fg[i]*a+bg[i]*(1-a))); };
  const lum = ([r,g,b]) => { const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;}); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; };
  const ratio = (f,b) => { const L1=lum(f),L2=lum(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
  const effBg = el => { let e=el; while(e){ const c=getComputedStyle(e).backgroundColor; if(c&&c!=='rgba(0, 0, 0, 0)'&&c!=='transparent'){ const p=rgb(c); if(p&&(p[3]===undefined||p[3]>0.5)) return p.slice(0,3);} e=e.parentElement;} return [255,255,255]; };
  const out=[]; const seen=new Set();
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n;
  while((n=walker.nextNode())){
    const t=n.textContent.trim(); if(!t||t.length<2) continue;
    const el=n.parentElement; if(!el) continue;
    const r=el.getBoundingClientRect(); if(r.width<1||r.height<1) continue;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.opacity==='0') continue;
    const k=el.tagName+':'+t.slice(0,24); if(seen.has(k)) continue; seen.add(k);
    const fs=parseFloat(cs.fontSize); const fw=parseInt(cs.fontWeight)||400;
    const large = fs>=24 || (fs>=18.66 && fw>=700);
    const fg=rgb(cs.color); if(!fg) continue; const bg=effBg(el);
    const cr=ratio(comp(fg,bg),bg); const min=large?3:4.5;
    out.push({ text:t.slice(0,40), fontSize:fs, weight:fw, color:cs.color, bg:'rgb('+bg+')', contrast:+cr.toFixed(2), min, pass: cr>=min, large });
  }
  return out;
})()`;

async function healthcheck() {
  try {
    const res = await fetch(BASE + '/', { method: 'GET' });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await healthcheck())) {
    console.error(`route-visual-a11y-gate: dev server not reachable at ${BASE}. Start it (npm run dev) and retry.`);
    process.exit(1);
  }

  let chromium, AxeBuilder;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('route-visual-a11y-gate: `playwright` not installed. Run `npm i` and `npx playwright install chromium`.');
    process.exit(1);
  }
  if (ONLY !== 'contrast') {
    try {
      ({ default: AxeBuilder } = require('@axe-core/playwright'));
    } catch {
      try { AxeBuilder = require('@axe-core/playwright').AxeBuilder; } catch { AxeBuilder = null; }
    }
  }

  const routes = resolveRoutes();
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const report = { base: BASE, only: ONLY, themes: THEMES, generatedRoutes: routes.length, results: [] };
  let violationCount = 0;

  if (AUTH && !fs.existsSync(AUTH)) {
    console.error(`--auth: storageState file not found at ${AUTH}. Build one: node scripts/export-auth-state.cjs`);
    process.exit(1);
  }
  if (!AUTH) {
    console.warn('WARNING: no --auth storageState given — auth-gated routes will render the login page. Build one: node scripts/export-auth-state.cjs');
  }

  const browser = await chromium.launch();
  try {
    for (const route of routes) {
      for (const theme of THEMES) {
        const ctxOpts = { viewport: { width: 1440, height: 900 } };
        if (AUTH) ctxOpts.storageState = AUTH;
        const context = await browser.newContext(ctxOpts);
        await context.addInitScript((t) => {
          try { localStorage.setItem('catalyst-theme', t); } catch {}
        }, theme);
        const page = await context.newPage();
        const entry = { route, theme, url: BASE + route };
        try {
          const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
          entry.status = resp ? resp.status() : null;
          await page.waitForTimeout(700);
          entry.actualTheme = await page.evaluate(() => ({
            htmlClass: document.documentElement.className,
            colorMode: document.documentElement.getAttribute('data-color-mode'),
          }));
          entry.blank = await page.evaluate(() => document.body.innerText.trim().length < 20);

          if (ONLY !== 'a11y') {
            const nodes = await page.evaluate(CONTRAST_FN);
            const fails = nodes.filter((n) => !n.pass);
            entry.contrast = { checked: nodes.length, failures: fails.length, worst: fails.slice(0, 15) };
            violationCount += fails.length;
          }
          if (ONLY !== 'contrast' && AxeBuilder) {
            try {
              const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
              const serious = axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
              entry.axe = {
                total: axe.violations.length,
                serious: serious.length,
                ids: serious.map((v) => `${v.id}(${v.nodes.length})`),
              };
              violationCount += serious.length;
            } catch (e) {
              entry.axe = { error: String(e).slice(0, 160) };
            }
          }
          const safe = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
          const shot = path.join(SHOT_DIR, `${safe}__${theme}.png`);
          await page.screenshot({ path: shot, fullPage: false });
          entry.screenshot = path.relative(REPO_ROOT, shot);
          console.log(
            `${route}  [${theme}]  status=${entry.status}` +
              (entry.contrast ? `  contrast:${entry.contrast.failures}/${entry.contrast.checked} fail` : '') +
              (entry.axe && entry.axe.serious != null ? `  axe-serious:${entry.axe.serious}` : '') +
              (entry.blank ? '  BLANK!' : '')
          );
        } catch (e) {
          entry.error = String(e).slice(0, 200);
          console.log(`${route}  [${theme}]  ERROR ${entry.error}`);
        }
        report.results.push(entry);
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`\nroute-visual-a11y-gate: wrote ${path.relative(REPO_ROOT, OUT)}  (${report.results.length} route×theme runs, ${violationCount} violation signals)`);

  if (STRICT && violationCount > 0) {
    console.error(`--strict: ${violationCount} violation(s) found.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('route-visual-a11y-gate: fatal', e);
  process.exit(1);
});
