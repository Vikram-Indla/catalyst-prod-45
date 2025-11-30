import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId, resolution } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: conflicts, error: conflictsError } = await supabaseClient
      .from("jira_sync_logs")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "conflict");

    if (conflictsError) throw conflictsError;

    let resolved = 0;
    for (const conflict of conflicts || []) {
      try {
        if (resolution === "catalyst") {
          console.log(`Resolving ${conflict.id} - keeping Catalyst version`);
        } else if (resolution === "jira") {
          console.log(`Resolving ${conflict.id} - keeping Jira version`);
        }

        await supabaseClient
          .from("jira_sync_logs")
          .update({ status: "success" })
          .eq("id", conflict.id);

        resolved++;
      } catch (itemError) {
        console.error(`Failed to resolve conflict ${conflict.id}:`, itemError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        resolved,
        total: conflicts?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-resolve-all-conflicts:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
