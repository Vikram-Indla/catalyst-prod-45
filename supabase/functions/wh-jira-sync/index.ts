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

/** Map Jira status category key to Catalyst status_category */
function mapStatusCategory(catKey: string | undefined): string {
  if (!catKey) return "To Do";
  const k = catKey.toLowerCase();
  if (k === "done") return "Done";
  if (k === "indeterminate" || k === "in progress") return "In Progress";
  return "To Do";
}

/** Determine hierarchy level from issue type */
function hierarchyLevel(issueType: string): number {
  const t = issueType.toLowerCase();
  if (t === "epic") return 1;
  if (t === "story" || t === "task" || t === "bug" || t === "improvement" || t === "new feature") return 2;
  if (t === "sub-task" || t === "subtask") return 3;
  return 2;
}

// ─── Full Sync Logic ──────────────────────────────────────────────────────────

interface JiraFetchResult {
  issues: any[];
  total: number;
}

async function jiraSearchPaginated(
  siteUrl: string,
  authEmail: string,
  authToken: string,
  jql: string,
  fields: string,
  maxResults = 100
): Promise<JiraFetchResult> {
  const allIssues: any[] = [];
  let startAt = 0;
  let total = 0;

  while (true) {
    const url = `${siteUrl}rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}&expand=changelog`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`${authEmail}:${authToken}`)}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Jira API ${resp.status}: ${errText.substring(0, 500)}`);
    }

    const data = await resp.json();
    total = data.total || 0;
    const issues = data.issues || [];
    allIssues.push(...issues);

    if (allIssues.length >= total || issues.length === 0) break;
    startAt += issues.length;
  }

  return { issues: allIssues, total };
}

async function jiraFetchVersions(
  siteUrl: string,
  authEmail: string,
  authToken: string,
  projectKey: string
): Promise<any[]> {
  const url = `${siteUrl}rest/api/3/project/${projectKey}/versions`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(`${authEmail}:${authToken}`)}`,
      Accept: "application/json",
    },
  });
  if (!resp.ok) return [];
  return await resp.json();
}

