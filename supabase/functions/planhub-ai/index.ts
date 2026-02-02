import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan_id, message, context } = await req.json();

    if (!plan_id || !message) {
      return new Response(JSON.stringify({ error: "Missing plan_id or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan data
    const { data: plan, error: planError } = await supabase
      .from("planhub_plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tasks if requested
    let tasks: any[] = [];
    if (context?.include_tasks) {
      const { data } = await supabase
        .from("planhub_tasks")
        .select("*")
        .eq("plan_id", plan_id)
        .order("position");
      tasks = data || [];
    }

    // Fetch resources if requested
    let resources: any[] = [];
    if (context?.include_resources) {
      const { data } = await supabase
        .from("planhub_resources")
        .select("*")
        .eq("plan_id", plan_id);
      resources = data || [];
    }

    // Build context for AI
    const planContext = `
# Project Plan: ${plan.name} (${plan.code})

## Overview
- Status: ${plan.status}
- Health: ${plan.health}
- Confidence: ${plan.confidence}%
- Sentiment: ${plan.sentiment}
- Start Date: ${plan.start_date || 'Not set'}
- End Date: ${plan.end_date || 'Not set'}
- Budget: ${plan.budget ? `${plan.currency} ${plan.budget.toLocaleString()}` : 'Not set'}

## Tasks (${tasks.length} total)
${tasks.map(t => `- [${t.wbs}] ${t.name} (${t.type}) - ${t.progress}% complete, ${t.days} days${t.is_flagged ? ' ⚠️ FLAGGED' : ''}`).join('\n')}

## Resources (${resources.length} total)
${resources.map(r => `- ${r.name} (${r.role}) - ${r.utilization}% utilization${r.vendor ? ` [${r.vendor}]` : ''}`).join('\n')}

## Analysis Hints
- Tasks with progress < 50% and near deadline are at risk
- High utilization (>90%) indicates resource constraints
- Flagged items need attention
- Critical path includes longest-duration phases
`;

    const systemPrompt = `You are PlanHub AI, an expert project management assistant. You help users analyze and improve their project plans.

You have access to the following project data:
${planContext}

Guidelines:
- Be concise and actionable in your responses
- Use bullet points and numbered lists for clarity
- Highlight risks and issues proactively
- Suggest specific improvements when relevant
- Format responses with markdown for readability
- When discussing tasks, reference their WBS numbers
- Calculate metrics like completion percentage, resource loading, etc.

Current date: ${new Date().toISOString().split('T')[0]}`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // Generate contextual suggestions
    const suggestions = generateSuggestions(plan, tasks, resources, message);

    return new Response(
      JSON.stringify({
        message: aiMessage,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PlanHub AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateSuggestions(plan: any, tasks: any[], resources: any[], lastMessage: string): string[] {
  const suggestions: string[] = [];

  // Risk-related
  const flaggedCount = tasks.filter(t => t.is_flagged).length;
  if (flaggedCount > 0) {
    suggestions.push(`Show me the ${flaggedCount} flagged items`);
  }

  // Progress-related
  const behindSchedule = tasks.filter(t => t.progress < 50 && t.type !== 'milestone').length;
  if (behindSchedule > 0) {
    suggestions.push(`Which ${behindSchedule} tasks need attention?`);
  }

  // Resource-related
  const overloaded = resources.filter(r => r.utilization > 90).length;
  if (overloaded > 0) {
    suggestions.push(`${overloaded} resources are overloaded. How to rebalance?`);
  }

  // Generic helpful suggestions
  if (!lastMessage.toLowerCase().includes('risk')) {
    suggestions.push('What are the top risks?');
  }
  if (!lastMessage.toLowerCase().includes('critical')) {
    suggestions.push('Show critical path analysis');
  }
  if (!lastMessage.toLowerCase().includes('budget')) {
    suggestions.push('How is the budget tracking?');
  }
  if (!lastMessage.toLowerCase().includes('timeline')) {
    suggestions.push('Can we optimize the timeline?');
  }

  return suggestions.slice(0, 4);
}
