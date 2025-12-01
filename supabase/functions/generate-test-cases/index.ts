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
    const { storyTitle, storyDescription, acceptanceCriteria } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a QA expert. Generate 3-5 comprehensive test cases for the following user story.

User Story:
Title: ${storyTitle}
Description: ${storyDescription || 'N/A'}
Acceptance Criteria: ${acceptanceCriteria || 'N/A'}

Generate test cases covering:
1. Happy path (positive test case)
2. Error handling (negative test case)
3. Edge cases
4. Integration scenarios
5. Security considerations if applicable

For each test case, provide:
- A clear, descriptive title
- Test description explaining what is being tested
- 3-5 test steps with actions and expected results
- Recommended priority (critical/high/medium/low)
- Test type (manual/automated)

Format the response as a structured list.`;

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
            content: "You are a QA expert specializing in test case generation. Provide structured, actionable test cases.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_test_cases",
              description: "Generate structured test cases for a user story",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              action: { type: "string" },
                              expectedResult: { type: "string" },
                            },
                            required: ["action", "expectedResult"],
                          },
                        },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        testType: { type: "string", enum: ["manual", "automated"] },
                      },
                      required: ["title", "description", "steps", "priority", "testType"],
                    },
                  },
                },
                required: ["testCases"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_test_cases" } },
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

    const testCases = JSON.parse(toolCall.function.arguments).testCases;

    return new Response(JSON.stringify({ testCases }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating test cases:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
