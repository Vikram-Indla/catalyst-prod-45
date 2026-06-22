/**
 * notion-webhook v2
 *
 * Handles Notion webhook events:
 *   comment.created / comment.updated → ph_comments (activity feed)
 *   page.updated / page.properties_changed → business_requests delta upsert
 *
 * Validates X-Notion-Signature via HMAC-SHA256 against webhook_secret.
 * Respects comment_sync_enabled per config.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notion-signature',
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false
  try {
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
    const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return `sha256=${hex}` === signature
  } catch {
    return false
  }
}

function extractCommentText(comment: any): string {
  if (!comment?.rich_text) return ''
  return comment.rich_text.map((rt: any) => rt.plain_text || '').join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  const rawBody   = await req.text()
  const signature = req.headers.get('x-notion-signature')

  // Load first active config (webhook secret + field_mapping for delta sync)
  const { data: config } = await db
    .from('notion_sync_config')
    .select('id, webhook_secret, field_mapping, comment_sync_enabled, last_comment_count')
    .eq('sync_enabled', true)
    .limit(1)
    .single()

  // Validate signature if secret is configured
  if (config?.webhook_secret) {
    const valid = await verifySignature(rawBody, signature, config.webhook_secret)
    if (!valid) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  const eventType = payload.type || payload.event

  // ── Comment events ────────────────────────────────────────────────────────
  if (eventType === 'comment.created' || eventType === 'comment.updated') {
    // Respect per-config comment_sync_enabled flag
    if (config && config.comment_sync_enabled === false) {
      return new Response(JSON.stringify({ ok: true, skipped: 'comment_sync_enabled=false' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const comment = payload.comment || payload.data?.comment
    const pageId  = payload.page?.id || payload.data?.page_id || comment?.parent?.page_id

    if (!comment || !pageId) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing comment or page_id' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const commentText = extractCommentText(comment)
    if (!commentText.trim()) {
      return new Response(JSON.stringify({ ok: true, skipped: 'empty comment' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const { data: br } = await db
      .from('business_requests')
      .select('id')
      .eq('notion_page_id', pageId)
      .single()

    if (!br) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'business_request not found for page', page_id: pageId }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const authorName = comment.created_by?.name || comment.created_by?.id || 'Notion'
    const body       = `**[Notion]** ${authorName}: ${commentText}`

    if (eventType === 'comment.created') {
      const { error } = await db.from('ph_comments').upsert({
        work_item_id:      br.id,
        author_id:         null,
        body,
        source:            'notion',
        notion_comment_id: comment.id,
        notion_page_id:    pageId,
      }, { onConflict: 'notion_comment_id', ignoreDuplicates: true })

      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        })
      }

      // Increment last_comment_count on config
      if (config) {
        await db.from('notion_sync_config')
          .update({ last_comment_count: (config.last_comment_count || 0) + 1 })
          .eq('id', config.id)
      }
    } else {
      await db.from('ph_comments')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('notion_comment_id', comment.id)
    }

    return new Response(JSON.stringify({ ok: true, event: eventType, comment_id: comment.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  // ── Page update events (field delta sync) ─────────────────────────────────
  if (
    eventType === 'page.updated' ||
    eventType === 'page.properties_changed' ||
    eventType === 'page.created'
  ) {
    const pageId = payload.page?.id || payload.data?.page_id || payload.entity?.id

    if (!pageId || !config) {
      return new Response(JSON.stringify({ ok: true, skipped: 'missing page_id or no config' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // Fetch the latest page state from Notion
    const notionToken = await getNotionToken(db, config.id)
    if (!notionToken) {
      return new Response(JSON.stringify({ ok: true, skipped: 'could not load integration token' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!pageRes.ok) {
      return new Response(JSON.stringify({ ok: true, skipped: 'notion page fetch failed' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    const page = await pageRes.json()
    const fieldMapping: Record<string, string> = config.field_mapping || {}

    // Flatten properties and build BR update object
    const br: Record<string, any> = {
      notion_page_id:        page.id,
      notion_link:           page.url,
      notion_last_synced_at: new Date().toISOString(),
    }

    for (const [notionProp, brCol] of Object.entries(fieldMapping)) {
      const prop = page.properties?.[notionProp]
      if (!prop || !brCol) continue
      const val = flattenNotionProp(prop, page.properties, notionProp)
      if (val !== null) br[brCol as string] = val
    }

    if (br.title) {
      await db.from('business_requests')
        .upsert(br, { onConflict: 'notion_page_id', ignoreDuplicates: false })
    }

    return new Response(JSON.stringify({ ok: true, event: eventType, page_id: pageId }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  // Unknown event — ack so Notion stops retrying
  return new Response(
    JSON.stringify({ ok: true, skipped: `unhandled event: ${eventType}` }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})

async function getNotionToken(db: any, configId: string): Promise<string | null> {
  const { data } = await db
    .from('notion_sync_config')
    .select('integration_token')
    .eq('id', configId)
    .single()
  return data?.integration_token || null
}

function flattenNotionProp(prop: any, _props: any, _name: string): any {
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
    default:             return null
  }
}
