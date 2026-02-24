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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get the Jira connection
    const { data: conn, error: connErr } = await supabase
      .from("ph_jira_connection")
      .select("*")
      .eq("status", "connected")
      .single();

    if (connErr || !conn) {
      throw new Error("No active Jira connection found");
    }

    const siteUrl = conn.site_url.replace(/\/$/, "");
    const email = conn.auth_email;
    const token = conn.auth_token_encrypted; // stored as plaintext API token

    const auth = btoa(`${email}:${token}`);

    // 2. Fetch all projects from Jira REST API
    console.log("[jira-sync-projects] Fetching projects from Jira...");
    const jiraResp = await fetch(`${siteUrl}/rest/api/3/project?expand=description`, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!jiraResp.ok) {
      const errText = await jiraResp.text();
      console.error("[jira-sync-projects] Jira API error:", errText);
      throw new Error(`Jira API error: ${jiraResp.status} ${jiraResp.statusText}`);
    }

    const jiraProjects = await jiraResp.json();
    console.log(`[jira-sync-projects] Got ${jiraProjects.length} projects from Jira`);

    // 3. Also fetch issue counts per project from ph_issues
    const { data: issueCounts } = await supabase
      .rpc("get_project_issue_counts");

    // Fallback: query directly if RPC doesn't exist
    let countMap: Record<string, { total: number; todo: number; in_progress: number; done: number; epics: number; stories: number; tasks: number }> = {};
    
    if (issueCounts) {
      for (const row of issueCounts) {
        countMap[row.project_key] = row;
      }
    } else {
      // Direct query fallback
      const { data: issues } = await supabase
        .from("ph_issues")
        .select("project_key, status_category, hierarchy_level");

      if (issues) {
        for (const issue of issues) {
          if (!countMap[issue.project_key]) {
            countMap[issue.project_key] = { total: 0, todo: 0, in_progress: 0, done: 0, epics: 0, stories: 0, tasks: 0 };
          }
          const c = countMap[issue.project_key];
          c.total++;
          if (issue.status_category === 'To Do' || issue.status_category === 'new') c.todo++;
          else if (issue.status_category === 'In Progress' || issue.status_category === 'indeterminate') c.in_progress++;
          else if (issue.status_category === 'Done' || issue.status_category === 'done') c.done++;
          
          if (issue.hierarchy_level === 1) c.epics++;
          else if (issue.hierarchy_level === 0) c.stories++;
          else c.tasks++;
        }
      }
    }

    // 4. Build project rows
    const defaultProgramId = "00000000-0000-0000-0000-000000000001";
    const colors = ["#2563EB", "#7C3AED", "#0D9488", "#D97706", "#EF4444", "#059669", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];

    const projectRows = jiraProjects.map((jp: any, idx: number) => {
      const counts = countMap[jp.key] || { total: 0, todo: 0, in_progress: 0, done: 0, epics: 0, stories: 0, tasks: 0 };
      const completion = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
      
      return {
        name: jp.name,
        key: jp.key,
        description: jp.description ?? null,
        program_id: defaultProgramId,
        status: "active",
        status_category: counts.in_progress > 0 ? "in_progress" : counts.done > counts.todo ? "done" : "todo",
        health_status: "on_track",
        project_type: jp.projectTypeKey === "business" ? "kanban" : "scrum",
        category: jp.projectTypeKey ?? "software",
        avatar_url: jp.avatarUrls?.["48x48"] ?? null,
        color: colors[idx % colors.length],
        total_epics: counts.epics,
        total_stories: counts.stories,
        total_tasks: counts.tasks,
        work_items_todo: counts.todo,
        work_items_in_progress: counts.in_progress,
        work_items_done: counts.done,
        completion_percentage: completion,
      };
    });

    // 5. Delete all existing projects and insert Jira ones
    // First delete dependent records that reference projects
    console.log("[jira-sync-projects] Clearing existing projects...");
    
    // Delete project_favorites and project_members first
    await supabase.from("project_favorites").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("project_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Delete all projects except TestHub default
    const { error: delErr } = await supabase
      .from("projects")
      .delete()
      .neq("key", "TH-DEFAULT");

    if (delErr) {
      console.error("[jira-sync-projects] Delete error:", delErr);
      // Continue anyway - might be FK constraints
    }

    // 6. Insert new projects
    console.log(`[jira-sync-projects] Inserting ${projectRows.length} Jira projects...`);
    const { data: inserted, error: insertErr } = await supabase
      .from("projects")
      .upsert(projectRows, { onConflict: "key" })
      .select("id, key, name");

    if (insertErr) {
      console.error("[jira-sync-projects] Insert error:", insertErr);
      throw new Error(`Failed to insert projects: ${insertErr.message}`);
    }

    console.log(`[jira-sync-projects] Successfully synced ${inserted?.length ?? 0} projects`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: inserted?.length ?? 0,
        projects: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[jira-sync-projects] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
