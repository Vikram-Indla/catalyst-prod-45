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
    
    // Parse path: /manage-linked-items/test-cases/:testCaseId/[requirements|defects][/:id]
    const testCasesIndex = pathParts.indexOf('test-cases');
    const testCaseId = testCasesIndex >= 0 ? pathParts[testCasesIndex + 1] : null;

    if (!testCaseId) {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Test case ID required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requirementsIndex = pathParts.indexOf('requirements');
    const defectsIndex = pathParts.indexOf('defects');

    // =============================================
    // REQUIREMENTS
    // =============================================
    
    // POST /requirements - Link requirement
    if (req.method === 'POST' && requirementsIndex >= 0) {
      const { requirementId } = await req.json();

      const { data, error } = await supabase
        .from('test_case_requirements')
        .insert({
          test_case_id: testCaseId,
          requirement_id: requirementId,
          linked_by: user.id,
        })
        .select(`
          id, linked_at, linked_by,
          requirement:requirements(id, key, title, status)
        `)
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return new Response(
            JSON.stringify({ error: { code: 'ALREADY_LINKED', message: 'Requirement already linked' } }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }

      // Log activity
      const reqData = data.requirement as unknown as { key: string } | null;
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'requirement_linked',
        p_description: `Linked requirement: ${reqData?.key || requirementId}`,
        p_metadata: { requirementId },
      });

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /requirements/:id - Unlink requirement
    if (req.method === 'DELETE' && requirementsIndex >= 0) {
      const requirementId = pathParts[requirementsIndex + 1];

      // Get requirement info for activity log
      const { data: link } = await supabase
        .from('test_case_requirements')
        .select('requirement:requirements(key)')
        .eq('test_case_id', testCaseId)
        .eq('requirement_id', requirementId)
        .single();

      const { error } = await supabase
        .from('test_case_requirements')
        .delete()
        .eq('test_case_id', testCaseId)
        .eq('requirement_id', requirementId);

      if (error) throw error;

      // Log activity
      const linkReq = link?.requirement as unknown as { key: string } | null;
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'requirement_unlinked',
        p_description: `Unlinked requirement: ${linkReq?.key || requirementId}`,
        p_metadata: { requirementId },
      });

      return new Response(
        JSON.stringify({ data: { success: true } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // DEFECTS
    // =============================================

    // POST /defects - Link defect
    if (req.method === 'POST' && defectsIndex >= 0) {
      const { defectId, stepId } = await req.json();

      const { data, error } = await supabase
        .from('test_case_defects')
        .insert({
          test_case_id: testCaseId,
          defect_id: defectId,
          step_id: stepId || null,
          linked_by: user.id,
        })
        .select(`
          id, step_id, linked_at, linked_by,
          defect:defects(id, key, title, severity, status)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          return new Response(
            JSON.stringify({ error: { code: 'ALREADY_LINKED', message: 'Defect already linked' } }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }

      // Log activity
      const defData = data.defect as unknown as { key: string } | null;
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'defect_linked',
        p_description: `Linked defect: ${defData?.key || defectId}${stepId ? ` to step` : ''}`,
        p_metadata: { defectId, stepId },
      });

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /defects/:id - Unlink defect
    if (req.method === 'DELETE' && defectsIndex >= 0) {
      const defectId = pathParts[defectsIndex + 1];

      // Get defect info for activity log
      const { data: link } = await supabase
        .from('test_case_defects')
        .select('defect:defects(key)')
        .eq('test_case_id', testCaseId)
        .eq('defect_id', defectId)
        .single();

      const { error } = await supabase
        .from('test_case_defects')
        .delete()
        .eq('test_case_id', testCaseId)
        .eq('defect_id', defectId);

      if (error) throw error;

      // Log activity
      const linkDef = link?.defect as unknown as { key: string } | null;
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: testCaseId,
        p_action: 'defect_unlinked',
        p_description: `Unlinked defect: ${linkDef?.key || defectId}`,
        p_metadata: { defectId },
      });

      return new Response(
        JSON.stringify({ data: { success: true } }),
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