async function handleFullSync(
  supabase: any,
  body: any
): Promise<Response> {
  const startTime = Date.now();
  const syncLogId = crypto.randomUUID();
  const warnings: string[] = [];

  const projects: string[] = body.projects || [];
  const projectConfigs: Record<string, any> = body.project_configs || {};
  const globalLookback = body.lookback_months || 3;

  // Get connection credentials
  const { data: conn, error: connErr } = await supabase
    .from("ph_jira_connection")
    .select("site_url, auth_email, auth_token_encrypted")
    .single();

  if (connErr || !conn) {
    return new Response(
      JSON.stringify({ status: "error", reason: "No Jira connection configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const siteUrl = conn.site_url.endsWith("/") ? conn.site_url : conn.site_url + "/";
  const authEmail = conn.auth_email;
  const authToken = conn.auth_token_encrypted; // stored as plaintext API token

  if (!authEmail || !authToken) {
    return new Response(
      JSON.stringify({ status: "error", reason: "Missing Jira credentials" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert running log entry
  await supabase.from("ph_sync_log").insert({
    id: syncLogId,
    sync_type: "full",
    status: "running",
    lookback_months: globalLookback,
    jql_query: `Per-project JQL (${projects.length} projects)`,
    issues_fetched: 0,
    issues_upserted: 0,
    issues_pruned: 0,
    versions_fetched: 0,
    warnings: [],
    started_at: new Date().toISOString(),
    projects_synced: projects,
  });

  let totalFetched = 0;
  let totalUpserted = 0;
  let totalVersions = 0;
  const projectsCompleted: string[] = [];

  const jiraFields = [
    "summary", "status", "assignee", "reporter", "priority", "issuetype",
    "project", "parent", "fixVersions", "duedate", "labels", "components",
    "resolution", "created", "updated", "description", "comment",
    "customfield_10016" // story points
  ].join(",");

  for (const projectKey of projects) {
    try {
      const cfg = projectConfigs[projectKey] || {};
      const lookback = cfg.lookback_months || globalLookback;

      // Build JQL — enforce 2026 boundary
      const year2026 = "2026-01-01";
      const lookbackDate = new Date();
      lookbackDate.setMonth(lookbackDate.getMonth() - lookback);
      const dateStr = lookbackDate.toISOString().split("T")[0];
      const effectiveDate = dateStr > year2026 ? dateStr : year2026;

      let jql = `project = "${projectKey}" AND (created >= "${effectiveDate}" OR updated >= "${effectiveDate}")`;
      if (cfg.issue_types?.length) {
        jql += ` AND issuetype IN (${cfg.issue_types.map((t: string) => `"${t}"`).join(",")})`;
      }
      if (cfg.fix_versions?.length) {
        jql += ` AND fixVersion IN (${cfg.fix_versions.map((v: string) => `"${v}"`).join(",")})`;
      }
      if (cfg.status_categories?.length) {
        jql += ` AND statusCategory IN (${cfg.status_categories.map((s: string) => `"${s}"`).join(",")})`;
      }
      jql += " ORDER BY updated DESC";

      // Fetch project name
      let projectName = projectKey;
      try {
        const projResp = await fetch(`${siteUrl}rest/api/3/project/${projectKey}`, {
          headers: {
            Authorization: `Basic ${btoa(`${authEmail}:${authToken}`)}`,
            Accept: "application/json",
          },
        });
        if (projResp.ok) {
          const projData = await projResp.json();
          projectName = projData.name || projectKey;
        }
      } catch { /* ignore */ }

      // Fetch issues
      const { issues } = await jiraSearchPaginated(siteUrl, authEmail, authToken, jql, jiraFields);
      totalFetched += issues.length;

      // Collect unique assignee account IDs for unmapped user warnings
      const assigneeIds = new Set<string>();

      // Upsert issues into ph_issues
      for (const issue of issues) {
        const f = issue.fields || {};
        const statusCat = f.status?.statusCategory?.key;
        const descText = typeof f.description === "object" ? adfToPlainText(f.description) : (f.description || "");

        if (f.assignee?.accountId) assigneeIds.add(f.assignee.accountId);
        if (f.reporter?.accountId) assigneeIds.add(f.reporter.accountId);

        const row: Record<string, any> = {
          issue_key: issue.key,
          project_key: projectKey,
          project_name: projectName,
          issue_type: f.issuetype?.name || "Unknown",
          summary: f.summary || "",
          status: f.status?.name || "Unknown",
          status_category: mapStatusCategory(statusCat),
          assignee_account_id: f.assignee?.accountId || null,
          assignee_display_name: f.assignee?.displayName || null,
          reporter_account_id: f.reporter?.accountId || null,
          reporter_display_name: f.reporter?.displayName || null,
          parent_key: f.parent?.key || null,
          parent_summary: f.parent?.fields?.summary || null,
          hierarchy_level: hierarchyLevel(f.issuetype?.name || ""),
          fix_versions: (f.fixVersions || []).map((v: any) => v.name),
          due_date: f.duedate || null,
          labels: f.labels || [],
          components: (f.components || []).map((c: any) => c.name),
          priority: f.priority?.name || "Medium",
          story_points: f.customfield_10016 || null,
          resolution: f.resolution?.name || null,
          jira_created_at: f.created || null,
          jira_updated_at: f.updated || null,
          synced_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          description_adf: typeof f.description === "object" ? f.description : null,
          description_text: descText || null,
          comments: f.comment?.comments || [],
          changelog: issue.changelog?.histories || [],
          type_icon_url: f.issuetype?.iconUrl || null,
          raw_json: issue,
          source: "jira",
          sync_status: "synced",
          jira_removed_at: null,
          deleted_at: null,
        };

        // Compute effective_due_date
        if (f.duedate) {
          row.effective_due_date = f.duedate;
          row.effective_due_source = "Due Date";
        } else {
          // Check fix versions for release date
          const versionDates = (f.fixVersions || [])
            .filter((v: any) => v.releaseDate)
            .map((v: any) => v.releaseDate)
            .sort();
          if (versionDates.length > 0) {
            row.effective_due_date = versionDates[0];
            row.effective_due_source = "Fix Version";
          } else {
            row.effective_due_date = null;
            row.effective_due_source = "Unscheduled";
          }
        }

        // Compute sprint_name from last sprint in customfield (use label as fallback)
        // Sprint info might be in labels or dedicated field - store what we have
        row.sprint_name = null;

        // Upsert by issue_key
        const { error: upsertErr } = await supabase
          .from("ph_issues")
          .upsert(row, { onConflict: "issue_key" });

        if (upsertErr) {
          console.error(`Upsert failed for ${issue.key}:`, upsertErr.message);
        } else {
          totalUpserted++;
        }
      }

      // Check for unmapped users
      if (assigneeIds.size > 0) {
        const { data: mappedProfiles } = await supabase
          .from("profiles")
          .select("jira_account_id")
          .in("jira_account_id", Array.from(assigneeIds));
        const mappedSet = new Set((mappedProfiles || []).map((p: any) => p.jira_account_id));
        const unmapped = Array.from(assigneeIds).filter((id) => !mappedSet.has(id));
        if (unmapped.length > 0) {
          warnings.push(`${unmapped.length} unmapped Jira users`);
        }
      }

      // Fetch versions
      try {
        const versions = await jiraFetchVersions(siteUrl, authEmail, authToken, projectKey);
        for (const v of versions) {
          const vRow = {
            jira_id: String(v.id),
            name: v.name,
            project_key: projectKey,
            description: v.description || null,
            release_date: v.releaseDate || null,
            parsed_date: v.releaseDate || null,
            start_date: v.startDate || null,
            released: v.released || false,
            archived: v.archived || false,
            synced_at: new Date().toISOString(),
          };
          await supabase.from("ph_versions").upsert(vRow, { onConflict: "jira_id" });
          totalVersions++;
        }
      } catch (vErr) {
        console.error(`Version fetch failed for ${projectKey}:`, vErr);
      }

      projectsCompleted.push(projectKey);
    } catch (projErr: any) {
      console.error(`Sync failed for project ${projectKey}:`, projErr);
      warnings.push(`${projectKey}: ${projErr.message?.substring(0, 200)}`);
    }
  }

  // Update sync log
  const finalStatus = warnings.length > 0 ? "warning" : "success";
  await supabase
    .from("ph_sync_log")
    .update({
      status: finalStatus,
      issues_fetched: totalFetched,
      issues_upserted: totalUpserted,
      versions_fetched: totalVersions,
      warnings,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString(),
      projects_synced: projectsCompleted,
    })
    .eq("id", syncLogId);

  return new Response(
    JSON.stringify({
      status: finalStatus,
      issues_fetched: totalFetched,
      issues_upserted: totalUpserted,
      versions_fetched: totalVersions,
      projects_synced: projectsCompleted,
      warnings,
      duration_ms: Date.now() - startTime,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ─── Webhook Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // ── Route: Full Sync (from admin UI) ──
    if (body.sync_type === "full" || body.sync_type === "incremental") {
      return await handleFullSync(supabase, body);
    }

    // ── Route: Webhook (from Jira) ──
    const startTime = Date.now();
    let connectionId: string | null = null;
    let jiraKey: string | null = null;
    let eventType: string | null = body.webhookEvent || body.issue_event_type_name || null;
    const issue = body.issue;

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

    if (!issue || !eventType) {
      await writeLog("skipped", 0, "Missing issue or webhookEvent");
      return new Response(JSON.stringify({ status: "skipped", reason: "no issue/event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    jiraKey = issue.key;
    const projectKey = issue.fields?.project?.key;

    // Resolve connection via HMAC signature
    const signatureHeader = req.headers.get("x-hub-signature-256") || "";
    const { data: connections, error: connErr } = await supabase
      .from("jira_connections")
      .select("id, webhook_secret")
      .eq("is_active", true);

    if (connErr || !connections?.length) {
      return new Response(JSON.stringify({ error: "No active Jira connections" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let matchedConnection: any = null;
    for (const conn of connections) {
      if (conn.webhook_secret && await verifySignature(rawBody, signatureHeader, conn.webhook_secret)) {
        matchedConnection = conn;
        break;
      }
    }

    if (!matchedConnection) {
      return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    connectionId = matchedConnection.id;

    // Resolve project mapping
    const { data: mapping } = await supabase
      .from("jira_project_mappings")
      .select("catalyst_project_id, sync_enabled")
      .eq("jira_project_key", projectKey)
      .eq("connection_id", connectionId)
      .maybeSingle();

    if (!mapping || !mapping.sync_enabled) {
      await writeLog("skipped", 0, `No active mapping for project ${projectKey}`);
      return new Response(JSON.stringify({ status: "skipped", reason: "no mapping" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const catalystProjectId = mapping.catalyst_project_id;

    // Acquire lock
    const lockKey = jiraKey || connectionId;
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
      await writeLog("skipped", 0, "Lock held by another process");
      return new Response(JSON.stringify({ status: "skipped", reason: "locked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process by event type
    const fields = issue.fields || {};

    if (eventType === "jira:issue_created" || eventType === "jira:issue_updated") {
      let assigneeId: string | null = null;
      if (fields.assignee?.accountId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("jira_account_id", fields.assignee.accountId)
          .maybeSingle();
        assigneeId = profile?.id || null;
      }

      let statusId: string | null = null;
      if (fields.status?.name) {
        const { data: wfStatus } = await supabase
          .from("ph_workflow_statuses")
          .select("id")
          .eq("project_id", catalystProjectId)
          .ilike("name", fields.status.name)
          .maybeSingle();
        statusId = wfStatus?.id || null;
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

      if (statusId) upsertData.status_id = statusId;

      const { data: existing } = await supabase
        .from("ph_work_items")
        .select("id")
        .eq("jira_key", jiraKey)
        .eq("project_id", catalystProjectId)
        .maybeSingle();

      if (existing) {
        await supabase.from("ph_work_items").update(upsertData).eq("id", existing.id);
      } else {
        const { data: seqResult } = await supabase
          .from("ph_work_items")
          .select("sequence_num")
          .eq("project_id", catalystProjectId)
          .order("sequence_num", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSeq = (seqResult?.sequence_num || 0) + 1;

        const { data: project } = await supabase
          .from("ph_projects")
          .select("project_key")
          .eq("id", catalystProjectId)
          .maybeSingle();

        const prefix = project?.project_key || "WI";

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
      const { data: existing } = await supabase
        .from("ph_work_items")
        .select("*")
        .eq("jira_key", jiraKey)
        .maybeSingle();

      if (existing) {
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

        await supabase.from("ph_work_items").delete().eq("id", existing.id);
        await writeLog("success", 1);
      } else {
        await writeLog("skipped", 0, `No item found for jira_key ${jiraKey}`);
      }
    } else {
      await writeLog("skipped", 0, `Unhandled event type: ${eventType}`);
    }

    await releaseLock();

    return new Response(
      JSON.stringify({ status: "ok", event: eventType, key: jiraKey }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("wh-jira-sync error:", e);
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
