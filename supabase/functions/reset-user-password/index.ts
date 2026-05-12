// supabase/functions/reset-user-password/index.ts
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
    const { userId } = body;
    if (!userId || typeof userId !== 'string') return err('userId is required', 400);

    // Safety: cannot modify a super_admin unless caller is also super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (targetRole?.role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: cannot modify a super_admin account', 403);
    }

    // Fetch target user email from auth.users
    const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserErr || !targetUser) return err('User not found', 404);

    const email = targetUser.email;
    if (!email) return err('User has no email address', 400);

    // Generate a password reset link
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (linkErr) {
      console.error('[reset-user-password] generateLink:', linkErr);
      return err('Failed to generate reset link', 500);
    }

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id: userId,
      actor_id: caller.id,
      user_email: email,
      event_type: 'password_reset_sent',
      event_details: { triggered_by: caller.id, triggered_by_role: callerRole.role },
    });

    return new Response(
      JSON.stringify({ ok: true, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[reset-user-password]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
