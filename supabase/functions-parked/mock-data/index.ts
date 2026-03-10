import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MockRunConfig {
  strategy?: {
    themes?: number;
    objectives?: number;
    keyResults?: number;
  };
  delivery?: {
    epics?: number;
    features?: number;
    stories?: number;
    tasks?: number;
  };
  release?: {
    releases?: number;
    releaseWindows?: number;
  };
  quality?: {
    incidents?: number;
    defects?: number;
  };
  structure?: {
    program?: string;
    project?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Path format: /mock-data/runs, /mock-data/runs/:id, /mock-data/runs/:id/action
    const resource = pathParts[1]; // 'runs' or 'keys'
    const runId = pathParts[2];
    const action = pathParts[3];

    // GET /runs - List all runs
    if (req.method === "GET" && resource === "runs" && !runId) {
      const { data, error } = await supabase
        .from("mock_runs")
        .select(`
          *,
          creator:profiles!mock_runs_created_by_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /runs - Create new run
    if (req.method === "POST" && resource === "runs" && !runId) {
      const body = await req.json();
      const { data, error } = await supabase
        .from("mock_runs")
        .insert({
          created_by: user.id,
          source_type: body.sourceType || "synthetic",
          source_name: body.sourceName,
          seed: body.seed,
          notes: body.notes,
          file_path: body.filePath,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      
      // Log activity
      await supabase.from("activity_logs").insert({
        actor_id: user.id,
        action: "CREATE",
        entity_type: "mock_run",
        entity_id: data.id,
        after_json: data,
      });

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /runs/:id - Get single run
    if (req.method === "GET" && resource === "runs" && runId && !action) {
      const { data, error } = await supabase
        .from("mock_runs")
        .select(`
          *,
          creator:profiles!mock_runs_created_by_fkey(full_name, email),
          files:mock_run_files(*),
          preview:mock_run_preview(*)
        `)
        .eq("id", runId)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /runs/:id/status - Get run status (for polling)
    if (req.method === "GET" && resource === "runs" && runId && action === "status") {
      const { data, error } = await supabase
        .from("mock_runs")
        .select("id, status, progress, current_step, error_message, updated_at")
        .eq("id", runId)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /runs/:id/config - Update run configuration
    if (req.method === "PATCH" && resource === "runs" && runId && action === "config") {
      const config: MockRunConfig = await req.json();
      
      const { data: existingRun } = await supabase
        .from("mock_runs")
        .select("config_json")
        .eq("id", runId)
        .single();

      const { data, error } = await supabase
        .from("mock_runs")
        .update({
          config_json: { ...existingRun?.config_json, ...config },
          status: "configuring",
        })
        .eq("id", runId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /runs/:id/generate - Generate preview data
    if (req.method === "POST" && resource === "runs" && runId && action === "generate") {
      // Update status to generating
      await supabase
        .from("mock_runs")
        .update({ status: "generating", progress: 0, current_step: "Initializing..." })
        .eq("id", runId);

      // Get run config
      const { data: run } = await supabase
        .from("mock_runs")
        .select("*")
        .eq("id", runId)
        .single();

      if (!run) {
        return new Response(JSON.stringify({ error: "Run not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const config = run.config_json as MockRunConfig;
      const preview: {
        strategy: { themes: any[]; objectives: any[]; keyResults: any[] };
        delivery: { epics: any[]; features: any[]; stories: any[]; tasks: any[] };
        release: { releases: any[]; releaseWindows: any[] };
        quality: { incidents: any[]; defects: any[] };
        structure: { programs: any[]; projects: any[] };
      } = {
        strategy: { themes: [], objectives: [], keyResults: [] },
        delivery: { epics: [], features: [], stories: [], tasks: [] },
        release: { releases: [], releaseWindows: [] },
        quality: { incidents: [], defects: [] },
        structure: { programs: [], projects: [] },
      };

      let totalSteps = 0;
      let currentStep = 0;

      // Count total items to generate
      if (config.strategy) {
        totalSteps += (config.strategy.themes || 0) + (config.strategy.objectives || 0) + (config.strategy.keyResults || 0);
      }
      if (config.delivery) {
        totalSteps += (config.delivery.epics || 0) + (config.delivery.features || 0) + (config.delivery.stories || 0) + (config.delivery.tasks || 0);
      }
      if (config.release) {
        totalSteps += (config.release.releases || 0) + (config.release.releaseWindows || 0);
      }
      if (config.quality) {
        totalSteps += (config.quality.incidents || 0) + (config.quality.defects || 0);
      }

      const updateProgress = async (step: string) => {
        currentStep++;
        const progress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 100;
        await supabase
          .from("mock_runs")
          .update({ progress, current_step: step })
          .eq("id", runId);
      };

      // Generate placeholder preview data (actual generation would use AI/templates)
      const generateKey = async (prefix: string) => {
        const { data } = await supabase.rpc("allocate_mock_key", { p_prefix: prefix });
        return data || `${prefix}-${Date.now()}`;
      };

      // Generate structure
      if (config.structure?.program) {
        preview.structure.programs = [{ key: await generateKey("PRG"), name: config.structure.program, status: "Active" }];
      }
      if (config.structure?.project) {
        preview.structure.projects = [{ key: await generateKey("PRJ"), name: config.structure.project, status: "Active" }];
      }

      // Generate strategy items
      for (let i = 0; i < (config.strategy?.themes || 0); i++) {
        await updateProgress(`Generating theme ${i + 1}`);
        preview.strategy.themes.push({
          key: await generateKey("THM"),
          title: `Theme ${i + 1}`,
          status: "Draft",
        });
      }

      for (let i = 0; i < (config.strategy?.objectives || 0); i++) {
        await updateProgress(`Generating objective ${i + 1}`);
        preview.strategy.objectives.push({
          key: await generateKey("OBJ"),
          title: `Objective ${i + 1}`,
          status: "Draft",
        });
      }

      // Generate delivery items
      for (let i = 0; i < (config.delivery?.epics || 0); i++) {
        await updateProgress(`Generating epic ${i + 1}`);
        preview.delivery.epics.push({
          key: await generateKey("EPC"),
          title: `Epic ${i + 1}`,
          status: "New",
        });
      }

      for (let i = 0; i < (config.delivery?.features || 0); i++) {
        await updateProgress(`Generating feature ${i + 1}`);
        preview.delivery.features.push({
          key: await generateKey("FTR"),
          title: `Feature ${i + 1}`,
          status: "New",
        });
      }

      for (let i = 0; i < (config.delivery?.stories || 0); i++) {
        await updateProgress(`Generating story ${i + 1}`);
        preview.delivery.stories.push({
          key: await generateKey("STY"),
          title: `Story ${i + 1}`,
          status: "Backlog",
        });
      }

      // Generate quality items
      for (let i = 0; i < (config.quality?.incidents || 0); i++) {
        await updateProgress(`Generating incident ${i + 1}`);
        preview.quality.incidents.push({
          key: await generateKey("INC"),
          title: `Incident ${i + 1}`,
          severity: "Medium",
          status: "Open",
        });
      }

      for (let i = 0; i < (config.quality?.defects || 0); i++) {
        await updateProgress(`Generating defect ${i + 1}`);
        preview.quality.defects.push({
          key: await generateKey("DEF"),
          title: `Defect ${i + 1}`,
          severity: "Medium",
          status: "New",
        });
      }

      // Generate release items
      for (let i = 0; i < (config.release?.releases || 0); i++) {
        await updateProgress(`Generating release ${i + 1}`);
        preview.release.releases.push({
          key: await generateKey("REL"),
          name: `Release ${i + 1}`,
          status: "Planning",
        });
      }

      // Calculate link health
      const linkHealth = {
        total: Object.values(preview).flatMap(cat => Object.values(cat).flat()).length,
        linked: 0,
        orphaned: 0,
        healthy: true,
      };

      // Save preview
      await supabase
        .from("mock_run_preview")
        .upsert({
          run_id: runId,
          preview_json: preview,
          link_health_json: linkHealth,
        });

      // Update status to previewing
      await supabase
        .from("mock_runs")
        .update({ status: "previewing", progress: 100, current_step: "Preview ready" })
        .eq("id", runId);

      return new Response(JSON.stringify({ success: true, preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /runs/:id/preview - Get preview data
    if (req.method === "GET" && resource === "runs" && runId && action === "preview") {
      const { data, error } = await supabase
        .from("mock_run_preview")
        .select("*")
        .eq("run_id", runId)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /runs/:id/load - Load data into Catalyst
    if (req.method === "POST" && resource === "runs" && runId && action === "load") {
      await supabase
        .from("mock_runs")
        .update({ status: "loading", progress: 0, current_step: "Starting load..." })
        .eq("id", runId);

      // Get preview data
      const { data: preview } = await supabase
        .from("mock_run_preview")
        .select("preview_json")
        .eq("run_id", runId)
        .single();

      if (!preview) {
        return new Response(JSON.stringify({ error: "No preview data found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // TODO: Implement actual loading logic to insert into real tables
      // For now, just simulate progress
      await supabase
        .from("mock_runs")
        .update({ progress: 50, current_step: "Loading entities..." })
        .eq("id", runId);

      await supabase
        .from("mock_runs")
        .update({ status: "loaded", progress: 100, current_step: "Load complete" })
        .eq("id", runId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /runs/:id/cleanup - Cleanup loaded data
    if (req.method === "POST" && resource === "runs" && runId && action === "cleanup") {
      const body = await req.json();
      const includeRelated = body.includeRelated || false;

      await supabase
        .from("mock_runs")
        .update({ status: "cleaning", progress: 0, current_step: "Starting cleanup..." })
        .eq("id", runId);

      // Get entity map
      const { data: entities } = await supabase
        .from("mock_run_entity_map")
        .select("*")
        .eq("run_id", runId);

      const totalEntities = entities?.length || 0;
      let cleaned = 0;

      // TODO: Implement actual cleanup logic
      // For each entity type, delete or soft-delete based on table schema

      await supabase
        .from("mock_runs")
        .update({ 
          status: "cleaned", 
          progress: 100, 
          current_step: `Cleanup complete - ${cleaned} entities removed` 
        })
        .eq("id", runId);

      // Clear entity map
      await supabase
        .from("mock_run_entity_map")
        .delete()
        .eq("run_id", runId);

      return new Response(JSON.stringify({ success: true, cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /keys/allocate - Allocate keys
    if (req.method === "POST" && resource === "keys" && action === "allocate") {
      const { prefix, count = 1 } = await req.json();
      
      // Use upsert to get or create sequence
      const { data: seq } = await supabase
        .from("key_sequences")
        .upsert({ prefix, next_value: 1 }, { onConflict: "prefix" })
        .select()
        .single();

      const startValue = seq?.next_value || 1;
      
      // Update sequence
      await supabase
        .from("key_sequences")
        .update({ next_value: startValue + count })
        .eq("prefix", prefix);

      const keys = [];
      for (let i = 0; i < count; i++) {
        keys.push(`${prefix}-${String(startValue + i).padStart(6, "0")}`);
      }

      return new Response(JSON.stringify({ keys }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("Mock data API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
