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
    const caseIdIndex = pathParts.indexOf("cases") + 1;
    const caseId = pathParts[caseIdIndex];
    const action = pathParts[caseIdIndex + 1]; // clone, versions, steps

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

    // GET /projects/:projectId/cases - List with pagination and filters
    if (req.method === "GET" && !caseId) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "50"), 100);
      const folderId = url.searchParams.get("folderId");
      const status = url.searchParams.get("status");
      const priorityId = url.searchParams.get("priorityId");
      const typeId = url.searchParams.get("typeId");
      const search = url.searchParams.get("search");
      const labelIds = url.searchParams.get("labelIds")?.split(",").filter(Boolean);

      let query = supabaseClient
        .from("tm_test_cases")
        .select(`
          *,
          folder:tm_folders(id, name, path),
          priority:tm_case_priorities(id, name, color),
          case_type:tm_case_types(id, name, color),
          created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name),
          labels:tm_case_labels(label:tm_labels(id, name, color)),
          steps:tm_test_steps(count)
        `, { count: "exact" })
        .eq("project_id", projectId);

      if (folderId) query = query.eq("folder_id", folderId);
      if (status) query = query.eq("status", status);
      if (priorityId) query = query.eq("priority_id", priorityId);
      if (typeId) query = query.eq("case_type_id", typeId);
      if (search) query = query.ilike("title", `%${search}%`);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data: cases, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Filter by labels if specified (post-query filtering)
      let filteredCases = cases || [];
      if (labelIds && labelIds.length > 0) {
        filteredCases = filteredCases.filter((c: any) =>
          c.labels?.some((l: any) => labelIds.includes(l.label?.id))
        );
      }

      return new Response(JSON.stringify({
        data: filteredCases,
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

    // POST /projects/:projectId/cases - Create case
    if (req.method === "POST" && !caseId) {
      const isBulk = pathParts.includes("bulk");
      const isBulkCopy = pathParts.includes("bulk-copy");
      const isFromTemplate = pathParts.includes("from-template");
      const templateId = isFromTemplate ? pathParts[pathParts.indexOf("from-template") + 1] : null;

      if (isBulkCopy) {
        return await handleBulkCopy(req, supabaseClient, projectId, user.id);
      }

      if (isFromTemplate && templateId) {
        return await handleFromTemplate(req, supabaseClient, projectId, templateId, user.id);
      }

      if (isBulk) {
        return await handleBulkCreate(req, supabaseClient, projectId, user.id);
      }

      const body = await req.json();
      const { title, description, preconditions, expected_result, folder_id, priority_id, case_type_id, steps, labels } = body;

      if (!title || title.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Title is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate case key
      const { data: caseKey } = await supabaseClient.rpc("tm_next_entity_key", {
        p_project_id: projectId,
        p_prefix: "TC",
      });

      const { data: testCase, error } = await supabaseClient
        .from("tm_test_cases")
        .insert({
          project_id: projectId,
          case_key: caseKey,
          title: title.trim(),
          description,
          preconditions,
          expected_result,
          folder_id: folder_id || null,
          priority_id: priority_id || null,
          case_type_id: case_type_id || null,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert steps if provided
      if (steps && Array.isArray(steps) && steps.length > 0) {
        const stepsData = steps.map((s: any, idx: number) => ({
          test_case_id: testCase.id,
          step_number: idx + 1,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));

        await supabaseClient.from("tm_test_steps").insert(stepsData);
      }

      // Insert labels if provided
      if (labels && Array.isArray(labels) && labels.length > 0) {
        const labelsData = labels.map((labelId: string) => ({
          test_case_id: testCase.id,
          label_id: labelId,
        }));

        await supabaseClient.from("tm_case_labels").insert(labelsData);
      }

      // Fetch complete case
      const { data: fullCase } = await supabaseClient
        .from("tm_test_cases")
        .select(`
          *,
          folder:tm_folders(id, name),
          priority:tm_case_priorities(id, name, color),
          case_type:tm_case_types(id, name, color),
          steps:tm_test_steps(*),
          labels:tm_case_labels(label:tm_labels(id, name, color))
        `)
        .eq("id", testCase.id)
        .single();

      // Audit log
      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "test_case",
        entity_id: testCase.id,
        action: "create",
        actor_id: user.id,
        changes: { case_key: caseKey, title },
      });

      return new Response(JSON.stringify({ data: fullCase }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/cases/:caseId
    if (req.method === "GET" && caseId && !action) {
      const { data: testCase, error } = await supabaseClient
        .from("tm_test_cases")
        .select(`
          *,
          folder:tm_folders(id, name, path),
          priority:tm_case_priorities(id, name, color),
          case_type:tm_case_types(id, name, color),
          created_by_profile:profiles!tm_test_cases_created_by_fkey(id, full_name, avatar_url),
          steps:tm_test_steps(*)
        `)
        .eq("id", caseId)
        .eq("project_id", projectId)
        .single();

      if (error || !testCase) {
        return new Response(JSON.stringify({ error: "Test case not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get labels separately
      const { data: labels } = await supabaseClient
        .from("tm_case_labels")
        .select("label:tm_labels(id, name, color)")
        .eq("test_case_id", caseId);

      return new Response(JSON.stringify({ 
        data: { ...testCase, labels: labels?.map(l => l.label) || [] } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/cases/:caseId/versions
    if (req.method === "GET" && caseId && action === "versions") {
      const { data: versions, error } = await supabaseClient
        .from("tm_audit_log")
        .select("*")
        .eq("entity_type", "test_case")
        .eq("entity_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: versions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/cases/:caseId/clone
    if (req.method === "POST" && caseId && action === "clone") {
      const body = await req.json();
      const { target_folder_id, new_title } = body;

      // Get original case
      const { data: original, error: fetchError } = await supabaseClient
        .from("tm_test_cases")
        .select(`*, steps:tm_test_steps(*)`)
        .eq("id", caseId)
        .single();

      if (fetchError || !original) {
        return new Response(JSON.stringify({ error: "Original case not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate new key
      const { data: caseKey } = await supabaseClient.rpc("tm_next_entity_key", {
        p_project_id: projectId,
        p_prefix: "TC",
      });

      // Create clone
      const { data: clone, error } = await supabaseClient
        .from("tm_test_cases")
        .insert({
          project_id: projectId,
          case_key: caseKey,
          title: new_title || `${original.title} (Copy)`,
          description: original.description,
          preconditions: original.preconditions,
          expected_result: original.expected_result,
          folder_id: target_folder_id || original.folder_id,
          priority_id: original.priority_id,
          case_type_id: original.case_type_id,
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Clone steps
      if (original.steps && original.steps.length > 0) {
        const stepsData = original.steps.map((s: any) => ({
          test_case_id: clone.id,
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));

        await supabaseClient.from("tm_test_steps").insert(stepsData);
      }

      // Clone labels
      const { data: originalLabels } = await supabaseClient
        .from("tm_case_labels")
        .select("label_id")
        .eq("test_case_id", caseId);

      if (originalLabels && originalLabels.length > 0) {
        const labelsData = originalLabels.map((l: any) => ({
          test_case_id: clone.id,
          label_id: l.label_id,
        }));

        await supabaseClient.from("tm_case_labels").insert(labelsData);
      }

      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "test_case",
        entity_id: clone.id,
        action: "clone",
        actor_id: user.id,
        changes: { cloned_from: caseId },
      });

      return new Response(JSON.stringify({ data: clone }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /projects/:projectId/cases/:caseId/steps
    if (req.method === "PUT" && caseId && action === "steps") {
      const body = await req.json();
      const { steps } = body;

      if (!Array.isArray(steps)) {
        return new Response(JSON.stringify({ error: "Steps must be an array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete existing steps
      await supabaseClient
        .from("tm_test_steps")
        .delete()
        .eq("test_case_id", caseId);

      // Insert new steps
      if (steps.length > 0) {
        const stepsData = steps.map((s: any, idx: number) => ({
          test_case_id: caseId,
          step_number: idx + 1,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));

        const { error } = await supabaseClient.from("tm_test_steps").insert(stepsData);
        if (error) throw error;
      }

      // Update case version
      await supabaseClient
        .from("tm_test_cases")
        .update({ version: supabaseClient.rpc("increment", { row_id: caseId }) })
        .eq("id", caseId);

      const { data: updatedSteps } = await supabaseClient
        .from("tm_test_steps")
        .select("*")
        .eq("test_case_id", caseId)
        .order("step_number");

      return new Response(JSON.stringify({ data: updatedSteps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /projects/:projectId/cases/:caseId
    if (req.method === "PATCH" && caseId && !action) {
      const body = await req.json();
      const allowedFields = ["title", "description", "preconditions", "expected_result", "folder_id", "priority_id", "case_type_id", "status", "estimated_time", "automation_status", "automation_id", "custom_fields"];
      
      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "No valid fields to update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get original for audit
      const { data: original } = await supabaseClient
        .from("tm_test_cases")
        .select("*")
        .eq("id", caseId)
        .single();

      const { data: testCase, error } = await supabaseClient
        .from("tm_test_cases")
        .update(updateData)
        .eq("id", caseId)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;

      // Handle labels update if provided
      if (body.labels !== undefined) {
        await supabaseClient
          .from("tm_case_labels")
          .delete()
          .eq("test_case_id", caseId);

        if (body.labels.length > 0) {
          const labelsData = body.labels.map((labelId: string) => ({
            test_case_id: caseId,
            label_id: labelId,
          }));
          await supabaseClient.from("tm_case_labels").insert(labelsData);
        }
      }

      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "test_case",
        entity_id: caseId,
        action: "update",
        actor_id: user.id,
        changes: { before: original, after: updateData },
      });

      return new Response(JSON.stringify({ data: testCase }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /projects/:projectId/cases/:caseId (soft delete via status)
    if (req.method === "DELETE" && caseId) {
      const { data: testCase, error } = await supabaseClient
        .from("tm_test_cases")
        .update({ status: "deprecated" })
        .eq("id", caseId)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;

      await supabaseClient.from("tm_audit_log").insert({
        project_id: projectId,
        entity_type: "test_case",
        entity_id: caseId,
        action: "delete",
        actor_id: user.id,
      });

      return new Response(JSON.stringify({ data: testCase }), {
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

async function handleBulkCreate(req: Request, supabaseClient: any, projectId: string, userId: string) {
  const body = await req.json();
  const { cases } = body;

  if (!Array.isArray(cases) || cases.length === 0) {
    return new Response(JSON.stringify({ error: "Cases array is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const c of cases) {
    const { data: caseKey } = await supabaseClient.rpc("tm_next_entity_key", {
      p_project_id: projectId,
      p_prefix: "TC",
    });

    const { data, error } = await supabaseClient
      .from("tm_test_cases")
      .insert({
        project_id: projectId,
        case_key: caseKey,
        title: c.title,
        description: c.description,
        folder_id: c.folder_id,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (!error) results.push(data);
  }

  return new Response(JSON.stringify({ data: results, created: results.length }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleBulkCopy(req: Request, supabaseClient: any, projectId: string, userId: string) {
  const body = await req.json();
  const { case_ids, target_folder_id } = body;

  if (!Array.isArray(case_ids) || case_ids.length === 0) {
    return new Response(JSON.stringify({ error: "case_ids array is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const caseId of case_ids) {
    const { data: original } = await supabaseClient
      .from("tm_test_cases")
      .select(`*, steps:tm_test_steps(*)`)
      .eq("id", caseId)
      .single();

    if (!original) continue;

    const { data: caseKey } = await supabaseClient.rpc("tm_next_entity_key", {
      p_project_id: projectId,
      p_prefix: "TC",
    });

    const { data: clone, error } = await supabaseClient
      .from("tm_test_cases")
      .insert({
        project_id: projectId,
        case_key: caseKey,
        title: `${original.title} (Copy)`,
        description: original.description,
        preconditions: original.preconditions,
        expected_result: original.expected_result,
        folder_id: target_folder_id || original.folder_id,
        priority_id: original.priority_id,
        case_type_id: original.case_type_id,
        status: "draft",
        created_by: userId,
      })
      .select()
      .single();

    if (!error && clone) {
      if (original.steps?.length > 0) {
        const stepsData = original.steps.map((s: any) => ({
          test_case_id: clone.id,
          step_number: s.step_number,
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        }));
        await supabaseClient.from("tm_test_steps").insert(stepsData);
      }
      results.push(clone);
    }
  }

  return new Response(JSON.stringify({ data: results, copied: results.length }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleFromTemplate(req: Request, supabaseClient: any, projectId: string, templateId: string, userId: string) {
  const body = await req.json();
  const { folder_id, variables } = body;

  const { data: template, error: templateError } = await supabaseClient
    .from("tm_test_case_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return new Response(JSON.stringify({ error: "Template not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const templateData = template.template_data as any;
  
  // Replace variables
  let title = templateData.title || template.name;
  let description = templateData.description || "";
  let preconditions = templateData.preconditions || "";
  let expectedResult = templateData.expected_result || "";

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      title = title.replace(new RegExp(placeholder, "g"), value as string);
      description = description.replace(new RegExp(placeholder, "g"), value as string);
      preconditions = preconditions.replace(new RegExp(placeholder, "g"), value as string);
      expectedResult = expectedResult.replace(new RegExp(placeholder, "g"), value as string);
    }
  }

  const { data: caseKey } = await supabaseClient.rpc("tm_next_entity_key", {
    p_project_id: projectId,
    p_prefix: "TC",
  });

  const { data: testCase, error } = await supabaseClient
    .from("tm_test_cases")
    .insert({
      project_id: projectId,
      case_key: caseKey,
      title,
      description,
      preconditions,
      expected_result: expectedResult,
      folder_id: folder_id || null,
      status: "draft",
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Create steps from template
  if (templateData.steps?.length > 0) {
    let steps = templateData.steps.map((s: any, idx: number) => {
      let action = s.action || "";
      let stepExpected = s.expected_result || "";
      let testData = s.test_data || "";

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const placeholder = `{{${key}}}`;
          action = action.replace(new RegExp(placeholder, "g"), value as string);
          stepExpected = stepExpected.replace(new RegExp(placeholder, "g"), value as string);
          testData = testData.replace(new RegExp(placeholder, "g"), value as string);
        }
      }

      return {
        test_case_id: testCase.id,
        step_number: idx + 1,
        action,
        expected_result: stepExpected,
        test_data: testData,
      };
    });

    await supabaseClient.from("tm_test_steps").insert(steps);
  }

  // Track template usage
  await supabaseClient.from("tm_ai_usage_log").insert({
    user_id: userId,
    project_id: projectId,
    feature: "template_usage",
    request_data: { template_id: templateId, template_name: template.name },
  });

  return new Response(JSON.stringify({ data: testCase }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
