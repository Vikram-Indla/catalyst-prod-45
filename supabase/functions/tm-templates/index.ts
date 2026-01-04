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
    const templateIdIndex = pathParts.indexOf("templates") + 1;
    const templateId = pathParts[templateIdIndex];
    const isFromCase = pathParts.includes("from-case");
    const caseId = isFromCase ? pathParts[pathParts.indexOf("from-case") + 1] : null;

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

    // GET /projects/:projectId/templates
    if (req.method === "GET" && !templateId) {
      const categoryId = url.searchParams.get("categoryId");
      const includeGlobal = url.searchParams.get("includeGlobal") !== "false";

      let query = supabaseClient
        .from("tm_test_case_templates")
        .select(`
          *,
          category:tm_template_categories(id, name),
          created_by_profile:profiles!tm_test_case_templates_created_by_fkey(id, full_name)
        `)
        .or(`project_id.eq.${projectId}${includeGlobal ? ",is_global.eq.true" : ""}`);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data: templates, error } = await query.order("name");

      if (error) throw error;

      // Get categories
      const { data: categories } = await supabaseClient
        .from("tm_template_categories")
        .select("*")
        .order("sort_order");

      return new Response(JSON.stringify({ 
        data: templates,
        categories,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/templates/from-case/:caseId
    if (req.method === "POST" && isFromCase && caseId) {
      const body = await req.json();
      const { name, description, category_id, is_global } = body;

      // Get the source case with steps
      const { data: sourceCase, error: caseError } = await supabaseClient
        .from("tm_test_cases")
        .select(`
          *,
          steps:tm_test_steps(*)
        `)
        .eq("id", caseId)
        .single();

      if (caseError || !sourceCase) {
        return new Response(JSON.stringify({ error: "Source case not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build template data
      const templateData = {
        title: sourceCase.title,
        description: sourceCase.description,
        preconditions: sourceCase.preconditions,
        expected_result: sourceCase.expected_result,
        steps: (sourceCase.steps || []).map((s: any) => ({
          action: s.action,
          expected_result: s.expected_result,
          test_data: s.test_data,
        })),
      };

      const { data: template, error } = await supabaseClient
        .from("tm_test_case_templates")
        .insert({
          name: name || `Template from ${sourceCase.case_key}`,
          description: description || `Created from test case ${sourceCase.case_key}`,
          category_id: category_id || null,
          template_data: templateData,
          is_global: is_global || false,
          project_id: is_global ? null : projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: template }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/templates
    if (req.method === "POST" && !templateId && !isFromCase) {
      const body = await req.json();
      const { name, description, category_id, template_data, is_global } = body;

      if (!name || name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!template_data) {
        return new Response(JSON.stringify({ error: "template_data is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract variables from template
      const variables = extractVariables(template_data);

      const { data: template, error } = await supabaseClient
        .from("tm_test_case_templates")
        .insert({
          name: name.trim(),
          description,
          category_id: category_id || null,
          template_data: { ...template_data, variables },
          is_global: is_global || false,
          project_id: is_global ? null : projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: template }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/templates/:templateId
    if (req.method === "GET" && templateId) {
      const { data: template, error } = await supabaseClient
        .from("tm_test_case_templates")
        .select(`
          *,
          category:tm_template_categories(id, name),
          created_by_profile:profiles!tm_test_case_templates_created_by_fkey(id, full_name)
        `)
        .eq("id", templateId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract variables for preview
      const variables = extractVariables(template.template_data);

      return new Response(JSON.stringify({ 
        data: { ...template, variables } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /projects/:projectId/templates/:templateId
    if (req.method === "PATCH" && templateId) {
      const body = await req.json();
      const allowedFields = ["name", "description", "category_id", "template_data", "is_global"];
      
      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Handle global toggle
      if (updateData.is_global === true) {
        updateData.project_id = null;
      } else if (updateData.is_global === false) {
        updateData.project_id = projectId;
      }

      // Re-extract variables if template_data changed
      if (updateData.template_data) {
        const variables = extractVariables(updateData.template_data as any);
        updateData.template_data = { ...(updateData.template_data as any), variables };
      }

      const { data: template, error } = await supabaseClient
        .from("tm_test_case_templates")
        .update(updateData)
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: template }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /projects/:projectId/templates/:templateId
    if (req.method === "DELETE" && templateId) {
      // Check ownership
      const { data: template } = await supabaseClient
        .from("tm_test_case_templates")
        .select("created_by, project_id, is_global")
        .eq("id", templateId)
        .single();

      if (!template) {
        return new Response(JSON.stringify({ error: "Template not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only creator can delete, or project admin for project templates
      if (template.created_by !== user.id && template.project_id !== projectId) {
        return new Response(JSON.stringify({ error: "Cannot delete this template" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("tm_test_case_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
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

function extractVariables(templateData: any): string[] {
  const variables = new Set<string>();
  const variablePattern = /\{\{(\w+)\}\}/g;

  const extractFromText = (text: string) => {
    if (!text) return;
    let match;
    while ((match = variablePattern.exec(text)) !== null) {
      variables.add(match[1]);
    }
  };

  extractFromText(templateData.title);
  extractFromText(templateData.description);
  extractFromText(templateData.preconditions);
  extractFromText(templateData.expected_result);

  if (templateData.steps) {
    templateData.steps.forEach((step: any) => {
      extractFromText(step.action);
      extractFromText(step.expected_result);
      extractFromText(step.test_data);
    });
  }

  return Array.from(variables);
}
