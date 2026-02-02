import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskCandidate {
  task_key: string;
  title: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
}

interface AiSuggestion {
  taskKey: string;
  title: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  reasoning: string;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listId, weekId } = await req.json();
    
    if (!listId || !weekId) {
      return new Response(
        JSON.stringify({ error: "listId and weekId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get list owner
    const { data: listData, error: listError } = await supabase
      .from("aqd_lists")
      .select("created_by")
      .eq("id", listId)
      .single();
    
    if (listError || !listData) {
      console.error("Failed to fetch list:", listError);
      return new Response(
        JSON.stringify({ error: "List not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get all assignees from current week items
    const { data: weekItems, error: itemsError } = await supabase
      .from("aqd_items")
      .select("assignee_id, taskhub_key")
      .eq("week_id", weekId);
    
    if (itemsError) {
      console.error("Failed to fetch items:", itemsError);
    }

    // Build scope of user IDs
    const scopeUserIds = new Set<string>();
    if (listData.created_by) scopeUserIds.add(listData.created_by);
    weekItems?.forEach(item => {
      if (item.assignee_id) scopeUserIds.add(item.assignee_id);
    });

    // Get existing taskhub keys to exclude
    const existingTaskKeys = new Set<string>(
      weekItems?.filter(i => i.taskhub_key).map(i => i.taskhub_key) || []
    );

    // 3. Get available slots (max 10 items)
    const currentItemCount = weekItems?.length || 0;
    const availableSlots = Math.max(0, 10 - currentItemCount);
    
    if (availableSlots === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], availableSlots: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Query TaskHub (planner_tasks) for high-priority tasks
    const scopeArray = Array.from(scopeUserIds);
    
    let query = supabase
      .from("planner_tasks")
      .select(`
        task_key,
        title,
        priority,
        due_date,
        assignee_id,
        status_id,
        profiles!planner_tasks_assignee_id_fkey(full_name)
      `)
      .in("priority", ["critical", "high"])
      .is("deleted_at", null)
      .limit(20);
    
    if (scopeArray.length > 0) {
      query = query.in("assignee_id", scopeArray);
    }

    const { data: tasks, error: tasksError } = await query;
    
    if (tasksError) {
      console.error("Failed to fetch tasks:", tasksError);
      return new Response(
        JSON.stringify({ suggestions: [], availableSlots }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Filter out tasks already in the list and completed tasks
    // Get non-done status IDs
    const { data: doneStatuses } = await supabase
      .from("planner_task_statuses")
      .select("id")
      .eq("is_done", true);
    
    const doneStatusIds = new Set(doneStatuses?.map(s => s.id) || []);
    
    const candidates: TaskCandidate[] = (tasks || [])
      .filter(task => {
        // Exclude already added tasks
        if (task.task_key && existingTaskKeys.has(task.task_key)) return false;
        // Exclude done tasks
        if (task.status_id && doneStatusIds.has(task.status_id)) return false;
        return true;
      })
      .map(task => ({
        task_key: task.task_key || "",
        title: task.title || "",
        priority: task.priority || "high",
        due_date: task.due_date,
        assignee_id: task.assignee_id,
        assignee_name: (task.profiles as any)?.full_name || null,
      }))
      .slice(0, 10); // Limit candidates for AI

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], availableSlots }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Use Lovable AI to rank and generate reasoning
    const suggestions = await generateAiSuggestions(candidates, availableSlots, lovableApiKey);

    return new Response(
      JSON.stringify({ suggestions, availableSlots }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in aqd-ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateAiSuggestions(
  candidates: TaskCandidate[],
  maxSuggestions: number,
  apiKey: string | undefined
): Promise<AiSuggestion[]> {
  // If no API key, use rule-based ranking
  if (!apiKey) {
    return generateRuleBasedSuggestions(candidates, maxSuggestions);
  }

  const today = new Date().toISOString().split("T")[0];
  const limit = Math.min(maxSuggestions, 3);

  const taskList = candidates.map((t, i) => 
    `${i + 1}. ${t.task_key}: "${t.title}" | Priority: ${t.priority} | Due: ${t.due_date || "none"} | Assignee: ${t.assignee_name || "unassigned"}`
  ).join("\n");

  const systemPrompt = `You are an AI assistant helping prioritize work tasks for a weekly Top 10 priority list. Given a list of candidate tasks, rank them by urgency and importance. Return ONLY a JSON object with your analysis.

RULES:
1. Critical priority tasks should rank higher than High priority
2. Tasks with due dates this week should rank higher
3. Overdue tasks are most urgent
4. Maximum ${limit} suggestions
5. Generate a short (max 50 chars) reasoning for each suggestion

Current date: ${today}`;

  const userPrompt = `Analyze these tasks and select the top ${limit} for a weekly priority list:

${taskList}

Return ONLY a JSON object in this exact format, nothing else:
{
  "suggestions": [
    {
      "task_key": "XXX-123",
      "score": 95,
      "reasoning": "Critical priority, due in 2 days"
    }
  ]
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      if (response.status === 429 || response.status === 402) {
        // Rate limited or payment required, fall back to rule-based
        return generateRuleBasedSuggestions(candidates, maxSuggestions);
      }
      return generateRuleBasedSuggestions(candidates, maxSuggestions);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in AI response");
      return generateRuleBasedSuggestions(candidates, maxSuggestions);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const aiSuggestions = parsed.suggestions || [];

    // Map AI suggestions back to full task data
    return aiSuggestions.slice(0, limit).map((s: any) => {
      const candidate = candidates.find(c => c.task_key === s.task_key);
      if (!candidate) return null;
      return {
        taskKey: candidate.task_key,
        title: candidate.title,
        priority: candidate.priority,
        dueDate: candidate.due_date,
        assigneeId: candidate.assignee_id,
        assigneeName: candidate.assignee_name,
        reasoning: s.reasoning || generateDefaultReasoning(candidate),
        score: s.score || 50,
      };
    }).filter(Boolean) as AiSuggestion[];

  } catch (error) {
    console.error("AI suggestion error:", error);
    return generateRuleBasedSuggestions(candidates, maxSuggestions);
  }
}

function generateRuleBasedSuggestions(
  candidates: TaskCandidate[],
  maxSuggestions: number
): AiSuggestion[] {
  const today = new Date();
  const limit = Math.min(maxSuggestions, 3);

  // Score and sort candidates
  const scored = candidates.map(c => {
    let score = 50;
    
    // Priority scoring
    if (c.priority === "critical") score += 30;
    else if (c.priority === "high") score += 20;
    
    // Due date scoring
    if (c.due_date) {
      const dueDate = new Date(c.due_date);
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) score += 25; // Overdue
      else if (daysUntil <= 3) score += 20;
      else if (daysUntil <= 7) score += 10;
    }
    
    return { ...c, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(c => ({
    taskKey: c.task_key,
    title: c.title,
    priority: c.priority,
    dueDate: c.due_date,
    assigneeId: c.assignee_id,
    assigneeName: c.assignee_name,
    reasoning: generateDefaultReasoning(c),
    score: c.score,
  }));
}

function generateDefaultReasoning(task: TaskCandidate): string {
  const parts: string[] = [];
  
  if (task.priority === "critical") {
    parts.push("Critical priority");
  } else if (task.priority === "high") {
    parts.push("High priority");
  }
  
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const today = new Date();
    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      parts.push(`${Math.abs(daysUntil)} days overdue`);
    } else if (daysUntil === 0) {
      parts.push("due today");
    } else if (daysUntil === 1) {
      parts.push("due tomorrow");
    } else if (daysUntil <= 7) {
      parts.push(`due in ${daysUntil} days`);
    }
  }
  
  return parts.length > 0 ? parts.join(", ") : "Should be prioritized";
}
