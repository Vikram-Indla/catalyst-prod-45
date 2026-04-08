import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("ai_digest_cache")
        .select("digest_json, has_critical, role_persona")
        .eq("user_id", userId)
        .eq("context_version", 2)
        .gt("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ digest: cached.digest_json, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const now = new Date();
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const TIMEOUT_MS = 8000;
    const withTimeout = <T>(p: Promise<T>): Promise<T> =>
      Promise.race([p, new Promise<T>((_, rej) =>
        setTimeout(() => rej(new Error('query_timeout')), TIMEOUT_MS))]);

    const [notifRes, releasesRes, incidentsRes, testFailRes] = await Promise.allSettled([
      withTimeout(supabase
        .from("notifications")
        .select("notification_type, entity_type, entity_title, entity_id, hub_source, status, created_at")
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

    const notifications = notifRes.status === 'fulfilled' ? notifRes.value.data ?? [] : [];
    const releases = releasesRes.status === 'fulfilled' ? releasesRes.value.data ?? [] : [];
    const incidents = incidentsRes.status === 'fulfilled' ? incidentsRes.value.data ?? [] : [];
    const testFails = testFailRes.status === 'fulfilled' ? testFailRes.value.data ?? [] : [];

    if (!notifications.length && !releases.length && !incidents.length && !testFails.length) {
      return new Response(
        JSON.stringify({ digest: { summary: "", items: [], role_persona: "Manager", has_critical: false, generated_at: now.toISOString() }, cached: false, empty: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rolePersona = inferRole(userId, releases as Record<string, string>[]);

    const fmtReleases = releases.map(r =>
      `Release "${r.name}": target=${r.target_date}, health=${r.health}, is_blocked=${r.is_blocked}, defects_open=${r.defects_open}, critical_defects=${r.critical_defects}, readiness_pct=${r.readiness_pct}%, id=${r.id}`
    ).join('\n') || 'None';

    const fmtIncidents = incidents.map(i =>
      `[${i.incident_key}] "${i.title}" severity=${i.severity}, status=${i.status}, assignee=${i.assignee_id === userId ? 'YOU' : 'other'}, created=${i.created_at}, id=${i.id}`
    ).join('\n') || 'None';

    const fmtTests = testFails.length
      ? `${testFails.length} test cases failed in last 24h. case_keys: ${testFails.slice(0,5).map(t => t.case_key).join(', ')}${testFails.length > 5 ? ' ...' : ''}`
      : 'None';

    const fmtNotifs = notifications.slice(0, 15).map((n, i) =>
      `${i+1}. [${n.notification_type}] ${n.entity_title} (${n.entity_type}, hub: ${n.hub_source}, entity_id: ${n.entity_id ?? 'null'})`
    ).join('\n') || 'None';

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
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
- trigger: 1 sentence, cite actual data values (column names and values from context)
- consequence: 1 sentence, specific business outcome if ignored
- action: imperative verb phrase, specific ("Assign INC-0041 to QA lead before 17:00")
- cta_path: MUST start with one of: /project-hub /release-hub /test-hub /incident-hub /task-hub /strategy-hub /product-hub /plan-hub
- entity_id: use the real uuid from the data, or null if not available
- confidence: 0–100 integer, your certainty this is genuinely actionable today
- has_critical: true if ANY item has risk_horizon "critical_now"
- good_news: include ONLY if something concretely improved — max 1 item, priority LOW
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
  "summary": "One sentence for ${rolePersona} — most important thing right now",
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
      "hub_colour": "#hex"
    }
  ]
}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    const items = ((parsed.items ?? []) as Record<string, unknown>[]).map(item => ({
      ...item,
      cta_path: sanitisePath(item.cta_path as string),
      confidence: clampConf(item.confidence),
      hub_colour: HUB_COLOURS[(item.hub as string) ?? ''] ?? '#374151',
      entity_id: typeof item.entity_id === 'string' && item.entity_id.length === 36 ? item.entity_id : null,
    }));

    const digestV2 = { ...parsed, items };
    const hasCritical = items.some(i => i.risk_horizon === 'critical_now');
    const ttlMs = hasCritical ? 30 * 60 * 1000 : 4 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    await supabase.from("ai_digest_cache").insert({
      user_id: userId,
      digest_json: digestV2,
      generated_at: now.toISOString(),
      expires_at: expiresAt,
      has_critical: hasCritical,
      context_version: 2,
      role_persona: (parsed.role_persona as string) ?? 'Manager',
    });

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
