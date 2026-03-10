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
    const { connectionId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: connection, error: connError } = await supabaseClient
      .from("jira_connections")
      .select("*, jira_auth_credentials(*)")
      .eq("id", connectionId)
      .single();

    if (connError) throw connError;
    if (!connection) throw new Error("Connection not found");

    const credentials = connection.jira_auth_credentials[0];
    if (!credentials) throw new Error("No credentials found");

    let authHeader = "";
    if (credentials.auth_method === "basic") {
      const auth = btoa(`${credentials.username}:${credentials.api_token}`);
      authHeader = `Basic ${auth}`;
    } else if (credentials.auth_method === "pat") {
      authHeader = `Bearer ${credentials.personal_access_token}`;
    }

    const jiraUrl = connection.jira_url.replace(/\/$/, "");
    const response = await fetch(`${jiraUrl}/rest/api/3/status`, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Jira API error:", errorText);
      throw new Error(`Failed to fetch statuses: ${response.statusText}`);
    }

    const statuses = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        statuses: statuses.map((s: any) => s.name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-fetch-statuses:", error);
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
