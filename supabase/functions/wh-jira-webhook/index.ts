import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

/** Convert Atlassian Document Format (ADF) to plain text */
function adfToPlainText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (node.type === "text") return node.text || "";
  if (Array.isArray(node.content)) {
    return node.content.map(adfToPlainText).join(
      node.type === "paragraph" || node.type === "heading" ? "\n" : ""
    );
  }
  return "";
}

/** HMAC-SHA256 signature verification */
async function verifySignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  const signature = signatureHeader.replace("sha256=", "");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Map Jira priority name to Catalyst priority */
function mapPriority(jiraPriority: string | undefined): string {
  if (!jiraPriority) return "medium";
  const lower = jiraPriority.toLowerCase();
  if (lower === "highest" || lower === "blocker") return "critical";
  if (lower === "high" || lower === "major") return "high";
  if (lower === "low" || lower === "minor") return "low";
  if (lower === "lowest" || lower === "trivial") return "low";
  return "medium";
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

  let connectionId: string | null = null;
  let jiraKey: string | null = null;
  let eventType: string | null = null;

  async function writeLog(
    status: "success" | "error" | "skipped",
    itemsProcessed: number,
    errorMessage?: string
  ) {
    try {
      await supabase.from("jira_sync_logs").insert({
        connection_id: connectionId,
        sync_type: "webhook",
        event_type: eventType || "unknown",
        jira_key: jiraKey,
        status,
        items_created: status === "success" && eventType === "jira:issue_created" ? itemsProcessed : 0,
        items_updated: status === "success" && eventType === "jira:issue_updated" ? itemsProcessed : 0,
        items_deleted: status === "success" && eventType === "jira:issue_deleted" ? itemsProcessed : 0,
        items_failed: status === "error" ? 1 : 0,
        error_message: errorMessage || null,
        sync_duration_ms: Date.now() - startTime,
      });
    } catch (logErr) {
      console.error("Failed to write sync log:", logErr);
    }
  }

  async function releaseLock() {
    if (!connectionId) return;
    try {
      await supabase
        .from("jira_sync_lock")
        .delete()
        .eq("jira_issue_key", jiraKey || connectionId);
    } catch (e) {
      console.error("Failed to release lock:", e);
    }
  }

  try {
    // 1. Parse body
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    eventType = body.webhookEvent || body.issue_event_type_name || null;
    const issue = body.issue;

    if (!issue || !eventType) {
      await writeLog("skipped", 0, "Missing issue or webhookEvent");
      return new Response(JSON.stringify({ status: "skipped", reason: "no issue/event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    jiraKey = issue.key;
    const projectKey = issue.fields?.project?.key;

    // 2. Resolve connection — try jira_connections first, fall back to ph_jira_connection
    const signatureHeader = req.headers.get("x-hub-signature-256") || "";
    let matchedConnection: any = null;
    let useLegacyConnection = false;

    // Try System A: jira_connections (HMAC-verified)
    const { data: connections } = await supabase
      .from("jira_connections")
      .select("id, webhook_secret")
      .eq("is_active", true);

    if (connections?.length) {
      for (const conn of connections) {
        if (conn.webhook_secret && await verifySignature(rawBody, signatureHeader, conn.webhook_secret)) {
          matchedConnection = conn;
          break;
        }
      }
    }

    // Fallback: ph_jira_connection (the authoritative singleton)
    if (!matchedConnection) {
      const { data: phConn } = await supabase
        .from("ph_jira_connection")
        .select("id, site_url")
        .eq("status", "connected")
        .single();

      if (phConn) {
        // Verify the webhook comes from the expected Jira instance
        const siteHost = new URL(phConn.site_url).hostname;
        // Accept if the issue's self URL matches or if we have a custom header
        const customSecret = req.headers.get("x-jira-webhook-secret") || "";
        const envSecret = Deno.env.get("JIRA_WEBHOOK_SECRET") || "";
        if ((envSecret && customSecret === envSecret) || signatureHeader) {
          matchedConnection = { id: phConn.id, _legacy: true };
          useLegacyConnection = true;
        }
      }
    }

    if (!matchedConnection) {
      return new Response(JSON.stringify({ error: "No active Jira connection or invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    connectionId = matchedConnection.id;

    // 3. Resolve project mapping — try jira_project_mappings, fall back to ph_jira_projects
    let catalystProjectId: string | null = null;

    if (!useLegacyConnection) {
      const { data: mapping } = await supabase
        .from("jira_project_mappings")
        .select("catalyst_project_id, sync_enabled")
        .eq("jira_project_key", projectKey)
        .eq("connection_id", connectionId)
        .maybeSingle();

      if (mapping?.sync_enabled) {
        catalystProjectId = mapping.catalyst_project_id;
      }
    }

    // Fallback: look up project by key in ph_projects
    if (!catalystProjectId) {
      const { data: phProject } = await supabase
        .from("ph_projects")
        .select("id")
        .eq("key", projectKey)
        .maybeSingle();
      catalystProjectId = phProject?.id || null;
    }

    // Also try the projects table
    if (!catalystProjectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("key", projectKey)
        .maybeSingle();
      catalystProjectId = project?.id || null;
    }

    if (!catalystProjectId) {
      await writeLog("skipped", 0, `No project found for key ${projectKey}`);
      return new Response(JSON.stringify({ status: "skipped", reason: "no project mapping" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Acquire lock
    const lockKey = jiraKey || connectionId;
    // Force-release stale locks (>5 min)
    await supabase
      .from("jira_sync_lock")
      .delete()
      .eq("jira_issue_key", lockKey)
      .lt("unlock_after", new Date().toISOString());

    const { error: lockErr } = await supabase
      .from("jira_sync_lock")
      .insert({
        jira_issue_key: lockKey,
        locked_at: new Date().toISOString(),
        unlock_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

    if (lockErr) {
      // Lock exists and is fresh → skip
      await writeLog("skipped", 0, "Lock held by another process");
      return new Response(JSON.stringify({ status: "skipped", reason: "locked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. GOVERNANCE LOCK CHECK — skip processing for governance-closed items
    const { data: govLock } = await supabase
      .from('governance_closure_log')
      .select('id')
      .eq('item_key', jiraKey)
      .is('restored_at', null)
      .limit(1)
      .maybeSingle();

    if (govLock) {
      console.log(`[governance] Skipping webhook for locked item ${jiraKey}`);
      await writeLog("skipped", 0, `Governance-locked: ${jiraKey}`);
      await releaseLock();
      return new Response(
        JSON.stringify({ status: "skipped", reason: "governance_locked", key: jiraKey }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Process by event type
    const fields = issue.fields || {};

    if (eventType === "jira:issue_created" || eventType === "jira:issue_updated") {
      // Resolve assignee
      let assigneeId: string | null = null;
      if (fields.assignee?.accountId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("jira_account_id", fields.assignee.accountId)
          .maybeSingle();
        assigneeId = profile?.id || null;
      }

      // Resolve status mapping
      let statusId: string | null = null;
      if (fields.status?.name) {
        const { data: cached } = await supabase
          .from("jira_transitions_cache")
          .select("to_status")
          .eq("jira_project_key", projectKey)
          .eq("to_status", fields.status.name)
          .maybeSingle();

        if (cached) {
          // Try to find matching workflow status in the project
          const { data: wfStatus } = await supabase
            .from("ph_workflow_statuses")
            .select("id")
            .eq("project_id", catalystProjectId)
            .ilike("name", fields.status.name)
            .maybeSingle();
          statusId = wfStatus?.id || null;
        }
      }

      const description = typeof fields.description === "object"
        ? adfToPlainText(fields.description)
        : fields.description || "";

      const upsertData: Record<string, any> = {
        jira_key: jiraKey,
        title: fields.summary || `Jira ${jiraKey}`,
        description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] },
        priority: mapPriority(fields.priority?.name),
        assignee_id: assigneeId,
        project_id: catalystProjectId,
        jira_sync_status: "synced",
        jira_pushed_at: new Date().toISOString(),
        sync_source: "jira",
        updated_at: new Date().toISOString(),
      };

      if (statusId) {
        upsertData.status_id = statusId;
      }

      // Check if item exists
      const { data: existing } = await supabase
        .from("ph_work_items")
        .select("id")
        .eq("jira_key", jiraKey)
        .eq("project_id", catalystProjectId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("ph_work_items")
          .update(upsertData)
          .eq("id", existing.id);
      } else {
        // For new items, generate item_key and sequence
        const { data: seqResult } = await supabase
          .from("ph_work_items")
          .select("sequence_num")
          .eq("project_id", catalystProjectId)
          .order("sequence_num", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSeq = (seqResult?.sequence_num || 0) + 1;

        // Get project key prefix
        const { data: project } = await supabase
          .from("ph_projects")
          .select("project_key")
          .eq("id", catalystProjectId)
          .maybeSingle();

        const prefix = project?.project_key || "WI";

        // Get default work type and status for the project
        const { data: defaultType } = await supabase
          .from("ph_work_types")
          .select("id")
          .eq("project_id", catalystProjectId)
          .eq("is_enabled", true)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!statusId) {
          const { data: defaultStatus } = await supabase
            .from("ph_workflow_statuses")
            .select("id")
            .eq("project_id", catalystProjectId)
            .eq("is_default", true)
            .maybeSingle();
          statusId = defaultStatus?.id || null;
        }

        await supabase.from("ph_work_items").insert({
          ...upsertData,
          item_key: `${prefix}-${nextSeq}`,
          sequence_num: nextSeq,
          type_id: defaultType?.id,
          status_id: statusId,
          sort_order: nextSeq,
        });
      }

      await writeLog("success", 1);
    } else if (eventType === "jira:issue_deleted") {
      // Fetch item before deletion for snapshot
      const { data: existing } = await supabase
        .from("ph_work_items")
        .select("*")
        .eq("jira_key", jiraKey)
        .maybeSingle();

      if (existing) {
        // Archive to jira_deleted_items
        await supabase.from("jira_deleted_items").insert({
          catalyst_item_id: existing.id,
          catalyst_item_key: existing.item_key,
          jira_key: jiraKey,
          jira_issue_id: issue.id?.toString() || null,
          project_id: catalystProjectId,
          item_type: "work_item",
          item_snapshot: existing,
          deleted_at: new Date().toISOString(),
          is_recoverable: true,
        });

        // Delete from ph_work_items
        await supabase
          .from("ph_work_items")
          .delete()
          .eq("id", existing.id);

        await writeLog("success", 1);
      } else {
        await writeLog("skipped", 0, `No item found for jira_key ${jiraKey}`);
      }
    } else {
      await writeLog("skipped", 0, `Unhandled event type: ${eventType}`);
    }

    // 7. Release lock
    await releaseLock();

    // 8. Return success
    return new Response(
      JSON.stringify({ status: "ok", event: eventType, key: jiraKey }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("wh-jira-sync error:", e);
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    await writeLog("error", 0, errMsg);
    await releaseLock();
    return new Response(
      JSON.stringify({ error: errMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
