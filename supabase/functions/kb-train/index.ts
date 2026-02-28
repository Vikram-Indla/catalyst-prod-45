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

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error: ${err}`);
  }
  const json = await res.json();
  return json.data.map((d: any) => d.embedding);
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, batch_size = 50, offset = 0, content, source_type, source_url, metadata } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Action: embed_training — embed training questions in batches
    if (action === "embed_training") {
      const { data: questions, error } = await supabase
        .from("kb_training_questions")
        .select("id, question")
        .eq("is_embedded", false)
        .order("question_number", { ascending: true })
        .range(offset, offset + batch_size - 1);

      if (error) throw error;
      if (!questions || questions.length === 0) {
        return new Response(JSON.stringify({ message: "No unembedded questions found", embedded: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const texts = questions.map((q: any) => q.question);
      const embeddings = await getEmbeddings(texts);

      let embedded = 0;
      for (let i = 0; i < questions.length; i++) {
        const { error: updateError } = await supabase
          .from("kb_training_questions")
          .update({
            embedding: JSON.stringify(embeddings[i]),
            is_embedded: true,
          })
          .eq("id", questions[i].id);

        if (!updateError) embedded++;
      }

      // Count remaining
      const { count: remaining } = await supabase
        .from("kb_training_questions")
        .select("id", { count: "exact", head: true })
        .eq("is_embedded", false);

      return new Response(
        JSON.stringify({
          embedded,
          batch_processed: questions.length,
          remaining: remaining || 0,
          message: remaining ? `${remaining} questions still need embedding` : "All questions embedded!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: add_content — add new content chunks to kb_embeddings
    if (action === "add_content") {
      if (!content || !source_type) {
        return new Response(JSON.stringify({ error: "content and source_type are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chunks = Array.isArray(content) ? content : [content];
      let added = 0;
      let skipped = 0;

      for (const chunk of chunks) {
        const contentHash = await sha256(chunk);

        // Check for duplicate
        const { data: existing } = await supabase
          .from("kb_embeddings")
          .select("id")
          .eq("content_hash", contentHash)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const [embedding] = await getEmbeddings([chunk]);

        const { error: insertError } = await supabase.from("kb_embeddings").insert({
          content: chunk,
          content_hash: contentHash,
          source_type,
          source_url: source_url || null,
          metadata: metadata || {},
          embedding: JSON.stringify(embedding),
          chunk_index: added,
        });

        if (!insertError) added++;
      }

      return new Response(
        JSON.stringify({ added, skipped, total_chunks: chunks.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: status — show embedding status
    if (action === "status") {
      const { count: totalTraining } = await supabase
        .from("kb_training_questions")
        .select("id", { count: "exact", head: true });

      const { count: embeddedTraining } = await supabase
        .from("kb_training_questions")
        .select("id", { count: "exact", head: true })
        .eq("is_embedded", true);

      const { count: totalEmbeddings } = await supabase
        .from("kb_embeddings")
        .select("id", { count: "exact", head: true });

      const { count: totalSources } = await supabase
        .from("kb_sources")
        .select("id", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          training_questions: { total: totalTraining || 0, embedded: embeddedTraining || 0 },
          kb_embeddings: totalEmbeddings || 0,
          sources: totalSources || 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: embed_training, add_content, status" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("kb-train error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
