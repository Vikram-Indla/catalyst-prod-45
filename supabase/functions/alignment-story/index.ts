import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { chainData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasInitiative = chainData.initiative !== null;
    const hasEpic = chainData.epic !== null;

    const prompt = `You are an AI strategic advisor for the Saudi Arabia Ministry of Industry's digital transformation program. Generate an executive briefing about this strategic alignment chain.

CONTEXT:
- Strategic Theme: "${chainData.theme.name}" (${chainData.theme.key}) — Status: ${chainData.theme.status}, Progress: ${chainData.theme.progress}%
- Goal: "${chainData.goal.title}" (${chainData.goal.key}) — Status: ${chainData.goal.status}, Progress: ${chainData.goal.progress}%${chainData.goal.health != null ? `, AI Health Score: ${chainData.goal.health}/100` : ''}
- Key Results (${chainData.krs.length}):
${chainData.krs.map((kr: any) => `  • ${kr.key}: "${kr.title}" — ${kr.status}, ${kr.progress}% complete`).join('\n')}
${hasInitiative ? `- Initiative: "${chainData.initiative.title}" (${chainData.initiative.key}) — ${chainData.initiative.status}, ${chainData.initiative.progress}% complete` : '- Initiative: NOT YET LINKED (gap in execution chain)'}
${hasEpic ? `- Epic: "${chainData.epic.title}" (${chainData.epic.key}) — ${chainData.epic.status}` : '- Epic: NOT YET LINKED (gap in delivery pipeline)'}

GENERATE AN EXECUTIVE BRIEFING with these EXACT sections. Use markdown formatting:

## Strategic Narrative
Write 2-3 sentences explaining the strategic significance of this chain. Why does this matter for Saudi Arabia's industrial future? Connect it to Vision 2030 where relevant.

## Chain Timeline
Create a chronological summary of how this chain evolved. Use format:
- **[Key]** — [Brief description of what was established and its current state]

## Delivery Summary
In 2-3 sentences, describe what is actually being delivered through this chain. What tangible outcomes will the ministry see?

## Risk Assessment
Based on the status and progress data, identify:
- Current health (use the progress percentages)
- Key risks or blockers
- Whether the chain is on track, at risk, or off track

## Executive Recommendation
One clear, actionable recommendation for the CIO based on this chain's current state.

${!hasInitiative ? '\n## ⚠️ Alignment Gap\nThis chain has NO linked initiative. Explain why this is a critical gap — strategy without execution means this goal may not be delivered.' : ''}
${!hasEpic ? '\n## ⚠️ Delivery Gap\nThis chain has NO linked epic. Explain why this matters — without engineering execution, the initiative remains a plan on paper.' : ''}

RULES:
- Write for a C-level executive. Be concise, authoritative, and specific.
- Reference actual data points (percentages, scores) — do not be vague.
- Keep total length under 400 words.
- Do not use bullet points excessively. Use prose where possible.
- Do not start with "Here is" or "This briefing". Start directly with the narrative.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an executive AI strategic advisor. Generate polished, data-driven briefings." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage." }), {
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
    console.error("alignment-story error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
