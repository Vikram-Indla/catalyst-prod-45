// supabase/functions/invite-resolve/index.ts
// PUBLIC endpoint (no JWT — invitees are not authenticated yet).
// Exchanges an opaque short-link `code` for the underlying setup token + email,
// returned in the response BODY only. The token/email never travel in a URL.
// Returns 404 for unknown / expired / already-consumed / revoked invitations.
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

    const body = await req.json().catch(() => ({}));
    const code: string = (body.code || '').trim();
    if (!code || code.length > 64) return notFound();

    const { data: link } = await supabaseAdmin
      .from('short_links')
      .select('code, invitation_id, raw_token, email, purpose, expires_at')
      .eq('code', code)
      .maybeSingle();
    if (!link) return notFound();
    if (new Date(link.expires_at) <= new Date()) return notFound();

    // The invitation itself is the source of truth for consumption.
    const { data: inv } = await supabaseAdmin
      .from('user_invitations')
      .select('status, accepted_at, expires_at, full_name')
      .eq('id', link.invitation_id)
      .maybeSingle();
    if (!inv) return notFound();
    if (inv.status !== 'pending' || inv.accepted_at) return notFound();
    if (new Date(inv.expires_at) <= new Date()) return notFound();

    // Best-effort resolve counter (does not consume — refresh must keep working
    // until the invitation is accepted/expired/revoked).
    await supabaseAdmin
      .from('short_links')
      .update({ resolve_count: (await currentCount(supabaseAdmin, code)) + 1 })
      .eq('code', code);

    return new Response(
      JSON.stringify({
        ok: true,
        token: link.raw_token,
        email: link.email,
        purpose: link.purpose,
        full_name: inv.full_name ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[invite-resolve]', e);
    return notFound();
  }
});

async function currentCount(client: ReturnType<typeof createClient>, code: string): Promise<number> {
  const { data } = await client.from('short_links').select('resolve_count').eq('code', code).maybeSingle();
  return (data?.resolve_count as number | undefined) ?? 0;
}

// Uniform 404 — never leak whether a code exists, is expired, or was consumed.
function notFound() {
  return new Response(JSON.stringify({ ok: false, error: 'This link is invalid or has expired.' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
