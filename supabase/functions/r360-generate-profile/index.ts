import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { resource_id, rid, use_precomputed } = await req.json()
    if (!resource_id) {
      return new Response(JSON.stringify({ error: 'resource_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get resource info
    const lookupField = rid ? 'rid' : 'id'
    const lookupValue = rid || resource_id
    const { data: resource } = await supabase
      .from('resource_inventory')
      .select('id, rid, name, role_name, jira_account_id, department_name')
      .eq(lookupField, lookupValue)
      .single()

    if (!resource) {
      return new Response(JSON.stringify({ error: 'Resource not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get pre-computed metrics (or compute them first)
    let { data: metrics } = await supabase
      .from('r360_resource_metrics')
      .select('*')
      .eq('resource_id', resource_id)
      .maybeSingle()

    if (!metrics) {
      // Trigger compute first
      const computeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/r360-compute-metrics`
      const computeRes = await fetch(computeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resource_id,
          jira_account_id: resource.jira_account_id,
          user_id: resource.id,
        }),
      })

      if (!computeRes.ok) {
        const errText = await computeRes.text()
        throw new Error(`Compute failed: ${errText}`)
      }

      // Re-fetch
      const { data: freshMetrics } = await supabase
        .from('r360_resource_metrics')
        .select('*')
        .eq('resource_id', resource_id)
        .maybeSingle()
      metrics = freshMetrics
    }

    if (!metrics || metrics.total_items < 5) {
      return new Response(JSON.stringify({ error: 'Insufficient data', count: metrics?.total_items || 0 }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Call LLM using pre-computed metrics (no raw data queries needed)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured')

    const dm = metrics.delivery_metrics as any
    const recentDesc = (metrics.recent_items as any[] || []).map((i: any) => `${i.item_id}: ${i.title} (${i.hub}/${i.type}, ${i.status})`).join('\n')
    const hubDesc = Object.entries(metrics.hub_distribution as Record<string, any>).map(([hub, v]: [string, any]) => `${hub}: ${v.count} items, ${v.closure_pct}% closed`).join(', ')

    const aiPrompt = `You are an enterprise workforce analytics AI. Analyze this resource's pre-computed metrics and generate structured insights.

RESOURCE: ${resource.name}
ROLE: ${resource.role_name || 'Team Member'}
DEPARTMENT: ${resource.department_name || 'Unknown'}

TOTALS: ${metrics.total_items} items (${metrics.done_count} done, ${metrics.in_progress_count} in progress, ${metrics.todo_count} todo)

HUB DISTRIBUTION: ${hubDesc}
TYPE DISTRIBUTION: ${JSON.stringify(metrics.type_distribution)}
PRIORITY DISTRIBUTION: ${JSON.stringify(metrics.priority_distribution)}

DELIVERY METRICS:
- Avg Subtask: ${dm.avg_subtask_days?.toFixed(1) || 'N/A'} days
- Avg Story: ${dm.avg_story_days?.toFixed(1) || 'N/A'} days
- Avg Bug: ${dm.avg_bug_days?.toFixed(1) || 'N/A'} days
- Pickup Speed: ${dm.pickup_speed_hours?.toFixed(0) || 'N/A'} hours
- Weekly closures (last 12w): ${(dm.weekly_closure_history || []).join(', ')}

RECENT ITEMS:
${recentDesc}

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
                resource_pattern: { type: 'string', description: 'A 2-3 sentence summary of work pattern, strengths, and focus areas. Third person.' },
                delivery_summary: { type: 'string', description: 'A 1-2 sentence summary of delivery performance and velocity trends.' },
                strength_analysis: { type: 'string', description: 'A 1-2 sentence analysis of core strengths.' },
                behavioral_patterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern_text: { type: 'string', description: 'A specific behavioral observation (1-2 sentences)' },
                      evidence_refs: { type: 'array', items: { type: 'string' }, description: '1-3 issue keys supporting this pattern' },
                    },
                    required: ['pattern_text', 'evidence_refs'],
                    additionalProperties: false,
                  },
                  description: '4-6 behavioral patterns observed from the data'
                },
                role_expected: { type: 'array', items: { type: 'string' }, description: '3-5 expected duties for this role' },
                role_actual_distribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { label: { type: 'string' }, pct: { type: 'number' } },
                    required: ['label', 'pct'],
                    additionalProperties: false,
                  },
                  description: 'Actual work distribution (percentages sum to 100)'
                },
                role_anomalies: { type: 'array', items: { type: 'string' }, description: '0-2 anomalies where actual differs from expected' },
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

    // 4. Upsert profile
    const profileRow = {
      resource_id,
      resource_pattern: aiResult.resource_pattern,
      delivery_summary: aiResult.delivery_summary || null,
      strength_analysis: aiResult.strength_analysis || null,
      delivery_metrics: metrics.delivery_metrics,
      hub_distribution: metrics.hub_distribution,
      hub_closure_rates: metrics.hub_closure_rates,
      role_expectation: {
        expected: aiResult.role_expected,
        actual_distribution: aiResult.role_actual_distribution,
        anomalies: aiResult.role_anomalies,
      },
      generated_at: new Date().toISOString(),
      generation_version: '3.0',
      next_refresh_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('r360_ai_profiles')
      .select('id')
      .eq('resource_id', resource_id)
      .maybeSingle()

    if (existing) {
      await supabase.from('r360_ai_profiles').update(profileRow).eq('id', existing.id)
    } else {
      await supabase.from('r360_ai_profiles').insert(profileRow)
    }

    // 5. Upsert behavioral patterns
    await supabase.from('r360_ai_behavioral_patterns').delete().eq('resource_id', resource_id)
    const patternRows = (aiResult.behavioral_patterns || []).map((p: any, i: number) => ({
      resource_id,
      pattern_text: p.pattern_text,
      evidence_refs: p.evidence_refs || [],
      sort_order: i + 1,
    }))
    if (patternRows.length > 0) {
      await supabase.from('r360_ai_behavioral_patterns').insert(patternRows)
    }

    // 6. Upsert release standings from pre-computed data
    await supabase.from('r360_ai_release_standings').delete().eq('resource_id', resource_id)
    const standings = (metrics.release_standings as any[] || [])
    for (const rs of standings) {
      const { data: vRow } = await supabase.from('ph_versions').select('id').eq('jira_id', rs.release_key).maybeSingle()
      await supabase.from('r360_ai_release_standings').insert({
        resource_id,
        release_id: vRow?.id || crypto.randomUUID(),
        total_items: rs.total,
        done_count: rs.done,
        completion_pct: rs.completion_pct,
        verdict: rs.verdict,
        verdict_text: rs.verdict === 'on_track' ? 'On Track' : rs.verdict === 'at_risk' ? 'At Risk' : 'Behind Schedule',
        confidence_score: Math.min(100, Math.round((rs.total / 5) * 20)),
        snapshot_date: new Date().toISOString(),
      })
    }

    // 7. Mark metrics as AI-generated
    await supabase.from('r360_resource_metrics')
      .update({ ai_generated_at: new Date().toISOString(), recompute_needed: false })
      .eq('resource_id', resource_id)

    return new Response(JSON.stringify({
      success: true,
      items_analyzed: metrics.total_items,
      hubs: Object.keys(metrics.hub_distribution as object),
      patterns_generated: patternRows.length,
      releases_analyzed: standings.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Generate profile error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
