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
    const { documentContent, documentName, sessionId } = await req.json();
    
    if (!documentContent || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documentContent, sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Parsing document: ${documentName} for session: ${sessionId}`);

    const systemPrompt = `You are an expert business analyst specializing in extracting atomic requirements from documents.

Your task is to parse the provided document and extract:
1. Atomic requirements - single, testable, unambiguous statements
2. Functional requirements - what the system should do
3. Non-functional requirements - quality attributes, constraints
4. Business rules - policies and constraints

For each requirement, provide:
- id: A unique identifier (e.g., REQ-001)
- type: "functional" | "non_functional" | "business_rule" | "constraint"
- text: The requirement statement
- source_text: Original text from document
- confidence: 0.0 to 1.0 confidence score
- tags: Relevant keywords

Return a JSON object with structure:
{
  "atoms": [...],
  "summary": "Brief document summary",
  "document_type": "BRD" | "PRD" | "SRS" | "other",
  "total_extracted": number
}`;

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
          { role: "user", content: `Parse the following document and extract atomic requirements:\n\n${documentContent}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_requirements",
              description: "Extract atomic requirements from document",
              parameters: {
                type: "object",
                properties: {
                  atoms: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string", enum: ["functional", "non_functional", "business_rule", "constraint"] },
                        text: { type: "string" },
                        source_text: { type: "string" },
                        confidence: { type: "number" },
                        tags: { type: "array", items: { type: "string" } }
                      },
                      required: ["id", "type", "text", "confidence"]
                    }
                  },
                  summary: { type: "string" },
                  document_type: { type: "string", enum: ["BRD", "PRD", "SRS", "other"] },
                  total_extracted: { type: "number" }
                },
                required: ["atoms", "summary", "document_type", "total_extracted"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_requirements" } }
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

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call result from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log(`Extracted ${result.total_extracted} requirements`);

    return new Response(
      JSON.stringify({
        success: true,
        sessionId,
        documentName,
        ...result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error parsing document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
