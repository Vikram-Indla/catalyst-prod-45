import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const { data: dueSchedules, error } = await supabase
      .from('report_schedules')
      .select('*, report:report_definitions(*)')
      .eq('is_active', true)
      .lte('next_run_at', now.toISOString());

    if (error) throw error;
    console.log(`Found ${dueSchedules?.length || 0} schedules to run`);

    for (const schedule of dueSchedules || []) {
      try {
        const { data: metrics } = await supabase.rpc('get_report_execution_metrics', {
          p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          p_end_date: now.toISOString(),
        });

        await supabase.from('report_snapshots').insert({
          report_id: schedule.report_id,
          schedule_id: schedule.id,
          snapshot_data: { metrics, generated_at: now.toISOString() },
        });

        for (const recipient of schedule.recipients) {
          console.log(`Would send report to ${recipient.email}`);
        }

        const nextRun = calculateNextRun(schedule);
        await supabase.from('report_schedules').update({
          last_run_at: now.toISOString(),
          next_run_at: nextRun.toISOString(),
        }).eq('id', schedule.id);

      } catch (err) { console.error(`Failed schedule ${schedule.id}:`, err); }
    }

    return new Response(JSON.stringify({ success: true, processed: dueSchedules?.length || 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function calculateNextRun(schedule: any): Date {
  const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  switch (schedule.frequency) {
    case 'daily': next.setDate(next.getDate() + 1); break;
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
  }
  return next;
}
