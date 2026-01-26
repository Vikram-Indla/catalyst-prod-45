import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateLinkedAccountRequest {
  resourceInventoryId: string;
  email: string;
  fullName: string;
  rid?: string;
}

const DEFAULT_TEMPORARY_PASSWORD = "password@99";

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

    // Verify calling user is admin
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

    // Check admin role in user_roles or product-level admin role
    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    const { data: productRoleCheck } = await supabaseAdmin
      .from("user_product_roles")
      .select("role_id, product_roles!inner(code)")
      .eq("user_id", requestingUser.id);

    const hasProductAdminRole = productRoleCheck?.some((ur: any) =>
      ur.product_roles?.code === "super_admin" || ur.product_roles?.code === "product_admin"
    );

    if (!adminCheck && !hasProductAdminRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const { resourceInventoryId, email, fullName, rid }: CreateLinkedAccountRequest = await req.json();

    if (!resourceInventoryId || !email) {
      return new Response(
        JSON.stringify({ error: "resourceInventoryId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify resource_inventory record exists
    const { data: resource, error: resError } = await supabaseAdmin
      .from("resource_inventory")
      .select("id, profile_id, name, rid")
      .eq("id", resourceInventoryId)
      .single();

    if (resError || !resource) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (resource.profile_id) {
      return new Response(
        JSON.stringify({ error: "Resource already has a linked account" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some((u) => u.email?.toLowerCase() === normalizedEmail);

    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: DEFAULT_TEMPORARY_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName || resource.name },
    });

    if (createError || !newAuthUser.user) {
      console.error("Error creating auth user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newAuthUser.user.id;

    // Wait for profile trigger, then update profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: profileUpdateErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: newUserId,
        email: normalizedEmail,
        full_name: fullName || resource.name,
        rid: rid || resource.rid,
        must_change_password: true,
        approval_status: "APPROVED",
      });

    if (profileUpdateErr) {
      console.error("Error upserting profile:", profileUpdateErr);
    }

    // Link resource_inventory to the new profile
    const { error: linkError } = await supabaseAdmin
      .from("resource_inventory")
      .update({ profile_id: newUserId })
      .eq("id", resourceInventoryId);

    if (linkError) {
      console.error("Error linking resource to profile:", linkError);
      return new Response(
        JSON.stringify({ error: "Account created but failed to link to resource. Please refresh." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Linked account created for resource ${resourceInventoryId}, profile ${newUserId}`);

    return new Response(
      JSON.stringify({
        success: true,
        profileId: newUserId,
        message: "Account created successfully. Default password is password@99 — user must change on first login.",
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
