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
    const { connectionId, workItemTypes } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: connection, error: connError } = await supabaseClient
      .from("jira_connections")
      .select("*, jira_auth_credentials(*), jira_project_mappings(*)")
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
    const projectMappings = connection.jira_project_mappings.filter((m: any) => m.sync_enabled);

    let migratedCount = 0;
    const errors: any[] = [];

    for (const mapping of projectMappings) {
      try {
        const jql = `project = "${mapping.jira_project_key}"`;
        const response = await fetch(
          `${jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch issues from ${mapping.jira_project_key}`);
        }

        const result = await response.json();
        
        for (const issue of result.issues) {
          try {
            const existing = await supabaseClient
              .from("jira_work_item_links")
              .select("id")
              .eq("jira_issue_key", issue.key)
              .single();

            if (existing.data) {
              continue;
            }

            const { error: insertError } = await supabaseClient
              .from("stories")
              .insert({
                name: issue.fields.summary,
                description: issue.fields.description,
                status: issue.fields.status.name.toLowerCase(),
                feature_id: mapping.catalyst_program_id,
                assignee_id: null,
              });

            if (insertError) throw insertError;

            migratedCount++;
          } catch (itemError) {
            errors.push({
              issueKey: issue.key,
              error: itemError instanceof Error ? itemError.message : "Unknown error",
            });
          }
        }
      } catch (projectError) {
        errors.push({
          project: mapping.jira_project_key,
          error: projectError instanceof Error ? projectError.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        migrated: migratedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-historical-migration:", error);
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
