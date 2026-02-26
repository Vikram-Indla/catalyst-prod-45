import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { department, weekStart, weekEnd, weekNumber, weekRange, transitions, stats, resourceSummary } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a Senior Project Manager writing a weekly STEERCOM briefing for the ${department} department. You have ${transitions.length} status transitions across resources for Week ${weekNumber} (${weekRange}).

VOICE: Write like you are presenting to a Steering Committee of CIOs. Every sentence states a fact, quantifies impact, and surfaces the "so what". Use: "batch-resolved", "commenced work", "cycle time", "closure rate", "sprint velocity", "backlog hygiene". Never use casual praise. Quantify everything.

GENERATE THREE SECTIONS:

═══ SECTION 1: WEEKLY DIGEST ═══
Generate exactly 15 bullets — 3 per working day (SUN, MON, TUE, WED, THU).
For each day, pick the 3 MOST significant events from that day's transitions.
Prioritize: burst closures → blocked/escalated items → notable individual closures → velocity anomalies → new work picked up.

Each bullet has:
- number: sequential 01–15
- day: "SUN"/"MON"/"TUE"/"WED"/"THU"
- dayIndex: 0–4
- hub: short label ("INC"/"PRD"/"PRJ"/"TST"/"REL"/"OTHER")
- hubCss: "hub-inc"/"hub-prd"/"hub-prj"/"hub-tst"/"hub-rel"/"hub-oth"
- signal: null | "risk" | "esc" | "action" | "gap" | "observe"
- signalLabel: null | "RISK" | "ESCALATION" | "ACTION REQUIRED" | "DELIVERY GAP" | "OBSERVATION"
- body: HTML string with inline spans:
  - <span class="di-ev-actor">Name</span> for people
  - <span class="di-ev-tk">BAU-1234</span> for tickets
  - <span class="di-ev-st s-done">Done</span> for statuses (use s-done/s-prog/s-rev/s-blk/s-qa/s-todo/s-reopen)

═══ SECTION 2: EXECUTIVE SUMMARY ═══
Generate:
- closureRate: number (e.g. 26.7)
- closureNumerator: number
- closureDenominator: number
- topContributor: string (name)
- topContributorPct: number
- wentWell: string[] (exactly 3 items, HTML allowed with <strong>)
- requiresAttention: string[] (exactly 3 items, HTML allowed with <strong> and status spans)
- hubStatus: array of { hub, stat, rag } where rag is "g"/"a"/"r"

Hub RAG logic:
- GREEN: closure rate ≥70%, no blockers, stable backlog
- AMBER: closure 40–69%, OR any blocker, OR single-resource dependency
- RED: closure <40%, OR stalled ≥2 weeks, OR multiple blockers

═══ SECTION 3: RECOMMENDATIONS ═══
Generate exactly 5 recommendation cards:
- number: 1–5
- title: short action title
- description: 1–2 sentences explaining why and what to do
- priority: "high" | "medium"

Sort by priority descending (high items first).

OUTPUT: Return ONLY valid JSON (no markdown, no code fences):
{
  "digest": [ { "number": 1, "day": "SUN", "dayIndex": 0, "hub": "INC", "hubCss": "hub-inc", "signal": null, "signalLabel": null, "body": "..." } ],
  "summary": { "closureRate": 26.7, "closureNumerator": 51, "closureDenominator": 191, "topContributor": "Name", "topContributorPct": 49, "wentWell": ["..."], "requiresAttention": ["..."], "hubStatus": [{ "hub": "IncidentHub", "stat": "...", "rag": "g" }] },
  "recommendations": [ { "number": 1, "title": "...", "description": "...", "priority": "high" } ]
}`;

    const userPrompt = `Here are the ${transitions.length} transitions for ${department}, Week ${weekNumber} (${weekRange}):

Stats: ${stats.transitions} transitions, ${stats.closed} closed, ${stats.inReview} in review, ${stats.activeResources} active resources.

PER-RESOURCE BREAKDOWN (every person MUST appear in the briefing):
${resourceSummary || 'No resource summary available.'}

Transitions data:
${JSON.stringify(transitions, null, 0)}

Generate the full 3-section STEERCOM briefing now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 10000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      parsed = { digest: [], summary: null, recommendations: [] };
    }

    // Cache
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    await sb.from("r360_ai_cache").upsert({
      scope_type: "department",
      scope_id: department,
      section: "dept_intel_v4",
      week_start: weekStart,
      data: parsed,
      status: "fresh",
      computed_at: new Date().toISOString(),
      is_stale: false,
    }, { onConflict: "scope_type,scope_id,section,week_start" });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("r360-dept-intelligence-v4 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
