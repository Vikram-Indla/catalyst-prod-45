// supabase/functions/user-delete/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Auth guard: verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authErr || !caller) return err('Unauthorized', 401);

    // Auth guard: caller must be admin
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (!callerRole || !['admin', 'super_admin'].includes(callerRole.role)) {
      return err('Forbidden: admin role required', 403);
    }

    // Parse and validate body
    const body = await req.json();
    const { user_id } = body;
    if (!user_id || typeof user_id !== 'string') return err('user_id is required', 400);

    // Safety check: cannot delete yourself
    if (caller.id === user_id) {
      return err('Forbidden: cannot delete your own account', 403);
    }

    // Fetch target role
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle();

    // Last-admin guard: cannot delete the last admin
    if (targetRole?.role === 'admin') {
      const { count } = await supabaseAdmin
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        // Return HTTP 200 so client can read the error body
        return ok(false, 'Cannot delete the only admin. Promote another user to admin first.');
      }
    }

    // Fetch target user email from profiles before deletion (for audit log)
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .maybeSingle();
    const targetEmail = targetProfile?.email ?? null;

    // Pre-flight: null out ph_projects.created_by to avoid FK constraint blocking auth.admin.deleteUser
    const { error: projectsErr } = await supabaseAdmin
      .from('ph_projects')
      .update({ created_by: null })
      .eq('created_by', user_id);
    if (projectsErr) {
      console.error('[user-delete] ph_projects null-out:', projectsErr);
      return ok(false, 'Failed to reassign project ownership before deletion');
    }

    // Delete sequence
    // 1. Delete from user_roles
    const { error: rolesErr } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);
    if (rolesErr) {
      console.error('[user-delete] user_roles delete:', rolesErr);
      return ok(false, 'Failed to remove user roles');
    }

    // 2. Delete from profiles
    const { error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);
    if (profilesErr) {
      console.error('[user-delete] profiles delete:', profilesErr);
      return ok(false, 'Failed to remove user profile');
    }

    // 3. Delete from auth.users
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authDeleteErr) {
      console.error('[user-delete] auth.admin.deleteUser:', authDeleteErr);
      return ok(false, authDeleteErr.message || 'Failed to delete user account');
    }

    // Audit log (best-effort)
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id,
      actor_id: caller.id,
      user_email: targetEmail,
      event_type: 'user_deleted',
      event_details: { deleted_by: caller.id, deleted_by_role: callerRole.role },
    });

    return new Response(
      JSON.stringify({ ok: true, deleted_user_id: user_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[user-delete]', e);
    return ok(false, e instanceof Error ? e.message : 'Unknown error');
  }
});

// Business logic errors return HTTP 200 so the client can read { ok, error }
function ok(success: boolean, error?: string) {
  return new Response(JSON.stringify({ ok: success, error }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// Auth/permission errors stay non-2xx
function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
