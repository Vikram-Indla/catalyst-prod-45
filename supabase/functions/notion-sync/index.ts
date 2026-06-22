/**
 * notion-sync v2
 *
 * Syncs Notion databases → business_requests.
 * Upsert key: notion_page_id.
 *
 * v2: sync_paused check, exclusion_rules, notify_admins.
 *
 * Triggered by:
 *   - pg_cron daily schedule
 *   - Manual POST: { config_id?, triggered_by? }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NOTION_VERSION = '2022-06-28'

// ── Exclusion rules ───────────────────────────────────────────────────────────
interface ExclusionRule {
  field: string
  op: 'is' | 'is_not' | 'contains'
  value: string
}

function shouldExclude(flat: Record<string, string | null>, rules: ExclusionRule[]): boolean {
  if (!rules || rules.length === 0) return false
  for (const rule of rules) {
    const fieldVal = (flat[rule.field] ?? '').toLowerCase()
    const ruleVal  = (rule.value ?? '').toLowerCase()
    if (rule.op === 'is'       && fieldVal === ruleVal)       return true
    if (rule.op === 'is_not'   && fieldVal !== ruleVal)       return true
    if (rule.op === 'contains' && fieldVal.includes(ruleVal)) return true
  }
  return false
}

// ── Notify admins ─────────────────────────────────────────────────────────────
async function notifyAdmins(
  db: any, configId: string, sourceLabel: string,
  synced: number, skipped: number, ok: boolean,
) {
  const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin')
  if (!admins || admins.length === 0) return

  const title = ok
    ? `Notion sync: ${synced} records synced from "${sourceLabel}"`
    : `Notion sync failed for "${sourceLabel}"`

  const rows = admins.map((u: any) => ({
    recipient_user_id: u.user_id,
    actor_user_id:     null,
    notification_type: 'ai_insight_generated',
    entity_id:         configId,
    entity_type:       'issue',
    entity_key:        sourceLabel,
    entity_title:      title,
    hub_source:        'ProductHub',
    entity_icon_type:  'story',
    status:            ok ? 'Synced' : 'Error',
    status_type:       ok ? 'green'  : 'gray',
    tab:               'watching',
    metadata:          { synced, skipped, source_label: sourceLabel },
  }))

  const { error } = await db.from('notifications').insert(rows)
  if (error) console.warn('[notion-sync] notify_admins insert failed:', error.message)
}

// ── Field flattener ───────────────────────────────────────────────────────────
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

  return { br, flat }
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
  // Respect pause flag
  if (config.sync_paused) {
    console.log(`[notion-sync] ${config.source_label} is paused — skipping`)
    return { ok: true, paused: true, synced: 0, skipped: 0 }
  }

  const exclusionRules: ExclusionRule[] = config.exclusion_rules || []

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

    let synced = 0, skipped = 0, excluded = 0
    for (const page of pages) {
      const { br, flat } = mapNotionPageToBR(page, fieldMapping)
      if (!br.title) { skipped++; continue }

      if (shouldExclude(flat, exclusionRules)) { excluded++; skipped++; continue }

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

    if (config.notify_admins) {
      await notifyAdmins(db, config.id, config.source_label, synced, skipped, true)
    }

    return { ok: true, synced, skipped, excluded, total: pages.length }

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
    if (config.notify_admins) {
      await notifyAdmins(db, config.id, config.source_label, 0, 0, false)
    }
    return { ok: false, error: msg, synced: 0, skipped: 0 }
  }
}
