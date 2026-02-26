/**
 * r360-daily-cron — Runs daily at 6:00 AM AST (3:00 AM UTC)
 * Auto-generates AI profiles for all active resources with Jira accounts.
 * Skips resources with profiles generated in the last 20 hours.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Get all active resources with jira_account_id
    const { data: resources, error: resErr } = await supabase
      .from('resource_inventory')
      .select('id, name, jira_account_id, role_name')
      .not('jira_account_id', 'is', null)
      .eq('is_active', true)

    if (resErr) throw resErr
    if (!resources || resources.length === 0) {
      return new Response(JSON.stringify({ message: 'No active resources found', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get existing profiles to check freshness
    const resourceIds = resources.map(r => r.id)
    const { data: existingProfiles } = await supabase
      .from('r360_ai_profiles')
      .select('resource_id, generated_at')
      .in('resource_id', resourceIds)

    const profileMap = new Map<string, string>()
    for (const p of existingProfiles || []) {
      profileMap.set(p.resource_id, p.generated_at)
    }

    // 3. Filter: only process resources with stale or missing profiles (>20h old)
    const staleThreshold = Date.now() - 20 * 3600000
    const toProcess = resources.filter(r => {
      const lastGen = profileMap.get(r.id)
      if (!lastGen) return true
      return new Date(lastGen).getTime() < staleThreshold
    })

    console.log(`[r360-daily-cron] ${toProcess.length}/${resources.length} resources need refresh`)

    // 4. Process in batches of 3 (to avoid rate limits)
    const results: { id: string; name: string; status: string; error?: string }[] = []
    const BATCH_SIZE = 3
    const BATCH_DELAY_MS = 5000

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(async (resource) => {
          try {
            const profileUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/r360-generate-profile`
            const res = await fetch(profileUrl, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ resource_id: resource.id }),
            })

            if (!res.ok) {
              const errText = await res.text()
              throw new Error(`HTTP ${res.status}: ${errText}`)
            }

            const data = await res.json()
            return { id: resource.id, name: resource.name, status: 'success', items: data.items_analyzed }
          } catch (err: any) {
            console.error(`[r360-daily-cron] Failed for ${resource.name}:`, err.message)
            return { id: resource.id, name: resource.name, status: 'error', error: err.message }
          }
        })
      )

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({ id: 'unknown', name: 'unknown', status: 'error', error: String(result.reason) })
        }
      }

      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < toProcess.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`[r360-daily-cron] Complete: ${successCount} success, ${errorCount} errors`)

    return new Response(JSON.stringify({
      processed: toProcess.length,
      skipped: resources.length - toProcess.length,
      success: successCount,
      errors: errorCount,
      details: results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[r360-daily-cron] Fatal error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
