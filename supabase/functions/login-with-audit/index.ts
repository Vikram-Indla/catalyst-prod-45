import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginRequest {
  email: string;
  password: string;
}

// Login rate limits
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const RATE_LIMIT_WINDOW_MINUTES = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password }: LoginRequest = await req.json();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // === Check login rate limit / lockout ===
    const rateLimitCheck = await checkLoginRateLimit(supabaseAdmin, normalizedEmail, clientIp);
    if (!rateLimitCheck.allowed) {
      console.log(`[LOGIN] Rate limit/lockout: ${normalizedEmail}, IP: ${clientIp}`);
      await logAuditEvent(supabaseAdmin, null, normalizedEmail, "login_rate_limited", { 
        ip: clientIp, 
        user_agent: userAgent,
        lockout_remaining_minutes: rateLimitCheck.lockoutMinutesRemaining 
      });
      
      if (rateLimitCheck.lockoutMinutesRemaining) {
        return jsonError(`Too many failed attempts. Please try again in ${rateLimitCheck.lockoutMinutesRemaining} minutes.`, 429);
      }
      return jsonError("Too many login attempts. Please try again later.", 429);
    }

    // === Check approval status first ===
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, approval_status, locked_until, failed_login_count")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      // Check if user is locked
      if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(profile.locked_until).getTime() - Date.now()) / (60 * 1000));
        await logAuditEvent(supabaseAdmin, profile.id, normalizedEmail, "login_locked_out", { ip: clientIp, user_agent: userAgent });
        return jsonError(`Account temporarily locked. Try again in ${minutesLeft} minutes.`, 429);
      }

      const status = profile.approval_status;
      
      if (status === "PENDING_APPROVAL") {
        await logAuditEvent(supabaseAdmin, profile.id, normalizedEmail, "login_blocked_pending", { ip: clientIp, user_agent: userAgent });
        return jsonResponse({ 
          success: false, 
          error: "Your account is pending approval.",
          code: "PENDING_APPROVAL"
        });
      }
      
      if (status === "REJECTED") {
        await logAuditEvent(supabaseAdmin, profile.id, normalizedEmail, "login_blocked_rejected", { ip: clientIp, user_agent: userAgent });
        // Generic message to prevent enumeration
        return jsonResponse({ 
          success: false, 
          error: "Unable to sign in.",
          code: "BLOCKED"
        });
      }

      if (status === "DISABLED") {
        await logAuditEvent(supabaseAdmin, profile.id, normalizedEmail, "login_blocked_disabled", { ip: clientIp, user_agent: userAgent });
        return jsonResponse({ 
          success: false, 
          error: "Unable to sign in.",
          code: "BLOCKED"
        });
      }
    }

    // === Attempt login using user client ===
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseUser.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (authError) {
      console.log(`[LOGIN] Failed attempt: ${normalizedEmail}, IP: ${clientIp}`);
      
      // Record failed attempt
      await recordFailedLogin(supabaseAdmin, normalizedEmail, clientIp);
      
      // Check if we need to lock the account
      const failedCount = await getFailedLoginCount(supabaseAdmin, normalizedEmail);
      
      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        // Lock the account
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        
        if (profile) {
          await supabaseAdmin
            .from("profiles")
            .update({ 
              locked_until: lockUntil.toISOString(),
              failed_login_count: failedCount
            })
            .eq("id", profile.id);
        }
        
        await logAuditEvent(supabaseAdmin, profile?.id || null, normalizedEmail, "lockout_triggered", { 
          ip: clientIp, 
          user_agent: userAgent,
          failed_attempts: failedCount,
          lockout_until: lockUntil.toISOString()
        });
        
        return jsonError(`Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`, 429);
      }
      
      await logAuditEvent(supabaseAdmin, profile?.id || null, normalizedEmail, "login_failed", { 
        ip: clientIp, 
        user_agent: userAgent,
        attempt_number: failedCount
      });
      
      // Generic error message to prevent enumeration
      return jsonResponse({ 
        success: false, 
        error: "The email or password you entered is incorrect.",
        code: "INVALID_CREDENTIALS"
      });
    }

    // === Successful login ===
    const userId = authData.user!.id;
    
    // Clear failed login count
    await clearFailedLogins(supabaseAdmin, normalizedEmail);
    
    // Update profile with last login
    await supabaseAdmin
      .from("profiles")
      .update({ 
        last_login_at: new Date().toISOString(),
        failed_login_count: 0,
        locked_until: null
      })
      .eq("id", userId);
    
    await logAuditEvent(supabaseAdmin, userId, normalizedEmail, "login_success", { 
      ip: clientIp, 
      user_agent: userAgent 
    });

    console.log(`[LOGIN] Success: ${normalizedEmail}, IP: ${clientIp}`);

    return jsonResponse({ 
      success: true,
      session: authData.session,
      user: authData.user
    });

  } catch (error) {
    console.error("[LOGIN] Unexpected error:", error);
    return jsonError("An unexpected error occurred", 500);
  }
});

// === Helper Functions ===

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { 
    status, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

async function checkLoginRateLimit(supabase: any, email: string, ip: string): Promise<{ allowed: boolean; lockoutMinutesRemaining?: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("login_rate_limits")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!data) return { allowed: true };

  // Check if blocked
  if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(data.blocked_until).getTime() - Date.now()) / (60 * 1000));
    return { allowed: false, lockoutMinutesRemaining: minutesLeft };
  }

  return { allowed: true };
}

async function recordFailedLogin(supabase: any, email: string, ip: string): Promise<void> {
  const { data: existing } = await supabase
    .from("login_rate_limits")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  if (existing) {
    const lastAttempt = new Date(existing.last_attempt_at);
    const newFailedCount = lastAttempt < windowStart ? 1 : (existing.failed_count || 0) + 1;
    
    const updateData: any = {
      failed_count: newFailedCount,
      attempt_count: (existing.attempt_count || 0) + 1,
      last_attempt_at: now,
      ip_address: ip,
    };

    // Lock if threshold reached
    if (newFailedCount >= MAX_FAILED_ATTEMPTS) {
      updateData.blocked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      updateData.lockout_count = (existing.lockout_count || 0) + 1;
    }

    await supabase
      .from("login_rate_limits")
      .update(updateData)
      .eq("email", email);
  } else {
    await supabase
      .from("login_rate_limits")
      .insert({
        email,
        ip_address: ip,
        attempt_count: 1,
        failed_count: 1,
        first_attempt_at: now,
        last_attempt_at: now,
      });
  }
}

async function getFailedLoginCount(supabase: any, email: string): Promise<number> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  
  const { data } = await supabase
    .from("login_rate_limits")
    .select("failed_count, last_attempt_at")
    .eq("email", email)
    .maybeSingle();

  if (!data) return 1;
  
  const lastAttempt = new Date(data.last_attempt_at);
  if (lastAttempt < windowStart) return 1;
  
  return data.failed_count || 1;
}

async function clearFailedLogins(supabase: any, email: string): Promise<void> {
  await supabase
    .from("login_rate_limits")
    .update({ 
      failed_count: 0,
      blocked_until: null
    })
    .eq("email", email);
}

async function logAuditEvent(
  supabase: any, 
  userId: string | null, 
  email: string, 
  eventType: string, 
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase
      .from("auth_audit_log")
      .insert({
        user_id: userId,
        user_email: email,
        event_type: eventType,
        event_details: details,
        ip_address: details.ip || null,
        user_agent: details.user_agent || null,
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("[AUDIT] Failed to log event:", error);
  }
}
