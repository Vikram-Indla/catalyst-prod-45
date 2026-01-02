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
    const { reportType, periodStart, periodEnd, metrics, executions, defects, releases } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating narrative report for period:", periodStart, "to", periodEnd);

    const prompt = `You are a QA lead writing an executive summary report for stakeholders.

REPORT TYPE: ${reportType || 'daily'}
PERIOD: ${periodStart} to ${periodEnd}

TEST METRICS:
${JSON.stringify(metrics || {}, null, 2)}

TEST EXECUTIONS (sample):
${JSON.stringify(executions?.slice(0, 20) || [], null, 2)}

DEFECTS:
${JSON.stringify(defects?.slice(0, 15) || [], null, 2)}

RELEASES:
${JSON.stringify(releases || [], null, 2)}

Write a structured executive report that is:
1. Data-driven with specific numbers
2. Actionable with clear next steps
3. Concise but comprehensive
4. Appropriate for C-level executives

Include sections for:
- Executive Summary (2-3 sentences)
- Key Highlights (achievements)
- Risks and Blockers (issues needing attention)
- Metrics Summary
- Recommendations for next period`;

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
            content: "You are a QA lead writing executive reports. Be data-driven, concise, and actionable. No fluff.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_report",
              description: "Generate structured executive narrative report",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  executive_summary: { type: "string", description: "2-3 sentence summary" },
                  highlights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        metric_value: { type: "string" },
                        trend: { type: "string", enum: ["up", "down", "stable"] },
                      },
                      required: ["title", "description"],
                    },
                  },
                  risks_and_blockers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        mitigation: { type: "string" },
                      },
                      required: ["title", "description", "severity"],
                    },
                  },
                  metrics_snapshot: {
                    type: "object",
                    properties: {
                      total_tests_executed: { type: "number" },
                      pass_rate: { type: "number" },
                      defects_found: { type: "number" },
                      defects_resolved: { type: "number" },
                      coverage_percentage: { type: "number" },
                      automation_rate: { type: "number" },
                    },
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        owner: { type: "string" },
                      },
                      required: ["title", "description", "priority"],
                    },
                  },
                  narrative_sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        heading: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["heading", "content"],
                    },
                  },
                },
                required: ["title", "executive_summary", "highlights", "risks_and_blockers", "recommendations"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_report" } },
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

    const report = JSON.parse(toolCall.function.arguments);
    console.log("Generated report:", report.title);

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating narrative report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
