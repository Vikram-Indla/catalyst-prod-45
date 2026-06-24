import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { versionToReleaseRow, type JiraVersion } from "./transform.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let projectKeys: string[] = ["BAU"];
    try {
      const body = await req.json();
      if (Array.isArray(body?.projectKeys) && body.projectKeys.length > 0) {
        projectKeys = body.projectKeys;
      }
    } catch (_e) { /* no body -> default BAU */ }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Jira connection (same pattern as jira-sync-projects)
    const { data: conn, error: connErr } = await supabase
      .from("ph_jira_connection")
      .select("*")
      .eq("status", "connected")
      .single();
    if (connErr || !conn) throw new Error("No active Jira connection found");

    const siteUrl = conn.site_url.replace(/\/$/, "");
    const auth = btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
    const jiraHeaders = {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // 2. Resolve project_id for each key
    const { data: projects, error: projErr } = await supabase
      .from("ph_projects")
      .select("id, key")
      .in("key", projectKeys);
    if (projErr) throw new Error(`ph_projects lookup failed: ${projErr.message}`);
    const idByKey = new Map<string, string>(
      (projects ?? []).map((p: { id: string; key: string }) => [p.key, p.id]),
    );

    const summary: Record<string, { fetched: number; upserted: number; error?: string }> = {};

    for (const key of projectKeys) {
      const projectId = idByKey.get(key);
      if (!projectId) {
        summary[key] = { fetched: 0, upserted: 0, error: "project not found in ph_projects" };
        continue;
      }

      // 3. Fetch Jira project versions (no date filter — releases are reference data)
      const resp = await fetch(`${siteUrl}/rest/api/3/project/${key}/versions`, { headers: jiraHeaders });
      if (!resp.ok) {
        summary[key] = { fetched: 0, upserted: 0, error: `Jira API ${resp.status}` };
        continue;
      }
      const versions = (await resp.json()) as JiraVersion[];

      if (!Array.isArray(versions) || versions.length === 0) {
        summary[key] = { fetched: 0, upserted: 0 };
        continue;
      }

      // 4. Transform + upsert (idempotent on project_id + jira_version_id)
      const rows = versions.map((v) => versionToReleaseRow(v, projectId));
      const { error: upErr } = await supabase
        .from("ph_releases")
        .upsert(rows, { onConflict: "project_id,jira_version_id" });
      if (upErr) {
        summary[key] = { fetched: versions.length, upserted: 0, error: upErr.message };
        continue;
      }

      // 5. Confirm landed (trigger-chain / RLS silent-failure guard)
      const { count } = await supabase
        .from("ph_releases")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .not("jira_version_id", "is", null);

      summary[key] = { fetched: versions.length, upserted: count ?? 0 };
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
