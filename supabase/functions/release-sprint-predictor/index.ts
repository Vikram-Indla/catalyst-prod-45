// release-sprint-predictor — date-based completion forecast for a release or sprint.
// NO story points. Each work item counts equally; the only weighting is the
// status-stage completion fraction. Everything is tested against dates:
// per-item due dates + the subject's start→due window. Caty only narrates the
// reason — the percentages and dates are deterministic.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DAY = 86_400_000;

// Fine-grained status → completion fraction (0..1). A QA/UAT item is nearly
// done; a re-open regresses. Unknown statuses fall back to status_category.
const STAGE_WEIGHTS: Record<string, number> = {
  "to do": 0, "open": 0, "backlog": 0, "new": 0,
  "in requirements": 0.05, "selected for development": 0.1,
  "ready for development": 0.1, "ready for dev": 0.1, "in design": 0.15,
  "in progress": 0.35, "in-progress": 0.35, "implementation": 0.35,
  "in development": 0.4, "in integration": 0.55,
  "ready for qa": 0.65, "in qa": 0.75, "internal qa": 0.75, "staging/qa": 0.75,
  "uat ready": 0.85, "in uat": 0.9,
  "done": 1, "closed": 1, "resolved": 1, "released": 1, "completed": 1,
  "re-open": 0.2, "reopened": 0.2, "reopen": 0.2,
};
const CATEGORY_WEIGHTS: Record<string, number> = {
  "to do": 0, "todo": 0, "in progress": 0.5, "indeterminate": 0.5, "done": 1,
};

function stageWeight(status: string | null, category: string | null): number {
  const s = (status ?? "").trim().toLowerCase();
  if (s in STAGE_WEIGHTS) return STAGE_WEIGHTS[s];
  const c = (category ?? "").trim().toLowerCase();
  if (c in CATEGORY_WEIGHTS) return CATEGORY_WEIGHTS[c];
  return 0;
}
function isDone(status: string | null, category: string | null): boolean {
  return (category ?? "").trim().toLowerCase() === "done" ||
    stageWeight(status, category) >= 1;
}
function isQaUat(status: string | null): boolean {
  const s = (status ?? "").toLowerCase();
  return s.includes("qa") || s.includes("uat");
}

interface Item {
  key: string;
  status: string | null;
  category: string | null;
  due: string | null; // yyyy-mm-dd
}

