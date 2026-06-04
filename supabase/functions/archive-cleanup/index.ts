/**
 * archive-cleanup — Monthly cron edge function.
 * For items archived > 180 days, strips heavy JSON blobs (description_adf, changelog, comments)
 * to reduce row size by ~80%. Keeps summary, key, status, type for reference.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);

    const { data: candidates, error: fetchErr } = await supabase
      .from('ph_issues')
      .select('issue_key, description_adf, changelog, archived_at')
      .not('archived_at', 'is', null)
      .lt('archived_at', cutoffDate.toISOString())
      .not('description_adf', 'is', null)
      .limit(500);

    if (fetchErr) throw fetchErr;

    let cleaned = 0;
    for (const row of candidates ?? []) {
      const { error: upErr } = await supabase
        .from('ph_issues')
        .update({
          description_adf: null,
          changelog: null,
        } as any)
        .eq('issue_key', row.issue_key);

      if (!upErr) cleaned++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        candidates_found: (candidates ?? []).length,
        cleaned,
        cutoff: cutoffDate.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
