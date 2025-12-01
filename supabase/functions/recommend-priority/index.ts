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
    const { testCaseTitle, testCaseDescription, linkedWorkItemType, linkedWorkItemPriority } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analyze this test case and recommend its priority level.

Test Case Title: ${testCaseTitle}
Test Case Description: ${testCaseDescription || 'N/A'}
Linked Work Item Type: ${linkedWorkItemType || 'N/A'}
Linked Work Item Priority: ${linkedWorkItemPriority || 'N/A'}

Consider:
- Authentication/security tests → Critical
- Payment/transaction tests → Critical  
- Core business logic → High
- Integration points → High
- UI/formatting → Medium
- Edge cases → Medium
- Nice-to-have features → Low

Provide:
1. Recommended priority (critical/high/medium/low)
2. Brief reasoning (2-3 sentences)`;

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
            content: "You are a QA expert. Analyze test cases and recommend appropriate priority levels based on risk and impact.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_priority",
              description: "Recommend test case priority with reasoning",
              parameters: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  reasoning: { type: "string" },
                },
                required: ["priority", "reasoning"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "recommend_priority" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error recommending priority:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
