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
    const setIdIndex = pathParts.indexOf("sets") + 1;
    const setId = pathParts[setIdIndex];
    const isCasesAction = pathParts.includes("cases");

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

    // GET /projects/:projectId/sets
    if (req.method === "GET" && !setId) {
      const { data: sets, error } = await supabaseClient
        .from("tm_test_sets")
        .select(`
          *,
          created_by_profile:profiles!tm_test_sets_created_by_fkey(id, full_name),
          case_count:tm_set_cases(count)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data: sets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/sets
    if (req.method === "POST" && !setId && !isCasesAction) {
      const body = await req.json();
      const { name, description, is_smart, smart_query } = body;

      if (!name || name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: set, error } = await supabaseClient
        .from("tm_test_sets")
        .insert({
          project_id: projectId,
          name: name.trim(),
          description,
          is_smart: is_smart || false,
          smart_query: smart_query || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: set }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/sets/:setId
    if (req.method === "GET" && setId && !isCasesAction) {
      const { data: set, error } = await supabaseClient
        .from("tm_test_sets")
        .select(`
          *,
          created_by_profile:profiles!tm_test_sets_created_by_fkey(id, full_name),
          cases:tm_set_cases(
            sort_order,
            test_case:tm_test_cases(
              id, case_key, title, status,
              priority:tm_case_priorities(name, color),
              folder:tm_folders(name)
            )
          )
        `)
        .eq("id", setId)
        .eq("project_id", projectId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: "Test set not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If smart set, execute the query
      if (set.is_smart && set.smart_query) {
        const smartCases = await executeSmartQuery(supabaseClient, projectId, set.smart_query);
        set.cases = smartCases;
      }

      return new Response(JSON.stringify({ data: set }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /projects/:projectId/sets/:setId
    if (req.method === "PATCH" && setId && !isCasesAction) {
      const body = await req.json();
      const allowedFields = ["name", "description", "is_smart", "smart_query"];
      
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

      const { data: set, error } = await supabaseClient
        .from("tm_test_sets")
        .update(updateData)
        .eq("id", setId)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: set }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /projects/:projectId/sets/:setId
    if (req.method === "DELETE" && setId && !isCasesAction) {
      const { error } = await supabaseClient
        .from("tm_test_sets")
        .delete()
        .eq("id", setId)
        .eq("project_id", projectId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/sets/:setId/cases - Add cases to set
    if (req.method === "POST" && setId && isCasesAction) {
      const body = await req.json();
      const { case_ids } = body;

      if (!Array.isArray(case_ids) || case_ids.length === 0) {
        return new Response(JSON.stringify({ error: "case_ids array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current max sort order
      const { data: maxSort } = await supabaseClient
        .from("tm_set_cases")
        .select("sort_order")
        .eq("test_set_id", setId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      let sortOrder = (maxSort?.sort_order || 0);

      const insertData = case_ids.map((caseId: string) => ({
        test_set_id: setId,
        test_case_id: caseId,
        sort_order: ++sortOrder,
      }));

      const { data, error } = await supabaseClient
        .from("tm_set_cases")
        .upsert(insertData, { onConflict: "test_set_id,test_case_id" })
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ data, added: data?.length || 0 }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /projects/:projectId/sets/:setId/cases - Remove cases from set
    if (req.method === "DELETE" && setId && isCasesAction) {
      const body = await req.json();
      const { case_ids } = body;

      if (!Array.isArray(case_ids) || case_ids.length === 0) {
        return new Response(JSON.stringify({ error: "case_ids array is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("tm_set_cases")
        .delete()
        .eq("test_set_id", setId)
        .in("test_case_id", case_ids);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, removed: case_ids.length }), {
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

async function executeSmartQuery(supabaseClient: any, projectId: string, smartQuery: any) {
  let query = supabaseClient
    .from("tm_test_cases")
    .select(`
      id, case_key, title, status,
      priority:tm_case_priorities(name, color),
      folder:tm_folders(name)
    `)
    .eq("project_id", projectId);

  // Apply filters from smart query
  if (smartQuery.folder_ids?.length > 0) {
    query = query.in("folder_id", smartQuery.folder_ids);
  }
  if (smartQuery.status?.length > 0) {
    query = query.in("status", smartQuery.status);
  }
  if (smartQuery.priority_ids?.length > 0) {
    query = query.in("priority_id", smartQuery.priority_ids);
  }
  if (smartQuery.type_ids?.length > 0) {
    query = query.in("case_type_id", smartQuery.type_ids);
  }
  if (smartQuery.search) {
    query = query.ilike("title", `%${smartQuery.search}%`);
  }

  const { data } = await query.order("created_at", { ascending: false });
  
  return (data || []).map((tc: any, idx: number) => ({
    sort_order: idx,
    test_case: tc,
  }));
}
