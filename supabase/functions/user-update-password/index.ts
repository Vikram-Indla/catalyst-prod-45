import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,                        msg: 'Password must be at least 8 characters.' },
  { test: (p: string) => /[A-Z]/.test(p),                     msg: 'Password must contain an uppercase letter.' },
  { test: (p: string) => /[a-z]/.test(p),                     msg: 'Password must contain a lowercase letter.' },
  { test: (p: string) => /[0-9]/.test(p),                     msg: 'Password must contain a number.' },
  { test: (p: string) => /[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?`~]/.test(p), msg: 'Password must contain a special character.' },
  { test: (p: string) => p !== 'Password1',                   msg: 'You cannot reuse the default password.' },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authErr || !user) return json({ success: false, error: 'Unauthorized' }, 401);

    const { newPassword } = await req.json();
    if (!newPassword || typeof newPassword !== 'string') {
      return json({ success: false, error: 'newPassword is required' }, 400);
    }

    // Server-side rule enforcement (mirrors client-side checklist)
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(newPassword)) {
        return json({ success: false, error: rule.msg }, 422);
      }
    }

    // Update password via admin API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updateErr) {
      console.error('[user-update-password] updateUserById:', updateErr);
      return json({ success: false, error: 'Failed to update password. Please try again.' }, 500);
    }

    // Clear the must_change_password flag
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user.id);
    if (profileErr) {
      console.error('[user-update-password] profile update:', profileErr);
      // Non-fatal — password is already changed; next login will re-check the flag
    }

    return json({ success: true });
  } catch (e) {
    console.error('[user-update-password]', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
