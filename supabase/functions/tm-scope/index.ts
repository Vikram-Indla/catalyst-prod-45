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
    
    // Expected: /tm-scope/cycles/:cycleId/scope/:scopeId?
    const cycleIdIndex = pathParts.indexOf('cycles') + 1;
    const cycleId = pathParts[cycleIdIndex];
    const scopeIdIndex = pathParts.indexOf('scope') + 1;
    const scopeId = pathParts[scopeIdIndex];
    const action = pathParts[scopeIdIndex + 1];

    if (!cycleId) {
      return new Response(
        JSON.stringify({ error: 'Cycle ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /cycles/:cycleId/scope - List scope items
    if (req.method === 'GET' && !scopeId) {
      const status = url.searchParams.get('status');
      const assigned_to = url.searchParams.get('assigned_to');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tm_cycle_scope')
        .select(`
          *,
          tm_test_cases(
            id, case_key, title, priority, status,
            tm_folders(id, name)
          ),
          assignee:tm_users(id, display_name, avatar_url),
          latest_run:tm_test_runs(id, started_at, completed_at, status)
        `, { count: 'exact' })
        .eq('cycle_id', cycleId)
        .order('execution_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('current_status', status);
      if (assigned_to) query = query.eq('assigned_to', assigned_to);

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

    // POST /cycles/:cycleId/scope - Add cases to scope
    if (req.method === 'POST' && !scopeId) {
      const body = await req.json();
      const { case_ids, assigned_to } = body;

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
        .eq('id', cycleId)
        .single();

      if (cycle?.status === 'completed' || cycle?.status === 'cancelled') {
        return new Response(
          JSON.stringify({ error: 'Cannot modify scope of completed/cancelled cycle' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current max order
      const { data: maxOrder } = await supabase
        .from('tm_cycle_scope')
        .select('execution_order')
        .eq('cycle_id', cycleId)
        .order('execution_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      let orderStart = (maxOrder?.execution_order || 0) + 1;

      // Check for duplicates
      const { data: existing } = await supabase
        .from('tm_cycle_scope')
        .select('case_id')
        .eq('cycle_id', cycleId)
        .in('case_id', case_ids);

      const existingIds = new Set(existing?.map(e => e.case_id) || []);
      const newCaseIds = case_ids.filter((id: string) => !existingIds.has(id));

      if (newCaseIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'All cases already in scope', duplicates: case_ids }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const scopeItems = newCaseIds.map((caseId: string, idx: number) => ({
        cycle_id: cycleId,
        case_id: caseId,
        assigned_to: assigned_to || null,
        current_status: 'not_run',
        execution_order: orderStart + idx
      }));

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .insert(scopeItems)
        .select();

      if (error) throw error;

      // Update cycle stats
      await supabase.rpc('tm_update_cycle_stats', { p_cycle_id: cycleId });

      return new Response(
        JSON.stringify({ 
          added: data.length, 
          skipped: existingIds.size,
          data 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /cycles/:cycleId/scope/:scopeId - Update scope item
    if (req.method === 'PATCH' && scopeId && !action) {
      const body = await req.json();
      
      const allowedFields = ['assigned_to', 'execution_order'];
      const updates: Record<string, unknown> = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) updates[field] = body[field];
      }

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .update(updates)
        .eq('id', scopeId)
        .eq('cycle_id', cycleId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /cycles/:cycleId/scope/:scopeId - Remove from scope
    if (req.method === 'DELETE' && scopeId && !action) {
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
        .eq('id', scopeId)
        .eq('cycle_id', cycleId);

      if (error) throw error;

      // Update cycle stats
      await supabase.rpc('tm_update_cycle_stats', { p_cycle_id: cycleId });

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // POST /cycles/:cycleId/scope/bulk-assign - Bulk assign
    if (req.method === 'POST' && scopeId === 'bulk-assign') {
      const { scope_ids, assigned_to } = await req.json();

      if (!scope_ids?.length) {
        return new Response(
          JSON.stringify({ error: 'scope_ids array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tm_cycle_scope')
        .update({ assigned_to })
        .eq('cycle_id', cycleId)
        .in('id', scope_ids)
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({ updated: data.length, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /cycles/:cycleId/scope/reorder - Reorder scope
    if (req.method === 'POST' && scopeId === 'reorder') {
      const { order } = await req.json(); // Array of { id, execution_order }

      if (!order?.length) {
        return new Response(
          JSON.stringify({ error: 'order array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update each item's order
      const updates = order.map((item: { id: string; execution_order: number }) =>
        supabase
          .from('tm_cycle_scope')
          .update({ execution_order: item.execution_order })
          .eq('id', item.id)
          .eq('cycle_id', cycleId)
      );

      await Promise.all(updates);

      return new Response(
        JSON.stringify({ message: 'Order updated', count: order.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /cycles/:cycleId/scope/bulk - Bulk remove
    if (req.method === 'DELETE' && scopeId === 'bulk') {
      const { scope_ids } = await req.json();

      if (!scope_ids?.length) {
        return new Response(
          JSON.stringify({ error: 'scope_ids array required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for runs
      const { data: withRuns } = await supabase
        .from('tm_test_runs')
        .select('scope_id')
        .in('scope_id', scope_ids);

      const idsWithRuns = new Set(withRuns?.map(r => r.scope_id) || []);
      const removableIds = scope_ids.filter((id: string) => !idsWithRuns.has(id));

      if (removableIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'All selected items have runs and cannot be removed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('tm_cycle_scope')
        .delete()
        .eq('cycle_id', cycleId)
        .in('id', removableIds);

      if (error) throw error;

      await supabase.rpc('tm_update_cycle_stats', { p_cycle_id: cycleId });

      return new Response(
        JSON.stringify({ 
          removed: removableIds.length, 
          skipped: idsWithRuns.size 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
