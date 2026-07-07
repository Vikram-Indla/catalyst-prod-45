#!/usr/bin/env node

/**
 * CATALYST UI-FIXES — Export a Playwright storageState from a logged-in session
 *
 * Opens a real (headed) browser at the app. You log in normally. As soon as the
 * session token appears in localStorage, it saves a Playwright storageState JSON
 * (cookies + localStorage for the origin) to a GITIGNORED path, then closes.
 *
 * The saved file lets `route-visual-a11y-gate.cjs --auth=<file>` sweep the
 * auth-gated app without anyone copying the token by hand.
 *
 * Usage:
 *   node scripts/export-auth-state.cjs                     # -> .auth/storageState.json
 *   node scripts/export-auth-state.cjs --base=http://localhost:8080 --out=.auth/storageState.json
 *
 * Then:
 *   node scripts/route-visual-a11y-gate.cjs --all --auth=.auth/storageState.json
 *
 * SECURITY: the output contains a live session token. It is written under
 * .auth/ (gitignored). Do not commit it. Delete it when done.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
function arg(name, def) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
}
const BASE = arg('base', 'http://localhost:8080').replace(/\/$/, '');
const OUT = path.resolve(REPO_ROOT, arg('out', '.auth/storageState.json'));
const TOKEN_KEY = arg('token-key', 'catalyst-auth-token');

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch { console.error('playwright not installed. Run `npm i` and `npx playwright install chromium`.'); process.exit(1); }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(`Opening ${BASE} — log in normally. Waiting for localStorage['${TOKEN_KEY}']…`);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  const deadlineMs = 5 * 60 * 1000;
  const start = Date.now();
  let authed = false;
  while (Date.now() - start < deadlineMs) {
    try {
      const tok = await page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY);
      if (tok) { authed = true; break; }
    } catch { /* navigating */ }
    await page.waitForTimeout(1000);
  }

  if (!authed) {
    console.error('Timed out waiting for login (5 min). Nothing saved.');
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: OUT });
  await browser.close();
  console.log(`Saved storageState -> ${path.relative(REPO_ROOT, OUT)} (gitignored). Do not commit it.`);
  console.log(`Run the sweep: node scripts/route-visual-a11y-gate.cjs --all --auth=${path.relative(REPO_ROOT, OUT)}`);
}

main().catch((e) => { console.error('export-auth-state: fatal', e); process.exit(1); });
