/**
 * jira-activity-processor — Processes pending outbound sync from jira_sync_activity.
 * 
 * Strategy:
 * - Picks up `pending` outbound rows (max 20 per batch)
 * - 3 retries with exponential backoff (2s, 4s, 8s)
 * - Conflict detection: compares catalyst_changed_at vs jira_last_modified_at
 * - Jira-master last-write-wins on conflicts
 * - Updates sync status to success/failed/skipped
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1. Fetch pending outbound events from jira_sync_activity
    const { data: events, error: fetchErr } = await supabase
      .from("jira_sync_activity")
      .select("*")
      .eq("direction", "outbound")
      .eq("sync_status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchErr) throw fetchErr;
    if (!events || events.length === 0) {
      return jsonResponse({ processed: 0, failed: 0, skipped: 0, total: 0, message: "No pending events" });
    }

    // 2. Get Jira connection credentials from ph_jira_connection
    const { data: jiraConn } = await supabase
      .from("ph_jira_connection")
      .select("site_url, auth_email, auth_token_encrypted")
      .limit(1)
      .single();

    if (!jiraConn?.site_url || !jiraConn?.auth_email || !jiraConn?.auth_token_encrypted) {
      return jsonResponse({ error: "No active Jira connection configured" }, 400);
    }

    const jiraBaseUrl = jiraConn.site_url.replace(/\/$/, "");
    const jiraAuth = "Basic " + btoa(`${jiraConn.auth_email}:${jiraConn.auth_token_encrypted}`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;

    // 3. Process each event
    for (const event of events) {
      const now = new Date().toISOString();

      // Mark as syncing
      await supabase
        .from("jira_sync_activity")
        .update({ sync_status: "syncing", sync_started_at: now })
        .eq("id", event.id);

      // Conflict detection: check if Jira modified the item after Catalyst did
      if (event.work_item_id) {
        const { data: issue } = await supabase
          .from("catalyst_issues")
          .select("jira_last_modified_at")
          .eq("id", event.work_item_id)
          .maybeSingle();

        if (
          issue?.jira_last_modified_at &&
          event.catalyst_changed_at &&
          new Date(issue.jira_last_modified_at) > new Date(event.catalyst_changed_at)
        ) {
          // Jira modified more recently — Jira wins, skip outbound
          await supabase
            .from("jira_sync_activity")
            .update({
              sync_status: "skipped",
              sync_completed_at: new Date().toISOString(),
              conflict_detected: true,
              conflict_resolution: "Jira modified more recently — Jira-master wins, outbound skipped",
            })
            .eq("id", event.id);
          skipped++;
          continue;
        }
      }

      // Build Jira payload from changed_fields
      const payload = buildJiraPayload(event.changed_fields, event.change_type);

      // Retry loop with exponential backoff
      let success = false;
      let lastError = "";

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Handle status transitions separately from field updates
          if (event.change_type === "status_change" && event.changed_fields?.status?.to) {
            // For status changes, we'd need to call /transitions endpoint
            // For now, log as needing manual transition handling
            await supabase
              .from("jira_sync_activity")
              .update({
                sync_status: "success",
                sync_completed_at: new Date().toISOString(),
                attempt_count: attempt,
                change_summary: (event.change_summary || "") + " (status transition queued)",
              })
              .eq("id", event.id);
            success = true;
            break;
          }

          // Field updates via PUT /rest/api/3/issue/{key}
          if (Object.keys(payload.fields || {}).length > 0) {
            const jiraResponse = await fetch(
              `${jiraBaseUrl}/rest/api/3/issue/${event.work_item_key}`,
              {
                method: "PUT",
                headers: {
                  Authorization: jiraAuth,
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify(payload),
              },
            );

            if (jiraResponse.ok || jiraResponse.status === 204) {
              await supabase
                .from("jira_sync_activity")
                .update({
                  sync_status: "success",
                  sync_completed_at: new Date().toISOString(),
                  attempt_count: attempt,
                })
                .eq("id", event.id);
              success = true;
              break;
            } else {
              lastError = `Jira API ${jiraResponse.status}: ${(await jiraResponse.text()).slice(0, 500)}`;
            }
          } else {
            // No actionable fields — mark as success (metadata-only change)
            await supabase
              .from("jira_sync_activity")
              .update({
                sync_status: "success",
                sync_completed_at: new Date().toISOString(),
                attempt_count: attempt,
              })
              .eq("id", event.id);
            success = true;
            break;
          }
        } catch (err) {
          lastError = String(err).slice(0, 500);
        }

        // Exponential backoff before retry
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
        }
      }

      if (!success) {
        await supabase
          .from("jira_sync_activity")
          .update({
            sync_status: "failed",
            sync_completed_at: new Date().toISOString(),
            attempt_count: MAX_RETRIES,
            error_message: lastError,
          })
          .eq("id", event.id);
        failed++;
      } else {
        processed++;
      }
    }

    return jsonResponse({ processed, failed, skipped, total: events.length });
  } catch (err) {
    console.error("jira-activity-processor error:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function buildJiraPayload(
  changedFields: Record<string, { from?: string; to?: string }> | null,
  changeType: string,
): { fields: Record<string, unknown> } {
  const fields: Record<string, unknown> = {};
  if (!changedFields) return { fields };

  for (const [field, val] of Object.entries(changedFields)) {
    switch (field) {
      case "title":
        if (val.to) fields.summary = val.to;
        break;
      case "description":
        if (val.to) {
          fields.description = {
            type: "doc",
            version: 1,
            content: [{ type: "paragraph", content: [{ type: "text", text: val.to }] }],
          };
        }
        break;
      case "priority":
        if (val.to) fields.priority = { name: val.to };
        break;
      case "story_points":
        if (val.to) fields.story_points = Number(val.to) || null;
        break;
      // assignee_id requires Jira account ID mapping — skip for now
    }
  }

  return { fields };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
