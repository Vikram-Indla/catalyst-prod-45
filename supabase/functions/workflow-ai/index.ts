// @ts-nocheck
/**
 * workflow-ai — Natural-language workflow editor powered by Gemini 2.5 Flash.
 *
 * Receives: issueType, currentStatuses, currentTransitions, userPrompt, conversationHistory
 * Returns:  { type, message, proposal?, questions?, violations? }
 *
 * Pattern mirrors ai-improve-story (Gemini direct, same API gateway, same key).
 * Does NOT mutate the DB — it returns a proposal. The client applies via typedQuery.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";

const CAT_COLOR: Record<string, string> = {
  todo: "#64748B",
  in_progress: "#2563EB",
  done: "#16A34A",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildSystemPrompt(
  issueType: string,
  schemeName: string,
  statuses: unknown[],
  transitions: unknown[],
): string {
  return `You are CATY, a workflow architect for Catalyst (a Jira-like project management tool).
You help admin users modify the workflow for issue type: "${issueType}" (scheme: "${schemeName}").

CURRENT WORKFLOW:
Statuses (${statuses.length}):
${JSON.stringify(statuses, null, 2)}

Transitions (${transitions.length}):
${JSON.stringify(transitions, null, 2)}

TASK:
Interpret the user's natural-language instruction and respond ONLY with valid JSON matching exactly this schema:

{
  "type": "proposal" | "questions" | "violation",
  "message": "string — friendly explanation of what you're doing or asking",
  "questions": ["string"] /* only when type=questions — ask for clarification */,
  "violations": ["string"] /* only when type=violation — explain why and suggest alternatives */,
  "proposal": {
    "statusesToAdd": [
      { "name": "string", "category": "todo|in_progress|done", "position": number, "is_final": false }
    ],
    "statusesToRemove": [{ "id": "uuid" }],
    "statusesToUpdate": [{ "id": "uuid", "name"?: "string", "category"?: "todo|in_progress|done", "position"?: number, "is_final"?: boolean }],
    "transitionsToAdd": [
      {
        "name": "string|null",
        "from_status_id": "uuid|null (use null for global)",
        "to_status_id": "uuid OR 'NEW:{statusName}' to reference a newly-added status by name",
        "is_global": boolean,
        "sort_order": number
      }
    ],
    "transitionsToRemove": [{ "id": "uuid" }]
  }
}

RULES (enforce strictly):
1. Exactly ONE status must remain is_initial=true (the first todo-category status). Never remove it.
2. The done category should have at least one is_final=true status. Never remove all final statuses.
3. If a status is removed, also remove all transitions that reference it by id.
4. Positions must be unique integers. If inserting between two positions, shift later statuses.
5. Status colors: todo → "#64748B", in_progress → "#2563EB", done → "#16A34A".
6. When the instruction is ambiguous, respond with type="questions".
7. When the instruction would violate rules 1-4, respond with type="violation" and propose a safe alternative.
8. Use "NEW:{statusName}" in to_status_id/from_status_id to reference a status being added in the same proposal.
9. Always prefer adding global transitions (is_global: true, from_status_id: null) for new statuses — keeps the workflow flexible.
10. For "restore to default" instructions, respond with type="violation" and message "Use the Restore to session start button below to discard all session changes."

IMPORTANT: Return ONLY the JSON object. No markdown. No code fences. No explanation outside the JSON.`;
}

function parseGeminiJSON(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if Gemini wraps the response
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  return JSON.parse(stripped);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const {
      issueType,
      schemeName,
      currentStatuses = [],
      currentTransitions = [],
      userPrompt,
      conversationHistory = [],
    } = body;

    if (!issueType || !userPrompt) {
      return new Response(
        JSON.stringify({ error: "issueType and userPrompt are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = buildSystemPrompt(
      issueType,
      schemeName ?? `${issueType} Workflow`,
      currentStatuses,
      currentTransitions,
    );

    // Build message history (keep last 6 turns to stay within context)
    const historyMessages = (conversationHistory as Array<{ role: string; content: string }>)
      .slice(-6)
      .map((m) => ({ role: m.role === "caty" ? "assistant" : "user", content: m.content }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userPrompt },
    ];

    const geminiRes = await fetch(`${AI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error", detail: errText }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiRes.json();
    const rawContent = geminiData?.choices?.[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = parseGeminiJSON(rawContent);
    } catch (_e) {
      console.error("JSON parse failed:", rawContent);
      return new Response(
        JSON.stringify({
          type: "violation",
          message: "I couldn't parse my own response. Please rephrase your instruction.",
          violations: ["Internal parse error — retry"],
        }),
        { headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    // Enrich statusesToAdd with derived fields (slug, color)
    const result = parsed as Record<string, unknown>;
    if (result.proposal) {
      const proposal = result.proposal as Record<string, unknown>;
      if (Array.isArray(proposal.statusesToAdd)) {
        proposal.statusesToAdd = (proposal.statusesToAdd as Array<Record<string, unknown>>).map((s) => ({
          ...s,
          slug: slugify(s.name as string),
          color: CAT_COLOR[(s.category as string) ?? "todo"] ?? "#64748B",
        }));
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("workflow-ai error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
