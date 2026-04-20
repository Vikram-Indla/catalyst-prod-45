#!/usr/bin/env node
/**
 * pull-jira-avatars.mjs — pull canonical face PNGs from Jira CDN URLs
 * stored in `jira_identity_map.avatar_url` and write them to
 * src/assets/avatars/<slug>.png so the §19 resolver picks them up.
 *
 * Why no edge function?
 *   The avatar_url values in jira_identity_map are already PUBLIC CDN URLs
 *   (avatar-management--avatars.us-west-2.prod.public.atl-paas.net or
 *   secure.gravatar.com). They don't need Jira API auth. We can fetch them
 *   directly from the script — simpler, no SERVICE_ROLE_KEY, no new secrets.
 *
 * Generic-tile dedupe:
 *   Many Jira users have NO real photo — Gravatar redirects to Atlassian's
 *   "initials" tiles (e.g. /initials/AA-6.png), which is just a colored
 *   letter square. Multiple users share the same tile (everyone with
 *   initials "AA" gets AA-6.png). We md5 the downloaded bytes; any md5
 *   that appears 2+ times = generic tile = SKIP (do not pollute the local
 *   set with fake faces). Per §19, the resolver falls back to CircleUser +
 *   hash color for those users — that is canonical, not a bug.
 *
 * Usage:
 *   node scripts/pull-jira-avatars.mjs           # skip existing files
 *   node scripts/pull-jira-avatars.mjs --force   # overwrite existing files
 */

import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const AVATARS_DIR = resolve(PROJECT_ROOT, 'src', 'assets', 'avatars');
const ENV_FILE = resolve(PROJECT_ROOT, '.env');

const FORCE = process.argv.includes('--force');

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

async function loadEnv() {
  const text = await readFile(ENV_FILE, 'utf8');
  const env = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

async function fetchIdentityMap() {
  // jira_identity_map has RLS that blocks the anon key. The script reads a
  // pre-exported JSON dump instead — produced by an operator with DB access:
  //
  //   psql -t -A -c "SELECT json_agg(json_build_object(
  //     'display_name',display_name,'email',email,
  //     'jira_account_id',jira_account_id,'avatar_url',avatar_url))
  //     FROM public.jira_identity_map
  //     WHERE is_active_in_jira AND avatar_url IS NOT NULL;" \
  //     > /tmp/jira-identity.json
  //
  // This avoids needing SUPABASE_SERVICE_ROLE_KEY in the script env.
  const dumpPath = process.env.JIRA_IDENTITY_DUMP || '/tmp/jira-identity.json';
  const text = await readFile(dumpPath, 'utf8');
  const rows = JSON.parse(text);
  if (!Array.isArray(rows)) throw new Error(`Expected JSON array in ${dumpPath}`);
  return rows;
}

async function downloadAvatar(url) {
  // Atlassian/Gravatar URLs sometimes redirect; fetch follows by default.
  // Request a generous size hint via query param when possible.
  let target = url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('atl-paas.net') && /\/\d+$/.test(u.pathname)) {
      // .../<id>/<id>/48 → bump to /128 for higher fidelity
      target = url.replace(/\/48$/, '/128');
    }
  } catch { /* keep original */ }

  const res = await fetch(target, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('empty body');
  const md5 = createHash('md5').update(buf).digest('hex');
  return { buf, md5, finalUrl: res.url };
}

async function main() {
  await mkdir(AVATARS_DIR, { recursive: true });

  console.log(`→ Loading active jira_identity_map rows from local dump`);
  const rows = await fetchIdentityMap();
  console.log(`  found ${rows.length} active users with avatar_url`);

  // Pass 1: download all bytes, hash, group by md5
  const fetched = []; // { name, slug, md5, buf, error }
  for (const row of rows) {
    const name = row.display_name || row.email || row.jira_account_id;
    const slug = slugifyName(name || '');
    if (!slug) {
      fetched.push({ name, slug: '', md5: null, buf: null, error: 'empty slug' });
      continue;
    }
    try {
      const { buf, md5 } = await downloadAvatar(row.avatar_url);
      fetched.push({ name, slug, md5, buf, error: null });
    } catch (err) {
      fetched.push({ name, slug, md5: null, buf: null, error: String(err.message || err) });
    }
  }

  // Pass 2: identify generic-tile md5s (any md5 shared by 2+ users = not a real photo)
  const md5Counts = new Map();
  for (const f of fetched) {
    if (!f.md5) continue;
    md5Counts.set(f.md5, (md5Counts.get(f.md5) ?? 0) + 1);
  }
  const genericMd5s = new Set([...md5Counts.entries()].filter(([, n]) => n >= 2).map(([m]) => m));

  // Pass 3: write files
  const counts = { ok: 0, skipped_existing: 0, skipped_generic: 0, error: 0, empty_slug: 0 };
  const dupGroups = new Map(); // md5 → [names]
  for (const f of fetched) {
    if (!f.slug) { counts.empty_slug += 1; continue; }
    if (f.error) {
      counts.error += 1;
      console.log(`  ✗ ${f.name} (${f.slug}): ${f.error}`);
      continue;
    }
    if (genericMd5s.has(f.md5)) {
      counts.skipped_generic += 1;
      const arr = dupGroups.get(f.md5) ?? [];
      arr.push(f.name);
      dupGroups.set(f.md5, arr);
      continue;
    }
    const outPath = resolve(AVATARS_DIR, `${f.slug}.png`);
    if (!FORCE && (await fileExists(outPath))) {
      counts.skipped_existing += 1;
      continue;
    }
    await writeFile(outPath, f.buf);
    counts.ok += 1;
    console.log(`  ✓ ${f.name} → ${f.slug}.png (md5 ${f.md5.slice(0, 8)}, ${f.buf.length}b)`);
  }

  console.log('\n── Summary ──');
  console.log(`  count_ok:               ${counts.ok}`);
  console.log(`  count_skipped_existing: ${counts.skipped_existing}`);
  console.log(`  count_skipped_generic:  ${counts.skipped_generic}  (initials tiles, fall back to CircleUser per §19)`);
  console.log(`  count_error:            ${counts.error}`);
  console.log(`  count_empty_slug:       ${counts.empty_slug}`);

  if (dupGroups.size > 0) {
    console.log('\n── Generic-tile groups (md5 → users sharing the same tile) ──');
    for (const [md5, names] of dupGroups) {
      console.log(`  ${md5.slice(0, 8)} (${names.length} users): ${names.join(', ')}`);
    }
  }

  if (counts.error > 0) process.exit(2);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
