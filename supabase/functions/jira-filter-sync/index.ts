/**
 * jira-filter-sync — pulls the Jira filter directory into ph_saved_filters.
 *
 * Paginates /rest/api/3/filter/search (expand owner,jql,description,
 * sharePermissions,editPermissions) and upserts on jira_filter_id.
 * Share/edit permission structures are stored verbatim so the Filters
 * directory renders them exactly as Jira does (Private / My organization /
 * project, All roles / group / users).
 *
 * Credentials: ph_jira_connection (same pattern as jira-attachment-proxy).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: conn } = await supabase
      .from("ph_jira_connection")
      .select("site_url, auth_email, auth_token_encrypted")
      .eq("status", "connected")
      .limit(1)
      .single();
    if (!conn) {
      return new Response(JSON.stringify({ ok: false, reason: "no jira connection" }), { status: 200 });
    }
    const authHeader = "Basic " + btoa(`${conn.auth_email}:${conn.auth_token_encrypted}`);
    const base = (conn.site_url as string).replace(/\/$/, "");

    let startAt = 0;
    let isLast = false;
    let synced = 0;
    const errors: string[] = [];

    while (!isLast) {
      const res = await fetch(
        `${base}/rest/api/3/filter/search?expand=owner,jql,description,sharePermissions,editPermissions&maxResults=50&startAt=${startAt}`,
        { headers: { Authorization: authHeader, Accept: "application/json" } },
      );
      if (!res.ok) {
        return new Response(JSON.stringify({ ok: false, status: res.status, synced }), { status: 200 });
      }
      const page = await res.json();
      isLast = page.isLast ?? true;
      startAt += page.values.length;

      for (const f of page.values) {
        const share = f.sharePermissions ?? [];
        const { error } = await supabase
          .from("ph_saved_filters")
          .upsert({
            jira_filter_id: f.id,
            name: f.name,
            description: f.description ?? null,
            jql_query: f.jql ?? null,
            filter_config: { jql_query: f.jql ?? null, source: "jira" },
            page: "filters",
            hub_scope: "project",
            is_shared: share.length > 0,
            jira_owner_name: f.owner?.displayName ?? null,
            jira_owner_account_id: f.owner?.accountId ?? null,
            share_permissions: share,
            edit_permissions: f.editPermissions ?? [],
          }, { onConflict: "jira_filter_id" });
        if (error) errors.push(`${f.id}: ${error.message}`);
        else synced++;
      }
      if (page.values.length === 0) break;
    }

    return new Response(JSON.stringify({ ok: true, synced, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 200 });
  }
});
