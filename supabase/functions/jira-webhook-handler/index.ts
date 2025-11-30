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
    const payload = await req.json();
    console.log("Webhook received:", payload.webhookEvent);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract event details
    const webhookEvent = payload.webhookEvent;
    const issue = payload.issue;

    if (!issue) {
      return new Response(JSON.stringify({ success: true, message: "No issue data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the linked Catalyst work item
    const { data: link, error: linkError } = await supabaseClient
      .from("jira_work_item_links")
      .select("*, jira_connections(*)")
      .eq("jira_issue_key", issue.key)
      .single();

    if (linkError || !link) {
      console.log("No linked work item found for:", issue.key);
      return new Response(JSON.stringify({ success: true, message: "No link found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if webhook sync is enabled in connection settings
    const connection = link.jira_connections;
    const settings = connection.sync_settings || {};
    
    if (!settings.webhook_sync_enabled) {
      console.log("Webhook sync disabled for connection:", connection.id);
      return new Response(JSON.stringify({ success: true, message: "Webhook sync disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different webhook events
    switch (webhookEvent) {
      case "jira:issue_updated":
        await handleIssueUpdate(supabaseClient, link, issue);
        break;
      case "jira:issue_deleted":
        await handleIssueDelete(supabaseClient, link, issue);
        break;
      case "comment_created":
      case "comment_updated":
        if (settings.sync_comments) {
          await handleCommentSync(supabaseClient, link, payload.comment);
        }
        break;
      default:
        console.log("Unhandled webhook event:", webhookEvent);
    }

    // Log webhook activity
    await supabaseClient.from("jira_sync_logs").insert({
      connection_id: link.connection_id,
      sync_direction: "jira_to_catalyst",
      entity_type: link.catalyst_entity_type,
      entity_id: link.catalyst_entity_id,
      jira_issue_key: issue.key,
      status: "success",
      metadata: { webhook_event: webhookEvent },
    });

    return new Response(
      JSON.stringify({ success: true, processed: webhookEvent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook handler error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleIssueUpdate(supabase: any, link: any, issue: any) {
  const updates: any = {
    name: issue.fields.summary,
    description: issue.fields.description,
    status: mapJiraStatus(issue.fields.status.name),
  };

  // Update the Catalyst work item
  const { error } = await supabase
    .from(getTableName(link.catalyst_entity_type))
    .update(updates)
    .eq("id", link.catalyst_entity_id);

  if (error) {
    console.error("Error updating work item:", error);
    throw error;
  }

  // Update link metadata
  await supabase
    .from("jira_work_item_links")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: "synced",
    })
    .eq("id", link.id);
}

async function handleIssueDelete(supabase: any, link: any, issue: any) {
  // Soft delete the Catalyst work item
  const { error } = await supabase
    .from(getTableName(link.catalyst_entity_type))
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", link.catalyst_entity_id);

  if (error) {
    console.error("Error deleting work item:", error);
    throw error;
  }

  // Update link status
  await supabase
    .from("jira_work_item_links")
    .update({ sync_status: "deleted" })
    .eq("id", link.id);
}

async function handleCommentSync(supabase: any, link: any, comment: any) {
  // Create or update comment in Catalyst
  await supabase.from("comments").insert({
    entity_type: link.catalyst_entity_type,
    entity_id: link.catalyst_entity_id,
    content: comment.body,
    user_id: link.catalyst_entity_id, // Would need proper user mapping
    created_at: comment.created,
  });
}

function getTableName(entityType: string): string {
  const tableMap: Record<string, string> = {
    story: "stories",
    feature: "features",
    epic: "epics",
    capability: "capabilities",
    theme: "strategic_themes",
  };
  return tableMap[entityType] || "stories";
}

function mapJiraStatus(jiraStatus: string): string {
  const statusMap: Record<string, string> = {
    "To Do": "todo",
    "In Progress": "in_progress",
    "Done": "done",
    "Backlog": "backlog",
  };
  return statusMap[jiraStatus] || "todo";
}
