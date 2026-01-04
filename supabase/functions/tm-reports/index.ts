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
    const reportType = pathParts[pathParts.indexOf("reports") + 1];

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

    // GET /projects/:projectId/reports/traceability
    if (reportType === "traceability") {
      const { data: summary } = await supabaseClient
        .from("v_tm_traceability_summary")
        .select("*")
        .eq("project_id", projectId)
        .single();

      // Get folder coverage
      const { data: folders } = await supabaseClient
        .from("tm_folders")
        .select(`
          id, name, path, case_count,
          cases:tm_test_cases(
            id, status,
            executions:tm_cycle_scope(current_status)
          )
        `)
        .eq("project_id", projectId);

      const folderCoverage = (folders || []).map((f: any) => {
        const totalCases = f.cases?.length || 0;
        const executedCases = f.cases?.filter((c: any) => 
          c.executions?.some((e: any) => e.current_status !== "not_run")
        ).length || 0;
        const passedCases = f.cases?.filter((c: any) =>
          c.executions?.some((e: any) => e.current_status === "passed")
        ).length || 0;

        return {
          folder_id: f.id,
          folder_name: f.name,
          folder_path: f.path,
          total_cases: totalCases,
          executed_cases: executedCases,
          passed_cases: passedCases,
          coverage_percent: totalCases > 0 ? Math.round((executedCases / totalCases) * 100) : 0,
          pass_rate: executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0,
        };
      });

      return new Response(JSON.stringify({ 
        data: {
          summary,
          folder_coverage: folderCoverage,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/reports/execution
    if (reportType === "execution") {
      const cycleId = url.searchParams.get("cycleId");
      const fromDate = url.searchParams.get("from");
      const toDate = url.searchParams.get("to");

      let query = supabaseClient
        .from("tm_test_cycles")
        .select(`
          id, cycle_key, name, status,
          planned_start, planned_end, actual_start, actual_end,
          total_cases, passed_count, failed_count, blocked_count, skipped_count, not_run_count,
          environment:tm_environments(name)
        `)
        .eq("project_id", projectId);

      if (cycleId) {
        query = query.eq("id", cycleId);
      }
      if (fromDate) {
        query = query.gte("planned_start", fromDate);
      }
      if (toDate) {
        query = query.lte("planned_end", toDate);
      }

      const { data: cycles, error } = await query.order("planned_start", { ascending: false });

      if (error) throw error;

      // Calculate metrics
      const executionData = (cycles || []).map((c: any) => {
        const executed = c.passed_count + c.failed_count + c.blocked_count + c.skipped_count;
        return {
          ...c,
          progress_percent: c.total_cases > 0 ? Math.round((executed / c.total_cases) * 100) : 0,
          pass_rate: executed > 0 ? Math.round((c.passed_count / executed) * 100) : 0,
          fail_rate: executed > 0 ? Math.round((c.failed_count / executed) * 100) : 0,
        };
      });

      // Get by-assignee breakdown
      const { data: byAssignee } = await supabaseClient
        .from("v_tm_execution_by_assignee")
        .select("*")
        .eq("project_id", projectId);

      return new Response(JSON.stringify({ 
        data: {
          cycles: executionData,
          by_assignee: byAssignee,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/reports/burndown
    if (reportType === "burndown") {
      const cycleId = url.searchParams.get("cycleId");

      if (!cycleId) {
        return new Response(JSON.stringify({ error: "cycleId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get cycle details
      const { data: cycle } = await supabaseClient
        .from("tm_test_cycles")
        .select("*")
        .eq("id", cycleId)
        .single();

      if (!cycle) {
        return new Response(JSON.stringify({ error: "Cycle not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get test runs with timestamps
      const { data: runs } = await supabaseClient
        .from("tm_test_runs")
        .select(`
          completed_at, status,
          cycle_scope:tm_cycle_scope!inner(cycle_id)
        `)
        .eq("cycle_scope.cycle_id", cycleId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      // Build burndown data
      const startDate = new Date(cycle.actual_start || cycle.planned_start);
      const endDate = new Date(cycle.actual_end || cycle.planned_end || new Date());
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const burndownData: any[] = [];
      let remaining = cycle.total_cases;
      const idealBurnRate = cycle.total_cases / (totalDays || 1);

      for (let day = 0; day <= totalDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);
        const dateStr = currentDate.toISOString().split("T")[0];

        // Count completed on this day
        const completedToday = (runs || []).filter((r: any) => 
          r.completed_at?.startsWith(dateStr) && 
          ["passed", "failed", "skipped"].includes(r.status)
        ).length;

        remaining -= completedToday;

        burndownData.push({
          date: dateStr,
          remaining: Math.max(0, remaining),
          ideal: Math.max(0, Math.round(cycle.total_cases - (idealBurnRate * day))),
          completed_today: completedToday,
        });
      }

      return new Response(JSON.stringify({ 
        data: {
          cycle,
          burndown: burndownData,
          total_cases: cycle.total_cases,
          current_remaining: cycle.not_run_count,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /projects/:projectId/reports/defect-impact
    if (reportType === "defect-impact") {
      // Get defects with linked cases
      const { data: defects } = await supabaseClient
        .from("tm_defects")
        .select(`
          id, defect_key, title, severity, status, created_at,
          links:tm_defect_links(
            test_run:tm_test_runs(
              cycle_scope:tm_cycle_scope(
                test_case:tm_test_cases(id, case_key, title, folder_id),
                cycle:tm_test_cycles(id, cycle_key, name)
              )
            )
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      // Aggregate by severity
      const bySeverity = {
        critical: (defects || []).filter((d: any) => d.severity === "critical").length,
        major: (defects || []).filter((d: any) => d.severity === "major").length,
        minor: (defects || []).filter((d: any) => d.severity === "minor").length,
        trivial: (defects || []).filter((d: any) => d.severity === "trivial").length,
      };

      // Aggregate by status
      const byStatus = {
        open: (defects || []).filter((d: any) => d.status === "open").length,
        in_progress: (defects || []).filter((d: any) => d.status === "in_progress").length,
        resolved: (defects || []).filter((d: any) => d.status === "resolved").length,
        closed: (defects || []).filter((d: any) => d.status === "closed").length,
      };

      // Get affected test cases
      const affectedCases = new Set<string>();
      (defects || []).forEach((d: any) => {
        d.links?.forEach((l: any) => {
          const caseId = l.test_run?.cycle_scope?.test_case?.id;
          if (caseId) affectedCases.add(caseId);
        });
      });

      // Trend over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const trend: any[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        
        const openedOnDay = (defects || []).filter((d: any) => 
          d.created_at?.startsWith(dateStr)
        ).length;

        trend.push({ date: dateStr, opened: openedOnDay });
      }

      return new Response(JSON.stringify({ 
        data: {
          summary: {
            total_defects: defects?.length || 0,
            open_defects: byStatus.open,
            affected_test_cases: affectedCases.size,
          },
          by_severity: bySeverity,
          by_status: byStatus,
          defects: defects?.slice(0, 50), // Top 50 recent
          trend,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown report type" }), {
      status: 404,
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
