import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const AGGREGATION_WINDOW_MS = 30 * 60 * 1000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    const { record } = payload;

    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GUARD: self-notification — never notify when actor === recipient
    if (record?.actor_user_id && record.actor_user_id === record?.recipient_user_id) {
      return new Response(JSON.stringify({ skipped: 'self-notification' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GUARD: idempotency — check aggregation window (30 min)
    if (record?.actor_user_id && record?.recipient_user_id) {
      const windowStart = new Date(Date.now() - AGGREGATION_WINDOW_MS).toISOString();
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('actor_user_id', record.actor_user_id)
        .eq('recipient_user_id', record.recipient_user_id)
        .eq('entity_id', record.entity_id)
        .eq('notification_type', record.notification_type)
        .gte('created_at', windowStart)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ skipped: 'aggregated' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // INSERT notification (service role bypasses RLS)
    const { error } = await supabase
      .from('notifications')
      .insert({
        recipient_user_id: record.recipient_user_id,
        actor_user_id: record.actor_user_id || SYSTEM_ACTOR_ID,
        notification_type: record.notification_type,
        entity_type: record.entity_type || 'work_item',
        entity_id: record.entity_id,
        entity_title: record.entity_title,
        entity_key: record.entity_key,
        entity_icon_type: record.entity_icon_type || 'task',
        hub_source: record.hub_source || 'ProjectHub',
        status: record.status || 'To Do',
        status_type: record.status_type || 'gray',
        tab: record.tab || 'direct',
        metadata: record.metadata || {},
        delivered_at: new Date().toISOString(),
      });

    if (error) {
      // Idempotency violation is expected — not an error
      if (error.code === '23505') {
        return new Response(JSON.stringify({ skipped: 'duplicate' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
