import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckResult {
  name: string
  passed: boolean
  message: string
  duration_ms: number
  data?: any
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

    await supabase.from('wh_jira_connection')
      .update({ status: 'testing' })
      .eq('id', conn.id)

    const base = conn.site_url.replace(/\/$/, '')
    const authHeader = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const checks: CheckResult[] = []

    // CHECK 1: Authentication
    const c1Start = Date.now()
    try {
      const res = await fetch(`${base}/rest/api/3/myself`, {
        headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
      })
      if (res.ok) {
        const me = await res.json()
        checks.push({
          name: 'Authentication', passed: true,
          message: `Authenticated as ${me.displayName} (${me.emailAddress})`,
          duration_ms: Date.now() - c1Start,
          data: { accountId: me.accountId, displayName: me.displayName }
        })
      } else {
        checks.push({
          name: 'Authentication', passed: false,
          message: `Auth failed: ${res.status} ${res.statusText}`,
          duration_ms: Date.now() - c1Start
        })
      }
    } catch (e) {
      checks.push({
        name: 'Authentication', passed: false,
        message: `Connection error: ${e.message}`,
        duration_ms: Date.now() - c1Start
      })
    }

    // CHECK 2: Project Access
    const c2Start = Date.now()
    let projectCount = 0
    let projects: any[] = []
    if (checks[0].passed) {
      try {
        const res = await fetch(`${base}/rest/api/3/project/search?maxResults=50`, {
          headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          projectCount = data.total || data.values?.length || 0
          projects = (data.values || []).map((p: any) => ({
            key: p.key, name: p.name, type: p.projectTypeKey
          }))
          checks.push({
            name: 'Project Access', passed: true,
            message: `${projectCount} projects accessible`,
            duration_ms: Date.now() - c2Start, data: { count: projectCount }
          })
        } else {
          checks.push({
            name: 'Project Access', passed: false,
            message: `Cannot list projects: ${res.status}`,
            duration_ms: Date.now() - c2Start
          })
        }
      } catch (e) {
        checks.push({
          name: 'Project Access', passed: false,
          message: `Error: ${e.message}`, duration_ms: Date.now() - c2Start
        })
      }
    }

    // CHECK 3: Issue Read
    const c3Start = Date.now()
    if (checks[0].passed) {
      try {
        // Use POST /search/jql (new endpoint) with GET fallbacks
        let res = await fetch(
          `${base}/rest/api/2/search/jql`,
          {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ jql: 'order by updated desc', maxResults: 1, fields: ['summary'] })
          }
        )
        // Fallback: POST to old /search endpoint
        if (!res.ok && res.status !== 401 && res.status !== 403) {
          res = await fetch(
            `${base}/rest/api/2/search`,
            {
              method: 'POST',
              headers: { 'Authorization': authHeader, 'Accept': 'application/json', 'Content-Type': 'application/json' },
              body: JSON.stringify({ jql: 'order by updated desc', maxResults: 1, fields: ['summary'] })
            }
          )
        }
        // Fallback: GET (older instances)
        if (!res.ok && res.status !== 401 && res.status !== 403) {
          res = await fetch(
            `${base}/rest/api/2/search?jql=order+by+updated+desc&maxResults=1&fields=summary`,
            { headers: { 'Authorization': authHeader, 'Accept': 'application/json' } }
          )
        }
        if (res.ok) {
          const data = await res.json()
          checks.push({
            name: 'Issue Read', passed: true,
            message: `Can read issues (${data.total} total)`,
            duration_ms: Date.now() - c3Start
          })
        } else {
          checks.push({
            name: 'Issue Read', passed: false,
            message: `Cannot read issues: ${res.status}`,
            duration_ms: Date.now() - c3Start
          })
        }
      } catch (e) {
        checks.push({
          name: 'Issue Read', passed: false,
          message: `Error: ${e.message}`, duration_ms: Date.now() - c3Start
        })
      }
    }

    // CHECK 4: Version Read
    const c4Start = Date.now()
    if (checks[0].passed && projects.length > 0) {
      try {
        const res = await fetch(
          `${base}/rest/api/3/project/${projects[0].key}/versions`,
          { headers: { 'Authorization': authHeader, 'Accept': 'application/json' } }
        )
        if (res.ok) {
          const data = await res.json()
          checks.push({
            name: 'Version Read', passed: true,
            message: `Can read versions (${data.length} in ${projects[0].key})`,
            duration_ms: Date.now() - c4Start
          })
        } else {
          checks.push({
            name: 'Version Read', passed: false,
            message: `Cannot read versions: ${res.status}`,
            duration_ms: Date.now() - c4Start
          })
        }
      } catch (e) {
        checks.push({
          name: 'Version Read', passed: false,
          message: `Error: ${e.message}`, duration_ms: Date.now() - c4Start
        })
      }
    }

    // CHECK 5: Write Detection
    const c5Start = Date.now()
    if (checks[0].passed) {
      try {
        const res = await fetch(`${base}/rest/api/3/mypermissions?permissions=EDIT_ISSUES`, {
          headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
        })
        if (res.ok) {
          const data = await res.json()
          const canWrite = data.permissions?.EDIT_ISSUES?.havePermission || false
          checks.push({
            name: 'Write Detection', passed: true,
            message: canWrite
              ? 'Write permissions detected (not used in Phase 1)'
              : 'Read-only access confirmed ✓',
            duration_ms: Date.now() - c5Start,
            data: { hasWrite: canWrite }
          })
        } else {
          checks.push({
            name: 'Write Detection', passed: true,
            message: 'Permission check unavailable (read-only assumed)',
            duration_ms: Date.now() - c5Start
          })
        }
      } catch (e) {
        checks.push({
          name: 'Write Detection', passed: true,
          message: 'Permission check skipped',
          duration_ms: Date.now() - c5Start
        })
      }
    }

    const allPassed = checks.every(c => c.passed)
    const permLevel = checks.find(c => c.name === 'Write Detection')?.data?.hasWrite
      ? 'read_write' : 'read_only'

    await supabase.from('wh_jira_connection').update({
      status: allPassed ? 'connected' : 'error',
      last_tested_at: new Date().toISOString(),
      last_test_result: { checks, overall: allPassed ? 'success' : 'failure' },
      project_count: projectCount,
      accessible_projects: projects,
      permissions_level: permLevel,
    }).eq('id', conn.id)

    return new Response(JSON.stringify({ success: allPassed, checks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
