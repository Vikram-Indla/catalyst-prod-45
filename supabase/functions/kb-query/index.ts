// ══════════════════════════════════════════════════════════════════
// CATALYST KB — kb-query V2 (Advanced RAG — 9 Stages)
// Cache → MultiQuery → Hybrid → Rerank → Compress → Training →
//   Generate → Cache → Log+Eval
// ══════════════════════════════════════════════════════════════════
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tunable Parameters ──
const P = {
  REWRITES: 4,
  VECTOR_K: 20,
  RRF_K: 60,
  VEC_W: 0.6,
  KW_W: 0.4,
  RERANK_IN: 30,
  RERANK_OUT: 6,
  RERANK_FLOOR: 0.3,
  COMPRESS_TOKENS: 800,
  TRAIN_THRESH: 0.90,
  CONF_REFUSE: 0.25,
  MAX_CTX: 3000,
  MODEL: "gpt-4o-mini",
  EMBED: "text-embedding-3-small",
};

// ── Helpers ──
async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: P.EMBED, input: text.trim() }),
  });
  const d = await r.json();
  if (!d.data?.[0]?.embedding) throw new Error("Embedding failed");
  return d.data[0].embedding;
}

function tokens(s: string) { return Math.ceil(s.length / 4); }

function norm(q: string) {
  return q.toLowerCase().trim().replace(/[^\w\s\u0600-\u06FF]/g, "").replace(/\s+/g, " ");
}

async function hash(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function llm(sys: string, usr: string, max = 500, temp = 0.3) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: P.MODEL, temperature: temp, max_tokens: max,
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
    }),
  });
  return (await r.json()).choices?.[0]?.message?.content || "";
}

// ══════════════════════════════════════════════════════════════════
// STAGE 2 — Multi-Query Expansion
// ══════════════════════════════════════════════════════════════════
async function expand(query: string): Promise<string[]> {
  const sys = `Generate ${P.REWRITES} alternate search queries for a Saudi Ministry of Industry / Catalyst KB.
1. SYNONYM variant  2. SPECIFIC (add project codes LIC/CP/DS/EC if inferable)
3. HOW-TO form  4. KEYWORDS only (3-5 words)
Return ONLY a JSON array of ${P.REWRITES} strings.`;
  try {
    const t = await llm(sys, query, 300, 0.4);
    const a = JSON.parse(t.replace(/```json|```/g, "").trim());
    if (Array.isArray(a)) return [query, ...a.slice(0, P.REWRITES)];
  } catch {}
  return [query, query.replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3).join(" ")];
}

// ══════════════════════════════════════════════════════════════════
// STAGE 3 — Hybrid Retrieval (Vector + Keyword + RRF)
// ══════════════════════════════════════════════════════════════════
async function retrieve(sb: any, emb: number[], text: string, rewrites: string[], src?: string, tags?: string[]) {
  const { data: hybrid } = await sb.rpc("kb_hybrid_search", {
    query_embedding: emb, query_text: text,
    match_count: P.RERANK_IN,
    vector_weight: P.VEC_W, keyword_weight: P.KW_W,
    filter_source: src || null, filter_tags: tags || null,
    rrf_k: P.RRF_K,
  });
  const chunks = hybrid || [];

  if (chunks.length < 10 && rewrites.length > 1) {
    for (const rw of rewrites.slice(1, 3)) {
      try {
        const re = await embed(rw);
        const { data: extra } = await sb.rpc("kb_match_embeddings", {
          query_embedding: re, match_threshold: 0.70, match_count: 10,
        });
        for (const e of extra || []) {
          if (!chunks.find((c: any) => c.id === e.id)) {
            chunks.push({ ...e, rrf_score: e.similarity * 0.5, vector_similarity: e.similarity });
          }
        }
      } catch {}
    }
  }

  const { data: train } = await sb.rpc("kb_match_training", {
    query_embedding: emb, match_threshold: P.TRAIN_THRESH, match_count: 3,
  });

  return { chunks, train: train || [] };
}

// ══════════════════════════════════════════════════════════════════
// STAGE 4 — Reranking
// ══════════════════════════════════════════════════════════════════
async function rerank(query: string, cands: any[]): Promise<any[]> {
  if (cands.length <= P.RERANK_OUT) return cands;
  const batch = cands.slice(0, P.RERANK_IN);
  const sums = batch.map((c: any, i: number) => `[${i}] ${(c.content || "").substring(0, 250)}`).join("\n---\n");
  try {
    const t = await llm(
      "Score each chunk 0.0-1.0 for relevance to the QUERY. Return ONLY a JSON array of numbers.",
      `QUERY: ${query}\n\nCHUNKS:\n${sums}`, 200, 0);
    const scores: number[] = JSON.parse(t.replace(/```json|```/g, "").trim());
    return batch
      .map((c: any, i: number) => ({ ...c, relevance_score: scores[i] ?? 0 }))
      .filter((c: any) => c.relevance_score >= P.RERANK_FLOOR)
      .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
      .slice(0, P.RERANK_OUT);
  } catch {
    return batch.sort((a: any, b: any) => (b.rrf_score || 0) - (a.rrf_score || 0)).slice(0, P.RERANK_OUT);
  }
}

