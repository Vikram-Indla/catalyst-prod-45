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
    // GET /tm-cycles?project_id={id} - List cycles
    // GET /tm-cycles/{id} - Get cycle with stats
    // POST /tm-cycles - Create cycle
    // PATCH /tm-cycles/{id} - Update cycle
    // DELETE /tm-cycles/{id} - Delete cycle
    // POST /tm-cycles/{id}/clone - Clone cycle
    
    const cycleId = pathParts[1]; // After 'tm-cycles'
    const action = pathParts[2]; // 'clone' if present

    // GET /tm-cycles?project_id={id} - List cycles
    if (req.method === 'GET' && !cycleId) {
      const projectId = url.searchParams.get('project_id');
      if (!projectId) {
        return new Response(
          JSON.stringify({ error: 'project_id query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = url.searchParams.get('status');
      const environment_id = url.searchParams.get('environment_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tm_test_cycles')
        .select(`
          *,
          tm_environments(id, name),
          tm_cycle_scope(count),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name, email)
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (environment_id) query = query.eq('environment_id', environment_id);

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

    // POST /tm-cycles - Create cycle
    if (req.method === 'POST' && !cycleId) {
      const body = await req.json();
      
      if (!body.project_id) {
        return new Response(
          JSON.stringify({ error: 'project_id required in body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Get user's tm_users id
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Generate cycle key using next_entity_key function
      const { data: keyData, error: keyError } = await supabase.rpc('tm_next_entity_key', {
        p_project_id: body.project_id,
        p_prefix: 'CY'
      });

      console.log('Generated key:', keyData, 'Error:', keyError);

      const cycleData = {
        project_id: body.project_id,
        cycle_key: keyData || `CY-${String(Date.now()).slice(-3).padStart(3, '0')}`,
        name: body.name,
        description: body.description,
        environment_id: body.environment_id,
        planned_start_date: body.planned_start_date,
        planned_end_date: body.planned_end_date,
        status: 'not_started',
        created_by: tmUser?.id,
        // Initialize all stats to 0
        total_cases: 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0,
        not_run_count: 0
      };

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .insert(cycleData)
        .select(`
          *,
          tm_environments(id, name),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name, email)
        `)
        .single();

      if (error) throw error;

      // If source_set_ids provided, add scope from sets
      if (body.source_set_ids?.length > 0) {
        const { data: setCases } = await supabase
          .from('tm_set_cases')
          .select('case_id')
          .in('set_id', body.source_set_ids);

        if (setCases?.length) {
          const scopeItems = setCases.map((sc, idx) => ({
            cycle_id: data.id,
            case_id: sc.case_id,
            current_status: 'not_run',
            execution_order: idx + 1
          }));

          await supabase.from('tm_cycle_scope').insert(scopeItems);
          
          // Update cycle counts
          await supabase
            .from('tm_test_cycles')
            .update({ 
              total_cases: setCases.length, 
              not_run_count: setCases.length 
            })
            .eq('id', data.id);
        }
      }

      // If source_folder_id provided, add all cases from folder
      if (body.source_folder_id) {
        const { data: folderCases } = await supabase
          .from('tm_test_cases')
          .select('id')
          .eq('folder_id', body.source_folder_id)
          .eq('status', 'approved');

        if (folderCases?.length) {
          const scopeItems = folderCases.map((c, idx) => ({
            cycle_id: data.id,
            case_id: c.id,
            current_status: 'not_run',
            execution_order: idx + 1
          }));

          await supabase.from('tm_cycle_scope').insert(scopeItems);
          
          await supabase
            .from('tm_test_cycles')
            .update({ 
              total_cases: folderCases.length, 
              not_run_count: folderCases.length 
            })
            .eq('id', data.id);
        }
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /tm-cycles/{id} - Get single cycle with stats
    if (req.method === 'GET' && cycleId && !action) {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select(`
          *,
          tm_environments(id, name),
          tm_cycle_scope(
            id,
            case_id,
            current_status,
            assigned_to,
            execution_order,
            tm_test_cases(id, case_key, title, priority),
            assignee:tm_users(id, display_name, email)
          ),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name, email)
        `)
        .eq('id', cycleId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Cycle not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate progress stats
      const executed = data.passed_count + data.failed_count + data.blocked_count;
      const progress = data.total_cases > 0 ? Math.round((executed / data.total_cases) * 100) : 0;
      const passRate = executed > 0 ? Math.round((data.passed_count / executed) * 100) : 0;

      return new Response(
        JSON.stringify({
          ...data,
          stats: {
            executed,
            progress,
            passRate
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /tm-cycles/{id} - Update cycle
    if (req.method === 'PATCH' && cycleId && !action) {
      const body = await req.json();
      
      // Validate status transitions
      if (body.status) {
        const { data: current } = await supabase
          .from('tm_test_cycles')
          .select('status')
          .eq('id', cycleId)
          .single();

        const validTransitions: Record<string, string[]> = {
          'not_started': ['in_progress', 'cancelled'],
          'in_progress': ['paused', 'completed', 'cancelled'],
          'paused': ['in_progress', 'cancelled'],
          'completed': [],
          'cancelled': []
        };

        if (!validTransitions[current?.status]?.includes(body.status)) {
          return new Response(
            JSON.stringify({ error: `Invalid status transition from ${current?.status} to ${body.status}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Set actual dates based on status
        if (body.status === 'in_progress' && !body.actual_start_date) {
          body.actual_start_date = new Date().toISOString();
        }
        if (body.status === 'completed' && !body.actual_end_date) {
          body.actual_end_date = new Date().toISOString();
        }
      }

      const allowedFields = ['name', 'description', 'environment_id', 'status', 
        'planned_start_date', 'planned_end_date', 'actual_start_date', 'actual_end_date'];
      const updates: Record<string, unknown> = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field];
      }

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .update(updates)
        .eq('id', cycleId)
        .select(`
          *,
          tm_environments(id, name),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name, email)
        `)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /tm-cycles/{id} - Delete cycle (prevent if has runs)
    if (req.method === 'DELETE' && cycleId && !action) {
      // Check if cycle has any runs
      const { count } = await supabase
        .from('tm_test_runs')
        .select('id', { count: 'exact', head: true })
        .eq('cycle_id', cycleId);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete cycle with existing runs. Archive it instead.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete scope items first
      await supabase
        .from('tm_cycle_scope')
        .delete()
        .eq('cycle_id', cycleId);

      const { error } = await supabase
        .from('tm_test_cycles')
        .delete()
        .eq('id', cycleId);

      if (error) throw error;

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /tm-cycles/{id}/clone - Clone cycle with scope
    if (req.method === 'POST' && action === 'clone') {
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Get original cycle with scope
      const { data: original, error: originalError } = await supabase
        .from('tm_test_cycles')
        .select(`
          *,
          tm_cycle_scope(case_id, assigned_to, execution_order)
        `)
        .eq('id', cycleId)
        .single();

      if (originalError) throw originalError;
      if (!original) {
        return new Response(
          JSON.stringify({ error: 'Cycle not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new key using next_entity_key
      const { data: keyData } = await supabase.rpc('tm_next_entity_key', {
        p_project_id: original.project_id,
        p_prefix: 'CY'
      });

      const scopeCount = original.tm_cycle_scope?.length || 0;

      // Create new cycle with reset stats
      const { data: newCycle, error: cycleError } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: original.project_id,
          cycle_key: keyData,
          name: body.name || `${original.name} (Copy)`,
          description: original.description,
          environment_id: body.environment_id || original.environment_id,
          planned_start_date: body.planned_start_date,
          planned_end_date: body.planned_end_date,
          status: 'not_started',
          created_by: tmUser?.id,
          // Initialize stats based on scope
          total_cases: scopeCount,
          not_run_count: scopeCount,
          passed_count: 0,
          failed_count: 0,
          blocked_count: 0
        })
        .select(`
          *,
          tm_environments(id, name),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name, email)
        `)
        .single();

      if (cycleError) throw cycleError;

      // Clone scope items with not_run status
      if (original.tm_cycle_scope?.length) {
        const scopeItems = original.tm_cycle_scope.map((s: { case_id: string; assigned_to: string | null; execution_order: number }) => ({
          cycle_id: newCycle.id,
          case_id: s.case_id,
          current_status: 'not_run', // Always reset to not_run
          assigned_to: body.keep_assignments ? s.assigned_to : null,
          execution_order: s.execution_order
        }));

        await supabase.from('tm_cycle_scope').insert(scopeItems);
      }

      return new Response(
        JSON.stringify(newCycle),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cycles error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
