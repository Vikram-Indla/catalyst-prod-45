import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all releases
    const { data: releases, error: relError } = await supabase
      .from("releases")
      .select(`
        id, name, version, status, health_score, start_date, target_date,
        progress, test_cases_total, test_cases_passed, test_cases_failed,
        defects_open, blocker_defects, critical_defects, major_defects,
        coverage_percent, total_gates, passing_gates, scope_creep_percent,
        owner:profiles!releases_owner_id_fkey(full_name)
      `)
      .is("deleted_at", null)
      .order("health_score", { ascending: true });

    if (relError) throw relError;

    const enriched = (releases || []).map((r: any) => ({
      name: r.name,
      version: r.version,
      status: r.status,
      health_score: r.health_score ?? 50,
      target_date: r.target_date,
      progress: r.progress ?? 0,
      passed_tests: r.test_cases_passed ?? 0,
      failed_tests: r.test_cases_failed ?? 0,
      total_tests: r.test_cases_total ?? 0,
      open_defects: r.defects_open ?? 0,
      blocker_defects: r.blocker_defects ?? 0,
      critical_defects: r.critical_defects ?? 0,
      major_defects: r.major_defects ?? 0,
      coverage_percent: r.coverage_percent ?? 0,
      total_gates: r.total_gates ?? 0,
      passing_gates: r.passing_gates ?? 0,
      scope_creep_percent: r.scope_creep_percent ?? 0,
      days_until_target: r.target_date
        ? Math.ceil((new Date(r.target_date).getTime() - Date.now()) / 86400000)
        : 999,
      owner_name: r.owner?.full_name || null,
    }));

    const systemPrompt = `You are the Catalyst Release Intelligence Engine analyzing release portfolios for an enterprise.

RULES:
- Be specific: cite release names, exact numbers, dates
- Be actionable: every insight must have a concrete recommendation
- Prioritize by severity: blockers first, then overdue, then quality gaps
- Never hallucinate data — only reference what is provided
- Respond in valid JSON ONLY, no markdown`;

    const userMessage = `Analyze this release portfolio (${enriched.length} releases) as of ${new Date().toISOString().split("T")[0]}:

${JSON.stringify(enriched, null, 2)}

Return JSON with:
{
  "action_required": [{ "release_name": "...", "title": "...", "description": "...", "recommendation": "...", "estimated_impact": "..." }],
  "items_to_watch": [same structure],
  "positive_signals": [same structure],
  "recommendations": [{ "title": "...", "description": "...", "estimated_impact": "..." }]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) throw new Error("No response from AI");

    // Parse JSON — strip markdown fences if present
    const cleanJson = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const insights = JSON.parse(cleanJson);

    return new Response(
      JSON.stringify({
        ...insights,
        model: "google/gemini-3-flash-preview",
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Release AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
