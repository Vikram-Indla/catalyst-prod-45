// supabase/functions/invitation-expire/index.ts
// Admin kill-switch for a pending onboarding artifact (wrong-number safety).
// Revokes a single pending invitation by id, or all pending for an email+purpose.
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authErr || !user) return err('Unauthorized', 401);

    const { data: roleRow } = await supabaseAdmin
      .from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      return err('Forbidden: admin role required', 403);
    }

    const { invitation_id, email, purpose } = await req.json();
    const patch = { status: 'revoked', revoked_at: new Date().toISOString() };

    let q = supabaseAdmin.from('user_invitations').update(patch).eq('status', 'pending');
    if (invitation_id) q = q.eq('id', invitation_id);
    else if (email) { q = q.eq('email', String(email).toLowerCase().trim()); if (purpose) q = q.eq('purpose', purpose); }
    else return err('invitation_id or email is required', 400);

    const { data, error } = await q.select('id');
    if (error) { console.error('[invitation-expire]', error); return err('Failed to expire link', 500); }

    return new Response(
      JSON.stringify({ ok: true, revoked: data?.length ?? 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[invitation-expire]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
