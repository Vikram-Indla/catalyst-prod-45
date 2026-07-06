// STRATA AI Advisory service — CAT-STRATA-20260705-001 (ledger §15 / F-GOV-009).
//
// Generates an ADVISORY-ONLY variance narrative from governed STRATA data for
// one period: KPI achievements (calc engine provenance), pending attestations,
// blocked dependencies, benefit realization and value-at-risk. The output is
// written to strata_ai_outputs as a DRAFT (human_review_status 'pending') with
// full provenance: referenced entity ids, config context, model id, confidence,
// uses_live_data. AI never certifies, approves or mutates governed data (D-007)
// — a human reviewer (≠ author, DB CHECK) approves/rejects in the app.
//
// Follows the platform ai-* pattern: Gemini via the OpenAI-compatible gateway
// with GEMINI_API_KEY; caller authorization via their own JWT (strata_has_role
// RPC); insert via service-role client.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";

    // Caller-scoped client: identity + role check run AS THE CALLER.
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthenticated" }, 401);
    }
    const { data: allowed } = await caller.rpc("strata_has_role", {
      p_roles: ["strategy_office", "executive_viewer", "vmo_validator"],
    });
    if (allowed !== true) {
      return json({ error: "generating advisories requires strategy_office, executive_viewer, vmo_validator or admin role" }, 403);
    }

    const { period_id } = await req.json().catch(() => ({}));
    if (!period_id) return json({ error: "period_id is required" }, 400);

    const admin = createClient(url, service);

    // ── Governed inputs (all provenance-carrying) ────────────────────────────
    const [{ data: period }, { data: calcs }, { data: needs }, { data: snapshot }] =
      await Promise.all([
        admin.from("strata_periods").select("id, name, starts_on, ends_on, close_status").eq("id", period_id).maybeSingle(),
        admin.from("strata_calculated_values")
          .select("entity_type, entity_id, metric_key, value, score, status_key, formula_version, calculated_at")
          .eq("period_id", period_id)
          .order("calculated_at", { ascending: false })
          .limit(60),
        admin.rpc("strata_needs_attention", { p_period: period_id }),
        admin.from("strata_snapshots").select("id, snapshot_key, name")
          .eq("period_id", period_id).order("locked_at", { ascending: false })
          .limit(1).maybeSingle(),
      ]);
    if (!period) return json({ error: "period not found" }, 404);

    // Latest value per (entity, metric) only.
    const seen = new Set<string>();
    const latest = (calcs ?? []).filter((c) => {
      const k = `${c.entity_type}:${c.entity_id}:${c.metric_key}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const kpiNames = new Map<string, string>();
    const kpiIds = latest.filter((c) => c.entity_type === "kpi").map((c) => c.entity_id);
    if (kpiIds.length) {
      const { data: kpis } = await admin.from("strata_kpis").select("id, name").in("id", kpiIds);
      (kpis ?? []).forEach((k) => kpiNames.set(k.id, k.name));
    }

    const facts = {
      period: period.name,
      kpi_results: latest
        .filter((c) => c.entity_type === "kpi" && c.metric_key === "achievement")
        .map((c) => ({ kpi: kpiNames.get(c.entity_id) ?? c.entity_id, achievement: c.value, band: c.status_key, formula_version: c.formula_version })),
      scorecards: latest
        .filter((c) => c.entity_type === "scorecard_instance")
        .map((c) => ({ score: c.value, band: c.status_key })),
      benefits: latest
        .filter((c) => c.entity_type === "benefit")
        .map((c) => ({ metric: c.metric_key, value: c.value })),
      portfolio_value_at_risk: latest
        .filter((c) => c.entity_type === "portfolio" && c.metric_key === "value_at_risk")
        .map((c) => c.value),
      open_exceptions: (needs ?? []).map((n: Record<string, unknown>) => ({
        type: n.item_type, severity: n.severity, entity: n.entity_name, detail: n.detail,
      })).slice(0, 20),
    };

    if (!geminiKey) return json({ error: "GEMINI_API_KEY not configured" }, 500);

    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a strategy-office analyst writing an ADVISORY variance briefing for executives. " +
              "Use ONLY the facts provided — never invent numbers, entities or causes. " +
              "If data is missing say so plainly. Return strict JSON: " +
              '{"narrative": "<=180 words, plain prose, no markdown", "confidence": 0..1}',
          },
          { role: "user", content: JSON.stringify(facts) },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: `AI gateway error ${aiResp.status}` }, 502);
    }
    const aiBody = await aiResp.json();
    let narrative = "";
    let confidence = 0.5;
    try {
      const parsed = JSON.parse(aiBody.choices?.[0]?.message?.content ?? "{}");
      narrative = String(parsed.narrative ?? "").trim();
      confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5)));
    } catch (_) { /* fall through */ }
    if (!narrative) return json({ error: "model returned no narrative" }, 502);

    const { data: inserted, error: insErr } = await admin
      .from("strata_ai_outputs")
      .insert({
        use_case: "variance_explanation",
        entity_refs: {
          period_id,
          kpi_ids: kpiIds,
          exception_count: (needs ?? []).length,
        },
        snapshot_id: snapshot?.id ?? null,
        config_context: { generator: "strata-advisory@v1", facts_digest: { kpis: facts.kpi_results.length, exceptions: facts.open_exceptions.length } },
        uses_live_data: !snapshot,
        content: narrative,
        cited_evidence: facts,
        confidence,
        model: MODEL,
        human_review_status: "pending",
        created_by: userData.user.id,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    await admin.from("strata_audit_events").insert({
      entity_table: "strata_ai_outputs",
      entity_id: inserted.id,
      action: "EDGE:generate_advisory",
      actor_id: userData.user.id,
      note: `variance advisory drafted for ${period.name} (pending human review)`,
    });

    return json({ id: inserted.id, confidence, review_status: "pending" });
  } catch (e) {
    console.error("strata-advisory error:", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
