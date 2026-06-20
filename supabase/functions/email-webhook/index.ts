// supabase/functions/email-webhook/index.ts
// PUBLIC endpoint (no JWT) that ingests Resend webhook events and stamps the
// engagement lifecycle on email_log. Authenticity is enforced via the Svix
// signature (Resend signs with RESEND_WEBHOOK_SECRET = whsec_…). If that secret
// is not set yet, events are accepted with a warning so the pipe works before
// the dashboard is configured — set the secret to lock it down.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, svix-id, svix-timestamp, svix-signature',
};

// Resend event type → (email_log column, optional status).
// status is only set for values allowed by email_log_status_check
// (queued/sent/delivered/bounced/complained/failed). opens/clicks are engagement
// signals tracked via their timestamp column only — they do NOT change status.
const EVENT_MAP: Record<string, { col: string; status?: string }> = {
  'email.sent':       { col: 'sent_at',       status: 'sent' },
  'email.delivered':  { col: 'delivered_at',  status: 'delivered' },
  'email.opened':     { col: 'opened_at' },
  'email.clicked':    { col: 'clicked_at' },
  'email.bounced':    { col: 'bounced_at',    status: 'bounced' },
  'email.complained': { col: 'complained_at', status: 'complained' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const raw = await req.text();

  // Verify Svix signature when the secret is configured.
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (secret) {
    const ok = await verifySvix(req.headers, raw, secret);
    if (!ok) return new Response(JSON.stringify({ ok: false, error: 'invalid signature' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } else {
    console.warn('[email-webhook] RESEND_WEBHOOK_SECRET not set — accepting unverified events');
  }

  let evt: { type?: string; created_at?: string; data?: { email_id?: string } };
  try { evt = JSON.parse(raw); } catch { return new Response(JSON.stringify({ ok: false, error: 'bad json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  const mapping = evt.type ? EVENT_MAP[evt.type] : undefined;
  const emailId = evt.data?.email_id;
  if (!mapping || !emailId) {
    // Unrecognised event — acknowledge so Resend doesn't retry.
    return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const ts = evt.created_at ? new Date(evt.created_at).toISOString() : new Date().toISOString();
  const patch: Record<string, string> = { [mapping.col]: ts };
  if (mapping.status) patch.status = mapping.status;
  const { error } = await supabaseAdmin
    .from('email_log')
    .update(patch)
    .eq('provider_message_id', emailId);
  if (error) console.error('[email-webhook] update:', error);

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

// Svix signature verification (Resend). Header svix-signature is space-separated
// "v1,<base64sig>" entries; signed content is `${id}.${timestamp}.${body}`.
async function verifySvix(headers: Headers, body: string, secret: string): Promise<boolean> {
  try {
    const id = headers.get('svix-id');
    const timestamp = headers.get('svix-timestamp');
    const sigHeader = headers.get('svix-signature');
    if (!id || !timestamp || !sigHeader) return false;

    const secretBytes = base64ToBytes(secret.replace(/^whsec_/, ''));
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signed = `${id}.${timestamp}.${body}`;
    const macBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
    const expected = bytesToBase64(new Uint8Array(macBuf));

    return sigHeader.split(' ').some((part) => {
      const [, sig] = part.split(',');
      return sig === expected;
    });
  } catch (e) {
    console.error('[email-webhook] svix verify:', e);
    return false;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
