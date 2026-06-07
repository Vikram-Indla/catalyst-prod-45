import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const idx = JSON.parse(readFileSync('/tmp/sb-catalyst/index.json', 'utf8'));
const ids = Object.values(idx.entries).filter(e => e.type === 'story').map(e => e.id);
const browser = await chromium.launch();
const failures = [];
for (const id of ids) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  try {
    await page.goto(`http://localhost:9012/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(700);
    // Real error signal: body has sb-show-errordisplay class, OR pageerror fired
    const shown = await page.$('body.sb-show-errordisplay');
    if (errors.length || shown) failures.push({ id, errors: errors.slice(0,1) });
  } catch (e) {
    failures.push({ id, errors: [e.message.slice(0,100)] });
  }
  await page.close();
}
await browser.close();
console.log('FAILURES:', failures.length);
for (const f of failures) console.log('✖', f.id, '|', f.errors.join(''));
