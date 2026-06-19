import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { handleThemesRequest } from "./themes.ts";
import { computeSignature, nextSixAmRiyadhUtc } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-force-refresh",
};

const HUB_COLOURS: Record<string, string> = {
  ProjectHub: '#2563EB', ReleaseHub: '#7C3AED', IncidentHub: '#DC2626',
  TestHub: '#D97706', TaskHub: '#0D9488', StrategyHub: '#374151',
  ProductHub: '#374151', PlanHub: '#374151',
};

const CTA_ALLOWLIST = [
  '/project-hub', '/release-hub', '/test-hub',
  '/incident-hub', '/task-hub', '/strategy-hub', '/product-hub', '/plan-hub',
];

function sanitisePath(path: string): string {
  const allowed = CTA_ALLOWLIST.find(p => path?.startsWith(p));
  return allowed ? path : '/project-hub';
}

function clampConf(n: unknown): number {
  const v = typeof n === 'number' ? n : 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function inferRole(userId: string, releases: Record<string, string>[]): string {
  if (releases.some(r => r.release_manager_id === userId)) return 'Release Manager';
  if (releases.some(r => r.qa_lead_id === userId)) return 'QA Lead';
  if (releases.some(r => r.owner_id === userId)) return 'Project Owner';
  return 'Manager';
}

/** Compute a numeric fingerprint from source data for cache invalidation */
async function computeDataFingerprint(
  notifications: any[], releases: any[], incidents: any[], testFails: any[]
): Promise<number> {
  // Build a deterministic string from the data that changes when any item changes
  const parts: string[] = [];
  for (const n of notifications) parts.push(`n:${n.entity_id ?? ''}:${n.created_at ?? ''}`);
  for (const r of releases) parts.push(`r:${r.id}:${r.health}:${r.defects_open}:${r.readiness_pct}:${r.is_blocked}:${r.status}`);
  for (const i of incidents) parts.push(`i:${i.id}:${i.severity}:${i.status}`);
  for (const t of testFails) parts.push(`t:${t.id}:${t.status}`);
  parts.sort(); // deterministic ordering

  const fingerprint = parts.join('|');
  const encoded = new TextEncoder().encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = new Uint8Array(hashBuffer);
  // Take first 4 bytes → 31-bit positive integer (fits postgres INTEGER)
  let num = 0;
  for (let i = 0; i < 4; i++) num = num * 256 + hashArray[i];
  return num >>> 1; // ensure positive (31 bits, max ~2.1B)
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const forceRefresh = req.headers.get("x-force-refresh") === "true";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Pre-warm path: a trusted service-role caller (ai-theme-prewarm, the
    // 06:00 Riyadh pg_cron job) acts on behalf of a user via the
    // X-User-Id-Override header. getUser() does NOT resolve a service-role
    // token to a user, so without this branch every pre-warm call 401s
    // (the latent reason the nightly warm never worked). Both the
    // service-role key AND the override header are required — normal users
    // (anon key + user JWT) never take this path.
    const overrideUserId = req.headers.get("X-User-Id-Override");
    const isServiceRole = Boolean(serviceRoleKey) && authHeader === `Bearer ${serviceRoleKey}`;

    let supabase;
    let userId: string;
    if (isServiceRole && overrideUserId) {
      supabase = createClient(supabaseUrl, serviceRoleKey!, {
        auth: { persistSession: false },
      });
      userId = overrideUserId;
    } else {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    // ── MODE DISPATCH ────────────────────────────────────────────────
    // The ai-digest endpoint serves two modes:
    //   (a) default — daily portfolio digest (AI Recap, existing code)
    //   (b) themes  — AI Theme Analyzer for the For You → AI Theme tab
    //
    // We clone the request so existing body consumers downstream keep
    // working in default mode. An empty or missing body = default mode.
    let body: Record<string, unknown> = {};
    if (req.headers.get('content-length') && req.headers.get('content-length') !== '0') {
      try {
        body = await req.clone().json();
      } catch {
        body = {};
      }
    }

    if (body.mode === 'themes') {
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiApiKey) {
        console.error("GEMINI_API_KEY not configured for themes mode");
        return new Response(
          JSON.stringify({ error: "themes_unavailable" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return handleThemesRequest({
        body: body as Parameters<typeof handleThemesRequest>[0]['body'],
        supabase,
        userId,
        geminiApiKey,
        corsHeaders,
      });
    }
    // ── NEW AI MODES — For You tab Caty features ────────────────────────
    if (body.mode === 'ageing-triage' || body.mode === 'board-insight' || body.mode === 'workload-risk' || body.mode === 'morning-brief' || body.mode === 'release-risk') {
      const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
      if (!geminiApiKey) {
        return new Response(
          JSON.stringify({ error: "gemini_unavailable" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const context = typeof body.context === 'string' ? body.context : JSON.stringify(body.context ?? {});
      let systemPrompt = '';
      let responseKey = '';

      if (body.mode === 'ageing-triage') {
        systemPrompt = `You are Caty, an AI work management assistant. Analyze these stale work items and for each one explain WHY it is stuck and suggest a concrete unblock action. Return JSON: { "triageResults": [{ "issueKey": string, "summary": string, "daysOpen": number, "reason": string, "suggestion": string }] }. Be concise — one sentence each for reason and suggestion. Use the data provided (comment count, assignee activity, days open) to form your analysis. Do not invent data.`;
        responseKey = 'triageResults';
      } else if (body.mode === 'board-insight') {
        systemPrompt = `You are Caty, an AI work management assistant for Catalyst (Saudi Arabia Ministry of Industry). Analyze the user's board columns. The data includes each column's name, item count, average days since last update, and the stalest item with its reporter and project. Return JSON: { "insight": { "summary": string, "columns": [{ "column": string, "count": number, "avgDays": number, "status": "healthy"|"warning"|"bottleneck", "action": string }] } }. Rules: (1) summary = 2 sentences, lead with the single most critical finding and name the specific column + item key. (2) Per-column action = one imperative sentence naming the specific blocker item key, reporter, and what to do (e.g. "Escalate BAU-4515 to QA lead — 122 days with no activity, reported by Ahmed"). (3) Only top 5 columns by risk (count x avgDays). (4) status: bottleneck if avg >30 days, warning if avg >14 days, healthy otherwise. Do not invent data — use only what is provided.`;
        responseKey = 'insight';
      } else if (body.mode === 'workload-risk') {
        systemPrompt = `You are Caty, an AI work management assistant. Analyze team workload signals. Return JSON: { "workload": { "summary": string, "members": [{ "name": string, "openItems": number, "roleAvg": number, "closureTrend": "up"|"down"|"flat", "closureRate": number, "staleCount": number, "status": "overloaded"|"healthy"|"has-capacity", "detail": string }] } }. Base status on: overloaded = open items > 1.5x role avg OR stale > 30%, has-capacity = open items < 0.7x role avg, healthy = in between.`;
        responseKey = 'workload';
      } else if (body.mode === 'morning-brief') {
        systemPrompt = `You are Caty, an AI work management assistant. Write a 3-sentence morning brief for this user based on their assigned items. Mention: items due this week, highest-priority unblocked item, and any items that may need attention (stale or blocked). Return JSON: { "brief": string }. Be direct and actionable — no pleasantries.`;
        responseKey = 'brief';
      } else if (body.mode === 'release-risk') {
        systemPrompt = `You are Caty, the AI release-operations analyst for Catalyst (Saudi Arabia Ministry of Industry). You are given a JSON snapshot of release operations: active releases (with name, status, health, readiness_pct, target date), in-flight changes, code-freeze windows (with conflict counts), pending sign-off approvals (with how long each has waited), and rollup counts. Assess deployment risk for the next window. Return JSON: { "risk": { "riskIndex": number, "posture": "clear"|"watch"|"elevated"|"critical", "headline": string, "narrative": string, "drivers": [{ "severity": "high"|"medium"|"low", "title": string, "action": string, "link": "freeze"|"signoff"|"release"|null, "entityName": string }] } }.
Rules:
(1) riskIndex = integer 0-100 reflecting how exposed the next deployment window is. Weight signals: a freeze conflict is the strongest signal, then at-risk release health, then long-pending sign-offs, then low readiness_pct. No blocking signals = a low index in the 0-20 band.
(2) posture: "clear" if riskIndex < 25, "watch" if 25-49, "elevated" if 50-74, "critical" if >= 75.
(3) headline = max 8 words, name the single most exposed release or the dominant risk (e.g. "June Production Release exposed by freeze conflict"). If nothing is wrong, say the path is clear.
(4) narrative = exactly 2 sentences. Lead with the most critical finding naming the specific release/window; second sentence states the corrective path before the next window. No pleasantries.
(5) drivers = 0 to 4 items, ranked most-severe first. Each: severity by impact; title = the specific problem naming the real entity (release name, approver, window); action = one imperative sentence with the concrete next step; entityName = the human-readable release/change/window/approver name from the data (never a UUID); link = "freeze" for freeze-window issues, "signoff" for pending-approval issues, "release" for release-health/readiness issues, null otherwise.
(6) If there are zero blocking signals, return an empty drivers array and a reassuring narrative.
Use ONLY the data provided. Never invent releases, names, dates, or counts. Never surface a UUID in any text field.`;
        responseKey = 'risk';
      }

      // ── ageing-triage cache: no-delta guard (2026-06-18) ──────────────
      // Hash the top-10 items' semantic state; if it matches the user's cached
      // row, serve cache and skip Gemini. days_open is excluded from the hash
      // (it ticks daily and would otherwise bust the cache for no reason).
      // Shared with themes via _shared/ai-cache.ts. Other modes are uncached.
      let ageingSignature: string | null = null;
      if (body.mode === 'ageing-triage') {
        try {
          const ctxItems = JSON.parse(context) as Array<Record<string, unknown>>;
          ageingSignature = await computeSignature(ctxItems, [
            'key', 'status', 'commentCount', 'assigneeIsInactive',
          ]);
          const { data: cachedRow } = await supabase
            .from('ai_ageing_triage_cache')
            .select('payload, issues_signature')
            .eq('user_id', userId)
            .maybeSingle();
          if (cachedRow && cachedRow.issues_signature === ageingSignature) {
            console.log(`[ageing-triage] no-delta cache HIT user=${userId}`);
            return new Response(
              JSON.stringify({ ...(cachedRow.payload as Record<string, unknown>), cached: true, no_delta: true }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (e) {
          console.error('[ageing-triage] cache read failed (continuing to Gemini):', e);
        }
      }

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${geminiApiKey}`,
            },
            body: JSON.stringify({
              model: 'gemini-2.5-flash',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context },
              ],
              temperature: 0.3,
              max_tokens: 2000,
            }),
          }
        );

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          console.error(`Gemini ${body.mode} error:`, geminiRes.status, errText);
          return new Response(
            JSON.stringify({ error: `gemini_error_${geminiRes.status}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const geminiData = await geminiRes.json();
        const content = geminiData?.choices?.[0]?.message?.content;
        if (!content) {
          return new Response(
            JSON.stringify({ error: "empty_response" }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const parsed = JSON.parse(content);

        // ── ageing-triage cache write (2026-06-18) ──────────────────────
        // Store the fresh result keyed by user_id with the signature computed
        // above. delete-then-insert keeps it simple across the single-row key.
        if (body.mode === 'ageing-triage' && ageingSignature) {
          try {
            await supabase.from('ai_ageing_triage_cache').delete().eq('user_id', userId);
            const { error: cacheErr } = await supabase.from('ai_ageing_triage_cache').insert({
              user_id: userId,
              payload: parsed,
              issues_signature: ageingSignature,
              generated_at: new Date().toISOString(),
              expires_at: nextSixAmRiyadhUtc(new Date()).toISOString(),
            });
            if (cacheErr) console.error('[ageing-triage] cache write failed:', cacheErr.message);
            else console.log(`[ageing-triage] cache STORED user=${userId}`);
          } catch (e) {
            console.error('[ageing-triage] cache write threw (non-fatal):', e);
          }
        }

        return new Response(
          JSON.stringify(parsed),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error(`ai-digest ${body.mode} error:`, e);
        return new Response(
          JSON.stringify({ error: "internal_error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }



    // ── FETCH SOURCE DATA (always needed for fingerprint) ────────────
    const now = new Date();
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const TIMEOUT_MS = 8000;
    const withTimeout = <T>(p: PromiseLike<T>): Promise<T> =>
      Promise.race([Promise.resolve(p), new Promise<T>((_, rej) =>
        setTimeout(() => rej(new Error('query_timeout')), TIMEOUT_MS))]);

    const [notifRes, releasesRes, incidentsRes, testFailRes] = await Promise.allSettled([
      withTimeout(supabase
        .from("notifications")
        .select("notification_type, entity_type, entity_title, entity_id, entity_key, hub_source, status, created_at")
        .eq("recipient_user_id", userId)
        .eq("is_dismissed", false)
        .gte("created_at", cutoff48h)
        .order("created_at", { ascending: false })
        .limit(30)),

      withTimeout(supabase
        .from("releases")
        .select("id, name, target_date, status, health, is_blocked, blocked_reason, defects_open, critical_defects, blocker_defects, readiness_pct, project_id, owner_id, release_manager_id, qa_lead_id")
        .not("status", "in", '("released","cancelled")')
        .is("deleted_at", null)
        .lte("target_date", sevenDaysOut)
        .or(`owner_id.eq.${userId},release_manager_id.eq.${userId},qa_lead_id.eq.${userId}`)
        .limit(10)),

      withTimeout(supabase
        .from("incidents")
        .select("id, incident_key, title, severity, priority, status, project_id, assignee_id, reporter_id, target_date, created_at")
        .in("severity", ["critical", "high"])
        .not("status", "in", '("resolved","closed")')
        .is("deleted_at", null)
        .or(`assignee_id.eq.${userId},reporter_id.eq.${userId}`)
        .limit(10)),

      withTimeout(supabase
        .from("tm_test_cases")
        .select("id, case_key, project_id, status")
        .eq("status", "failed")
        .gte("updated_at", cutoff24h)
        .limit(20)),
    ]);

    const notifications: any[] = notifRes.status === 'fulfilled' ? (notifRes.value as any).data ?? [] : [];
    const releases: any[] = releasesRes.status === 'fulfilled' ? (releasesRes.value as any).data ?? [] : [];
    const incidents: any[] = incidentsRes.status === 'fulfilled' ? (incidentsRes.value as any).data ?? [] : [];
    const testFails: any[] = testFailRes.status === 'fulfilled' ? (testFailRes.value as any).data ?? [] : [];

    // ── CONTENT-HASH CACHE CHECK ─────────────────────────────────────
    const dataFingerprint = await computeDataFingerprint(notifications, releases, incidents, testFails);

    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_digest_cache")
        .select("digest_json, has_critical, role_persona")
        .eq("user_id", userId)
        .eq("context_version", dataFingerprint)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        console.log(`Cache HIT for user ${userId}, fingerprint=${dataFingerprint}`);
        return new Response(
          JSON.stringify({ digest: cached.digest_json, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Cache MISS for user ${userId}, fingerprint=${dataFingerprint}`);
    }

    // ── EMPTY DATA — no AI call needed ───────────────────────────────
    if (!notifications.length && !releases.length && !incidents.length && !testFails.length) {
      return new Response(
        JSON.stringify({ digest: { summary: "", items: [], role_persona: "Manager", has_critical: false, generated_at: now.toISOString() }, cached: false, empty: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rolePersona = inferRole(userId, releases as Record<string, string>[]);

    const fmtReleases = releases.map((r: any) =>
      `Release "${r.name}": target=${r.target_date}, health=${r.health}, is_blocked=${r.is_blocked}, defects_open=${r.defects_open}, critical_defects=${r.critical_defects}, readiness_pct=${r.readiness_pct}%, id=${r.id}`
    ).join('\n') || 'None';

    const fmtIncidents = incidents.map((i: any) =>
      `[${i.incident_key}] "${i.title}" severity=${i.severity}, status=${i.status}, assignee=${i.assignee_id === userId ? 'YOU' : 'other'}, created=${i.created_at}, id=${i.id}`
    ).join('\n') || 'None';

    const fmtTests = testFails.length
      ? `${testFails.length} test cases failed in last 24h. case_keys: ${testFails.slice(0,5).map((t: any) => t.case_key).join(', ')}${testFails.length > 5 ? ' ...' : ''}`
      : 'None';

    const fmtNotifs = notifications.slice(0, 15).map((n: any, i: number) =>
      `${i+1}. [${n.notification_type}] ${n.entity_title} (${n.entity_type}, hub: ${n.hub_source}, key: ${n.entity_key ?? 'none'}, id: ${n.entity_id ?? 'null'})`
    ).join('\n') || 'None';

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ digest: null, error: "digest_unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are the AI intelligence layer for Catalyst, Saudi Arabia Ministry of Industry's enterprise portfolio management platform. You receive real-time portfolio data — not just notifications. Surface what genuinely matters to this specific user today. Return ONLY valid JSON. No markdown. No preamble.

USER ROLE: ${rolePersona}
CURRENT TIME: ${now.toISOString()} (Asia/Riyadh UTC+3). Work week: Sunday–Thursday.

SCORING RULES:
- Release Manager: weight release_risk=1.0, defect=0.9, incident=0.7, test_fail=0.6
- QA Lead: weight test_fail=1.0, defect=1.0, release_risk=0.8, incident=0.5
- Project Owner: weight incident=1.0, release_risk=0.9, defect=0.7, test_fail=0.5
- Manager: weight release_risk=0.9, incident=0.9, defect=0.7, test_fail=0.6

OUTPUT RULES:
- Maximum 5 items total, ranked by urgency × role_weight
- risk_horizon: "critical_now" = action needed <6h, "today" = before end of work day, "this_week" = before Thursday 23:59, "good_news" = positive signal
- trigger: 1 sentence explaining WHY this was surfaced. Use human-readable descriptions only. ALWAYS refer to items by their Jira key (e.g. "INC-0041", "SEN-123") or title — NEVER use raw UUIDs or entity_id values. The 'key' field in notification data is the Jira key.
- consequence: 1 sentence, specific business outcome if ignored
- action: imperative verb phrase, specific. ALWAYS use Jira keys or titles to reference items (e.g. "Assign INC-0041 to QA lead before 17:00"). NEVER use raw UUIDs.
- cta_path: MUST start with one of: /project-hub /release-hub /test-hub /incident-hub /task-hub /strategy-hub /product-hub /plan-hub
- entity_id: use the real uuid from the data, or null if not available. This is for internal linking only — NEVER surface it in user-facing text fields (trigger, action, detail, consequence, title).
- confidence: 0-100 integer, your certainty this is genuinely actionable today
- metrics: 2-4 key numbers from the source data as a compact stat line. Examples: "61% ready · 3 critical defects · target in 2d", "Open 4h 22m · SLA breach in 1h 38m · unassigned", "7 failed / 42 total · 16% pass rate · last run 3h ago". Use ONLY values present in the data provided. No invented numbers.
- has_critical: true if ANY item has risk_horizon "critical_now"
- good_news: include ONLY if something concretely improved - max 1 item, priority LOW
- If fewer than 5 genuine signals exist, return fewer items. Do NOT pad.`;

    const userPrompt = `PORTFOLIO STATE:

RELEASES AT RISK (next 7 days):
${fmtReleases}

OPEN CRITICAL/HIGH INCIDENTS:
${fmtIncidents}

FAILED TEST CASES (last 24h):
${fmtTests}

RECENT NOTIFICATIONS (supporting signal):
${fmtNotifs}

Return JSON:
{
  "summary": "One sentence daily briefing for ${rolePersona} — recap portfolio state as of now. Lead with the most critical number or fact. Write as a briefing, not an alert. Example: '3 critical defects block Release 2.4 shipping Thursday — registration flow is down for new users and requires immediate triage.'",
  "role_persona": "${rolePersona}",
  "has_critical": true|false,
  "generated_at": "${now.toISOString()}",
  "items": [
    {
      "priority": "HIGH|MED|LOW",
      "risk_horizon": "critical_now|today|this_week|good_news",
      "title": "...",
      "trigger": "...",
      "consequence": "...",
      "action": "...",
      "detail": "...",
      "hub": "ReleaseHub|ProjectHub|TestHub|IncidentHub|TaskHub",
      "cta_label": "Open in ReleaseHub",
      "cta_path": "/release-hub/releases/[uuid-or-omit]",
      "confidence": 0-100,
      "entity_id": "uuid or null",
      "project_name": "name or null",
      "hub_colour": "#hex",
      "metrics": "compact stat line string"
    }
  ]
}`;

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
      console.error("Lovable AI error:", aiResp.status, errText);
      if (aiResp.status === 429) return new Response(JSON.stringify({ digest: null, error: "rate_limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ digest: null, error: "credits_exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ digest: null, error: "digest_unavailable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResp.json();
    let rawText = aiData.choices?.[0]?.message?.content ?? "";
    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(rawText); }
    catch {
      console.error("JSON parse failed:", rawText);
      return new Response(JSON.stringify({ digest: null, error: "digest_unavailable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build a key map from all source data
    const sourceKeyMap: Record<string, string> = {};
    for (const n of notifications) {
      if (n.entity_id && n.entity_key) sourceKeyMap[n.entity_id] = n.entity_key;
    }
    for (const i of incidents) {
      if (i.id && i.incident_key) sourceKeyMap[i.id] = i.incident_key;
    }
    for (const t of testFails) {
      if (t.id && t.case_key) sourceKeyMap[t.id] = t.case_key;
    }

    let items: any[] = ((parsed.items ?? []) as any[]).map((item: any) => {
      const eid = typeof item.entity_id === 'string' && item.entity_id.length === 36 ? item.entity_id : null;
      return {
        ...item,
        cta_path: sanitisePath(item.cta_path as string),
        confidence: clampConf(item.confidence),
        hub_colour: HUB_COLOURS[(item.hub as string) ?? ''] ?? '#374151',
        entity_id: eid,
        entity_key: eid ? (sourceKeyMap[eid] ?? null) : null,
      };
    });

    // Post-process: resolve ANY UUID fragments in text fields to Jira keys
    const uuidPattern = /\b([0-9a-f]{8})(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\b/gi;
    const textFields = ['trigger', 'action', 'detail', 'consequence', 'title'] as const;
    const allText = items.map((i: any) => textFields.map(f => String(i[f] ?? '')).join(' ')).join(' ');
    const uuidMatches = [...allText.matchAll(uuidPattern)];
    const shortIds = [...new Set(uuidMatches.map(m => m[1].toLowerCase()))];

    // Also collect entity_ids that didn't resolve from source data
    const unresolvedEntityIds = items
      .filter(i => i.entity_id && !i.entity_key)
      .map(i => i.entity_id as string);

    // Resolve from ph_issues if needed
    const allIdsToResolve = [...new Set([...unresolvedEntityIds])];
    const issueKeyMap: Record<string, string> = {};

    if (allIdsToResolve.length > 0 || shortIds.length > 0) {
      const filters: string[] = [];
      if (allIdsToResolve.length > 0) {
        filters.push(...allIdsToResolve.map(id => `id.eq.${id}`));
      }
      if (shortIds.length > 0) {
        filters.push(...shortIds.map(s => `id.like.${s}%`));
      }
      const { data: issueRows } = await supabase
        .from('ph_issues')
        .select('id, issue_key')
        .or(filters.join(','))
        .limit(50);

      if (issueRows) {
        for (const row of issueRows) {
          issueKeyMap[row.id] = row.issue_key;
          issueKeyMap[row.id.split('-')[0]] = row.issue_key;
        }
      }
    }

    // Merge all key maps
    const fullKeyMap = { ...issueKeyMap, ...sourceKeyMap };

    // Replace UUIDs in text and fill missing entity_key
    items = items.map((item: any) => {
      const patched = { ...item };
      if (patched.entity_id && !patched.entity_key && issueKeyMap[patched.entity_id]) {
        patched.entity_key = issueKeyMap[patched.entity_id];
      }
      for (const field of textFields) {
        if (typeof patched[field] === 'string') {
          let val = patched[field] as string;
          for (const [uuid, key] of Object.entries(fullKeyMap)) {
            val = val.split(uuid).join(key);
          }
          patched[field] = val;
        }
      }
      return patched;
    });

    const digestV2 = { ...parsed, items };
    const hasCritical = items.some((i: any) => i.risk_horizon === 'critical_now');
    const ttlMs = hasCritical ? 30 * 60 * 1000 : 4 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    // ── STORE IN CACHE with content fingerprint ──────────────────────
    // Delete stale cache entries for this user first
    const { error: delErr } = await supabase.from("ai_digest_cache").delete().eq("user_id", userId);
    if (delErr) console.warn("Cache delete error:", delErr.message);

    const { error: insErr } = await supabase.from("ai_digest_cache").insert({
      user_id: userId,
      digest_json: digestV2,
      generated_at: now.toISOString(),
      expires_at: expiresAt,
      has_critical: hasCritical,
      context_version: dataFingerprint,
      role_persona: (parsed.role_persona as string) ?? 'Manager',
    });
    if (insErr) console.error("Cache insert error:", insErr.message, insErr.details);

    console.log(`Cache STORED for user ${userId}, fingerprint=${dataFingerprint}, ttl=${hasCritical ? '30m' : '4h'}`);

    return new Response(
      JSON.stringify({ digest: digestV2, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("ai-digest error:", e);
    return new Response(JSON.stringify({ digest: null, error: "digest_unavailable" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
