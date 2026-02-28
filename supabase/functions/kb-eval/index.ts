// ══════════════════════════════════════════════════════════════════
// CATALYST KB — kb-eval (Evaluation + Feedback Loop)
// Actions: run_eval, seed_eval, summary, export
// ══════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { action = "summary", limit = 50 } = await req.json().catch(() => ({ action: "summary" }));
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── SEED: Load eval questions from training set ──
    if (action === "seed_eval") {
      const { data: questions } = await sb
        .from("kb_training_questions")
        .select("id, question, category, language")
        .eq("language", "en")
        .limit(200);

      if (!questions || !questions.length) {
        return new Response(JSON.stringify({ error: "No training questions found" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const byCategory: Record<string, any[]> = {};
      for (const q of questions) {
        if (!byCategory[q.category]) byCategory[q.category] = [];
        byCategory[q.category].push(q);
      }

      const evalQuestions: any[] = [];
      for (const [cat, qs] of Object.entries(byCategory)) {
        const sample = qs.slice(0, 4);
        for (const q of sample) {
          evalQuestions.push({
            question: q.question,
            expected_key_points: [q.category.toLowerCase(), q.question.split(" ").slice(0, 3).join(" ").toLowerCase()],
            expected_sources: [],
            category: q.category,
            difficulty: "medium",
            language: q.language,
          });
        }
      }

      const { error } = await sb.from("kb_eval_set").insert(evalQuestions.slice(0, 100));
      return new Response(JSON.stringify({
        seeded: Math.min(evalQuestions.length, 100),
        categories: Object.keys(byCategory).length,
        error: error?.message,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── RUN_EVAL: Execute eval set against live pipeline ──
    if (action === "run_eval") {
      const { data: evalSet } = await sb
        .from("kb_eval_set")
        .select("*")
        .limit(limit);

      if (!evalSet?.length) {
        return new Response(JSON.stringify({ error: "No eval questions. Run seed_eval first." }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const results: any[] = [];
      for (const q of evalSet) {
        const start = performance.now();
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/kb-query`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: q.question, language: q.language || "en" }),
          });
          const data = await res.json();
          const elapsed = Math.round(performance.now() - start);

          const answer = (data.answer || "").toLowerCase();
          let hits = 0;
          for (const kp of q.expected_key_points || []) {
            if (answer.includes(kp.toLowerCase())) hits++;
          }
          const total = (q.expected_key_points || []).length;
          const hallucination = (data.confidence || 0) < 0.3 && answer.length > 200;

          const result = {
            eval_id: q.id,
            actual_answer: (data.answer || "").substring(0, 2000),
            key_points_hit: hits,
            key_points_total: total,
            hit_rate: total > 0 ? Math.round((hits / total) * 1000) / 1000 : 0,
            retrieval_method: data._meta?.source || "unknown",
            chunks_retrieved: data._meta?.candidates_retrieved || data._meta?.chunks_matched || 0,
            response_time_ms: elapsed,
            confidence: data.confidence || 0,
            hallucination_detected: hallucination,
          };

          await sb.from("kb_eval_results").insert(result);
          results.push({ question: q.question, ...result });
        } catch (e: any) {
          results.push({ question: q.question, error: e.message });
        }

        await new Promise(r => setTimeout(r, 300));
      }

      const n = results.filter(r => !r.error).length;
      const summary = {
        total: n,
        avg_hit_rate: n > 0 ? Math.round(results.reduce((s, r) => s + (r.hit_rate || 0), 0) / n * 1000) / 1000 : 0,
        avg_confidence: n > 0 ? Math.round(results.reduce((s, r) => s + (r.confidence || 0), 0) / n * 1000) / 1000 : 0,
        avg_response_ms: n > 0 ? Math.round(results.reduce((s, r) => s + (r.response_time_ms || 0), 0) / n) : 0,
        hallucinations: results.filter(r => r.hallucination_detected).length,
        by_method: results.reduce((m: Record<string, number>, r) => {
          m[r.retrieval_method || "unknown"] = (m[r.retrieval_method || "unknown"] || 0) + 1;
          return m;
        }, {}),
        errors: results.filter(r => r.error).length,
      };

      return new Response(JSON.stringify({ summary, results: results.slice(0, 20) }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── SUMMARY: Get latest eval results summary ──
    if (action === "summary") {
      const { data: results } = await sb
        .from("kb_eval_results")
        .select("*")
        .order("run_date", { ascending: false })
        .limit(100);

      if (!results?.length) {
        return new Response(JSON.stringify({ message: "No eval results yet. Run run_eval first." }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }

      const n = results.length;
      return new Response(JSON.stringify({
        total_evals: n,
        avg_hit_rate: Math.round(results.reduce((s, r) => s + Number(r.hit_rate || 0), 0) / n * 1000) / 1000,
        avg_confidence: Math.round(results.reduce((s, r) => s + Number(r.confidence || 0), 0) / n * 1000) / 1000,
        avg_response_ms: Math.round(results.reduce((s, r) => s + (r.response_time_ms || 0), 0) / n),
        hallucination_rate: Math.round(results.filter(r => r.hallucination_detected).length / n * 1000) / 1000,
        by_method: results.reduce((m: Record<string, number>, r) => {
          m[r.retrieval_method || "unknown"] = (m[r.retrieval_method || "unknown"] || 0) + 1; return m;
        }, {}),
        last_run: results[0]?.run_date,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── EXPORT: CSV-ready data ──
    if (action === "export") {
      const { data } = await sb
        .from("kb_eval_results")
        .select("eval_id, run_date, key_points_hit, key_points_total, hit_rate, retrieval_method, chunks_retrieved, response_time_ms, confidence, hallucination_detected")
        .order("run_date", { ascending: false })
        .limit(500);

      return new Response(JSON.stringify({ format: "csv_ready", rows: data || [] }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: seed_eval, run_eval, summary, export" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("KB Eval Error:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
