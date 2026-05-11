#!/usr/bin/env node
/**
 * download-avatars.mjs — populate src/assets/avatars/ from a name list.
 *
 * Usage:
 *   node scripts/download-avatars.mjs              # reads names from scripts/avatar-names.txt
 *   node scripts/download-avatars.mjs alice bob    # reads names from argv
 *   echo "Dr. Ahmed Al-Rashid" | node scripts/download-avatars.mjs -  # reads names from stdin
 *
 * Generates deterministic DiceBear avataaars (one per slug) so repeated runs are idempotent.
 * DiceBear renders synthetic illustrations — not real identities — avoiding PII concerns.
 * Skips files that already exist so partial runs resume cheaply.
 *
 * External source: https://api.dicebear.com/9.x/avataaars/png?seed=<slug>
 * Output: src/assets/avatars/<slug>.png
 *
 * After running, the resolver in src/lib/avatars.ts auto-discovers the files
 * via `import.meta.glob` — no manifest edit required.
 */

import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AVATARS_DIR = resolve(__dirname, '..', 'src', 'assets', 'avatars');
const DEFAULT_NAMES_FILE = resolve(__dirname, 'avatar-names.txt');
const DICEBEAR_ENDPOINT = 'https://api.dicebear.com/9.x/avataaars/png';
const AVATAR_SIZE = 256;

function slugifyName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readNamesFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function resolveNameList() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    if (!(await fileExists(DEFAULT_NAMES_FILE))) {
      console.error(
        `No names provided. Pass names as argv, pipe via stdin with "-", ` +
          `or create ${DEFAULT_NAMES_FILE} (one name per line).`,
      );
      process.exit(1);
    }
    const text = await readFile(DEFAULT_NAMES_FILE, 'utf8');
    return text.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (args.length === 1 && args[0] === '-') {
    const text = await readNamesFromStdin();
    return text.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return args;
}

async function downloadOne(name) {
  const slug = slugifyName(name);
  if (!slug) return { name, slug, status: 'skipped', reason: 'empty slug' };
  const outPath = resolve(AVATARS_DIR, `${slug}.png`);
  if (await fileExists(outPath)) {
    return { name, slug, status: 'exists' };
  }
  const url = `${DICEBEAR_ENDPOINT}?seed=${encodeURIComponent(slug)}&size=${AVATAR_SIZE}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { name, slug, status: 'failed', reason: `HTTP ${res.status}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return { name, slug, status: 'downloaded' };
}

async function main() {
  await mkdir(AVATARS_DIR, { recursive: true });
  const names = await resolveNameList();
  if (names.length === 0) {
    console.error('No names to process.');
    process.exit(1);
  }
  console.log(`Processing ${names.length} name(s) → ${AVATARS_DIR}`);

  const results = [];
  for (const name of names) {
    try {
      results.push(await downloadOne(name));
    } catch (err) {
      results.push({ name, slug: slugifyName(name), status: 'failed', reason: String(err) });
    }
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log('Summary:', counts);
  const failures = results.filter((r) => r.status === 'failed');
  if (failures.length > 0) {
    console.error('Failures:');
    for (const f of failures) console.error(`  ${f.name} (${f.slug}): ${f.reason}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
