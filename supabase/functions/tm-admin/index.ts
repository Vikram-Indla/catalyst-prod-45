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

    // Verify admin access
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

    // Check if user is admin
    const { data: tmUser } = await supabase
      .from('tm_users')
      .select('id, tm_user_roles(role_id, tm_roles(name, permissions))')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const isAdmin = tmUser?.tm_user_roles?.some(
      (ur: { tm_roles: { name: string; permissions: unknown }[] }) => 
        ur.tm_roles?.some(r => r.name === 'admin' || r.name === 'project_admin')
    );

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resource = pathParts[1] || '';
    const resourceId = pathParts[2];
    const action = pathParts[3];

    // ============ USERS ============
    if (resource === 'users') {
      // GET /admin/users - List users
      if (req.method === 'GET' && !resourceId) {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status');
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

      // POST /admin/users - Create user
      if (req.method === 'POST' && !resourceId) {
        const { email, display_name, password, role_id, project_id } = await req.json();

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        if (authError) throw authError;

        // Create tm_users record
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

        // Assign role if provided
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

      // PATCH /admin/users/:userId - Update user
      if (req.method === 'PATCH' && resourceId && !action) {
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

      // DELETE /admin/users/:userId - Deactivate user
      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('tm_users')
          .update({ status: 'inactive' })
          .eq('id', resourceId);

        if (error) throw error;

        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // PUT /admin/users/:userId/roles - Update user roles
      if (req.method === 'PUT' && action === 'roles') {
        const { roles } = await req.json(); // Array of { role_id, project_id }

        // Remove existing roles
        await supabase
          .from('tm_user_roles')
          .delete()
          .eq('user_id', resourceId);

        // Add new roles
        if (roles?.length) {
          const roleRecords = roles.map((r: { role_id: string; project_id?: string }) => ({
            user_id: resourceId,
            role_id: r.role_id,
            project_id: r.project_id
          }));

          await supabase.from('tm_user_roles').insert(roleRecords);
        }

        const { data } = await supabase
          .from('tm_user_roles')
          .select('*, tm_roles(*), tm_projects(*)')
          .eq('user_id', resourceId);

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============ ROLES ============
    if (resource === 'roles') {
      // GET /admin/roles
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

      // POST /admin/roles
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

      // PATCH /admin/roles/:roleId
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
      // GET /admin/projects
      if (req.method === 'GET' && !resourceId) {
        const { data, error } = await supabase
          .from('tm_projects')
          .select(`
            *,
            tm_user_roles(count),
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

      // POST /admin/projects
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
          { project_id: data.id, name: 'Critical', level: 1, color: '#dc2626' },
          { project_id: data.id, name: 'High', level: 2, color: '#ea580c' },
          { project_id: data.id, name: 'Medium', level: 3, color: '#ca8a04' },
          { project_id: data.id, name: 'Low', level: 4, color: '#16a34a' }
        ]);

        // Create default case types
        await supabase.from('tm_case_types').insert([
          { project_id: data.id, name: 'Functional', icon: 'function' },
          { project_id: data.id, name: 'Regression', icon: 'refresh' },
          { project_id: data.id, name: 'Smoke', icon: 'fire' },
          { project_id: data.id, name: 'Exploratory', icon: 'search' }
        ]);

        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PATCH /admin/projects/:projectId
      if (req.method === 'PATCH' && resourceId && !action) {
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

      // DELETE /admin/projects/:projectId - Archive project
      if (req.method === 'DELETE' && resourceId) {
        const { error } = await supabase
          .from('tm_projects')
          .update({ status: 'archived' })
          .eq('id', resourceId);

        if (error) throw error;

        return new Response(null, { status: 204, headers: corsHeaders });
      }
    }

    // ============ AUDIT LOGS ============
    if (resource === 'audit-logs') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const entity_type = url.searchParams.get('entity_type');
      const user_id = url.searchParams.get('user_id');
      const from_date = url.searchParams.get('from_date');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tm_audit_log')
        .select(`
          *,
          tm_users(id, display_name, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (entity_type) query = query.eq('entity_type', entity_type);
      if (user_id) query = query.eq('user_id', user_id);
      if (from_date) query = query.gte('created_at', from_date);

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

    // ============ SYSTEM STATS ============
    if (resource === 'stats') {
      const [
        { count: usersCount },
        { count: projectsCount },
        { count: casesCount },
        { count: cyclesCount },
        { count: runsCount }
      ] = await Promise.all([
        supabase.from('tm_users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tm_projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tm_test_cases').select('id', { count: 'exact', head: true }),
        supabase.from('tm_test_cycles').select('id', { count: 'exact', head: true }),
        supabase.from('tm_test_runs').select('id', { count: 'exact', head: true })
      ]);

      // Recent activity
      const { data: recentRuns } = await supabase
        .from('tm_test_runs')
        .select('status, started_at')
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false })
        .limit(100);

      const passRate = recentRuns?.length 
        ? Math.round((recentRuns.filter(r => r.status === 'passed').length / recentRuns.length) * 100)
        : 0;

      return new Response(
        JSON.stringify({
          users: usersCount,
          projects: projectsCount,
          testCases: casesCount,
          testCycles: cyclesCount,
          testRuns: runsCount,
          weeklyPassRate: passRate,
          weeklyRuns: recentRuns?.length || 0
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
