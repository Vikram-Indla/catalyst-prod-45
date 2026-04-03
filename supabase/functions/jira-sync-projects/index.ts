import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const syncStartedAt = new Date().toISOString();
  const startMs = Date.now();

  try {
    let projectKeys: string[] | null = null;
    let syncMode: string = 'delta';
    try {
      const body = await req.json();
      projectKeys = body?.projectKeys ?? null;
      syncMode = body?.syncMode ?? 'delta';
    } catch (_e) {}

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get Jira connection
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

    // 2. Fetch all Jira projects
    console.log("[jira-sync] Fetching Jira projects...");
    const jiraResp = await fetch(`${siteUrl}/rest/api/3/project?expand=description`, { headers: jiraHeaders });
    if (!jiraResp.ok) throw new Error(`Jira API error: ${jiraResp.status}`);
    const jiraProjects = await jiraResp.json();

    // 3. Count issues per project from ph_issues (paginated)
    let countMap: Record<string, { total: number; todo: number; in_progress: number; done: number; epics: number; stories: number; tasks: number }> = {};
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data: issues } = await supabase
        .from("ph_issues")
        .select("project_key, status_category, hierarchy_level")
        .is("jira_removed_at", null) // exclude soft-deleted
        .range(offset, offset + 999);
      if (!issues || issues.length === 0) { hasMore = false; break; }
      for (const issue of issues) {
        if (!countMap[issue.project_key]) countMap[issue.project_key] = { total: 0, todo: 0, in_progress: 0, done: 0, epics: 0, stories: 0, tasks: 0 };
        const c = countMap[issue.project_key];
        c.total++;
        if (issue.status_category === 'To Do' || issue.status_category === 'new') c.todo++;
        else if (issue.status_category === 'In Progress' || issue.status_category === 'indeterminate') c.in_progress++;
        else if (issue.status_category === 'Done' || issue.status_category === 'done') c.done++;
        if (issue.hierarchy_level >= 3) c.epics++;
        else if (issue.hierarchy_level === 2) c.stories++;
        else if (issue.hierarchy_level === 1) c.tasks++;
      }
      offset += 1000;
      if (issues.length < 1000) hasMore = false;
    }

    // 4. Filter active projects
    const jiraKeySet = new Set(jiraProjects.map((jp: any) => jp.key));
    const activeJiraProjects = jiraProjects.filter((jp: any) => countMap[jp.key] && countMap[jp.key].total > 0);
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

    console.log(`[jira-sync] ${activeJiraProjects.length} active projects`);

    // 5. UPSERT projects (never delete)
    const defaultProgramId = "00000000-0000-0000-0000-000000000001";
    const colors = ["#2563EB", "#7C3AED", "#0D9488", "#D97706", "#EF4444", "#059669", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4"];

    const projectRows = activeJiraProjects.map((jp: any, idx: number) => {
      const counts = countMap[jp.key] || { total: 0, todo: 0, in_progress: 0, done: 0, epics: 0, stories: 0, tasks: 0 };
      const completion = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
      return {
        name: jp.name, key: jp.key, description: jp.description ?? null,
        program_id: defaultProgramId, status: "active",
        status_category: counts.in_progress > 0 ? "in_progress" : counts.done > counts.todo ? "done" : "todo",
        health_status: "on_track",
        project_type: jp.projectTypeKey === "business" ? "kanban" : "scrum",
        category: jp.projectTypeKey ?? "software",
        avatar_url: jp.avatarUrls?.["48x48"] ?? null,
        color: colors[idx % colors.length],
        total_epics: counts.epics, total_stories: counts.stories, total_tasks: counts.tasks,
        work_items_todo: counts.todo, work_items_in_progress: counts.in_progress, work_items_done: counts.done,
        completion_percentage: completion,
      };
    });

    // UPSERT into projects (append-only — never delete existing)
    const { data: inserted, error: insertErr } = await supabase
      .from("projects")
      .upsert(projectRows, { onConflict: "key" })
      .select("id, key, name");
    if (insertErr) throw new Error(`Failed to upsert projects: ${insertErr.message}`);
    console.log(`[jira-sync] Upserted ${inserted?.length ?? 0} projects`);

    // Also upsert into ph_projects
    const { data: anyUser } = await supabase.from("profiles").select("id").limit(1).single();
    const systemUserId = anyUser?.id ?? "00000000-0000-0000-0000-000000000000";

    const phProjectRows = activeJiraProjects.map((jp: any, idx: number) => ({
      key: jp.key, name: jp.name, description: jp.description ?? "",
      department: "Technology", status: "active",
      color: colors[idx % colors.length], created_by: systemUserId,
    }));

    const { data: phInserted, error: phErr } = await supabase
      .from("ph_projects")
      .upsert(phProjectRows, { onConflict: "key" })
      .select("id, key, name");
    if (phErr) console.error("[jira-sync] ph_projects upsert error:", phErr.message);

    // Build key->id maps
    const keyToId: Record<string, string> = {};
    const keyToPhId: Record<string, string> = {};
    if (inserted) for (const p of inserted) keyToId[p.key] = p.id;
    if (phInserted) for (const p of phInserted) keyToPhId[p.key] = p.id;

    // ═══ GUARDRAIL DELTA SYNC: ph_issues → ph_work_items ═══
    // Instead of DELETE + INSERT, we UPSERT and soft-flag removals

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSoftDeleted = 0;

    // 6. Populate project_members (upsert, not delete + insert)
    if (inserted && inserted.length > 0) {
      console.log("[jira-sync] Resolving Jira assignees to members...");
      const projectAssignees: Record<string, Set<string>> = {};
      let mOffset = 0;
      let mHasMore = true;
      while (mHasMore) {
        const { data: rows } = await supabase
          .from("ph_issues")
          .select("project_key, assignee_account_id")
          .not("assignee_account_id", "is", null)
          .is("jira_removed_at", null)
          .range(mOffset, mOffset + 999);
        if (!rows || rows.length === 0) { mHasMore = false; break; }
        for (const r of rows) {
          if (!projectAssignees[r.project_key]) projectAssignees[r.project_key] = new Set();
          projectAssignees[r.project_key].add(r.assignee_account_id);
        }
        mOffset += 1000;
        if (rows.length < 1000) mHasMore = false;
      }

      const allJiraIds = new Set<string>();
      for (const s of Object.values(projectAssignees)) for (const id of s) allJiraIds.add(id);
      const jiraIdArr = Array.from(allJiraIds);
      const jiraToProfile: Record<string, string> = {};
      for (let i = 0; i < jiraIdArr.length; i += 100) {
        const batch = jiraIdArr.slice(i, i + 100);
        const { data: resources } = await supabase
          .from("resource_inventory")
          .select("jira_account_id, profile_id")
          .in("jira_account_id", batch)
          .not("profile_id", "is", null);
        if (resources) for (const r of resources) jiraToProfile[r.jira_account_id] = r.profile_id;
      }

      const memberRows: { project_id: string; user_id: string; role: string }[] = [];
      for (const [projectKey, assigneeSet] of Object.entries(projectAssignees)) {
        const projectId = keyToId[projectKey];
        if (!projectId) continue;
        for (const jiraId of assigneeSet) {
          const profileId = jiraToProfile[jiraId];
          if (profileId) memberRows.push({ project_id: projectId, user_id: profileId, role: "member" });
        }
      }
      if (memberRows.length > 0) {
        for (let i = 0; i < memberRows.length; i += 500) {
          const batch = memberRows.slice(i, i + 500);
          // Use upsert to avoid duplicates
          await supabase.from("project_members").upsert(batch, { onConflict: "project_id,user_id" });
        }
        console.log(`[jira-sync] Upserted ${memberRows.length} project members`);
      }

      // 7. Sync releases (upsert)
      const releaseMap: Record<string, { projectKey: string; name: string; releaseDate: string | null }> = {};
      let rOffset = 0;
      let rHasMore = true;
      while (rHasMore) {
        const { data: rows } = await supabase
          .from("ph_issues")
          .select("project_key, fix_versions")
          .not("fix_versions", "is", null)
          .is("jira_removed_at", null)
          .range(rOffset, rOffset + 999);
        if (!rows || rows.length === 0) { rHasMore = false; break; }
        for (const r of rows) {
          const fvs = r.fix_versions as any[];
          if (!fvs || !Array.isArray(fvs)) continue;
          for (const fv of fvs) {
            if (!fv.name) continue;
            const mapKey = `${r.project_key}::${fv.name}`;
            if (!releaseMap[mapKey]) releaseMap[mapKey] = { projectKey: r.project_key, name: fv.name, releaseDate: fv.releaseDate || null };
          }
        }
        rOffset += 1000;
        if (rows.length < 1000) rHasMore = false;
      }

      const today = new Date().toISOString().slice(0, 10);
      const releaseRows: any[] = [];
      for (const [, rel] of Object.entries(releaseMap)) {
        const projectId = keyToPhId[rel.projectKey];
        if (!projectId) continue;
        const status = rel.releaseDate ? (rel.releaseDate < today ? "released" : "in_progress") : "planning";
        releaseRows.push({
          project_id: projectId, name: rel.name, title: rel.name, status,
          target_date: rel.releaseDate || today,
          release_date: rel.releaseDate && rel.releaseDate < today ? rel.releaseDate : null,
        });
      }
      if (releaseRows.length > 0) {
        for (let i = 0; i < releaseRows.length; i += 200) {
          const batch = releaseRows.slice(i, i + 200);
          await supabase.from("ph_releases").upsert(batch, { onConflict: "project_id,name" });
        }
        console.log(`[jira-sync] Upserted ${releaseRows.length} releases`);
      }

      // 8. ═══ DELTA SYNC: ph_issues → ph_work_items (APPEND-ONLY) ═══
      console.log("[jira-sync] Delta syncing ph_issues → ph_work_items...");

      // Build release lookup
      const { data: allReleases } = await supabase.from("ph_releases").select("id, name, project_id");
      const releaseNameToId: Record<string, string> = {};
      for (const r of allReleases ?? []) releaseNameToId[`${r.project_id}::${r.name}`] = r.id;

      // Get existing work items keyed by jira_issue_id for delta comparison
      const existingWorkItems: Record<string, { id: string; sync_hash: string | null }> = {};
      let ewOffset = 0;
      let ewHasMore = true;
      while (ewHasMore) {
        const { data: rows } = await supabase
          .from("ph_work_items")
          .select("id, jira_issue_id, sync_hash")
          .not("jira_issue_id", "is", null)
          .range(ewOffset, ewOffset + 999);
        if (!rows || rows.length === 0) { ewHasMore = false; break; }
        for (const r of rows) if (r.jira_issue_id) existingWorkItems[r.jira_issue_id] = { id: r.id, sync_hash: r.sync_hash };
        ewOffset += 1000;
        if (rows.length < 1000) ewHasMore = false;
      }

      // Normalize helpers
      function normalizeStatus(s: string): string {
        const l = s.toLowerCase().trim();
        if (['backlog', 'new'].includes(l)) return 'backlog';
        if (['to do', 'todo', 'selected for development', 'ready for development', 'figma design', 'ready for entity', 'entity input', 'brd backlog', 'brd preparation', 'brd under review', 'req submitted', 'in requirements'].includes(l)) return 'to_do';
        if (['in progress', 'in-progress', 'in development', 'under implementation', 'in design', 'brd sign off', 'implementation review', 'technical validation', 'in rfp'].includes(l)) return 'in_progress';
        if (['in qa', 'internal qa', 'staging/qa', 'ready for qa', 'end to end testing', 'retest', 'qa fail'].includes(l)) return 'in_qa';
        if (['in uat', 'uat ready'].includes(l)) return 'in_uat';
        if (['in beta', 'beta ready'].includes(l)) return 'in_beta';
        if (['production ready', 'ready for production'].includes(l)) return 'production_ready';
        if (['in production', 'done', 'closed', 'resolved'].includes(l)) return 'in_production';
        if (['on hold', 'blocked', 'awaiting info'].includes(l)) return 'on_hold';
        if (['canceled', 'rejected'].includes(l)) return 'Cancelled';
        return l;
      }
      function normalizeType(t: string): string {
        const l = t.toLowerCase().trim();
        if (l === 'epic') return 'Epic';
        if (l === 'story') return 'Story';
        if (['bug', 'qa bug', 'defect'].includes(l)) return 'Bug';
        if (['sub-task', 'subtask'].includes(l)) return 'Subtask';
        if (l === 'production incident') return 'Incident';
        // Preserve Jira integrity: no synthetic "Feature" bucketing
        return 'Task';
      }
      function normalizePriority(p: string): string {
        const l = p?.toLowerCase()?.trim() ?? 'medium';
        if (l === 'highest') return 'critical';
        if (l === 'high') return 'high';
        if (l === 'medium') return 'medium';
        return 'low';
      }

      // Compute a hash for change detection
      function computeHash(issue: any): string {
        return `${issue.issue_type}|${issue.summary}|${issue.status}|${issue.priority}|${issue.assignee_account_id}|${issue.due_date}|${JSON.stringify(issue.labels)}`;
      }

      // Process issues
      const insertRows: any[] = [];
      const updateRows: { id: string; data: any }[] = [];
      const issueKeyToId: Record<string, string> = {};
      const seenIssueKeys = new Set<string>();

      let wiOffset = 0;
      let wiHasMore = true;
      while (wiHasMore) {
        const { data: issues } = await supabase
          .from("ph_issues")
          .select("issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_account_id, parent_key, fix_versions, due_date, jira_created_at, jira_updated_at, labels")
          .is("jira_removed_at", null)
          .range(wiOffset, wiOffset + 999);
        if (!issues || issues.length === 0) { wiHasMore = false; break; }

        for (const issue of issues) {
          const phProjectId = keyToPhId[issue.project_key];
          if (!phProjectId) continue;

          seenIssueKeys.add(issue.issue_key);
          const hash = computeHash(issue);

          let releaseId: string | null = null;
          const fvs = issue.fix_versions as any[];
          if (fvs && Array.isArray(fvs) && fvs.length > 0 && fvs[0].name) {
            releaseId = releaseNameToId[`${phProjectId}::${fvs[0].name}`] ?? null;
          }
          const assigneeId = issue.assignee_account_id ? (jiraToProfile[issue.assignee_account_id] ?? null) : null;
          const labels = issue.labels as any[];

          const existing = existingWorkItems[issue.issue_key];
          if (existing) {
            // DELTA: Only update if hash changed
            if (existing.sync_hash !== hash) {
              updateRows.push({
                id: existing.id,
                data: {
                  item_type: normalizeType(issue.issue_type),
                  title: issue.summary, summary: issue.summary,
                  status: normalizeStatus(issue.status),
                  priority: normalizePriority(issue.priority),
                  jira_status: issue.status, jira_priority: issue.priority,
                  project_id: phProjectId, release_id: releaseId,
                  assignee_id: assigneeId, assignee_user_id: assigneeId,
                  due_date: issue.due_date ?? null,
                  last_synced_at: new Date().toISOString(),
                  updated_at: issue.jira_updated_at ?? new Date().toISOString(),
                  labels: Array.isArray(labels) ? labels.map((l: any) => typeof l === 'string' ? l : l?.name ?? '') : [],
                  sync_hash: hash,
                  jira_removed_at: null, // un-soft-delete if it was previously removed
                },
              });
            }
            issueKeyToId[issue.issue_key] = existing.id;
          } else {
            // NEW: Insert
            const id = crypto.randomUUID();
            issueKeyToId[issue.issue_key] = id;
            insertRows.push({
              id, jira_issue_id: issue.issue_key, item_key: issue.issue_key,
              item_type: normalizeType(issue.issue_type),
              title: issue.summary, summary: issue.summary,
              status: normalizeStatus(issue.status),
              priority: normalizePriority(issue.priority),
              jira_status: issue.status, jira_priority: issue.priority,
              project_id: phProjectId, release_id: releaseId,
              assignee_id: assigneeId, assignee_user_id: assigneeId,
              due_date: issue.due_date ?? null,
              parent_key: issue.parent_key,
              sync_source: 'jira', is_jira_locked: true,
              first_synced_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
              baseline_date: new Date().toISOString().slice(0, 10),
              created_at: issue.jira_created_at ?? new Date().toISOString(),
              updated_at: issue.jira_updated_at ?? new Date().toISOString(),
              labels: Array.isArray(labels) ? labels.map((l: any) => typeof l === 'string' ? l : l?.name ?? '') : [],
              sync_hash: hash,
            });
          }
        }
        wiOffset += 1000;
        if (issues.length < 1000) wiHasMore = false;
      }

      // Soft-delete work items whose issue_key no longer appears in active ph_issues
      // (items removed from Jira get jira_removed_at flagged, NOT physically deleted)
      for (const [jiraKey, existing] of Object.entries(existingWorkItems)) {
        if (!seenIssueKeys.has(jiraKey)) {
          updateRows.push({
            id: existing.id,
            data: { jira_removed_at: new Date().toISOString(), last_synced_at: new Date().toISOString() },
          });
          totalSoftDeleted++;
        }
      }

      // Execute inserts (remove parent_key before insert as it's not a column)
      const cleanInserts = insertRows.map(r => { const { parent_key, ...rest } = r; return rest; });
      for (let i = 0; i < cleanInserts.length; i += 500) {
        const batch = cleanInserts.slice(i, i + 500);
        const { error: wiErr } = await supabase.from("ph_work_items").insert(batch);
        if (wiErr) console.warn(`[jira-sync] Work item insert batch ${i} error:`, wiErr.message);
        else totalCreated += batch.length;
      }

      // Execute updates
      for (const upd of updateRows) {
        const { error: updErr } = await supabase.from("ph_work_items").update(upd.data).eq("id", upd.id);
        if (!updErr) totalUpdated++;
      }

      // Parent linking (second pass)
      const parentUpdates: { id: string; parent_id: string }[] = [];
      for (const row of insertRows) {
        if (row.parent_key && issueKeyToId[row.parent_key]) {
          parentUpdates.push({ id: row.id, parent_id: issueKeyToId[row.parent_key] });
        }
      }
      // Also check existing items for parent resolution
      for (const [jiraKey, existing] of Object.entries(existingWorkItems)) {
        if (issueKeyToId[jiraKey]) issueKeyToId[jiraKey] = existing.id;
      }
      for (const pu of parentUpdates) {
        await supabase.from("ph_work_items").update({ parent_id: pu.parent_id }).eq("id", pu.id);
      }

      console.log(`[jira-sync] Delta sync: ${totalCreated} created, ${totalUpdated} updated, ${totalSoftDeleted} soft-deleted`);
    }

    // 9. Log this sync in ph_jira_sync_log
    const durationMs = Date.now() - startMs;
    const totalBaseline = (await supabase.from("ph_work_items").select("id", { count: "exact", head: true }).is("jira_removed_at", null)).count ?? 0;

    await supabase.from("ph_jira_sync_log").insert({
      sync_type: 'full',
      sync_mode: syncMode,
      status: 'completed',
      items_created: totalCreated,
      items_updated: totalUpdated,
      items_unchanged: 0,
      items_deleted_soft: totalSoftDeleted,
      total_items_in_baseline: totalBaseline,
      baseline_snapshot_date: new Date().toISOString().slice(0, 10),
      project_keys: projectKeys ?? [],
      started_at: syncStartedAt,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      errors: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        synced: inserted?.length ?? 0,
        created: totalCreated,
        updated: totalUpdated,
        softDeleted: totalSoftDeleted,
        baselineTotal: totalBaseline,
        durationMs,
        projects: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[jira-sync] Error:", error);

    // Log failed sync
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await supabase.from("ph_jira_sync_log").insert({
        sync_type: 'full',
        sync_mode: 'delta',
        status: 'failed',
        items_created: 0, items_updated: 0, items_unchanged: 0,
        started_at: syncStartedAt,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startMs,
        errors: { message: error instanceof Error ? error.message : "Unknown error" },
      });
    } catch (_logErr) { /* ignore logging errors */ }

    return new Response(
      JSON.stringify({ success: false, message: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
