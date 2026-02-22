import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { resource_id, rid } = await req.json()
    if (!resource_id || !rid) {
      return new Response(JSON.stringify({ error: 'resource_id and rid are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get resource info
    const { data: resource } = await supabase
      .from('resource_inventory')
      .select('rid, name, role_name, jira_account_id, department_name')
      .eq('rid', rid)
      .single()

    if (!resource?.jira_account_id) {
      return new Response(JSON.stringify({ error: 'Resource has no Jira account linked' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch all work items for this resource from ph_issues
    const { data: issues, error: issuesErr } = await supabase
      .from('ph_issues')
      .select('issue_key, project_key, project_name, issue_type, summary, status, status_category, priority, parent_key, parent_summary, fix_versions, due_date, effective_due_date, story_points, jira_created_at, jira_updated_at, labels, components, description_text')
      .eq('assignee_account_id', resource.jira_account_id)
      .order('jira_updated_at', { ascending: false })

    if (issuesErr) throw issuesErr
    const items = issues || []

    if (items.length < 5) {
      return new Response(JSON.stringify({ error: 'Insufficient data', count: items.length }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Compute delivery metrics
    const now = new Date()
    const doneItems = items.filter((i: any) => i.status_category === 'Done')
    const todoItems = items.filter((i: any) => i.status_category === 'To Do')
    const progressItems = items.filter((i: any) => i.status_category === 'In Progress')

    // Avg cycle time by type (approximated from created -> updated for done items)
    const cycleByType: Record<string, number[]> = {}
    doneItems.forEach((i: any) => {
      if (i.jira_created_at && i.jira_updated_at) {
        const days = (new Date(i.jira_updated_at).getTime() - new Date(i.jira_created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (days >= 0 && days < 365) {
          const type = i.issue_type || 'Other'
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
      const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000)
      const count = doneItems.filter((i: any) => {
        const d = new Date(i.jira_updated_at)
        return d >= weekStart && d < weekEnd
      }).length
      weeklyHistory.push(count)
    }

    // Pickup speed (time from created to first status change — approximate using created vs updated for in-progress)
    const pickupItems = progressItems.filter((i: any) => i.jira_created_at && i.jira_updated_at)
    const pickupHours = pickupItems.length > 0
      ? pickupItems.reduce((sum: number, i: any) => {
          const hours = (new Date(i.jira_updated_at).getTime() - new Date(i.jira_created_at).getTime()) / (1000 * 60 * 60)
          return sum + Math.min(hours, 720) // cap at 30 days
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

    // 4. Compute hub distribution (all items are from ProjectHub/Jira)
    const projectGroups: Record<string, { total: number; done: number }> = {}
    items.forEach((i: any) => {
      const pk = i.project_name || i.project_key || 'Unknown'
      if (!projectGroups[pk]) projectGroups[pk] = { total: 0, done: 0 }
      projectGroups[pk].total++
      if (i.status_category === 'Done') projectGroups[pk].done++
    })

    const hubDistribution: Record<string, any> = {}
    const hubClosureRates: Record<string, number> = {}
    Object.entries(projectGroups).forEach(([pk, g]) => {
      hubDistribution[pk] = {
        count: g.total,
        pct: Math.round((g.total / items.length) * 100),
        done: g.done,
        closure_pct: g.total > 0 ? Math.round((g.done / g.total) * 100) : 0,
      }
      hubClosureRates[pk] = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0
    })

    // 5. Compute release standings
    const releaseGroups: Record<string, { name: string; releaseDate: string | null; items: any[]; projects: Record<string, { total: number; done: number }> }> = {}
    items.forEach((i: any) => {
      const fvList = Array.isArray(i.fix_versions) ? i.fix_versions : []
      fvList.forEach((fv: any) => {
        if (!fv?.name) return
        if (!releaseGroups[fv.id]) {
          releaseGroups[fv.id] = { name: fv.name, releaseDate: fv.releaseDate || null, items: [], projects: {} }
        }
        releaseGroups[fv.id].items.push(i)
        const pk = i.project_name || i.project_key || 'Unknown'
        if (!releaseGroups[fv.id].projects[pk]) releaseGroups[fv.id].projects[pk] = { total: 0, done: 0 }
        releaseGroups[fv.id].projects[pk].total++
        if (i.status_category === 'Done') releaseGroups[fv.id].projects[pk].done++
      })
    })

    // 6. Call Lovable AI for narrative generation
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    // Build context for AI
    const issueTypeDist: Record<string, number> = {}
    const statusDist: Record<string, number> = {}
    const priorityDist: Record<string, number> = {}
    items.forEach((i: any) => {
      issueTypeDist[i.issue_type] = (issueTypeDist[i.issue_type] || 0) + 1
      statusDist[i.status_category] = (statusDist[i.status_category] || 0) + 1
      priorityDist[i.priority] = (priorityDist[i.priority] || 0) + 1
    })

    const recentItems = items.slice(0, 20).map((i: any) => `${i.issue_key}: ${i.summary} (${i.issue_type}, ${i.status}, ${i.priority})`).join('\n')

    const aiPrompt = `You are an enterprise workforce analytics AI. Analyze this resource's work data and generate structured insights.

RESOURCE: ${resource.name}
ROLE: ${resource.role_name || 'Team Member'}
DEPARTMENT: ${resource.department_name || 'Unknown'}

WORK STATS (${items.length} total items):
- Status: ${JSON.stringify(statusDist)}
- Issue Types: ${JSON.stringify(issueTypeDist)}  
- Priority: ${JSON.stringify(priorityDist)}
- Projects: ${JSON.stringify(Object.entries(projectGroups).map(([k, v]) => `${k}: ${v.total} items, ${v.done} done`))}

DELIVERY METRICS:
- Avg Subtask: ${deliveryMetrics.avg_subtask_days?.toFixed(1) || 'N/A'} days
- Avg Story: ${deliveryMetrics.avg_story_days?.toFixed(1) || 'N/A'} days
- Avg Bug: ${deliveryMetrics.avg_bug_days?.toFixed(1) || 'N/A'} days
- Weekly closures (last 12w): ${weeklyHistory.join(', ')}

RECENT ITEMS:
${recentItems}

Return a JSON object using this tool.`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an enterprise workforce analytics AI. Generate structured JSON insights.' },
          { role: 'user', content: aiPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_resource_profile',
            description: 'Generate a comprehensive resource profile with patterns, behavioral insights, and role analysis',
            parameters: {
              type: 'object',
              properties: {
                resource_pattern: {
                  type: 'string',
                  description: 'A 2-3 sentence summary of this resource\'s work pattern, strengths, and focus areas. Written in third person.'
                },
                delivery_summary: {
                  type: 'string',
                  description: 'A 1-2 sentence summary of delivery performance and velocity trends.'
                },
                strength_analysis: {
                  type: 'string',
                  description: 'A 1-2 sentence analysis of core strengths based on the data.'
                },
                behavioral_patterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern_text: { type: 'string', description: 'A specific behavioral observation (1-2 sentences)' },
                      evidence_refs: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Array of 1-3 issue keys that support this pattern'
                      },
                    },
                    required: ['pattern_text', 'evidence_refs'],
                    additionalProperties: false,
                  },
                  description: '4-6 behavioral patterns observed from the data'
                },
                role_expected: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-5 expected duties for this role'
                },
                role_actual_distribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      pct: { type: 'number' },
                    },
                    required: ['label', 'pct'],
                    additionalProperties: false,
                  },
                  description: 'Actual work distribution by category (percentages should sum to 100)'
                },
                role_anomalies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '0-2 anomalies where actual work differs from expected role duties'
                },
              },
              required: ['resource_pattern', 'delivery_summary', 'strength_analysis', 'behavioral_patterns', 'role_expected', 'role_actual_distribution', 'role_anomalies'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_resource_profile' } },
      }),
    })

    if (!aiResponse.ok) {
      const status = aiResponse.status
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const errText = await aiResponse.text()
      console.error('AI error:', status, errText)
      throw new Error(`AI gateway error: ${status}`)
    }

    const aiData = await aiResponse.json()
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall?.function?.arguments) {
      throw new Error('AI did not return structured output')
    }

    const aiResult = JSON.parse(toolCall.function.arguments)

    // 7. Upsert r360_ai_profiles
    const profileRow = {
      resource_id: resource_id,
      resource_pattern: aiResult.resource_pattern,
      delivery_summary: aiResult.delivery_summary || null,
      strength_analysis: aiResult.strength_analysis || null,
      delivery_metrics: deliveryMetrics,
      hub_distribution: hubDistribution,
      hub_closure_rates: hubClosureRates,
      role_expectation: {
        expected: aiResult.role_expected,
        actual_distribution: aiResult.role_actual_distribution,
        anomalies: aiResult.role_anomalies,
      },
      generated_at: new Date().toISOString(),
      generation_version: '2.0',
      next_refresh_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Check if exists
    const { data: existing } = await supabase
      .from('r360_ai_profiles')
      .select('id')
      .eq('resource_id', resource_id)
      .maybeSingle()

    if (existing) {
      const { error: upErr } = await supabase.from('r360_ai_profiles')
        .update(profileRow)
        .eq('id', existing.id)
      if (upErr) { console.error('Profile update error:', JSON.stringify(upErr)); throw upErr }
    } else {
      const { error: insErr } = await supabase.from('r360_ai_profiles')
        .insert(profileRow)
      if (insErr) { console.error('Profile insert error:', JSON.stringify(insErr)); throw insErr }
    }

    // 8. Upsert behavioral patterns (delete old, insert new)
    await supabase.from('r360_ai_behavioral_patterns')
      .delete()
      .eq('resource_id', resource_id)

    const patternRows = (aiResult.behavioral_patterns || []).map((p: any, i: number) => ({
      resource_id: resource_id,
      pattern_text: p.pattern_text,
      evidence_refs: p.evidence_refs || [],
      sort_order: i + 1,
    }))

    if (patternRows.length > 0) {
      await supabase.from('r360_ai_behavioral_patterns').insert(patternRows)
    }

    // 9. Upsert release standings
    for (const [fvId, rg] of Object.entries(releaseGroups)) {
      const rgItems = rg.items
      const rgDone = rgItems.filter((i: any) => i.status_category === 'Done').length
      const rgProgress = rgItems.filter((i: any) => i.status_category === 'In Progress').length
      const rgTodo = rgItems.filter((i: any) => i.status_category === 'To Do').length
      const completionPct = rgItems.length > 0 ? Math.round((rgDone / rgItems.length) * 100) : 0

      // Compute verdict
      let verdict = 'on_track'
      if (rg.releaseDate) {
        const daysLeft = (new Date(rg.releaseDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        const remaining = rgItems.length - rgDone
        if (daysLeft < 0 && remaining > 0) verdict = 'behind'
        else if (daysLeft < 7 && remaining > 3) verdict = 'at_risk'
        else if (completionPct < 50 && daysLeft < 14) verdict = 'at_risk'
      }

      const projectStandings = Object.entries(rg.projects).map(([proj, pg]) => ({
        project: proj,
        items: pg.total,
        done: pg.done,
        statusEmoji: pg.done === pg.total ? '✅' : pg.done > 0 ? '🔄' : '⏳',
      }))

      // Critical path: in-progress items with high priority
      const criticalItems = rgItems
        .filter((i: any) => i.status_category !== 'Done' && (i.priority === 'High' || i.priority === 'Highest'))
        .slice(0, 3)
        .map((i: any) => i.issue_key)

      // We need a release UUID. Check ph_versions for this fix version
      const { data: versionRow } = await supabase
        .from('ph_versions')
        .select('id')
        .eq('jira_id', fvId)
        .maybeSingle()

      // If we can't map to a release UUID, use a deterministic UUID from the jira fv id
      const releaseUuid = versionRow?.id || crypto.randomUUID()

      // Delete old standing for this resource + release
      if (versionRow?.id) {
        await supabase.from('r360_ai_release_standings')
          .delete()
          .eq('resource_id', resource_id)
          .eq('release_id', releaseUuid)
      }

      await supabase.from('r360_ai_release_standings').insert({
        resource_id: resource_id,
        release_id: releaseUuid,
        total_items: rgItems.length,
        done_count: rgDone,
        progress_count: rgProgress,
        todo_count: rgTodo,
        completion_pct: completionPct,
        project_standings: projectStandings,
        critical_path_items: criticalItems,
        verdict,
        verdict_text: verdict === 'on_track' ? 'On Track' : verdict === 'at_risk' ? 'At Risk' : 'Behind Schedule',
        confidence_score: Math.min(100, Math.round((rgItems.length / 5) * 20)),
        current_closure_rate: weeklyHistory.length > 0 ? avg(weeklyHistory.slice(-4)) : 0,
        required_closure_rate: rg.releaseDate
          ? Math.max(0, (rgItems.length - rgDone) / Math.max(1, (new Date(rg.releaseDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)))
          : 0,
        snapshot_date: now.toISOString().split('T')[0],
      })
    }

    return new Response(JSON.stringify({
      success: true,
      items_analyzed: items.length,
      patterns_generated: patternRows.length,
      releases_analyzed: Object.keys(releaseGroups).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('r360-generate-profile error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
