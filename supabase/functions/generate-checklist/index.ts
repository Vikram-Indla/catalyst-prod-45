// ============================================================
// GENERATE CHECKLIST - AI-powered checklist generation
// Uses Lovable AI Gateway (Gemini) to analyze task and create checklist
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

    const systemPrompt = `You are an enterprise project management assistant for a Ministry of Industry portfolio. 
Your job is to generate structured, actionable checklists for strategic initiatives and project tasks.

CONTEXT:
- This is for government/enterprise project management, NOT software development
- Tasks involve stakeholder meetings, compliance reviews, budget approvals, policy assessments
- Checklists should be organized into phases/sections with headers
- Each item should be a concrete, actionable task that can be checked off

OUTPUT FORMAT:
Return a JSON array of checklist items. Each item has:
- content: The text of the item
- is_header: true if this is a section header (like "STAKEHOLDER ENGAGEMENT"), false for actionable items

RULES:
- Generate 8-15 items total including headers
- Use 2-4 section headers to organize items logically
- Headers should be in CAPS (e.g., "PRELIMINARY RESEARCH")
- Action items should start with a verb (Schedule, Review, Prepare, Submit, etc.)
- Keep items concise but specific
- Consider the typical workflow: research → stakeholder engagement → documentation → approval`;

    const userPrompt = `Generate a structured checklist for this task:

TITLE: ${title}
${description ? `DESCRIPTION: ${description}` : ''}

Return ONLY a valid JSON array, no markdown or explanation.`;

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

    // Validate and normalize items
    const normalizedItems = items.map((item: any, index: number) => ({
      content: String(item.content || item.text || ""),
      is_header: Boolean(item.is_header || item.isHeader || false),
      sort_order: index,
    })).filter((item: any) => item.content.trim() !== "");

    return new Response(
      JSON.stringify({ items: normalizedItems }),
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
