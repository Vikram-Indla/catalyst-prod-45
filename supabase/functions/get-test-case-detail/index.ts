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
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    // Parse request
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const historyLimit = parseInt(url.searchParams.get('historyLimit') || '5');
    const activityLimit = parseInt(url.searchParams.get('activityLimit') || '10');

    // Validate ID
    if (!id || id === 'get-test-case-detail') {
      return new Response(
        JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Test case ID required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch test case with relations
    const { data: testCase, error: tcError } = await supabase
      .from('test_cases')
      .select(`
        *,
        assignee:profiles!assignee_id(id, full_name, email, avatar_url),
        folder:test_folders(id, name, color),
        release:releases(id, name, status),
        created_by_profile:profiles!created_by(full_name),
        updated_by_profile:profiles!updated_by(full_name),
        reviewer:profiles!reviewer_id(id, full_name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (tcError) {
      if (tcError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Test case not found' } }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw tcError;
    }

    // Fetch steps
    const { data: steps } = await supabase
      .from('test_steps')
      .select('*')
      .eq('test_case_id', id)
      .order('step_order', { ascending: true });

    // Fetch case-level attachments
    const { data: caseAttachments } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', 'test_case')
      .eq('entity_id', id);

    // Fetch linked requirements
    const { data: linkedReqs } = await supabase
      .from('test_case_requirements')
      .select(`
        id, linked_at, linked_by,
        requirement:requirements(id, key, title, status),
        linked_by_profile:profiles!linked_by(full_name)
      `)
      .eq('test_case_id', id);

    // Fetch linked defects
    const { data: linkedDefects } = await supabase
      .from('test_case_defects')
      .select(`
        id, step_id, linked_at, linked_by,
        defect:defects(id, key, title, severity, status),
        linked_by_profile:profiles!linked_by(full_name)
      `)
      .eq('test_case_id', id);

    // Fetch execution history
    const { data: executions } = await supabase
      .from('execution_results')
      .select(`
        *,
        executed_by_profile:profiles!executed_by(full_name, avatar_url)
      `)
      .eq('test_case_id', id)
      .order('executed_at', { ascending: false })
      .limit(historyLimit);

    // Fetch step results for executions
    const executionIds = executions?.map((e: { id: string }) => e.id) || [];
    const { data: stepResults } = executionIds.length > 0 
      ? await supabase
          .from('step_results')
          .select('*')
          .in('execution_result_id', executionIds)
      : { data: [] };

    // Fetch activities
    const { data: activities } = await supabase
      .from('test_case_activities')
      .select(`
        *,
        created_by_profile:profiles!created_by(full_name, avatar_url)
      `)
      .eq('test_case_id', id)
      .order('created_at', { ascending: false })
      .limit(activityLimit);

    // Helper: get initials
    const getInitials = (name: string) => {
      if (!name) return 'U';
      return name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Build response
    const response = {
      id: testCase.id,
      key: testCase.test_key,
      title: testCase.title,
      description: testCase.description || testCase.objective,
      type: testCase.test_type,
      priority: testCase.priority,
      status: testCase.status,
      preconditions: testCase.preconditions,
      estimatedTime: testCase.estimated_time,
      tags: testCase.tags || [],
      automationStatus: testCase.automation_status,

      assigneeId: testCase.assignee_id,
      assignee: testCase.assignee
        ? {
            id: testCase.assignee.id,
            name: testCase.assignee.full_name,
            initials: getInitials(testCase.assignee.full_name),
            email: testCase.assignee.email,
            avatarUrl: testCase.assignee.avatar_url,
          }
        : null,

      folderId: testCase.folder_id,
      folder: testCase.folder
        ? {
            id: testCase.folder.id,
            name: testCase.folder.name,
            color: testCase.folder.color,
          }
        : null,

      releaseId: testCase.release_id,
      release: testCase.release
        ? {
            id: testCase.release.id,
            name: testCase.release.name,
            status: testCase.release.status,
          }
        : null,

      projectId: testCase.project_id,

      steps: (steps || []).map((step: Record<string, unknown>) => ({
        id: step.id,
        testCaseId: step.test_case_id,
        order: step.step_order,
        action: step.action,
        expectedResult: step.expected_result,
        testData: step.test_data,
        notes: step.notes,
        isShared: step.is_shared,
        evidenceRequired: step.evidence_required,
        attachments: [],
        createdAt: step.created_at,
        updatedAt: step.updated_at,
      })),

      attachments: (caseAttachments || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        name: a.file_name,
        storagePath: a.file_path,
        url: a.file_path,
        type: a.mime_type?.toString().startsWith('image') ? 'image' : 'document',
        mimeType: a.mime_type,
        size: a.file_size,
        uploadedAt: a.created_at,
        uploadedById: a.uploaded_by,
      })),

      linkedRequirements: (linkedReqs || []).map((lr: Record<string, unknown>) => {
        const req = lr.requirement as Record<string, unknown> | null;
        const profile = lr.linked_by_profile as Record<string, unknown> | null;
        return {
          id: lr.id,
          requirementId: req?.id,
          key: req?.key,
          title: req?.title,
          status: req?.status,
          linkedAt: lr.linked_at,
          linkedById: lr.linked_by,
          linkedByName: profile?.full_name,
        };
      }),

      linkedDefects: (linkedDefects || []).map((ld: Record<string, unknown>) => {
        const def = ld.defect as Record<string, unknown> | null;
        const profile = ld.linked_by_profile as Record<string, unknown> | null;
        return {
          id: ld.id,
          defectId: def?.id,
          key: def?.key,
          title: def?.title,
          severity: def?.severity,
          status: def?.status,
          stepId: ld.step_id,
          linkedAt: ld.linked_at,
          linkedById: ld.linked_by,
          linkedByName: profile?.full_name,
        };
      }),

      executionCount: testCase.execution_count || 0,
      passRate: testCase.pass_rate,
      lastExecutedAt: testCase.last_executed_at,

      executionHistory: (executions || []).map((ex: Record<string, unknown>) => {
        const profile = ex.executed_by_profile as Record<string, unknown> | null;
        return {
          id: ex.id,
          testCaseId: ex.test_case_id,
          cycleId: ex.cycle_id,
          status: ex.status,
          environment: ex.environment,
          duration: ex.duration,
          notes: ex.notes,
          stepResults: (stepResults || [])
            .filter((sr: Record<string, unknown>) => sr.execution_result_id === ex.id)
            .map((sr: Record<string, unknown>) => ({
              id: sr.id,
              stepId: sr.step_id,
              status: sr.status,
              actualResult: sr.actual_result,
              defectId: sr.defect_id,
            })),
          executedAt: ex.executed_at,
          executedById: ex.executed_by,
          executedByName: profile?.full_name || 'Unknown',
          executedByInitials: getInitials(profile?.full_name as string || 'Unknown'),
        };
      }),

      activities: (activities || []).map((act: Record<string, unknown>) => {
        const profile = act.created_by_profile as Record<string, unknown> | null;
        return {
          id: act.id,
          testCaseId: act.test_case_id,
          action: act.action,
          description: act.description,
          metadata: act.metadata,
          createdAt: act.created_at,
          createdById: act.created_by,
          createdByName: profile?.full_name || 'System',
          createdByInitials: getInitials(profile?.full_name as string || 'System'),
        };
      }),

      version: testCase.version || 1,

      createdAt: testCase.created_at,
      createdById: testCase.created_by,
      createdByName: testCase.created_by_profile?.full_name || 'Unknown',
      updatedAt: testCase.updated_at,
      updatedById: testCase.updated_by,
      updatedByName: testCase.updated_by_profile?.full_name || 'Unknown',
    };

    return new Response(JSON.stringify({ data: response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: (error as Error).message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