// ══════════════════════════════════════════════════════════════════
// STAGE 5 — Context Compression
// ══════════════════════════════════════════════════════════════════
async function compress(query: string, chunks: any[]) {
  if (!chunks.length) return { text: "", sources: [], tokens: 0, conflicts: false, stale: false };

  const sources = chunks.map((c: any, i: number) => ({
    idx: i + 1, id: c.id, url: c.source_url || "internal",
    type: c.source_type, rel: c.relevance_score || c.rrf_score || 0,
  }));

  const ago30 = Date.now() - 30 * 86400000;
  const stale = chunks.some((c: any) => c.metadata?.created_at && new Date(c.metadata.created_at).getTime() < ago30);
  const dates = chunks.map((c: any) => c.metadata?.created_at).filter(Boolean).map((d: string) => +new Date(d));
  const conflicts = dates.length >= 2 && Math.max(...dates) - Math.min(...dates) > 90 * 86400000;

  const tagged = chunks.map((c: any, i: number) =>
    `[SOURCE-${i + 1}] (${c.source_type}: ${c.source_url || "internal"})\n${c.content}`
  ).join("\n\n---\n\n");

  const text = await llm(
    `Extract ONLY query-relevant sentences from the sources below. Keep [SOURCE-N] citations inline. Remove duplicates. Under ${P.COMPRESS_TOKENS} tokens. No headers.`,
    `QUERY: ${query}\n\nSOURCES:\n${tagged}`, P.COMPRESS_TOKENS, 0);

  return { text, sources, tokens: tokens(text), conflicts, stale };
}

// ══════════════════════════════════════════════════════════════════
// STAGE 7 — Editorial Generation with Confidence
// ══════════════════════════════════════════════════════════════════
async function generate(query: string, ev: any, lang: string) {
  if (ev.tokens < 30) {
    return {
      answer: lang === "ar"
        ? "لا أملك معلومات كافية للإجابة على هذا السؤال بدقة. تم تسجيل استفسارك وسيقوم الفريق بمراجعته."
        : "I don't have sufficient information on this topic to provide an accurate answer. Your query has been recorded for the team to review.",
      confidence: 0.1, level: "insufficient", used: [],
    };
  }

  const srcList = ev.sources.map((s: any) => `[SOURCE-${s.idx}] ${s.type}: ${s.url} (${(s.rel * 100).toFixed(0)}%)`).join("\n");
  const warns = [
    ev.conflicts ? "⚠️ Sources are dated far apart — flag any conflicts." : "",
    ev.stale ? "⚠️ Some evidence may be outdated (>30 days)." : "",
  ].filter(Boolean).join("\n");

  const sys = `You are the Catalyst Knowledge Base — enterprise encyclopedia for Saudi Ministry of Industry.
ONLY use the evidence provided. Cite inline as [SOURCE-N].
If insufficient: state what you CAN answer, flag what you cannot. Never guess.
If conflicting: present both with sources.
Format: Bloomberg editorial. **Names** bold. \`TICKET-ID\` in backticks.
Sections (only if evidence exists): Background, Current Status, Good News, Issues & Risks, Who's Working.
${warns}
End response with:
---
CONFIDENCE: [high|medium|low]
EVIDENCE_USED: [SOURCE-1], [SOURCE-N]

Language: ${lang === "ar" ? "Arabic (MSA)" : "English"}`;

  const answer = await llm(sys, `EVIDENCE:\n${ev.text}\n\nSOURCES:\n${srcList}\n\nQUERY: ${query}`, 2000, 0.3);

  let confidence = 0.5, level = "medium";
  const cm = answer.match(/CONFIDENCE:\s*(high|medium|low)/i);
  if (cm) { level = cm[1].toLowerCase(); confidence = level === "high" ? 0.85 : level === "medium" ? 0.6 : 0.3; }
  const used: string[] = [];
  const em = answer.match(/EVIDENCE_USED:\s*(.+)/i);
  if (em) { const refs = em[1].match(/\[SOURCE-\d+\]/g); if (refs) used.push(...refs); }

  const clean = answer.replace(/---\s*\nCONFIDENCE:.*\nEVIDENCE_USED:.*/s, "").trim();
  return { answer: clean, confidence, level, used };
}

