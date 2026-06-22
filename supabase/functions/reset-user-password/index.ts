// supabase/functions/reset-user-password/index.ts
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

    // Auth guard: caller must have admin app_role OR super_admin product role
    const [{ data: callerAppRole }, { data: callerProductRoles }] = await Promise.all([
      supabaseAdmin.from('user_roles').select('role').eq('user_id', caller.id).maybeSingle(),
      supabaseAdmin
        .from('user_product_roles')
        .select('product_roles(code)')
        .eq('user_id', caller.id),
    ]);

    const isAdminRole = callerAppRole?.role === 'admin';
    const isSuperAdmin = (callerProductRoles ?? []).some(
      (r: any) => r.product_roles?.code === 'super_admin',
    );

    if (!isAdminRole && !isSuperAdmin) {
      return err('Forbidden: admin role required', 403);
    }

    const callerRoleLabel = isAdminRole ? callerAppRole!.role : 'super_admin';

    const body = await req.json();
    const { userId } = body;
    if (!userId || typeof userId !== 'string') return err('userId is required', 400);

    // Safety: only super_admin can modify another super_admin
    const { data: targetProductRoles } = await supabaseAdmin
      .from('user_product_roles')
      .select('product_roles(code)')
      .eq('user_id', userId);

    const targetIsSuperAdmin = (targetProductRoles ?? []).some(
      (r: any) => r.product_roles?.code === 'super_admin',
    );
    if (targetIsSuperAdmin && !isSuperAdmin) {
      return err('Forbidden: cannot modify a super_admin account', 403);
    }

    // Fetch target user email from auth.users
    const { data: { user: targetUser }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserErr || !targetUser) return err('User not found', 404);

    const email = targetUser.email;
    if (!email) return err('User has no email address', 400);

    // Generate a password reset link
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'https://ksa-catalyst.com/reset-password' },
    });
    if (linkErr) {
      console.error('[reset-user-password] generateLink:', linkErr);
      return err('Failed to generate reset link', 500);
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      console.error('[reset-user-password] no action_link in generateLink response');
      return err('Failed to extract reset link', 500);
    }

    // Send the reset email via the email-send gateway
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: 'Reset your Catalyst password',
        text: `You have been asked to reset your Catalyst password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link expires in 24 hours. If you did not request this, you can ignore this email.`,
        html: `<p>You have been asked to reset your <strong>Catalyst</strong> password.</p><p><a href="${resetLink}" style="background:#0052CC;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Reset password</a></p><p style="color:#6B778C;font-size:12px;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>`,
        recipient_user_id: userId,
        template_name: 'password_reset',
      }),
    });

    if (!emailRes.ok) {
      const emailErr = await emailRes.json().catch(() => ({}));
      console.error('[reset-user-password] email-send failed:', emailErr);
      return err('Reset link generated but email delivery failed', 500);
    }

    const emailData = await emailRes.json().catch(() => ({}));
    const messageId = emailData?.message_id ?? null;
    const emailLogId = emailData?.email_log_id ?? null;

    // Audit log — includes message_id for delivery traceability
    await supabaseAdmin.from('auth_audit_log').insert({
      user_id: userId,
      actor_id: caller.id,
      user_email: email,
      event_type: 'password_reset_sent',
      event_details: {
        triggered_by: caller.id,
        triggered_by_role: callerRoleLabel,
        resend_message_id: messageId,
        email_log_id: emailLogId,
        delivered_to: email,
        sent_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ ok: true, email, message_id: messageId, email_log_id: emailLogId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[reset-user-password]', e);
    return err(e instanceof Error ? e.message : 'Unknown error', 500);
  }
});

function err(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
