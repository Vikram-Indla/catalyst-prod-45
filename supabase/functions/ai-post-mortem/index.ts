import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BrRow {
  id: string;
  title: string;
  description: string | null;
  process_step: string | null;
  created_at: string;
  updated_at: string;
  assignee: string | null;
}

interface AuditLogRow {
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

interface StageHistoryRow {
  stage_code: string;
  entered_at: string;
  exited_at: string | null;
}

interface PostMortemResponse {
  summary: string;
  timeline: string;
  lessons: string[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brId } = await req.json();
    if (!brId) {
      return new Response(JSON.stringify({ error: "brId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch BR details
    const { data: br, error: brErr } = await supabase
      .from("business_requests")
      .select("id, title, description, process_step, created_at, updated_at, assignee")
      .eq("id", brId)
      .maybeSingle();

    if (brErr) throw brErr;
    if (!br) {
      return new Response(JSON.stringify({ error: "BR not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brRow = br as BrRow;

    // Fetch stage history from audit logs (process_step changes)
    const { data: history } = await supabase
      .from("business_request_audit_logs")
      .select("old_value, new_value, changed_at")
      .eq("business_request_id", brId)
      .eq("field_changed", "process_step")
      .order("changed_at", { ascending: true });

    const auditRows = (history ?? []) as AuditLogRow[];

    // Reconstruct stages from audit transitions
    const stages: StageHistoryRow[] = [];
    for (let i = 0; i < auditRows.length; i++) {
      const row = auditRows[i];
      if (!row.new_value) continue;
      stages.push({
        stage_code: row.new_value,
        entered_at: row.changed_at,
        exited_at: auditRows[i + 1]?.changed_at ?? null,
      });
    }

    // Build stage timeline text
    const stageLines = stages
      .map(s => {
        const entered = new Date(s.entered_at).toLocaleDateString();
        const exited = s.exited_at ? new Date(s.exited_at).toLocaleDateString() : "present";
        return `  - ${s.stage_code}: ${entered} → ${exited}`;
      })
      .join("\n");

    const totalDays = stages.length > 0
      ? Math.floor(
          (new Date(stages[stages.length - 1].exited_at ?? new Date().toISOString()).getTime() -
            new Date(stages[0].entered_at).getTime()) /
            86_400_000,
        )
      : 0;

    const prompt = `You are writing a concise post-mortem for a business request that has been completed.

Business Request: "${brRow.title}"
${brRow.description ? `Description: ${brRow.description}\n` : ""}Owner: ${brRow.assignee_name ?? "Unassigned"}
Total duration: ${totalDays} days
Stage history:
${stageLines || "  (no stage history recorded)"}

Write a post-mortem with three sections. Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "2-3 sentence summary of what was delivered and how it went",
  "timeline": "1-2 sentence description of the journey through stages and total duration",
  "lessons": ["lesson 1", "lesson 2", "lesson 3"]
}

Be specific, constructive, and concise. Base lessons on the actual stage durations above.`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Anthropic API error ${aiRes.status}: ${err}`);
    }

    const aiJson = await aiRes.json();
    const rawText: string = aiJson.content?.[0]?.text ?? "{}";

    // Parse the JSON block from the model response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed: PostMortemResponse = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { summary: rawText, timeline: "", lessons: [] };

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-post-mortem error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
