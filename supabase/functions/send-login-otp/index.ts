// supabase/functions/send-login-otp/index.ts
//
// Sends a branded 6-digit sign-in code via Resend (same pipeline as user-invite-send).
// Uses admin.generateLink({ type: 'magiclink' }) to get a Supabase-managed OTP token,
// then delivers it through email-send rather than Supabase's default email provider.
// The frontend verifies with supabase.auth.verifyOtp({ email, token, type: 'email' }).

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
    const { email } = await req.json();
    if (!email || typeof email !== 'string') return err('email is required');

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify the email belongs to an APPROVED profile — no OTP for unknown emails
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, approval_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profile || profile.approval_status !== 'APPROVED') {
      // Return ok:true to avoid leaking account existence
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate a Supabase-managed OTP — this is the same token verifyOtp expects
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });

    if (linkError || !linkData?.properties?.email_otp) {
      console.error('[send-login-otp] generateLink error:', linkError);
      return err('Could not generate sign-in code', 500);
    }

    const code = linkData.properties.email_otp;
    const firstName = profile.full_name?.split(' ')[0] || 'there';

    // Send via Resend through the central email-send gateway
    const { error: emailError } = await supabaseAdmin.functions.invoke('email-send', {
      body: {
        to: normalizedEmail,
        subject: `${code} — your Catalyst sign-in code`,
        text: `Hi ${firstName},\n\nYour Catalyst sign-in code is: ${code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.\n\n— Catalyst`,
        html: otpEmailHtml(firstName, code),
        template_name: 'login-otp',
        template_props: { code },
      },
    });

    if (emailError) {
      console.error('[send-login-otp] email error:', emailError);
      return err('Failed to send sign-in code', 500);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[send-login-otp]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function otpEmailHtml(firstName: string, code: string) {
  return `<!DOCTYPE html>
<html>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f4f5f7;margin:0;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;padding:40px 32px;">
      <tr><td>
        <p style="margin:0 0 4px;color:#6B778C;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">Catalyst</p>
        <h1 style="margin:0 0 20px;color:#172B4D;font-size:22px;font-weight:600;">Your sign-in code</h1>
        <p style="margin:0 0 24px;color:#42526E;font-size:14px;line-height:21px;">
          Hi ${firstName}, use this code to sign in to Catalyst:
        </p>
        <div style="background:#F4F5F7;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;color:#172B4D;letter-spacing:0.25em;font-family:monospace;">${code}</span>
        </div>
        <p style="margin:0 0 8px;color:#6B778C;font-size:12px;line-height:18px;">
          This code expires in 10 minutes.
        </p>
        <p style="margin:0;color:#6B778C;font-size:12px;line-height:18px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