function dateOnly(d: Date) { return d.toISOString().slice(0, 10); }
function parse(d: string | null): number | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : t;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { kind, id } = await req.json();
    if (kind !== "release" && kind !== "sprint") {
      return json({ error: "kind must be 'release' or 'sprint'" }, 400);
    }
    if (!id) return json({ error: "id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let label = String(id);
    let startMs: number | null = null;
    let dueMs: number | null = null;
    let items: Item[] = [];

    if (kind === "release") {
      const { data: rel } = await supabase
        .from("rh_releases")
        .select("id,name,planned_start_date,planned_release_date,target_date,created_at")
        .eq("id", id).maybeSingle();
      if (!rel) return json({ error: "release not found" }, 404);
      label = rel.name ?? String(id);
      startMs = parse(rel.planned_start_date) ?? parse(rel.created_at);
      dueMs = parse(rel.planned_release_date) ?? parse(rel.target_date);

      const { data: links } = await supabase
        .from("rh_release_work_items").select("work_item_key").eq("release_id", id);
      const keys = (links ?? []).map((l: any) => l.work_item_key).filter(Boolean);
      if (keys.length) {
        const { data: rows } = await supabase
          .from("ph_issues")
          .select("issue_key,status,status_category,effective_due_date,due_date")
          .in("issue_key", keys);
        items = (rows ?? []).map(mapRow);
      }
    } else {
      label = String(id);
      const { data: rows } = await supabase
        .from("ph_issues")
        .select("issue_key,status,status_category,effective_due_date,due_date")
        .eq("sprint_name", id);
      items = (rows ?? []).map(mapRow);
      // window from linked sprint definition if present
      const { data: aS } = await supabase
        .from("anchor_sprints").select("start_date,end_date").eq("name", id).maybeSingle();
      const { data: pS } = aS ? { data: null } : await supabase
        .from("product_sprints").select("start_date,end_date").eq("name", id).maybeSingle();
      const def = aS ?? pS;
      if (def) { startMs = parse(def.start_date); dueMs = parse(def.end_date); }
    }

    const result = compute(kind, String(id), label, startMs, dueMs, items);
    result.narrative = await narrate(result).catch(() => result.narrative);

    await supabase.from("rh_predictions").upsert({
      subject_kind: result.subject_kind,
      subject_id: result.subject_id,
      subject_label: result.subject_label,
      predicted_pct: result.predicted_pct,
      forecast_date: result.forecast_date,
      due_date: result.due_date,
      slip_days: result.slip_days,
      risk: result.risk,
      item_total: result.item_total,
      item_done: result.item_done,
      item_overdue: result.item_overdue,
      time_used_pct: result.time_used_pct,
      observed_pace: result.observed_pace,
      required_pace: result.required_pace,
      status_spread: result.status_spread,
      reasons: result.reasons,
      narrative: result.narrative,
      data_quality: result.data_quality,
      computed_at: new Date().toISOString(),
    }, { onConflict: "subject_kind,subject_id" });

    return json(result, 200);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function mapRow(r: any): Item {
  return {
    key: r.issue_key,
    status: r.status ?? null,
    category: r.status_category ?? null,
    due: r.effective_due_date ?? r.due_date ?? null,
  };
}

function compute(
  kind: string, id: string, label: string,
  startMs: number | null, dueMs: number | null, items: Item[],
) {
  const now = Date.now();
  const total = items.length;
  const withDue = items.filter((i) => i.due).length;

  const spreadMap = new Map<string, { status: string; category: string | null; count: number; weight: number }>();
  let weightSum = 0, doneCount = 0, overdue = 0, notStartedDueSoon = 0;
  const overdueKeys: string[] = [];

  for (const it of items) {
    const w = stageWeight(it.status, it.category);
    weightSum += w;
    const done = isDone(it.status, it.category);
    if (done) doneCount++;
    const dueT = parse(it.due);
    if (!done && dueT !== null && dueT < now) { overdue++; if (overdueKeys.length < 8) overdueKeys.push(it.key); }
    if (w === 0 && dueT !== null && dueMs !== null && dueT <= dueMs) notStartedDueSoon++;
    const k = it.status ?? "Unknown";
    const cur = spreadMap.get(k) ?? { status: k, category: it.category, count: 0, weight: w };
    cur.count++; spreadMap.set(k, cur);
  }

  const status_spread = [...spreadMap.values()].sort((a, b) => a.weight - b.weight);
  const notDone = total - doneCount;
  const predicted_pct = total > 0 ? round(weightSum / total * 100) : null;

  const daysElapsed = startMs !== null ? Math.max(0, (now - startMs) / DAY) : null;
  const daysLeft = dueMs !== null ? (dueMs - now) / DAY : null;
  const windowDays = (startMs !== null && dueMs !== null) ? Math.max(1, (dueMs - startMs) / DAY) : null;
  const time_used_pct = (windowDays && daysElapsed !== null)
    ? round(Math.min(100, Math.max(0, daysElapsed / windowDays * 100))) : null;

  // observed pace = items closed per elapsed day; required = remaining / days left
  const observed_pace = (daysElapsed && daysElapsed >= 1 && doneCount > 0)
    ? round(doneCount / daysElapsed, 2) : (doneCount > 0 ? round(doneCount, 2) : 0);
  const required_pace = (daysLeft !== null && daysLeft > 0) ? round(notDone / daysLeft, 2) : null;

  let forecast_date: string | null = null, slip_days: number | null = null;
  if (notDone > 0 && observed_pace > 0) {
    const fc = new Date(now + (notDone / observed_pace) * DAY);
    forecast_date = dateOnly(fc);
    if (dueMs !== null) slip_days = Math.round((fc.getTime() - dueMs) / DAY);
  } else if (notDone === 0) {
    forecast_date = dateOnly(new Date(now));
    if (dueMs !== null) slip_days = Math.round((now - dueMs) / DAY);
  }

  const noData = total === 0 || withDue === 0;
  let risk = "no_data";
  if (!noData) {
    if (notDone === 0) risk = "done";
    else if (observed_pace === 0) risk = (daysLeft !== null && daysLeft < 0) ? "off_track" : "at_risk";
    else if (slip_days !== null && slip_days > 7) risk = "off_track";
    else if ((slip_days !== null && slip_days > 0) || overdue > 0) risk = "at_risk";
    else risk = "on_track";
  }

  const reasons: Array<{ kind: string; label: string; keys?: string[] }> = [];
  if (overdue > 0) reasons.push({ kind: "overdue", label: `${overdue} item${overdue > 1 ? "s" : ""} past due, not done`, keys: overdueKeys });
  if (notStartedDueSoon > 0) reasons.push({ kind: "not_started", label: `${notStartedDueSoon} not started, due on or before the deadline` });
  const qaUat = items.filter((i) => !isDone(i.status, i.category) && isQaUat(i.status)).length;
  if (qaUat > 0) reasons.push({ kind: "in_test", label: `${qaUat} in QA / UAT` });
  if (total === 0) reasons.push({ kind: "no_items", label: "No work items linked to this " + kind });
  else if (withDue === 0) reasons.push({ kind: "no_dates", label: "No due dates on the linked work items" });

  const data_quality = {
    points_ignored: true,
    no_items: total === 0,
    no_due_dates: withDue === 0,
    items_with_due: withDue,
    has_window: startMs !== null && dueMs !== null,
  };

  const r = {
    subject_kind: kind, subject_id: id, subject_label: label,
    predicted_pct, forecast_date, due_date: dueMs !== null ? dateOnly(new Date(dueMs)) : null,
    slip_days, risk, item_total: total, item_done: doneCount, item_overdue: overdue,
    time_used_pct, observed_pace, required_pace, status_spread, reasons,
    narrative: deterministicNarrative({ kind, label, risk, predicted_pct, time_used_pct, slip_days, overdue, notStartedDueSoon, qaUat, noData, total }),
    data_quality,
  };
  return r;
}

function deterministicNarrative(x: any): string {
  if (x.total === 0) return `No work items are linked to this ${x.kind} yet, so there is nothing to forecast. Link work items (or set a sprint name) to get a prediction.`;
  if (x.noData) return `${x.total} items are linked but none have a due date, so completion can be measured but not timed. Add due dates to forecast a date.`;
  const parts: string[] = [];
  if (x.predicted_pct !== null && x.time_used_pct !== null) {
    const behind = x.predicted_pct < x.time_used_pct - 5;
    parts.push(`${x.predicted_pct}% complete with ${x.time_used_pct}% of the time used${behind ? " — behind schedule" : ""}.`);
  } else if (x.predicted_pct !== null) parts.push(`${x.predicted_pct}% complete.`);
  if (x.overdue > 0) parts.push(`${x.overdue} item${x.overdue > 1 ? "s are" : " is"} already past due.`);
  if (x.qaUat > 0) parts.push(`${x.qaUat} still in QA/UAT.`);
  if (x.slip_days !== null && x.slip_days > 0) parts.push(`At the current pace it lands about ${x.slip_days} day${x.slip_days > 1 ? "s" : ""} late — clear the overdue items or move the date.`);
  else if (x.risk === "on_track") parts.push("On track for the due date.");
  return parts.join(" ");
}

// Best-effort Caty narrative via Gemini; falls back to the deterministic text.
async function narrate(r: any): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key || r.item_total === 0 || r.data_quality?.no_due_dates) return r.narrative;
  const facts = {
    subject: r.subject_label, kind: r.subject_kind, predicted_pct: r.predicted_pct,
    time_used_pct: r.time_used_pct, due_date: r.due_date, forecast_date: r.forecast_date,
    slip_days: r.slip_days, risk: r.risk, item_total: r.item_total, item_done: r.item_done,
    item_overdue: r.item_overdue, reasons: r.reasons,
  };
  const prompt = `You are Caty, a release manager. Using ONLY these facts (do not invent any numbers or dates), write a 2-3 sentence plain explanation of why this ${r.subject_kind} has this forecast and what to do. Be specific about what is pending.\nFACTS: ${JSON.stringify(facts)}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    },
  );
  if (!res.ok) return r.narrative;
  const data = await res.json();
  const txt = data?.choices?.[0]?.message?.content?.trim();
  return txt && txt.length > 10 ? txt : r.narrative;
}

function round(n: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
