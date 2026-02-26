import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { department, weekStart, weekEnd, weekNumber, weekRange, transitions, stats } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a Senior Project Manager writing a weekly STEERCOM briefing for the ${department} department.

DATA: You have been given ${transitions.length} status transitions across resources for Week ${weekNumber} (${weekRange}), grouped by hub.

TASK: Generate significant event bullets grouped by hub. Each hub with activity gets its own group. Hubs with zero activity are omitted (mentioned in the Executive Summary). The last group is always the Executive Summary.

VOICE & TONE — CRITICAL:
- Write like a Senior PM presenting to a Steering Committee of CIOs and VPs.
- Every sentence must answer "so what?" — state the fact, quantify the impact, surface the implication.
- Use precise language: "batch-resolved", "commenced work", "submitted for review", "cycle time", "closure rate", "sprint velocity".
- Never use casual language. No "great job", no "keep it up", no emojis.
- Quantify everything: percentages, multipliers, ratios.
- Name the actor. Name the ticket. Name the status.

CALLOUT TAGS — apply where appropriate:
- "escalation": Blocked items, stalled hubs, cross-team dependencies with no ETA.
- "risk": Resource overload (backlog >10 items), single-resource dependency (>50% of hub closures).
- "action": Decisions needed from PO/PM, grooming sessions, triage required.
- "delivery_gap": Sprint completion <70% of plan, items carried forward.
- "observation": Velocity patterns, peak/low days, statistical anomalies.

BULLET PRIORITY (fill slots in this order):
1. Burst closures (3+ items, same person, same day)
2. Blocked/escalated items
3. Individual notable closures with context
4. Items entering review
5. New work picked up
6. Velocity observations
7. Backlog growth / resource overload warnings
8. Executive Summary (always last)

RAG STATUS per hub:
- "GREEN": Closure rate ≥70%, no blockers, backlog stable
- "AMBER": Closure rate 40–69%, OR any blocker, OR single-resource dependency
- "RED": Closure rate <40%, OR stalled ≥2 weeks, OR multiple blockers

Hub key prefixes for classification:
- BAU-/INC- → IncidentHub (color #DC2626)
- PRD-/PB- → ProductHub (color #0D9488)
- PRJ-/SPR- → ProjectHub (color #2563EB)
- TST-/TC- → TestHub (color #7C3AED)
- REL- → ReleaseHub (color #D97706)

EXECUTIVE SUMMARY structure (always the final group):
1. Opening: Closure rate as percentage with numerator/denominator. Name top contributor.
2. What went well: 2-3 concrete items.
3. What requires attention: 2-3 specific items with names/tickets.
4. Critical risks: Dormant hubs, blocked items, capacity gaps.
5. Recommendations for W${weekNumber + 1}: 3-5 numbered actionable directives.

Day badges must use: SUN, MON, TUE, WED, THU only. Summary items use "—".

OUTPUT FORMAT: Return ONLY valid JSON array (no markdown, no code fences):
[
  {
    "hub": "IncidentHub",
    "rag": "GREEN" | "AMBER" | "RED",
    "hubColor": "#DC2626",
    "totalItems": 123,
    "events": [
      {
        "number": 1,
        "day": "SUN",
        "dayClass": "day-sun",
        "callout": null | "escalation" | "risk" | "action" | "delivery_gap" | "observation",
        "calloutLabel": null | "ESCALATION" | "RISK" | "ACTION REQUIRED" | "DELIVERY GAP" | "OBSERVATION",
        "body": "HTML string with <strong>Name</strong>, <span class='di-ticket-pill'>BAU-1234</span>, <span class='di-ev-st s-done'><span class='di-st-dot'></span>Done</span> inline."
      }
    ]
  },
  {
    "hub": "Executive Summary",
    "rag": null,
    "hubColor": "#09090B",
    "totalItems": null,
    "events": [
      {
        "number": 20,
        "day": "—",
        "dayClass": "day-sum",
        "callout": "observation",
        "calloutLabel": null,
        "body": "HTML with <strong>headers</strong> and line breaks."
      }
    ]
  }
]

Aim for 15-20 total bullets across all groups. Distribute proportionally to hub activity.`;

    const userPrompt = `Here are the ${transitions.length} transitions for ${department}, Week ${weekNumber} (${weekRange}):

Stats: ${stats.transitions} transitions, ${stats.closed} closed, ${stats.inReview} in review, ${stats.activeResources} active resources.

Transitions data:
${JSON.stringify(transitions.slice(0, 200), null, 0)}

Generate the STEERCOM weekly events briefing now.`;

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
        max_tokens: 4000,
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
    let content = aiResult.choices?.[0]?.message?.content || "[]";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let hubGroups;
    try {
      hubGroups = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      hubGroups = [];
    }

    // Renumber all events sequentially
    let num = 1;
    for (const group of hubGroups) {
      for (const ev of group.events || []) {
        ev.number = num++;
      }
    }

    // Cache to r360_ai_cache
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    await sb.from("r360_ai_cache").upsert({
      scope_type: "department",
      scope_id: department,
      section: "weekly_events",
      week_start: weekStart,
      data: { hubGroups, stats },
      status: "fresh",
      computed_at: new Date().toISOString(),
      is_stale: false,
    }, { onConflict: "scope_type,scope_id,section,week_start" });

    return new Response(JSON.stringify({ hubGroups, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("r360-dept-weekly-events error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
