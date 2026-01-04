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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Verify user access
    const authHeader = req.headers.get('Authorization');
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader! } }
    });
    
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // /tm-admin/{resource}/{resourceId?}
    const resource = pathParts[1] || '';
    const resourceId = pathParts[2];

    // ============================================
    // Generic CRUD helper for settings entities
    // ============================================
    async function handleSettingsResource(
      tableName: string,
      displayName: string,
      additionalFields: string[] = []
    ) {
      const projectId = url.searchParams.get('project_id');

      // GET - List items
      if (req.method === 'GET' && !resourceId) {
        if (!projectId) {
          return new Response(
            JSON.stringify({ error: 'project_id query parameter required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST - Create item
      if (req.method === 'POST' && !resourceId) {
        const body = await req.json();

        if (!body.project_id) {
          return new Response(
            JSON.stringify({ error: 'project_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get max sort_order for auto-increment
        const { data: maxOrder } = await supabase
          .from(tableName)
          .select('sort_order')
          .eq('project_id', body.project_id)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const insertData: Record<string, unknown> = {
          project_id: body.project_id,
          name: body.name,
          sort_order: body.sort_order ?? ((maxOrder?.sort_order || 0) + 1)
        };

        // Add additional fields if provided
        for (const field of additionalFields) {
          if (body[field] !== undefined) {
            insertData[field] = body[field];
          }
        }

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (error) throw error;

        // Log audit
        await logAudit(user?.id || 'unknown', 'create', tableName, data.id, null, data, body.project_id);

        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PATCH - Update item
      if (req.method === 'PATCH' && resourceId) {
        const body = await req.json();

        // Get existing for audit
        const { data: existing } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', resourceId)
          .single();

        const allowedFields = ['name', 'sort_order', 'is_active', ...additionalFields];
        const updates: Record<string, unknown> = {};
        
        for (const field of allowedFields) {
          if (body[field] !== undefined) updates[field] = body[field];
        }

        const { data, error } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', resourceId)
          .select()
          .single();

        if (error) throw error;

        // Log audit
        await logAudit(user?.id || 'unknown', 'update', tableName, resourceId, existing, data, existing?.project_id);

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE - Delete item
      if (req.method === 'DELETE' && resourceId) {
        // Get existing for audit
        const { data: existing } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', resourceId)
          .single();

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', resourceId);

        if (error) throw error;

        // Log audit
        await logAudit(user?.id || 'unknown', 'delete', tableName, resourceId, existing, null, existing?.project_id);

        return new Response(null, { status: 204, headers: corsHeaders });
      }

      return new Response(
        JSON.stringify({ error: `${displayName} endpoint not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Audit logging helper
    async function logAudit(
      userId: string,
      action: string,
      entityType: string,
      entityId: string,
      oldData: unknown,
      newData: unknown,
      projectId?: string
    ) {
      try {
        await supabase.from('tm_audit_log').insert({
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_data: oldData ? JSON.stringify(oldData) : null,
          new_data: newData ? JSON.stringify(newData) : null,
          project_id: projectId
        });
      } catch (e) {
        console.error('Audit log error:', e);
      }
    }

    // ============ PRIORITIES ============
    if (resource === 'priorities') {
      return await handleSettingsResource(
        'tm_case_priorities',
        'Priority',
        ['level', 'color', 'description', 'is_default']
      );
    }

    // ============ TYPES (Case Types) ============
    if (resource === 'types') {
      return await handleSettingsResource(
        'tm_case_types',
        'Case Type',
        ['icon', 'description', 'is_default']
      );
    }

    // ============ ENVIRONMENTS ============
    if (resource === 'environments') {
      return await handleSettingsResource(
        'tm_environments',
        'Environment',
        ['description', 'url', 'is_default']
      );
    }

    // ============ LABELS ============
    if (resource === 'labels') {
      return await handleSettingsResource(
        'tm_labels',
        'Label',
        ['color', 'description']
      );
    }

    // ============ AUDIT LOG ============
    if (resource === 'audit-log') {
      const projectId = url.searchParams.get('project_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const entityType = url.searchParams.get('entity_type');
      const action = url.searchParams.get('action');
      const fromDate = url.searchParams.get('from_date');
      const toDate = url.searchParams.get('to_date');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tm_audit_log')
        .select(`
          *,
          tm_users(id, display_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (projectId) query = query.eq('project_id', projectId);
      if (entityType) query = query.eq('entity_type', entityType);
      if (action) query = query.eq('action', action);
      if (fromDate) query = query.gte('created_at', fromDate);
      if (toDate) query = query.lte('created_at', toDate);

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

    // ============ USERS (Admin only) ============
    if (resource === 'users') {
      // Check if user is admin
      const { data: tmUser } = await supabase
        .from('tm_users')
        .select('id, tm_user_roles(role_id, tm_roles(name))')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const isAdmin = tmUser?.tm_user_roles?.some(
        (ur: { tm_roles?: { name: string } | { name: string }[] }) => {
          const roles = ur.tm_roles;
          if (Array.isArray(roles)) {
            return roles.some(r => r.name === 'admin' || r.name === 'project_admin');
          }
          return roles?.name === 'admin' || roles?.name === 'project_admin';
        }
      );

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // GET /tm-admin/users
      if (req.method === 'GET' && !resourceId) {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status');
        const projectId = url.searchParams.get('project_id');
        const offset = (page - 1) * limit;

        let query = supabase
          .from('tm_users')
          .select(`
            *,
            tm_user_roles(
              role_id,
              project_id,
              tm_roles(id, name),
              tm_projects(id, name)
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (search) {
          query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
        }
        if (status) query = query.eq('status', status);

        const { data, error, count } = await query;
        if (error) throw error;

        return new Response(
          JSON.stringify({
            data,
            pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /tm-admin/users
      if (req.method === 'POST' && !resourceId) {
        const { email, display_name, password, role_id, project_id } = await req.json();

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        if (authError) throw authError;

        const { data: newUser, error: userError } = await supabase
          .from('tm_users')
          .insert({
            auth_user_id: authUser.user.id,
            email,
            display_name: display_name || email.split('@')[0],
            status: 'active'
          })
          .select()
          .single();

        if (userError) throw userError;

        if (role_id) {
          await supabase.from('tm_user_roles').insert({
            user_id: newUser.id,
            role_id,
            project_id
          });
        }

        return new Response(
          JSON.stringify(newUser),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PATCH /tm-admin/users/:userId
      if (req.method === 'PATCH' && resourceId) {
        const body = await req.json();
        
        const allowedFields = ['display_name', 'status', 'avatar_url'];
        const updates: Record<string, unknown> = {};
        for (const field of allowedFields) {
          if (body[field] !== undefined) updates[field] = body[field];
        }

        const { data, error } = await supabase
          .from('tm_users')
          .update(updates)
          .eq('id', resourceId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE /tm-admin/users/:userId
      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('tm_users')
          .update({ status: 'inactive' })
          .eq('id', resourceId);

        if (error) throw error;

        return new Response(null, { status: 204, headers: corsHeaders });
      }
    }

    // ============ ROLES (Admin only) ============
    if (resource === 'roles') {
      // GET /tm-admin/roles
      if (req.method === 'GET' && !resourceId) {
        const { data, error } = await supabase
          .from('tm_roles')
          .select('*')
          .order('name');

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /tm-admin/roles
      if (req.method === 'POST' && !resourceId) {
        const { name, permissions } = await req.json();

        const { data, error } = await supabase
          .from('tm_roles')
          .insert({ name, permissions })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PATCH /tm-admin/roles/:roleId
      if (req.method === 'PATCH' && resourceId) {
        const body = await req.json();

        const { data, error } = await supabase
          .from('tm_roles')
          .update(body)
          .eq('id', resourceId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============ PROJECTS ============
    if (resource === 'projects') {
      // GET /tm-admin/projects
      if (req.method === 'GET' && !resourceId) {
        const { data, error } = await supabase
          .from('tm_projects')
          .select(`
            *,
            tm_test_cases(count),
            tm_test_cycles(count)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // POST /tm-admin/projects
      if (req.method === 'POST' && !resourceId) {
        const body = await req.json();

        const { data, error } = await supabase
          .from('tm_projects')
          .insert({
            key: body.key,
            name: body.name,
            description: body.description,
            status: 'active',
            settings: body.settings || {}
          })
          .select()
          .single();

        if (error) throw error;

        // Create default folders
        await supabase.from('tm_folders').insert([
          { project_id: data.id, name: 'Root', path: 'root', parent_id: null }
        ]);

        // Create default priorities
        await supabase.from('tm_case_priorities').insert([
          { project_id: data.id, name: 'Critical', level: 1, color: '#dc2626', sort_order: 1 },
          { project_id: data.id, name: 'High', level: 2, color: '#ea580c', sort_order: 2 },
          { project_id: data.id, name: 'Medium', level: 3, color: '#ca8a04', sort_order: 3 },
          { project_id: data.id, name: 'Low', level: 4, color: '#16a34a', sort_order: 4 }
        ]);

        // Create default case types
        await supabase.from('tm_case_types').insert([
          { project_id: data.id, name: 'Functional', icon: 'function', sort_order: 1 },
          { project_id: data.id, name: 'Regression', icon: 'refresh', sort_order: 2 },
          { project_id: data.id, name: 'Smoke', icon: 'fire', sort_order: 3 },
          { project_id: data.id, name: 'Exploratory', icon: 'search', sort_order: 4 }
        ]);

        // Create default environments
        await supabase.from('tm_environments').insert([
          { project_id: data.id, name: 'Development', sort_order: 1 },
          { project_id: data.id, name: 'Staging', sort_order: 2 },
          { project_id: data.id, name: 'Production', sort_order: 3 }
        ]);

        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PATCH /tm-admin/projects/:projectId
      if (req.method === 'PATCH' && resourceId) {
        const body = await req.json();

        const { data, error } = await supabase
          .from('tm_projects')
          .update(body)
          .eq('id', resourceId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // DELETE /tm-admin/projects/:projectId
      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('tm_projects')
          .update({ status: 'archived' })
          .eq('id', resourceId);

        if (error) throw error;

        return new Response(null, { status: 204, headers: corsHeaders });
      }
    }

    // ============ SYSTEM STATS ============
    if (resource === 'stats') {
      const projectId = url.searchParams.get('project_id');

      let usersQuery = supabase.from('tm_users').select('id', { count: 'exact', head: true }).eq('status', 'active');
      let projectsQuery = supabase.from('tm_projects').select('id', { count: 'exact', head: true }).eq('status', 'active');
      let casesQuery = supabase.from('tm_test_cases').select('id', { count: 'exact', head: true });
      let cyclesQuery = supabase.from('tm_test_cycles').select('id', { count: 'exact', head: true });
      let runsQuery = supabase.from('tm_test_runs').select('id', { count: 'exact', head: true });

      if (projectId) {
        casesQuery = casesQuery.eq('project_id', projectId);
        cyclesQuery = cyclesQuery.eq('project_id', projectId);
        runsQuery = runsQuery.eq('cycle_id', projectId); // runs linked via cycle
      }

      const [
        { count: usersCount },
        { count: projectsCount },
        { count: casesCount },
        { count: cyclesCount },
        { count: runsCount }
      ] = await Promise.all([
        usersQuery,
        projectsQuery,
        casesQuery,
        cyclesQuery,
        runsQuery
      ]);

      return new Response(
        JSON.stringify({
          users: usersCount,
          projects: projectsCount,
          testCases: casesCount,
          testCycles: cyclesCount,
          testRuns: runsCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
