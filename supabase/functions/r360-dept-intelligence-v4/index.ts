import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Simple hash for data fingerprinting ── */
async function computeFingerprint(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { department, weekStart, weekEnd, weekNumber, weekRange, transitions, stats, resourceSummary, roleBreakdown, forceRefresh } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // ── DATA FINGERPRINT CHECK ──
    // Hash the transitions to detect if underlying data actually changed
    const transitionFingerprint = await computeFingerprint(JSON.stringify(transitions));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Check if we already have a cached result with the same data fingerprint
    if (!forceRefresh) {
      const { data: cached } = await sb
        .from("r360_ai_cache")
        .select("data, computed_at, data_fingerprint")
        .eq("scope_type", "department")
        .eq("scope_id", department)
        .eq("section", "dept_intel_v4")
        .eq("week_start", weekStart)
        .maybeSingle();

      if (cached?.data && (cached as any).data_fingerprint === transitionFingerprint) {
        console.log(`[SKIP] Data unchanged for ${department} W${weekNumber} (fingerprint: ${transitionFingerprint}). Returning cached result — 0 AI tokens used.`);
        return new Response(JSON.stringify({ ...cached.data as any, _cached: true, _fingerprint: transitionFingerprint }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[GENERATE] Data changed for ${department} W${weekNumber} (fingerprint: ${transitionFingerprint}). Calling AI...`);

    const roleBreakdownStr = roleBreakdown
      ? Object.entries(roleBreakdown).map(([group, members]) => `  ${group}: ${(members as string[]).join(', ')}`).join('\n')
      : 'No role data available.';

    const systemPrompt = `You are a Senior Project Manager writing a weekly STEERCOM briefing for the ${department} department. You have ${transitions.length} status transitions across resources for Week ${weekNumber} (${weekRange}).

VOICE: Write like you are presenting to a Steering Committee of CIOs. Every sentence states a fact, quantifies impact, and surfaces the "so what". Use: "batch-resolved", "commenced work", "cycle time", "closure rate", "sprint velocity", "backlog hygiene". Never use casual praise. Quantify everything.

ROLE BREAKDOWN OF THE TEAM:
${roleBreakdownStr}

GENERATE THREE SECTIONS:

═══ SECTION 1: WEEKLY DIGEST ═══
Generate exactly 15 bullets — 3 per working day (SUN, MON, TUE, WED, THU).
For each day, pick the 3 MOST significant events from that day's transitions.
Prioritize: burst closures → blocked/escalated items → notable individual closures → velocity anomalies → new work picked up.

Each bullet has:
- number: sequential 01–15
- day: "SUN"/"MON"/"TUE"/"WED"/"THU"
- dayIndex: 0–4
- hub: short label ("INC"/"PRD"/"PRJ"/"TST"/"REL"/"OTHER")
- hubCss: "hub-inc"/"hub-prd"/"hub-prj"/"hub-tst"/"hub-rel"/"hub-oth"
- signal: null | "risk" | "esc" | "action" | "gap" | "observe"
- signalLabel: null | "RISK" | "ESCALATION" | "ACTION REQUIRED" | "DELIVERY GAP" | "OBSERVATION"
- body: HTML string with inline spans:
  - <span class="di-ev-actor">Name</span> for people
  - <span class="di-ev-tk">BAU-1234</span> for tickets
  - <span class="di-ev-st s-done">Done</span> for statuses (use s-done/s-prog/s-rev/s-blk/s-qa/s-todo/s-reopen)

═══ SECTION 2: EXECUTIVE SUMMARY (ROLE-BASED) ═══

2A. topContributor: The person with the most impactful contributions this week.
- name: string (full name)
- role: string (job title from resource inventory)
- roleGroup: "developer"|"qa"|"product_owner"|"ux_designer"|"delivery_mgmt"|"devops"
- projects: string[] (project names they worked on)
- consecutiveWeeks: number (set to 1 unless you know otherwise)
- kpis: array of {value, label} — use ROLE-SPECIFIC metrics:
  If developer: "Defects Closed", "Moved to QA", "Projects"
  If qa: "Bugs Raised", "Incidents Raised", "Projects"
  If product_owner: "Stories Logged", "BRDs Initiated", "Projects"
  If ux_designer: "Designs Delivered", "Design Reviews", "Projects"
  If delivery_mgmt: "Tasks Delegated", "Escalations Managed", "Projects"
  If devops: "Deployments", "Rollbacks", "Projects"

2B. roleContributions: Array of role group cards. One per active role group.
Each card:
- role: display name (e.g. "Developers", "QA Engineers", "Product Owners", "UX Designers", "Delivery Management", "DevOps")
- roleCss: CSS class ("role-dev"|"role-qa"|"role-po"|"role-ux"|"role-mgmt"|"role-devops")
- resourceCount: number
- projects: string[] (project names)
- kpis: ROLE-SPECIFIC metrics array:
  Developers: "Defects Closed", "Sub-tasks Closed", "Re-Opened", "Moved to QA"
  QA Engineers: "Bugs Raised", "Incidents Raised", "Items in QA"
  Product Owners: "Stories Logged", "BRDs Initiated", "Sign-Offs"
  UX Designers: "Designs Delivered", "Design Reviews"
  Delivery Mgmt: "Tasks Delegated", "Escalations Managed"
  DevOps: "Deployments", "Rollbacks"
- resources: array of {name, desc} — ONLY include resources who have at least 1 transition/contribution this week. Do NOT include resources with zero activity. desc is HTML with <strong>project names</strong> bolded. IMPORTANT: Wrap every numeric claim (like "Closed 25 defects", "5 items re-opened", "12 closures") in <span class="di-claim">25 defects closed</span> so it becomes a clickable drill-in link. Every number+action pair MUST be wrapped.

2C. projectActivity: Array of STRUCTURED project cards, sorted by total transitions descending (highest-velocity first). STALLED projects always last.
Each project object:
- name: string (full project name, e.g. "Senaei BAU")
- keyPrefix: string (short key, e.g. "BAU", "MDT", "MWR")
- status: "active"|"risk"|"stalled"
- kpis: array of 3-5 metrics: { value: number, label: string, variant: null|"danger"|"warning"|"success" }
  Use variant "danger" for Re-Opened or Blocked counts. Use variant "success" for high closure counts.
  Example labels: "Moved to QA", "Closed", "Re-Opened", "UAT Ready", "Blocked", "In Review"
- velocity: { transitions: number (total status transitions for this project), percentOfMax: number (0-100, this project's transitions ÷ highest project's transitions × 100) }
- barColor: "success" if ACTIVE and velocity.percentOfMax ≥ 50, "primary" if ACTIVE and < 50, "warning" if AT RISK. Omit bar for STALLED (set to "primary").
- narrative: string (2-3 sentences, HTML). Names in <strong>. Describe key activity, highlight top performer, note any concerns.
- contributors: array of { name: string, initials: string (2 chars), color: string (hex from palette: #2563EB, #0D9488, #7C3AED, #D97706, #DC2626, #16A34A, #6366F1, #64748B), count: number (transitions by this person) }. Sort by count descending, max 5.
- alert: null OR { type: "blocker"|"warning", text: string (HTML, use <strong> for emphasis) }
  Use type "blocker" if project has Blocked items or is STALLED. Use type "warning" if project has Re-Opened items.
  text should name the person and describe the issue concisely.

2D. requiresAttention: string[] — each item MUST name the person, their role, the project, and the specific risk. Use HTML with <strong> for names.

═══ SECTION 3: RECOMMENDATIONS ═══
Generate exactly 5 recommendation cards:
- number: 1–5
- title: short action title (plain text, NO HTML)
- roleTag: role group label (e.g. "QA ENGINEERS", "DEVELOPERS")
- roleTagCss: inline CSS for the tag (e.g. "background:#EDE9FE;color:#5B21B6")
  Role tag colors:
    Developers: "background:#DBEAFE;color:#1E3A8A"
    QA Engineers: "background:#EDE9FE;color:#5B21B6"
    Product Owners: "background:#CCFBF1;color:#134E4A"
    UX Designers: "background:#FCE7F3;color:#9D174D"
    Delivery Mgmt: "background:#FEF3C7;color:#78350F"
    DevOps: "background:#DCFCE7;color:#166534"
- project: string (project names separated by " · ")
- description: 1–2 sentences explaining why and what to do.
- priority: "high" | "medium"

Sort by priority descending (high items first).

OUTPUT: Return ONLY valid JSON (no markdown, no code fences):
{
  "digest": [ ... ],
  "summaryV5": {
    "topContributor": { "name": "...", "role": "...", "roleGroup": "developer", "projects": ["..."], "consecutiveWeeks": 1, "kpis": [{"value": 25, "label": "Defects Closed"}, ...] },
    "roleContributions": [ { "role": "Developers", "roleCss": "role-dev", "resourceCount": 7, "projects": ["..."], "kpis": [...], "resources": [{"name": "...", "desc": "..."}] } ],
    "projectActivity": [ { "name": "Senaei BAU", "keyPrefix": "BAU", "status": "active", "kpis": [{"value": 41, "label": "Moved to QA"}, {"value": 12, "label": "Closed"}, {"value": 5, "label": "Re-Opened", "variant": "danger"}], "velocity": {"transitions": 75, "percentOfMax": 100}, "barColor": "success", "narrative": "Highest-velocity project...", "contributors": [{"name": "Yazeed Daraz", "initials": "YD", "color": "#2563EB", "count": 53}], "alert": null } ],
    "requiresAttention": [ "<strong>Name (Role, Project):</strong> ..." ]
  },
  "recommendations": [ { "number": 1, "title": "...", "roleTag": "QA ENGINEERS", "roleTagCss": "background:#EDE9FE;color:#5B21B6", "project": "Senaei BA · Mobile FE", "description": "...", "priority": "high" } ]
}`;

    const userPrompt = `Here are the ${transitions.length} transitions for ${department}, Week ${weekNumber} (${weekRange}):

Stats: ${stats.transitions} transitions, ${stats.closed} closed, ${stats.inReview} in review, ${stats.activeResources} active resources.

PER-RESOURCE BREAKDOWN (every person MUST appear in the briefing):
${resourceSummary || 'No resource summary available.'}

Transitions data:
${JSON.stringify(transitions, null, 0)}

Generate the full 3-section role-based STEERCOM briefing now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 12000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      parsed = { digest: [], summaryV5: null, recommendations: [] };
    }

    // Cache — include fingerprint so next call can skip if data unchanged
    await sb.from("r360_ai_cache").upsert({
      scope_type: "department",
      scope_id: department,
      section: "dept_intel_v4",
      week_start: weekStart,
      data: parsed,
      data_fingerprint: transitionFingerprint,
      status: "fresh",
      computed_at: new Date().toISOString(),
      is_stale: false,
    }, { onConflict: "scope_type,scope_id,section,week_start" });

    // Save top contributor to di_weekly_awards
    if (parsed.summaryV5?.topContributor) {
      const tc = parsed.summaryV5.topContributor;

      // Check previous week's winner for consecutive tracking
      const prevWeekStart = new Date(weekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekStartStr = `${prevWeekStart.getFullYear()}-${String(prevWeekStart.getMonth() + 1).padStart(2, '0')}-${String(prevWeekStart.getDate()).padStart(2, '0')}`;

      const { data: prevAward } = await sb
        .from("di_weekly_awards")
        .select("resource_name, consecutive_weeks")
        .eq("department", department)
        .eq("week_start", prevWeekStartStr)
        .maybeSingle();

      const consecutiveWeeks = (prevAward && prevAward.resource_name === tc.name)
        ? (prevAward.consecutive_weeks || 1) + 1
        : 1;

      await sb.from("di_weekly_awards").upsert({
        department,
        week_number: weekNumber,
        week_start: weekStart,
        week_end: weekEnd,
        resource_id: tc.name,
        resource_name: tc.name,
        job_role: tc.role || '',
        role_group: tc.roleGroup || 'developer',
        total_score: tc.kpis?.reduce((s: number, k: any) => s + (k.value || 0), 0) || 0,
        kpis: tc.kpis || [],
        projects: tc.projects || [],
        consecutive_weeks: consecutiveWeeks,
      }, { onConflict: "department,week_number,week_start" });

      // Update the cached data with correct consecutive weeks
      if (parsed.summaryV5.topContributor) {
        parsed.summaryV5.topContributor.consecutiveWeeks = consecutiveWeeks;
        await sb.from("r360_ai_cache").upsert({
          scope_type: "department",
          scope_id: department,
          section: "dept_intel_v4",
          week_start: weekStart,
          data: parsed,
          data_fingerprint: transitionFingerprint,
          status: "fresh",
          computed_at: new Date().toISOString(),
          is_stale: false,
        }, { onConflict: "scope_type,scope_id,section,week_start" });
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("r360-dept-intelligence-v4 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
