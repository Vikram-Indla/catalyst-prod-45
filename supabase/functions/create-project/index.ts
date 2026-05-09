// Edge function: create-project
// Atomically creates a project, default statuses, sequence row, and creator membership
// using the service_role key to bypass RLS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PG_UNIQUE_VIOLATION = '23505';
const DEFAULT_PROGRAM_ID = '00000000-0000-0000-0000-000000000001';

const DEFAULT_STATUSES = [
  { name: 'Backlog',     color: '#64748B', text_color: '#475569', is_default: true,  is_terminal: false, sort_order: 1 },
  { name: 'To Do',       color: '#2563EB', text_color: '#1D4ED8', is_default: false, is_terminal: false, sort_order: 2 },
  { name: 'In Progress', color: '#0D9488', text_color: '#0A8277', is_default: false, is_terminal: false, sort_order: 3 },
  { name: 'In Review',   color: '#D97706', text_color: '#AF6003', is_default: false, is_terminal: false, sort_order: 4 },
  { name: 'Done',        color: '#16A34A', text_color: '#11853D', is_default: false, is_terminal: true,  sort_order: 5 },
  { name: 'Blocked',     color: '#DC2626', text_color: '#D92525', is_default: false, is_terminal: false, sort_order: 6 },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller identity via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const callerId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    const { name, key, department, description, user_id } = body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return json({ error: 'name is required' }, 400);
    }
    if (typeof key !== 'string' || !key.trim()) {
      return json({ error: 'key is required' }, 400);
    }
    const effectiveUserId = (typeof user_id === 'string' && user_id) ? user_id : callerId;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const projectKey = (key as string).toUpperCase();

    // 1. Insert project
    const { data: project, error: insertError } = await admin
      .from('projects')
      .insert({
        name: (name as string).trim(),
        project_key: projectKey,
        key: projectKey,
        department: (typeof department === 'string' ? department : null),
        description: (typeof description === 'string' && description.trim()) ? description.trim() : null,
        status: 'active',
        status_category: 'todo',
        health_status: 'on_track',
        project_type: 'kanban',
        program_id: DEFAULT_PROGRAM_ID,
        owner_id: effectiveUserId,
        created_by: effectiveUserId,
        lead_id: effectiveUserId,
        total_epics: 0,
        total_stories: 0,
        total_tasks: 0,
        work_items_todo: 0,
        work_items_in_progress: 0,
        work_items_done: 0,
        completion_percentage: 0,
      })
      .select('id, name, project_key, description, department, created_at')
      .single();

    if (insertError) {
      const code = (insertError as { code?: string }).code;
      const msg = (insertError.message || '').toLowerCase();
      if (code === PG_UNIQUE_VIOLATION || msg.includes('duplicate') || msg.includes('unique')) {
        return json({ error: 'key_not_unique' }, 409);
      }
      console.error('projects insert failed', insertError);
      return json({ error: insertError.message || 'Failed to create project' }, 500);
    }
    if (!project) {
      return json({ error: 'Project insert returned no row' }, 500);
    }

    const projectId = (project as { id: string }).id;

    // 2. Default statuses
    const { error: statusesError } = await admin.from('hi_statuses').insert(
      DEFAULT_STATUSES.map((s) => ({ ...s, project_id: projectId }))
    );
    if (statusesError) {
      console.error('hi_statuses insert failed', statusesError);
      return json({ error: `Failed to seed statuses: ${statusesError.message}` }, 500);
    }

    // 3. Sequence row
    const { error: seqError } = await admin
      .from('hi_project_sequences')
      .upsert({ project_id: projectId, last_number: 0 }, { onConflict: 'project_id', ignoreDuplicates: true });
    if (seqError) {
      console.error('hi_project_sequences upsert failed', seqError);
    }

    // 4. Creator membership
    const { error: memberError } = await admin
      .from('project_members')
      .upsert(
        { project_id: projectId, user_id: effectiveUserId, role: 'admin', added_by: effectiveUserId },
        { onConflict: 'project_id,user_id', ignoreDuplicates: true }
      );
    if (memberError) {
      console.error('project_members upsert failed', memberError);
    }

    return json({
      id: projectId,
      name: (project as { name: string }).name,
      key: (project as { project_key: string }).project_key,
      description: (project as { description: string | null }).description,
      department: (project as { department: string | null }).department,
      created_at: (project as { created_at: string }).created_at,
    }, 200);
  } catch (err) {
    console.error('create-project unexpected error', err);
    return json({ error: (err as Error).message || 'Internal error' }, 500);
  }
});
