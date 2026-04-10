import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IMPROVE_INSTRUCTIONS: Record<string, string> = {
  improve_clarify: "Rewrite for clarity, fix grammar, add missing detail",
  expand_detail: "Expand into a full story with context and examples",
  add_acceptance_criteria: "Generate Given/When/Then acceptance criteria",
  convert_user_story:
    'Rewrite as "As a [user], I want [action], so that [benefit]"',
  shorten_focus: "Shorten, remove redundancy, sharpen scope",
  add_edge_cases:
    "Add edge cases and failure conditions to acceptance criteria",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      improve_type,
      focus_hint,
      current_description,
      current_ac,
      issue_summary,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instruction = IMPROVE_INSTRUCTIONS[improve_type] ?? "Improve and clarify";
    const focusText = focus_hint ? `\nFocus: ${focus_hint}` : "";

    const prompt = `You are a senior business analyst writing requirements for an enterprise portfolio management platform used by the Saudi Ministry of Industry. Write in English. Be precise, professional, and structured. Output ONLY valid JSON with keys "description" and "acceptance_criteria". No markdown fences, no preamble.

Improve type: ${instruction}${focusText}

Story title: ${issue_summary || "(untitled)"}
Current description: ${current_description || "(empty)"}
Current acceptance criteria: ${current_ac || "(none)"}

Return JSON: {"description": "...", "acceptance_criteria": "..."}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a senior business analyst. Return only valid JSON. No markdown fences.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const rawText =
      aiData.choices?.[0]?.message?.content ?? "{}";

    let parsed = { description: "", acceptance_criteria: "" };
    try {
      const clean = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { description: rawText, acceptance_criteria: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-improve-story error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
