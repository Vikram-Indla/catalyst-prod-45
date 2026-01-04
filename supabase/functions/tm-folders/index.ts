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
    // Expected: /tm-folders/projects/:projectId/folders[/:folderId][/reorder]
    
    const projectIdIndex = pathParts.indexOf("projects") + 1;
    const projectId = pathParts[projectIdIndex];
    const folderIdIndex = pathParts.indexOf("folders") + 1;
    const folderId = pathParts[folderIdIndex] !== "reorder" ? pathParts[folderIdIndex] : null;
    const isReorder = pathParts.includes("reorder");

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
      return new Response(JSON.stringify({ error: "Access denied to project" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/folders
    if (req.method === "GET" && !folderId) {
      const format = url.searchParams.get("format") || "tree";
      
      const { data: folders, error } = await supabaseClient
        .from("tm_folders")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      if (format === "tree") {
        const tree = buildFolderTree(folders || []);
        return new Response(JSON.stringify({ data: tree }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data: folders }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/folders
    if (req.method === "POST" && !folderId && !isReorder) {
      const body = await req.json();
      const { name, parent_id } = body;

      if (!name || name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Folder name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for duplicate name under same parent
      const { data: existing } = await supabaseClient
        .from("tm_folders")
        .select("id")
        .eq("project_id", projectId)
        .eq("name", name.trim())
        .is("parent_id", parent_id || null)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ error: "Folder with this name already exists" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate depth and path
      let depth = 0;
      let path = name.trim().replace(/[^a-zA-Z0-9]/g, "_");

      if (parent_id) {
        const { data: parent } = await supabaseClient
          .from("tm_folders")
          .select("depth, path")
          .eq("id", parent_id)
          .single();

        if (parent) {
          depth = (parent.depth || 0) + 1;
          path = `${parent.path}.${path}`;
        }
      }

      // Get max sort order
      const { data: maxSort } = await supabaseClient
        .from("tm_folders")
        .select("sort_order")
        .eq("project_id", projectId)
        .is("parent_id", parent_id || null)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = (maxSort?.sort_order || 0) + 1;

      const { data: folder, error } = await supabaseClient
        .from("tm_folders")
        .insert({
          project_id: projectId,
          name: name.trim(),
          parent_id: parent_id || null,
          depth,
          path,
          sort_order: sortOrder,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: folder }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /projects/:projectId/folders/reorder
    if (req.method === "POST" && isReorder) {
      const body = await req.json();
      const { folder_id, new_parent_id, new_sort_order } = body;

      if (!folder_id) {
        return new Response(JSON.stringify({ error: "folder_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for circular reference
      const { data: isCircular } = await supabaseClient.rpc("tm_check_circular_folder", {
        p_folder_id: folder_id,
        p_new_parent_id: new_parent_id || null,
      });

      if (isCircular) {
        return new Response(JSON.stringify({ error: "Cannot move folder into its own descendant" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate new depth and path
      let depth = 0;
      let path = "";

      const { data: folder } = await supabaseClient
        .from("tm_folders")
        .select("name")
        .eq("id", folder_id)
        .single();

      if (!folder) {
        return new Response(JSON.stringify({ error: "Folder not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const safeName = folder.name.replace(/[^a-zA-Z0-9]/g, "_");

      if (new_parent_id) {
        const { data: parent } = await supabaseClient
          .from("tm_folders")
          .select("depth, path")
          .eq("id", new_parent_id)
          .single();

        if (parent) {
          depth = (parent.depth || 0) + 1;
          path = `${parent.path}.${safeName}`;
        }
      } else {
        path = safeName;
      }

      const { data: updated, error } = await supabaseClient
        .from("tm_folders")
        .update({
          parent_id: new_parent_id || null,
          depth,
          path,
          sort_order: new_sort_order ?? 0,
        })
        .eq("id", folder_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /projects/:projectId/folders/:folderId
    if (req.method === "PATCH" && folderId) {
      const body = await req.json();
      const { name } = body;

      if (name !== undefined && name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Folder name cannot be empty" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name.trim();

      const { data: folder, error } = await supabaseClient
        .from("tm_folders")
        .update(updateData)
        .eq("id", folderId)
        .eq("project_id", projectId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ data: folder }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /projects/:projectId/folders/:folderId
    if (req.method === "DELETE" && folderId) {
      // Check if folder has cases
      const { count: caseCount } = await supabaseClient
        .from("tm_test_cases")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", folderId);

      if (caseCount && caseCount > 0) {
        return new Response(JSON.stringify({ 
          error: "Cannot delete folder with test cases. Move or delete cases first." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if folder has children
      const { count: childCount } = await supabaseClient
        .from("tm_folders")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", folderId);

      if (childCount && childCount > 0) {
        return new Response(JSON.stringify({ 
          error: "Cannot delete folder with subfolders. Delete subfolders first." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseClient
        .from("tm_folders")
        .delete()
        .eq("id", folderId)
        .eq("project_id", projectId);

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

function buildFolderTree(folders: any[]): any[] {
  const map = new Map();
  const roots: any[] = [];

  folders.forEach((f) => {
    map.set(f.id, { ...f, children: [] });
  });

  folders.forEach((f) => {
    const node = map.get(f.id);
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}
