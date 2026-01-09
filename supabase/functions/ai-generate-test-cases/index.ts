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
    const { 
      prompt, 
      projectName, 
      featureName, 
      testType,
      includeEdgeCases,
      includeNegativeTests,
      includePerformance,
      includeSecurity 
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert QA engineer specializing in test case design for enterprise software.

CONTEXT:
- Application: ${projectName || "Unknown Project"}
- Module/Feature: ${featureName || "General"}
- Test Type: ${testType || "functional"}

USER REQUEST:
${prompt}

GENERATION OPTIONS:
- Include edge cases: ${includeEdgeCases ?? true}
- Include negative tests: ${includeNegativeTests ?? true}
- Include performance tests: ${includePerformance ?? false}
- Include security tests: ${includeSecurity ?? false}

RULES:
1. Generate 3-7 test cases based on complexity
2. Each test case should be independent and atomic
3. Use specific, measurable expected results
4. Include at least one negative test case if negative tests are enabled
5. Prioritize P1 for critical paths, P2 for important features
6. Test data should be realistic but safe for testing
7. Steps should be clear enough for manual execution`;

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
          { role: "user", content: "Generate comprehensive test cases based on the context provided. Return the result using the generate_test_cases function." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_test_cases",
              description: "Generate structured test cases for QA testing",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Clear, descriptive title starting with action verb" },
                        summary: { type: "string", description: "One-line description of what this test validates" },
                        testType: { type: "string", enum: ["functional", "regression", "integration", "smoke", "security", "performance"] },
                        priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
                        preconditions: {
                          type: "array",
                          items: { type: "string" },
                          description: "List of preconditions that must be met before running the test"
                        },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              stepNumber: { type: "number" },
                              action: { type: "string", description: "Clear action description" },
                              testData: { type: "string", description: "Specific test data if needed" },
                              expectedResult: { type: "string", description: "Observable expected outcome" },
                            },
                            required: ["stepNumber", "action", "expectedResult"],
                          },
                        },
                        tags: {
                          type: "array",
                          items: { type: "string" },
                          description: "Relevant tags for categorization"
                        },
                      },
                      required: ["title", "summary", "testType", "priority", "preconditions", "steps", "tags"],
                    },
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      totalGenerated: { type: "number" },
                      coverageAreas: {
                        type: "array",
                        items: { type: "string" },
                      },
                      suggestedAdditionalTests: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["totalGenerated", "coverageAreas", "suggestedAdditionalTests"],
                  },
                },
                required: ["testCases", "metadata"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_test_cases" } },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate test cases. Please try again." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Validate structure
    if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
      throw new Error("Invalid response structure - missing testCases array");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: parsed,
        model: "google/gemini-3-flash-preview"
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Generation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
