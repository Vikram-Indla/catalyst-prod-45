// supabase/functions/user-invite-send/index.ts
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
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      return err('Forbidden: admin role required', 403);
    }

    const body = await req.json();
    const { role = 'user', module_access = {} } = body;
    const email: string = body.email;
    if (!email || typeof email !== 'string') return err('email is required', 400);
    const normalizedEmail = email.toLowerCase().trim();

    // Block duplicate active invitations
    const { data: existing } = await supabaseAdmin
      .from('user_invitations')
      .select('id, expires_at')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing && new Date(existing.expires_at) > new Date()) {
      return err('A pending invitation already exists for this email', 409);
    }

    // Block already-registered users
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (users?.some(u => u.email === normalizedEmail)) {
      return err('User already exists', 409);
    }

    // Generate token and SHA-256 hash
    const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertErr } = await supabaseAdmin
      .from('user_invitations')
      .insert({ email: normalizedEmail, invited_by: user.id, token_hash: tokenHash, role, module_access, expires_at: expiresAt })
      .select('id')
      .single();
    if (insertErr || !invitation) {
      console.error('[invite-send] insert:', insertErr);
      return err('Failed to create invitation', 500);
    }

    const { data: inviter } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    const inviterName = inviter?.full_name || inviter?.email || 'Your administrator';

    const appUrl = Deno.env.get('APP_URL') || 'https://catalyst.lovable.app';
    const acceptUrl = `${appUrl}/invite/accept?token=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

    const { error: emailErr } = await supabaseAdmin.functions.invoke('email-send', {
      body: {
        to: normalizedEmail,
        subject: `${inviterName} invited you to Catalyst`,
        text: `You've been invited to join Catalyst by ${inviterName}.\n\nAccept your invitation:\n${acceptUrl}\n\nThis link expires in 24 hours.`,
        html: inviteHtml(inviterName, acceptUrl, expiresAt),
        template_name: 'invite',
        template_props: { inviterName, acceptUrl },
      },
    });

    if (emailErr) {
      console.error('[invite-send] email:', emailErr);
      await supabaseAdmin.from('user_invitations').delete().eq('id', invitation.id);
      return err('Failed to send invitation email', 500);
    }

    return new Response(
      JSON.stringify({ ok: true, invitation_id: invitation.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[invite-send]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function inviteHtml(inviterName: string, acceptUrl: string, expiresAt: string) {
  const expiry = new Date(expiresAt).toUTCString();
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f5f7; margin:0; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:8px; padding:32px;">
      <tr><td>
        <h2 style="margin:0 0 8px; color:#172B4D; font-size:14px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Catalyst</h2>
        <h1 style="margin:0 0 16px; color:#172B4D; font-size:24px; font-weight:600;">You've been invited</h1>
        <p style="color:#42526E; font-size:14px; line-height:20px; margin:0 0 24px;">
          ${inviterName} has invited you to join Catalyst.
        </p>
        <a href="${acceptUrl}" style="display:inline-block; background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:14px; font-weight:500;">Accept invitation</a>
        <p style="color:#6B778C; font-size:12px; line-height:18px; margin:24px 0 0;">
          Expires: ${expiry}. If you didn't expect this email, ignore it.
        </p>
        <p style="color:#6B778C; font-size:12px; line-height:18px; margin:8px 0 0; word-break:break-all;">
          Link: <a href="${acceptUrl}" style="color:#2563EB;">${acceptUrl}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
