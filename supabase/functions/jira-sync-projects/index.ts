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
    // Parse request body for selective sync
    let projectKeys: string[] | null = null;
    let syncMode: string = '3months';
    try {
      const body = await req.json();
      projectKeys = body?.projectKeys ?? null;
      syncMode = body?.syncMode ?? '3months';
    } catch (_e) {
      // No body = sync all
    }

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
      // Direct query fallback - paginate to get ALL issues (bypass 1000 row limit)
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: issues } = await supabase
          .from("ph_issues")
          .select("project_key, status_category, hierarchy_level")
          .range(offset, offset + batchSize - 1);

        if (!issues || issues.length === 0) {
          hasMore = false;
          break;
        }

        for (const issue of issues) {
          if (!countMap[issue.project_key]) {
            countMap[issue.project_key] = { total: 0, todo: 0, in_progress: 0, done: 0, epics: 0, stories: 0, tasks: 0 };
          }
          const c = countMap[issue.project_key];
          c.total++;
          if (issue.status_category === 'To Do' || issue.status_category === 'new') c.todo++;
          else if (issue.status_category === 'In Progress' || issue.status_category === 'indeterminate') c.in_progress++;
          else if (issue.status_category === 'Done' || issue.status_category === 'done') c.done++;
          
          if (issue.hierarchy_level >= 3) c.epics++;
          else if (issue.hierarchy_level === 2) c.stories++;
          else if (issue.hierarchy_level === 1) c.tasks++;
        }

        offset += batchSize;
        if (issues.length < batchSize) hasMore = false;
      }

      console.log(`[jira-sync-projects] Counted issues for ${Object.keys(countMap).length} projects`);
    }

    // 4. Build project rows
    const defaultProgramId = "00000000-0000-0000-0000-000000000001";
    const colors = ["#2563EB", "#7C3AED", "#0D9488", "#D97706", "#EF4444", "#059669", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];

    // Only include projects that have synced issues (active projects)
    const jiraKeySet = new Set(jiraProjects.map((jp: any) => jp.key));
    const activeJiraProjects = jiraProjects.filter((jp: any) => countMap[jp.key] && countMap[jp.key].total > 0);

    // Also add projects from accessible_projects that have issues but weren't in the REST API response
    const accessibleProjects = conn.accessible_projects || [];
    for (const ap of accessibleProjects) {
      if (!jiraKeySet.has(ap.key) && countMap[ap.key] && countMap[ap.key].total > 0) {
        activeJiraProjects.push({ key: ap.key, name: ap.name, projectTypeKey: ap.type });
      }
    }

    // Filter to selected projects if specified
    if (projectKeys && projectKeys.length > 0) {
      const selectedSet = new Set(projectKeys);
      const filtered = activeJiraProjects.filter((jp: any) => selectedSet.has(jp.key));
      activeJiraProjects.length = 0;
      activeJiraProjects.push(...filtered);
    }

    console.log(`[jira-sync-projects] ${activeJiraProjects.length} active projects (with issues)`);

    const projectRows = activeJiraProjects.map((jp: any, idx: number) => {
      const counts = countMap[jp.key];
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
    
    // Delete project_favorites, project_members, and ph_releases first
    await supabase.from("project_favorites").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("project_members").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("ph_releases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
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

    // 6b. Also upsert into ph_projects (SDLC schema) for dashboard compatibility
    // Get a valid user ID for created_by
    const { data: anyUser } = await supabase.from("profiles").select("id").limit(1).single();
    const systemUserId = anyUser?.id ?? "00000000-0000-0000-0000-000000000000";

    const phProjectRows = activeJiraProjects.map((jp: any, idx: number) => ({
      key: jp.key,
      name: jp.name,
      description: jp.description ?? "",
      department: "Technology",
      status: "active",
      color: colors[idx % colors.length],
      created_by: systemUserId,
    }));

    const { data: phInserted, error: phErr } = await supabase
      .from("ph_projects")
      .upsert(phProjectRows, { onConflict: "key" })
      .select("id, key, name");

    if (phErr) console.error("[jira-sync-projects] ph_projects upsert error:", phErr.message);
    console.log(`[jira-sync-projects] Synced ${phInserted?.length ?? 0} ph_projects`);

    // Build key->id maps for both tables
    const keyToId: Record<string, string> = {};
    const keyToPhId: Record<string, string> = {};
    if (inserted) {
      for (const p of inserted) keyToId[p.key] = p.id;
    }
    if (phInserted) {
      for (const p of phInserted) keyToPhId[p.key] = p.id;
    }

    // 7. Populate project_members from Jira assignees
    if (inserted && inserted.length > 0) {
      console.log("[jira-sync-projects] Resolving Jira assignees to members...");

      // Get unique assignee_account_ids per project from ph_issues (paginated)
      const projectAssignees: Record<string, Set<string>> = {};
      let mOffset = 0;
      let mHasMore = true;
      while (mHasMore) {
        const { data: rows } = await supabase
          .from("ph_issues")
          .select("project_key, assignee_account_id")
          .not("assignee_account_id", "is", null)
          .range(mOffset, mOffset + 999);
        if (!rows || rows.length === 0) { mHasMore = false; break; }
        for (const r of rows) {
          if (!projectAssignees[r.project_key]) projectAssignees[r.project_key] = new Set();
          projectAssignees[r.project_key].add(r.assignee_account_id);
        }
        mOffset += 1000;
        if (rows.length < 1000) mHasMore = false;
      }

      // Get Jira account_id -> profile_id mapping from resource_inventory
      const allJiraIds = new Set<string>();
      for (const s of Object.values(projectAssignees)) {
        for (const id of s) allJiraIds.add(id);
      }

      const jiraIdArr = Array.from(allJiraIds);
      const jiraToProfile: Record<string, string> = {};
      // Batch in groups of 100 for the IN filter
      for (let i = 0; i < jiraIdArr.length; i += 100) {
        const batch = jiraIdArr.slice(i, i + 100);
        const { data: resources } = await supabase
          .from("resource_inventory")
          .select("jira_account_id, profile_id")
          .in("jira_account_id", batch)
          .not("profile_id", "is", null);
        if (resources) {
          for (const r of resources) {
            jiraToProfile[r.jira_account_id] = r.profile_id;
          }
        }
      }

      console.log(`[jira-sync-projects] Mapped ${Object.keys(jiraToProfile).length} Jira accounts to profiles`);

      // Build project_members rows
      const memberRows: { project_id: string; user_id: string; role: string }[] = [];
      for (const [projectKey, assigneeSet] of Object.entries(projectAssignees)) {
        const projectId = keyToId[projectKey];
        if (!projectId) continue;
        for (const jiraId of assigneeSet) {
          const profileId = jiraToProfile[jiraId];
          if (profileId) {
            memberRows.push({ project_id: projectId, user_id: profileId, role: "member" });
          }
        }
      }

      if (memberRows.length > 0) {
        // Insert in batches
        for (let i = 0; i < memberRows.length; i += 500) {
          const batch = memberRows.slice(i, i + 500);
          const { error: memErr } = await supabase.from("project_members").insert(batch);
          if (memErr) console.warn("[jira-sync-projects] Member insert warning:", memErr.message);
        }
        console.log(`[jira-sync-projects] Inserted ${memberRows.length} project members from Jira`);
      }

      // 8. Sync releases from Jira fix_versions in ph_issues
      console.log("[jira-sync-projects] Syncing releases from Jira fix versions...");
      const releaseMap: Record<string, { projectKey: string; name: string; releaseDate: string | null }> = {};
      let rOffset = 0;
      let rHasMore = true;
      while (rHasMore) {
        const { data: rows } = await supabase
          .from("ph_issues")
          .select("project_key, fix_versions")
          .not("fix_versions", "is", null)
          .range(rOffset, rOffset + 999);
        if (!rows || rows.length === 0) { rHasMore = false; break; }
        for (const r of rows) {
          const fvs = r.fix_versions as any[];
          if (!fvs || !Array.isArray(fvs)) continue;
          for (const fv of fvs) {
            if (!fv.name) continue;
            const mapKey = `${r.project_key}::${fv.name}`;
            if (!releaseMap[mapKey]) {
              releaseMap[mapKey] = { projectKey: r.project_key, name: fv.name, releaseDate: fv.releaseDate || null };
            }
          }
        }
        rOffset += 1000;
        if (rows.length < 1000) rHasMore = false;
      }

      // Delete existing releases before re-inserting
      for (const phId of Object.values(keyToPhId)) {
        await supabase.from("ph_releases").delete().eq("project_id", phId);
      }

      const releaseRows: any[] = [];
      const today = new Date().toISOString().slice(0, 10);
      for (const [, rel] of Object.entries(releaseMap)) {
        const projectId = keyToPhId[rel.projectKey];
        if (!projectId) continue;
        const status = rel.releaseDate
          ? (rel.releaseDate < today ? "released" : "in_progress")
          : "planning";
        releaseRows.push({
          project_id: projectId,
          name: rel.name,
          title: rel.name,
          status,
          target_date: rel.releaseDate || today,
          release_date: rel.releaseDate && rel.releaseDate < today ? rel.releaseDate : null,
        });
      }

      if (releaseRows.length > 0) {
        for (let i = 0; i < releaseRows.length; i += 200) {
          const batch = releaseRows.slice(i, i + 200);
          const { error: relErr } = await supabase.from("ph_releases").insert(batch);
          if (relErr) console.warn("[jira-sync-projects] Release insert warning:", relErr.message);
        }
        console.log(`[jira-sync-projects] Inserted ${releaseRows.length} releases from Jira fix versions`);
      }

      // 9. Sync ph_issues → ph_work_items
      console.log("[jira-sync-projects] Syncing ph_issues → ph_work_items...");

      // Build release name→id lookup per project
      const { data: allReleases } = await supabase
        .from("ph_releases")
        .select("id, name, project_id");
      const releaseNameToId: Record<string, string> = {};
      for (const r of allReleases ?? []) {
        releaseNameToId[`${r.project_id}::${r.name}`] = r.id;
      }

      // Normalize Jira status to dashboard-friendly status
      function normalizeStatus(jiraStatus: string): string {
        const s = jiraStatus.toLowerCase().trim();
        if (['backlog', 'new'].includes(s)) return 'backlog';
        if (['to do', 'todo', 'selected for development', 'ready for development', 'figma design', 'ready for entity', 'entity input', 'brd backlog', 'brd preparation', 'brd under review', 'req submitted', 'in requirements'].includes(s)) return 'to_do';
        if (['in progress', 'in-progress', 'in development', 'under implementation', 'in design', 'brd sign off', 'implementation review', 'technical validation', 'in rfp'].includes(s)) return 'in_progress';
        if (['in qa', 'internal qa', 'staging/qa', 'ready for qa', 'end to end testing', 'retest', 'qa fail'].includes(s)) return 'in_qa';
        if (['in uat', 'uat ready'].includes(s)) return 'in_uat';
        if (['in beta', 'beta ready'].includes(s)) return 'in_beta';
        if (['production ready', 'ready for production'].includes(s)) return 'production_ready';
        if (['in production', 'done', 'closed', 'resolved'].includes(s)) return 'in_production';
        if (['on hold', 'blocked', 'awaiting info'].includes(s)) return 'on_hold';
        if (['canceled', 'rejected'].includes(s)) return 'Cancelled';
        return s; // fallback
      }

      // Normalize Jira issue type
      function normalizeType(jiraType: string): string {
        const t = jiraType.toLowerCase().trim();
        if (t === 'epic') return 'Epic';
        if (['story', 'business request', 'change request', 'business gap'].includes(t)) return 'Story';
        if (['bug', 'qa bug', 'defect'].includes(t)) return 'Bug';
        if (['sub-task', 'subtask'].includes(t)) return 'Subtask';
        if (['feature', 'frontend', 'backend', 'integration', 'api requirement', 'brd task', 'entity figma', 'figma'].includes(t)) return 'Feature';
        if (t === 'production incident') return 'Incident';
        return 'Task'; // default fallback
      }

      // Normalize priority
      function normalizePriority(jiraPrio: string): string {
        const p = jiraPrio?.toLowerCase()?.trim() ?? 'medium';
        if (p === 'highest') return 'critical';
        if (p === 'high') return 'high';
        if (p === 'medium') return 'medium';
        return 'low'; // low, lowest
      }

      // Process issues in pages
      let wiOffset = 0;
      let wiHasMore = true;
      let totalSynced = 0;
      // First pass: collect all issues and build parent_key→id map
      const allIssueRows: any[] = [];
      const issueKeyToId: Record<string, string> = {};

      while (wiHasMore) {
        const { data: issues } = await supabase
          .from("ph_issues")
          .select("issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_account_id, parent_key, fix_versions, due_date, jira_created_at, jira_updated_at, labels")
          .range(wiOffset, wiOffset + 999);
        if (!issues || issues.length === 0) { wiHasMore = false; break; }

        for (const issue of issues) {
          const phProjectId = keyToPhId[issue.project_key];
          if (!phProjectId) continue;

          // Resolve release_id from first fix_version
          let releaseId: string | null = null;
          const fvs = issue.fix_versions as any[];
          if (fvs && Array.isArray(fvs) && fvs.length > 0 && fvs[0].name) {
            releaseId = releaseNameToId[`${phProjectId}::${fvs[0].name}`] ?? null;
          }

          // Resolve assignee
          const assigneeId = issue.assignee_account_id ? (jiraToProfile[issue.assignee_account_id] ?? null) : null;

          // Generate deterministic UUID from issue_key for stable IDs
          const id = crypto.randomUUID();
          issueKeyToId[issue.issue_key] = id;

          const labels = issue.labels as any[];
          
          allIssueRows.push({
            id,
            jira_issue_id: issue.issue_key,
            item_key: issue.issue_key,
            item_type: normalizeType(issue.issue_type),
            title: issue.summary,
            summary: issue.summary,
            status: normalizeStatus(issue.status),
            priority: normalizePriority(issue.priority),
            jira_status: issue.status,
            jira_priority: issue.priority,
            project_id: phProjectId,
            release_id: releaseId,
            assignee_id: assigneeId,
            assignee_user_id: assigneeId,
            due_date: issue.due_date ?? null,
            parent_key: issue.parent_key,
            sync_source: 'jira',
            is_jira_locked: true,
            last_synced_at: new Date().toISOString(),
            created_at: issue.jira_created_at ?? new Date().toISOString(),
            updated_at: issue.jira_updated_at ?? new Date().toISOString(),
            labels: Array.isArray(labels) ? labels.map((l: any) => typeof l === 'string' ? l : l?.name ?? '') : [],
          });
        }
        wiOffset += 1000;
        if (issues.length < 1000) wiHasMore = false;
      }

      // Build parent_key→id map but don't set parent_id yet (FK constraint)
      const parentUpdates: { id: string; parent_id: string }[] = [];
      for (const row of allIssueRows) {
        if (row.parent_key && issueKeyToId[row.parent_key]) {
          parentUpdates.push({ id: row.id, parent_id: issueKeyToId[row.parent_key] });
        }
        delete row.parent_key; // not a column
      }

      // Delete existing work items for these projects and insert fresh
      for (const phId of Object.values(keyToPhId)) {
        await supabase.from("ph_work_items").delete().eq("project_id", phId);
      }

      // Insert in batches WITHOUT parent_id
      for (let i = 0; i < allIssueRows.length; i += 500) {
        const batch = allIssueRows.slice(i, i + 500);
        const { error: wiErr } = await supabase.from("ph_work_items").insert(batch);
        if (wiErr) {
          console.warn(`[jira-sync-projects] Work item insert batch ${i} error:`, wiErr.message);
        } else {
          totalSynced += batch.length;
        }
      }

      // Now update parent_id references
      if (parentUpdates.length > 0) {
        let parentUpdated = 0;
        for (let i = 0; i < parentUpdates.length; i += 200) {
          const batch = parentUpdates.slice(i, i + 200);
          for (const pu of batch) {
            const { error: puErr } = await supabase.from("ph_work_items").update({ parent_id: pu.parent_id }).eq("id", pu.id);
            if (!puErr) parentUpdated++;
          }
        }
        console.log(`[jira-sync-projects] Updated ${parentUpdated} parent references`);
      }

      console.log(`[jira-sync-projects] Synced ${totalSynced} work items to ph_work_items`);
    }

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
