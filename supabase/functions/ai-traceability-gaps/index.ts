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
    const { stories, testCases, mappings } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing traceability gaps for", stories?.length || 0, "stories and", testCases?.length || 0, "test cases");

    const prompt = `You are a QA expert analyzing test coverage gaps. Analyze the following data and identify traceability issues:

STORIES (Work Items):
${JSON.stringify(stories?.slice(0, 20) || [], null, 2)}

TEST CASES:
${JSON.stringify(testCases?.slice(0, 30) || [], null, 2)}

EXISTING MAPPINGS (story_id -> test_case_ids):
${JSON.stringify(mappings || {}, null, 2)}

Identify the following types of findings:
1. MISSING_TESTS: Stories without any linked test cases
2. ORPHAN_TESTS: Test cases not linked to any story
3. COVERAGE_GAP: Stories with insufficient test coverage (less than 2 test cases for critical/high priority)
4. STALE_MAPPING: Test cases linked to stories that may be outdated

For each finding, provide:
- finding_type: one of the above
- severity: critical/high/medium/low
- title: brief description
- description: detailed explanation
- source_entity_type: story or test_case
- source_entity_id: the UUID
- affected_items: list of related items
- recommended_action: specific action to take`;

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
            content: "You are a QA expert analyzing test coverage. Return structured findings that can be actioned.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_findings",
              description: "Report traceability gaps and coverage issues",
              parameters: {
                type: "object",
                properties: {
                  findings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        finding_type: { type: "string", enum: ["missing_tests", "orphan_tests", "coverage_gap", "stale_mapping"] },
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        source_entity_type: { type: "string", enum: ["story", "test_case"] },
                        source_entity_id: { type: "string" },
                        affected_items: { type: "array", items: { type: "object", properties: { id: { type: "string" }, type: { type: "string" }, title: { type: "string" } } } },
                        recommended_action: { type: "string" },
                      },
                      required: ["finding_type", "severity", "title", "description", "recommended_action"],
                    },
                  },
                  summary: {
                    type: "object",
                    properties: {
                      total_stories: { type: "number" },
                      stories_with_tests: { type: "number" },
                      orphan_test_count: { type: "number" },
                      coverage_percentage: { type: "number" },
                    },
                  },
                },
                required: ["findings", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_findings" } },
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
    console.log("Generated", result.findings?.length || 0, "findings");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing traceability:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
