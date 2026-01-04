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
    
    // Expected: /tm-cycles/projects/:projectId/cycles/:cycleId?
    const projectIdIndex = pathParts.indexOf('projects') + 1;
    const projectId = pathParts[projectIdIndex];
    const cycleIdIndex = pathParts.indexOf('cycles') + 1;
    const cycleId = pathParts[cycleIdIndex];
    const action = pathParts[cycleIdIndex + 1];

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /projects/:projectId/cycles - List cycles
    if (req.method === 'GET' && !cycleId) {
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
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name)
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

    // POST /projects/:projectId/cycles - Create cycle
    if (req.method === 'POST' && !cycleId) {
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      // Get user's tm_users id
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Generate cycle key
      const { data: keyData } = await supabase.rpc('tm_next_entity_key', {
        p_project_id: projectId,
        p_prefix: 'CY'
      });

      const cycleData = {
        project_id: projectId,
        cycle_key: keyData || `CY-${Date.now()}`,
        name: body.name,
        description: body.description,
        environment_id: body.environment_id,
        planned_start_date: body.planned_start_date,
        planned_end_date: body.planned_end_date,
        status: 'not_started',
        created_by: tmUser?.id,
        total_cases: 0,
        passed_count: 0,
        failed_count: 0,
        blocked_count: 0,
        not_run_count: 0
      };

      const { data, error } = await supabase
        .from('tm_test_cycles')
        .insert(cycleData)
        .select()
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
          await supabase.rpc('tm_update_cycle_stats', { p_cycle_id: data.id });
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
          await supabase.rpc('tm_update_cycle_stats', { p_cycle_id: data.id });
        }
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /projects/:projectId/cycles/:cycleId - Get single cycle
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
            assignee:tm_users(id, display_name)
          ),
          created_by_user:tm_users!tm_test_cycles_created_by_fkey(id, display_name)
        `)
        .eq('id', cycleId)
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Cycle not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /projects/:projectId/cycles/:cycleId - Update cycle
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
        .eq('project_id', projectId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /projects/:projectId/cycles/:cycleId - Delete cycle
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

      const { error } = await supabase
        .from('tm_test_cycles')
        .delete()
        .eq('id', cycleId)
        .eq('project_id', projectId);

      if (error) throw error;

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /projects/:projectId/cycles/:cycleId/clone - Clone cycle
    if (req.method === 'POST' && action === 'clone') {
      const body = await req.json();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      // Get original cycle
      const { data: original } = await supabase
        .from('tm_test_cycles')
        .select('*, tm_cycle_scope(*)')
        .eq('id', cycleId)
        .single();

      if (!original) {
        return new Response(
          JSON.stringify({ error: 'Cycle not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate new key
      const { data: keyData } = await supabase.rpc('tm_next_entity_key', {
        p_project_id: projectId,
        p_prefix: 'CY'
      });

      // Create new cycle
      const { data: newCycle, error: cycleError } = await supabase
        .from('tm_test_cycles')
        .insert({
          project_id: projectId,
          cycle_key: keyData,
          name: body.name || `${original.name} (Copy)`,
          description: original.description,
          environment_id: body.environment_id || original.environment_id,
          planned_start_date: body.planned_start_date,
          planned_end_date: body.planned_end_date,
          status: 'not_started',
          created_by: tmUser?.id,
          total_cases: original.total_cases,
          not_run_count: original.total_cases,
          passed_count: 0,
          failed_count: 0,
          blocked_count: 0
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // Clone scope items
      if (original.tm_cycle_scope?.length) {
        const scopeItems = original.tm_cycle_scope.map((s: Record<string, unknown>) => ({
          cycle_id: newCycle.id,
          case_id: s.case_id,
          current_status: 'not_run',
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

    // GET /projects/:projectId/cycles/:cycleId/progress - Get progress
    if (req.method === 'GET' && action === 'progress') {
      const { data, error } = await supabase
        .from('tm_test_cycles')
        .select(`
          id,
          total_cases,
          passed_count,
          failed_count,
          blocked_count,
          not_run_count,
          planned_start_date,
          planned_end_date,
          actual_start_date,
          status
        `)
        .eq('id', cycleId)
        .single();

      if (error) throw error;

      const executed = data.passed_count + data.failed_count + data.blocked_count;
      const progress = data.total_cases > 0 ? Math.round((executed / data.total_cases) * 100) : 0;
      const passRate = executed > 0 ? Math.round((data.passed_count / executed) * 100) : 0;

      // Calculate schedule status
      const now = new Date();
      const endDate = data.planned_end_date ? new Date(data.planned_end_date) : null;
      const startDate = data.planned_start_date ? new Date(data.planned_start_date) : null;
      
      let scheduleStatus = 'on_track';
      if (endDate && now > endDate && data.status !== 'completed') {
        scheduleStatus = 'overdue';
      } else if (startDate && endDate) {
        const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = (daysElapsed / totalDays) * 100;
        if (progress < expectedProgress - 10) {
          scheduleStatus = 'behind';
        } else if (progress > expectedProgress + 10) {
          scheduleStatus = 'ahead';
        }
      }

      return new Response(
        JSON.stringify({
          ...data,
          executed,
          progress,
          passRate,
          scheduleStatus
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
