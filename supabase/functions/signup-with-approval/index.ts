import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  company?: string;
  website?: string; // Honeypot field
}

// Rate limits
const MAX_ATTEMPTS_PER_HOUR = 5;
const REJECTED_COOLDOWN_HOURS = 24;
const IP_RATE_LIMIT_WINDOW_MINUTES = 60;
const MAX_IP_ATTEMPTS = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, fullName, company, website }: SignupRequest = await req.json();
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || "unknown";

    // === Honeypot check ===
    if (website && website.trim() !== "") {
      console.log(`[SIGNUP] Honeypot triggered: ${email}, IP: ${clientIp}`);
      await logAuditEvent(supabaseAdmin, null, email, "signup_bot_detected", { ip: clientIp });
      return jsonSuccess("Thanks for registering. Your account is pending approval.");
    }

    // === Validate required fields ===
    if (!email || !password || !fullName) {
      return jsonValidationError("Email, password, and full name are required", "VALIDATION_ERROR");
    }

    // === Email syntax validation (RFC-compliant) ===
    const emailValidation = validateEmailSyntax(email);
    if (!emailValidation.valid) {
      await logAuditEvent(supabaseAdmin, null, email, "signup_email_invalid", { ip: clientIp, reason: "syntax" });
      return jsonValidationError("Please enter a valid email address.", "INVALID_EMAIL");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split("@")[1];

    // === Check domain allowlist (if enabled) ===
    const allowlistCheck = await checkDomainAllowlist(supabaseAdmin, domain);
    if (!allowlistCheck.allowed) {
      await logAuditEvent(supabaseAdmin, null, email, "signup_domain_blocked", { ip: clientIp, reason: "not_in_allowlist" });
      return jsonValidationError("This email domain is not allowed. Please use an approved work email.", "DOMAIN_NOT_ALLOWED");
    }

    // === Check disposable email domains ===
    const isDisposable = await checkDisposableEmail(supabaseAdmin, domain);
    if (isDisposable) {
      await logAuditEvent(supabaseAdmin, null, email, "signup_email_invalid", { ip: clientIp, reason: "disposable" });
      return jsonValidationError("Temporary or disposable email addresses are not allowed.", "DISPOSABLE_EMAIL");
    }

    // === DNS domain existence validation ===
    const domainExists = await checkDomainExists(domain);
    if (!domainExists) {
      await logAuditEvent(supabaseAdmin, null, email, "signup_email_invalid", { ip: clientIp, reason: "domain_not_found" });
      return jsonValidationError("This email domain is not valid. Please use a different address.", "INVALID_DOMAIN");
    }

    // === MX record validation ===
    const hasMxRecords = await checkMxRecords(domain);
    if (!hasMxRecords) {
      await logAuditEvent(supabaseAdmin, null, email, "signup_email_invalid", { ip: clientIp, reason: "no_mx_records" });
      return jsonValidationError("This email domain cannot receive emails. Please use a different address.", "NO_MX_RECORDS");
    }

    // === Password validation ===
    if (password.length < 8) {
      return jsonValidationError("Password must be at least 8 characters", "WEAK_PASSWORD");
    }

    // === Rate limit by email ===
    const emailRateLimit = await checkEmailRateLimit(supabaseAdmin, normalizedEmail);
    if (!emailRateLimit.allowed) {
      console.log(`[SIGNUP] Email rate limit: ${email}, IP: ${clientIp}`);
      await logAuditEvent(supabaseAdmin, null, email, "signup_rate_limited", { ip: clientIp, type: "email" });
      return jsonValidationError("Too many signup attempts. Please try again later.", "RATE_LIMITED");
    }

    // === Rate limit by IP ===
    const ipRateLimit = await checkIpRateLimit(supabaseAdmin, clientIp);
    if (!ipRateLimit.allowed) {
      console.log(`[SIGNUP] IP rate limit: ${email}, IP: ${clientIp}`);
      await logAuditEvent(supabaseAdmin, null, email, "signup_rate_limited", { ip: clientIp, type: "ip" });
      // Mark IP as suspicious
      await markIpSuspicious(supabaseAdmin, clientIp);
      return jsonValidationError("Too many signup attempts. Please try again later.", "RATE_LIMITED");
    }

    // === Check existing user ===
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, approval_status, rejected_at, signup_attempts_count")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      const status = existingProfile.approval_status;

      // Already approved
      if (status === "APPROVED") {
        return jsonValidationError("This email is already registered.", "EMAIL_EXISTS_APPROVED");
      }

      // Pending approval
      if (status === "PENDING_APPROVAL") {
        return jsonValidationError("Your registration is pending approval.", "EMAIL_EXISTS_PENDING");
      }

      // Rejected - allow resubmit after cooldown
      if (status === "REJECTED") {
        const rejectedAt = existingProfile.rejected_at ? new Date(existingProfile.rejected_at) : null;
        const cooldownEnd = rejectedAt ? new Date(rejectedAt.getTime() + REJECTED_COOLDOWN_HOURS * 60 * 60 * 1000) : null;
        
        if (cooldownEnd && new Date() < cooldownEnd) {
          const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (60 * 60 * 1000));
          return jsonValidationError(`Your request was rejected. Please wait ${hoursLeft} hours before resubmitting.`, "EMAIL_EXISTS_REJECTED_COOLDOWN");
        }

        // Resubmit
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            approval_status: "PENDING_APPROVAL",
            requested_at: new Date().toISOString(),
            rejected_at: null,
            rejection_reason: null,
            signup_attempts_count: (existingProfile.signup_attempts_count || 0) + 1,
            last_signup_attempt_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);

        if (updateError) {
          console.error("[SIGNUP] Error updating rejected profile:", updateError);
          return jsonServerError("An error occurred. Please try again.");
        }

        await logAuditEvent(supabaseAdmin, existingProfile.id, email, "signup_resubmitted", { ip: clientIp });
        await updateRateLimit(supabaseAdmin, normalizedEmail, clientIp);
        
        return jsonSuccess("Thanks for registering. Your account is pending approval. You can sign in once an administrator approves your request.");
      }

      // Disabled
      if (status === "DISABLED") {
        return jsonValidationError("This account has been disabled. Please contact support.", "ACCOUNT_DISABLED");
      }
    }

    // === Create new user ===
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company: company || null,
      },
    });

    if (createError) {
      console.error("[SIGNUP] Error creating auth user:", createError);
      if (createError.message?.includes("already been registered")) {
        return jsonValidationError("This email is already registered.", "EMAIL_EXISTS_APPROVED");
      }
      return jsonServerError("Failed to create account. Please try again.");
    }

    const userId = newAuthUser.user!.id;

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        approval_status: "PENDING_APPROVAL",
        requested_at: new Date().toISOString(),
        signup_attempts_count: 1,
        last_signup_attempt_at: new Date().toISOString(),
        full_name: fullName,
      })
      .eq("id", userId);

    if (profileError) {
      console.error("[SIGNUP] Error updating profile:", profileError);
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: normalizedEmail,
          full_name: fullName,
          approval_status: "PENDING_APPROVAL",
          requested_at: new Date().toISOString(),
          signup_attempts_count: 1,
          last_signup_attempt_at: new Date().toISOString(),
        });
    }

    await logAuditEvent(supabaseAdmin, userId, email, "signup_submitted", { ip: clientIp, company: company || null });
    await updateRateLimit(supabaseAdmin, normalizedEmail, clientIp);

    console.log(`[SIGNUP] New user created: ${email} with PENDING_APPROVAL status`);

    return jsonSuccess("Thanks for registering. Your account is pending approval. You can sign in once an administrator approves your request.");

  } catch (error) {
    console.error("[SIGNUP] Unexpected error:", error);
    return jsonServerError("An unexpected error occurred");
  }
});

