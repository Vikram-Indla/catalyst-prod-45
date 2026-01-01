import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

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
    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (userId === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: "Cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user exists and is inactive/rejected/disabled
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("id, status, approval_status, full_name, email")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow deletion only for disabled or rejected users
    const canDelete = targetUser.approval_status === 'DISABLED' || 
                      targetUser.approval_status === 'REJECTED' ||
                      targetUser.status === 'Inactive';
                      
    if (!canDelete) {
      return new Response(
        JSON.stringify({ error: "Only inactive, disabled, or rejected users can be permanently deleted. Please disable the user first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete all related records in order to handle foreign key constraints
    // that don't have ON DELETE CASCADE

    // 1. Delete user_product_roles
    console.log("Deleting user_product_roles...");
    await supabaseAdmin.from("user_product_roles").delete().eq("user_id", userId);

    // 2. Delete user_roles
    console.log("Deleting user_roles...");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // 3. Clear references from profiles table that might reference this user
    console.log("Clearing profile references...");
    await supabaseAdmin
      .from("profiles")
      .update({ approved_by: null, rejected_by: null })
      .eq("approved_by", userId);
    await supabaseAdmin
      .from("profiles")
      .update({ rejected_by: null })
      .eq("rejected_by", userId);

    // 4. Handle incident_user_profiles and its dependencies
    console.log("Clearing incident-related references...");
    // First clear committee_members that reference incident_user_profiles
    await supabaseAdmin.from("committee_members").delete().eq("user_id", userId);
    await supabaseAdmin.from("committee_votes").delete().eq("member_id", userId);
    
    // Clear incident references
    await supabaseAdmin.from("incidents").update({ reporter_id: null }).eq("reporter_id", userId);
    await supabaseAdmin.from("incidents").update({ assignee_id: null }).eq("assignee_id", userId);
    await supabaseAdmin.from("incidents").update({ committee_set_by: null }).eq("committee_set_by", userId);
    await supabaseAdmin.from("incident_comments").update({ author_id: null }).eq("author_id", userId);
    await supabaseAdmin.from("incident_attachments").update({ uploaded_by: null }).eq("uploaded_by", userId);
    await supabaseAdmin.from("incident_history").update({ changed_by: null }).eq("changed_by", userId);
    
    // Now delete incident_user_profiles
    await supabaseAdmin.from("incident_user_profiles").delete().eq("id", userId);

    // 5. Clear references from other tables without cascade delete
    console.log("Clearing other references...");
    const tablesToClear = [
      { table: "active_package", column: "updated_by" },
      { table: "business_request_links", column: "uploaded_by" },
      { table: "business_requests", column: "end_date_locked_by" },
      { table: "efd_audit_log", column: "user_id" },
      { table: "efd_epics", column: "assignee_id" },
      { table: "efd_epics", column: "reporter_id" },
      { table: "efd_features", column: "assignee_id" },
      { table: "efd_trace_links", column: "created_by" },
      { table: "efd_wizard_sessions", column: "approved_by" },
      { table: "efd_wizard_sessions", column: "created_by" },
      { table: "epic_labels", column: "created_by" },
      { table: "epics", column: "assignee_id" },
      { table: "epics", column: "reporter_id" },
      { table: "feature_scheduling_history", column: "user_id" },
      { table: "forecast_entries", column: "updated_by" },
      { table: "incident_committees", column: "created_by" },
      { table: "incident_teams", column: "created_by" },
      { table: "incident_teams", column: "updated_by" },
    ];

    for (const { table, column } of tablesToClear) {
      try {
        await supabaseAdmin.from(table).update({ [column]: null }).eq(column, userId);
      } catch (e) {
        console.log(`Could not clear ${table}.${column}:`, e);
      }
    }

    // 6. Delete the profile first (which will cascade to related tables)
    console.log("Deleting profile...");
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError);
      // Continue - the auth user deletion should cascade
    }

    // 6. Delete the auth user
    console.log("Deleting auth user...");
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return new Response(
        JSON.stringify({ error: authDeleteError.message || "Failed to delete user. Some references may still exist." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${targetUser.email} (${userId}) deleted successfully by ${requestingUser.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${targetUser.full_name || targetUser.email} has been removed from the system.`
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
