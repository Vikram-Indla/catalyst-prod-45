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
  // Honeypot field - should be empty if human
  website?: string;
}

// Rate limit: max 5 attempts per email per hour
const MAX_ATTEMPTS_PER_HOUR = 5;
// Cooldown for rejected users: 24 hours
const REJECTED_COOLDOWN_HOURS = 24;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, fullName, company, website }: SignupRequest = await req.json();
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";

    // Honeypot check - if website field is filled, it's likely a bot
    if (website && website.trim() !== "") {
      console.log(`[SIGNUP] Honeypot triggered for email: ${email}, IP: ${clientIp}`);
      // Log the attempt but return success to not reveal detection
      await logAuditEvent(supabaseAdmin, null, email, "signup_bot_detected", { ip: clientIp });
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Thanks for registering. Your account is pending approval." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password validation (minimum 8 characters)
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(supabaseAdmin, email.toLowerCase(), clientIp);
    if (!rateLimitCheck.allowed) {
      console.log(`[SIGNUP] Rate limit exceeded for email: ${email}, IP: ${clientIp}`);
      await logAuditEvent(supabaseAdmin, null, email, "signup_rate_limited", { ip: clientIp });
      return new Response(
        JSON.stringify({ error: "Too many signup attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, approval_status, rejected_at, signup_attempts_count")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      const status = existingProfile.approval_status;

      // Case B: Already approved
      if (status === "APPROVED") {
        return new Response(
          JSON.stringify({ error: "This email is already registered. Please sign in." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Case C: Pending approval
      if (status === "PENDING_APPROVAL") {
        return new Response(
          JSON.stringify({ error: "Your registration is pending approval." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Case D: Rejected - allow resubmit after cooldown
      if (status === "REJECTED") {
        const rejectedAt = existingProfile.rejected_at ? new Date(existingProfile.rejected_at) : null;
        const cooldownEnd = rejectedAt ? new Date(rejectedAt.getTime() + REJECTED_COOLDOWN_HOURS * 60 * 60 * 1000) : null;
        
        if (cooldownEnd && new Date() < cooldownEnd) {
          const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (60 * 60 * 1000));
          return new Response(
            JSON.stringify({ error: `Please wait ${hoursLeft} hours before resubmitting.` }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Resubmit: update existing record
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
          return new Response(
            JSON.stringify({ error: "An error occurred. Please try again." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await logAuditEvent(supabaseAdmin, existingProfile.id, email, "signup_resubmitted", { ip: clientIp });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Thanks for registering. Your account is pending approval. You can sign in once an administrator approves your request." 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Case: Disabled
      if (status === "DISABLED") {
        return new Response(
          JSON.stringify({ error: "This account has been disabled. Please contact support." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Case A: New user - create account
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm to avoid email verification
      user_metadata: {
        full_name: fullName,
        company: company || null,
      },
    });

    if (createError) {
      console.error("[SIGNUP] Error creating auth user:", createError);
      
      // Handle duplicate email from auth side
      if (createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "This email is already registered. Please sign in." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create account. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newAuthUser.user!.id;

    // Wait for trigger to create profile, then update with approval status
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
      // Try upsert as fallback
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
          approval_status: "PENDING_APPROVAL",
          requested_at: new Date().toISOString(),
          signup_attempts_count: 1,
          last_signup_attempt_at: new Date().toISOString(),
        });
    }

    await logAuditEvent(supabaseAdmin, userId, email, "signup_submitted", { 
      ip: clientIp, 
      company: company || null 
    });

    // Update rate limit record
    await updateRateLimit(supabaseAdmin, email.toLowerCase(), clientIp);

    console.log(`[SIGNUP] New user created: ${email} with PENDING_APPROVAL status`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Thanks for registering. Your account is pending approval. You can sign in once an administrator approves your request." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SIGNUP] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkRateLimit(supabase: any, email: string, ip: string): Promise<{ allowed: boolean }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from("signup_rate_limits")
    .select("*")
    .eq("email", email)
    .gte("last_attempt_at", oneHourAgo)
    .maybeSingle();

  if (!data) {
    return { allowed: true };
  }

  if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
    return { allowed: false };
  }

  if (data.attempt_count >= MAX_ATTEMPTS_PER_HOUR) {
    // Block for 1 hour
    await supabase
      .from("signup_rate_limits")
      .update({ blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
      .eq("email", email);
    return { allowed: false };
  }

  return { allowed: true };
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
