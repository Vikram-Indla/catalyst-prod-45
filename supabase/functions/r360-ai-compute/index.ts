import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireAuth } from "../_shared/auth-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Auth check
    const auth = await requireAuth(req);
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}))
    const { scope_type, scope_id, sections, week_start, triggered_by } = body

    // If called without specific scope, process queued jobs
    if (!scope_type) {
      return await processQueue()
    }

    if (scope_type === 'resource') {
      await computeResourceAI(scope_id, sections || ['hub_closures', 'delivery_backlog', 'delivery_metrics', 'behavioral_patterns', 'weekly_story'], week_start)
    } else if (scope_type === 'department') {
      await computeDepartmentAI(scope_id, sections || ['health_kpis', 'workload_distribution', 'item_distribution', 'weekly_events', 'resource_leaderboard'], week_start)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid scope_type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, scope_type, scope_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('[r360-ai-compute] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function processQueue() {
  const { data: jobs } = await supabase
    .from('r360_ai_jobs')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(5)

  if (!jobs?.length) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let processed = 0
  for (const job of jobs) {
    await supabase.from('r360_ai_jobs').update({
      status: 'processing', started_at: new Date().toISOString(), attempts: job.attempts + 1
    }).eq('id', job.id)

    try {
      if (job.scope_type === 'resource') {
        await computeResourceAI(job.scope_id, job.sections, job.week_start)
      } else {
        await computeDepartmentAI(job.scope_id, job.sections, job.week_start)
      }
      await supabase.from('r360_ai_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id)
      processed++
    } catch (err: any) {
      const status = job.attempts + 1 >= job.max_attempts ? 'failed' : 'queued'
      await supabase.from('r360_ai_jobs').update({ status, error_message: err.message }).eq('id', job.id)
    }
  }

  return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function computeResourceAI(resourceId: string, sections: string[], weekStart?: string) {
  console.log(`[r360-ai-compute] Computing resource ${resourceId}, sections: ${sections.join(',')}`)

  // Get resource info
  const { data: resource } = await supabase
    .from('resource_inventory')
    .select('id, name, role_name, department_name, jira_account_id')
    .eq('id', resourceId)
    .maybeSingle()

  const label = resource?.name || resourceId

  // Fetch items for this resource from unified view
  let allItems: any[] = []
  if (resource?.jira_account_id) {
    const { data } = await supabase.from('r360_unified_activity_view').select('*').eq('assignee_jira_id', resource.jira_account_id).limit(2000)
    if (data) allItems.push(...data)
  }
  if (resource?.id) {
    const { data } = await supabase.from('r360_unified_activity_view').select('*').eq('assignee_user_id', resource.id).limit(2000)
    if (data) {
      const existingIds = new Set(allItems.map(i => i.item_id))
      allItems.push(...data.filter(i => !existingIds.has(i.item_id)))
    }
  }

  // ── HUB CLOSURES ──
  if (sections.includes('hub_closures')) {
    const hubs: Record<string, { total: number; closed: number }> = {}
    allItems.forEach(item => {
      const hub = item.hub_source || 'Other'
      if (!hubs[hub]) hubs[hub] = { total: 0, closed: 0 }
      hubs[hub].total++
      if (item.status_category === 'done') hubs[hub].closed++
    })
    const result = Object.entries(hubs)
      .map(([hub, c]) => ({ hub, ...c, pct: c.total > 0 ? Math.round((c.closed / c.total) * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
    await upsertCache('resource', resourceId, 'hub_closures', null, result, label)
  }

  // ── DELIVERY BACKLOG ──
  if (sections.includes('delivery_backlog')) {
    const openItems = allItems.filter(i => i.status_category !== 'done')
    const hubs: Record<string, { items: any[] }> = {}
    openItems.forEach(item => {
      const hub = item.hub_source || 'Other'
      if (!hubs[hub]) hubs[hub] = { items: [] }
      hubs[hub].items.push(item)
    })
    const result = Object.entries(hubs)
      .map(([hub, d]) => ({ hub, count: d.items.length, titles: d.items.slice(0, 3).map(i => i.title) }))
      .sort((a, b) => b.count - a.count)
    await upsertCache('resource', resourceId, 'delivery_backlog', null, { hubs: result, total: openItems.length }, label)
  }

  // ── DELIVERY METRICS ──
  if (sections.includes('delivery_metrics')) {
    const doneItems = allItems.filter(i => i.status_category === 'done')
    const subtaskTypes = ['Sub-task', 'Subtask', 'Frontend', 'Backend', 'Sub Task']
    const storyTypes = ['Story', 'Task']
    const bugTypes = ['Bug', 'Defect']

    const avgDays = (items: any[]) => {
      const valid = items.filter(i => i.created_at && i.resolved_at)
      if (!valid.length) return null
      const total = valid.reduce((sum, i) => sum + (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / 86400000, 0)
      return Math.round(total / valid.length * 10) / 10
    }

    await upsertCache('resource', resourceId, 'delivery_metrics', null, {
      avg_subtask_days: avgDays(doneItems.filter(i => subtaskTypes.includes(i.item_type))),
      avg_story_days: avgDays(doneItems.filter(i => storyTypes.includes(i.item_type))),
      avg_bug_days: avgDays(doneItems.filter(i => bugTypes.includes(i.item_type))),
      total_items: allItems.length,
      done_count: doneItems.length,
      in_progress_count: allItems.filter(i => i.status_category === 'in_progress').length,
      todo_count: allItems.filter(i => i.status_category === 'todo').length,
    }, label)
  }

  // ── BEHAVIORAL PATTERNS ──
  if (sections.includes('behavioral_patterns')) {
    // Pull from existing r360_ai_behavioral_patterns if available
    const { data: patterns } = await supabase
      .from('r360_ai_behavioral_patterns')
      .select('pattern_text, evidence_refs')
      .eq('resource_id', resourceId)
      .order('sort_order', { ascending: true })
    await upsertCache('resource', resourceId, 'behavioral_patterns', null, patterns || [], label)
  }

  // ── WEEKLY STORY ──
  if (sections.includes('weekly_story')) {
    const now = new Date()
    for (let w = 0; w < 5; w++) {
      const date = new Date(now)
      date.setDate(date.getDate() - (w * 7))
      const ws = getWeekStart(date)
      const we = getWeekEnd(ws)
      const wsStr = ws.toISOString().split('T')[0]

      const weekItems = allItems.filter(i => {
        const d = new Date(i.updated_at || i.created_at)
        return d >= ws && d <= we
      })

      const done = weekItems.filter(i => i.status_category === 'done')
      const wip = weekItems.filter(i => i.status_category === 'in_progress')
      
      await upsertCache('resource', resourceId, 'weekly_story', wsStr, {
        week_start: wsStr,
        total_activity: weekItems.length,
        done_count: done.length,
        wip_count: wip.length,
        items: weekItems.slice(0, 20).map(i => ({
          key: i.item_id, title: i.title, hub: i.hub_source,
          type: i.item_type, status: i.status, status_category: i.status_category,
        })),
      }, label)
    }
  }

  // Update resource index
  await supabase.from('r360_ai_resource_index').upsert({
    resource_id: resourceId,
    resource_name: label,
    role_name: resource?.role_name || '',
    department: resource?.department_name || 'Unknown',
    has_issues: allItems.length > 0,
    issue_count: allItems.length,
    cache_status: 'fresh',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'resource_id' })
}

async function computeDepartmentAI(department: string, sections: string[], weekStart?: string) {
  console.log(`[r360-ai-compute] Computing department ${department}, sections: ${sections.join(',')}`)

  // Try materialized view first for instant resource list + pre-aggregated stats
  const { data: mvData } = await supabase
    .from('mv_dept_intelligence_stats')
    .select('*')
    .eq('department_name', department)
    .maybeSingle()

  // Get resources in department
  const { data: resources } = await supabase
    .from('resource_inventory')
    .select('id, name, role_name, department_name, jira_account_id')
    .eq('department_name', department)
    .eq('is_active', true)

  if (!resources?.length) {
    console.log(`[r360-ai-compute] No resources found for department: ${department}`)
    return
  }

  // Get pre-computed metrics
  const resourceIds = resources.map(r => r.id)
  const { data: allMetrics } = await supabase
    .from('r360_resource_metrics')
    .select('*')
    .in('resource_id', resourceIds)

  const metricsMap = new Map((allMetrics || []).map(m => [m.resource_id, m]))

  let totalItems = 0, totalDone = 0, totalInProgress = 0, totalTodo = 0

  resources.forEach(r => {
    const m = metricsMap.get(r.id) as any
    if (!m) return
    totalItems += m.total_items || 0
    totalDone += m.done_count || 0
    totalInProgress += m.in_progress_count || 0
    totalTodo += m.todo_count || 0
  })

  // ── HEALTH KPIs ──
  if (sections.includes('health_kpis')) {
    await upsertCache('department', department, 'health_kpis', null, {
      total: totalItems, closed: totalDone, wip: totalInProgress, backlog: totalTodo,
      closure_rate: totalItems > 0 ? Math.round((totalDone / totalItems) * 1000) / 10 : 0,
      resource_count: resources.length,
    }, department)
  }

  // ── WORKLOAD DISTRIBUTION ──
  if (sections.includes('workload_distribution')) {
    const typeAgg: Record<string, number> = {}
    resources.forEach(r => {
      const m = metricsMap.get(r.id) as any
      if (!m?.type_distribution) return
      Object.entries(m.type_distribution as Record<string, number>).forEach(([t, c]) => {
        typeAgg[t] = (typeAgg[t] || 0) + c
      })
    })
    const total = Object.values(typeAgg).reduce((s, v) => s + v, 0) || 1
    const categories = Object.entries(typeAgg)
      .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
    await upsertCache('department', department, 'workload_distribution', null, categories, department)
  }

  // ── ITEM DISTRIBUTION ──
  if (sections.includes('item_distribution')) {
    const byStatus: Record<string, number> = {}
    const byHub: Record<string, number> = {}
    resources.forEach(r => {
      const m = metricsMap.get(r.id) as any
      if (!m) return
      const sd = m.status_distribution as Record<string, number> || {}
      Object.entries(sd).forEach(([s, c]) => { byStatus[s] = (byStatus[s] || 0) + c })
      const hd = m.hub_distribution as Record<string, any> || {}
      Object.entries(hd).forEach(([h, v]: [string, any]) => { byHub[h] = (byHub[h] || 0) + (v.count || 0) })
    })
    await upsertCache('department', department, 'item_distribution', null, { byStatus, byHub }, department)
  }

  // ── WEEKLY EVENTS ──
  if (sections.includes('weekly_events')) {
    const ws = weekStart ? new Date(weekStart) : getWeekStart(new Date())
    const wsStr = ws.toISOString().split('T')[0]
    
    // Build resource summaries for weekly events
    const summaries = resources.map(r => {
      const m = metricsMap.get(r.id) as any
      const dm = m?.delivery_metrics as any || {}
      return {
        name: r.name, role: r.role_name || 'Team Member',
        total_items: m?.total_items || 0, done_count: m?.done_count || 0,
        in_progress_count: m?.in_progress_count || 0,
        weekly_closures: dm.weekly_closure_history || [],
      }
    }).filter(r => r.total_items > 0)

    await upsertCache('department', department, 'weekly_events', wsStr, {
      week_start: wsStr, resource_summaries: summaries,
    }, department)
  }

  // ── RESOURCE LEADERBOARD ──
  if (sections.includes('resource_leaderboard')) {
    const leaderboard = resources.map(r => {
      const m = metricsMap.get(r.id) as any
      if (!m || !m.total_items) return null
      return {
        resource_id: r.id, name: r.name, role: r.role_name || '',
        done: m.done_count || 0, wip: m.in_progress_count || 0, total: m.total_items || 0,
        closure_pct: m.total_items > 0 ? Math.round(((m.done_count || 0) / m.total_items) * 100) : 0,
      }
    }).filter(Boolean).sort((a: any, b: any) => b.done - a.done)

    await upsertCache('department', department, 'resource_leaderboard', null, leaderboard, department)
  }
}

// ── HELPERS ──

async function upsertCache(
  scopeType: string, scopeId: string, section: string,
  weekStart: string | null, data: any, label?: string
) {
  const ttl = weekStart ? 86400000 : 21600000 // 24h weekly, 6h metrics
  await supabase.from('r360_ai_cache').upsert({
    scope_type: scopeType,
    scope_id: scopeId,
    scope_label: label || scopeId,
    section,
    week_start: weekStart,
    data,
    status: 'fresh',
    is_stale: false,
    stale_reason: null,
    stale_at: null,
    computed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + ttl).toISOString(),
  }, { onConflict: 'scope_type,scope_id,section,week_start' })
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay()) // Sunday
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(start: Date): Date {
  const end = new Date(start)
  end.setDate(end.getDate() + 4) // Thursday
  end.setHours(23, 59, 59, 999)
  return end
}
