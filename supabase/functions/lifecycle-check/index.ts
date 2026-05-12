// supabase/functions/lifecycle-check/index.ts
//
// Phase 4 — Lifecycle automation.
//
// Triggered daily by pg_cron (via net.http_post to this URL with the
// LIFECYCLE_CRON_SECRET in the Authorization header).
// Can also be invoked manually by an admin for dry-run testing.
//
// Logic:
//   25 days inactive (last_sign_in_at) → warn email
//   30 days inactive                   → deactivate (is_active=false) + email
//   already inactive                   → skip
//   never signed in                    → skip (invited but not yet active)
//
// Inputs:  { dry_run?: boolean }
// Returns: { ok, warned, deactivated, errors, dry_run }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WARN_DAYS = 25;
const DEACTIVATE_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  last_sign_in_at: string | null;
  is_active: boolean;
}

type LifecycleAction = 'warn' | 'deactivate' | 'ok';

interface ClassifiedUser {
  user: UserRecord;
  action: LifecycleAction;
  days_inactive: number;
}

// ─── Pure classifier (same logic as the Vitest contract test) ─────────────────

export function classifyInactiveUsers(
  users: UserRecord[],
  now: Date,
  warnThresholdDays = WARN_DAYS,
  deactivateThresholdDays = DEACTIVATE_DAYS,
): ClassifiedUser[] {
  return users.map((user) => {
    if (!user.is_active) return { user, action: 'ok', days_inactive: 0 };

    const lastSeen = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
    if (!lastSeen) return { user, action: 'ok', days_inactive: 0 };

    const days_inactive = Math.floor(
      (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (days_inactive >= deactivateThresholdDays) return { user, action: 'deactivate', days_inactive };
    if (days_inactive >= warnThresholdDays) return { user, action: 'warn', days_inactive };
    return { user, action: 'ok', days_inactive };
  });
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function warnEmailBody(name: string, daysInactive: number): { subject: string; text: string; html: string } {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: 'Action required: your Catalyst account is about to expire',
    text: `Hi ${firstName},\n\nYour Catalyst account has been inactive for ${daysInactive} days. Accounts inactive for 30 days are automatically deactivated.\n\nPlease log in at http://localhost:8080 to keep your account active.\n\n— The Catalyst Team`,
    html: `<p>Hi ${firstName},</p><p>Your Catalyst account has been inactive for <strong>${daysInactive} days</strong>. Accounts inactive for 30 days are automatically deactivated.</p><p><a href="http://localhost:8080">Log in to Catalyst</a> to keep your account active.</p><p>— The Catalyst Team</p>`,
  };
}

function deactivateEmailBody(name: string): { subject: string; text: string; html: string } {
  const firstName = name?.split(' ')[0] || 'there';
  return {
    subject: 'Your Catalyst account has been deactivated',
    text: `Hi ${firstName},\n\nYour Catalyst account has been deactivated due to 30+ days of inactivity.\n\nTo reactivate your account, please contact your Catalyst administrator.\n\n— The Catalyst Team`,
    html: `<p>Hi ${firstName},</p><p>Your Catalyst account has been <strong>deactivated</strong> due to 30+ days of inactivity.</p><p>To reactivate your account, please contact your Catalyst administrator.</p><p>— The Catalyst Team</p>`,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Accept either the cron secret (for pg_cron) or a valid admin JWT.
  const authHeader = req.headers.get('Authorization') ?? '';
  const cronSecret = Deno.env.get('LIFECYCLE_CRON_SECRET');
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // For non-cron calls, verify the caller is an admin.
  if (!isCron) {
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (!roleRow || !['admin', 'super_admin'].includes(roleRow.role)) {
      return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  let dry_run = false;
  try {
    const body = await req.json().catch(() => ({}));
    dry_run = body?.dry_run === true;
  } catch { /* no body */ }

  try {
    // 1. Fetch all auth users with their last_sign_in_at.
    const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (authErr) throw authErr;

    // 2. Fetch profile_id + is_active from resource_inventory joined with profiles.
    const { data: resources, error: resErr } = await supabaseAdmin
      .from('resource_inventory')
      .select('profile_id, is_active')
      .not('profile_id', 'is', null);
    if (resErr) throw resErr;

    // 3. Fetch profile emails for lookup.
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email');
    if (profErr) throw profErr;

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const resourceMap = new Map((resources ?? []).map((r) => [r.profile_id, r]));

    // 4. Build the unified user list for classification.
    const userRecords: UserRecord[] = (authUsers ?? [])
      .filter((u) => resourceMap.has(u.id))
      .map((u) => {
        const profile = profileMap.get(u.id);
        const resource = resourceMap.get(u.id)!;
        return {
          id: u.id,
          email: profile?.email ?? u.email ?? '',
          full_name: profile?.full_name ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
          is_active: resource.is_active,
        };
      });

    // 5. Classify.
    const classified = classifyInactiveUsers(userRecords, new Date());
    const toWarn = classified.filter((c) => c.action === 'warn');
    const toDeactivate = classified.filter((c) => c.action === 'deactivate');

    const warned: string[] = [];
    const deactivated: string[] = [];
    const errors: string[] = [];

    // 6. Process warnings.
    for (const { user, days_inactive } of toWarn) {
      if (!dry_run) {
        try {
          const emailBody = warnEmailBody(user.full_name ?? user.email, days_inactive);
          await supabaseAdmin.functions.invoke('email-send', {
            body: {
              to: user.email,
              ...emailBody,
              template_name: 'lifecycle_warning',
              template_props: { days_inactive },
              recipient_user_id: user.id,
            },
          });
        } catch (e) {
          errors.push(`warn ${user.email}: ${e instanceof Error ? e.message : 'unknown'}`);
          continue;
        }
      }
      warned.push(user.email);
    }

    // 7. Process deactivations.
    for (const { user } of toDeactivate) {
      if (!dry_run) {
        try {
          const { error: updateErr } = await supabaseAdmin
            .from('resource_inventory')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('profile_id', user.id);
          if (updateErr) throw updateErr;

          const emailBody = deactivateEmailBody(user.full_name ?? user.email);
          await supabaseAdmin.functions.invoke('email-send', {
            body: {
              to: user.email,
              ...emailBody,
              template_name: 'lifecycle_deactivate',
              template_props: {},
              recipient_user_id: user.id,
            },
          });
        } catch (e) {
          errors.push(`deactivate ${user.email}: ${e instanceof Error ? e.message : 'unknown'}`);
          continue;
        }
      }
      deactivated.push(user.email);
    }

    return new Response(
      JSON.stringify({ ok: true, warned, deactivated, errors, dry_run }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[lifecycle-check] error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
