import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { resource_id, jira_account_id, user_id, trigger_ai } = await req.json()
    if (!resource_id) {
      return new Response(JSON.stringify({ error: 'resource_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Resolve assignee identifiers for this resource
    const identifiers: { jira_id: string | null; user_id: string | null } = {
      jira_id: jira_account_id || null,
      user_id: user_id || null,
    }

    // If we have resource_id but not the identifiers, look them up
    if (!identifiers.jira_id && !identifiers.user_id) {
      const { data: res } = await supabase
        .from('resource_inventory')
        .select('id, jira_account_id')
        .eq('id', resource_id)
        .maybeSingle()
      if (res) {
        identifiers.jira_id = res.jira_account_id || null
        identifiers.user_id = res.id || null
      }
    }

    // Query unified view — fetch items assigned to this resource via either jira_id or user_id
    // We need to fetch in two batches to handle the dual-identity model
    let allItems: any[] = []

    if (identifiers.jira_id) {
      const { data: jiraItems } = await supabase
        .from('r360_unified_activity_view')
        .select('*')
        .eq('assignee_jira_id', identifiers.jira_id)
        .limit(2000)
      if (jiraItems) allItems.push(...jiraItems)
    }

    if (identifiers.user_id) {
      const { data: userItems } = await supabase
        .from('r360_unified_activity_view')
        .select('*')
        .eq('assignee_user_id', identifiers.user_id)
        .limit(2000)
      if (userItems) {
        // Deduplicate by item_id
        const existingIds = new Set(allItems.map(i => i.item_id))
        allItems.push(...userItems.filter(i => !existingIds.has(i.item_id)))
      }
    }

    const items = allItems
    const now = new Date()

    // --- Compute metrics ---
    const doneItems = items.filter(i => i.status_category === 'done')
    const progressItems = items.filter(i => i.status_category === 'in_progress')
    const todoItems = items.filter(i => i.status_category === 'todo')

    // Cycle time by type
    const cycleByType: Record<string, number[]> = {}
    doneItems.forEach(i => {
      if (i.created_at && i.resolved_at) {
        const days = (new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0 && days < 365) {
          const type = i.item_type || 'Other'
          if (!cycleByType[type]) cycleByType[type] = []
          cycleByType[type].push(days)
        }
      }
    })

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    const subtaskTypes = ['Sub-task', 'Subtask', 'Frontend', 'Backend', 'Sub Task']
    const storyTypes = ['Story', 'Task']
    const bugTypes = ['Bug', 'Defect']

    const subtaskDays = subtaskTypes.flatMap(t => cycleByType[t] || [])
    const storyDays = storyTypes.flatMap(t => cycleByType[t] || [])
    const bugDays = bugTypes.flatMap(t => cycleByType[t] || [])

    // Weekly closure history (last 12 weeks)
    const weeklyHistory: number[] = []
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000)
      const weekEnd = new Date(now.getTime() - w * 7 * 86400000)
      weeklyHistory.push(doneItems.filter(i => {
        const d = new Date(i.resolved_at || i.updated_at)
        return d >= weekStart && d < weekEnd
      }).length)
    }

    // Pickup speed
    const pickupItems = progressItems.filter(i => i.created_at && i.updated_at)
    const pickupHours = pickupItems.length > 0
      ? pickupItems.reduce((sum, i) => {
          return sum + Math.min((new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 3600000, 720)
        }, 0) / pickupItems.length
      : null

    const deliveryMetrics = {
      avg_subtask_days: avg(subtaskDays),
      avg_story_days: avg(storyDays),
      avg_bug_days: avg(bugDays),
      pickup_speed_hours: pickupHours,
      weekly_closure_history: weeklyHistory,
      total_items: items.length,
      done_count: doneItems.length,
      in_progress_count: progressItems.length,
      todo_count: todoItems.length,
    }

    // Hub distribution
    const hubGroups: Record<string, { total: number; done: number }> = {}
    items.forEach(i => {
      const hub = i.hub_source
      if (!hubGroups[hub]) hubGroups[hub] = { total: 0, done: 0 }
      hubGroups[hub].total++
      if (i.status_category === 'done') hubGroups[hub].done++
    })

    const hubDistribution: Record<string, any> = {}
    const hubClosureRates: Record<string, number> = {}
    Object.entries(hubGroups).forEach(([hub, g]) => {
      hubDistribution[hub] = {
        count: g.total,
        pct: Math.round((g.total / items.length) * 100),
        done: g.done,
        closure_pct: g.total > 0 ? Math.round((g.done / g.total) * 100) : 0,
      }
      hubClosureRates[hub] = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0
    })

    // Status / type / priority distributions
    const statusDist: Record<string, number> = {}
    const typeDist: Record<string, number> = {}
    const priorityDist: Record<string, number> = {}
    items.forEach(i => {
      statusDist[i.status_category] = (statusDist[i.status_category] || 0) + 1
      typeDist[i.item_type || 'Other'] = (typeDist[i.item_type || 'Other'] || 0) + 1
      priorityDist[i.priority || 'None'] = (priorityDist[i.priority || 'None'] || 0) + 1
    })

    // Release standings from fix_versions (Jira items)
    const releaseGroups: Record<string, { name: string; releaseDate: string | null; items: any[] }> = {}
    items.forEach(i => {
      const fvList = Array.isArray(i.fix_versions) ? i.fix_versions : []
      fvList.forEach((fv: any) => {
        if (!fv?.name) return
        const key = fv.id || fv.name
        if (!releaseGroups[key]) releaseGroups[key] = { name: fv.name, releaseDate: fv.releaseDate || null, items: [] }
        releaseGroups[key].items.push(i)
      })
    })

    const releaseStandings = Object.entries(releaseGroups).map(([key, rg]) => {
      const done = rg.items.filter(i => i.status_category === 'done').length
      const total = rg.items.length
      const completionPct = total > 0 ? Math.round((done / total) * 100) : 0
      let verdict = 'on_track'
      if (rg.releaseDate) {
        const daysLeft = (new Date(rg.releaseDate).getTime() - now.getTime()) / 86400000
        const remaining = total - done
        if (daysLeft < 0 && remaining > 0) verdict = 'behind'
        else if (daysLeft < 7 && remaining > 3) verdict = 'at_risk'
        else if (completionPct < 50 && daysLeft < 14) verdict = 'at_risk'
      }
      return { release_key: key, name: rg.name, release_date: rg.releaseDate, total, done, completion_pct: completionPct, verdict }
    })

    // Recent items (last 20 updated)
    const recentItems = [...items]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 20)
      .map(i => ({ item_id: i.item_id, hub: i.hub_source, type: i.item_type, title: i.title, status: i.status, priority: i.priority }))

    // Compute hash for delta detection
    const metricsHash = await computeHash(JSON.stringify({ deliveryMetrics, hubDistribution, statusDist, typeDist, priorityDist }))

    // Check if metrics actually changed
    const { data: existing } = await supabase
      .from('r360_resource_metrics')
      .select('id, metrics_hash, ai_generated_at')
      .eq('resource_id', resource_id)
      .maybeSingle()

    const metricsChanged = !existing || existing.metrics_hash !== metricsHash

    // UPSERT metrics
    const metricsRow = {
      resource_id,
      metrics_hash: metricsHash,
      delivery_metrics: deliveryMetrics,
      hub_distribution: hubDistribution,
      hub_closure_rates: hubClosureRates,
      status_distribution: statusDist,
      type_distribution: typeDist,
      priority_distribution: priorityDist,
      total_items: items.length,
      done_count: doneItems.length,
      in_progress_count: progressItems.length,
      todo_count: todoItems.length,
      weekly_closure_history: weeklyHistory,
      release_standings: releaseStandings,
      recent_items: recentItems,
      computed_at: new Date().toISOString(),
      recompute_needed: false,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      await supabase.from('r360_resource_metrics').update(metricsRow).eq('id', existing.id)
    } else {
      await supabase.from('r360_resource_metrics').insert(metricsRow)
    }

    // If metrics changed and trigger_ai requested, trigger AI generation
    let aiTriggered = false
    if (trigger_ai && metricsChanged) {
      // Call r360-generate-profile with pre-computed data
      try {
        const profileUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/r360-generate-profile`
        await fetch(profileUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resource_id, use_precomputed: true }),
        })
        aiTriggered = true
      } catch (e) {
        console.error('AI trigger error:', e)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      resource_id,
      total_items: items.length,
      hubs_found: Object.keys(hubGroups),
      metrics_changed: metricsChanged,
      ai_triggered: aiTriggered,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Compute metrics error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
