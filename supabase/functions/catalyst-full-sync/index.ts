/**
 * catalyst-full-sync — One-shot full sync for 2026 data only.
 * Reads credentials from ph_jira_connection, fetches ALL issues
 * created in 2026 from Jira, upserts into ph_issues.
 * Does NOT prune. Safe to call repeatedly.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const startTime = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json().catch(() => ({}))
    const targetProjects: string[] = body.projects || []
    const yearFilter = body.year || '2026'

    // 1. Get Jira credentials
    const { data: conn } = await supabase.from('ph_jira_connection').select('*').single()
    if (!conn || conn.status !== 'connected') {
      throw new Error('Jira not connected')
    }

    const base = conn.site_url.replace(/\/$/, '')
    const auth = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': auth, 'Accept': 'application/json', 'Content-Type': 'application/json' }

    // 2. Get projects to sync
    let projectKeys = targetProjects
    if (projectKeys.length === 0) {
      const { data: cfgRows } = await supabase.from('wh_config').select('key, value').eq('key', 'sync_projects')
      const syncProjects = cfgRows?.[0]?.value
      projectKeys = Array.isArray(syncProjects) ? syncProjects : []
    }
    if (projectKeys.length === 0) {
      // Discover from Jira
      const projRes = await fetch(`${base}/rest/api/3/project`, { headers })
      if (projRes.ok) {
        const projects = await projRes.json()
        projectKeys = projects.map((p: any) => p.key)
      }
    }

    console.log(`[full-sync] Syncing ${projectKeys.length} projects for year ${yearFilter}`)

    // 3. Fetch ALL issues per project with JQL created >= yearFilter-01-01
    let totalFetched = 0
    let totalUpserted = 0
    const searchUrl = `${base}/rest/api/3/search/jql`
    const fieldsList = ['summary','status','assignee','reporter','issuetype','parent','fixVersions','duedate','labels','components','priority','created','updated','resolution','description']
    const postHeaders = { ...headers, 'Content-Type': 'application/json' }

    const projectNameLookup: Record<string, string> = {}
    const diagnostics: Record<string, any> = {}

    for (const pk of projectKeys) {
      const jql = `project = "${pk}" AND created >= "${yearFilter}-01-01" ORDER BY created ASC`
      console.log(`[full-sync] ${pk}: JQL = ${jql}`)

      const maxResults = 100
      let projectIssues: any[] = []
      let nextPageToken: string | undefined = undefined

      // Paginate using POST /search/jql with cursor tokens
      do {
        const reqBody: Record<string, any> = { jql, fields: fieldsList, maxResults }
        if (nextPageToken) reqBody.nextPageToken = nextPageToken

        const res = await fetch(searchUrl, { method: 'POST', headers: postHeaders, body: JSON.stringify(reqBody) })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.error(`[full-sync] ${pk} Error ${res.status}: ${errText.slice(0, 300)}`)
          diagnostics[pk] = { error: res.status, detail: errText.slice(0, 300) }
          break
        }

        const data = await res.json()
        const issues = Array.isArray(data.issues) ? data.issues : []
        projectIssues = projectIssues.concat(issues)
        totalFetched += issues.length
        nextPageToken = data.nextPageToken || undefined

        console.log(`[full-sync] ${pk}: fetched ${projectIssues.length} issues so far`)
      } while (nextPageToken && projectIssues.length < 10000)

      diagnostics[pk] = { fetched: projectIssues.length }

      // 4. Transform and upsert
      if (projectIssues.length > 0) {
        // Get project name
        if (!projectNameLookup[pk]) {
          try {
            const pRes = await fetch(`${base}/rest/api/3/project/${pk}`, { headers })
            if (pRes.ok) {
              const pData = await pRes.json()
              projectNameLookup[pk] = pData.name
            }
          } catch {}
        }

        function adfToText(node: any): string {
          if (!node) return ''
          if (typeof node === 'string') return node
          if (node.type === 'text') return node.text || ''
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(adfToText).join(node.type === 'paragraph' ? '\n' : '')
          }
          return ''
        }

        function mapStatusCategory(cat: string): string {
          const c = (cat || '').toLowerCase()
          if (c === 'done') return 'Done'
          if (c === 'in progress' || c === 'indeterminate') return 'In Progress'
          return 'To Do'
        }

        function getHierarchyLevel(type: string): number {
          const t = (type || '').toLowerCase()
          if (t === 'epic') return 3
          if (t === 'story' || t === 'bug') return 2
          return 1
        }

        const rows = projectIssues.map((issue: any) => {
          const f = issue.fields
          const descAdf = f.description || null
          const descText = descAdf ? adfToText(descAdf) : null

          return {
            issue_key: issue.key,
            project_key: pk,
            project_name: projectNameLookup[pk] || pk,
            issue_type: f.issuetype?.name || 'Task',
            summary: f.summary || '',
            status: f.status?.name || 'To Do',
            status_category: f.status?.statusCategory?.name || mapStatusCategory(f.status?.statusCategory?.name || ''),
            assignee_account_id: f.assignee?.accountId || null,
            assignee_display_name: f.assignee?.displayName || null,
            reporter_account_id: f.reporter?.accountId || null,
            reporter_display_name: f.reporter?.displayName || null,
            parent_key: f.parent?.key || null,
            parent_summary: f.parent?.fields?.summary || null,
            hierarchy_level: getHierarchyLevel(f.issuetype?.name || ''),
            fix_versions: (f.fixVersions || []).map((v: any) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate })),
            due_date: f.duedate || null,
            labels: f.labels || [],
            components: (f.components || []).map((c: any) => c.name),
            priority: f.priority?.name || 'Medium',
            resolution: f.resolution?.name || null,
            jira_created_at: f.created,
            jira_updated_at: f.updated,
            synced_at: new Date().toISOString(),
            type_icon_url: f.issuetype?.iconUrl || null,
            description_adf: descAdf,
            description_text: descText,
          }
        })
        // ── 2026 GUARDRAIL — only sync items created or updated in 2026+ ──
        .filter((r: any) => {
          const createdYear = r.jira_created_at ? new Date(r.jira_created_at).getFullYear() : null
          const updatedYear = r.jira_updated_at ? new Date(r.jira_updated_at).getFullYear() : null
          return (createdYear !== null && createdYear >= 2026) ||
                 (updatedYear !== null && updatedYear >= 2026)
        })

        // Batch upsert (chunks of 200)
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200)
          const { error } = await supabase
            .from('ph_issues')
            .upsert(chunk, { onConflict: 'issue_key' })
          if (error) {
            console.error(`[full-sync] ${pk} upsert error: ${error.message}`)
          } else {
            totalUpserted += chunk.length
          }
        }

        console.log(`[full-sync] ${pk}: upserted ${projectIssues.length} issues`)
      }
    }

    // 5. Log the sync
    await supabase.from('ph_sync_log').insert({
      sync_type: 'full',
      status: 'success',
      issues_fetched: totalFetched,
      issues_upserted: totalUpserted,
      issues_pruned: 0,
      projects_synced: projectKeys,
      lookback_months: 0,
      jql_query: `Full 2026 sync (${projectKeys.length} projects)`,
      warnings: [],
      duration_ms: Date.now() - startTime,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    })

    // 6. Update connection counts
    await supabase.from('ph_jira_connection').update({
      total_issue_count: totalUpserted,
    }).neq('id', '00000000-0000-0000-0000-000000000000')

    return new Response(JSON.stringify({
      success: true,
      year: yearFilter,
      projects: projectKeys.length,
      fetched: totalFetched,
      upserted: totalUpserted,
      duration_ms: Date.now() - startTime,
      diagnostics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const msg = (error as Error).message
    console.error('[full-sync] Error:', msg)

    await supabase.from('ph_sync_log').insert({
      sync_type: 'full',
      status: 'error',
      error_message: msg,
      issues_fetched: 0,
      issues_upserted: 0,
      duration_ms: Date.now() - startTime,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
