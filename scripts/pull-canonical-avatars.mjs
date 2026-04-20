#!/usr/bin/env node
/**
 * pull-canonical-avatars.mjs — Fetch canonical face avatars from Supabase
 * and store locally under src/assets/avatars/<slug>.<ext> so the resolver
 * at src/lib/avatars.ts can pick them up at build time.
 *
 * Source of truth: the `profiles` table — `full_name` + `avatar_url` columns.
 * Many avatar_urls point at Gravatar with an Atlassian-initials `d=` fallback
 * (e.g. https://secure.gravatar.com/avatar/<hash>?d=...initials%2FAA-6.png) —
 * fetching these returns either a real face (if Gravatar registered) or the
 * Atlassian-initials PNG. Either way the result is canonical and consistent,
 * which is the point: every surface in Catalyst renders the same image for
 * the same person. This is the mechanism the user was missing when they
 * reported "Nada's avatar is inconsistent".
 *
 * Usage:
 *   node scripts/pull-canonical-avatars.mjs              # download missing
 *   node scripts/pull-canonical-avatars.mjs --force      # re-download all
 *   node scripts/pull-canonical-avatars.mjs --dry-run    # list without downloading
 *
 * Output: src/assets/avatars/<slug>.png (PNG even if source is JPG — the
 * resolver glob matches any of png/jpg/jpeg/webp so this is for consistency).
 *
 * The resolver at src/lib/avatars.ts auto-discovers files via `import.meta.glob`
 * — no manifest edit required after running.
 *
 * CLAUDE.md §19 compliance: this is a BUILD-time pull. At runtime the site
 * never touches an external avatar URL. External URLs remain banned for
 * runtime rendering.
 */

import { mkdir, writeFile, access, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AVATARS_DIR = resolve(ROOT, 'src', 'assets', 'avatars');
const ENV_FILE = resolve(ROOT, '.env');

const FORCE = process.argv.includes('--force');
const DRY = process.argv.includes('--dry-run');

// ── Load env ───────────────────────────────────────────────────────────
async function loadEnv() {
  const text = await readFile(ENV_FILE, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

function slugifyName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function downloadOne({ name, slug, url }) {
  const outPath = resolve(AVATARS_DIR, `${slug}.png`);
  if (!FORCE && (await fileExists(outPath))) {
    return { name, slug, status: 'exists', outPath };
  }
  if (DRY) return { name, slug, status: 'would-download', url };

  const res = await fetch(url, {
    headers: { 'User-Agent': 'catalyst-avatar-sync/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) return { name, slug, status: 'error', reason: `HTTP ${res.status}` };

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) return { name, slug, status: 'error', reason: `suspiciously small: ${buf.length}B` };

  const md5 = createHash('md5').update(buf).digest('hex');
  await writeFile(outPath, buf);
  return { name, slug, status: 'saved', bytes: buf.length, md5, outPath };
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  const env = await loadEnv();
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .not('avatar_url', 'is', null)
    .not('full_name', 'is', null);

  if (error) {
    console.error('Supabase query error:', error.message);
    process.exit(1);
  }

  const rows = (data || []).filter((r) => r.full_name && r.avatar_url);
  console.log(`\nFound ${rows.length} profile rows with both full_name and avatar_url\n`);

  await mkdir(AVATARS_DIR, { recursive: true });

  // Dedupe by slug (last one wins if name casing differs).
  const bySlug = new Map();
  for (const r of rows) {
    const slug = slugifyName(r.full_name);
    if (!slug) continue;
    bySlug.set(slug, { name: r.full_name, slug, url: r.avatar_url });
  }

  const results = [];
  for (const entry of bySlug.values()) {
    const r = await downloadOne(entry);
    results.push(r);
    const tag = r.status === 'saved' ? '✓'
              : r.status === 'exists' ? '·'
              : r.status === 'would-download' ? '…'
              : '✗';
    const detail = r.status === 'saved' ? `${r.bytes}B md5=${r.md5.slice(0, 8)}`
                 : r.status === 'error' ? r.reason
                 : r.status === 'would-download' ? r.url.slice(0, 80)
                 : '';
    console.log(`${tag} ${r.slug.padEnd(30)} ${r.name.padEnd(30)} ${detail}`);
  }

  // Content-hash dedup report — helps spot "everyone got the initials fallback"
  const byMd5 = new Map();
  for (const r of results) {
    if (r.status === 'saved' && r.md5) {
      if (!byMd5.has(r.md5)) byMd5.set(r.md5, []);
      byMd5.get(r.md5).push(r.slug);
    }
  }
  const dupes = [...byMd5.values()].filter((arr) => arr.length > 1);
  if (dupes.length) {
    console.log(`\n⚠ ${dupes.length} md5 groups with duplicate content (likely initials/default fallback):`);
    for (const arr of dupes) console.log(`  ${arr.length}× ${arr.join(', ')}`);
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`\nSummary:`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
