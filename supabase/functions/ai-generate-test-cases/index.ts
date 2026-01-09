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

USER REQUEST:
${prompt}

GENERATION OPTIONS:
- Include edge cases: ${includeEdgeCases ?? true}
- Include negative tests: ${includeNegativeTests ?? true}
- Include performance tests: ${includePerformance ?? false}
- Include security tests: ${includeSecurity ?? false}

=== CRITICAL: SMART ASSIGNMENT RULES ===

You MUST assign Priority and Type intelligently based on test case content:

**PRIORITY ASSIGNMENT RULES:**
- CRITICAL: Assign when test involves:
  • Authentication (login, logout, session)
  • Authorization (permissions, roles, access control)
  • Payment/Financial transactions
  • Data integrity/loss prevention
  • Security vulnerabilities
  • Compliance requirements (DGA, NCA, GDPR)
  • System crashes or data corruption
  
- HIGH: Assign when test involves:
  • Core business workflows
  • Primary user journeys
  • Data validation (required fields, formats)
  • Error handling and recovery
  • Integration failures
  • Critical UI elements (submit buttons, navigation)
  
- MEDIUM: Assign when test involves:
  • Edge cases and boundary conditions
  • Secondary features
  • UI/UX consistency
  • Input formatting
  • Non-critical validations
  • Pagination, sorting, filtering
  
- LOW: Assign when test involves:
  • Cosmetic issues
  • Logging and audit trails
  • Analytics tracking
  • Help text and tooltips
  • Nice-to-have features

**TYPE ASSIGNMENT RULES:**
- FUNCTIONAL: Default for most tests. Assign when:
  • Testing user workflows
  • CRUD operations (Create, Read, Update, Delete)
  • Form submissions and validations
  • Business logic verification
  • UI interactions
  
- API: Assign when test explicitly involves:
  • REST/GraphQL endpoint testing
  • Request/Response validation
  • HTTP status codes
  • API headers and authentication tokens
  • Payload structure validation
  
- PERFORMANCE: Assign when test involves:
  • Page load times
  • Response time thresholds
  • Concurrent user handling
  • Memory and CPU usage
  • Database query performance
  • File upload/download speeds
  
- SECURITY: Assign when test involves:
  • Authentication mechanisms
  • Password policies
  • Session management
  • SQL injection prevention
  • XSS/CSRF protection
  • Data encryption
  • Access control violations
  • Brute force protection

**STATUS: Always set to "draft" for AI-generated cases**

=== RULES ===
1. Generate 3-7 test cases based on complexity
2. Each test case should be independent and atomic
3. Use specific, measurable expected results
4. NEVER assign all tests the same priority — use the full range based on content
5. NEVER default everything to "functional" — analyze the test purpose
6. Security-related tests should ALWAYS be critical or high priority
7. Performance tests should typically be medium unless core feature
8. Include priorityReason and typeReason to explain your reasoning
9. Status is ALWAYS "draft" — no exceptions
10. Test data should be realistic but safe for testing
11. Steps should be clear enough for manual execution`;

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
          { role: "user", content: "Generate comprehensive test cases based on the context provided. Return the result using the generate_test_cases function. Assign priority and type intelligently based on the content of each test case." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_test_cases",
              description: "Generate structured test cases for QA testing with smart priority and type assignment",
              parameters: {
                type: "object",
                properties: {
                  testCases: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Clear, descriptive title starting with 'Verify' or 'Validate'" },
                        summary: { type: "string", description: "One-line description of what this test validates" },
                        testType: { 
                          type: "string", 
                          enum: ["functional", "api", "performance", "security"],
                          description: "Type based on what the test validates"
                        },
                        priority: { 
                          type: "string", 
                          enum: ["critical", "high", "medium", "low"],
                          description: "Priority based on business impact"
                        },
                        status: {
                          type: "string",
                          enum: ["draft"],
                          description: "Always draft for AI-generated cases"
                        },
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
                        priorityReason: {
                          type: "string",
                          description: "Brief explanation of why this priority was assigned"
                        },
                        typeReason: {
                          type: "string",
                          description: "Brief explanation of why this type was assigned"
                        },
                      },
                      required: ["title", "summary", "testType", "priority", "status", "preconditions", "steps", "tags", "priorityReason", "typeReason"],
                    },
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      totalGenerated: { type: "number" },
                      priorityBreakdown: {
                        type: "object",
                        properties: {
                          critical: { type: "number" },
                          high: { type: "number" },
                          medium: { type: "number" },
                          low: { type: "number" },
                        },
                      },
                      typeBreakdown: {
                        type: "object",
                        properties: {
                          functional: { type: "number" },
                          api: { type: "number" },
                          performance: { type: "number" },
                          security: { type: "number" },
                        },
                      },
                      coverageAreas: {
                        type: "array",
                        items: { type: "string" },
                      },
                      suggestedAdditionalTests: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["totalGenerated", "coverageAreas"],
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

    // Normalize and validate each test case
    parsed.testCases = parsed.testCases.map((tc: any) => ({
      ...tc,
      // Ensure status is always draft
      status: 'draft',
      // Validate and normalize priority
      priority: ['critical', 'high', 'medium', 'low'].includes(tc.priority?.toLowerCase())
        ? tc.priority.toLowerCase()
        : 'medium',
      // Validate and normalize type
      testType: ['functional', 'api', 'performance', 'security'].includes(tc.testType?.toLowerCase())
        ? tc.testType.toLowerCase()
        : 'functional',
      // Mark as AI-generated
      isAIGenerated: true,
      aiModel: 'google/gemini-3-flash-preview',
      aiGeneratedAt: new Date().toISOString(),
    }));

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
