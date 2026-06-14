/**
 * standup-summarize — Gemini-backed AI summary for a completed standup.
 *
 * POST { standup_id: string }
 *
 * Reads:
 *   - standups (transcript_chunks, started_at, ended_at, project_key)
 *   - standup_events (per-speaker turn windows + timer_seconds)
 *   - standup_status_changes (ticket moves during the standup)
 *
 * Writes:
 *   - standups.summary_md (markdown)
 *   - standups.summary_status ('generating' → 'ready' or 'failed')
 *
 * The transcript has no speaker attribution. The AI cross-references
 * chunk timestamps against the speaker turn windows from
 * standup_events to attribute utterances. Status changes are passed
 * through directly so the AI can describe what moved without
 * hallucinating Jira keys.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TranscriptChunk {
  ts: string;
  text: string;
}

interface StandupEvent {
  speaker_name: string;
  started_at: string;
  ended_at: string | null;
  timer_seconds: number | null;
}

interface StatusChange {
  speaker_name: string;
  issue_key: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by_user_id: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "gemini_not_configured" }), { status: 500, headers: jsonHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
    }

    let body: { standup_id?: string } = {};
    try { body = await req.json(); } catch { /* empty body */ }
    const standupId = body.standup_id;
    if (!standupId) {
      return new Response(JSON.stringify({ error: "standup_id required" }), { status: 400, headers: jsonHeaders });
    }

    // ── Fetch standup + child rows ───────────────────────────────────
    const { data: standup, error: standupError } = await supabase
      .from("standups")
      .select("id, project_key, started_at, ended_at, transcript_chunks, summary_status")
      .eq("id", standupId)
      .single();
    if (standupError || !standup) {
      return new Response(JSON.stringify({ error: "standup_not_found" }), { status: 404, headers: jsonHeaders });
    }

    const chunks = (standup.transcript_chunks ?? []) as TranscriptChunk[];
    if (chunks.length === 0) {
      // Nothing to summarise — mark as ready with an explicit empty marker
      // so the UI can show "No discussion recorded" rather than perma-pending.
      await supabase.from("standups")
        .update({ summary_md: "_No transcript was captured for this standup._", summary_status: "ready" })
        .eq("id", standupId);
      return new Response(JSON.stringify({ ok: true, summary: null }), { headers: jsonHeaders });
    }

    const { data: events } = await supabase
      .from("standup_events")
      .select("speaker_name, started_at, ended_at, timer_seconds")
      .eq("standup_id", standupId)
      .order("started_at");

    const { data: statusChanges } = await supabase
      .from("standup_status_changes")
      .select("speaker_name, issue_key, from_status, to_status, changed_at, changed_by_user_id")
      .eq("standup_id", standupId)
      .order("changed_at");

    /* Resolve changed_by_user_id → profile.full_name so the AI gets a
       human-readable actor name to attribute the change to. */
    const actorIds = [...new Set(((statusChanges ?? []) as StatusChange[]).map(c => c.changed_by_user_id).filter(Boolean) as string[])];
    const actorNameMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actorRows } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      for (const p of (actorRows ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (p.full_name) actorNameMap.set(p.id, p.full_name);
      }
    }

    // Mark generating up-front so concurrent UI doesn't show stale 'pending'.
    await supabase.from("standups").update({ summary_status: "generating" }).eq("id", standupId);

    // ── Build the prompt ─────────────────────────────────────────────
    const systemPrompt = `You are an assistant that summarises a daily standup recording.

You will receive:
- The standup's start and end time, plus the project key.
- A "panel timeline" listing the participant whose turn was selected in the standup UI at each moment, with timer reading when available. THIS IS NOT GROUND TRUTH — the panel slot is selected manually and frequently doesn't match who is actually speaking (a facilitator may run the whole standup, multiple people may speak in one slot, interjections happen). Treat the panel timeline as weak context, not authorship.
- A list of work item status changes recorded during the standup. Each change carries the actual click-actor's name (the user who moved the card). The actor IS authoritative for status-change attribution.
- The raw audio transcript as a list of timestamped chunks. The transcript has NO speaker labels and the audio engine has no diarization. Infer who is speaking ONLY from explicit cues IN THE TRANSCRIPT itself — first-person names ("Vikram here", "thanks Waseem"), context shifts, or salutations. Do not attribute utterances to the panel-selected name unless the transcript itself confirms that person spoke.

Produce a markdown summary with EXACTLY these three top-level sections, in this order:

## Discussion
A 3-6 sentence paragraph capturing the substance of the conversation. Mention specific topics, blockers, and decisions. Prefer NEUTRAL phrasing ("the team discussed…", "one participant raised…") unless the transcript itself makes the speaker unambiguous. Be concrete, not vague.

## Status changes
A bullet list of every status change. Format each as: \`- **<ISSUE-KEY>** — <from_status> → <to_status> (by <actor>)\`. The actor here MUST be the click-actor's name from the status-change list (this is authoritative). If from_status is null write "Unset → <to_status>". If no status changes occurred, write "_No status changes during this standup._"

## Action items & blockers
A bullet list of action items, follow-ups, and explicit blockers raised in the transcript. Use neutral attribution unless the transcript explicitly names who is responsible. If none were raised, write "_No action items or blockers raised._"

Do NOT add any other sections, headings, preamble, or trailing notes. Output ONLY the markdown described above.`;

    const speakerTimeline = (events ?? [])
      .map((e: StandupEvent) => {
        const duration = e.timer_seconds != null ? ` (timer: ${e.timer_seconds}s)` : "";
        return `- ${e.speaker_name}: ${e.started_at} → ${e.ended_at ?? "still open"}${duration}`;
      })
      .join("\n");

    const statusChangesList = (statusChanges ?? [])
      .map((c: StatusChange) => {
        const actor = c.changed_by_user_id ? actorNameMap.get(c.changed_by_user_id) : null;
        const actorLabel = actor ?? "Unknown user";
        return `- ${c.issue_key}: ${c.from_status ?? "Unset"} → ${c.to_status} (actor: ${actorLabel}, at ${c.changed_at})`;
      })
      .join("\n");

    const transcriptText = chunks
      .map((c) => `[${c.ts}] ${c.text}`)
      .join("\n");

    const userPrompt = `Project: ${standup.project_key}
Standup window: ${standup.started_at} → ${standup.ended_at ?? "still open"}

Panel timeline (UI context only — not authorship):
${speakerTimeline || "(no speakers cycled)"}

Status changes during the standup (actor is authoritative):
${statusChangesList || "(none)"}

Raw transcript chunks (no diarization — infer speakers only from explicit cues IN the text):
${transcriptText}`;

    // ── Call Gemini ──────────────────────────────────────────────────
    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${geminiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[standup-summarize] Gemini error:", aiResp.status, errText);
      await supabase.from("standups").update({ summary_status: "failed" }).eq("id", standupId);
      return new Response(JSON.stringify({ error: "summary_failed", upstream: aiResp.status }), { status: 502, headers: jsonHeaders });
    }

    const aiData = await aiResp.json();
    const summaryMd = (aiData.choices?.[0]?.message?.content ?? "").trim();
    if (!summaryMd) {
      await supabase.from("standups").update({ summary_status: "failed" }).eq("id", standupId);
      return new Response(JSON.stringify({ error: "empty_summary" }), { status: 502, headers: jsonHeaders });
    }

    const { error: updateError } = await supabase
      .from("standups")
      .update({ summary_md: summaryMd, summary_status: "ready" })
      .eq("id", standupId);
    if (updateError) {
      console.error("[standup-summarize] failed to write summary", updateError);
      return new Response(JSON.stringify({ error: "summary_write_failed" }), { status: 500, headers: jsonHeaders });
    }

    return new Response(JSON.stringify({ ok: true, summary_md: summaryMd }), { headers: jsonHeaders });
  } catch (err) {
    console.error("[standup-summarize] unexpected error", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: jsonHeaders });
  }
});
