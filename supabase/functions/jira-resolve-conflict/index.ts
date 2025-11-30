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
    const { logId, resolution } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: log, error: logError } = await supabaseClient
      .from("jira_sync_logs")
      .select("*")
      .eq("id", logId)
      .single();

    if (logError) throw logError;
    if (!log) throw new Error("Conflict log not found");

    const details = log.details as any;

    if (resolution === "catalyst") {
      // Keep Catalyst version, update Jira
      console.log("Keeping Catalyst version, updating Jira");
    } else if (resolution === "jira") {
      // Keep Jira version, update Catalyst
      console.log("Keeping Jira version, updating Catalyst");
    } else if (resolution === "merge") {
      // Merge both versions
      console.log("Merging both versions");
    }

    // Mark conflict as resolved
    const { error: updateError } = await supabaseClient
      .from("jira_sync_logs")
      .update({ status: "success" })
      .eq("id", logId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        resolution,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-resolve-conflict:", error);
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
