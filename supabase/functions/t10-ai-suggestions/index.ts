import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listId, weekId, participants } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Fetch high priority stories/tasks from TaskHub that:
    // 1. Are assigned to participants in this T10 list
    // 2. Are HIGH or CRITICAL priority
    // 3. Are not completed
    // 4. Are not already in the current week's T10 items
    
    // Get existing items for this week to exclude
    let existingTaskhubKeys: string[] = [];
    if (weekId) {
      const { data: existingItems } = await supabase
        .from("t10_items")
        .select("taskhub_key")
        .eq("week_id", weekId)
        .not("taskhub_key", "is", null);
      
      existingTaskhubKeys = (existingItems || [])
        .map(i => i.taskhub_key)
        .filter(Boolean);
    }

    // Fetch high-priority stories from TaskHub
    let query = supabase
      .from("stories")
      .select(`
        id,
        key,
        title,
        priority,
        status,
        due_date,
        assignee:profiles!stories_assignee_id_fkey(id, full_name)
      `)
      .in("priority", ["critical", "high"])
      .not("status", "in", '("Done","Resolved","Closed")')
      .order("priority", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20);

    // Filter by participants if provided
    if (participants && participants.length > 0) {
      query = query.in("assignee_id", participants);
    }

    const { data: stories, error: storiesError } = await query;

    if (storiesError) {
      console.error("Error fetching stories:", storiesError);
    }

    // Filter out tasks already in the T10 list
    const candidateTasks = (stories || []).filter(
      s => !existingTaskhubKeys.includes(s.key)
    );

    // Helper to safely get assignee info (could be array or single object)
    const getAssignee = (assignee: any): { id: string | null; full_name: string } => {
      if (!assignee) return { id: null, full_name: "Unassigned" };
      if (Array.isArray(assignee)) {
        const first = assignee[0];
        return first ? { id: first.id, full_name: first.full_name || "Unassigned" } : { id: null, full_name: "Unassigned" };
      }
      return { id: assignee.id, full_name: assignee.full_name || "Unassigned" };
    };

    // If we have AI available, enhance suggestions with reasoning
    let aiEnhanced = false;
    let suggestions = candidateTasks.slice(0, 10).map(task => {
      const assignee = getAssignee(task.assignee);
      return {
        id: task.id,
        key: task.key,
        title: task.title,
        priority: task.priority,
        due_date: task.due_date,
        assignee_name: assignee.full_name,
        assignee_id: assignee.id,
        reason: task.priority === "critical" 
          ? "Critical priority - requires immediate attention"
          : "High priority with upcoming deadline",
      };
    });

    // Optional: Use AI to provide intelligent reasoning
    if (LOVABLE_API_KEY && candidateTasks.length > 0) {
      try {
        const tasksContext = candidateTasks.slice(0, 10).map(t => {
          const assignee = getAssignee(t.assignee);
          return {
            key: t.key,
            title: t.title,
            priority: t.priority,
            due_date: t.due_date,
            assignee: assignee.full_name,
          };
        });

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a task prioritization assistant. Given a list of high-priority tasks, provide a brief (10-15 words max) reason why each should be prioritized this week. Focus on urgency, deadlines, and business impact. Return a JSON array of objects with "key" and "reason" fields only.`
              },
              {
                role: "user",
                content: `Analyze these tasks and provide prioritization reasons:\n${JSON.stringify(tasksContext, null, 2)}`
              }
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "provide_task_reasons",
                  description: "Provide reasoning for task prioritization",
                  parameters: {
                    type: "object",
                    properties: {
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            key: { type: "string" },
                            reason: { type: "string" }
                          },
                          required: ["key", "reason"]
                        }
                      }
                    },
                    required: ["tasks"]
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "provide_task_reasons" } }
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            const reasonMap = new Map(parsed.tasks.map((t: any) => [t.key, t.reason]));
            
            suggestions = suggestions.map(s => ({
              ...s,
              reason: (reasonMap.get(s.key) as string) || s.reason,
            }));
            aiEnhanced = true;
          }
        }
      } catch (aiError) {
        console.error("AI enhancement failed, using default reasons:", aiError);
      }
    }

    return new Response(
      JSON.stringify({
        suggestions,
        ai_enhanced: aiEnhanced,
        total_candidates: candidateTasks.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("t10-ai-suggestions error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        suggestions: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
