// supabase/functions/admin-set-password/index.ts
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
    const { userId, newPassword } = body;
    if (!userId || typeof userId !== 'string') return err('userId is required', 400);
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return err('newPassword must be at least 8 characters', 400);
    }

    // Safety: cannot modify a super_admin unless caller is also super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (targetRole?.role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: cannot modify a super_admin account', 403);
    }

    // Cannot change your own password via admin route (use profile settings)
    if (caller.id === userId) {
      return err('Forbidden: use profile settings to change your own password', 403);
    }

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateErr) {
      console.error('[admin-set-password] updateUserById:', updateErr);
      return err('Failed to update password', 500);
    }

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id: userId,
      actor_id: caller.id,
      event_type: 'password_changed_by_admin',
      event_details: { changed_by: caller.id, changed_by_role: callerRole.role },
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[admin-set-password]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
