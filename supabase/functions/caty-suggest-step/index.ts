import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { test_case_title, test_case_description, existing_steps } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const stepsText = (existing_steps || [])
      .map((s: any, i: number) => `${i + 1}. Action: ${s.action} | Expected: ${s.expected_result}`)
      .join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You are CATY AI™, suggesting the next logical test step. Be specific and actionable." },
          { role: "user", content: `Test case: ${test_case_title}\n${test_case_description ? `Description: ${test_case_description}` : ""}\n\nExisting steps:\n${stepsText}\n\nSuggest the next step. Respond ONLY with JSON (no markdown):\n{"action": "...", "expected_result": "...", "test_data": null, "confidence": 0.8}` },
        ],
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const suggestion = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return new Response(JSON.stringify({ suggested_step: suggestion }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("caty-suggest-step error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
