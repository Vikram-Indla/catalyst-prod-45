/**
 * jira-ingest — one-directional Jira → Catalyst sync orchestrator.
 *
 * Chains two ingest functions in sequence:
 *   1. jira-sync-projects  — upserts project rows into projects + ph_projects
 *   2. wh-jira-bulk-sync   — upserts issue rows into ph_issues
 *
 * NO write-back. This function never calls jira-write-back or
 * jira-write-back-processor. Data flows Jira → Catalyst only.
 *
 * Invoke from Claude Code:
 *   supabase functions invoke jira-ingest --data '{}'
 *   supabase functions invoke jira-ingest --data '{"project_keys":["BAU"],"sync_type":"delta"}'
 *
 * Response shape:
 *   {
 *     ok: true,
 *     projects: { ok: boolean, message?: string },
 *     issues:   { ok: boolean, message?: string },
 *     duration_ms: number,
 *     completed_at: string
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const startMs = Date.now()

  const body = await req.json().catch(() => ({}))
  const projectKeys: string[] | undefined = body.project_keys ?? body.projectKeys
  const syncType: string = body.sync_type ?? 'delta'

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceKey)

  // Verify connection exists and is configured (status check only — callers can
  // fix the status row without touching code here).
  const { data: conn } = await supabase
    .from('ph_jira_connection')
    .select('id, status, site_url, auth_email')
    .limit(1)
    .single()

  if (!conn) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No ph_jira_connection row found. Configure Jira credentials first.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Helper: invoke a sibling edge function with a service-role bearer token.
  // We cannot use supabase.functions.invoke() from inside an edge function, so
  // we call the REST endpoint directly.
  const invokeFunction = async (name: string, payload: Record<string, unknown>) => {
    const url = `${supabaseUrl}/functions/v1/${name}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify(payload),
    })
    const text = await resp.text()
    let json: unknown
    try { json = JSON.parse(text) } catch { json = { raw: text } }
    return { status: resp.status, ok: resp.ok, body: json }
  }

  // ── Phase 1: sync project metadata ────────────────────────────────────────
  console.log('[jira-ingest] Phase 1: syncing projects')
  const projectsResult = await invokeFunction('jira-sync-projects', {
    ...(projectKeys ? { projectKeys } : {}),
    syncMode: syncType,
  }).catch((err: Error) => ({ ok: false, status: 500, body: { error: err.message } }))

  // ── Phase 2: sync issues ───────────────────────────────────────────────────
  console.log('[jira-ingest] Phase 2: syncing issues')
  const issuesResult = await invokeFunction('wh-jira-bulk-sync', {
    sync_type: syncType,
    ...(projectKeys ? { projects: projectKeys } : {}),
  }).catch((err: Error) => ({ ok: false, status: 500, body: { error: err.message } }))

  const durationMs = Date.now() - startMs
  const completedAt = new Date().toISOString()

  const summary = {
    ok: projectsResult.ok && issuesResult.ok,
    projects: {
      ok: projectsResult.ok,
      status: projectsResult.status,
      ...(projectsResult.ok ? {} : { error: (projectsResult.body as any)?.error ?? 'unknown' }),
    },
    issues: {
      ok: issuesResult.ok,
      status: issuesResult.status,
      ...(issuesResult.ok ? {} : { error: (issuesResult.body as any)?.error ?? 'unknown' }),
    },
    duration_ms: durationMs,
    completed_at: completedAt,
  }

  console.log('[jira-ingest] Done', JSON.stringify(summary))

  return new Response(JSON.stringify(summary, null, 2), {
    status: summary.ok ? 200 : 207,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
