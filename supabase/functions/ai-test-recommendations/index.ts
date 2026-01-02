import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics, recentExecutions, openDefects, upcomingRelease } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating test recommendations based on metrics");

    const prompt = `You are a QA strategist analyzing test metrics to provide risk-based recommendations.

CURRENT METRICS:
${JSON.stringify(metrics || {}, null, 2)}

RECENT EXECUTIONS (last 7 days):
${JSON.stringify(recentExecutions?.slice(0, 20) || [], null, 2)}

OPEN DEFECTS:
${JSON.stringify(openDefects?.slice(0, 15) || [], null, 2)}

UPCOMING RELEASE:
${JSON.stringify(upcomingRelease || {}, null, 2)}

Based on this data, provide actionable recommendations for the test team. Focus on:
1. Risk areas that need immediate attention
2. Test assignments that should be prioritized
3. Coverage gaps that need new tests
4. Defects that may indicate systemic issues
5. Release readiness blockers

Each recommendation should be specific and actionable with a clear priority.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a QA strategist providing actionable test recommendations. Be specific about what needs to be done.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_recommendations",
              description: "Provide risk-based test recommendations",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        recommendation_type: { type: "string", enum: ["assign_execution", "generate_tests", "create_defect", "coverage_gap", "priority_adjustment", "resource_reallocation"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        target_entity_type: { type: "string", enum: ["test_case", "test_cycle", "story", "feature", "defect"] },
                        target_entity_id: { type: "string" },
                        action_data: { type: "object", description: "Specific action parameters" },
                        confidence_score: { type: "number", minimum: 0, maximum: 1 },
                        rationale: { type: "string" },
                      },
                      required: ["recommendation_type", "title", "description", "priority", "confidence_score"],
                    },
                  },
                  risk_summary: {
                    type: "object",
                    properties: {
                      overall_risk_level: { type: "string", enum: ["critical", "high", "medium", "low"] },
                      key_risks: { type: "array", items: { type: "string" } },
                      release_readiness_score: { type: "number", minimum: 0, maximum: 100 },
                    },
                  },
                },
                required: ["recommendations", "risk_summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Generated", result.recommendations?.length || 0, "recommendations");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
