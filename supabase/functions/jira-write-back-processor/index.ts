import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Map Catalyst priority → Jira priority name */
function mapPriorityToJira(priority: string): string {
  switch (priority) {
    case "critical": return "Highest";
    case "high": return "High";
    case "low": return "Low";
    default: return "Medium";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;
  let failCount = 0;

  try {
    // Mark abandoned items (retry_count >= 3)
    await supabase
      .from("jira_write_back_queue")
      .update({ status: "abandoned", push_attempted_at: new Date().toISOString() })
      .eq("status", "approved")
      .gte("retry_count", 3);

    // 1. Fetch approved queue items
    const { data: queueItems, error: qErr } = await supabase
      .from("jira_write_back_queue")
      .select("*")
      .eq("status", "approved")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(10);

    if (qErr) throw new Error(`Queue query failed: ${qErr.message}`);

    if (!queueItems || queueItems.length === 0) {
      // Nothing to process — still log it
      await supabase.from("jira_sync_logs").insert({
        sync_type: "write-back",
        status: "success",
        items_created: 0,
        items_updated: 0,
        items_deleted: 0,
        items_failed: 0,
        sync_duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ processed: 0, succeeded: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Process each item
    for (const item of queueItems) {
      try {
        const payload = item.operation_payload || {};
        const operation: string = item.operation || "update";

        // 2a. Fetch work item — try ph_work_item_id first, fall back to ph_issue_id → ph_issues
        let workItem: { id: string; jira_key: string | null; project_id: string | null } | null = null;

        if (item.ph_work_item_id) {
          const { data } = await supabase
            .from("ph_work_items")
            .select("id, jira_key, project_id")
            .eq("id", item.ph_work_item_id)
            .maybeSingle();
          workItem = data;
        }

        // Fallback: resolve from ph_issues (StoryDetailModal writes ph_issue_id)
        if (!workItem && item.ph_issue_id) {
          const { data: issue } = await supabase
            .from("ph_issues")
            .select("id, jira_key, project_key")
            .eq("id", item.ph_issue_id)
            .maybeSingle();
          if (issue) {
            // Resolve project_id from project_key
            let resolvedProjectId: string | null = null;
            if (issue.project_key) {
              const { data: proj } = await supabase
                .from("projects")
                .select("id")
                .eq("project_key", issue.project_key)
                .maybeSingle();
              resolvedProjectId = proj?.id || null;
            }
            workItem = { id: issue.id, jira_key: issue.jira_key, project_id: resolvedProjectId };
          }
        }

        if (!workItem && operation !== "delete") {
          throw new Error(`Work item not found for queue ${item.id} (ph_work_item_id=${item.ph_work_item_id}, ph_issue_id=${item.ph_issue_id})`);
        }

        const projectId = workItem?.project_id || payload.project_id;

        // 2b. Resolve Jira credentials — try jira_connections first, fall back to ph_jira_connection
        let baseUrl: string;
        let authHeader: string;
        let jiraProjectKey: string | null = null;

        // Try System A: jira_project_mappings → jira_connections
        const { data: mapping } = await supabase
          .from("jira_project_mappings")
          .select("jira_project_key, connection_id")
          .eq("catalyst_project_id", projectId)
          .eq("sync_enabled", true)
          .maybeSingle();

        if (mapping) {
          const { data: connection } = await supabase
            .from("jira_connections")
            .select("id, base_url")
            .eq("id", mapping.connection_id)
            .eq("is_active", true)
            .maybeSingle();

          if (connection) {
            const { data: creds } = await supabase
              .from("jira_auth_credentials")
              .select("email, api_token")
              .eq("connection_id", connection.id)
              .maybeSingle();

            if (creds) {
              baseUrl = connection.base_url.replace(/\/$/, "");
              authHeader = "Basic " + btoa(`${creds.email}:${creds.api_token}`);
              jiraProjectKey = mapping.jira_project_key;
            }
          }
        }

        // Fallback: ph_jira_connection (the authoritative singleton)
        if (!baseUrl! || !authHeader!) {
          const { data: phConn } = await supabase
            .from("ph_jira_connection")
            .select("site_url, auth_email, auth_token_encrypted")
            .eq("status", "connected")
            .single();

          if (!phConn) {
            throw new Error("No active Jira connection found");
          }

          baseUrl = phConn.site_url.replace(/\/$/, "");
          authHeader = "Basic " + btoa(`${phConn.auth_email}:${phConn.auth_token_encrypted}`);

          // Resolve jira project key from ph_projects
          if (!jiraProjectKey) {
            const { data: phProject } = await supabase
              .from("ph_projects")
              .select("key")
              .eq("id", projectId)
              .maybeSingle();
            jiraProjectKey = phProject?.key || null;
          }
        }
        const jiraHeaders = {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        let jiraResponse: Response;
        let responseBody: any = {};

        // 2d. Execute Jira API call
        if (operation === "create") {
          const body = {
            fields: {
              project: { key: jiraProjectKey || "UNKNOWN" },
              issuetype: { name: "Story" },
              summary: payload.title || "Untitled",
              description: {
                type: "doc",
                version: 1,
                content: [{
                  type: "paragraph",
                  content: [{ type: "text", text: payload.description || "" }],
                }],
              },
              priority: { name: mapPriorityToJira(payload.priority) },
              ...(payload.assignee_account_id
                ? { assignee: { accountId: payload.assignee_account_id } }
                : {}),
            },
          };

          jiraResponse = await fetch(`${baseUrl}/rest/api/3/issue`, {
            method: "POST",
            headers: jiraHeaders,
            body: JSON.stringify(body),
          });
        } else if (operation === "update") {
          const jiraKey = workItem?.jira_key || payload.jira_key;
          if (!jiraKey) throw new Error("No jira_key for update operation");

          const fields: Record<string, any> = {};
          if (payload.title) fields.summary = payload.title;
          if (payload.description !== undefined) {
            fields.description = {
              type: "doc",
              version: 1,
              content: [{
                type: "paragraph",
                content: [{ type: "text", text: payload.description || "" }],
              }],
            };
          }
          if (payload.priority) fields.priority = { name: mapPriorityToJira(payload.priority) };
          if (payload.assignee_account_id) {
            fields.assignee = { accountId: payload.assignee_account_id };
          }

          jiraResponse = await fetch(`${baseUrl}/rest/api/3/issue/${jiraKey}`, {
            method: "PUT",
            headers: jiraHeaders,
            body: JSON.stringify({ fields }),
          });
        } else if (operation === "delete") {
          const jiraKey = workItem?.jira_key || payload.jira_key;
          if (!jiraKey) throw new Error("No jira_key for delete operation");

          jiraResponse = await fetch(`${baseUrl}/rest/api/3/issue/${jiraKey}`, {
            method: "DELETE",
            headers: jiraHeaders,
          });
        } else {
          throw new Error(`Unknown operation: ${operation}`);
        }

        // Parse response (DELETE may return 204 with no body)
        if (jiraResponse!.status !== 204) {
          try { responseBody = await jiraResponse!.json(); } catch { responseBody = {}; }
        }

        // 2f/2g. Handle response
        if (jiraResponse!.ok) {
          // Update queue item
          await supabase
            .from("jira_write_back_queue")
            .update({
              status: "completed",
              jira_response_key: responseBody.key || null,
              jira_response_id: responseBody.id?.toString() || null,
              push_attempted_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          // Update work item
          if (workItem) {
            const wiUpdate: Record<string, any> = {
              jira_sync_status: "synced",
              jira_pushed_at: new Date().toISOString(),
              jira_sync_error: null,
            };
            if (operation === "create" && responseBody.key) {
              wiUpdate.jira_key = responseBody.key;
            }
            await supabase
              .from("ph_work_items")
              .update(wiUpdate)
              .eq("id", workItem.id);
          }

          if (operation === "create") createCount++;
          else if (operation === "update") updateCount++;
          else if (operation === "delete") deleteCount++;
        } else {
          const errText = JSON.stringify(responseBody).substring(0, 500);
          throw new Error(`Jira API ${jiraResponse!.status}: ${errText}`);
        }
      } catch (itemErr) {
        failCount++;
        const errMsg = itemErr instanceof Error ? itemErr.message : "Unknown error";
        console.error(`Queue item ${item.id} failed:`, errMsg);

        await supabase
          .from("jira_write_back_queue")
          .update({
            status: "failed",
            retry_count: (item.retry_count || 0) + 1,
            last_error: errMsg.substring(0, 1000),
            push_attempted_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (item.ph_work_item_id) {
          await supabase
            .from("ph_work_items")
            .update({
              jira_sync_status: "failed",
              jira_sync_error: errMsg.substring(0, 500),
            })
            .eq("id", item.ph_work_item_id);
        }
      }
    }

    // 3. Write summary log
    const totalProcessed = createCount + updateCount + deleteCount + failCount;
    await supabase.from("jira_sync_logs").insert({
      sync_type: "write-back",
      status: failCount === totalProcessed && totalProcessed > 0 ? "error" : "success",
      items_created: createCount,
      items_updated: updateCount,
      items_deleted: deleteCount,
      items_failed: failCount,
      sync_duration_ms: Date.now() - startTime,
    });

    // 4. Return summary
    const succeeded = createCount + updateCount + deleteCount;
    return new Response(
      JSON.stringify({ processed: totalProcessed, succeeded, failed: failCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("jira-write-back-processor error:", e);
    const errMsg = e instanceof Error ? e.message : "Unknown error";

    await supabase.from("jira_sync_logs").insert({
      sync_type: "write-back",
      status: "error",
      items_failed: failCount || 1,
      error_message: errMsg,
      sync_duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
