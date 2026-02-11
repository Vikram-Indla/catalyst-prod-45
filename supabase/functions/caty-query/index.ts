import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id, question } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch data for context
    const { data: testCases } = await supabase.from("tm_test_cases").select("id, title, priority:tm_case_priorities(name), status").eq("project_id", project_id).limit(200);
    const { data: cycles } = await supabase.from("th_test_cycles").select("id, name, status").eq("project_id", project_id).limit(50);
    const { data: defects } = await supabase.from("tm_defects").select("id, title, severity, status, workflow_status").eq("project_id", project_id).limit(100);

    const totalTests = testCases?.length || 0;
    const statusBreakdown: Record<string, number> = {};
    testCases?.forEach((tc: any) => { statusBreakdown[tc.status] = (statusBreakdown[tc.status] || 0) + 1; });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are CATY AI™, answering questions about test data. Be specific with numbers.\n\nAvailable data:\n- Total test cases: ${totalTests}\n- Status breakdown: ${JSON.stringify(statusBreakdown)}\n- Active cycles: ${cycles?.length || 0}\n- Defects: ${defects?.length || 0}\n\nRespond with JSON (no markdown fences):\n{"answer": "Natural language answer", "metrics": [{"label": "...", "value": "...", "trend": "up|down|neutral", "change": "+5%"}], "visualization": {"type": "bar|pie|table|metric", "data": [{"name": "...", "value": 123}]}}` },
          { role: "user", content: question },
        ],
        max_tokens: 2048,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(JSON.stringify({ answer: "Rate limited. Please try again." }), { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { answer: content };

    await supabase.from("caty_analytics").insert({
      project_id,
      event_type: "query_executed",
      event_data: { question, has_visualization: !!result.visualization },
    });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("caty-query error:", error);
    return new Response(JSON.stringify({ answer: "Sorry, I encountered an error." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
