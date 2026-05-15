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

    // Auth guard: caller must be admin or super_admin
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

    // Safety check: cannot delete a super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle();
    if (targetRole?.role === 'super_admin') {
      return err('Forbidden: cannot delete a super_admin account', 403);
    }

    // Fetch target user email from profiles before deletion (for audit log)
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .maybeSingle();
    const targetEmail = targetProfile?.email ?? null;

    // Delete sequence
    // 1. Delete from user_roles
    const { error: rolesErr } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id);
    if (rolesErr) {
      console.error('[user-delete] user_roles delete:', rolesErr);
      return err('Failed to remove user roles', 500);
    }

    // 2. Delete from profiles
    const { error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user_id);
    if (profilesErr) {
      console.error('[user-delete] profiles delete:', profilesErr);
      return err('Failed to remove user profile', 500);
    }

    // 3. Delete from auth.users
    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (authDeleteErr) {
      console.error('[user-delete] auth.admin.deleteUser:', authDeleteErr);
      return err('Failed to delete auth user', 500);
    }

    // Audit log
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
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
