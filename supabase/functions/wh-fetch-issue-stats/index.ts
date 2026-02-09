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

    // Fetch issue counts grouped by issuetype using JQL search
    // We'll use multiple JQL queries to get type+status breakdown
    const jql = 'updated >= -90d ORDER BY updated DESC'

    // Get issue type counts via POST search
    let issuesByType: Record<string, { count: number; statuses: Record<string, number> }> = {}
    let totalCount = 0
    let startAt = 0
    const maxResults = 100
    let hasMore = true

    while (hasMore) {
      const searchRes = await fetch(`${base}/rest/api/3/search/jql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jql,
          maxResults,
          startAt,
          fields: ['issuetype', 'status']
        })
      })

      if (!searchRes.ok) {
        // Fallback to legacy endpoint
        const fallbackRes = await fetch(`${base}/rest/api/2/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            jql,
            maxResults,
            startAt,
            fields: ['issuetype', 'status']
          })
        })
        if (!fallbackRes.ok) {
          const errText = await fallbackRes.text()
          throw new Error(`Jira search failed: ${fallbackRes.status} ${errText.substring(0, 200)}`)
        }
        const data = await fallbackRes.json()
        processIssues(data.issues || [], issuesByType)
        totalCount = data.total || 0
        startAt += maxResults
        hasMore = startAt < totalCount && startAt < 500 // Cap at 500 for performance
        continue
      }

      const data = await searchRes.json()
      processIssues(data.issues || [], issuesByType)
      totalCount = data.total || 0
      startAt += maxResults
      hasMore = startAt < totalCount && startAt < 500
    }

    // Build summary
    const typeSummary = Object.entries(issuesByType).map(([type, info]) => ({
      type,
      count: info.count,
      statuses: Object.entries(info.statuses).map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
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
      scanned: Math.min(startAt, totalCount),
      types: typeSummary,
      statuses: statusSummary,
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
