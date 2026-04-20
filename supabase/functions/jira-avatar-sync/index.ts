// deno-lint-ignore-file no-explicit-any
/**
 * jira-avatar-sync — Edge Function
 *
 * Purpose
 * -------
 * Canonical source-of-truth puller for user avatar photos. For every active
 * row in `jira_identity_map`, hits Jira REST `/rest/api/3/user?accountId=<id>`,
 * reads `avatarUrls['128x128']`, downloads the image binary with the same
 * Basic Auth credentials, and returns an array of
 *   `{ slug, display_name, jira_account_id, mime_type, bytes, base64 }`.
 *
 * The local script `scripts/pull-jira-avatars.mjs` consumes this payload and
 * writes each entry to `src/assets/avatars/<slug>.png` so the build-time
 * resolver at `src/lib/avatars.ts` picks it up via `import.meta.glob`.
 *
 * Why server-side
 * ---------------
 * Reuses existing creds in `ph_jira_connection` (same pattern as
 * `jira-user-sync`). Running the Jira REST calls in an Edge Function keeps
 * the Jira API token out of every developer's local `.env` — the already-
 * running sync stores the token once, we piggyback on that.
 *
 * Auth
 * ----
 * verify_jwt=true (declared in supabase/config.toml). Caller presents any
 * signed Supabase JWT for this project — service_role OR the publishable
 * key both satisfy the outer gate. All privileged reads
 * (`ph_jira_connection.auth_token_encrypted`, `jira_identity_map`) go
 * through the ambient `SUPABASE_SERVICE_ROLE_KEY` that Supabase injects
 * into every Edge Function runtime, so the caller's token grants no
 * additional privileges. The local puller (`scripts/pull-jira-avatars.mjs`)
 * therefore works out of the box with the publishable key that's already
 * in every dev's `.env` for Vite — no SERVICE_ROLE_KEY in `.env` required.
 *
 * Not for runtime
 * ---------------
 * CLAUDE.md §19 bans external avatar URLs at runtime. This function is ONLY
 * invoked by the dev-time script; its output lands on disk, is committed to
 * git, and becomes the canonical local PNG. At runtime the React bundle
 * never calls this function.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS — matches the inline declaration used by ai-digest, ai-improve-story,
// and other functions in this project. Not imported from a package.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// ── slug: matches src/lib/avatars.ts + scripts/pull-canonical-avatars.mjs ──
function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Base64-encode a Uint8Array without blowing the call stack on large buffers.
// `btoa(String.fromCharCode(...buf))` overflows above ~100 KB.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

type FetchResult =
  | {
      status: 'ok'
      slug: string
      display_name: string
      jira_account_id: string
      avatar_url: string
      mime_type: string
      bytes: number
      base64: string
    }
  | {
      status: 'error'
      slug: string
      display_name: string
      jira_account_id: string | null
      reason: string
    }

async function fetchOne(
  baseUrl: string,
  authHeader: string,
  row: { jira_account_id: string; display_name: string },
  size: '48x48' | '128x128',
): Promise<FetchResult> {
  const slug = slugifyName(row.display_name)
  try {
    // (1) Resolve full user record — gives us avatarUrls map
    const userRes = await fetch(
      `${baseUrl}/rest/api/3/user?accountId=${encodeURIComponent(row.jira_account_id)}`,
      { headers: { Authorization: authHeader, Accept: 'application/json' } },
    )
    if (!userRes.ok) {
      return {
        status: 'error',
        slug,
        display_name: row.display_name,
        jira_account_id: row.jira_account_id,
        reason: `user fetch ${userRes.status}`,
      }
    }
    const user = await userRes.json()
    const avatarUrl: string | undefined =
      user.avatarUrls?.[size] ??
      user.avatarUrls?.['128x128'] ??
      user.avatarUrls?.['48x48']
    if (!avatarUrl) {
      return {
        status: 'error',
        slug,
        display_name: row.display_name,
        jira_account_id: row.jira_account_id,
        reason: 'no avatarUrls in user response',
      }
    }

    // (2) Download the avatar binary — also needs Basic Auth on atl-paas URLs
    const imgRes = await fetch(avatarUrl, {
      headers: { Authorization: authHeader },
      redirect: 'follow',
    })
    if (!imgRes.ok) {
      return {
        status: 'error',
        slug,
        display_name: row.display_name,
        jira_account_id: row.jira_account_id,
        reason: `image fetch ${imgRes.status}`,
      }
    }
    const mime = imgRes.headers.get('content-type') ?? 'image/png'
    // Reject HTML/text — that's a login redirect or 404 page, not an image.
    if (!mime.startsWith('image/')) {
      return {
        status: 'error',
        slug,
        display_name: row.display_name,
        jira_account_id: row.jira_account_id,
        reason: `non-image content-type: ${mime}`,
      }
    }
    const buf = new Uint8Array(await imgRes.arrayBuffer())
    if (buf.length < 200) {
      return {
        status: 'error',
        slug,
        display_name: row.display_name,
        jira_account_id: row.jira_account_id,
        reason: `suspiciously small: ${buf.length}B`,
      }
    }
    return {
      status: 'ok',
      slug,
      display_name: row.display_name,
      jira_account_id: row.jira_account_id,
      avatar_url: avatarUrl,
      mime_type: mime,
      bytes: buf.length,
      base64: bytesToBase64(buf),
    }
  } catch (err) {
    return {
      status: 'error',
      slug,
      display_name: row.display_name,
      jira_account_id: row.jira_account_id ?? null,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    const body = await req.json().catch(() => ({} as any))
    const size: '48x48' | '128x128' = body?.size === '48x48' ? '48x48' : '128x128'
    const limit: number | null = typeof body?.limit === 'number' ? body.limit : null
    const only: string[] | null = Array.isArray(body?.only) ? body.only : null // list of display_names
    const batchSize: number = Math.max(1, Math.min(10, body?.batchSize ?? 5))

    // ── Step 1: Jira creds (mirror jira-user-sync) ────────────────────
    const { data: conn, error: connErr } = await supabase
      .from('ph_jira_connection')
      .select('site_url, auth_email, auth_token_encrypted')
      .eq('status', 'connected')
      .limit(1)
      .single()
    if (connErr || !conn) {
      return new Response(
        JSON.stringify({
          error: 'No active Jira connection in ph_jira_connection',
          details: connErr?.message ?? null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const baseUrl = conn.site_url.replace(/\/+$/, '')
    const authHeader =
      'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)

    // ── Step 2: Identities to sync ────────────────────────────────────
    let q = supabase
      .from('jira_identity_map')
      .select('jira_account_id, display_name')
      .eq('is_active_in_jira', true)
      .not('jira_account_id', 'is', null)
      .not('display_name', 'is', null)
    if (only && only.length) q = q.in('display_name', only)
    const { data: identities, error: idErr } = await q
    if (idErr) {
      return new Response(
        JSON.stringify({ error: 'identity query failed', details: idErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Dedupe by slug — same slug wins first-seen row
    const bySlug = new Map<string, { jira_account_id: string; display_name: string }>()
    for (const row of identities ?? []) {
      if (!row.jira_account_id || !row.display_name) continue
      const slug = slugifyName(row.display_name)
      if (!slug || bySlug.has(slug)) continue
      bySlug.set(slug, {
        jira_account_id: row.jira_account_id,
        display_name: row.display_name,
      })
    }

    const todo = [...bySlug.values()].slice(0, limit ?? Infinity)

    // ── Step 3: Fetch avatars in batches ──────────────────────────────
    const avatars: Extract<FetchResult, { status: 'ok' }>[] = []
    const errors: Extract<FetchResult, { status: 'error' }>[] = []

    for (let i = 0; i < todo.length; i += batchSize) {
      const batch = todo.slice(i, i + batchSize)
      const settled = await Promise.all(
        batch.map((row) => fetchOne(baseUrl, authHeader, row, size)),
      )
      for (const r of settled) {
        if (r.status === 'ok') avatars.push(r)
        else errors.push(r)
      }
    }

    const elapsedMs = Date.now() - startedAt

    return new Response(
      JSON.stringify({
        avatars,
        errors,
        count_ok: avatars.length,
        count_error: errors.length,
        total_identities: identities?.length ?? 0,
        total_unique_slugs: bySlug.size,
        size,
        elapsed_ms: elapsedMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        elapsed_ms: Date.now() - startedAt,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
