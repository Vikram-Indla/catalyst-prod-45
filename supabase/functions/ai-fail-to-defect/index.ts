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
    const { execution, testCase, failureNotes, stepsResults } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating defect draft for failed execution:", execution?.id);

    const prompt = `You are a QA expert creating a defect report from a failed test execution.

TEST CASE:
Title: ${testCase?.title || 'N/A'}
Description: ${testCase?.description || 'N/A'}
Priority: ${testCase?.priority || 'medium'}
Test Type: ${testCase?.test_type || 'manual'}

EXECUTION DETAILS:
Status: ${execution?.status || 'failed'}
Executed By: ${execution?.assigned_to || 'Unknown'}
Executed At: ${execution?.executed_at || 'N/A'}
Environment: ${execution?.environment || 'N/A'}

FAILURE NOTES:
${failureNotes || 'No notes provided'}

STEP RESULTS:
${JSON.stringify(stepsResults || [], null, 2)}

Generate a comprehensive defect report including:
1. Clear, descriptive title
2. Steps to reproduce (from test case steps)
3. Expected result (from test case)
4. Actual result (from failure notes)
5. Severity assessment
6. Priority recommendation
7. Suggested root cause category`;

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
            content: "You are a QA expert creating detailed defect reports. Be specific and actionable.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_defect_draft",
              description: "Create a draft defect from failed test execution",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Clear defect title" },
                  description: { type: "string", description: "Detailed description" },
                  steps_to_reproduce: {
                    type: "array",
                    items: { type: "object", properties: { step_number: { type: "number" }, action: { type: "string" }, expected: { type: "string" } } },
                  },
                  expected_result: { type: "string" },
                  actual_result: { type: "string" },
                  severity: { type: "string", enum: ["critical", "major", "minor", "trivial"] },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  root_cause_category: { type: "string", enum: ["code_defect", "configuration", "data_issue", "environment", "design_flaw", "integration", "unknown"] },
                  environment: { type: "string" },
                  preconditions: { type: "string" },
                  additional_notes: { type: "string" },
                },
                required: ["title", "description", "expected_result", "actual_result", "severity", "priority"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_defect_draft" } },
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

    const defectDraft = JSON.parse(toolCall.function.arguments);
    console.log("Generated defect draft:", defectDraft.title);

    return new Response(JSON.stringify({ defectDraft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating defect draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
