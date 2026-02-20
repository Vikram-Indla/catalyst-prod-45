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
- Stories: ${m.storiesDone}/${m.storiesTotal} done, ${m.storiesInProd} in production
- Velocity: ${m.velocityPerWeek} stories/wk (need ${m.neededVelocity}/wk)
- Open Defects: ${m.storiesBlocked} blocked items
- Scope: ${m.scopeClean ? 'No changes' : (m.scopeChanges?.length || 0) + ' late additions'}
- Epic Cycle: ${m.epicCycleDays} days elapsed
- Avg Story Cycle: ${m.avgStoryCycleDays} days
- KRs at risk: ${m.krs?.filter((k: any) => k.status === 'At Risk' || k.status === 'Off Track').map((k: any) => k.key).join(', ') || 'None'}
${!m.initiativeKey ? '- ⚠ NO INITIATIVE LINKED (execution gap)' : ''}
${!m.epicKey ? '- ⚠ NO EPIC LINKED (delivery gap)' : ''}

TASK 1 — VERDICT (exactly 2 sentences):
Sentence 1: State whether this chain is ON TRACK, AT RISK, or CRITICAL with the health score and confidence percentage.
Sentence 2: Name the single most important action item citing a specific number.

TASK 2 — RISK SIGNALS (exactly 3 items, each 1 sentence):
Signal 1 (highest risk): The biggest threat with specific numbers.
Signal 2 (watch item): A secondary concern.
Signal 3 (positive): Something going well with specific numbers.

Return ONLY valid JSON, no markdown, no backticks:
{"verdict":"sentence1 sentence2","riskSignals":["signal1","signal2","signal3"]}`;

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
        max_tokens: 500,
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
        verdict: content.slice(0, 300),
        riskSignals: [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("strategy-intelligence error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
      verdict: "AI analysis could not be generated.",
      riskSignals: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
