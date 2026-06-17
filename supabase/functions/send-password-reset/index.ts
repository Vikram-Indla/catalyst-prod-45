// supabase/functions/send-password-reset/index.ts
//
// Sends a BRANDED password-reset email via Resend (same pipeline as send-login-otp
// and user-invite-send). Uses admin.generateLink({ type: 'recovery' }) to mint a
// Supabase-managed recovery link, then delivers it through email-send instead of
// Supabase's default (unbranded) email provider.
//
// Replaces the prior client-side supabase.auth.resetPasswordForEmail() call, which
// hit Supabase's native template and shipped default Supabase branding (CAT-DEF-005).
//
// The recovery link lands the user on `${redirectTo}` (default /auth/reset-password),
// where the existing recovery-session handler lets them set a new password.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== 'string') return err('email is required');

    const normalizedEmail = email.toLowerCase().trim();
    const appUrl = Deno.env.get('APP_URL') || 'https://catalyst.lovable.app';
    const resolvedRedirect =
      typeof redirectTo === 'string' && redirectTo.startsWith('http')
        ? redirectTo
        : `${appUrl}/auth/reset-password`;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Only send for an APPROVED profile that actually has an auth account.
    // (Anti-enumeration: always return ok:true so callers can't probe account existence.)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, approval_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profile || profile.approval_status !== 'APPROVED') {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Self-heal: legacy seeded profiles can be APPROVED with no auth.users row, so
    // generateLink('recovery') would fail. Provision on demand. Idempotent (CAT-DEF-005).
    const { data: provStatus, error: provErr } = await supabaseAdmin.rpc(
      'provision_auth_for_profile', { p_profile_id: profile.id },
    );
    if (provErr) console.error('[send-password-reset] provision error:', provErr);
    else if (provStatus && provStatus !== 'already_has_auth') {
      console.log('[send-password-reset] provision:', normalizedEmail, provStatus);
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo: resolvedRedirect },
    });

    // No auth.users row → generateLink fails. Stay silent (anti-enumeration) but log server-side.
    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-password-reset] generateLink error:', linkError);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const actionLink = linkData.properties.action_link;
    const firstName = profile.full_name?.split(' ')[0] || 'there';

    const { error: emailError } = await supabaseAdmin.functions.invoke('email-send', {
      body: {
        to: normalizedEmail,
        subject: 'Reset your Catalyst password',
        text: `Hi ${firstName},\n\nWe received a request to reset your Catalyst password.\n\nReset it here:\n${actionLink}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— Catalyst`,
        html: resetEmailHtml(firstName, actionLink),
        template_name: 'password-reset',
        template_props: { firstName },
      },
    });

    if (emailError) {
      console.error('[send-password-reset] email error:', emailError);
      return err('Failed to send reset email', 500);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[send-password-reset]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function resetEmailHtml(firstName: string, actionLink: string) {
  return `<!DOCTYPE html>
<html>
  <body style="font-family:'Atlassian Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f5f7;margin:0;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:40px 32px;">
      <tr><td>
        <p style="margin:0 0 4px;color:#6B778C;font-size:11px;font-weight:600;letter-spacing:0.5px;">Catalyst</p>
        <h1 style="margin:0 0 16px;color:#172B4D;font-size:22px;font-weight:600;">Reset your password</h1>
        <p style="margin:0 0 24px;color:#42526E;font-size:14px;line-height:21px;">
          Hi ${firstName}, we received a request to reset your Catalyst password. Click below to choose a new one.
        </p>
        <a href="${actionLink}" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:500;">Reset password</a>
        <p style="margin:24px 0 0;color:#6B778C;font-size:12px;line-height:18px;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="margin:8px 0 0;color:#6B778C;font-size:12px;line-height:18px;word-break:break-all;">
          Link: <a href="${actionLink}" style="color:#2563EB;">${actionLink}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
