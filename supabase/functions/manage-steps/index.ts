import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Parse path: /manage-steps/test-cases/:testCaseId/steps[/:stepId][/action]
    const testCasesIndex = pathParts.indexOf('test-cases');
    const testCaseId = testCasesIndex >= 0 ? pathParts[testCasesIndex + 1] : null;
    const stepsIndex = pathParts.indexOf('steps');
    
    let stepId: string | null = null;
    let action: string | null = null;
    
    if (stepsIndex >= 0 && stepsIndex < pathParts.length - 1) {
      const nextPart = pathParts[stepsIndex + 1];
      if (!['reorder', 'duplicate'].includes(nextPart)) {
        stepId = nextPart;
        if (stepsIndex + 2 < pathParts.length) {
          action = pathParts[stepsIndex + 2];
        }
      } else {
        action = nextPart;
      }
    }

    if (!testCaseId) {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Test case ID required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // POST /steps - Add new step
    // =============================================
    if (req.method === 'POST' && !stepId && !action) {
      const body = await req.json();

      // Get max order
      const { data: maxOrderResult } = await supabase
        .from('test_steps')
        .select('step_order')
        .eq('test_case_id', testCaseId)
        .order('step_order', { ascending: false })
        .limit(1)
        .single();

      const newOrder = (maxOrderResult?.step_order || 0) + 1;

      // Insert step
      const { data: step, error } = await supabase
        .from('test_steps')
        .insert({
          test_case_id: testCaseId,
          step_order: newOrder,
          action: body.action,
          expected_result: body.expectedResult,
          test_data: body.testData || null,
          notes: body.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'step_added',
        p_description: `Added step ${newOrder}`,
        p_metadata: { stepId: step.id, order: newOrder },
      });

      // Update test case updated_by
      await supabase
        .from('test_cases')
        .update({ updated_by: user.id })
        .eq('id', testCaseId);

      return new Response(
        JSON.stringify({
          data: {
            id: step.id,
            testCaseId: step.test_case_id,
            order: step.step_order,
            action: step.action,
            expectedResult: step.expected_result,
            testData: step.test_data,
            notes: step.notes,
            attachments: [],
            createdAt: step.created_at,
            updatedAt: step.updated_at,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // PATCH /steps/:stepId - Update step
    // =============================================
    if (req.method === 'PATCH' && stepId && !action) {
      const body = await req.json();

      const updateData: Record<string, unknown> = {};
      if (body.action !== undefined) updateData.action = body.action;
      if (body.expectedResult !== undefined) updateData.expected_result = body.expectedResult;
      if (body.testData !== undefined) updateData.test_data = body.testData;
      if (body.notes !== undefined) updateData.notes = body.notes;

      const { data: step, error } = await supabase
        .from('test_steps')
        .update(updateData)
        .eq('id', stepId)
        .eq('test_case_id', testCaseId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'step_updated',
        p_description: `Updated step ${step.step_order}`,
        p_metadata: { stepId: step.id, changes: Object.keys(updateData) },
      });

      // Update test case updated_by
      await supabase
        .from('test_cases')
        .update({ updated_by: user.id })
        .eq('id', testCaseId);

      return new Response(
        JSON.stringify({
          data: {
            id: step.id,
            testCaseId: step.test_case_id,
            order: step.step_order,
            action: step.action,
            expectedResult: step.expected_result,
            testData: step.test_data,
            notes: step.notes,
            createdAt: step.created_at,
            updatedAt: step.updated_at,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // DELETE /steps/:stepId - Delete step
    // =============================================
    if (req.method === 'DELETE' && stepId) {
      // Get step order before delete
      const { data: stepToDelete } = await supabase
        .from('test_steps')
        .select('step_order')
        .eq('id', stepId)
        .single();

      if (!stepToDelete) {
        return new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Step not found' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete step
      const { error } = await supabase
        .from('test_steps')
        .delete()
        .eq('id', stepId)
        .eq('test_case_id', testCaseId);

      if (error) throw error;

      // Reorder remaining
      await supabase.rpc('reorder_remaining_steps', {
        p_test_case_id: testCaseId,
        p_deleted_order: stepToDelete.step_order,
      });

      // Log activity
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'step_deleted',
        p_description: `Deleted step ${stepToDelete.step_order}`,
        p_metadata: { stepId, deletedOrder: stepToDelete.step_order },
      });

      // Update test case updated_by
      await supabase
        .from('test_cases')
        .update({ updated_by: user.id })
        .eq('id', testCaseId);

      return new Response(
        JSON.stringify({ data: { success: true } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // POST /steps/reorder - Reorder steps
    // =============================================
    if (req.method === 'POST' && action === 'reorder') {
      const { stepIds } = await req.json();

      await supabase.rpc('reorder_test_steps', {
        p_test_case_id: testCaseId,
        p_step_ids: stepIds,
      });

      // Update test case updated_by
      await supabase
        .from('test_cases')
        .update({ updated_by: user.id })
        .eq('id', testCaseId);

      // Get updated steps
      const { data: steps } = await supabase
        .from('test_steps')
        .select('*')
        .eq('test_case_id', testCaseId)
        .order('step_order', { ascending: true });

      return new Response(
        JSON.stringify({
          data: (steps || []).map((s) => ({
            id: s.id,
            testCaseId: s.test_case_id,
            order: s.step_order,
            action: s.action,
            expectedResult: s.expected_result,
            testData: s.test_data,
            notes: s.notes,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // POST /steps/:stepId/duplicate - Duplicate step
    // =============================================
    if (req.method === 'POST' && action === 'duplicate' && stepId) {
      // Get original step
      const { data: original } = await supabase
        .from('test_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (!original) {
        return new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Step not found' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Shift subsequent steps
      await supabase.rpc('shift_steps_down', {
        p_test_case_id: testCaseId,
        p_after_order: original.step_order,
      });

      // Insert duplicate
      const { data: duplicate, error } = await supabase
        .from('test_steps')
        .insert({
          test_case_id: testCaseId,
          step_order: original.step_order + 1,
          action: original.action,
          expected_result: original.expected_result,
          test_data: original.test_data,
          notes: original.notes,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'step_added',
        p_description: `Duplicated step ${original.step_order} → step ${duplicate.step_order}`,
        p_metadata: { originalStepId: stepId, newStepId: duplicate.id },
      });

      // Update test case updated_by
      await supabase
        .from('test_cases')
        .update({ updated_by: user.id })
        .eq('id', testCaseId);

      return new Response(
        JSON.stringify({
          data: {
            id: duplicate.id,
            testCaseId: duplicate.test_case_id,
            order: duplicate.step_order,
            action: duplicate.action,
            expectedResult: duplicate.expected_result,
            testData: duplicate.test_data,
            notes: duplicate.notes,
            attachments: [],
            createdAt: duplicate.created_at,
            updatedAt: duplicate.updated_at,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
