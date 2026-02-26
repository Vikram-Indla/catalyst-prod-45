import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // 1. Rebuild resource index
    const { data: resources } = await supabase
      .from('resource_inventory')
      .select('id, name, role_name, department_name')
      .eq('is_active', true)

    for (const r of resources || []) {
      const { count } = await supabase
        .from('r360_unified_activity_view')
        .select('*', { count: 'exact', head: true })
        .or(`assignee_user_id.eq.${r.id}`)

      await supabase.from('r360_ai_resource_index').upsert({
        resource_id: r.id.toString(),
        resource_name: r.name,
        role_name: r.role_name,
        department: r.department_name || 'Unknown',
        has_issues: (count || 0) > 0,
        issue_count: count || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'resource_id' })
    }

    // 2. Queue jobs for active resources
    const { data: activeResources } = await supabase
      .from('r360_ai_resource_index')
      .select('resource_id')
      .eq('has_issues', true)

    let resourcesQueued = 0
    for (const r of activeResources || []) {
      const { error } = await supabase.from('r360_ai_jobs').insert({
        scope_type: 'resource',
        scope_id: r.resource_id,
        sections: ['hub_closures', 'delivery_backlog', 'delivery_metrics', 'behavioral_patterns', 'weekly_story'],
        triggered_by: 'batch_warmup',
        priority: 10,
        status: 'queued',
      })
      if (!error) resourcesQueued++
    }

    // 3. Queue jobs for departments
    const departments = [...new Set((resources || []).map(r => r.department_name).filter(Boolean))]
    let deptsQueued = 0
    for (const dept of departments) {
      const { error } = await supabase.from('r360_ai_jobs').insert({
        scope_type: 'department',
        scope_id: dept,
        sections: ['health_kpis', 'workload_distribution', 'item_distribution', 'weekly_events', 'resource_leaderboard'],
        triggered_by: 'batch_warmup',
        priority: 10,
        status: 'queued',
      })
      if (!error) deptsQueued++
    }

    return new Response(JSON.stringify({
      resources_indexed: resources?.length || 0,
      resources_queued: resourcesQueued,
      departments_queued: deptsQueued,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    console.error('[r360-ai-warmup] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
