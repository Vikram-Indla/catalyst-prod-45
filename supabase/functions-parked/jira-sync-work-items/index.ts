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
    const { connectionId, syncDirection = "bidirectional", workItemType = "story" } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get connection and mappings
    const { data: connection, error: connError } = await supabaseClient
      .from("jira_connections")
      .select("*, jira_auth_credentials(*), jira_project_mappings(*), jira_field_mappings(*)")
      .eq("id", connectionId)
      .single();

    if (connError) throw connError;
    if (!connection) throw new Error("Connection not found");

    const credentials = connection.jira_auth_credentials[0];
    if (!credentials) throw new Error("No credentials found");

    // Build auth header
    let authHeader = "";
    if (credentials.auth_method === "basic") {
      const auth = btoa(`${credentials.username}:${credentials.api_token}`);
      authHeader = `Basic ${auth}`;
    } else if (credentials.auth_method === "pat") {
      authHeader = `Bearer ${credentials.personal_access_token}`;
    }

    const jiraUrl = connection.jira_url.replace(/\/$/, "");
    const syncResults = {
      syncedToJira: 0,
      syncedFromJira: 0,
      errors: [] as string[],
    };

    // Sync from Catalyst to Jira
    if (syncDirection === "bidirectional" || syncDirection === "catalyst_to_jira") {
      const projectMappings = connection.jira_project_mappings.filter((m: any) => m.sync_enabled);

      for (const mapping of projectMappings) {
        try {
          // Get Catalyst work items for this program
          const { data: stories, error: storiesError } = await supabaseClient
            .from("stories")
            .select("*")
            .eq("program_id", mapping.catalyst_program_id)
            .is("jira_issue_key", null)
            .limit(50);

          if (storiesError) throw storiesError;

          for (const story of stories || []) {
            try {
              // Create Jira issue
              const jiraIssue = {
                fields: {
                  project: { key: mapping.jira_project_key },
                  summary: story.name,
                  description: story.description || "",
                  issuetype: { name: "Story" },
                },
              };

              const response = await fetch(`${jiraUrl}/rest/api/3/issue`, {
                method: "POST",
                headers: {
                  Authorization: authHeader,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(jiraIssue),
              });

              if (!response.ok) {
                const errorText = await response.text();
                syncResults.errors.push(`Failed to create ${story.name}: ${errorText}`);
                continue;
              }

              const createdIssue = await response.json();

              // Update Catalyst story with Jira key
              await supabaseClient
                .from("stories")
                .update({ jira_issue_key: createdIssue.key })
                .eq("id", story.id);

              // Create link record
              await supabaseClient.from("jira_work_item_links").insert({
                connection_id: connectionId,
                catalyst_entity_type: "story",
                catalyst_entity_id: story.id,
                jira_issue_key: createdIssue.key,
                jira_issue_id: createdIssue.id,
                sync_status: "synced",
              });

              syncResults.syncedToJira++;

              // Log sync
              await supabaseClient.from("jira_sync_logs").insert({
                connection_id: connectionId,
                sync_direction: "catalyst_to_jira",
                entity_type: "story",
                entity_id: story.id,
                status: "success",
              });
            } catch (itemError: any) {
              syncResults.errors.push(`Error syncing ${story.name}: ${itemError.message}`);
            }
          }
        } catch (mappingError: any) {
          syncResults.errors.push(`Error in mapping ${mapping.jira_project_key}: ${mappingError.message}`);
        }
      }
    }

    // Sync from Jira to Catalyst
    if (syncDirection === "bidirectional" || syncDirection === "jira_to_catalyst") {
      const projectMappings = connection.jira_project_mappings.filter((m: any) => m.sync_enabled);

      for (const mapping of projectMappings) {
        try {
          // Fetch recent Jira issues
          const jql = `project = ${mapping.jira_project_key} AND updated >= -7d ORDER BY updated DESC`;
          const response = await fetch(
            `${jiraUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50`,
            {
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            syncResults.errors.push(`Failed to fetch from ${mapping.jira_project_key}`);
            continue;
          }

          const searchResults = await response.json();

          for (const issue of searchResults.issues || []) {
            try {
              // Check if already linked
              const { data: existingLink } = await supabaseClient
                .from("jira_work_item_links")
                .select("catalyst_entity_id")
                .eq("jira_issue_key", issue.key)
                .single();

              if (existingLink) {
                // Update existing story
                await supabaseClient
                  .from("stories")
                  .update({
                    name: issue.fields.summary,
                    description: issue.fields.description,
                    status: mapJiraStatus(issue.fields.status.name),
                  })
                  .eq("id", existingLink.catalyst_entity_id);
              } else {
                // Create new story
                const { data: newStory, error: createError } = await supabaseClient
                  .from("stories")
                  .insert({
                    name: issue.fields.summary,
                    description: issue.fields.description,
                    status: mapJiraStatus(issue.fields.status.name),
                    jira_issue_key: issue.key,
                  })
                  .select()
                  .single();

                if (createError) throw createError;

                // Create link
                await supabaseClient.from("jira_work_item_links").insert({
                  connection_id: connectionId,
                  catalyst_entity_type: "story",
                  catalyst_entity_id: newStory.id,
                  jira_issue_key: issue.key,
                  jira_issue_id: issue.id,
                  sync_status: "synced",
                });
              }

              syncResults.syncedFromJira++;

              // Log sync
              await supabaseClient.from("jira_sync_logs").insert({
                connection_id: connectionId,
                sync_direction: "jira_to_catalyst",
                entity_type: "story",
                jira_issue_key: issue.key,
                status: "success",
              });
            } catch (itemError: any) {
              syncResults.errors.push(`Error syncing ${issue.key}: ${itemError.message}`);
            }
          }
        } catch (mappingError: any) {
          syncResults.errors.push(`Error in mapping ${mapping.jira_project_key}: ${mappingError.message}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...syncResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in jira-sync-work-items:", error);
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

function mapJiraStatus(jiraStatus: string): string {
  const statusMap: Record<string, string> = {
    "To Do": "todo",
    "In Progress": "in_progress",
    "Done": "done",
    "Backlog": "backlog",
  };
  return statusMap[jiraStatus] || "todo";
}