// ══════════════════════════════════════════════════════════════════
// MAIN — 9-Stage Pipeline
// ══════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = performance.now();

  try {
    const { query, language = "en", input_method = "keyboard",
      user_id, user_name, user_role, filter_source, filter_tags } = await req.json();
    if (!query?.trim()) return new Response(JSON.stringify({ error: "Query required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // S1: Cache
    const qh = await hash(norm(query));
    const { data: cached } = await sb.rpc("kb_cache_hit", { p_query_hash: qh });
    if (cached) {
      const ms = Math.round(performance.now() - t0);
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: true,
        p_matched_category: cached.category, p_confidence_score: cached.confidence || 1 }).then(() => {});
      return new Response(JSON.stringify({ ...cached, _meta: { source: "cache", response_time_ms: ms, cache_hit: true } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // S2: Multi-query
    const rewrites = await expand(query);

    // S3: Hybrid retrieval
    const emb = await embed(query);
    const { chunks, train } = await retrieve(sb, emb, query, rewrites, filter_source, filter_tags);

    // S6 shortcut: training match with answer?
    const best = train.find((t: any) => t.expected_answer && t.similarity >= P.TRAIN_THRESH);
    if (best) {
      const ms = Math.round(performance.now() - t0);
      const resp = { type: "editorial", title: best.category, answer: best.expected_answer,
        matched_question: best.question, category: best.category,
        confidence: best.similarity, confidence_level: "high", evidence_used: ["training"],
        has_conflicts: false, has_stale_data: false, references: [] };
      sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
        response_json: resp, language, ttl_hours: 168 }).then(() => {});
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: best.category, p_confidence_score: best.similarity }).then(() => {});
      return new Response(JSON.stringify({ ...resp, _meta: { source: "training", response_time_ms: ms,
        cache_hit: false, similarity: best.similarity, query_rewrites: rewrites } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // No chunks = fallback
    if (!chunks.length) {
      const ms = Math.round(performance.now() - t0);
      sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
        p_query_text: query, p_language: language, p_input_method: input_method,
        p_was_answered: false, p_response_time_ms: ms, p_cache_hit: false,
        p_matched_category: null, p_confidence_score: 0 }).then(() => {});
      return new Response(JSON.stringify({ type: "fallback", title: "No Evidence Found",
        answer: language === "ar" ? "لا أملك معلومات كافية للإجابة على هذا السؤال بدقة. تم تسجيل استفسارك وسيقوم الفريق بمراجعته."
          : "I don't have enough information to answer this question accurately. Your query has been logged and the team will review it.",
        category: null, confidence: 0, confidence_level: "insufficient",
        evidence_used: [], has_conflicts: false, has_stale_data: false, references: [],
        _meta: { source: "fallback", response_time_ms: ms, cache_hit: false,
          query_rewrites: rewrites, candidates_retrieved: 0, candidates_reranked: 0 } }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // S4: Rerank
    const ranked = await rerank(query, chunks);

    // S5: Compress
    let ev = await compress(query, ranked);
    if (ev.tokens > P.MAX_CTX) ev = await compress(query, ranked.slice(0, 4));

    // S7: Generate
    const gen = await generate(query, ev, language);
    if (gen.confidence < P.CONF_REFUSE) {
      gen.answer += language === "ar"
        ? "\n\n⚠️ الثقة في هذه الإجابة منخفضة. يرجى التحقق من المصادر الأصلية."
        : "\n\n⚠️ Confidence is low. Please verify with original sources.";
    }

    const ms = Math.round(performance.now() - t0);
    const refs = ev.sources.map((s: any) => ({ source_type: s.type, source_url: s.url, relevance_score: s.rel }));

    const resp = { type: "editorial", title: query, answer: gen.answer,
      category: ranked[0]?.metadata?.category || ranked[0]?.source_type || null,
      confidence: gen.confidence, confidence_level: gen.level,
      evidence_used: gen.used, has_conflicts: ev.conflicts, has_stale_data: ev.stale, references: refs };

    // S8: Cache + Log
    sb.from("kb_cache").upsert({ query_hash: qh, query_text: query,
      response_json: resp, language, ttl_hours: 24 }).then(() => {});

    sb.rpc("kb_log_query", { p_user_id: user_id, p_user_name: user_name, p_user_role: user_role,
      p_query_text: query, p_language: language, p_input_method: input_method,
      p_was_answered: true, p_response_time_ms: ms, p_cache_hit: false,
      p_matched_category: resp.category, p_confidence_score: gen.confidence }).then(() => {});

    // Extended trace (best-effort)
    sb.from("kb_query_log").update({
      query_rewrites: rewrites,
      retrieved_chunk_ids: chunks.slice(0, 30).map((c: any) => c.id),
      reranked_chunk_ids: ranked.map((c: any) => c.id),
      reranked_scores: ranked.map((c: any) => c.relevance_score || 0),
      evidence_pack: ev.text.substring(0, 2000),
      retrieval_method: "hybrid_v2",
      hallucination_flag: gen.confidence < P.CONF_REFUSE,
    }).eq("query_text", query).order("created_at", { ascending: false }).limit(1).then(() => {});

    return new Response(JSON.stringify({ ...resp, _meta: {
      source: "hybrid_rag_v2", response_time_ms: ms, cache_hit: false,
      query_rewrites: rewrites, candidates_retrieved: chunks.length,
      candidates_reranked: ranked.length, evidence_tokens: ev.tokens, model: P.MODEL } }),
      { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("KB V2 Error:", e);
    return new Response(JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
