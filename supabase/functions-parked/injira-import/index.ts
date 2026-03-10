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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { import_job_id, dry_run = false } = await req.json();

    if (!import_job_id) {
      throw new Error("import_job_id is required");
    }

    // Get import job with mappings
    const { data: job, error: jobError } = await supabase
      .from("injira_import_jobs")
      .select("*, mappings:injira_import_mappings(*)")
      .eq("id", import_job_id)
      .single();

    if (jobError || !job) {
      throw new Error("Import job not found");
    }

    // Get manifest
    const { data: manifestData } = await supabase
      .from("injira_import_manifests")
      .select("*")
      .eq("import_job_id", import_job_id)
      .single();

    const manifest = manifestData?.data || job.config?.manifest || {};
    
    // Update job status
    await supabase
      .from("injira_import_jobs")
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq("id", import_job_id);

    const stats = {
      total: manifest.issues?.length || 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Build mapping lookups
    const userMappings = new Map(
      (job.mappings || [])
        .filter((m: any) => m.source_type === 'user' && m.target_id)
        .map((m: any) => [m.source_id, m.target_id])
    );

    const statusMappings = new Map(
      (job.mappings || [])
        .filter((m: any) => m.source_type === 'status' && m.target_id)
        .map((m: any) => [m.source_id, m.target_id])
    );

    const priorityMap: Record<string, string> = {
      'Highest': 'highest',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low',
      'Lowest': 'lowest',
    };

    // Get default status
    const { data: defaultStatus } = await supabase
      .from("injira_statuses")
      .select("id")
      .eq("name", "To Do")
      .single();

    // Get issue types
    const { data: issueTypes } = await supabase
      .from("injira_issue_types")
      .select("id, name, category");

    const issueTypeMap = new Map(
      (issueTypes || []).map(t => [t.name.toLowerCase(), t])
    );

    // Process issues
    for (const sourceIssue of (manifest.issues || [])) {
      try {
        const externalId = sourceIssue.id?.toString() || sourceIssue.key;
        const fields = sourceIssue.fields || sourceIssue;

        // Check if issue already exists (idempotent)
        const { data: existingIssue } = await supabase
          .from("injira_issues")
          .select("id")
          .eq("external_id", externalId)
          .eq("external_source", "jira_cloud")
          .single();

        // Determine issue type
        const sourceTypeName = fields.issuetype?.name || 'Story';
        const issueType = issueTypeMap.get(sourceTypeName.toLowerCase()) || 
                          issueTypeMap.get('story');

        // Map assignee
        const sourceAssigneeId = fields.assignee?.accountId || fields.assignee?.key;
        const targetAssigneeId = sourceAssigneeId ? userMappings.get(sourceAssigneeId) : null;

        // Map status
        const sourceStatusId = fields.status?.id;
        const targetStatusId = sourceStatusId ? 
          statusMappings.get(sourceStatusId) : 
          defaultStatus?.id;

        // Map priority
        const sourcePriority = fields.priority?.name;
        const targetPriority = sourcePriority ? priorityMap[sourcePriority] || 'medium' : 'medium';

        const issueData = {
          project_id: job.project_id,
          issue_type_id: issueType?.id,
          summary: fields.summary || 'Untitled',
          description: fields.description || null,
          status_id: targetStatusId,
          assignee_id: targetAssigneeId,
          priority: targetPriority,
          story_points: fields.customfield_10016 || null, // Story points custom field
          external_id: externalId,
          external_source: 'jira_cloud',
          import_job_id: import_job_id,
          created_at: fields.created || new Date().toISOString(),
          updated_at: fields.updated || new Date().toISOString(),
        };

        if (!dry_run) {
          if (existingIssue) {
            // Update existing issue
            const { error: updateError } = await supabase
              .from("injira_issues")
              .update(issueData)
              .eq("id", existingIssue.id);

            if (updateError) throw updateError;
            stats.updated++;
          } else {
            // Insert new issue
            const { error: insertError } = await supabase
              .from("injira_issues")
              .insert(issueData);

            if (insertError) throw insertError;
            stats.imported++;
          }

          // Log the action
          await supabase.from("injira_import_audit_log").insert({
            import_job_id,
            action: existingIssue ? 'issue_updated' : 'issue_created',
            entity_type: 'issue',
            entity_id: externalId,
            new_value: { key: sourceIssue.key, summary: fields.summary },
          });
        } else {
          stats.imported++;
        }

        // Import comments if present
        if (fields.comment?.comments && !dry_run) {
          for (const comment of fields.comment.comments) {
            const { data: targetIssue } = await supabase
              .from("injira_issues")
              .select("id")
              .eq("external_id", externalId)
              .single();

            if (targetIssue) {
              await supabase.from("injira_comments").upsert({
                issue_id: targetIssue.id,
                body: comment.body || '',
                author_id: userMappings.get(comment.author?.accountId) || null,
                created_at: comment.created,
                updated_at: comment.updated,
              }, {
                onConflict: 'issue_id,created_at',
                ignoreDuplicates: true,
              });
            }
          }
        }

      } catch (issueError: any) {
        stats.failed++;
        stats.errors.push(`${sourceIssue.key}: ${issueError.message}`);
        console.error(`Failed to import ${sourceIssue.key}:`, issueError);
      }
    }

    // Update job with results
    await supabase
      .from("injira_import_jobs")
      .update({
        status: stats.failed > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date().toISOString(),
        imported_items: stats.imported + stats.updated,
        failed_items: stats.failed,
        total_items: stats.total,
        progress_percent: 100,
        error_log: stats.errors.length > 0 ? stats.errors : null,
      })
      .eq("id", import_job_id);

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        stats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
