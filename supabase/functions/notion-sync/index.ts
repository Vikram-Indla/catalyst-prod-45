/**
 * notion-sync
 *
 * Syncs Notion Features database → business_requests table.
 * Upsert key: notion_page_id (Notion's internal page UUID).
 * Notion is allowed to overwrite all mapped fields on every sync.
 *
 * Triggered by:
 *   - pg_cron daily schedule (cron job in notion_sync_cron migration)
 *   - Manual POST from the admin Notion connection page
 *
 * Body (manual trigger): { config_id?: string }
 *   If config_id is omitted, uses the first enabled config row.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NOTION_VERSION = '2022-06-28'

// ── Field flattener (mirrors notion-fetch/index.ts) ──────────────────────────
function flattenProp(prop: any): string | null {
  if (!prop) return null
  switch (prop.type) {
    case 'title':        return prop.title?.[0]?.plain_text || null
    case 'rich_text':    return prop.rich_text?.[0]?.plain_text || null
    case 'select':       return prop.select?.name || null
    case 'multi_select': return prop.multi_select?.map((s: any) => s.name).join(', ') || null
    case 'status':       return prop.status?.name || null
    case 'date':         return prop.date?.start || null
    case 'number':       return prop.number?.toString() || null
    case 'checkbox':     return prop.checkbox ? 'true' : 'false'
    case 'people':       return prop.people?.[0]?.name || null
    case 'url':          return prop.url || null
    case 'email':        return prop.email || null
    case 'phone_number': return prop.phone_number || null
    default:             return null
  }
}

// ── Map a Notion page → business_requests insert object ─────────────────────
function mapNotionPageToBR(page: any, fieldMapping: Record<string, string>) {
  const flat: Record<string, string | null> = {}
  for (const [propName, propVal] of Object.entries(page.properties)) {
    flat[propName] = flattenProp(propVal)
  }

  // Resolve via field_mapping: Notion property name → BR column
  const br: Record<string, any> = {
    notion_page_id:        page.id,
    notion_link:           page.url,
    notion_last_synced_at: new Date().toISOString(),
    import_source:         'notion',
    import_ref:            page.url,  // keep import_ref populated for legacy compat
  }

  for (const [notionProp, brCol] of Object.entries(fieldMapping)) {
    const val = flat[notionProp]
    if (val === undefined) continue
    if (!brCol) continue

    // Special coercions for known columns
    if (brCol === 'stakeholders') {
      // multi-select → jsonb array
      const prop = page.properties[notionProp]
      if (prop?.type === 'multi_select') {
        br.stakeholders = prop.multi_select.map((s: any) => s.name)
      } else if (val) {
        br.stakeholders = val.split(',').map((s: string) => s.trim())
      }
    } else if (brCol === 'targeted_feature') {
      br.targeted_feature = val === 'true' || val === 'True' || val === '1'
    } else if (brCol === 'planned_quarter') {
      // multi-select → jsonb array
      const prop = page.properties[notionProp]
      if (prop?.type === 'multi_select') {
        br.planned_quarter = prop.multi_select.map((s: any) => s.name)
      }
    } else {
      br[brCol] = val
    }
  }

  return br
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  // Parse optional config_id from body
  let configId: string | undefined
  let triggeredBy = 'cron'
  try {
    const body = await req.json().catch(() => ({}))
    configId    = body.config_id
    triggeredBy = body.triggered_by || 'manual'
  } catch (_) { /* cron call may have no body */ }

  // Load configs — single config_id for manual trigger, all enabled for cron
  let configQuery = db.from('notion_sync_config').select('*').eq('sync_enabled', true)
  if (configId) configQuery = configQuery.eq('id', configId)
  const { data: configRows, error: cfgErr } = await configQuery

  if (cfgErr || !configRows || configRows.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'No enabled Notion sync config found' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  // Run each config sequentially
  const results: any[] = []
  for (const config of configRows as any[]) {
    const result = await syncOneConfig(db, config, triggeredBy)
    results.push({ config_id: config.id, source_label: config.source_label, ...result })
  }

  const totalSynced  = results.reduce((s, r) => s + (r.synced  ?? 0), 0)
  const totalSkipped = results.reduce((s, r) => s + (r.skipped ?? 0), 0)

  return new Response(
    JSON.stringify({ ok: true, configs: results.length, synced: totalSynced, skipped: totalSkipped, results }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})

// ── Sync a single config row ──────────────────────────────────────────────────
async function syncOneConfig(db: any, config: any, triggeredBy: string) {
  // Insert sync log (running)
  const { data: logRow } = await db.from('notion_sync_log').insert({
    config_id:    config.id,
    status:       'running',
    triggered_by: triggeredBy,
  }).select('id').single()
  const logId = logRow?.id

  await db.from('notion_sync_config').update({ last_sync_status: 'running' }).eq('id', config.id)

  try {
    const notionHeaders = {
      'Authorization': `Bearer ${config.integration_token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    }

    const raw  = config.database_id.replace(/-/g, '')
    const dbId = `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`

    const pages: any[] = []
    let cursor: string | undefined
    do {
      const body: any = { page_size: 100 }
      if (cursor) body.start_cursor = cursor
      const res = await fetch(
        `https://api.notion.com/v1/databases/${dbId}/query`,
        { method: 'POST', headers: notionHeaders, body: JSON.stringify(body) }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || `Notion API error ${res.status}`)
      }
      const data = await res.json()
      pages.push(...data.results)
      cursor = data.has_more ? data.next_cursor : undefined
    } while (cursor)

    const fieldMapping: Record<string, string> = config.field_mapping || {}

    let synced = 0, skipped = 0
    for (const page of pages) {
      const br = mapNotionPageToBR(page, fieldMapping)
      if (!br.title) { skipped++; continue }

      const { error: upsertErr } = await db
        .from('business_requests')
        .upsert(br, { onConflict: 'notion_page_id', ignoreDuplicates: false })

      if (upsertErr) {
        console.error('upsert error', upsertErr.message, br.notion_page_id)
        skipped++
      } else {
        synced++
      }
    }

    await db.from('notion_sync_config').update({
      last_sync_at:     new Date().toISOString(),
      last_sync_status: 'ok',
      last_sync_count:  synced,
      last_sync_error:  null,
    }).eq('id', config.id)

    if (logId) {
      await db.from('notion_sync_log').update({
        finished_at:     new Date().toISOString(),
        status:          'ok',
        records_synced:  synced,
        records_skipped: skipped,
      }).eq('id', logId)
    }

    return { ok: true, synced, skipped, total: pages.length }

  } catch (err: any) {
    const msg = err.message || 'Unknown error'
    await db.from('notion_sync_config').update({ last_sync_status: 'error', last_sync_error: msg }).eq('id', config.id)
    if (logId) {
      await db.from('notion_sync_log').update({
        finished_at:   new Date().toISOString(),
        status:        'error',
        error_message: msg,
      }).eq('id', logId)
    }
    return { ok: false, error: msg, synced: 0, skipped: 0 }
  }
}
