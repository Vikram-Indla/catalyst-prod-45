// supabase/functions/email-send/index.ts
//
// Catalyst's single outbound transactional-email gateway. All other edge functions
// (invite, password-reset, account-deactivated) call THIS function via
// supabase.functions.invoke('email-send', ...).
//
// Inputs:  { to, subject, text, html?, template_name?, template_props?, recipient_user_id? }
// Effects: POST https://api.resend.com/emails  +  INSERT INTO public.email_log
// Returns: { ok: true, message_id, email_log_id } | { ok: false, error, email_log_id? }
//
// Phase 1B Step 1B.4 — smoke version. From-address is hardcoded to onboarding@resend.dev
// (Resend test mode — only delivers to the verified account email). Phase 2 switches to
// a real sending domain once DNS is verified.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const serve = (handler: (req: Request) => Response | Promise<Response>) => Deno.serve(handler);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM_NAME = 'Catalyst';
const FROM_EMAIL = 'onboarding@resend.dev';

interface EmailSendRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
  template_name?: string;
  template_props?: Record<string, unknown>;
  recipient_user_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as EmailSendRequest;
    if (!body?.to || !body?.subject || !body?.text) {
      return new Response(
        JSON.stringify({ ok: false, error: 'missing required fields: to, subject, text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: 'RESEND_API_KEY not configured in edge function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let sent_by_user_id: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
      sent_by_user_id = data.user?.id ?? null;
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [body.to],
        subject: body.subject,
        text: body.text,
        ...(body.html ? { html: body.html } : {}),
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));
    const success = resendResponse.ok && typeof resendData?.id === 'string';

    const { data: logData } = await supabaseAdmin
      .from('email_log')
      .insert({
        to_email: body.to,
        from_email: FROM_EMAIL,
        from_name: FROM_NAME,
        subject: body.subject,
        template_name: body.template_name ?? 'unknown',
        template_props: body.template_props ?? {},
        body_text: body.text,
        body_html: body.html ?? null,
        provider: 'resend',
        provider_message_id: success ? resendData.id : null,
        status: success ? 'sent' : 'failed',
        error_message: success ? null : JSON.stringify(resendData).slice(0, 2000),
        sent_at: success ? new Date().toISOString() : null,
        sent_by_user_id,
        recipient_user_id: body.recipient_user_id ?? null,
      })
      .select('id')
      .single();

    if (!success) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: resendData?.message ?? `Resend API error (${resendResponse.status})`,
          email_log_id: logData?.id ?? null,
        }),
        {
          status: resendResponse.status || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message_id: resendData.id,
        email_log_id: logData?.id ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[email-send] error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
