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

    // Parse request
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    const body = await req.json();

    // Check version (optimistic locking)
    const { data: current, error: fetchError } = await supabase
      .from('test_cases')
      .select('version, updated_at, updated_by, profiles:updated_by(full_name)')
      .eq('id', id)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Test case not found' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Version mismatch = conflict
    if (body.version && current.version !== body.version) {
      const profile = current.profiles as { full_name?: string } | null;
      return new Response(
        JSON.stringify({
          error: {
            code: 'CONFLICT',
            message: 'This record has been modified by another user',
            details: {
              currentVersion: current.version,
              yourVersion: body.version,
              modifiedBy: profile?.full_name || 'Unknown',
              modifiedAt: current.updated_at,
            },
          },
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update - map camelCase to snake_case
    const updateData: Record<string, unknown> = { updated_by: user.id };
    const changes: string[] = [];

    if (body.title !== undefined) {
      updateData.title = body.title;
      changes.push('title');
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
      changes.push('description');
    }
    if (body.objective !== undefined) {
      updateData.objective = body.objective;
      changes.push('objective');
    }
    if (body.type !== undefined) {
      updateData.test_type = body.type;
      changes.push('type');
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
      changes.push('priority');
    }
    if (body.status !== undefined) {
      updateData.status = body.status;
      changes.push('status');
    }
    if (body.preconditions !== undefined) {
      updateData.preconditions = body.preconditions;
      changes.push('preconditions');
    }
    if (body.estimatedTime !== undefined) {
      updateData.estimated_time = body.estimatedTime;
      changes.push('estimatedTime');
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
      changes.push('tags');
    }
    if (body.assigneeId !== undefined) {
      updateData.assignee_id = body.assigneeId;
      changes.push('assignee');
    }
    if (body.folderId !== undefined) {
      updateData.folder_id = body.folderId;
      changes.push('folder');
    }
    if (body.releaseId !== undefined) {
      updateData.release_id = body.releaseId;
      changes.push('release');
    }
    if (body.automationStatus !== undefined) {
      updateData.automation_status = body.automationStatus;
      changes.push('automationStatus');
    }
    if (body.reviewerId !== undefined) {
      updateData.reviewer_id = body.reviewerId;
      changes.push('reviewer');
    }

    // Increment version
    updateData.version = (current.version || 1) + 1;

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('test_cases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log activity
    if (changes.length > 0) {
      await supabase.rpc('log_test_case_activity', {
        p_test_case_id: id,
        p_action: 'updated',
        p_description: `Updated: ${changes.join(', ')}`,
        p_metadata: { changes },
      });
    }

    return new Response(JSON.stringify({ 
      data: {
        ...updated,
        version: updateData.version,
      } 
    }), {
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
