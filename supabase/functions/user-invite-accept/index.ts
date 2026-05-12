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
      .select('id, email, role, status, expires_at, module_access, full_name')
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

    // Allow handle_new_user trigger to seed profiles + user_roles
    await new Promise(resolve => setTimeout(resolve, 600));

    // Apply invited role if not the default 'user'
    if (invitation.role && invitation.role !== 'user') {
      await supabaseAdmin
        .from('user_roles')
        .update({ role: invitation.role })
        .eq('user_id', userId);
    }

    // Update profile: full_name + module_access + mark approved (bypasses pending-approval gate)
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || invitation.full_name || email,
        module_access: invitation.module_access || {},
        approval_status: 'APPROVED'
      })
      .eq('id', userId);

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
