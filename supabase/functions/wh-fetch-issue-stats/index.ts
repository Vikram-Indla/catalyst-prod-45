import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: conn } = await supabase
      .from('wh_jira_connection')
      .select('*')
      .single()

    if (!conn || !conn.site_url || !conn.auth_email || !conn.auth_token_encrypted) {
      return new Response(JSON.stringify({ error: 'Connection not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (conn.status !== 'connected') {
      return new Response(JSON.stringify({ error: 'Jira not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const headers = { 'Authorization': authHeader, 'Accept': 'application/json', 'Content-Type': 'application/json' }

    // Fetch issue counts grouped by issuetype and project using JQL search
    const jql = 'updated >= -90d ORDER BY updated DESC'
    const fetchFields = ['issuetype', 'status', 'project']

    let issuesByType: Record<string, { count: number; statuses: Record<string, number> }> = {}
    let issuesByProject: Record<string, { key: string; count: number; types: Record<string, number>; statuses: Record<string, number> }> = {}
    let apiTotal = 0
    let startAt = 0
    const maxResults = 100
    let hasMore = true

    while (hasMore) {
      const searchApproaches = [
        () => fetch(`${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&startAt=${startAt}&fields=${fetchFields.join(',')}`, { headers }),
        () => fetch(`${base}/rest/api/3/search/jql`, {
          method: 'POST', headers,
          body: JSON.stringify({ jql, maxResults, startAt, fields: fetchFields })
        }),
        () => fetch(`${base}/rest/api/3/search`, {
          method: 'POST', headers,
          body: JSON.stringify({ jql, maxResults, startAt, fields: fetchFields })
        }),
      ]

      let res: Response | null = null
      let body = ''
      for (const attempt of searchApproaches) {
        res = await attempt()
        body = await res.text()
        console.log(`Issue stats attempt: ${res.url} -> ${res.status}`)
        if (res.ok || res.status === 401 || res.status === 403) break
      }

      if (!res || !res.ok) {
        throw new Error(`Jira search failed: ${res?.status} ${body.substring(0, 200)}`)
      }

      const data = JSON.parse(body)
      const issues = data.issues || []
      processIssues(issues, issuesByType)
      processIssuesByProject(issues, issuesByProject)
      apiTotal = data.total || apiTotal
      startAt += maxResults
      // Use processedCount to determine pagination if apiTotal is 0
      const processedCount = Object.values(issuesByType).reduce((sum, t) => sum + t.count, 0)
      hasMore = issues.length === maxResults && startAt < 500
    }

    // Calculate actual scanned count from processed data
    const scannedCount = Object.values(issuesByType).reduce((sum, t) => sum + t.count, 0)
    const totalCount = apiTotal > 0 ? apiTotal : scannedCount

    // Build type summary
    const typeSummary = Object.entries(issuesByType).map(([type, info]) => ({
      type,
      count: info.count,
      statuses: Object.entries(info.statuses).map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.count - a.count)

    // Build project summary
    const projectSummary = Object.entries(issuesByProject).map(([name, info]) => ({
      name,
      key: info.key,
      count: info.count,
      types: Object.entries(info.types).map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      statuses: Object.entries(info.statuses).map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    })).sort((a, b) => b.count - a.count)

    // Aggregate status totals
    const statusTotals: Record<string, number> = {}
    for (const t of typeSummary) {
      for (const s of t.statuses) {
        statusTotals[s.status] = (statusTotals[s.status] || 0) + s.count
      }
    }
    const statusSummary = Object.entries(statusTotals)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    // Update total counts in DB
    await supabase.from('wh_jira_connection').update({
      total_issue_count: totalCount,
    }).eq('id', conn.id)

    return new Response(JSON.stringify({
      success: true,
      total: totalCount,
      scanned: scannedCount,
      types: typeSummary,
      statuses: statusSummary,
      projects: projectSummary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error fetching issue stats:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function processIssues(
  issues: any[],
  issuesByType: Record<string, { count: number; statuses: Record<string, number> }>
) {
  for (const issue of issues) {
    const typeName = issue.fields?.issuetype?.name || 'Unknown'
    const statusName = issue.fields?.status?.name || 'Unknown'

    if (!issuesByType[typeName]) {
      issuesByType[typeName] = { count: 0, statuses: {} }
    }
    issuesByType[typeName].count++
    issuesByType[typeName].statuses[statusName] = (issuesByType[typeName].statuses[statusName] || 0) + 1
  }
}

function processIssuesByProject(
  issues: any[],
  issuesByProject: Record<string, { key: string; count: number; types: Record<string, number>; statuses: Record<string, number> }>
) {
  for (const issue of issues) {
    const projectName = issue.fields?.project?.name || 'Unknown'
    const projectKey = issue.fields?.project?.key || '?'
    const typeName = issue.fields?.issuetype?.name || 'Unknown'
    const statusName = issue.fields?.status?.name || 'Unknown'

    if (!issuesByProject[projectName]) {
      issuesByProject[projectName] = { key: projectKey, count: 0, types: {}, statuses: {} }
    }
    issuesByProject[projectName].count++
    issuesByProject[projectName].types[typeName] = (issuesByProject[projectName].types[typeName] || 0) + 1
    issuesByProject[projectName].statuses[statusName] = (issuesByProject[projectName].statuses[statusName] || 0) + 1
  }
}
