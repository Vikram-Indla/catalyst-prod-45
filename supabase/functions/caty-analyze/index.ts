import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, user_id, scope } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let query = supabase.from("tm_test_cases").select("id, title, description, priority:tm_case_priorities(name), folder:tm_folders(name)").eq("project_id", project_id);
    if (scope?.folderId) query = query.eq("folder_id", scope.folderId);
    const { data: testCases } = await query.limit(100);

    const summary = testCases?.map((tc: any) => `- ${tc.title} (${tc.priority?.name || "N/A"}) [${tc.folder?.name || "No folder"}]`).join("\n") || "No test cases found";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are CATY AI™, a test coverage analysis expert. Identify gaps and provide actionable recommendations." },
          { role: "user", content: `Analyze these ${testCases?.length || 0} test cases for coverage gaps:\n\n${summary}\n\nRespond ONLY with JSON (no markdown fences):\n{"coverage_score": 0-100, "gaps": [{"area": "...", "module": null, "description": "...", "severity": "critical|high|medium|low", "recommendation": "...", "estimated_effort": "low|medium|high"}], "summary": "...", "top_recommendation": "..."}` },
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limited" : "Credits exhausted" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { coverage_score: 0, gaps: [], summary: "Analysis failed" };

    await supabase.from("caty_analytics").insert({
      project_id, user_id,
      event_type: "coverage_analyzed",
      event_data: { test_case_count: testCases?.length, gaps_found: result.gaps?.length, coverage_score: result.coverage_score },
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("caty-analyze error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
