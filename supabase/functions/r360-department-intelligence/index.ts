import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { department_name } = await req.json()
    if (!department_name) {
      return new Response(JSON.stringify({ error: 'department_name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get all active resources in this department
    const { data: deptResources, error: deptErr } = await supabase
      .from('resource_inventory')
      .select('id, rid, name, role_name, jira_account_id, department_name')
      .eq('is_active', true)

    if (deptErr) throw deptErr

    // Filter by department_name (could be stored in department_id or department_name)
    // Also resolve department via capacity_departments
    const { data: depts } = await supabase.from('capacity_departments').select('id, name')
    const deptIdMap = new Map((depts || []).map((d: any) => [d.id, d.name]))

    const resources = (deptResources || []).filter((r: any) => {
      const resolvedDept = r.department_name || deptIdMap.get(r.department_id) || null
      return resolvedDept === department_name
    })

    if (resources.length === 0) {
      return new Response(JSON.stringify({ error: `No active resources found in department: ${department_name}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Fetch pre-computed metrics for all resources in department
    const resourceIds = resources.map((r: any) => r.id)
    const { data: allMetrics } = await supabase
      .from('r360_resource_metrics')
      .select('*')
      .in('resource_id', resourceIds)

    // 3. Fetch behavioral patterns for all resources
    const { data: allPatterns } = await supabase
      .from('r360_ai_behavioral_patterns')
      .select('*')
      .in('resource_id', resourceIds)
      .order('sort_order', { ascending: true })

    // 4. Aggregate metrics across department
    const metricsMap = new Map((allMetrics || []).map((m: any) => [m.resource_id, m]))
    
    let totalItems = 0, totalDone = 0, totalInProgress = 0, totalTodo = 0
    const hubAgg: Record<string, { total: number; done: number }> = {}
    const typeAgg: Record<string, number> = {}
    const priorityAgg: Record<string, number> = {}
    const weeklyAgg: number[] = new Array(12).fill(0)
    const allSubtaskDays: number[] = []
    const allStoryDays: number[] = []
    const allBugDays: number[] = []
    const allPickupHours: number[] = []

    const resourceSummaries: any[] = []

    for (const res of resources) {
      const m = metricsMap.get(res.id)
      if (!m) continue

      totalItems += m.total_items || 0
      totalDone += m.done_count || 0
      totalInProgress += m.in_progress_count || 0
      totalTodo += m.todo_count || 0

      const dm = m.delivery_metrics as any || {}
      if (dm.avg_subtask_days != null) allSubtaskDays.push(dm.avg_subtask_days)
      if (dm.avg_story_days != null) allStoryDays.push(dm.avg_story_days)
      if (dm.avg_bug_days != null) allBugDays.push(dm.avg_bug_days)
      if (dm.pickup_speed_hours != null) allPickupHours.push(dm.pickup_speed_hours)

      const wh = dm.weekly_closure_history || []
      wh.forEach((v: number, i: number) => { if (i < 12) weeklyAgg[i] += v })

      const hd = m.hub_distribution as Record<string, any> || {}
      Object.entries(hd).forEach(([hub, v]: [string, any]) => {
        if (!hubAgg[hub]) hubAgg[hub] = { total: 0, done: 0 }
        hubAgg[hub].total += v.count || 0
        hubAgg[hub].done += v.done || 0
      })

      const td = m.type_distribution as Record<string, number> || {}
      Object.entries(td).forEach(([t, c]) => { typeAgg[t] = (typeAgg[t] || 0) + c })

      const pd = m.priority_distribution as Record<string, number> || {}
      Object.entries(pd).forEach(([p, c]) => { priorityAgg[p] = (priorityAgg[p] || 0) + c })

      // Per-resource summary for grouped weekly story
      const resPatterns = (allPatterns || []).filter((p: any) => p.resource_id === res.id)
      resourceSummaries.push({
        name: res.name,
        role: res.role_name || 'Team Member',
        rid: res.rid,
        total_items: m.total_items || 0,
        done_count: m.done_count || 0,
        in_progress_count: m.in_progress_count || 0,
        weekly_closures: dm.weekly_closure_history || [],
        patterns: resPatterns.map((p: any) => p.pattern_text),
      })
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

    const hubDistribution: Record<string, any> = {}
    Object.entries(hubAgg).forEach(([hub, g]) => {
      hubDistribution[hub] = {
        count: g.total,
        pct: totalItems > 0 ? Math.round((g.total / totalItems) * 100) : 0,
        done: g.done,
        closure_pct: g.total > 0 ? Math.round((g.done / g.total) * 100) : 0,
      }
    })

    const aggregatedMetrics = {
      total_items: totalItems,
      done_count: totalDone,
      in_progress_count: totalInProgress,
      todo_count: totalTodo,
      avg_subtask_days: avg(allSubtaskDays),
      avg_story_days: avg(allStoryDays),
      avg_bug_days: avg(allBugDays),
      pickup_speed_hours: avg(allPickupHours),
      weekly_closure_history: weeklyAgg,
      hub_distribution: hubDistribution,
      type_distribution: typeAgg,
      priority_distribution: priorityAgg,
      resource_count: resources.length,
      resources_with_metrics: (allMetrics || []).length,
    }

    // 5. Generate AI narrative via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    const hubDesc = Object.entries(hubDistribution).map(([hub, v]: [string, any]) => `${hub}: ${v.count} items, ${v.closure_pct}% closed`).join(', ')
    const resourceDesc = resourceSummaries.map(r => `- ${r.name} (${r.role}): ${r.total_items} items, ${r.done_count} done, ${r.in_progress_count} in progress`).join('\n')

    const aiPrompt = `You are an enterprise workforce analytics AI specializing in department-level intelligence. Analyze this department's aggregated metrics and generate structured insights.

DEPARTMENT: ${department_name}
TEAM SIZE: ${resources.length} resources
RESOURCES WITH DATA: ${(allMetrics || []).length}

AGGREGATED TOTALS: ${totalItems} items (${totalDone} done, ${totalInProgress} in progress, ${totalTodo} todo)
CLOSURE RATE: ${totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0}%

HUB DISTRIBUTION: ${hubDesc}
TYPE DISTRIBUTION: ${JSON.stringify(typeAgg)}
PRIORITY DISTRIBUTION: ${JSON.stringify(priorityAgg)}

DELIVERY METRICS (department averages):
- Avg Subtask: ${avg(allSubtaskDays)?.toFixed(1) || 'N/A'} days
- Avg Story: ${avg(allStoryDays)?.toFixed(1) || 'N/A'} days
- Avg Bug: ${avg(allBugDays)?.toFixed(1) || 'N/A'} days
- Pickup Speed: ${avg(allPickupHours)?.toFixed(0) || 'N/A'} hours
- Weekly closures (last 12w): ${weeklyAgg.join(', ')}

TEAM BREAKDOWN:
${resourceDesc}

Return a JSON object using this tool. Write in a cinematic executive voice — authoritative, vivid, Spielberg-like prose. Think McKinsey partner briefing a CIO.`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an enterprise workforce analytics AI. Generate structured JSON insights for department-level analysis. Write in a cinematic executive voice.' },
          { role: 'user', content: aiPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_department_profile',
            description: 'Generate a comprehensive department intelligence profile with patterns, team insights, and performance analysis',
            parameters: {
              type: 'object',
              properties: {
                department_pattern: { type: 'string', description: 'A 3-4 sentence executive summary of the department work pattern, velocity, strengths, and areas of concern. Third person, cinematic voice.' },
                delivery_summary: { type: 'string', description: 'A 2-3 sentence analysis of department-wide delivery performance, throughput trends, and bottlenecks.' },
                strength_analysis: { type: 'string', description: 'A 2-3 sentence analysis of the department\'s core strengths and competitive advantages.' },
                risk_assessment: { type: 'string', description: 'A 2-3 sentence risk assessment covering capacity, delivery, and quality concerns.' },
                behavioral_patterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern_text: { type: 'string', description: 'A specific department-wide behavioral observation (1-2 sentences)' },
                      evidence_refs: { type: 'array', items: { type: 'string' }, description: 'Resource names or metrics supporting this pattern' },
                    },
                    required: ['pattern_text', 'evidence_refs'],
                    additionalProperties: false,
                  },
                  description: '5-8 department-level behavioral patterns'
                },
                team_dynamics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      observation: { type: 'string', description: 'An observation about team composition, workload balance, or collaboration' },
                      recommendation: { type: 'string', description: 'A specific actionable recommendation' },
                    },
                    required: ['observation', 'recommendation'],
                    additionalProperties: false,
                  },
                  description: '3-5 team dynamics observations with recommendations'
                },
                workload_distribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { label: { type: 'string' }, pct: { type: 'number' } },
                    required: ['label', 'pct'],
                    additionalProperties: false,
                  },
                  description: 'Department workload distribution by category (percentages sum to 100)'
                },
              },
              required: ['department_pattern', 'delivery_summary', 'strength_analysis', 'risk_assessment', 'behavioral_patterns', 'team_dynamics', 'workload_distribution'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_department_profile' } },
      }),
    })

    if (!aiResponse.ok) {
      const status = aiResponse.status
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const errText = await aiResponse.text()
      console.error('AI error:', status, errText)
      throw new Error(`AI gateway error: ${status}`)
    }

    const aiData = await aiResponse.json()
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall?.function?.arguments) throw new Error('AI did not return structured output')
    const aiResult = JSON.parse(toolCall.function.arguments)

    return new Response(JSON.stringify({
      success: true,
      department_name,
      metrics: aggregatedMetrics,
      resource_summaries: resourceSummaries,
      ai: aiResult,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Department intelligence error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
