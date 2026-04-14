import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { issueKey, existingLinkedKeys = [] } = await req.json();
    if (!issueKey) {
      return new Response(JSON.stringify({ error: "issueKey required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch the source issue
    const { data: source } = await supabase.from("ph_issues")
      .select("issue_key, summary, description, issue_type, project_key, labels, status")
      .eq("issue_key", issueKey)
      .is("jira_removed_at", null)
      .single();

    if (!source?.summary) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch candidate pool (same project, recent, limit 200 for AI to rank)
    const { data: candidates, error: candError } = await supabase.from("ph_issues")
      .select("issue_key, summary, issue_type, status, status_category")
      .eq("project_key", source.project_key)
      .is("jira_removed_at", null)
      .neq("issue_key", issueKey)
      .order("jira_updated_at", { ascending: false, nullsFirst: false })
      .limit(200);

    console.log("Candidates found:", candidates?.length, "Error:", candError?.message);

    if (!candidates?.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Filter out already-linked keys
    const excludeSet = new Set(existingLinkedKeys);
    const filtered = candidates.filter((c: any) => !excludeSet.has(c.issue_key));
    if (!filtered.length) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Ask AI to rank by semantic similarity
    const candidateList = filtered.slice(0, 100).map((c: any, i: number) =>
      `${i + 1}. ${c.issue_key} | ${c.issue_type || "Task"} | ${c.status || ""} | ${c.summary}`
    ).join("\n");

    const systemPrompt = `You are a Jira work-item similarity engine. Given a SOURCE issue and a list of CANDIDATE issues, return the indices (1-based) of the top 20 most semantically similar candidates, ranked by relevance. Consider:
- Similar business domain / feature area
- Related technical components
- Overlapping requirements or user stories
- Potential duplicates or related defects
- Blocking / dependency relationships

Return ONLY a JSON array of objects: [{"index": N, "reason": "short reason"}]
No other text. If fewer than 20 are relevant, return fewer.`;

    const userPrompt = `SOURCE ISSUE:
Key: ${source.issue_key}
Type: ${source.issue_type || "Task"}
Summary: ${source.summary}
Description: ${(source.description || "").slice(0, 500)}
Labels: ${(source.labels || []).join(", ") || "none"}

CANDIDATES:
${candidateList}`;

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
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse the AI response — extract JSON array
    let ranked: { index: number; reason?: string }[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) ranked = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
    }

    // 5. Map back to candidate data
    const suggestions = ranked
      .filter((r) => r.index >= 1 && r.index <= filtered.length)
      .map((r) => {
        const c = filtered[r.index - 1];
        return {
          issue_key: c.issue_key,
          summary: c.summary,
          issue_type: c.issue_type,
          status: c.status,
          status_category: c.status_category,
          reason: r.reason || null,
        };
      });

    return new Response(JSON.stringify({
      sourceKey: issueKey,
      model: "gemini-3-flash-preview",
      generatedAt: new Date().toISOString(),
      suggestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-similar-items error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
