import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
  const userAgent = req.headers.get('user-agent') ?? null;

  let email = '';
  let password = '';

  try {
    const body = await req.json();
    email = (body.email ?? '').toLowerCase().trim();
    password = body.password ?? '';
  } catch {
    return json({ success: false, error: 'Invalid request body' }, 400);
  }

  if (!email || !password) {
    return json({ success: false, error: 'Email and password are required' }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Check profile status before attempting auth — surfaces PENDING/BLOCKED early
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('approval_status')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    if (profile.approval_status === 'PENDING') {
      await audit(supabaseAdmin, email, false, 'PENDING_APPROVAL', ip, userAgent);
      return json({ success: false, code: 'PENDING_APPROVAL', error: 'Your account is pending approval.' });
    }
    if (profile.approval_status === 'BLOCKED') {
      await audit(supabaseAdmin, email, false, 'BLOCKED', ip, userAgent);
      return json({ success: false, code: 'BLOCKED', error: 'Your account has been blocked.' });
    }
  }

  // Attempt sign-in using the anon client (credentials are user-supplied)
  const supabaseAnon = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    await audit(supabaseAdmin, email, false, error?.message ?? 'unknown', ip, userAgent);
    return json({ success: false, error: 'Invalid credentials' });
  }

  await audit(supabaseAdmin, email, true, null, ip, userAgent);

  return json({
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});

async function audit(
  admin: ReturnType<typeof createClient>,
  email: string,
  success: boolean,
  failureReason: string | null,
  ip: string | null,
  userAgent: string | null,
) {
  try {
    await admin.from('login_audit_log').insert({
      email,
      success,
      failure_reason: failureReason,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (e) {
    // Never let audit failure block sign-in
    console.error('[login-with-audit] audit insert failed:', e);
  }
}
