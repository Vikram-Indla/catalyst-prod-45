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
    const themeLines = (m.themes || [])
      .map((t: any) => `  ${t.key} ${t.name} — ${t.status} — ${t.progress}%`)
      .join("\n");

    const prompt = `You are a CIO-grade strategy analyst for Saudi Arabia's Ministry of Industry. Analyze this portfolio and produce a Steercom-grade executive brief.

PORTFOLIO DATA:
- ${m.totalThemes} strategic themes (${m.activeThemes} active)
- ${m.totalGoals} goals: ${m.goalsOnTrack} on track, ${m.goalsAtRisk} at risk, ${m.goalsOffTrack} off track. Avg progress: ${m.avgGoalProgress}%
- ${m.totalKRs} key results: avg progress ${m.avgKRProgress}%, ${m.krsAbove80} above 80%, ${m.krsBelow40} below 40%
- ${m.totalWorkItems} work items, ${m.orphanedWorkItems} orphaned (no strategic link), ${m.avgAlignment}% aligned
- ${m.totalPeople} people, ${m.overAllocated} over-allocated
- ${m.totalRisks} risks: ${m.criticalRisks} critical, ${m.overdueRisks} overdue, ${m.resolvedRisks} resolved, ${m.mitigatedRisks} mitigated, ${m.ownedRisks} owned, ${m.acceptedRisks} accepted
- AI Health Score: ${m.aiHealthScore}/100

THEMES:
${themeLines}

GENERATE exactly this JSON structure:

1. "verdict": Letter grade (A+ to F), score 0-100, headline (max 15 words, hard-hitting), detail (2 sentences with specific numbers).

2. "chainDials": Array of exactly 6 objects. Each link in the strategy-to-execution chain:
   - Themes → Goals, Goals → Key Results, KRs → Work Items, Work → People, People → Budget, Budget → Risk
   - Each: label, metric (key number), unit, barPct (0-100), rag ("red"/"amber"/"green"), tell (1 factual line), insight (2 analytical sentences).

3. "contradictions": Array of 3-4 cross-data anomalies. Each: finding (the contradiction), implication (what it means), source (which data sources).

4. "decisions": Array of 2-4 decisions for the CIO. Each: id ("D1"/"D2"/etc), priority ("CRITICAL"/"HIGH"), ask (specific action), rationale (why), evidence (array of 3-4 data points as strings), deadline, owner.

5. "recovery": Array of exactly 3 time horizons. Each: horizon ("Week 1-2"/"Month 1"/"Month 2-3"), tag ("STOP THE BLEEDING"/"RESTORE GOVERNANCE"/"ACCELERATE RESULTS"), ragColor ("red"/"amber"/"green"), actions (array of 2-3 action strings).

6. "dataTrust": level ("HIGH"/"MODERATE"/"MODERATE-LOW"/"LOW"), sourcesUsed (number), gaps (number), note (1 sentence about data quality).

Return ONLY valid JSON. No markdown, no explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a CIO strategy analyst. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
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
    const content = data.choices?.[0]?.message?.content || "";
    const clean = content.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content.slice(0, 500) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("executive-brief error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
