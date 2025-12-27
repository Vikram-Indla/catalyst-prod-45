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
    const { atoms, sessionId, config } = await req.json();
    
    if (!atoms || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: atoms, sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating epics from ${atoms.length} atoms for session: ${sessionId}`);

    const systemPrompt = `You are an expert SAFe Agile coach specializing in Epic decomposition.

Your task is to analyze the provided atomic requirements and generate SAFe Epics.

Guidelines:
- Group related requirements into cohesive Epics
- Each Epic should represent a significant business initiative
- Epics should be independent but may have dependencies
- Include a clear hypothesis and business value statement
- Estimate using T-shirt sizing (XS, S, M, L, XL)

For each Epic, provide:
- key: Unique identifier (e.g., EPIC-001)
- title: Clear, concise title
- description: Detailed description
- hypothesis: Business hypothesis in format "If we... then we..."
- business_value: Value statement
- acceptance_criteria: List of high-level acceptance criteria
- estimated_size: T-shirt size
- atom_ids: Array of source atom IDs this epic covers
- priority: 1-5 scale (1 = highest)
- risks: Potential risks

Return JSON with structure:
{
  "epics": [...],
  "unmapped_atoms": [...atom IDs not covered],
  "recommendations": "Strategic recommendations"
}`;

    const atomsJson = JSON.stringify(atoms, null, 2);

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
          { role: "user", content: `Generate SAFe Epics from these atomic requirements:\n\n${atomsJson}${config ? `\n\nConfiguration: ${JSON.stringify(config)}` : ''}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_epics",
              description: "Generate SAFe Epics from atomic requirements",
              parameters: {
                type: "object",
                properties: {
                  epics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        hypothesis: { type: "string" },
                        business_value: { type: "string" },
                        acceptance_criteria: { type: "array", items: { type: "string" } },
                        estimated_size: { type: "string", enum: ["XS", "S", "M", "L", "XL"] },
                        atom_ids: { type: "array", items: { type: "string" } },
                        priority: { type: "number" },
                        risks: { type: "array", items: { type: "string" } }
                      },
                      required: ["key", "title", "description", "atom_ids"]
                    }
                  },
                  unmapped_atoms: { type: "array", items: { type: "string" } },
                  recommendations: { type: "string" }
                },
                required: ["epics"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_epics" } }
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
    console.log(`Generated ${result.epics?.length || 0} epics`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating epics:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
