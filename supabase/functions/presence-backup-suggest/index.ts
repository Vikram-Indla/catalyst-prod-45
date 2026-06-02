import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

const AI_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODEL = "gemini-2.5-flash";

// ─── Audit logger (best-effort, never throws) ─────────────────────────────────
async function logGovernance(params: {
  action: string;
  payload: Record<string, unknown>;
  status: "ok" | "error";
  error_message?: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return;
    const sb = createClient(url, service, { auth: { persistSession: false } });
    await sb.from("ai_governance_audit_log").insert({
      action: params.action,
      payload: params.payload,
      status: params.status,
      error_message: params.error_message ?? null,
      source: "presence-backup-suggest",
    } as never);
  } catch (_e) {
    /* audit must never block inference */
  }
}

// ─── JSON response helper ─────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse input ──────────────────────────────────────────────────────
    const body = await req.json();

    const assignee_user_id: string =
      typeof body?.assignee_user_id === "string" ? body.assignee_user_id.trim() : "";
    const viewer_user_id: string =
      typeof body?.viewer_user_id === "string" ? body.viewer_user_id.trim() : "";
    const issue_summary: string =
      typeof body?.issue_summary === "string" ? body.issue_summary.trim() : "";
    const issue_type: string =
      typeof body?.issue_type === "string" ? body.issue_type.trim() : "work item";

    if (!assignee_user_id) {
      return json({ error: "assignee_user_id is required" }, 400);
    }

    // ── 2. Guard API key ────────────────────────────────────────────────────
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return json({ error: "GEMINI_API_KEY is not configured" }, 500);
    }

    // ── 3. Service-role Supabase client ─────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // ── 4. Fetch assignee leave record ──────────────────────────────────────
    const { data: leaveRows } = await sb
      .from("user_availability")
      .select("kind, starts_at, ends_at, note, backup_user_id")
      .eq("user_id", assignee_user_id)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: false })
      .limit(1);

    const leaveRecord = leaveRows?.[0] ?? null;

    // ── 5. Fetch assignee profile ───────────────────────────────────────────
    const { data: assigneeProfile } = await sb
      .from("profiles")
      .select("full_name")
      .eq("id", assignee_user_id)
      .single();

    const assigneeName: string = assigneeProfile?.full_name ?? "the assignee";

    // ── 6. Fetch backup candidates via v_user_effective_status ─────────────
    // Use shared_user_ids if viewer_user_id is provided, else fallback to all profiles
    let candidateIds: string[] = [];
    if (viewer_user_id) {
      const { data: sharedRows } = await sb
        .rpc("shared_user_ids", { viewer: viewer_user_id });
      candidateIds = (sharedRows ?? [])
        .map((r: { shared_id: string }) => r.shared_id)
        .filter((id: string) => id !== assignee_user_id);
    }

    let candidatesQuery = sb
      .from("v_user_effective_status")
      .select("user_id, full_name, effective_state, last_seen_at")
      .in("effective_state", ["available", "busy"])
      .neq("user_id", assignee_user_id)
      .limit(10);

    if (candidateIds.length > 0) {
      candidatesQuery = candidatesQuery.in("user_id", candidateIds);
    }

    const { data: candidateRows } = await candidatesQuery;
    const candidates: Array<{ user_id: string; full_name: string | null; effective_state: string }> =
      candidateRows ?? [];

    // ── 7. Check explicit backup_user_id from leave record ──────────────────
    let explicitBackup: { user_id: string; full_name: string | null } | null = null;
    if (leaveRecord?.backup_user_id) {
      const { data: backupProfile } = await sb
        .from("profiles")
        .select("id, full_name")
        .eq("id", leaveRecord.backup_user_id)
        .single();
      if (backupProfile) {
        explicitBackup = { user_id: backupProfile.id, full_name: backupProfile.full_name };
      }
    }

    // ── 8. Build Gemini prompt ──────────────────────────────────────────────
    const leaveContext = leaveRecord
      ? `${assigneeName} is on ${leaveRecord.kind} leave from ${leaveRecord.starts_at.split("T")[0]} until ${leaveRecord.ends_at.split("T")[0]}.${leaveRecord.note ? ` Note: ${leaveRecord.note}` : ""}`
      : `${assigneeName} is currently on leave.`;

    const candidateList = candidates
      .map((c, i) => `${i + 1}. ${c.full_name ?? c.user_id} (${c.effective_state})`)
      .join("\n");

    const explicitNote = explicitBackup
      ? `\n${assigneeName} has explicitly nominated ${explicitBackup.full_name ?? explicitBackup.user_id} as their backup.`
      : "";

    const systemPrompt = `You are Caty, an AI assistant for an enterprise work-management platform. You help route work items to available team members when the intended assignee is unavailable. Be concise and professional.`;

    const userPrompt = `Context:
- ${leaveContext}${explicitNote}
- Work item: ${issue_summary ? `"${issue_summary}" (${issue_type})` : `a ${issue_type}`}
- Available team members:
${candidateList || "  (none found)"}

Task: Recommend the best backup assignee for this work item, and provide a one-sentence coverage insight for the manager.

Respond ONLY with valid JSON in this exact format (no markdown):
{
  "suggested_backup": {
    "user_id": "<user_id from the list above, or null if no candidates>",
    "name": "<full name>",
    "reason": "<one sentence why this person is the best fit>"
  },
  "coverage_insight": "<one sentence manager summary about team coverage while assignee is away>"
}`;

    // ── 9. Call Gemini ──────────────────────────────────────────────────────
    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await logGovernance({
        action: "presence-backup-suggest",
        payload: { assignee_user_id, viewer_user_id },
        status: "error",
        error_message: `Gemini API error ${aiResp.status}: ${errText.slice(0, 200)}`,
      });
      return json({ error: "AI service unavailable" }, 502);
    }

    const aiJson = await aiResp.json();
    const rawContent: string =
      aiJson?.choices?.[0]?.message?.content ?? "";

    // ── 10. Parse Gemini response ───────────────────────────────────────────
    let suggested_backup: { user_id: string | null; name: string; reason: string } = {
      user_id: explicitBackup?.user_id ?? candidates[0]?.user_id ?? null,
      name:    explicitBackup?.full_name ?? candidates[0]?.full_name ?? "No available backup",
      reason:  "No AI suggestion available.",
    };
    let coverage_insight = `${assigneeName} is currently away. Please check team availability.`;

    try {
      // Strip markdown code fences if Gemini wraps in ```json
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (parsed?.suggested_backup?.name) {
        suggested_backup = {
          user_id: parsed.suggested_backup.user_id ?? suggested_backup.user_id,
          name:    parsed.suggested_backup.name,
          reason:  parsed.suggested_backup.reason ?? suggested_backup.reason,
        };
      }
      if (typeof parsed?.coverage_insight === "string") {
        coverage_insight = parsed.coverage_insight;
      }
    } catch (_parseErr) {
      // Keep fallback values — parsing failure must not error the response
    }

    // ── 11. Audit log ───────────────────────────────────────────────────────
    await logGovernance({
      action: "presence-backup-suggest",
      payload: { assignee_user_id, viewer_user_id, issue_type },
      status: "ok",
    });

    // ── 12. Return ──────────────────────────────────────────────────────────
    return json({ suggested_backup, coverage_insight });

  } catch (err) {
    await logGovernance({
      action: "presence-backup-suggest",
      payload: {},
      status: "error",
      error_message: err instanceof Error ? err.message : String(err),
    });
    return json({ error: "Internal error" }, 500);
  }
});
