// supabase/functions/user-update/index.ts
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

    const body = await req.json();
    const { user_id, role, module_access, approval_status } = body;
    if (!user_id || typeof user_id !== 'string') return err('user_id is required', 400);

    // Safety: cannot modify a super_admin unless caller is also super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle();

    if (targetRole?.role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: cannot modify a super_admin account', 403);
    }

    // Safety: cannot promote to super_admin unless caller is super_admin
    if (role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: only super_admin can assign super_admin role', 403);
    }

    const changes: Record<string, unknown> = {};

    // Update role if provided
    if (role !== undefined) {
      const { error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id);
      if (roleErr) {
        console.error('[user-update] user_roles update:', roleErr);
        return err('Failed to update user role', 500);
      }
      changes.role = role;
    }

    // Update profile fields if provided
    const profileUpdates: Record<string, unknown> = {};
    if (module_access !== undefined) profileUpdates.module_access = module_access;
    if (approval_status !== undefined) profileUpdates.approval_status = approval_status;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user_id);
      if (profileErr) {
        console.error('[user-update] profiles update:', profileErr);
        return err('Failed to update user profile', 500);
      }
      Object.assign(changes, profileUpdates);
    }

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id,
      actor_id: caller.id,
      event_type: 'user_updated',
      event_details: { updated_by: caller.id, updated_by_role: callerRole.role, changes },
    });

    return new Response(
      JSON.stringify({ ok: true, updated_user_id: user_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[user-update]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
