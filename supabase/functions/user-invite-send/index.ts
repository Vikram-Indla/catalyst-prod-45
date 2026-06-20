// supabase/functions/user-invite-send/index.ts
// Access Management rewrite — single onboarding-artifact dispatcher.
// Creates a one-time, hashed, TTL-bound setup link and either returns it for
// MANUAL copy or dispatches it over the chosen channel (email now; whatsapp/sms
// stubbed until provider verification). Backward compatible with the old call
// shape (no channel/ttl => email, 24h).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHANNELS = ['manual', 'email', 'whatsapp', 'sms'];
const PURPOSES = ['invite', 'reset', 'unlock'];
const MAX_TTL = 24 * 60 * 60;        // 1 day (non-guest)
const GUEST_MAX_TTL = 48 * 60 * 60; // 48 hours (guest hard cap)
const MIN_TTL = 60;                  // 1 min floor

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

    const body = await req.json();
    const email: string = (body.email || '').toLowerCase().trim();
    if (!email) return err('email is required', 400);

    const role = body.role || 'developer';
    const module_access = body.module_access || {};
    const full_name = body.full_name ?? null;
    const phone = body.phone ?? null;
    const purpose = PURPOSES.includes(body.purpose) ? body.purpose : 'invite';
    const delivery_channel = CHANNELS.includes(body.delivery_channel) ? body.delivery_channel : 'email';
    const regenerate = body.regenerate === true;
    const department_id = body.department_id ?? null;

    // Safe-landing guard (server-side): invites must grant at least 1 safe module.
    if (purpose === 'invite') {
      const safe = ['home', 'project_hub', 'product_hub'];
      const hasSafe = safe.some((k) => module_access?.[k] === true);
      if (!hasSafe) return err('At least one safe landing module (Home, Project, or Product) is required', 422);
    }

    // TTL: default 5 minutes, admin-selectable. Guest hard cap: 48h. Others: 24h.
    let ttl = Number.isFinite(body.ttl_seconds) ? Math.floor(body.ttl_seconds) : 300;
    const effectiveMax = role === 'guest' ? GUEST_MAX_TTL : MAX_TTL;
    ttl = Math.min(effectiveMax, Math.max(MIN_TTL, ttl));

    // Existing pending artifact for this email+purpose.
    const { data: existing } = await supabaseAdmin
      .from('user_invitations')
      .select('id, expires_at, status')
      .eq('email', email).eq('purpose', purpose).eq('status', 'pending')
      .maybeSingle();
    if (existing && new Date(existing.expires_at) > new Date()) {
      if (!regenerate) return err('A pending link already exists for this email. Regenerate to replace it.', 409);
      await supabaseAdmin.from('user_invitations')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', existing.id);
    }

    // For invites only, block already-registered users.
    if (purpose === 'invite') {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      // Return HTTP 200 so the client always reads the actionable error body
      // (non-2xx responses sometimes get the body swallowed by the SDK).
      if (users?.some((u) => u.email === email)) return ok(false, 'This user already has an account. Use "Send reset" to send them a password reset link instead.');
    }

    // Cryptographically-random single-use token; only the SHA-256 hash is stored.
    const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const { data: invitation, error: insertErr } = await supabaseAdmin
      .from('user_invitations')
      .insert({
        email, invited_by: user.id, token_hash: tokenHash, role, module_access,
        full_name, phone, purpose, delivery_channel, ttl_seconds: ttl, expires_at: expiresAt,
        department_id,
      })
      .select('id').single();
    if (insertErr || !invitation) {
      console.error('[invite-send] insert:', insertErr);
      return err('Failed to create link', 500);
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://ksa-catalyst.com';

    // Mint an opaque short code. The raw token + email are stored server-side in
    // short_links (RLS-locked, service-role only) and handed to the invitee's
    // browser transiently via invite-resolve — they NEVER appear in the URL.
    const genCode = () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = crypto.getRandomValues(new Uint8Array(10));
      return Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join('');
    };
    let code = genCode();
    let linkErr: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await supabaseAdmin.from('short_links').insert({
        code, invitation_id: invitation.id, raw_token: rawToken, email,
        purpose, expires_at: expiresAt,
      });
      if (!error) { linkErr = null; break; }
      linkErr = error;
      if (error.code === '23505') { code = genCode(); continue; } // code collision — retry
      break;
    }
    if (linkErr) {
      console.error('[invite-send] short_link:', linkErr);
      await supabaseAdmin.from('user_invitations').delete().eq('id', invitation.id);
      return err('Failed to create link', 500);
    }
    const setupLink = `${appUrl}/s/${code}`;

    const { data: inviter } = await supabaseAdmin
      .from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
    const inviterName = inviter?.full_name || inviter?.email || 'Your administrator';

    let dispatched = false;
    let channelPending = false;

    if (delivery_channel === 'email') {
      const subj = purpose === 'invite'
        ? `${inviterName} invited you to Catalyst`
        : purpose === 'reset' ? 'Reset your Catalyst password' : 'Unlock your Catalyst account';
      const { error: emailErr } = await supabaseAdmin.functions.invoke('email-send', {
        body: {
          to: email, recipient: email, channel: 'email', subject: subj,
          text: `${subj} — open this single-use link (expires soon): ${setupLink}`,
          html: linkHtml(subj, inviterName, setupLink, expiresAt, purpose),
          template_name: purpose,
          template_props: { inviterName, acceptUrl: setupLink },
        },
      });
      if (emailErr) {
        console.error('[invite-send] email:', emailErr);
        await supabaseAdmin.from('user_invitations').delete().eq('id', invitation.id);
        return err('Failed to send via email', 500);
      }
      dispatched = true;
    } else if (delivery_channel === 'whatsapp' || delivery_channel === 'sms') {
      // Provider not yet verified — record intent, let admin share the link manually.
      channelPending = true;
      await supabaseAdmin.from('email_log').insert({
        to_email: email, recipient: phone || email, channel: delivery_channel,
        subject: `${purpose} link`, status: 'pending_provider', template_name: purpose,
      });
    }
    // 'manual' => nothing to send; admin copies the link below.

    return new Response(
      JSON.stringify({
        ok: true, invitation_id: invitation.id, setup_link: setupLink,
        expires_at: expiresAt, ttl_seconds: ttl, delivery_channel, purpose,
        dispatched, channel_pending: channelPending,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[invite-send]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

// Business logic errors (HTTP 200) so the client reads { ok, error } from res.data
function ok(success: boolean, error?: string) {
  return new Response(JSON.stringify({ ok: success, error }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// Auth/permission errors stay non-2xx
function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function linkHtml(title: string, inviterName: string, url: string, expiresAt: string, purpose: string) {
  const expiry = new Date(expiresAt).toUTCString();
  const cta = purpose === 'invite' ? 'Set your password' : purpose === 'reset' ? 'Choose a new password' : 'Unlock account';
  const lede = purpose === 'invite'
    ? `${inviterName} has invited you to join Catalyst. Set your password to activate your account.`
    : purpose === 'reset' ? 'We received a request to reset your Catalyst password.'
    : 'A request was made to unlock your Catalyst account.';
  return `<!DOCTYPE html>
<html>
  <body style='font-family: Atlassian Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background:#f4f5f7; margin:0; padding:24px;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='max-width:560px; margin:0 auto; background:#ffffff; border-radius:8px; padding:32px;'>
      <tr><td>
        <div style='height:3px; background:#2563EB; border-radius:2px; margin-bottom:22px;'></div>
        <h2 style='margin:0 0 6px; color:#172B4D; font-size:16px; font-weight:600;'>Catalyst</h2>
        <h1 style='margin:0 0 14px; color:#172B4D; font-size:22px; font-weight:600;'>${title}</h1>
        <p style='color:#42526E; font-size:14px; line-height:22px; margin:0 0 22px;'>${lede} For your security this link is single-use and expires soon.</p>
        <a href='${url}' style='display:inline-block; background:#2563EB; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:14px; font-weight:500;'>${cta}</a>
        <p style='color:#6B778C; font-size:12px; line-height:18px; margin:22px 0 0;'>Expires: ${expiry}. If you didn't expect this, ignore this message and never share the link.</p>
        <p style='color:#6B778C; font-size:12px; line-height:18px; margin:8px 0 0; word-break:break-all;'>Link: <a href='${url}' style='color:#2563EB;'>${url}</a></p>
      </td></tr>
    </table>
  </body>
</html>`;
}
