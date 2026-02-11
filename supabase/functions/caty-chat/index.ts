import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, message, context } = await req.json();

    if (!conversation_id || !message) {
      throw new Error("Missing conversation_id or message");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from("caty_conversations")
      .select("*, project:projects(id, name)")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) throw new Error("Conversation not found");

    // Get history (last 10)
    const { data: history } = await supabase
      .from("caty_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("sequence_number", { ascending: true })
      .limit(10);

    // Get prompt template
    const { data: template } = await supabase
      .from("caty_prompt_templates")
      .select("*")
      .eq("template_key", "chat_default")
      .eq("is_active", true)
      .single();

    let systemPrompt = template?.system_prompt || "You are CATY AI™, an expert QA engineer. Be helpful, concise, and professional.";
    systemPrompt += `\n\nCurrent project: ${conversation.project?.name || "Unknown"}`;
    if (context) {
      systemPrompt += `\n\nAdditional context (${context.type}): ${JSON.stringify(context.data)}`;
    }

    // Build messages
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];
    if (history) {
      for (const msg of history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: "user", content: message });

    // Call Lovable AI Gateway
    const startTime = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const assistantContent = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";
    const tokensInput = aiData.usage?.prompt_tokens;
    const tokensOutput = aiData.usage?.completion_tokens;

    // Check for structured content
    let structuredContent = null;
    try {
      const jsonMatch = assistantContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) structuredContent = JSON.parse(jsonMatch[1]);
    } catch { /* not JSON */ }

    // Get next sequence
    const { data: seqData } = await supabase.rpc("get_next_caty_message_sequence", {
      p_conversation_id: conversation_id,
    });

    // Save assistant message
    const { data: savedMessage, error: saveError } = await supabase
      .from("caty_messages")
      .insert({
        conversation_id,
        role: "assistant",
        content: assistantContent,
        structured_content: structuredContent,
        status: "complete",
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        response_time_ms: responseTime,
        model_used: aiData.model || "google/gemini-3-flash-preview",
        sequence_number: seqData || 1,
      })
      .select()
      .single();

    if (saveError) console.error("Error saving message:", saveError);

    // If structured content contains test cases, create suggestions
    if (structuredContent?.test_cases) {
      const suggestions = structuredContent.test_cases.map((tc: any, index: number) => ({
        message_id: savedMessage?.id,
        conversation_id,
        project_id: conversation.project_id,
        suggestion_type: "test_case",
        content: tc,
        display_order: index,
        status: "pending",
      }));
      await supabase.from("caty_suggestions").insert(suggestions);
    }

    // Auto-title on first message
    if (conversation.message_count <= 1 && !conversation.title) {
      const title = message.length > 50 ? message.substring(0, 47) + "..." : message;
      await supabase.from("caty_conversations").update({ title }).eq("id", conversation_id);
    }

    // Log analytics
    await supabase.from("caty_analytics").insert({
      project_id: conversation.project_id,
      user_id: conversation.user_id,
      conversation_id,
      event_type: "message_sent",
      event_data: { tokens_input: tokensInput, tokens_output: tokensOutput, response_time_ms: responseTime },
    });

    return new Response(
      JSON.stringify({ success: true, message: savedMessage, structured_content: structuredContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("caty-chat error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
