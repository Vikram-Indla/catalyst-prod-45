import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

function hashQuery(q: string): string {
  const normalized = q.trim().toLowerCase().replace(/\s+/g, " ");
  // Simple hash using Web Crypto not available sync, use a basic approach
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `qh_${Math.abs(hash).toString(36)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { query, language = "en", user_id, user_name, user_role, input_method = "keyboard" } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Step 1: Check cache
    const queryHash = hashQuery(query);
    const { data: cacheHit } = await supabase.rpc("kb_cache_hit", { p_query_hash: queryHash });

    if (cacheHit) {
      const responseTimeMs = Date.now() - startTime;
      // Log the query
      await supabase.rpc("kb_log_query", {
        p_user_id: user_id || null,
        p_user_name: user_name || null,
        p_user_role: user_role || null,
        p_query_text: query,
        p_language: language,
        p_input_method: input_method,
        p_was_answered: true,
        p_response_time_ms: responseTimeMs,
        p_cache_hit: true,
        p_matched_category: cacheHit.category || null,
        p_confidence_score: cacheHit.confidence || null,
      });

      return new Response(JSON.stringify({ ...cacheHit, cache_hit: true, response_time_ms: responseTimeMs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Get embedding for query
    const embedding = await getEmbedding(query);

    // Step 3: Check training questions for a close match
    const { data: trainingMatches } = await supabase.rpc("kb_match_training", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.85,
      match_count: 3,
    });

    // Step 4: Search knowledge base embeddings
    const { data: kbMatches } = await supabase.rpc("kb_match_embeddings", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.78,
      match_count: 10,
    });

    // Step 5: Build context for AI
    const trainingContext = (trainingMatches || [])
      .map((m: any) => `[Training Q${m.question_number} - ${m.category}]: ${m.question}\nAnswer: ${m.expected_answer || "No cached answer"}`)
      .join("\n\n");

    const kbContext = (kbMatches || [])
      .map((m: any) => `[${m.source_type}] (similarity: ${m.similarity?.toFixed(3)}): ${m.content}`)
      .join("\n\n");

    const topCategory = trainingMatches?.[0]?.category || null;
    const topConfidence = trainingMatches?.[0]?.similarity || kbMatches?.[0]?.similarity || 0;

    // Step 6: If we have a high-confidence training match with a cached answer, use it directly
    if (trainingMatches?.[0]?.expected_answer && trainingMatches[0].similarity > 0.92) {
      const directAnswer = {
        answer: trainingMatches[0].expected_answer,
        category: trainingMatches[0].category,
        confidence: trainingMatches[0].similarity,
        sources: [{
          type: "training",
          question_number: trainingMatches[0].question_number,
          similarity: trainingMatches[0].similarity,
        }],
        context_used: kbMatches?.length || 0,
      };

      // Cache it
      await supabase.from("kb_cache").upsert({
        query_hash: queryHash,
        query_text: query,
        response_json: directAnswer,
        language,
      }, { onConflict: "query_hash" });

      const responseTimeMs = Date.now() - startTime;
      await supabase.rpc("kb_log_query", {
        p_user_id: user_id || null,
        p_user_name: user_name || null,
        p_user_role: user_role || null,
        p_query_text: query,
        p_language: language,
        p_input_method: input_method,
        p_was_answered: true,
        p_response_time_ms: responseTimeMs,
        p_cache_hit: false,
        p_matched_category: topCategory,
        p_confidence_score: topConfidence,
      });

      return new Response(JSON.stringify({ ...directAnswer, cache_hit: false, response_time_ms: responseTimeMs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 7: Call AI for generation using Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Catalyst KB Assistant — the knowledge engine for the Saudi Ministry of Industry and Mineral Resources (MIM) digital platform.

Your role:
- Answer questions about industrial licensing, chemical permits, SIDF financial solutions, 4IR programs, environmental compliance, and Catalyst platform features.
- Always cite your sources when possible.
- If unsure, say so honestly.
- Respond in ${language === "ar" ? "Arabic" : "English"}.

Context from training questions:
${trainingContext || "No close training matches found."}

Context from knowledge base:
${kbContext || "No relevant knowledge base entries found."}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error ${status}: ${errText}`);
    }

    const aiJson = await aiResponse.json();
    const answer = aiJson.choices?.[0]?.message?.content || "I couldn't generate an answer.";

    const result = {
      answer,
      category: topCategory,
      confidence: topConfidence,
      sources: [
        ...(trainingMatches || []).map((m: any) => ({
          type: "training",
          question_number: m.question_number,
          similarity: m.similarity,
        })),
        ...(kbMatches || []).slice(0, 5).map((m: any) => ({
          type: m.source_type,
          url: m.source_url,
          similarity: m.similarity,
        })),
      ],
      context_used: (kbMatches?.length || 0) + (trainingMatches?.length || 0),
    };

    // Cache the response
    await supabase.from("kb_cache").upsert({
      query_hash: queryHash,
      query_text: query,
      response_json: result,
      language,
    }, { onConflict: "query_hash" });

    const responseTimeMs = Date.now() - startTime;

    // Log the query
    await supabase.rpc("kb_log_query", {
      p_user_id: user_id || null,
      p_user_name: user_name || null,
      p_user_role: user_role || null,
      p_query_text: query,
      p_language: language,
      p_input_method: input_method,
      p_was_answered: true,
      p_response_time_ms: responseTimeMs,
      p_cache_hit: false,
      p_matched_category: topCategory,
      p_confidence_score: topConfidence,
    });

    return new Response(JSON.stringify({ ...result, cache_hit: false, response_time_ms: responseTimeMs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("kb-query error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