// === Helper Functions ===

// Success response - always 200
function jsonSuccess(message: string) {
  return new Response(JSON.stringify({ success: true, message }), { 
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

// Validation error - return 200 with success: false to avoid Lovable's error overlay
// The frontend checks success flag and error code to handle appropriately
function jsonValidationError(message: string, code: string) {
  return new Response(JSON.stringify({ 
    success: false, 
    error: message, 
    code: code 
  }), { 
    status: 200, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

// Server error - only use for true unexpected errors (500)
function jsonServerError(message: string) {
  return new Response(JSON.stringify({ 
    success: false, 
    error: message, 
    code: "SERVER_ERROR" 
  }), { 
    status: 500, 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

function validateEmailSyntax(email: string): { valid: boolean } {
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return { valid: false };
  if (email.length > 254) return { valid: false };
  if (email.split("@").length !== 2) return { valid: false };
  
  const [local, domain] = email.split("@");
  if (local.length > 64) return { valid: false };
  if (!domain || domain.length < 3) return { valid: false };
  if (!domain.includes(".")) return { valid: false };
  
  return { valid: true };
}

async function checkDomainAllowlist(supabase: any, domain: string): Promise<{ allowed: boolean }> {
  // Check if allowlist is enabled
  const { data: settings } = await supabase
    .from("auth_settings")
    .select("setting_value")
    .eq("setting_key", "domain_allowlist_enabled")
    .maybeSingle();

  const enabled = settings?.setting_value?.enabled === true;
  if (!enabled) return { allowed: true };

  // Check if domain is in allowlist
  const { data: allowedDomain } = await supabase
    .from("domain_allowlist")
    .select("id")
    .eq("domain", domain.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();

  return { allowed: !!allowedDomain };
}

async function checkDisposableEmail(supabase: any, domain: string): Promise<boolean> {
  const { data } = await supabase
    .from("disposable_email_domains")
    .select("id")
    .eq("domain", domain.toLowerCase())
    .maybeSingle();
  
  return !!data;
}

async function checkDomainExists(domain: string): Promise<boolean> {
  try {
    const result = await Deno.resolveDns(domain, "A").catch(() => null);
    const result6 = await Deno.resolveDns(domain, "AAAA").catch(() => null);
    const hasA = result !== null && result.length > 0;
    const hasAAAA = result6 !== null && result6.length > 0;
    return hasA || hasAAAA;
  } catch {
    return false;
  }
}

async function checkMxRecords(domain: string): Promise<boolean> {
  try {
    const mxRecords = await Deno.resolveDns(domain, "MX").catch(() => null);
    return mxRecords !== null && mxRecords.length > 0;
  } catch {
    return false;
  }
}

async function checkEmailRateLimit(supabase: any, email: string): Promise<{ allowed: boolean }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("signup_rate_limits")
    .select("*")
    .eq("email", email)
    .gte("last_attempt_at", oneHourAgo)
    .maybeSingle();

  if (!data) return { allowed: true };
  if (data.blocked_until && new Date(data.blocked_until) > new Date()) return { allowed: false };
  if (data.attempt_count >= MAX_ATTEMPTS_PER_HOUR) {
    await supabase
      .from("signup_rate_limits")
      .update({ blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
      .eq("email", email);
    return { allowed: false };
  }

  return { allowed: true };
}

async function checkIpRateLimit(supabase: any, ip: string): Promise<{ allowed: boolean }> {
  if (ip === "unknown") return { allowed: true };
  
  const windowStart = new Date(Date.now() - IP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("signup_rate_limits")
    .select("attempt_count")
    .eq("ip_address", ip)
    .gte("last_attempt_at", windowStart);

  const totalAttempts = (data || []).reduce((sum: number, r: any) => sum + (r.attempt_count || 0), 0);
  return { allowed: totalAttempts < MAX_IP_ATTEMPTS };
}

async function markIpSuspicious(supabase: any, ip: string): Promise<void> {
  await supabase
    .from("signup_rate_limits")
    .update({ is_suspicious: true })
    .eq("ip_address", ip);
}

async function updateRateLimit(supabase: any, email: string, ip: string): Promise<void> {
  const { data: existing } = await supabase
    .from("signup_rate_limits")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (existing) {
    const lastAttempt = new Date(existing.last_attempt_at);
    const newCount = lastAttempt < oneHourAgo ? 1 : existing.attempt_count + 1;
    
    await supabase
      .from("signup_rate_limits")
      .update({
        attempt_count: newCount,
        last_attempt_at: new Date().toISOString(),
        ip_address: ip,
      })
      .eq("email", email);
  } else {
    await supabase
      .from("signup_rate_limits")
      .insert({
        email,
        ip_address: ip,
        attempt_count: 1,
        first_attempt_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      });
  }
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
        created_at: new Date().toISOString(),
      });
  } catch (error) {
    console.error("[AUDIT] Failed to log event:", error);
  }
}