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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    const projectIdIndex = pathParts.indexOf("projects") + 1;
    const projectId = pathParts[projectIdIndex];
    const defectIdIndex = pathParts.indexOf("defects") + 1;
    const defectId = pathParts[defectIdIndex];
    const action = pathParts[defectIdIndex + 1]; // link, from-step

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Project ID required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project access
    const { data: hasAccess } = await supabaseClient.rpc("tm_user_has_access", {
      p_user_id: user.id,
      p_project_id: projectId,
    });

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/defects
    if (req.method === "GET" && !defectId) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50"), 100);
      const status = url.searchParams.get("status");
      const severity = url.searchParams.get("severity");
      const assigneeId = url.searchParams.get("assigneeId");
      const search = url.searchParams.get("search");

      let query = supabaseClient
        .from("tm_defects")
        .select(`
          *,
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name),
          links:tm_defect_links(
            id,
            test_run:tm_test_runs(id, status),
            step_result:tm_step_results(id, status)
          )
        `, { count: "exact" })
        .eq("project_id", projectId);

      if (status) query = query.eq("status", status);
      if (severity) query = query.eq("severity", severity);
      if (assigneeId) query = query.eq("assignee_id", assigneeId);
      if (search) query = query.ilike("title", `%${search}%`);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: defects, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return new Response(JSON.stringify({
        data: defects,
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/defects/from-step (Quick Defect - MONOPOLY)
    if (req.method === "POST" && pathParts.includes("from-step")) {
      const body = await req.json();
      const { step_result_id, additional_notes, create_jira } = body;

      if (!step_result_id) {
        return new Response(JSON.stringify({ error: "step_result_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get step result with full context
      const { data: stepResult, error: stepError } = await supabaseClient
        .from("tm_step_results")
        .select(`
          *,
          test_step:tm_test_steps(*),
          test_run:tm_test_runs(
            *,
            cycle_scope:tm_cycle_scope(
              *,
              test_case:tm_test_cases(id, case_key, title),
              cycle:tm_test_cycles(id, name, cycle_key)
            )
          )
        `)
        .eq("id", step_result_id)
        .single();

      if (stepError || !stepResult) {
        return new Response(JSON.stringify({ error: "Step result not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const testCase = stepResult.test_run?.cycle_scope?.test_case;
      const cycle = stepResult.test_run?.cycle_scope?.cycle;
      const step = stepResult.test_step;

      // Auto-generate title
      const title = `[${testCase?.case_key}] Step ${step?.step_number} Failed - ${step?.action?.substring(0, 50)}...`;

      // Auto-generate description
      const description = `
## Context
- **Test Case:** ${testCase?.case_key} - ${testCase?.title}
- **Test Cycle:** ${cycle?.cycle_key} - ${cycle?.name}
- **Step Number:** ${step?.step_number}

## Step Details
**Action:** ${step?.action}

**Expected Result:** ${step?.expected_result || "N/A"}

**Actual Result:** ${stepResult.actual_result || "Failed - see attachments"}

## Test Data
${step?.test_data || "None specified"}

## Additional Notes
${additional_notes || "None"}
      `.trim();

      // Generate defect key
      const { data: defectKey } = await supabaseClient.rpc("tm_next_entity_key", {
        p_project_id: projectId,
        p_prefix: "DF",
      });

      // Create defect
      const { data: defect, error: defectError } = await supabaseClient
        .from("tm_defects")
        .insert({
          project_id: projectId,
          defect_key: defectKey,
          title,
          description,
          severity: "major",
          status: "open",
          reporter_id: user.id,
        })
        .select()
        .single();

      if (defectError) throw defectError;

      // Create link to step result and run
      await supabaseClient.from("tm_defect_links").insert({
        defect_id: defect.id,
        test_run_id: stepResult.test_run_id,
        step_result_id: step_result_id,
        created_by: user.id,
      });

      // Copy attachments from step result
      const { data: stepAttachments } = await supabaseClient
        .from("tm_attachments")
        .select("*")
        .eq("entity_type", "step_result")
        .eq("entity_id", step_result_id);

      if (stepAttachments && stepAttachments.length > 0) {
        const defectAttachments = stepAttachments.map((a: any) => ({
          entity_type: "defect",
          entity_id: defect.id,
          file_name: a.file_name,
          file_path: a.file_path,
          file_size: a.file_size,
          mime_type: a.mime_type,
          uploaded_by: user.id,
        }));

        await supabaseClient.from("tm_attachments").insert(defectAttachments);
      }

      // Audit log
      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "defect",
        entity_id: defect.id,
        action: "create",
        actor_id: user.id,
        changes: { 
          source: "quick_defect",
          step_result_id,
          test_case_key: testCase?.case_key,
        },
      });

      return new Response(JSON.stringify({ 
        data: defect,
        linked_to: {
          test_case: testCase?.case_key,
          cycle: cycle?.cycle_key,
          step_number: step?.step_number,
        },
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/defects
    if (req.method === "POST" && !defectId) {
      const body = await req.json();
      const { title, description, severity, assignee_id, external_id, external_url } = body;

      if (!title || title.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Title is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: defectKey } = await supabaseClient.rpc("tm_next_entity_key", {
        p_project_id: projectId,
        p_prefix: "DF",
      });

      const { data: defect, error } = await supabaseClient
        .from("tm_defects")
        .insert({
          project_id: projectId,
          defect_key: defectKey,
          title: title.trim(),
          description,
          severity: severity || "minor",
          status: "open",
          assignee_id: assignee_id || null,
          reporter_id: user.id,
          external_id,
          external_url,
        })
        .select()
        .single();

      if (error) throw error;

      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "defect",
        entity_id: defect.id,
        action: "create",
        actor_id: user.id,
      });

      return new Response(JSON.stringify({ data: defect }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/defects/:defectId
    if (req.method === "GET" && defectId && !action) {
      const { data: defect, error } = await supabaseClient
        .from("tm_defects")
        .select(`
          *,
          assignee:profiles!tm_defects_assignee_id_fkey(id, full_name, avatar_url),
          reporter:profiles!tm_defects_reporter_id_fkey(id, full_name, avatar_url),
          links:tm_defect_links(
            id,
            test_run:tm_test_runs(
              id, status, run_number,
              cycle_scope:tm_cycle_scope(
                test_case:tm_test_cases(id, case_key, title)
              )
            ),
            step_result:tm_step_results(id, status, actual_result)
          )
        `)
        .eq("id", defectId)
        .eq("project_id", projectId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Defect not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get attachments
      const { data: attachments } = await supabaseClient
        .from("tm_attachments")
        .select("*")
        .eq("entity_type", "defect")
        .eq("entity_id", defectId);

      // Get comments
      const { data: comments } = await supabaseClient
        .from("tm_comments")
        .select(`
          *,
          author:profiles!tm_comments_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq("entity_type", "defect")
        .eq("entity_id", defectId)
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({ 
        data: { ...defect, attachments, comments } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /projects/:projectId/defects/:defectId
    if (req.method === "PATCH" && defectId && !action) {
      const body = await req.json();
      const allowedFields = ["title", "description", "severity", "status", "assignee_id", "external_id", "external_url"];
      
      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Handle status transitions
      if (updateData.status === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data: original } = await supabaseClient
        .from("tm_defects")
        .select("*")
        .eq("id", defectId)
        .single();

      const { data: defect, error } = await supabaseClient
        .from("tm_defects")
        .update(updateData)
        .eq("id", defectId)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;

      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "defect",
        entity_id: defectId,
        action: "update",
        actor_id: user.id,
        changes: { before: original, after: updateData },
      });

      return new Response(JSON.stringify({ data: defect }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/defects/:defectId/link
    if (req.method === "POST" && defectId && action === "link") {
      const body = await req.json();
      const { test_run_id, step_result_id } = body;

      if (!test_run_id && !step_result_id) {
        return new Response(JSON.stringify({ error: "test_run_id or step_result_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: link, error } = await supabaseClient
        .from("tm_defect_links")
        .insert({
          defect_id: defectId,
          test_run_id: test_run_id || null,
          step_result_id: step_result_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: link }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
