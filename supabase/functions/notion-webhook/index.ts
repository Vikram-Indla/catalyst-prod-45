/**
 * notion-webhook
 *
 * Receives Notion webhook events and syncs comments to ph_comments.
 *
 * Notion sends POST to this endpoint when:
 *   - A comment is added to a page (event: "comment.created")
 *   - A comment is updated  (event: "comment.updated")
 *
 * Dedup: ph_comments.notion_comment_id UNIQUE index prevents double-inserts.
 * Source marker: ph_comments.source = 'notion'
 *
 * Webhook secret validation:
 *   Notion sends X-Notion-Signature header = hmac-sha256 of raw body.
 *   We validate against notion_sync_config.webhook_secret.
 *
 * Setup on Notion side:
 *   https://www.notion.so/my-integrations → your integration → Capabilities →
 *   Add webhook URL: <supabase-url>/functions/v1/notion-webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-notion-signature',
}

async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false
  try {
    const expected = 'sha256=' + hmac('sha256', secret, rawBody, 'utf8', 'hex')
    return expected === signature
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

  // Load first active config to get webhook_secret
  const { data: config } = await db
    .from('notion_sync_config')
    .select('id, webhook_secret')
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

  // Handle comment events
  if (eventType === 'comment.created' || eventType === 'comment.updated') {
    const comment   = payload.comment || payload.data?.comment
    const pageId    = payload.page?.id || payload.data?.page_id || comment?.parent?.page_id

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

    // Find the business_request matching this Notion page
    const { data: br } = await db
      .from('business_requests')
      .select('id')
      .eq('notion_page_id', pageId)
      .single()

    if (!br) {
      // Page not yet synced — return 200 to avoid Notion retry storm
      return new Response(
        JSON.stringify({ ok: true, skipped: 'business_request not found for page', page_id: pageId }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const authorName = comment.created_by?.name || comment.created_by?.id || 'Notion'
    const body       = `**[Notion]** ${authorName}: ${commentText}`

    if (eventType === 'comment.created') {
      // Insert — dedup by notion_comment_id
      const { error } = await db.from('ph_comments').upsert({
        work_item_id:      br.id,
        author_id:         null,  // Notion user, no Catalyst UUID
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
    } else {
      // Update existing comment
      await db.from('ph_comments')
        .update({ body, updated_at: new Date().toISOString() })
        .eq('notion_comment_id', comment.id)
    }

    return new Response(JSON.stringify({ ok: true, event: eventType, comment_id: comment.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }

  // Unknown event — ack so Notion stops retrying
  return new Response(
    JSON.stringify({ ok: true, skipped: `unhandled event: ${eventType}` }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
