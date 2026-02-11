import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, project_id, input_content, options } = await req.json();
    if (!input_content) throw new Error("Missing input_content");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { data: template } = await supabase
      .from("caty_prompt_templates")
      .select("*")
      .eq("template_key", "test_case_generator")
      .eq("is_active", true)
      .single();

    const systemPrompt = template?.system_prompt || "You are CATY AI™, an expert test case designer.";

    const userPrompt = `Generate ${options?.count || 5} test cases for the following requirement:

${input_content}

Options:
- Include negative test cases: ${options?.includeNegative ?? true}
- Include edge cases: ${options?.includeEdgeCases ?? true}
- Priority focus: ${options?.priorityFocus || "all"}

IMPORTANT: Respond ONLY with valid JSON (no markdown fences):
{
  "test_cases": [
    {
      "title": "Test case title",
      "description": "Brief description",
      "priority": "critical|high|medium|low",
      "preconditions": "Setup required or null",
      "steps": [
        { "step_number": 1, "action": "What to do", "expected_result": "Expected outcome", "test_data": "Data or null" }
      ],
      "postconditions": "Cleanup or null"
    }
  ],
  "summary": "Brief summary"
}`;

    const startTime = Date.now();

    // Use tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON response
    let parsedResponse;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Parse failed:", rawContent.substring(0, 500));
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!parsedResponse.test_cases || !Array.isArray(parsedResponse.test_cases)) {
      throw new Error("Invalid response: missing test_cases array");
    }

    // Save to conversation if provided
    if (conversation_id) {
      const { data: seqData } = await supabase.rpc("get_next_caty_message_sequence", { p_conversation_id: conversation_id });

      await supabase.from("caty_messages").insert({
        conversation_id,
        role: "user",
        content: `Generate test cases for:\n\n${input_content.substring(0, 500)}`,
        sequence_number: seqData || 1,
        status: "complete",
      });

      const { data: assistantMsg } = await supabase
        .from("caty_messages")
        .insert({
          conversation_id,
          role: "assistant",
          content: `Generated ${parsedResponse.test_cases.length} test cases. ${parsedResponse.summary || ""}`,
          structured_content: parsedResponse,
          status: "complete",
          tokens_input: aiData.usage?.prompt_tokens,
          tokens_output: aiData.usage?.completion_tokens,
          response_time_ms: responseTime,
          model_used: aiData.model || "google/gemini-3-flash-preview",
          sequence_number: (seqData || 1) + 1,
        })
        .select()
        .single();

      const suggestions = parsedResponse.test_cases.map((tc: any, index: number) => ({
        message_id: assistantMsg?.id,
        conversation_id,
        project_id,
        suggestion_type: "test_case",
        content: tc,
        display_order: index,
        status: "pending",
      }));

      const { data: savedSuggestions } = await supabase.from("caty_suggestions").insert(suggestions).select("id");

      await supabase.from("caty_analytics").insert({
        project_id,
        conversation_id,
        event_type: "generation_completed",
        event_data: { test_case_count: parsedResponse.test_cases.length, response_time_ms: responseTime, options },
      });

      return new Response(
        JSON.stringify({ success: true, test_cases: parsedResponse.test_cases, summary: parsedResponse.summary, suggestions: savedSuggestions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, test_cases: parsedResponse.test_cases, summary: parsedResponse.summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("caty-generate error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
