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
    // GET /tm-scope?cycle_id={id} - Get scope items with case details
    // POST /tm-scope - Add cases to scope (verify approved status)
    // DELETE /tm-scope/{id} - Remove from scope (prevent if has runs)
    // POST /tm-scope/assign - Assign user to scope item
    // POST /tm-scope/bulk-assign - Bulk assign multiple items
    
    const scopeId = pathParts[1]; // After 'tm-scope'
    const isAssign = scopeId === 'assign';
    const isBulkAssign = scopeId === 'bulk-assign';

    // Helper function to update cycle stats
    async function updateCycleStats(cycleId: string) {
      // Count scope items by status
      const { data: stats } = await supabase
        .from('tm_cycle_scope')
        .select('current_status')
        .eq('cycle_id', cycleId);

      if (stats) {
        const counts = {
          total_cases: stats.length,
          not_run_count: 0,
          passed_count: 0,
          failed_count: 0,
          blocked_count: 0
        };

        stats.forEach((s) => {
          switch (s.current_status) {
            case 'not_run': counts.not_run_count++; break;
            case 'passed': counts.passed_count++; break;
            case 'failed': counts.failed_count++; break;
            case 'blocked': counts.blocked_count++; break;
          }
        });

        await supabase
          .from('tm_test_cycles')
          .update(counts)
          .eq('id', cycleId);
      }
    }

    // GET /tm-scope?cycle_id={id} - Get scope items with case details and steps
    if (req.method === 'GET' && !scopeId) {
      const cycleId = url.searchParams.get('cycle_id');
      if (!cycleId) {
        return new Response(
          JSON.stringify({ error: 'cycle_id query parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const status = url.searchParams.get('status');
      const assigned_to = url.searchParams.get('assigned_to');
      const include_steps = url.searchParams.get('include_steps') === 'true';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      // Build select query with optional steps
      const caseSelect = include_steps
        ? `tm_test_cases(
            id, case_key, title, priority, status, preconditions, description,
            tm_folders(id, name, path),
            tm_test_steps(id, step_number, action, expected_result, test_data)
          )`
        : `tm_test_cases(
            id, case_key, title, priority, status,
            tm_folders(id, name)
          )`;

      let query = supabase
        .from('tm_cycle_scope')
        .select(`
          *,
          ${caseSelect},
          assignee:tm_users(id, display_name, email, avatar_url),
          latest_run:tm_test_runs(id, started_at, completed_at, status, executed_by)
        `, { count: 'exact' })
        .eq('cycle_id', cycleId)
        .order('execution_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('current_status', status);
      if (assigned_to) query = query.eq('assigned_to', assigned_to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Sort steps by step_number if included
      if (include_steps && data) {
        data.forEach((item: { tm_test_cases?: { tm_test_steps?: { step_number: number }[] } }) => {
          if (item.tm_test_cases?.tm_test_steps) {
            item.tm_test_cases.tm_test_steps.sort((a, b) => a.step_number - b.step_number);
          }
        });
      }

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

    // POST /tm-scope - Add cases to scope (verify approved status)
    if (req.method === 'POST' && !scopeId) {
      const body = await req.json();
      const { cycle_id, case_ids, assigned_to } = body;

      if (!cycle_id) {
        return new Response(
          JSON.stringify({ error: 'cycle_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!case_ids?.length) {
        return new Response(
          JSON.stringify({ error: 'case_ids array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check cycle status
      const { data: cycle } = await supabase
        .from('tm_test_cycles')
        .select('status')
        .eq('id', cycle_id)
        .single();

      if (cycle?.status === 'completed' || cycle?.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Cannot modify scope of completed/cancelled cycle' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify all cases are approved
      const { data: cases } = await supabase
        .from('tm_test_cases')
        .select('id, status, case_key')
        .in('id', case_ids);

      const approvedCases = cases?.filter(c => c.status === 'approved') || [];
      const unapprovedCases = cases?.filter(c => c.status !== 'approved') || [];

      if (approvedCases.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No approved cases to add', 
            unapproved: unapprovedCases.map(c => ({ id: c.id, key: c.case_key, status: c.status }))
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for duplicates in cycle
      const { data: existing } = await supabase
        .from('tm_cycle_scope')
        .select('case_id')
        .eq('cycle_id', cycle_id)
        .in('case_id', approvedCases.map(c => c.id));

      const existingIds = new Set(existing?.map(e => e.case_id) || []);
      const newCases = approvedCases.filter(c => !existingIds.has(c.id));

      if (newCases.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'All approved cases already in scope', 
            duplicates: approvedCases.map(c => c.id)
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current max order
      const { data: maxOrder } = await supabase
        .from('tm_cycle_scope')
        .select('execution_order')
        .eq('cycle_id', cycle_id)
        .order('execution_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let orderStart = (maxOrder?.execution_order || 0) + 1;

      const scopeItems = newCases.map((c, idx) => ({
        cycle_id: cycle_id,
        case_id: c.id,
        assigned_to: assigned_to || null,
        current_status: 'not_run',
        execution_order: orderStart + idx
      }));

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .insert(scopeItems)
        .select(`
          *,
          tm_test_cases(id, case_key, title, priority)
        `);

      if (error) throw error;

      // Update cycle stats
      await updateCycleStats(cycle_id);

      return new Response(
        JSON.stringify({ 
          added: data.length, 
          skipped_duplicates: existingIds.size,
          skipped_unapproved: unapprovedCases.length,
          data 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-scope/assign - Assign user to single scope item
    if (req.method === 'POST' && isAssign) {
      const { scope_id, assigned_to } = await req.json();

      if (!scope_id) {
        return new Response(
          JSON.stringify({ error: 'scope_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .update({ assigned_to: assigned_to || null })
        .eq('id', scope_id)
        .select(`
          *,
          tm_test_cases(id, case_key, title),
          assignee:tm_users(id, display_name, email)
        `)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tm-scope/bulk-assign - Bulk assign multiple items
    if (req.method === 'POST' && isBulkAssign) {
      const { scope_ids, assigned_to } = await req.json();

      if (!scope_ids?.length) {
        return new Response(
          JSON.stringify({ error: 'scope_ids array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .update({ assigned_to: assigned_to || null })
        .in('id', scope_ids)
        .select(`
          *,
          tm_test_cases(id, case_key, title),
          assignee:tm_users(id, display_name, email)
        `);

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          updated: data.length, 
          data 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /tm-scope/{id} - Remove from scope (prevent if has runs)
    if (req.method === 'DELETE' && scopeId && !isAssign && !isBulkAssign) {
      // Get scope item to find cycle_id
      const { data: scopeItem } = await supabase
        .from('tm_cycle_scope')
        .select('cycle_id')
        .eq('id', scopeId)
        .single();

      if (!scopeItem) {
        return new Response(
          JSON.stringify({ error: 'Scope item not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if there are any runs for this scope item
      const { count } = await supabase
        .from('tm_test_runs')
        .select('id', { count: 'exact', head: true })
        .eq('scope_id', scopeId);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({ error: 'Cannot remove scope item with existing runs' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('tm_cycle_scope')
        .delete()
        .eq('id', scopeId);

      if (error) throw error;

      // Update cycle stats
      await updateCycleStats(scopeItem.cycle_id);

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scope error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
