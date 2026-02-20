import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const m = metrics;

    const prompt = `You are an AI strategy intelligence analyst for Saudi Arabia's Ministry of Industry.

CHAIN: ${m.themeName} (${m.themeKey}) → ${m.goalTitle} (${m.goalKey}) → ${m.krs?.length || 0} KRs → ${m.initiativeKey || 'NO INITIATIVE'} → ${m.epicKey || 'NO EPIC'}

METRICS:
- AI Health Score: ${m.goalHealth}/100
- Goal Progress: ${m.goalProgress}%
- Schedule: ${m.scheduleDriftDays > 0 ? m.scheduleDriftDays + ' days ahead' : Math.abs(m.scheduleDriftDays) + ' days behind'}
- Weakest Link: ${m.weakestNode?.key} at ${m.weakestNode?.progress}% (${m.weakestNode?.status})
- On-Time Confidence: ${m.confidencePct}%
- Stories: ${m.storiesDone}/${m.storiesTotal} done, ${m.storiesInProd} in production, ${m.storiesBlocked} blocked
- Velocity: ${m.velocityPerWeek} stories/wk (need ${m.neededVelocity}/wk)
- Scope: ${m.scopeClean ? 'No changes' : (m.scopeChanges?.length || 0) + ' late additions'}
- Epic Cycle: ${m.epicCycleDays} days elapsed
- Avg Story Cycle: ${m.avgStoryCycleDays} days
- Avg Defect Cycle: ${m.avgDefectCycleDays} days
- KRs: ${m.krs?.map((k: any) => k.key + ' ' + k.progress + '% (' + k.status + ')').join(', ') || 'None'}
- Strategy-to-Execution Lag: ${m.strategyToExecutionDays} days
- Linkage Lag: ${m.linkageLagDays} days
${!m.initiativeKey ? '- ⚠ NO INITIATIVE LINKED (execution gap)' : ''}
${!m.epicKey ? '- ⚠ NO EPIC LINKED (delivery gap)' : ''}

TASK — Generate 4 contextual insights and 3 risk signals.

1. STRATEGY INSIGHT (2-3 sentences): Assess the strategic theme and goal health. Comment on the overall chain from strategy to execution. Reference the health score, goal progress, and KR performance.

2. INITIATIVE INSIGHT (2-3 sentences): Assess the initiative's progress and its linkage to KRs. Comment on the delivery timeline and any gaps between strategy definition and execution start. If no initiative linked, highlight this as a critical gap.

3. EPIC & STORIES INSIGHT (2-3 sentences): Assess the epic's story completion rate, production deployment status, and cycle times. If no epic is linked, highlight this as a critical delivery gap.

4. OPERATIONS INSIGHT (2-3 sentences): Assess defect rates, people allocation, scope changes, and velocity. If there are blocked stories or open defects, call them out specifically.

5. RISK SIGNALS (3 items, 1 sentence each): Signal 1 = highest risk (red), Signal 2 = watch item (yellow), Signal 3 = positive (green). Use specific numbers.

Return ONLY valid JSON, no markdown, no backticks:
{"strategyInsight":"...","initiativeInsight":"...","epicInsight":"...","operationsInsight":"...","riskSignals":["...","...","..."]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a strategy intelligence AI. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const clean = content.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({
        strategyInsight: content.slice(0, 300),
        initiativeInsight: '',
        epicInsight: '',
        operationsInsight: '',
        riskSignals: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("strategy-intelligence error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      strategyInsight: "AI analysis could not be generated.",
      initiativeInsight: '',
      epicInsight: '',
      operationsInsight: '',
      riskSignals: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
