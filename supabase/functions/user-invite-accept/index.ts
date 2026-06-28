// supabase/functions/user-invite-accept/index.ts
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

    const { token, email, password, full_name } = await req.json();
    if (!token || !email || !password) return err('token, email and password are required', 400);

    const normalizedEmail = email.toLowerCase().trim();

    // Hash the raw token
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Look up the invitation
    const { data: invitation } = await supabaseAdmin
      .from('user_invitations')
      .select('id, email, role, status, expires_at, module_access, full_name, department_id')
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .maybeSingle();

    if (!invitation) return err('Invalid or expired invitation', 400);

    if (new Date(invitation.expires_at) <= new Date()) {
      await supabaseAdmin.from('user_invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return err('Invalid or expired invitation', 400);
    }

    if (invitation.email !== normalizedEmail) return err('Email does not match invitation', 400);

    // Create the auth user
    const { data: newUserData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createErr || !newUserData?.user) {
      console.error('[invite-accept] createUser:', createErr);
      return err(createErr?.message || 'Failed to create user account', 500);
    }

    const userId = newUserData.user.id;

    // Allow handle_new_user trigger to seed the profiles row (it does NOT touch user_roles).
    await new Promise(resolve => setTimeout(resolve, 600));

    // CAT-RBAC-RESOLVE-20260627-001 Phase 1 — resolve the invited role across ALL THREE models so
    // the new user is consistent everywhere and visible to /admin/roles:
    //   - user_roles          (legacy app_role; read by check_permission until the Phase 2 cutover)
    //   - user_product_roles  (product-role model; the post-cutover source of truth)
    //   - profiles.role        (legacy text shown on /admin/access — set in the upsert below)
    // invitation.role and user_roles.role share the app_role enum, so it inserts directly.
    const invitedRole = invitation.role || 'user';

    // Legacy app_role row — unique is (user_id, role); reset to exactly the invited role.
    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
    await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: invitedRole });

    // Product-role row. Prefer an exact code match (app_role labels mostly mirror product_roles.code);
    // admin -> super_admin; otherwise fall back to the 'developer' baseline. Parity-safe: only
    // super_admin is all-Allow, every other target is all-Deny.
    let productCode = invitedRole === 'admin' ? 'super_admin' : invitedRole;
    let { data: pr } = await supabaseAdmin
      .from('product_roles').select('id').eq('code', productCode).maybeSingle();
    if (!pr?.id && productCode !== 'developer') {
      ({ data: pr } = await supabaseAdmin
        .from('product_roles').select('id').eq('code', 'developer').maybeSingle());
    }
    if (pr?.id) {
      await supabaseAdmin.from('user_product_roles')
        .upsert({ user_id: userId, role_id: pr.id, business_lines: [] }, { onConflict: 'user_id,role_id' });
    }

    // Upsert profile: full_name + module_access + mark approved (bypasses pending-approval gate).
    // Uses upsert instead of update so the profile is created even if handle_new_user trigger
    // didn't fire (e.g. edge function admin API path in some Supabase environments).
    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: normalizedEmail,
        full_name: full_name || invitation.full_name || normalizedEmail,
        role: invitedRole,
        department_id: invitation.department_id ?? null,
        module_access: invitation.module_access || {},
        approval_status: 'APPROVED',
      }, { onConflict: 'id' });

    // Mark invitation accepted
    await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Sign in via REST to get session tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });

    const sessionData = await signInRes.json();
    if (!signInRes.ok || !sessionData.access_token) {
      console.error('[invite-accept] signIn:', sessionData);
      return err('Account created but sign-in failed — please sign in manually.', 500);
    }

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id: userId,
      user_email: normalizedEmail,
      event_type: 'invite_accepted',
      event_details: { invitation_id: invitation.id, invited_role: invitation.role },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        session: { access_token: sessionData.access_token, refresh_token: sessionData.refresh_token },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[invite-accept]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
