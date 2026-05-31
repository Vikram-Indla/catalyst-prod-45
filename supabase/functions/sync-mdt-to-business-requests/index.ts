/**
 * sync-mdt-to-business-requests
 *
 * Fetches MDT project issues from Jira (created OR updated in 2026) and
 * upserts them into the business_requests table in product-native field format.
 *
 * SUPER STRICT GUARDRAIL: only issues where created >= 2026-01-01 OR
 * updated >= 2026-01-01 are processed. All others are rejected.
 *
 * Upsert key: import_ref = jira issue key (e.g. "MDT-123").
 * product_id is resolved from the products table (code = 'INV').
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JIRA_PROJECT = 'MDT'
const PRODUCT_CODE = 'INV'
const YEAR_CUTOFF = '2026/01/01'

// ── Status mapping: Jira status name → demand_process_steps.value ─────────────
function mapJiraStatusToProcessStep(statusName: string, statusCategory: string): string {
  const s = statusName.toLowerCase()
  if (statusCategory === 'Done' || s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'done'
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('hold') || s.includes('blocked')) return 'on_hold'
  if (s.includes('implementation review') || s.includes('review')) return 'implementation_review'
  if (s.includes('under implementation') || s.includes('in progress') || s.includes('development') ||
      s.includes('ready for implementation') || s.includes('figma') || s.includes('technical validation')) return 'under_implementation'
  if (s.includes('brd preparation') || s.includes('brd under review') || s.includes('brd sign off')) return 'in_review'
  if (s.includes('brd backlog') || s.includes('analyse') || s.includes('analysis')) return 'analysis'
  if (s.includes('demand approved') || s.includes('approved')) return 'demand_approved'
  if (s.includes('in support')) return 'done'
  if (s.includes('backlog') || s.includes('open') || s.includes('to do') || s.includes('new')) return 'new_request'
  return 'new_request'
}

// ── Priority mapping: Jira priority → urgency ─────────────────────────────────
function mapJiraPriority(priority: string | null): string | null {
  if (!priority) return null
  const p = priority.toLowerCase()
  if (p.includes('highest') || p.includes('critical') || p === 'high') return 'High'
  if (p.includes('low') || p.includes('lowest') || p.includes('minor')) return 'Low'
  return 'Normal'
}

// ── Issue type mapping: Jira issuetype → request_type ────────────────────────
function mapIssueType(issueType: string | null): string | null {
  if (!issueType) return null
  const t = issueType.toLowerCase()
  if (t.includes('gap') || t.includes('defect') || t.includes('bug')) return 'gap'
  if (t.includes('integration') || t.includes('api') || t.includes('connect')) return 'integration'
  if (t.includes('data') || t.includes('report') || t.includes('analytics')) return 'data_request'
  return 'feature'
}

// ── 2026 guardrail ─────────────────────────────────────────────────────────────
function isIn2026(created: string | null, updated: string | null): boolean {
  const cutoff = new Date('2026-01-01T00:00:00Z').getTime()
  const c = created ? new Date(created).getTime() : 0
  const u = updated ? new Date(updated).getTime() : 0
  return c >= cutoff || u >= cutoff
}

// ── Generate next MIM-XXX key ─────────────────────────────────────────────────
async function getNextRequestKey(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('business_requests')
    .select('request_key')
    .like('request_key', 'MIM-%')
    .not('request_key', 'is', null)
    .limit(2000)
  let maxNum = 0
  ;(data || []).forEach((row: any) => {
    const m = row.request_key?.match(/MIM-(\d+)/)
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10))
  })
  return `MIM-${String(maxNum + 1).padStart(3, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // 1. Get Jira connection credentials (proven pattern from wh-jira-bulk-sync)
    const { data: conn } = await supabase.from('ph_jira_connection').select('*').single()
    if (!conn || conn.status !== 'connected') {
      return new Response(JSON.stringify({ ok: false, error: 'Jira not connected. Configure via Admin → Jira Connection.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const base = conn.site_url.replace(/\/$/, '')
    const auth = 'Basic ' + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`)
    const postHeaders = {
      'Authorization': auth, 'Accept': 'application/json', 'Content-Type': 'application/json',
    }

    // 2. Resolve INV product UUID
    const { data: product } = await supabase
      .from('products').select('id').eq('code', PRODUCT_CODE).eq('is_active', true).maybeSingle()
    if (!product?.id) {
      return new Response(JSON.stringify({ ok: false, error: `Product ${PRODUCT_CODE} not found in products table.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const productId = product.id

    // 3. Load existing import_ref set to avoid re-fetching keys
    const { data: existingRows } = await supabase
      .from('business_requests').select('import_ref').not('import_ref', 'is', null)
    const existingRefs = new Set<string>((existingRows || []).map((r: any) => r.import_ref))

    // 4. Query Jira MDT project — 2026 window, exclude sub-tasks
    const jql = `project = "${JIRA_PROJECT}" AND (created >= "${YEAR_CUTOFF}" OR updated >= "${YEAR_CUTOFF}") AND issueType != "Sub-task" ORDER BY updated DESC`
    const fields = [
      'summary', 'description', 'status', 'priority', 'issuetype',
      'assignee', 'reporter', 'created', 'updated', 'duedate', 'labels', 'comment',
    ]

    let allIssues: any[] = []
    let nextPageToken: string | undefined

    do {
      const body: Record<string, any> = { jql, fields, maxResults: 100 }
      if (nextPageToken) body.nextPageToken = nextPageToken

      const res = await fetch(`${base}/rest/api/3/search/jql`, {
        method: 'POST', headers: postHeaders, body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => '')
        throw new Error(`Jira search failed (${res.status}): ${err.slice(0, 300)}`)
      }

      const data = await res.json()
      allIssues = allIssues.concat(Array.isArray(data.issues) ? data.issues : [])
      nextPageToken = data.nextPageToken || undefined
    } while (nextPageToken && allIssues.length < 5000)

    console.log(`[mdt-sync] Fetched ${allIssues.length} MDT issues from Jira`)

    // 5. Apply 2026 guardrail and map to business_requests format
    let inserted = 0, updated = 0, skipped = 0, rejected = 0

    for (const issue of allIssues) {
      const f = issue.fields
      const created = f.created ?? null
      const updatedAt = f.updated ?? null

      // GUARDRAIL: reject pre-2026 issues
      if (!isIn2026(created, updatedAt)) {
        rejected++
        console.log(`[mdt-sync] REJECTED ${issue.key}: outside 2026 window (created=${created}, updated=${updatedAt})`)
        continue
      }

      const processStep = mapJiraStatusToProcessStep(
        f.status?.name ?? '', f.status?.statusCategory?.name ?? '',
      )
      const urgency = mapJiraPriority(f.priority?.name ?? null)
      const requestType = mapIssueType(f.issuetype?.name ?? null)
      const title = (f.summary ?? '').slice(0, 255)

      // Stringify description ADF (store as JSON string for rich text rendering)
      let description: string | null = null
      if (f.description && typeof f.description === 'object') {
        description = JSON.stringify(f.description)
      } else if (typeof f.description === 'string') {
        description = f.description
      }

      const row = {
        title,
        description,
        process_step: processStep,
        urgency,
        request_type: requestType,
        end_date: f.duedate ?? null,
        import_source: 'jira',
        import_ref: issue.key,    // MDT-123 — upsert key
        product_id: productId,
        // Preserve creation timestamp from Jira
        created_at: created,
        updated_at: updatedAt,
      }

      if (existingRefs.has(issue.key)) {
        // Update existing — keep request_key, only refresh mutable fields
        const { error } = await supabase
          .from('business_requests')
          .update({
            title: row.title,
            description: row.description,
            process_step: row.process_step,
            urgency: row.urgency,
            request_type: row.request_type,
            end_date: row.end_date,
            updated_at: row.updated_at,
          })
          .eq('import_ref', issue.key)

        if (error) {
          console.error(`[mdt-sync] UPDATE failed for ${issue.key}:`, error.message)
        } else {
          updated++
        }
      } else {
        // Insert new — generate MIM-XXX key
        const requestKey = await getNextRequestKey(supabase)
        const { error } = await supabase.from('business_requests').insert({
          ...row,
          request_key: requestKey,
          health: 'on_track',
          is_force_ranked: false,
          progress: 0,
        })

        if (error) {
          console.error(`[mdt-sync] INSERT failed for ${issue.key}:`, error.message)
        } else {
          inserted++
          existingRefs.add(issue.key) // prevent duplicate on next iteration
        }
      }
    }

    const summary = {
      ok: true,
      project: JIRA_PROJECT,
      total_fetched: allIssues.length,
      inserted,
      updated,
      skipped,
      rejected,
      product_id: productId,
    }
    console.log('[mdt-sync] Done:', JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('[mdt-sync] Fatal error:', err)
    return new Response(JSON.stringify({ ok: false, error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
