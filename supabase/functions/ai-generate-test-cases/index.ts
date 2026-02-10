import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Validates whether a description is meaningful enough to generate test cases.
 * Returns null if valid, or an error message string if invalid.
 */
function validateDescription(description: string): string | null {
  const trimmed = description.trim();

  if (trimmed.length < 30) {
    return "The description is too short to generate meaningful test cases. Please provide at least 30 characters describing the feature, workflow, or requirement you want to test.";
  }

  // Check for vague/generic descriptions
  const vaguePatterns = [
    /^test\s*(it|this|that|stuff|things)?$/i,
    /^(hello|hi|hey|ok|yes|no|please|help)$/i,
    /^(asdf|qwerty|aaa+|xxx+|123+|abc)$/i,
    /^[\W\d\s]+$/, // only symbols/numbers/spaces
  ];

  for (const pattern of vaguePatterns) {
    if (pattern.test(trimmed)) {
      return "The description is too vague to generate useful test cases. Please describe a specific feature, user workflow, or requirement (e.g., 'User login with email and password, including forgot-password flow').";
    }
  }

  // Count meaningful words (3+ chars)
  const meaningfulWords = trimmed.split(/\s+/).filter(w => w.length >= 3);
  if (meaningfulWords.length < 4) {
    return "The description lacks enough detail. Please describe the feature or scenario in more detail — include the user action, expected behavior, and any relevant context.";
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      description,
      count = 5,
      includeSteps = true,
    } = await req.json();

    // --- Validate description quality ---
    const validationError = validateDescription(description || "");
    if (validationError) {
      return new Response(
        JSON.stringify({ error: validationError, errorType: "validation" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate the split based on requested count
    const totalCount = Math.min(Math.max(count, 3), 20);
    const positiveCount = Math.max(1, Math.round(totalCount * 0.6));
    const negativeCount = Math.max(1, Math.round(totalCount * 0.2));
    const edgeCaseCount = Math.max(1, totalCount - positiveCount - negativeCount);

    const systemPrompt = `You are an expert QA engineer specializing in test case design for enterprise software.

USER REQUIREMENT:
${description}

=== MANDATORY TEST CASE DISTRIBUTION ===
You MUST generate exactly ${totalCount} test cases with this STRICT distribution:
- ${positiveCount} POSITIVE test cases (60%) — Happy path, valid inputs, expected workflows that should succeed
- ${negativeCount} NEGATIVE test cases (20%) — Invalid inputs, error conditions, unauthorized access, missing data
- ${edgeCaseCount} EDGE CASE test cases (20%) — Boundary values, extreme inputs, race conditions, unusual but valid scenarios

Each test case MUST have a "testCategory" field set to exactly one of: "positive", "negative", "edge_case"

=== QUALITY RULES ===
1. Every test case must be DIRECTLY derived from the user's description
2. Do NOT invent features or requirements not mentioned in the description
3. Test titles must start with "Verify" or "Validate"
4. Each test case must be independent and atomic
5. Use specific, measurable expected results — no vague assertions
6. Steps should be clear enough for manual execution
7. Status is ALWAYS "draft"

=== PRIORITY ASSIGNMENT RULES ===
- CRITICAL: Authentication, authorization, payments, data integrity, security, compliance
- HIGH: Core business workflows, primary user journeys, data validation, error handling
- MEDIUM: Edge cases, boundary conditions, secondary features, UI consistency
- LOW: Cosmetic issues, logging, analytics, tooltips

=== TYPE ASSIGNMENT RULES ===
- FUNCTIONAL: User workflows, CRUD, form submissions, business logic, UI interactions
- API: REST/GraphQL endpoints, request/response validation, HTTP status codes
- PERFORMANCE: Load times, response thresholds, concurrent users
- SECURITY: Auth mechanisms, injection prevention, XSS/CSRF, encryption

NEVER assign all tests the same priority — distribute based on content.
${includeSteps ? "Include 3-6 detailed steps per test case." : "Include 1-2 high-level steps per test case."}`;

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
          { role: "user", content: `Generate exactly ${totalCount} test cases based on the requirement above. Strictly follow the distribution: ${positiveCount} positive, ${negativeCount} negative, ${edgeCaseCount} edge case. Return the result using the generate_test_cases function.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_test_cases",
              description: "Generate structured test cases with mandatory category distribution",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Clear title starting with 'Verify' or 'Validate'" },
                        summary: { type: "string", description: "One-line description of what this test validates" },
                        testCategory: {
                          type: "string",
                          enum: ["positive", "negative", "edge_case"],
                          description: "Category: positive (happy path), negative (error/invalid), edge_case (boundary/extreme)"
                        },
                        testType: {
                          type: "string",
                          enum: ["functional", "api", "performance", "security"],
                          description: "Technical type based on what the test validates"
                        },
                        priority: {
                          type: "string",
                          enum: ["critical", "high", "medium", "low"],
                          description: "Priority based on business impact"
                        },
                        status: {
                          type: "string",
                          enum: ["draft"],
                          description: "Always draft"
                        },
                        preconditions: {
                          type: "array",
                          items: { type: "string" },
                          description: "Preconditions before running the test"
                        },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              stepNumber: { type: "number" },
                              action: { type: "string" },
                              testData: { type: "string" },
                              expectedResult: { type: "string" },
                            },
                            required: ["stepNumber", "action", "expectedResult"],
                          },
                        },
                      },
                      required: ["title", "summary", "testCategory", "testType", "priority", "status", "steps"],
                    },
                  },
                },
                required: ["testCases"],
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
      throw new Error("No structured response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
      throw new Error("Invalid response structure");
    }

    // Normalize each test case
    parsed.testCases = parsed.testCases.map((tc: any) => ({
      ...tc,
      status: "draft",
      priority: ["critical", "high", "medium", "low"].includes(tc.priority?.toLowerCase())
        ? tc.priority.toLowerCase()
        : "medium",
      testType: ["functional", "api", "performance", "security"].includes(tc.testType?.toLowerCase())
        ? tc.testType.toLowerCase()
        : "functional",
      testCategory: ["positive", "negative", "edge_case"].includes(tc.testCategory?.toLowerCase())
        ? tc.testCategory.toLowerCase()
        : "positive",
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed,
        model: "google/gemini-3-flash-preview",
        distribution: {
          requested: { positive: positiveCount, negative: negativeCount, edge_case: edgeCaseCount },
          actual: {
            positive: parsed.testCases.filter((t: any) => t.testCategory === "positive").length,
            negative: parsed.testCases.filter((t: any) => t.testCategory === "negative").length,
            edge_case: parsed.testCases.filter((t: any) => t.testCategory === "edge_case").length,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generation error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
