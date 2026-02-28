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

const EMBED_BATCH = 20;

/** Generate embeddings for an array of texts */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  const data = await res.json();
  if (!data.data) throw new Error(`Embedding failed: ${JSON.stringify(data)}`);
  return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

/** SHA-256 hash for deduplication */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Split long text into chunks of ~500 words with overlap */
function chunkText(text: string, maxWords = 500, overlapWords = 50): string[] {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < words.length) {
    const end = Math.min(i + maxWords, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i = end - overlapWords;
    if (i >= words.length - overlapWords) break;
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "ingest_training";
    const batchSize = body.batch_size || 100;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ─── Action: status ───
    if (action === "status") {
      const { count: totalChunks } = await supabase
        .from("kb_embeddings")
        .select("*", { count: "exact", head: true });

      const { data: byType } = await supabase
        .from("kb_embeddings")
        .select("source_type");

      const breakdown: Record<string, number> = {};
      for (const row of byType || []) {
        breakdown[row.source_type] = (breakdown[row.source_type] || 0) + 1;
      }

      return new Response(
        JSON.stringify({ total_chunks: totalChunks || 0, by_source_type: breakdown }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: ingest_training — Convert training Q&A into RAG chunks ───
    if (action === "ingest_training") {
      const offset = Math.max(0, Number(body.offset || 0));

      const { count: totalCandidates } = await supabase
        .from("kb_training_questions")
        .select("id", { count: "exact", head: true })
        .not("expected_answer", "is", null)
        .neq("expected_answer", "");

      // Paginate deterministically so we don't keep re-processing the first page forever
      const { data: questions, error: fetchErr } = await supabase
        .from("kb_training_questions")
        .select("id, question, category, expected_answer, question_number")
        .not("expected_answer", "is", null)
        .neq("expected_answer", "")
        .order("question_number", { ascending: true })
        .range(offset, offset + batchSize - 1);

      if (fetchErr) throw fetchErr;
      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({
            message: "No questions to ingest",
            ingested: 0,
            skipped: 0,
            batch_processed: 0,
            remaining: 0,
            total_candidates: totalCandidates || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let ingested = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Process in embedding batches
      for (let i = 0; i < questions.length; i += EMBED_BATCH) {
        const batch = questions.slice(i, i + EMBED_BATCH);

        // Build content chunks from Q&A pairs
        const chunks: { content: string; hash: string; category: string; qId: string; chunkIdx: number }[] = [];

        for (const q of batch) {
          const fullContent = `Category: ${q.category}\n\nQuestion: ${q.question}\n\nAnswer: ${q.expected_answer}`;
          const textChunks = chunkText(fullContent);

          for (let ci = 0; ci < textChunks.length; ci++) {
            const hash = await sha256(textChunks[ci]);
            chunks.push({ content: textChunks[ci], hash, category: q.category, qId: q.id, chunkIdx: ci });
          }
        }

        // Check which hashes already exist
        const hashes = chunks.map((c) => c.hash);
        const { data: existing } = await supabase
          .from("kb_embeddings")
          .select("content_hash")
          .in("content_hash", hashes);

        const existingSet = new Set((existing || []).map((e: any) => e.content_hash));
        const newChunks = chunks.filter((c) => !existingSet.has(c.hash));

        if (newChunks.length === 0) {
          skipped += batch.length;
          continue;
        }

        // Generate embeddings
        try {
          const embeddings = await getEmbeddings(newChunks.map((c) => c.content));

          const rows = newChunks.map((c, idx) => ({
            content: c.content,
            content_hash: c.hash,
            source_type: "internal",
            source_url: `training://${c.category}/${c.qId}`,
            metadata: { category: c.category, question_id: c.qId, ingest_type: "training_qa" },
            embedding: embeddings[idx],
            chunk_index: c.chunkIdx,
            language: "en",
          }));

          const { error: insertErr } = await supabase.from("kb_embeddings").insert(rows);
          if (insertErr) {
            errors.push(`Insert batch ${i}: ${insertErr.message}`);
          } else {
            ingested += newChunks.length;
          }
        } catch (embErr: any) {
          errors.push(`Embed batch ${i}: ${embErr.message}`);
        }

        // Rate limit pause
        if (i + EMBED_BATCH < questions.length) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      const batchProcessed = questions.length;
      const remaining = Math.max(0, (totalCandidates || 0) - (offset + batchProcessed));

      return new Response(
        JSON.stringify({
          message: `Processed ${batchProcessed} questions: ingested ${ingested} chunks, skipped ${skipped}`,
          ingested,
          skipped,
          batch_processed: batchProcessed,
          remaining,
          total_candidates: totalCandidates || 0,
          next_offset: offset + batchProcessed,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: ingest_text — Ingest arbitrary text content ───
    if (action === "ingest_text") {
      const { content, source_type, source_url, language = "en", metadata = {} } = body;
      if (!content || !source_type) {
        return new Response(
          JSON.stringify({ error: "content and source_type are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const textChunks = chunkText(content);
      let ingested = 0;

      for (let i = 0; i < textChunks.length; i += EMBED_BATCH) {
        const batch = textChunks.slice(i, i + EMBED_BATCH);
        const hashes = await Promise.all(batch.map((t) => sha256(t)));

        // Skip existing
        const { data: existing } = await supabase
          .from("kb_embeddings")
          .select("content_hash")
          .in("content_hash", hashes);
        const existingSet = new Set((existing || []).map((e: any) => e.content_hash));

        const newItems = batch
          .map((text, idx) => ({ text, hash: hashes[idx], chunkIdx: i + idx }))
          .filter((item) => !existingSet.has(item.hash));

        if (newItems.length === 0) continue;

        const embeddings = await getEmbeddings(newItems.map((item) => item.text));

        const rows = newItems.map((item, idx) => ({
          content: item.text,
          content_hash: item.hash,
          source_type,
          source_url: source_url || `manual://${source_type}`,
          metadata,
          embedding: embeddings[idx],
          chunk_index: item.chunkIdx,
          language,
        }));

        const { error } = await supabase.from("kb_embeddings").insert(rows);
        if (!error) ingested += rows.length;
      }

      return new Response(
        JSON.stringify({ message: `Ingested ${ingested} chunks`, ingested }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action: purge — Clear all RAG chunks ───
    if (action === "purge") {
      const sourceType = body.source_type;
      let query = supabase.from("kb_embeddings").delete();
      if (sourceType) {
        query = query.eq("source_type", sourceType);
      } else {
        query = query.neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
      }
      const { error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({ message: `Purged RAG chunks${sourceType ? ` for ${sourceType}` : ""}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: status, ingest_training, ingest_text, purge" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("KB Ingest Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
