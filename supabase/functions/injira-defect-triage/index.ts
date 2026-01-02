import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DefectTriageSuggestion {
  priority?: {
    value: string;
    confidence: number;
    reasoning: string;
  };
  assignee?: {
    user_id: string;
    user_name: string;
    confidence: number;
    reasoning: string;
  };
  classification?: {
    category: string;
    confidence: number;
    reasoning: string;
  };
  duplicate?: {
    issue_id: string;
    issue_key: string;
    confidence: number;
    reasoning: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { issue_id, tenant_id } = await req.json();

    if (!issue_id) {
      throw new Error("issue_id is required");
    }

    // Get the defect/issue
    const { data: issue, error: issueError } = await supabase
      .from("injira_issues")
      .select(`
        *,
        issue_type:injira_issue_types(name, category),
        project:injira_projects(key, name)
      `)
      .eq("id", issue_id)
      .single();

    if (issueError || !issue) {
      throw new Error("Issue not found");
    }

    // Only process defects
    if (issue.issue_type?.category !== 'defect') {
      return new Response(
        JSON.stringify({ success: false, message: "Not a defect issue type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team members for assignee suggestion
    const { data: teamMembers } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .limit(50);

    // Get recent similar issues for duplicate detection
    const { data: recentIssues } = await supabase
      .from("injira_issues")
      .select("id, key, summary, description")
      .eq("project_id", issue.project_id)
      .neq("id", issue_id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Call Lovable AI for triage suggestions
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a defect triage AI assistant. Analyze defects and provide structured suggestions for:
1. Priority (highest, high, medium, low, lowest)
2. Potential assignee based on expertise
3. Classification/category
4. Potential duplicate detection

Respond ONLY with valid JSON matching this schema:
{
  "priority": { "value": "high|medium|low|highest|lowest", "confidence": 0.0-1.0, "reasoning": "..." },
  "classification": { "category": "ui|backend|data|integration|performance|security|other", "confidence": 0.0-1.0, "reasoning": "..." },
  "duplicate": { "potential_match_key": "PROJ-123 or null", "confidence": 0.0-1.0, "reasoning": "..." } | null
}`
          },
          {
            role: "user",
            content: `Analyze this defect:

Title: ${issue.summary}
Description: ${issue.description || 'No description'}
Project: ${issue.project?.name} (${issue.project?.key})

Recent similar issues for duplicate detection:
${(recentIssues || []).slice(0, 10).map(i => `- ${i.key}: ${i.summary}`).join('\n')}

Provide triage suggestions as JSON.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      throw new Error("AI triage failed");
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response
    let suggestions: DefectTriageSuggestion = {};
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiContent];
      suggestions = JSON.parse(jsonMatch[1] || aiContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      suggestions = {
        priority: { value: 'medium', confidence: 0.5, reasoning: 'Default assignment due to parsing error' }
      };
    }

    // Store suggestions in database
    const suggestionInserts = [];

    if (suggestions.priority) {
      suggestionInserts.push({
        tenant_id: tenant_id || '00000000-0000-0000-0000-000000000001',
        issue_id,
        suggestion_type: 'priority',
        suggestion_data: suggestions.priority,
        confidence_score: suggestions.priority.confidence,
        model_version: 'gemini-2.5-flash',
      });
    }

    if (suggestions.classification) {
      suggestionInserts.push({
        tenant_id: tenant_id || '00000000-0000-0000-0000-000000000001',
        issue_id,
        suggestion_type: 'classification',
        suggestion_data: suggestions.classification,
        confidence_score: suggestions.classification.confidence,
        model_version: 'gemini-2.5-flash',
      });
    }

    if (suggestions.duplicate && (suggestions.duplicate as any).potential_match_key) {
      suggestionInserts.push({
        tenant_id: tenant_id || '00000000-0000-0000-0000-000000000001',
        issue_id,
        suggestion_type: 'duplicate',
        suggestion_data: suggestions.duplicate,
        confidence_score: suggestions.duplicate.confidence,
        model_version: 'gemini-2.5-flash',
      });
    }

    if (suggestionInserts.length > 0) {
      const { error: insertError } = await supabase
        .from("injira_ai_suggestions")
        .insert(suggestionInserts);

      if (insertError) {
        console.error("Failed to store suggestions:", insertError);
      }

      // Update issue to flag pending suggestions
      await supabase
        .from("injira_issues")
        .update({ ai_suggestions_pending: true })
        .eq("id", issue_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        issue_id,
        suggestions,
        suggestions_stored: suggestionInserts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Defect triage error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
