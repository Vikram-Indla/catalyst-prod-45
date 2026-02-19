import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId is required");

    // Call the database function that computes all project metrics
    const { data: context, error: dbError } = await supabase.rpc(
      "get_project_ai_context",
      { p_project_id: projectId }
    );

    if (dbError) throw new Error(`Database error: ${dbError.message}`);
    if (context?.error) throw new Error(context.error);

    // Build Gemini prompt with real data
    const systemPrompt = `You are a project management AI analyst for a Saudi government ministry platform called Catalyst.
You analyze project data and provide actionable insights.

RULES:
- Be concise and specific. No filler.
- Reference specific work item keys (like DMA-12) when giving suggestions.
- Output ONLY valid JSON matching the exact schema below. No markdown, no backticks, no explanation outside the JSON.
- All dates in YYYY-MM-DD format.
- Confidence values as integers 0-100.
- Risk impact must be one of: "Low", "Medium", "High", "Critical".

OUTPUT JSON SCHEMA:
{
  "completionForecast": {
    "projectedDate": "YYYY-MM-DD",
    "daysFromTarget": number (positive = late, negative = early, 0 = on target),
    "confidence": number 0-100,
    "reasoning": "1 sentence"
  },
  "blockersSummary": {
    "totalBlocked": number,
    "summary": "1-2 sentences about blocked items and their impact on progress",
    "topBlockers": ["item_key — reason", "item_key — reason"],
    "recommendation": "1 sentence on how to unblock"
  },
  "teamWorkload": {
    "totalAssigned": number,
    "busiestMember": "name (N items)",
    "unassignedCount": number,
    "balance": "Balanced or Uneven or Overloaded",
    "observation": "1 sentence about workload distribution"
  },
  "suggestion": {
    "action": "specific actionable suggestion referencing item keys and team member names",
    "priority": "Low or Medium or High",
    "reason": "1 sentence why"
  }
}`;

    const userContent = `Analyze this project:

PROJECT: ${context.project.name} (${context.project.project_key})
TARGET DATE: ${context.project.target_date || "Not set"}
STATUS: ${context.project.status}

ITEMS: ${context.total_items} total, ${context.done_items} done (${context.completion_percent}%), ${context.remaining_items} remaining

STATUS BREAKDOWN:
${Object.entries(context.status_counts).map(([s, c]) => `  ${s}: ${c}`).join("\n")}

OVERDUE (${context.overdue_count}):
${context.overdue_items.map((i: any) => `  ${i.item_key} — ${i.title} — ${i.days_overdue}d overdue — priority: ${i.priority} — assignee: ${i.assignee}`).join("\n") || "  None"}

BLOCKED (${context.blocked_count}):
${context.blocked_items.map((i: any) => `  ${i.item_key} — ${i.title} — priority: ${i.priority} — assignee: ${i.assignee}`).join("\n") || "  None"}

VELOCITY: Current ${context.velocity_current} items/week, Previous ${context.velocity_previous} items/week

TEAM WORKLOAD:
${context.workload.map((w: any) => `  ${w.name}: ${w.active_items} active items`).join("\n") || "  No data"}`;

    // Call Gemini via Lovable AI Gateway
    const startTime = Date.now();

    const geminiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text();
      console.error("Gemini Gateway error:", geminiResponse.status, errBody);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (geminiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fallback: generate rule-based insights from data when AI is unavailable
      const pct = context.completion_percent || 0;
      const fallback = {
        completionForecast: {
          projectedDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          daysFromTarget: 0,
          confidence: 50,
          reasoning: "AI gateway temporarily unavailable — estimate based on current progress."
        },
        blockersSummary: {
          totalBlocked: context.blocked_count || 0,
          summary: context.blocked_count > 0
            ? `${context.blocked_count} item(s) are currently blocked and may delay progress.`
            : "No blocked items at this time.",
          topBlockers: (context.blocked_items || []).slice(0, 3).map((i: any) => `${i.item_key} — ${i.title}`),
          recommendation: context.blocked_count > 0
            ? "Review and resolve blockers to restore flow."
            : "No action needed."
        },
        teamWorkload: (() => {
          const workload = context.workload || [];
          const totalAssigned = workload.reduce((s: number, w: any) => s + (w.active_items || 0), 0);
          const busiest = workload.length > 0 ? workload.reduce((a: any, b: any) => (b.active_items || 0) > (a.active_items || 0) ? b : a, workload[0]) : null;
          return {
            totalAssigned,
            busiestMember: busiest ? `${busiest.name} (${busiest.active_items} items)` : "N/A",
            unassignedCount: (context.total_items || 0) - totalAssigned,
            balance: totalAssigned === 0 ? "Balanced" : (busiest && busiest.active_items > totalAssigned * 0.5 ? "Overloaded" : "Balanced"),
            observation: workload.length === 0 ? "No workload data available." : `${workload.length} team member(s) with active assignments.`
          };
        })(),
        suggestion: {
          action: context.blocked_count > 0
            ? "Prioritize unblocking items to restore flow."
            : context.overdue_count > 0
            ? "Address overdue items to stay on track."
            : "Continue current pace — project is on track.",
          priority: context.blocked_count > 0 ? "High" : context.overdue_count > 0 ? "Medium" : "Low",
          reason: "Based on current project metrics (AI analysis temporarily unavailable)."
        },
        _meta: {
          model: "rule-based-fallback",
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          dataPoints: {
            totalItems: context.total_items,
            doneItems: context.done_items,
            overdueCount: context.overdue_count,
            blockedCount: context.blocked_count,
          },
        },
      };
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON (strip backticks if Gemini wraps them)
    const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const insights = JSON.parse(cleanJson);

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        ...insights,
        _meta: {
          model: MODEL,
          generatedAt: new Date().toISOString(),
          durationMs: duration,
          dataPoints: {
            totalItems: context.total_items,
            doneItems: context.done_items,
            overdueCount: context.overdue_count,
            blockedCount: context.blocked_count,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("project-ai-insights error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
