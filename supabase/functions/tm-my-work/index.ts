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
    const isStats = pathParts.includes("stats");

    // Filters
    const status = url.searchParams.get("status");
    const cycleId = url.searchParams.get("cycleId");
    const urgency = url.searchParams.get("urgency");
    const projectId = url.searchParams.get("projectId");

    // GET /users/me/work/stats
    if (req.method === "GET" && isStats) {
      let query = supabaseClient
        .from("tm_cycle_scope")
        .select(`
          id, current_status, assigned_to,
          cycle:tm_test_cycles!inner(
            id, status, planned_end, project_id,
            project:tm_projects(id, name)
          )
        `)
        .eq("assigned_to", user.id)
        .in("cycle.status", ["planned", "in_progress"]);

      if (projectId) {
        query = query.eq("cycle.project_id", projectId);
      }

      const { data: items, error } = await query;

      if (error) throw error;

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const twoDaysLater = new Date(now);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);

      let overdue = 0, dueToday = 0, dueSoon = 0, onTrack = 0;
      let notRun = 0, inProgress = 0, passed = 0, failed = 0, blocked = 0;

      (items || []).forEach((item: any) => {
        const plannedEnd = item.cycle?.planned_end ? new Date(item.cycle.planned_end) : null;
        
        // Status counts
        if (item.current_status === "not_run") notRun++;
        else if (item.current_status === "in_progress") inProgress++;
        else if (item.current_status === "passed") passed++;
        else if (item.current_status === "failed") failed++;
        else if (item.current_status === "blocked") blocked++;

        // Urgency counts (only for incomplete items)
        if (["not_run", "in_progress", "blocked"].includes(item.current_status)) {
          if (plannedEnd) {
            if (plannedEnd < now) overdue++;
            else if (plannedEnd.toDateString() === now.toDateString()) dueToday++;
            else if (plannedEnd < twoDaysLater) dueSoon++;
            else onTrack++;
          } else {
            onTrack++;
          }
        }
      });

      return new Response(JSON.stringify({
        data: {
          total: items?.length || 0,
          by_status: { not_run: notRun, in_progress: inProgress, passed, failed, blocked },
          by_urgency: { overdue, due_today: dueToday, due_soon: dueSoon, on_track: onTrack },
          pending: notRun + inProgress + blocked,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /users/me/work
    if (req.method === "GET" && !isStats) {
      let query = supabaseClient
        .from("tm_cycle_scope")
        .select(`
          id, current_status, sort_order, added_at,
          test_case:tm_test_cases(
            id, case_key, title, status,
            priority:tm_case_priorities(name, color),
            folder:tm_folders(name)
          ),
          cycle:tm_test_cycles!inner(
            id, cycle_key, name, status, planned_start, planned_end,
            project:tm_projects(id, key, name),
            environment:tm_environments(name)
          )
        `)
        .eq("assigned_to", user.id)
        .in("cycle.status", ["planned", "in_progress"]);

      if (status) {
        query = query.eq("current_status", status);
      } else {
        // By default, show incomplete items only
        query = query.in("current_status", ["not_run", "in_progress", "blocked"]);
      }

      if (cycleId) {
        query = query.eq("cycle.id", cycleId);
      }

      if (projectId) {
        query = query.eq("cycle.project_id", projectId);
      }

      const { data: items, error } = await query;

      if (error) throw error;

      const now = new Date();
      const twoDaysLater = new Date(now);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);

      // Enrich with urgency
      let enrichedItems = (items || []).map((item: any) => {
        const plannedEnd = item.cycle?.planned_end ? new Date(item.cycle.planned_end) : null;
        let itemUrgency = "on_track";

        if (plannedEnd) {
          if (plannedEnd < now) itemUrgency = "overdue";
          else if (plannedEnd.toDateString() === now.toDateString()) itemUrgency = "due_today";
          else if (plannedEnd < twoDaysLater) itemUrgency = "due_soon";
        }

        return {
          ...item,
          urgency: itemUrgency,
        };
      });

      // Filter by urgency if specified
      if (urgency) {
        enrichedItems = enrichedItems.filter((item: any) => item.urgency === urgency);
      }

      // Sort by urgency (overdue first, then due_today, due_soon, on_track)
      const urgencyOrder: Record<string, number> = { overdue: 0, due_today: 1, due_soon: 2, on_track: 3 };
      enrichedItems.sort((a: any, b: any) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

      // Group by cycle
      const grouped = enrichedItems.reduce((acc: any, item: any) => {
        const cycleKey = item.cycle?.id;
        if (!acc[cycleKey]) {
          acc[cycleKey] = {
            cycle: item.cycle,
            items: [],
          };
        }
        acc[cycleKey].items.push(item);
        return acc;
      }, {});

      return new Response(JSON.stringify({
        data: {
          items: enrichedItems,
          grouped: Object.values(grouped),
          total: enrichedItems.length,
        }
      }), {
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
