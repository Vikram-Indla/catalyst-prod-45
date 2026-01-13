// ============================================================
// GENERATE CHECKLIST - AI-powered checklist generation
// Uses Lovable AI Gateway (Gemini) to analyze task and create checklist
// REVISED: 5-8 high-level milestones, NO headers, flat list
// ============================================================

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
    const { title, description } = await req.json();
    
    if (!title) {
      return new Response(
        JSON.stringify({ error: "Task title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are generating a checklist for an enterprise project management task.

RULES:
1. Generate EXACTLY 5-8 items (no more, no less)
2. Each item should be a HIGH-LEVEL milestone, not a granular step
3. Use action verbs: "Obtain", "Submit", "Review", "Confirm", "Complete", "Prepare", "Gather"
4. Keep item text under 50 characters when possible
5. NO headers/sections - just a flat list of checkpoints
6. Items should represent ~10-20% of the work each
7. Focus on OUTCOMES, not process steps

EXAMPLES:
- For "Payment Tracking": "Receive and log invoices", "Verify against purchase orders", "Get Finance approval", "Process payment", "Archive documentation"
- For "Stakeholder Analysis": "Identify key stakeholders", "Conduct interviews", "Compile requirements", "Get legal review", "Obtain executive approval"

OUTPUT FORMAT:
Return a JSON array of objects with "text" field only. Example:
[{"text":"Gather historical data"},{"text":"Select ML vendor"},{"text":"Run pilot"},{"text":"Review results"},{"text":"Approve deployment"}]`;

    const userPrompt = `Generate a checklist for this task:

TITLE: ${title}
${description ? `DESCRIPTION: ${description}` : ''}

Return ONLY a valid JSON array with 5-8 items, no markdown or explanation.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
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
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let items;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      items = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse checklist items");
    }

    // Validate array
    if (!Array.isArray(items)) {
      throw new Error("Invalid response format");
    }

    // Enforce 5-8 items limit
    if (items.length < 5) {
      console.warn(`AI returned only ${items.length} items, expected 5-8`);
    }
    if (items.length > 8) {
      items = items.slice(0, 8);
    }

    // Normalize items - flat list, NO headers
    const normalizedItems = items.map((item: any, index: number) => ({
      content: String(item.text || item.content || "").slice(0, 80), // Max 80 chars
      is_header: false, // Always false - no headers in new spec
      sort_order: index,
    })).filter((item: any) => item.content.trim() !== "");

    return new Response(
      JSON.stringify({ 
        items: normalizedItems,
        count: normalizedItems.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("generate-checklist error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
