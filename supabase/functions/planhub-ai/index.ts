import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIRequest {
  plan_id: string;
  message: string;
  context?: {
    include_tasks?: boolean;
    include_resources?: boolean;
    structured_query?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
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

    // Parse request
    const body: AIRequest = await req.json();
    const { plan_id, message, context } = body;

    if (!plan_id || !message) {
      return new Response(JSON.stringify({ error: "Missing plan_id or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check AI config (optional - for feature toggle)
    const { data: aiConfig } = await supabase
      .from("planhub_ai_config")
      .select("*")
      .single();

    if (aiConfig && aiConfig.features_enabled?.assistant_enabled === false) {
      return new Response(JSON.stringify({ error: "AI Assistant is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch plan data with lead info
    const { data: plan, error: planError } = await supabase
      .from("planhub_plans")
      .select("*, lead:profiles(full_name)")
      .eq("id", plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tasks (default: include)
    let tasks: any[] = [];
    if (context?.include_tasks !== false) {
      const { data } = await supabase
        .from("planhub_tasks")
        .select("wbs, name, type, days, progress, is_flagged, start_date, end_date")
        .eq("plan_id", plan_id)
        .order("position");
      tasks = data || [];
    }

    // Fetch resources (default: include)
    let resources: any[] = [];
    if (context?.include_resources !== false) {
      const { data } = await supabase
        .from("planhub_resources")
        .select("name, role, utilization, is_skeleton, skills, vendor")
        .eq("plan_id", plan_id);
      resources = data || [];
    }

    // Calculate stats
    const taskStats = {
      total: tasks.filter(t => t.type === "task").length,
      completed: tasks.filter(t => t.type === "task" && t.progress === 100).length,
      flagged: tasks.filter(t => t.is_flagged).length,
      phases: tasks.filter(t => t.type === "phase").length,
      milestones: tasks.filter(t => t.type === "milestone").length,
    };

    const resourceStats = {
      total: resources.length,
      skeleton: resources.filter(r => r.is_skeleton).length,
      avgUtil: resources.length 
        ? Math.round(resources.reduce((s, r) => s + r.utilization, 0) / resources.length) 
        : 0,
      overloaded: resources.filter(r => r.utilization > 100).length,
    };

    // Build comprehensive system prompt
    const systemPrompt = `You are PlanHub AI, an intelligent assistant for enterprise project planning.

## Plan Context
**Plan:** ${plan.name} (${plan.code})
**Status:** ${plan.status} | **Health:** ${plan.health}
**Lead:** ${plan.lead?.full_name || "Unassigned"}
**Confidence:** ${plan.confidence}%
**Sentiment:** ${plan.sentiment}
**Start Date:** ${plan.start_date || "Not set"}
**End Date:** ${plan.end_date || "Not set"}
**Budget:** ${plan.budget ? `${plan.currency} ${plan.budget.toLocaleString()}` : "Not set"}

## Task Summary
- Total Tasks: ${taskStats.total} | Completed: ${taskStats.completed} | Flagged: ${taskStats.flagged}
- Phases: ${taskStats.phases} | Milestones: ${taskStats.milestones}

## Resource Summary
- Total: ${resourceStats.total} | Skeleton (TBH): ${resourceStats.skeleton}
- Avg Utilization: ${resourceStats.avgUtil}% | Overallocated: ${resourceStats.overloaded}

## Task List
${tasks.map(t => `- [${t.wbs}] ${t.name} (${t.type}) - ${t.progress}%${t.is_flagged ? " 🚩" : ""}`).join("\n")}

## Resource List
${resources.map(r => `- ${r.name}${r.is_skeleton ? " (TBH)" : ""}: ${r.role} - ${r.utilization}%${r.vendor ? ` [${r.vendor}]` : ""}`).join("\n")}

## Instructions
- Provide specific, actionable insights based on the plan data
- Reference tasks and resources by name when discussing them
- Use plan statistics to support your analysis
- Format responses with **bold** for emphasis and bullet points for lists
- Use numbered lists for recommendations
- Be concise but comprehensive
- Highlight risks, blockers, and items needing attention
- Calculate completion percentages and resource loading when relevant

Current date: ${new Date().toISOString().split("T")[0]}`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig?.model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: aiConfig?.temperature ?? 0.7,
        max_tokens: aiConfig?.max_tokens ?? 1024,
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
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "Unable to generate response.";

    // Generate contextual suggestions
    const suggestions = generateSuggestions(plan, tasks, resources, message, aiMessage);

    // Log activity
    await supabase.from("planhub_activity_log").insert({
      plan_id,
      action: "access",
      details: { type: "ai_query", preview: message.substring(0, 50) },
      user_id: user.id,
    });

    return new Response(
      JSON.stringify({
        message: aiMessage,
        suggestions: suggestions.slice(0, 4),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("PlanHub AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateSuggestions(
  plan: any,
  tasks: any[],
  resources: any[],
  lastMessage: string,
  aiResponse: string
): string[] {
  const suggestions: string[] = [];
  const msgLower = lastMessage.toLowerCase();
  const responseLower = aiResponse.toLowerCase();

  // Risk-related
  const flaggedCount = tasks.filter(t => t.is_flagged).length;
  if (flaggedCount > 0 && !msgLower.includes("flag")) {
    suggestions.push(`Show me the ${flaggedCount} flagged items`);
  }

  // Response-based suggestions
  if (responseLower.includes("risk") && !msgLower.includes("mitigat")) {
    suggestions.push("Recommend mitigations");
  }
  if (responseLower.includes("resource") && !msgLower.includes("rebalance")) {
    suggestions.push("How to rebalance resources?");
  }

  // Progress-related
  const behindSchedule = tasks.filter(t => t.progress < 50 && t.type !== "milestone").length;
  if (behindSchedule > 0 && !msgLower.includes("behind") && !msgLower.includes("attention")) {
    suggestions.push(`Which ${behindSchedule} tasks need attention?`);
  }

  // Resource-related
  const overloaded = resources.filter(r => r.utilization > 100).length;
  if (overloaded > 0 && !msgLower.includes("overload")) {
    suggestions.push(`${overloaded} resources are overallocated`);
  }

  // Generic helpful suggestions based on what wasn't asked
  if (!msgLower.includes("risk") && !responseLower.includes("risk")) {
    suggestions.push("What are the top risks?");
  }
  if (!msgLower.includes("critical") && !msgLower.includes("path")) {
    suggestions.push("Show critical path analysis");
  }
  if (!msgLower.includes("budget") && !msgLower.includes("cost")) {
    suggestions.push("How is the budget tracking?");
  }
  if (!msgLower.includes("timeline") && !msgLower.includes("schedule")) {
    suggestions.push("Can we optimize the timeline?");
  }

  return suggestions.slice(0, 4);
}
