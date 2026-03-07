import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // 1. Get Jira connection credentials (same pattern as wh-jira-sync)
    const { data: conn, error: connErr } = await supabase
      .from('ph_jira_connection')
      .select('*')
      .single()

    if (connErr || !conn || conn.status !== 'connected') {
      // Fallback: try jira_connections + jira_auth_credentials
      const { data: jiraConn } = await supabase
        .from('jira_connections')
        .select('id, jira_url, auth_method, is_active')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!jiraConn) {
        return new Response(JSON.stringify({
          error: 'no_credentials',
          message: 'Jira integration not configured. Go to Settings → Integrations.',
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: creds } = await supabase
        .from('jira_auth_credentials')
        .select('auth_data')
        .eq('connection_id', jiraConn.id)
        .single()

      if (!creds?.auth_data) {
        return new Response(JSON.stringify({
          error: 'no_credentials',
          message: 'Jira credentials not found. Re-configure in Settings → Integrations.',
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const authData = creds.auth_data as any
      const base = jiraConn.jira_url.replace(/\/$/, '')
      const email = authData.email || authData.username
      const token = authData.api_token || authData.token || authData.password
      const authHeader = 'Basic ' + btoa(`${email}:${token}`)

      await syncProjects(supabase, base, authHeader)

      return new Response(JSON.stringify({ success: true, source: 'jira_connections' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use ph_jira_connection (primary path)
    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)

    await syncProjects(supabase, base, authHeader)

    return new Response(JSON.stringify({ success: true, source: 'ph_jira_connection' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('ra-jira-sync error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function syncProjects(supabase: any, base: string, authHeader: string) {
  const projectKeys = ['SEN', 'MDT']
  const headers = { 'Authorization': authHeader, 'Accept': 'application/json' }

  // Fetch project names
  const projectNames: Record<string, string> = {}
  try {
    const projRes = await fetch(`${base}/rest/api/3/project`, { headers })
    if (projRes.ok) {
      const projects = await projRes.json()
      projects.forEach((p: any) => { projectNames[p.key] = p.name })
    } else {
      await projRes.text() // consume body
    }
  } catch { /* non-fatal */ }

  // Truncate existing data
  await supabase.from('ra_jira_tickets').delete().neq('id', 0)

  for (const key of projectKeys) {
    const jql = `project=${key} ORDER BY created DESC`
    const url = `${base}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,priority,attachment,key,issuetype`

    const res = await fetch(url, { headers })
    if (!res.ok) {
      const errText = await res.text()
      console.error(`Jira search failed for ${key}: ${res.status} ${errText}`)
      continue
    }

    const data = await res.json()
    const issues = data.issues || []

    const rows = issues.map((issue: any) => {
      const fields = issue.fields || {}
      const attachments = fields.attachment || []
      const pdfAttachments = attachments.filter((a: any) => a.mimeType === 'application/pdf')
      const hasPdf = pdfAttachments.length > 0

      return {
        ticket_key: issue.key,
        project_key: key,
        project_name: projectNames[key] || key,
        ticket_summary: fields.summary || 'Untitled',
        ticket_type: fields.issuetype?.name || null,
        priority: fields.priority?.name || null,
        status: fields.status?.name || null,
        has_pdf: hasPdf,
        pdf_filename: hasPdf ? pdfAttachments[0].filename : null,
        page_count: null,
        created_at: new Date().toISOString(),
      }
    })

    if (rows.length > 0) {
      const { error } = await supabase.from('ra_jira_tickets').insert(rows)
      if (error) console.error(`Insert error for ${key}:`, error)
    }

    console.log(`Synced ${rows.length} tickets for ${key}`)
  }
}
