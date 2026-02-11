/**
 * TestHub QA Assistant — Edge Function
 * Powered by Lovable AI Gateway (Gemini 3 Flash)
 * 
 * Ring-fenced to TestHub data only. Queries actual th_* tables
 * to ground all responses in real project data.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are CATY AI™ — QA Assistant, an executive-level quality intelligence advisor for the TestHub module. You provide polished, manager-ready summaries — not raw data dumps.

YOUR ROLE:
- You are presenting to QA Managers, Test Leads, and Steering Committees.
- Every response must read like a professional management brief — concise, insight-driven, and actionable.
- Lead with the headline insight, then supporting detail, then recommendations.

RESPONSE FORMAT RULES:
1. Start with a one-line executive summary (bold) that captures the key takeaway.
2. Use clear section headers (##) to organize information.
3. Present metrics in context — don't just list numbers, interpret them (e.g., "Pass rate is at 43%, which is below the typical 70% threshold for release readiness").
4. End with "Key Observations" or "Recommendations" where appropriate.
5. Use bullet points for clarity, not markdown tables with raw pipes.
6. Highlight risks and blockers prominently with ⚠️ indicators.
7. Reference trends when data supports it (improving, declining, stable).
8. Keep language professional but accessible — avoid jargon overload.

STRICT SCOPE:
- ONLY answer questions about TestHub data: test cases, cycles, execution, defects, plans, requirements, coverage.
- NEVER answer questions outside TestHub (no capacity planning, HR, finance, or general knowledge).
- If asked something outside scope, say: "I can only provide insights on TestHub quality data — test cases, cycles, defects, execution, and coverage."
- NEVER hallucinate. Only reference the data snapshot provided.
- If data is missing or zero, state it clearly and suggest next steps.

DATA SOURCES:
- th_test_cases, th_test_cycles, th_cycle_test_cases, th_defects
- th_test_plans, th_plan_cycles, th_requirements, th_requirement_tests
- th_shared_steps, th_reports, th_scheduled_reports, daily_execution_stats`;

async function fetchTestHubSnapshot(supabase: any) {
  const snapshot: Record<string, any> = {};

  try {
    // Test case stats
    const { data: cases, count: totalCases } = await supabase
      .from('th_test_cases')
      .select('id, status, priority, assigned_to, folder_id', { count: 'exact', head: false })
      .limit(1000);
    
    if (cases) {
      const statusDist: Record<string, number> = {};
      const priorityDist: Record<string, number> = {};
      const unassigned = cases.filter((c: any) => !c.assigned_to).length;
      cases.forEach((c: any) => {
        statusDist[c.status || 'unknown'] = (statusDist[c.status || 'unknown'] || 0) + 1;
        priorityDist[c.priority || 'unknown'] = (priorityDist[c.priority || 'unknown'] || 0) + 1;
      });
      snapshot.test_cases = { total: totalCases || cases.length, by_status: statusDist, by_priority: priorityDist, unassigned };
    }

    // Active cycles
    const { data: cycles } = await supabase
      .from('th_test_cycles')
      .select('id, name, status, total_cases, passed_count, failed_count, blocked_count, start_date, end_date')
      .limit(50);
    
    if (cycles) {
      const activeCycles = cycles.filter((c: any) => c.status === 'active');
      const completedCycles = cycles.filter((c: any) => c.status === 'completed');
      snapshot.test_cycles = {
        total: cycles.length,
        active: activeCycles.length,
        completed: completedCycles.length,
        active_details: activeCycles.map((c: any) => ({
          name: c.name,
          total: c.total_cases,
          passed: c.passed_count,
          failed: c.failed_count,
          blocked: c.blocked_count,
          pass_rate: c.total_cases ? Math.round((c.passed_count / c.total_cases) * 100) : 0,
        })),
      };
    }

    // Cycle test case assignments (who is assigned what)
    const { data: cycleTests } = await supabase
      .from('th_cycle_test_cases')
      .select('id, status, assigned_to, cycle_id')
      .limit(1000);
    
    if (cycleTests) {
      const byAssignee: Record<string, { total: number; passed: number; failed: number; not_run: number }> = {};
      const unassignedExec = cycleTests.filter((ct: any) => !ct.assigned_to).length;
      cycleTests.forEach((ct: any) => {
        const key = ct.assigned_to || 'unassigned';
        if (!byAssignee[key]) byAssignee[key] = { total: 0, passed: 0, failed: 0, not_run: 0 };
        byAssignee[key].total++;
        if (ct.status === 'passed') byAssignee[key].passed++;
        else if (ct.status === 'failed') byAssignee[key].failed++;
        else if (ct.status === 'not_run') byAssignee[key].not_run++;
      });
      snapshot.execution_assignments = { total_assigned: cycleTests.length, unassigned: unassignedExec, by_assignee: byAssignee };
    }

    // Defects
    const { data: defects } = await supabase
      .from('th_defects')
      .select('id, status, severity, priority, assigned_to, created_at')
      .limit(500);
    
    if (defects) {
      const statusDist: Record<string, number> = {};
      const severityDist: Record<string, number> = {};
      const priorityDist: Record<string, number> = {};
      defects.forEach((d: any) => {
        statusDist[d.status || 'unknown'] = (statusDist[d.status || 'unknown'] || 0) + 1;
        severityDist[d.severity || 'unknown'] = (severityDist[d.severity || 'unknown'] || 0) + 1;
        priorityDist[d.priority || 'unknown'] = (priorityDist[d.priority || 'unknown'] || 0) + 1;
      });
      snapshot.defects = { total: defects.length, by_status: statusDist, by_severity: severityDist, by_priority: priorityDist };
    }

    // Test plans
    const { data: plans } = await supabase
      .from('th_test_plans')
      .select('id, name, status, total_cases, passed_count, progress_percent')
      .limit(20);
    
    if (plans) {
      snapshot.test_plans = {
        total: plans.length,
        details: plans.map((p: any) => ({
          name: p.name,
          status: p.status,
          total_cases: p.total_cases,
          passed: p.passed_count,
          progress: p.progress_percent,
        })),
      };
    }

    // Requirements coverage
    const { data: reqs } = await supabase
      .from('th_requirements')
      .select('id, title, coverage_percent, status')
      .limit(100);
    
    if (reqs) {
      const full = reqs.filter((r: any) => r.coverage_percent === 100).length;
      const partial = reqs.filter((r: any) => r.coverage_percent > 0 && r.coverage_percent < 100).length;
      const none = reqs.filter((r: any) => !r.coverage_percent || r.coverage_percent === 0).length;
      snapshot.requirements = { total: reqs.length, full_coverage: full, partial_coverage: partial, no_coverage: none };
    }

    // Recent execution stats
    const { data: execStats } = await supabase
      .from('daily_execution_stats')
      .select('stat_date, total_executions, passed_count, failed_count, pass_rate, defects_found')
      .order('stat_date', { ascending: false })
      .limit(7);
    
    if (execStats && execStats.length > 0) {
      snapshot.recent_daily_stats = execStats;
    }

  } catch (err) {
    console.error("Error fetching TestHub snapshot:", err);
  }

  return snapshot;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch live data
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch live TestHub data snapshot
    const snapshot = await fetchTestHubSnapshot(supabase);

    // Build context-aware system prompt with live data
    let contextPrompt = SYSTEM_PROMPT;
    contextPrompt += `\n\n--- LIVE TESTHUB DATA SNAPSHOT (as of ${new Date().toISOString()}) ---\n`;
    contextPrompt += JSON.stringify(snapshot, null, 2);

    if (context) {
      contextPrompt += `\n\n--- USER CONTEXT ---`;
      if (context.module) contextPrompt += `\nModule: ${context.module}`;
      if (context.page) contextPrompt += `\nCurrent page: ${context.page}`;
      if (context.projectId) contextPrompt += `\nProject ID: ${context.projectId}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: contextPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("QA AI error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
