import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { action, payload } = await req.json()

    // STEP A — Read Jira credentials from platform storage
    let jiraUrl = '', jiraEmail = '', jiraToken = ''

    // Try ph_jira_connection first (primary platform table)
    const { data: phConn } = await supabase
      .from('ph_jira_connection')
      .select('*')
      .eq('status', 'connected')
      .limit(1)
      .single()

    if (phConn) {
      jiraUrl = (phConn.site_url || '').replace(/\/$/, '')
      jiraEmail = phConn.auth_email || ''
      jiraToken = phConn.auth_token_encrypted || ''
    }

    // Fallback: jira_connections + jira_auth_credentials
    if (!jiraUrl || !jiraEmail || !jiraToken) {
      const { data: jiraConn } = await supabase
        .from('jira_connections')
        .select('id, jira_url, is_active')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (jiraConn) {
        const { data: creds } = await supabase
          .from('jira_auth_credentials')
          .select('auth_data')
          .eq('connection_id', jiraConn.id)
          .single()

        if (creds?.auth_data) {
          const ad = creds.auth_data as any
          jiraUrl = (jiraConn.jira_url || '').replace(/\/$/, '')
          jiraEmail = ad.email || ad.username || ''
          jiraToken = ad.api_token || ad.token || ad.password || ''
        }
      }
    }

    if (!jiraUrl || !jiraEmail || !jiraToken) {
      return json({ error: 'JIRA_NOT_CONFIGURED', message: 'Jira credentials not found in platform settings.' }, 422)
    }

    // STEP B — Build auth header
    const authHeader = 'Basic ' + btoa(`${jiraEmail}:${jiraToken}`)
    const jiraHeaders = { 'Authorization': authHeader, 'Accept': 'application/json' }

    // STEP C — verify_project
    if (action === 'verify_project') {
      const { projectKey } = payload
      const res = await fetch(`${jiraUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`, { headers: jiraHeaders })
      if (res.status === 404) {
        await res.text()
        return json({ error: 'PROJECT_NOT_FOUND', message: 'Project not found in Jira.' }, 404)
      }
      if (!res.ok) {
        const t = await res.text()
        return json({ error: 'JIRA_ERROR', message: t }, res.status)
      }
      const proj = await res.json()
      return json({
        project_key: proj.key,
        project_name: proj.name,
        avatar_url: proj.avatarUrls?.['48x48'] || null,
      })
    }

    // STEP D — sync_tickets
    if (action === 'sync_tickets') {
      const { projectKey } = payload
      const jql = `project = ${projectKey} AND attachments is not EMPTY ORDER BY created DESC`
      const url = `${jiraUrl}/rest/api/3/search/jql`

      const res = await fetch(url, {
        method: 'POST',
        headers: { ...jiraHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jql,
          maxResults: 100,
          fields: ['summary', 'status', 'priority', 'attachment', 'issuetype', 'created'],
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        console.error(`Jira search failed for ${projectKey}: ${res.status} ${t}`)
        return json({ error: 'JIRA_SEARCH_FAILED', message: t }, res.status)
      }

      const data = await res.json()
      const issues = data.issues || []
      const now = new Date().toISOString()

      // Get project name
      let projectName = projectKey
      try {
        const pRes = await fetch(`${jiraUrl}/rest/api/3/project/${encodeURIComponent(projectKey)}`, { headers: jiraHeaders })
        if (pRes.ok) {
          const pData = await pRes.json()
          projectName = pData.name || projectKey
        } else {
          await pRes.text()
        }
      } catch { /* non-fatal */ }

      const tickets = issues.map((issue: any) => {
        const f = issue.fields || {}
        const attachments = f.attachment || []
        const hasPdf = attachments.some((a: any) =>
          a.mimeType === 'application/pdf' || (a.filename || '').toLowerCase().endsWith('.pdf')
        )
        return {
          ticket_key: issue.key,
          project_key: projectKey,
          project_name: projectName,
          jira_issue_id: issue.id,
          ticket_summary: f.summary || 'Untitled',
          priority: (f.priority?.name || 'Medium').toUpperCase(),
          status: f.status?.name || 'Open',
          attachment_count: attachments.length,
          has_pdf: hasPdf,
          synced_at: now,
        }
      })

      if (tickets.length > 0) {
        // Delete existing tickets for this project then insert fresh
        await supabase.from('ra_jira_tickets').delete().eq('project_key', projectKey)
        const { error } = await supabase.from('ra_jira_tickets').insert(tickets)
        if (error) console.error('Insert error:', error)
      }

      // Update ra_jira_connections
      await supabase
        .from('ra_jira_connections')
        .update({ ticket_count: tickets.length, last_synced_at: now, updated_at: now, project_name: projectName })
        .eq('project_key', projectKey)

      return json({ synced: tickets.length, tickets })
    }

    return json({ error: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` }, 400)

  } catch (err: any) {
    console.error('ra-jira-proxy error:', err)
    return json({ error: err.message }, 500)
  }
})
