import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Expected: /tm-runs/scope/:scopeId/runs/:runId? OR /tm-runs/runs/:runId
    const scopeIdIndex = pathParts.indexOf('scope') + 1;
    const scopeId = pathParts[scopeIdIndex];
    const runIdIndex = pathParts.indexOf('runs') + 1;
    const runId = pathParts[runIdIndex];
    const action = pathParts[runIdIndex + 1];

    // GET /runs/:runId - Get single run (direct access)
    if (req.method === 'GET' && runId && !scopeId && !action) {
      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_cycle_scope(
            id,
            cycle_id,
            tm_test_cases(id, case_key, title, priority),
            tm_test_cycles(id, cycle_key, name)
          ),
          executed_by_user:tm_users(id, display_name, avatar_url),
          tm_step_results(
            id,
            step_id,
            status,
            actual_result,
            executed_at,
            duration_seconds,
            tm_test_steps(id, step_number, action, expected_result)
          )
        `)
        .eq('id', runId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Run not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!scopeId) {
      return new Response(
        JSON.stringify({ error: 'Scope ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /scope/:scopeId/runs - List runs for scope
    if (req.method === 'GET' && !runId) {
      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          executed_by_user:tm_users(id, display_name, avatar_url)
        `)
        .eq('scope_id', scopeId)
        .order('run_number', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /scope/:scopeId/runs - Start new run
    if (req.method === 'POST' && !runId) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Get scope with case and steps
      const { data: scope } = await supabase
        .from('tm_cycle_scope')
        .select(`
          id,
          cycle_id,
          case_id,
          tm_test_cases(
            id,
            tm_test_steps(id, step_number)
          )
        `)
        .eq('id', scopeId)
        .single();

      if (!scope) {
        return new Response(
          JSON.stringify({ error: 'Scope item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get next run number
      const { data: lastRun } = await supabase
        .from('tm_test_runs')
        .select('run_number')
        .eq('scope_id', scopeId)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const runNumber = (lastRun?.run_number || 0) + 1;

      // Create run
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          scope_id: scopeId,
          cycle_id: scope.cycle_id,
          case_id: scope.case_id,
          run_number: runNumber,
          status: 'in_progress',
          executed_by: tmUser?.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (runError) throw runError;

      // Create step results for all steps
      const testCases = scope.tm_test_cases as unknown as { id: string; tm_test_steps: { id: string; step_number: number }[] } | null;
      const steps = testCases?.tm_test_steps || [];
      if (steps.length > 0) {
        const stepResults = steps.map((step: { id: string }) => ({
          run_id: run.id,
          step_id: step.id,
          status: 'not_run'
        }));

        await supabase.from('tm_step_results').insert(stepResults);
      }

      // Get complete run with step results
      const { data: completeRun } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_step_results(
            id,
            step_id,
            status,
            tm_test_steps(id, step_number, action, expected_result)
          )
        `)
        .eq('id', run.id)
        .single();

      return new Response(
        JSON.stringify(completeRun),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /scope/:scopeId/runs/:runId - Update run
    if (req.method === 'PATCH' && runId && !action) {
      const body = await req.json();
      
      const updates: Record<string, unknown> = {};
      
      if (body.status !== undefined) {
        updates.status = body.status;
        if (body.status !== 'in_progress') {
          updates.completed_at = new Date().toISOString();
        }
      }
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.environment_notes !== undefined) updates.environment_notes = body.environment_notes;

      const { data, error } = await supabase
        .from('tm_test_runs')
        .update(updates)
        .eq('id', runId)
        .eq('scope_id', scopeId)
        .select()
        .single();

      if (error) throw error;

      // Recalculate run status from steps if not explicitly set
      if (!body.status) {
        await supabase.rpc('tm_calculate_run_status', { p_run_id: runId });
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /scope/:scopeId/runs/:runId/steps/:stepId - Update step result
    if (req.method === 'PUT' && action === 'steps') {
      const stepId = pathParts[runIdIndex + 2];
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      const updates: Record<string, unknown> = {
        status: body.status,
        executed_at: new Date().toISOString(),
        executed_by: tmUser?.id
      };

      if (body.actual_result !== undefined) updates.actual_result = body.actual_result;
      if (body.duration_seconds !== undefined) updates.duration_seconds = body.duration_seconds;

      const { data, error } = await supabase
        .from('tm_step_results')
        .update(updates)
        .eq('run_id', runId)
        .eq('step_id', stepId)
        .select()
        .single();

      if (error) throw error;

      // Trigger status percolation happens via database trigger

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /scope/:scopeId/runs/:runId/complete - Complete run
    if (req.method === 'POST' && action === 'complete') {
      const body = await req.json();

      // Recalculate status from steps
      await supabase.rpc('tm_calculate_run_status', { p_run_id: runId });

      // Get updated run
      const { data: run } = await supabase
        .from('tm_test_runs')
        .select('status')
        .eq('id', runId)
        .single();

      const updates: Record<string, unknown> = {
        completed_at: new Date().toISOString()
      };

      // Override status if provided
      if (body.status && ['passed', 'failed', 'blocked'].includes(body.status)) {
        updates.status = body.status;
      }
      if (body.notes) updates.notes = body.notes;

      const { data, error } = await supabase
        .from('tm_test_runs')
        .update(updates)
        .eq('id', runId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /scope/:scopeId/runs/:runId/steps/:stepId/attachments - Add attachment
    if (req.method === 'POST' && action === 'steps') {
      const stepId = pathParts[runIdIndex + 2];
      const subAction = pathParts[runIdIndex + 3];
      
      if (subAction === 'attachments') {
        const { data: { user } } = await supabase.auth.getUser();
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
          return new Response(
            JSON.stringify({ error: 'File required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get step result
        const { data: stepResult } = await supabase
          .from('tm_step_results')
          .select('id')
          .eq('run_id', runId)
          .eq('step_id', stepId)
          .single();

        const filePath = `runs/${runId}/steps/${stepId}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('test-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('test-attachments')
          .getPublicUrl(filePath);

        const { data: tmUser } = await supabase
          .from('tm_users')
          .select('id')
          .eq('auth_user_id', user?.id)
          .maybeSingle();

        const { data: attachment, error } = await supabase
          .from('tm_attachments')
          .insert({
            entity_type: 'step_result',
            entity_id: stepResult?.id,
            filename: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: tmUser?.id
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ ...attachment, url: urlData.publicUrl }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // POST /scope/:scopeId/runs/:runId/quick-fail - Quick fail all remaining
    if (req.method === 'POST' && action === 'quick-fail') {
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Update all not_run steps to failed/blocked
      const { data, error } = await supabase
        .from('tm_step_results')
        .update({
          status: body.status || 'blocked',
          actual_result: body.reason || 'Marked via quick action',
          executed_at: new Date().toISOString(),
          executed_by: tmUser?.id
        })
        .eq('run_id', runId)
        .eq('status', 'not_run')
        .select();

      if (error) throw error;

      // Recalculate run status
      await supabase.rpc('tm_calculate_run_status', { p_run_id: runId });

      return new Response(
        JSON.stringify({ updated: data.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Runs error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
