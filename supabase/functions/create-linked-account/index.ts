// supabase/functions/create-linked-account/index.ts
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

    // Auth guard: verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return err('Unauthorized', 401);

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (authErr || !caller) return err('Unauthorized', 401);

    // Auth guard: caller must be admin or super_admin
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .maybeSingle();
    if (!callerRole || !['admin', 'super_admin'].includes(callerRole.role)) {
      return err('Forbidden: admin role required', 403);
    }

    const body = await req.json();
    const { resourceInventoryId, email, fullName, rid } = body;
    if (!resourceInventoryId || typeof resourceInventoryId !== 'string') {
      return err('resourceInventoryId is required', 400);
    }
    if (!email || typeof email !== 'string') return err('email is required', 400);
    if (!fullName || typeof fullName !== 'string') return err('fullName is required', 400);

    // Check resource_inventory record exists and has no profile_id yet
    const { data: resource, error: resErr } = await supabaseAdmin
      .from('resource_inventory')
      .select('id, profile_id, email')
      .eq('id', resourceInventoryId)
      .maybeSingle();
    if (resErr || !resource) return err('Resource inventory record not found', 404);
    if (resource.profile_id) return err('A Catalyst account is already linked to this resource', 409);

    // Create auth user with a temporary password — user must reset on first login
    const tempPassword = `Catalyst_${Math.random().toString(36).slice(2, 10)}!`;
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, ...(rid ? { rid } : {}) },
    });
    if (createErr) {
      console.error('[create-linked-account] createUser:', createErr);
      return err(createErr.message || 'Failed to create auth user', 500);
    }

    const newUserId = newUser.user.id;

    // Upsert profile
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
      id: newUserId,
      email,
      full_name: fullName,
      approval_status: 'approved',
    });
    if (profileErr) {
      console.error('[create-linked-account] profiles upsert:', profileErr);
      // Non-fatal — continue to link resource
    }

    // Assign default 'user' role
    const { error: roleErr } = await supabaseAdmin.from('user_roles').upsert({
      user_id: newUserId,
      role: 'user',
    });
    if (roleErr) {
      console.error('[create-linked-account] user_roles upsert:', roleErr);
    }

    // Link resource_inventory → new auth user
    const { error: linkErr } = await supabaseAdmin
      .from('resource_inventory')
      .update({ profile_id: newUserId })
      .eq('id', resourceInventoryId);
    if (linkErr) {
      console.error('[create-linked-account] resource_inventory update:', linkErr);
      return err('Failed to link resource to account', 500);
    }

    // Send password reset so user sets their own password on first login
    await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email }).catch((e) => {
      console.warn('[create-linked-account] generateLink (non-fatal):', e);
    });

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id: newUserId,
      actor_id: caller.id,
      user_email: email,
      event_type: 'linked_account_created',
      event_details: {
        created_by: caller.id,
        created_by_role: callerRole.role,
        resource_inventory_id: resourceInventoryId,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, userId: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[create-linked-account]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
