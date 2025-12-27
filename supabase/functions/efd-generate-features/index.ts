import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { epics, atoms, sessionId, config } = await req.json();
    
    if (!epics || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: epics, sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating features from ${epics.length} epics for session: ${sessionId}`);

    const systemPrompt = `You are an expert SAFe Agile coach specializing in Feature decomposition.

Your task is to decompose the provided Epics into SAFe Features.

Guidelines:
- Each Feature should be deliverable within a single PI (Program Increment)
- Features should be user-centric and benefit-driven
- Use the "Feature: <benefit> for <user>" format for titles
- Each Feature should trace back to specific atoms
- Include clear acceptance criteria
- Estimate using story points (fibonacci: 1,2,3,5,8,13,21)

For each Feature, provide:
- key: Unique identifier (e.g., FTR-001)
- title: Benefit-driven title
- description: Detailed description
- benefit_hypothesis: Expected benefit
- acceptance_criteria: Specific, testable criteria
- story_points: Fibonacci estimate
- epic_key: Parent Epic key
- atom_ids: Source atom IDs
- priority: 1-5 scale
- enabler: Boolean - is this a technical enabler?
- dependencies: Other feature keys this depends on

Return JSON with structure:
{
  "features": [...],
  "coverage_summary": {
    "total_atoms": number,
    "covered_atoms": number,
    "coverage_percentage": number
  }
}`;

    const contextJson = JSON.stringify({ epics, atoms: atoms || [] }, null, 2);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Decompose these Epics into Features:\n\n${contextJson}${config ? `\n\nConfiguration: ${JSON.stringify(config)}` : ''}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_features",
              description: "Generate SAFe Features from Epics",
              parameters: {
                type: "object",
                properties: {
                  features: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        benefit_hypothesis: { type: "string" },
                        acceptance_criteria: { type: "array", items: { type: "string" } },
                        story_points: { type: "number" },
                        epic_key: { type: "string" },
                        atom_ids: { type: "array", items: { type: "string" } },
                        priority: { type: "number" },
                        enabler: { type: "boolean" },
                        dependencies: { type: "array", items: { type: "string" } }
                      },
                      required: ["key", "title", "description", "epic_key"]
                    }
                  },
                  coverage_summary: {
                    type: "object",
                    properties: {
                      total_atoms: { type: "number" },
                      covered_atoms: { type: "number" },
                      coverage_percentage: { type: "number" }
                    }
                  }
                },
                required: ["features"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_features" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${result.features?.length || 0} features`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating features:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
