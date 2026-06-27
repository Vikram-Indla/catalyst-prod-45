// supabase/functions/user-update/index.ts
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
    const { user_id, role, module_access, approval_status, full_name, email } = body;
    if (!user_id || typeof user_id !== 'string') return err('user_id is required', 400);
    const normEmail = email !== undefined ? (email || '').toLowerCase().trim() : undefined;

    // Safety: cannot modify a super_admin unless caller is also super_admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle();

    if (targetRole?.role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: cannot modify a super_admin account', 403);
    }

    // Safety: cannot promote to super_admin unless caller is super_admin
    if (role === 'super_admin' && callerRole.role !== 'super_admin') {
      return err('Forbidden: only super_admin can assign super_admin role', 403);
    }

    const changes: Record<string, unknown> = {};

    // Update role if provided. CAT-RBAC-RESOLVE-20260627-001 Phase 1 — write all three models so
    // /admin/access and /admin/roles stay consistent and the Phase 2 cutover resolves correctly.
    if (role !== undefined) {
      // Legacy app_role (unique (user_id, role)); .update() no-ops when the user has no row
      // (most users), so reset via delete+insert.
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);
      const { error: roleErr } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id, role });
      if (roleErr) {
        console.error('[user-update] user_roles insert:', roleErr);
        return ok(false, 'Failed to update user role');
      }

      // Mirror the legacy text column shown on /admin/access.
      await supabaseAdmin.from('profiles').update({ role }).eq('id', user_id);

      // Mirror the product-role model. admin -> super_admin (the only all-Allow role); other tiers
      // map to an exact code or the 'developer' baseline. On demotion, strip any super_admin grant
      // so effective permissions actually drop. (super_admin is not an app_role value, so 'admin'
      // is the top tier reachable here.)
      const isAdminTier = role === 'admin';
      const targetCode = isAdminTier ? 'super_admin' : (role || 'developer');
      let { data: tpr } = await supabaseAdmin
        .from('product_roles').select('id').eq('code', targetCode).maybeSingle();
      if (!tpr?.id && targetCode !== 'developer') {
        ({ data: tpr } = await supabaseAdmin
          .from('product_roles').select('id').eq('code', 'developer').maybeSingle());
      }
      if (!isAdminTier) {
        const { data: saRole } = await supabaseAdmin
          .from('product_roles').select('id').eq('code', 'super_admin').maybeSingle();
        if (saRole?.id) {
          await supabaseAdmin.from('user_product_roles')
            .delete().eq('user_id', user_id).eq('role_id', saRole.id);
        }
      }
      if (tpr?.id) {
        await supabaseAdmin.from('user_product_roles')
          .upsert({ user_id, role_id: tpr.id, business_lines: [] }, { onConflict: 'user_id,role_id' });
      }
      changes.role = role;
    }

    // Update profile fields if provided
    const profileUpdates: Record<string, unknown> = {};
    if (module_access !== undefined) profileUpdates.module_access = module_access;
    if (approval_status !== undefined) profileUpdates.approval_status = approval_status;
    if (full_name !== undefined) profileUpdates.full_name = (full_name || '').trim() || null;
    if (normEmail) profileUpdates.email = normEmail;

    if (Object.keys(profileUpdates).length > 0) {
      // Use .select('id') so we can detect 0-row updates (missing profile).
      const { data: updatedRows, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user_id)
        .select('id');
      if (profileErr) {
        console.error('[user-update] profiles update:', profileErr);
        return ok(false, 'Failed to update user profile');
      }
      if (!updatedRows || updatedRows.length === 0) {
        return ok(false, 'User profile not found. The user may need to be re-invited to create their profile.');
      }
      Object.assign(changes, profileUpdates);
    }

    // Best-effort: keep the auth email in sync for real auth users. Placeholder
    // rows (never registered) aren't auth users — that's fine, profiles.email is
    // what the invite flow reads.
    if (normEmail) {
      try { await supabaseAdmin.auth.admin.updateUserById(user_id, { email: normEmail }); }
      catch (_) { /* not an auth user yet */ }
    }

    // Audit log
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id,
      actor_id: caller.id,
      event_type: 'user_updated',
      event_details: { updated_by: caller.id, updated_by_role: callerRole.role, changes },
    });

    return new Response(
      JSON.stringify({ ok: true, updated_user_id: user_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[user-update]', e);
    return ok(false, e instanceof Error ? e.message : 'Unknown error');
  }
});

// Business logic errors return HTTP 200 so the client can read { ok, error }
function ok(success: boolean, error?: string) {
  return new Response(JSON.stringify({ ok: success, error }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

// Auth/permission errors stay non-2xx
function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
