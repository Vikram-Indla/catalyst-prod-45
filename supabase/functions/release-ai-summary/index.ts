import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { releaseData, mode } = await req.json();

    if (!releaseData) {
      return new Response(JSON.stringify({ error: "releaseData is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a Release Quality Analyst AI for an enterprise release management platform called Catalyst.
You analyze release metrics and provide actionable insights.

RESPONSE FORMAT: You MUST respond with valid JSON only — no markdown, no code fences.
Return a JSON object with this structure:
{
  "insights": [
    {
      "type": "critical" | "warning" | "positive",
      "message": "Brief insight about the release (1-2 sentences max)",
      "action": "Recommended action (short, actionable phrase)"
    }
  ],
  "recommendations": "A 2-3 paragraph executive summary with specific, actionable recommendations for the release manager. Reference specific metrics and thresholds."
}

Rules:
- Provide 2-5 insights based on the data
- Use "critical" for blockers, failing gates, or dangerous trends
- Use "warning" for metrics approaching thresholds or potential risks
- Use "positive" for healthy metrics and achievements
- Keep messages factual and specific — reference actual numbers
- Recommendations should be strategic and prioritized`;

    const userPrompt = mode === "recommendations"
      ? `Provide detailed strategic recommendations for this release. Focus on risk mitigation, testing strategy, and deployment readiness.

Release data:
${JSON.stringify(releaseData, null, 2)}`
      : `Analyze this release and provide insights:

Release data:
${JSON.stringify(releaseData, null, 2)}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response — strip code fences if present
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response as JSON:", content);
      // Fallback: return a generic insight
      parsed = {
        insights: [
          {
            type: "positive",
            message: "AI analysis complete. Review the release metrics for details.",
            action: "Check quality gates and test coverage",
          },
        ],
        recommendations: content,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("release-ai-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
