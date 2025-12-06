import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive";
  roleIds: string[];
}

// TODO: Replace this default-password + first-login-reset flow with a full email-based 
// invitation + activation flow using the Catalyst HTML email template when we move to production.
const DEFAULT_TEMPORARY_PASSWORD = "password@99";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminCheck) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { firstName, lastName, email, status, roleIds }: CreateUserRequest = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({ error: "First name, last name, and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleIds || roleIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one role must be selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user with the default temporary password
    // User will be required to change this on first login
    const fullName = `${firstName} ${lastName}`.trim();

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password: DEFAULT_TEMPORARY_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createError || !newAuthUser.user) {
      console.error("Error creating auth user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newAuthUser.user.id;

    // Update the profile with status and must_change_password flag
    // Wait a moment for the trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: status,
        full_name: fullName,
        must_change_password: true, // Force password change on first login
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Profile might not exist yet if trigger failed, try to create it
      await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          full_name: fullName,
          status: status,
          must_change_password: true,
        });
    }

    // Create user_product_roles entries
    if (roleIds.length > 0) {
      const roleInserts = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        business_lines: [],
      }));

      const { error: rolesError } = await supabaseAdmin
        .from("user_product_roles")
        .insert(roleInserts);

      if (rolesError) {
        console.error("Error creating product roles:", rolesError);
        // Don't fail the whole operation, user is created
      }
    }

    console.log(`User ${email} created successfully with must_change_password=true`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: email.toLowerCase(), 
          full_name: fullName 
        },
        // Note: Admin should share the default password manually
        message: "User created. Share the default password (password@99) with the user manually."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
