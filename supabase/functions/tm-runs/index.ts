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
    
    // URL patterns:
    // GET /tm-runs?cycle_id={id} - List runs
    // GET /tm-runs/{id} - Get run with step results
    // POST /tm-runs - Create run (auto-create step_results)
    // PATCH /tm-runs/{id}/steps/{stepId} - Update step status
    // PATCH /tm-runs/{id}/steps/bulk - Bulk update steps
    // POST /tm-runs/{id}/complete - Mark complete
    // POST /tm-runs/rerun-failed - Reset failed tests
    
    const runId = pathParts[1];
    const action = pathParts[2];
    const stepId = pathParts[3];

    // ============================================
    // STATUS PERCOLATION LOGIC - CRITICAL FUNCTION
    // ============================================
    // After any step update, calculate run status:
    // - ANY step failed → Run = FAILED
    // - ANY step blocked (no fails) → Run = BLOCKED
    // - ALL steps passed → Run = PASSED
    // - ALL steps not_run → Run = NOT_RUN
    // - Otherwise → Run = IN_PROGRESS
    // Then update cycle_scope and cycle stats
    // ============================================
    async function percolateStatus(runId: string) {
      console.log(`[PERCOLATION] Starting for run ${runId}`);

      // Get all step results for this run
      const { data: stepResults, error: stepsError } = await supabase
        .from('tm_step_results')
        .select('status')
        .eq('run_id', runId);

      if (stepsError) {
        console.error('[PERCOLATION] Error fetching steps:', stepsError);
        throw stepsError;
      }

      if (!stepResults || stepResults.length === 0) {
        console.log('[PERCOLATION] No steps found, setting run to passed');
        // No steps = run is passed by default
        await supabase
          .from('tm_test_runs')
          .update({ status: 'passed' })
          .eq('id', runId);
        return;
      }

      // Calculate run status from step statuses
      const statuses = stepResults.map(s => s.status);
      let newRunStatus: string;

      const hasFailed = statuses.some(s => s === 'failed');
      const hasBlocked = statuses.some(s => s === 'blocked');
      const allPassed = statuses.every(s => s === 'passed');
      const allNotRun = statuses.every(s => s === 'not_run');

      if (hasFailed) {
        newRunStatus = 'failed';
      } else if (hasBlocked) {
        newRunStatus = 'blocked';
      } else if (allPassed) {
        newRunStatus = 'passed';
      } else if (allNotRun) {
        newRunStatus = 'not_run';
      } else {
        newRunStatus = 'in_progress';
      }

      console.log(`[PERCOLATION] Calculated run status: ${newRunStatus} from steps:`, statuses);

      // Update run status
      const { error: runUpdateError } = await supabase
        .from('tm_test_runs')
        .update({ status: newRunStatus })
        .eq('id', runId);

      if (runUpdateError) {
        console.error('[PERCOLATION] Error updating run:', runUpdateError);
        throw runUpdateError;
      }

      // Get run details to update scope
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .select('scope_id, cycle_id')
        .eq('id', runId)
        .single();

      if (runError || !run) {
        console.error('[PERCOLATION] Error fetching run:', runError);
        throw runError;
      }

      // Update cycle_scope with current status and latest run
      const { error: scopeError } = await supabase
        .from('tm_cycle_scope')
        .update({
          current_status: newRunStatus,
          latest_run_id: runId
        })
        .eq('id', run.scope_id);

      if (scopeError) {
        console.error('[PERCOLATION] Error updating scope:', scopeError);
        throw scopeError;
      }

      console.log(`[PERCOLATION] Updated scope ${run.scope_id} with status ${newRunStatus}`);

      // Recalculate ALL cycle statistics
      await updateCycleStats(run.cycle_id);

      console.log(`[PERCOLATION] Completed for run ${runId}`);
    }

    // Helper to recalculate cycle statistics
    async function updateCycleStats(cycleId: string) {
      console.log(`[STATS] Recalculating stats for cycle ${cycleId}`);

      const { data: scopeItems, error } = await supabase
        .from('tm_cycle_scope')
        .select('current_status')
        .eq('cycle_id', cycleId);

      if (error) {
        console.error('[STATS] Error fetching scope items:', error);
        throw error;
      }

      const counts = {
        total_cases: scopeItems?.length || 0,
        not_run_count: 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0
      };

      scopeItems?.forEach(item => {
        switch (item.current_status) {
          case 'not_run': counts.not_run_count++; break;
          case 'passed': counts.passed_count++; break;
          case 'failed': counts.failed_count++; break;
          case 'blocked': counts.blocked_count++; break;
          case 'in_progress': break; // Count in not_run for stats
          default: counts.not_run_count++; break;
        }
      });

      console.log(`[STATS] Cycle ${cycleId} counts:`, counts);

      const { error: updateError } = await supabase
        .from('tm_test_cycles')
        .update(counts)
        .eq('id', cycleId);

      if (updateError) {
        console.error('[STATS] Error updating cycle:', updateError);
        throw updateError;
      }
    }

    // GET /tm-runs?cycle_id={id} - List runs for a cycle
    if (req.method === 'GET' && !runId) {
      const cycleId = url.searchParams.get('cycle_id');
      const scopeId = url.searchParams.get('scope_id');
      const status = url.searchParams.get('status');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_cycle_scope(
            id,
            execution_order,
            tm_test_cases(id, case_key, title, priority)
          ),
          executed_by_user:tm_users(id, display_name, email, avatar_url)
        `, { count: 'exact' })
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (cycleId) query = query.eq('cycle_id', cycleId);
      if (scopeId) query = query.eq('scope_id', scopeId);
      if (status) query = query.eq('status', status);

      const { data, error, count } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-runs/rerun-failed - Reset failed tests for rerun
    if (req.method === 'POST' && runId === 'rerun-failed') {
      const { cycle_id, scope_ids } = await req.json();

      if (!cycle_id) {
        return new Response(
          JSON.stringify({ error: 'cycle_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get failed scope items to reset
      let query = supabase
        .from('tm_cycle_scope')
        .select('id')
        .eq('cycle_id', cycle_id)
        .eq('current_status', 'failed');

      if (scope_ids?.length) {
        query = query.in('id', scope_ids);
      }

      const { data: failedScopes, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!failedScopes?.length) {
        return new Response(
          JSON.stringify({ message: 'No failed tests to reset', reset: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reset status to not_run
      const { error: resetError } = await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'not_run', latest_run_id: null })
        .in('id', failedScopes.map(s => s.id));

      if (resetError) throw resetError;

      // Update cycle stats
      await updateCycleStats(cycle_id);

      return new Response(
        JSON.stringify({ message: 'Failed tests reset', reset: failedScopes.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /tm-runs/{id} - Get run with step results
    if (req.method === 'GET' && runId && !action) {
      const { data, error } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_cycle_scope(
            id,
            cycle_id,
            execution_order,
            assigned_to,
            tm_test_cases(id, case_key, title, priority, preconditions, description),
            tm_test_cycles(id, cycle_key, name, status)
          ),
          executed_by_user:tm_users(id, display_name, email, avatar_url),
          tm_step_results(
            id,
            step_id,
            status,
            actual_result,
            executed_at,
            executed_by,
            duration_seconds,
            tm_test_steps(id, step_number, action, expected_result, test_data)
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

      // Sort step results by step number
      if (data.tm_step_results) {
        data.tm_step_results.sort((a: { tm_test_steps?: { step_number: number } }, b: { tm_test_steps?: { step_number: number } }) => 
          (a.tm_test_steps?.step_number || 0) - (b.tm_test_steps?.step_number || 0)
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-runs - Create run (auto-create step_results)
    if (req.method === 'POST' && !runId) {
      const { scope_id } = await req.json();

      if (!scope_id) {
        return new Response(
          JSON.stringify({ error: 'scope_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Get scope with case and steps
      const { data: scope, error: scopeError } = await supabase
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
        .eq('id', scope_id)
        .single();

      if (scopeError || !scope) {
        return new Response(
          JSON.stringify({ error: 'Scope item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get next run number for this scope
      const { data: lastRun } = await supabase
        .from('tm_test_runs')
        .select('run_number')
        .eq('scope_id', scope_id)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const runNumber = (lastRun?.run_number || 0) + 1;

      // Create run with in_progress status
      const { data: run, error: runError } = await supabase
        .from('tm_test_runs')
        .insert({
          scope_id: scope_id,
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

      // Auto-create step results for all test steps
      const testCase = scope.tm_test_cases as unknown as { id: string; tm_test_steps: { id: string; step_number: number }[] } | null;
      const steps = testCase?.tm_test_steps || [];

      console.log(`[CREATE RUN] Creating ${steps.length} step results for run ${run.id}`);

      if (steps.length > 0) {
        // Sort steps by step_number
        steps.sort((a, b) => a.step_number - b.step_number);
        
        const stepResults = steps.map(step => ({
          run_id: run.id,
          step_id: step.id,
          status: 'not_run'
        }));

        const { error: stepsError } = await supabase
          .from('tm_step_results')
          .insert(stepResults);

        if (stepsError) {
          console.error('[CREATE RUN] Error creating step results:', stepsError);
          throw stepsError;
        }
      }

      // Update scope to show in_progress
      await supabase
        .from('tm_cycle_scope')
        .update({ current_status: 'in_progress', latest_run_id: run.id })
        .eq('id', scope_id);

      // Get complete run with step results
      const { data: completeRun } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_step_results(
            id,
            step_id,
            status,
            tm_test_steps(id, step_number, action, expected_result, test_data)
          ),
          executed_by_user:tm_users(id, display_name, email)
        `)
        .eq('id', run.id)
        .single();

      // Sort steps
      if (completeRun?.tm_step_results) {
        completeRun.tm_step_results.sort((a: { tm_test_steps?: { step_number: number } }, b: { tm_test_steps?: { step_number: number } }) => 
          (a.tm_test_steps?.step_number || 0) - (b.tm_test_steps?.step_number || 0)
        );
      }

      return new Response(
        JSON.stringify(completeRun),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /tm-runs/{id}/steps/{stepId} - Update single step status with percolation
    if (req.method === 'PATCH' && runId && action === 'steps' && stepId && stepId !== 'bulk') {
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      console.log(`[STEP UPDATE] Updating step ${stepId} in run ${runId} to status: ${body.status}`);

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
        .select(`
          *,
          tm_test_steps(id, step_number, action, expected_result)
        `)
        .single();

      if (error) throw error;

      // ⚠️ CRITICAL: Trigger status percolation
      await percolateStatus(runId);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /tm-runs/{id}/steps/bulk - Bulk update steps with percolation
    if (req.method === 'PATCH' && runId && action === 'steps' && stepId === 'bulk') {
      const { updates: stepUpdates } = await req.json();
      // stepUpdates = [{ step_id, status, actual_result? }]

      if (!stepUpdates?.length) {
        return new Response(
          JSON.stringify({ error: 'updates array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user } } = await supabase.auth.getUser();
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      console.log(`[BULK UPDATE] Updating ${stepUpdates.length} steps in run ${runId}`);

      const results = [];

      for (const update of stepUpdates) {
        const updateData: Record<string, unknown> = {
          status: update.status,
          executed_at: new Date().toISOString(),
          executed_by: tmUser?.id
        };

        if (update.actual_result !== undefined) updateData.actual_result = update.actual_result;
        if (update.duration_seconds !== undefined) updateData.duration_seconds = update.duration_seconds;

        const { data, error } = await supabase
          .from('tm_step_results')
          .update(updateData)
          .eq('run_id', runId)
          .eq('step_id', update.step_id)
          .select()
          .single();

        if (!error && data) {
          results.push(data);
        }
      }

      // ⚠️ CRITICAL: Trigger status percolation after all updates
      await percolateStatus(runId);

      return new Response(
        JSON.stringify({ updated: results.length, data: results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-runs/{id}/complete - Mark run complete with percolation
    if (req.method === 'POST' && runId && action === 'complete') {
      const body = await req.json();

      console.log(`[COMPLETE] Completing run ${runId}`);

      // If status override provided, update it
      if (body.status && ['passed', 'failed', 'blocked'].includes(body.status)) {
        const updates: Record<string, unknown> = {
          status: body.status,
          completed_at: new Date().toISOString()
        };
        if (body.notes) updates.notes = body.notes;

        const { error: updateError } = await supabase
          .from('tm_test_runs')
          .update(updates)
          .eq('id', runId);

        if (updateError) throw updateError;

        // Get run for scope update
        const { data: run } = await supabase
          .from('tm_test_runs')
          .select('scope_id, cycle_id')
          .eq('id', runId)
          .single();

        if (run) {
          // Update scope with override status
          await supabase
            .from('tm_cycle_scope')
            .update({ current_status: body.status, latest_run_id: runId })
            .eq('id', run.scope_id);

          // Update cycle stats
          await updateCycleStats(run.cycle_id);
        }
      } else {
        // Calculate status from steps and percolate
        await percolateStatus(runId);

        // Set completed_at
        await supabase
          .from('tm_test_runs')
          .update({ 
            completed_at: new Date().toISOString(),
            notes: body.notes || undefined
          })
          .eq('id', runId);
      }

      // Get final run state
      const { data: finalRun, error } = await supabase
        .from('tm_test_runs')
        .select(`
          *,
          tm_cycle_scope(id, current_status),
          executed_by_user:tm_users(id, display_name, email)
        `)
        .eq('id', runId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(finalRun),
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
