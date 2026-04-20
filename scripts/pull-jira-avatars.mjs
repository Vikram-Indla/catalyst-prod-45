#!/usr/bin/env node
/**
<<<<<<< Updated upstream
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
=======
 * pull-jira-avatars.mjs — Hybrid canonical face puller
 *
 * Flow
 * ----
 *   [jira_identity_map] ──► (Edge Fn: jira-avatar-sync) ──► Jira REST
 *                                                            │
 *            base64 JSON  ◄───────────────────────────────────┘
 *            │
 *            ▼
 *   src/assets/avatars/<slug>.png   ← canonical git source
 *
 * The Supabase Edge Function `jira-avatar-sync` (deployed alongside this
 * repo's other `supabase/functions/jira-*` sync endpoints) does the actual
 * Jira REST work server-side, reusing the connection/credentials that the
 * running sync already has wired up via `ph_jira_connection`. No new API
 * token in `.env`. No parallel REST client. See CLAUDE.md §19.
 *
 * Usage
 * -----
 *   node scripts/pull-jira-avatars.mjs                  # pull everyone, size 128x128
 *   node scripts/pull-jira-avatars.mjs --force          # overwrite existing files
 *   node scripts/pull-jira-avatars.mjs --dry-run        # list what would change
 *   node scripts/pull-jira-avatars.mjs --size 48x48     # smaller variant (current sync)
 *   node scripts/pull-jira-avatars.mjs --limit 10       # first 10 users only
 *   node scripts/pull-jira-avatars.mjs --only "Nada Alfassam,Vikram Indla"
 *
 * Authentication
 * --------------
 * The Edge Function is declared `verify_jwt = true`, so any signed Supabase
 * JWT for this project passes the outer gate. The function uses its own
 * ambient `SUPABASE_SERVICE_ROLE_KEY` (auto-injected into every Edge
 * Function runtime by Supabase) for all privileged reads from
 * `ph_jira_connection` and `jira_identity_map` — the caller's token is
 * NOT used for those reads.
 *
 * Key order (first match wins, no setup required for the common path):
 *   1. SUPABASE_SERVICE_ROLE_KEY      (legacy — still accepted)
 *   2. VITE_SUPABASE_PUBLISHABLE_KEY  (already in .env, no setup)
 *   3. SUPABASE_PUBLISHABLE_KEY       (fallback alias)
 *
 * The publishable key is safe to use here because it only gates function
 * invocation — privilege escalation happens server-side via the ambient
 * service-role key.
 *
 * Output
 * ------
 *   src/assets/avatars/<slug>.png  (overwritten iff --force)
 *
 * The resolver at src/lib/avatars.ts auto-discovers these via
 * `import.meta.glob` — no manifest edit required after running.
 */

import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const AVATARS_DIR = resolve(ROOT, 'src', 'assets', 'avatars')
const ENV_FILE = resolve(ROOT, '.env')

// ── Args ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const FORCE = argv.includes('--force')
const DRY = argv.includes('--dry-run')
function flag(name) {
  const i = argv.indexOf(name)
  return i >= 0 && i < argv.length - 1 ? argv[i + 1] : null
}
const SIZE = flag('--size') === '48x48' ? '48x48' : '128x128'
const LIMIT = flag('--limit') ? parseInt(flag('--limit'), 10) : null
const ONLY = flag('--only')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null

