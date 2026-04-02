import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const webhookEvent = payload.webhookEvent;

    if (!webhookEvent) {
      return new Response('Missing webhookEvent', { status: 400 });
    }

    let idempotencyKey: string;
    let entityType: string;
    let entityId: string;

    if (payload.issue) {
      entityType = 'issue';
      entityId = payload.issue.id;
      const changelogId = payload.changelog?.id || Date.now().toString();
      idempotencyKey = `jira:issue:${entityId}:${changelogId}`;
    } else if (payload.sprint) {
      entityType = 'sprint';
      entityId = payload.sprint.id?.toString() || 'unknown';
      idempotencyKey = `jira:sprint:${entityId}:${payload.timestamp}`;
    } else if (payload.comment) {
      entityType = 'comment';
      entityId = payload.comment.id;
      idempotencyKey = `jira:comment:${entityId}:${payload.timestamp}`;
    } else {
      entityType = 'unknown';
      entityId = 'unknown';
      idempotencyKey = `jira:unknown:${payload.timestamp}`;
    }

    const { error } = await supabase.from('sync_events').upsert({
      direction: 'inbound',
      origin_system: 'jira',
      event_type: webhookEvent,
      entity_type: entityType,
      entity_id: entityId,
      idempotency_key: idempotencyKey,
      payload: payload,
      status: 'pending',
    }, { onConflict: 'idempotency_key', ignoreDuplicates: true });

    if (error) {
      console.error('Failed to queue event:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ received: true, event: webhookEvent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
