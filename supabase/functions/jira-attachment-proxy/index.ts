/**
 * jira-attachment-proxy — Proxies Jira attachment content through authenticated requests.
 *
 * Accepts ?id=<jira_attachment_id> and streams the binary back with the proper MIME.
 * Uses ph_jira_connection credentials.
 *
 * Performance contract (2026-05-05):
 *   • Streaming pass-through — no arrayBuffer() so large files (videos, big
 *     PDFs) don't OOM the edge function.
 *   • Connection cached per cold start (one DB hit per worker, not per request).
 *   • ETag / Last-Modified pass-through so the browser can revalidate with
 *     If-None-Match / If-Modified-Since. Returns 304 when Jira does.
 *   • HEAD method supported — clients can size-check before downloading.
 *   • Cache-Control: 24 h immutable for the bytes, ETag for revalidation.
 *
 * Error classification (2026-05-05): 401 → token bad, 403 → scope/permission,
 * 404 → not found, 5xx → upstream. Each carries a `code` field for client
 * fallback rendering. The "auth required · Open in Jira ↗" chip the
 * frontend renders on 403 stays the right UX.
 *
 * Out of scope here: PAT scope rotation. If the connection's token doesn't
 * have read:jira-attachment scope, the proxy will surface 403 verbatim — fix
 * is a Vikram-only credential rotation in Supabase secrets / ph_jira_connection.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, if-none-match, if-modified-since',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'etag, last-modified, content-length, content-type',
}

interface ConnectionRow {
  site_url: string
  auth_email: string
  auth_token_encrypted: string
}

// Per-cold-start connection cache. Edge functions reuse workers across
// invocations so this avoids hitting Postgres on every attachment request.
let cachedConn: ConnectionRow | null = null
let cachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

async function getConnection(supabase: SupabaseClient): Promise<ConnectionRow | null> {
  const now = Date.now()
  if (cachedConn && now - cachedAt < CACHE_TTL_MS) return cachedConn

  const { data } = await supabase
    .from('ph_jira_connection')
    .select('site_url, auth_email, auth_token_encrypted')
    .eq('status', 'connected')
    .limit(1)
    .single()

  if (!data?.site_url || !data?.auth_email || !data?.auth_token_encrypted) {
    return null
  }

  cachedConn = data as ConnectionRow
  cachedAt = now
  return cachedConn
}

function jsonError(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ code, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return jsonError('METHOD_NOT_ALLOWED', `Only GET and HEAD are supported`, 405)
  }

  try {
    const url = new URL(req.url)
    const attachmentId = url.searchParams.get('id')

    if (!attachmentId) {
      return jsonError('MISSING_ID', 'Missing ?id= parameter', 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const conn = await getConnection(supabase)
    if (!conn) {
      return jsonError('NOT_CONFIGURED', 'Jira connection not configured', 503)
    }

    const baseUrl = conn.site_url.replace(/\/+$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)

    // Forward conditional headers so Jira can return 304 without re-sending bytes.
    const upstreamHeaders: Record<string, string> = {
      Authorization: authHeader,
      Accept: '*/*',
    }
    const ifNoneMatch = req.headers.get('if-none-match')
    if (ifNoneMatch) upstreamHeaders['If-None-Match'] = ifNoneMatch
    const ifModifiedSince = req.headers.get('if-modified-since')
    if (ifModifiedSince) upstreamHeaders['If-Modified-Since'] = ifModifiedSince

    const t0 = performance.now()
    const jiraRes = await fetch(
      `${baseUrl}/rest/api/3/attachment/content/${attachmentId}`,
      {
        method: req.method, // GET or HEAD
        headers: upstreamHeaders,
        redirect: 'follow',
      },
    )
    const dt = Math.round(performance.now() - t0)
    console.log(`[attachment-proxy] id=${attachmentId} method=${req.method} status=${jiraRes.status} duration=${dt}ms`)

    // 304 — pass through, no body.
    if (jiraRes.status === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          ...corsHeaders,
          ETag: jiraRes.headers.get('etag') ?? '',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      })
    }

    if (!jiraRes.ok) {
      // Tiered error classification for client fallback UX.
      const code =
        jiraRes.status === 401 ? 'JIRA_UNAUTHORIZED' :
        jiraRes.status === 403 ? 'JIRA_FORBIDDEN' :
        jiraRes.status === 404 ? 'JIRA_NOT_FOUND' :
        jiraRes.status >= 500 ? 'JIRA_UPSTREAM_ERROR' :
        'JIRA_ERROR'
      // Try to surface the body for debugging; tolerate non-text bodies.
      let detail = ''
      try {
        const text = await jiraRes.text()
        detail = text.slice(0, 500)
      } catch { /* non-text body, skip */ }
      return jsonError(code, `Jira returned ${jiraRes.status}${detail ? `: ${detail}` : ''}`, jiraRes.status)
    }

    const contentType = jiraRes.headers.get('content-type') ?? 'application/octet-stream'
    const contentLength = jiraRes.headers.get('content-length') ?? undefined
    const etag = jiraRes.headers.get('etag') ?? undefined
    const lastModified = jiraRes.headers.get('last-modified') ?? undefined

    const respHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
    }
    if (contentLength) respHeaders['Content-Length'] = contentLength
    if (etag) respHeaders.ETag = etag
    if (lastModified) respHeaders['Last-Modified'] = lastModified

    // HEAD — return headers only, no body.
    if (req.method === 'HEAD') {
      return new Response(null, { status: 200, headers: respHeaders })
    }

    // GET — stream the body. No arrayBuffer() so we don't buffer the whole
    // attachment in worker memory; Jira's response stream feeds the response
    // stream directly. Critical for large files.
    return new Response(jiraRes.body, { status: 200, headers: respHeaders })
  } catch (err) {
    console.error('[attachment-proxy] uncaught', err)
    return jsonError('INTERNAL_ERROR', String(err), 500)
  }
})