// ── Env ───────────────────────────────────────────────────────────────
async function loadEnv() {
  const text = await readFile(ENV_FILE, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

async function fileExists(p) {
  try { await access(p); return true } catch { return false }
}

// Always write `.png` regardless of source MIME — matches the pattern used by
// `pull-canonical-avatars.mjs` and keeps the filename consistent with the slug.
// Browsers content-sniff so mismatched extension does not break rendering, and
// the resolver glob at src/lib/avatars.ts picks any `png|jpg|jpeg|webp` file.
function ext(/* mime */) {
  return 'png'
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const env = await loadEnv()
  const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL
  // verify_jwt=true accepts any signed project JWT — service_role, anon, or
  // publishable. Prefer service_role if present (legacy dev pattern), else
  // fall back to the publishable key that's already in .env for Vite.
  const AUTH_KEY =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY
  const AUTH_KEY_SOURCE = env.SUPABASE_SERVICE_ROLE_KEY
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : env.VITE_SUPABASE_PUBLISHABLE_KEY
    ? 'VITE_SUPABASE_PUBLISHABLE_KEY'
    : 'SUPABASE_PUBLISHABLE_KEY'
  if (!SUPABASE_URL) {
    console.error('✗ Missing VITE_SUPABASE_URL / SUPABASE_URL in .env')
    process.exit(1)
  }
  if (!AUTH_KEY) {
    console.error('✗ Missing auth key — need one of:')
    console.error('    SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY')
    process.exit(1)
  }

  const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/jira-avatar-sync`

  console.log(`\n▶ Invoking jira-avatar-sync (size=${SIZE}${LIMIT ? `, limit=${LIMIT}` : ''}${ONLY ? `, only=${ONLY.length} names` : ''})`)
  console.log(`  endpoint: ${endpoint}`)
  console.log(`  auth:     ${AUTH_KEY_SOURCE}\n`)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_KEY}`,
      // apikey header — some Supabase edge deployments check both apikey
      // and Authorization; anon/publishable keys need the apikey header
      // to reach the function at all in some project configs.
      'apikey': AUTH_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ size: SIZE, limit: LIMIT, only: ONLY }),
  })

  if (!res.ok) {
    console.error(`✗ Edge Function returned ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const payload = await res.json()
  if (payload.error) {
    console.error('✗ Function error:', payload.error, payload.details ?? '')
    process.exit(1)
  }

  const { avatars = [], errors = [], total_identities, total_unique_slugs, elapsed_ms } = payload
  console.log(
    `◦ Response: ${avatars.length} fetched / ${errors.length} errors ` +
    `(total identities: ${total_identities}, unique slugs: ${total_unique_slugs}, ${elapsed_ms}ms)\n`,
  )

  await mkdir(AVATARS_DIR, { recursive: true })

  // ── Write files ────────────────────────────────────────────────────
  const results = []
  for (const a of avatars) {
    const outPath = resolve(AVATARS_DIR, `${a.slug}.${ext(a.mime_type)}`)
    const alreadyExists = await fileExists(outPath)
    if (!FORCE && alreadyExists) {
      results.push({ ...a, status: 'exists', outPath })
      continue
    }
    if (DRY) {
      results.push({ ...a, status: 'would-write', outPath })
      continue
    }
    const buf = Buffer.from(a.base64, 'base64')
    await writeFile(outPath, buf)
    const md5 = createHash('md5').update(buf).digest('hex')
    results.push({ ...a, status: 'saved', outPath, md5 })
  }

  // ── Log each row ───────────────────────────────────────────────────
  for (const r of results) {
    const tag = r.status === 'saved' ? '✓'
             : r.status === 'exists' ? '·'
             : r.status === 'would-write' ? '…'
             : '✗'
    const detail = r.status === 'saved' ? `${r.bytes}B md5=${r.md5.slice(0, 8)}`
                 : r.status === 'exists' ? 'skip (use --force)'
                 : r.status === 'would-write' ? `${r.bytes}B`
                 : ''
    console.log(`${tag} ${r.slug.padEnd(32)} ${r.display_name.padEnd(30)} ${detail}`)
  }

  // ── Errors ─────────────────────────────────────────────────────────
  if (errors.length) {
    console.log(`\n⚠ ${errors.length} error(s):`)
    for (const e of errors) {
      console.log(`  ✗ ${e.slug.padEnd(32)} ${(e.display_name ?? '').padEnd(30)} ${e.reason}`)
    }
  }

  // ── md5-dup report (detect initials-fallback cluster) ──────────────
  const byMd5 = new Map()
  for (const r of results) {
    if (r.status === 'saved' && r.md5) {
      if (!byMd5.has(r.md5)) byMd5.set(r.md5, [])
      byMd5.get(r.md5).push(r.slug)
    }
  }
  const dupes = [...byMd5.values()].filter((arr) => arr.length > 1)
  if (dupes.length) {
    console.log(
      `\n⚠ ${dupes.length} md5 group(s) with duplicate content — likely Jira initials-fallback:`,
    )
    for (const arr of dupes) console.log(`  ${arr.length}× ${arr.join(', ')}`)
    console.log(`  (These users render the same Atlassian initials tile because they never`)
    console.log(`   uploaded a photo to Jira. This is canonical — every Catalyst surface`)
    console.log(`   shows the same tile for them. See CLAUDE.md §19.)`)
  }

  // ── Summary ────────────────────────────────────────────────────────
  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  console.log(`\nSummary:`, counts)
  if (errors.length) console.log(`Errors:`, errors.length)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
>>>>>>> Stashed changes
