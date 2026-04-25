/**
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
