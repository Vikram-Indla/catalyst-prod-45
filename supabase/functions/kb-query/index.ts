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
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.trim() }),
  });
  const data = await res.json();
  if (!data.data?.[0]?.embedding) {
    throw new Error(`Embedding failed: ${JSON.stringify(data)}`);
  }
  return data.data[0].embedding;
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const { query, language = "en", input_method = "keyboard", user_id, user_name, user_role } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ═══ LAYER 1: CACHE CHECK (target: <50ms) ═══
    const normalized = normalizeQuery(query);
    const queryHash = await sha256(normalized);

    const { data: cachedResponse } = await supabase.rpc("kb_cache_hit", {
      p_query_hash: queryHash,
    });

    if (cachedResponse) {
      const responseTime = Math.round(performance.now() - startTime);
      supabase.rpc("kb_log_query", {
        p_user_id: user_id || null,
        p_user_name: user_name || null,
        p_user_role: user_role || null,
        p_query_text: query,
        p_language: language,
        p_input_method: input_method,
        p_was_answered: true,
        p_response_time_ms: responseTime,
        p_cache_hit: true,
        p_matched_category: cachedResponse.category || null,
        p_confidence_score: 1.0,
      });

      return new Response(
        JSON.stringify({
          ...cachedResponse,
          _meta: { source: "cache", response_time_ms: responseTime, cache_hit: true },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ LAYER 2: TRAINING MATCH (pre-trained Q&A) ═══
    const queryEmbedding = await getEmbedding(query);

    const { data: trainingMatches } = await supabase.rpc("kb_match_training", {
      query_embedding: queryEmbedding,
      match_threshold: 0.85,
      match_count: 3,
    });

    if (trainingMatches && trainingMatches.length > 0 && trainingMatches[0].expected_answer) {
      const bestMatch = trainingMatches[0];
      const responseTime = Math.round(performance.now() - startTime);

      const response = {
        type: "editorial",
        title: bestMatch.category,
        answer: bestMatch.expected_answer,
        matched_question: bestMatch.question,
        category: bestMatch.category,
        confidence: bestMatch.similarity,
        references: [],
      };

      // Fire-and-forget: cache + log + increment
      supabase.from("kb_cache").upsert({
        query_hash: queryHash,
        query_text: query,
        response_json: response,
        language,
      }, { onConflict: "query_hash" }).then(() => {});

      supabase.rpc("kb_log_query", {
        p_user_id: user_id || null,
        p_user_name: user_name || null,
        p_user_role: user_role || null,
        p_query_text: query,
        p_language: language,
        p_input_method: input_method,
        p_was_answered: true,
        p_response_time_ms: responseTime,
        p_cache_hit: false,
        p_matched_category: bestMatch.category,
        p_confidence_score: bestMatch.similarity,
      });

      supabase
        .from("kb_training_questions")
        .update({
          cache_hits: (bestMatch.cache_hits || 0) + 1,
          last_served_at: new Date().toISOString(),
        })
        .eq("id", bestMatch.id)
        .then(() => {});

      return new Response(
        JSON.stringify({
          ...response,
          _meta: { source: "training", response_time_ms: responseTime, cache_hit: false, similarity: bestMatch.similarity },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ LAYER 3: VECTOR SEARCH (semantic RAG via Lovable AI) ═══
    const { data: vectorMatches } = await supabase.rpc("kb_match_embeddings", {
      query_embedding: queryEmbedding,
      match_threshold: 0.78,
      match_count: 10,
    });

    if (vectorMatches && vectorMatches.length > 0) {
      const context = vectorMatches
        .map((m: any) => `[${m.source_type}] ${m.content}`)
        .join("\n\n");
      const references = vectorMatches.map((m: any) => ({
        source_type: m.source_type,
        source_url: m.source_url,
        similarity: m.similarity,
        metadata: m.metadata,
      }));

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          temperature: 0.3,
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: `You are the Catalyst Knowledge Base for the Ministry of Industry & Mineral Resources, Saudi Arabia. Respond in structured editorial format with sections: Background, Investor Use (bulleted), The Storyline (narrative), Current Status, Good News (bulleted), Issues & Risks (bulleted), Who's Working. Use **name** for people and \`TICKET-123\` for tickets. Bloomberg editorial style. Language: ${language === "ar" ? "Arabic" : "English"}. Only include sections with relevant data. Do not hallucinate.`,
            },
            {
              role: "user",
              content: `Question: ${query}\n\nContext from knowledge base:\n${context}`,
            },
          ],
        }),
      });

      if (!chatRes.ok) {
        const status = chatRes.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await chatRes.text();
        throw new Error(`AI gateway error ${status}: ${errText}`);
      }

      const chatData = await chatRes.json();
      const answer = chatData.choices?.[0]?.message?.content || "I couldn't generate a response.";
      const responseTime = Math.round(performance.now() - startTime);

      const response = {
        type: "editorial",
        title: query,
        answer,
        category: vectorMatches[0]?.metadata?.category || "General",
        confidence: vectorMatches[0]?.similarity || 0,
        references,
      };

      supabase.from("kb_cache").upsert({
        query_hash: queryHash,
        query_text: query,
        response_json: response,
        language,
      }, { onConflict: "query_hash" }).then(() => {});

      supabase.rpc("kb_log_query", {
        p_user_id: user_id || null,
        p_user_name: user_name || null,
        p_user_role: user_role || null,
        p_query_text: query,
        p_language: language,
        p_input_method: input_method,
        p_was_answered: true,
        p_response_time_ms: responseTime,
        p_cache_hit: false,
        p_matched_category: vectorMatches[0]?.metadata?.category || null,
        p_confidence_score: vectorMatches[0]?.similarity || 0,
      });

      return new Response(
        JSON.stringify({
          ...response,
          _meta: { source: "vector_search", response_time_ms: responseTime, cache_hit: false, chunks_matched: vectorMatches.length },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══ LAYER 4: FALLBACK ═══
    const responseTime = Math.round(performance.now() - startTime);

    supabase.rpc("kb_log_query", {
      p_user_id: user_id || null,
      p_user_name: user_name || null,
      p_user_role: user_role || null,
      p_query_text: query,
      p_language: language,
      p_input_method: input_method,
      p_was_answered: false,
      p_response_time_ms: responseTime,
      p_cache_hit: false,
      p_matched_category: null,
      p_confidence_score: 0,
    });

    return new Response(
      JSON.stringify({
        type: "fallback",
        title: "No Match Found",
        answer:
          language === "ar"
            ? "لم أتمكن من العثور على معلومات محددة حول هذا الموضوع في قاعدة المعرفة. يمكنك إعادة صياغة سؤالك أو تجربة موضوع مختلف."
            : "I couldn't find specific information about this topic in the knowledge base. This query has been logged for review. You can try rephrasing your question or exploring a related topic.",
        category: null,
        confidence: 0,
        references: [],
        _meta: { source: "fallback", response_time_ms: responseTime, cache_hit: false },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("KB Query Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
