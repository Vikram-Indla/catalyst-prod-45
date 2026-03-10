import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLovableAI } from "../_shared/lovable-ai.ts";
import { requireAuth } from "../_shared/auth-guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 50;

async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  const data = await res.json();
  if (!data.data) throw new Error(`Batch embedding failed: ${JSON.stringify(data)}`);
  return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action = "embed_batch", offset = 0 } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "status") {
      const { count: total } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true });

      const { count: embedded } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true })
        .eq("is_embedded", true);

      return new Response(
        JSON.stringify({
          total_questions: total || 0,
          embedded: embedded || 0,
          remaining: (total || 0) - (embedded || 0),
          percentage: total ? Math.round(((embedded || 0) / total) * 100) : 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "embed_batch" || action === "embed_all") {
      const limit = action === "embed_all" ? 1500 : BATCH_SIZE;

      const { data: questions, error: fetchError } = await supabase
        .from("kb_training_questions")
        .select("id, question, category, question_number")
        .eq("is_embedded", false)
        .order("question_number", { ascending: true })
        .range(offset, offset + limit - 1);

      if (fetchError) throw fetchError;
      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({ message: "All questions are already embedded", embedded_this_run: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalEmbedded = 0;
      const errors: string[] = [];

      for (let i = 0; i < questions.length; i += BATCH_SIZE) {
        const batch = questions.slice(i, i + BATCH_SIZE);
        const texts = batch.map((q: any) => `[${q.category}] ${q.question}`);

        try {
          const embeddings = await getBatchEmbeddings(texts);

          for (let j = 0; j < batch.length; j++) {
            const { error: updateError } = await supabase
              .from("kb_training_questions")
              .update({ embedding: embeddings[j], is_embedded: true })
              .eq("id", batch[j].id);

            if (updateError) {
              errors.push(`Q#${batch[j].question_number}: ${updateError.message}`);
            } else {
              totalEmbedded++;
            }
          }

          if (i + BATCH_SIZE < questions.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (batchError: any) {
          errors.push(`Batch ${i}-${i + BATCH_SIZE}: ${batchError.message}`);
        }
      }

      // Get remaining count for frontend
      const { count: remainingCount } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true })
        .eq("is_embedded", false);

      return new Response(
        JSON.stringify({
          message: `Embedded ${totalEmbedded} questions`,
          embedded: totalEmbedded,
          embedded_this_run: totalEmbedded,
          batch_processed: totalEmbedded,
          remaining: remainingCount || 0,
          errors: errors.length > 0 ? errors : undefined,
          next_offset: offset + questions.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "warm_cache") {
      const { data: topQuestions } = await supabase
        .from("kb_training_questions")
        .select("question, category, expected_answer")
        .eq("is_embedded", true)
        .not("expected_answer", "is", null)
        .order("cache_hits", { ascending: false })
        .limit(500);

      let cached = 0;
      for (const q of topQuestions || []) {
        const normalized = q.question.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
        const data = new TextEncoder().encode(normalized);
        const hash = await crypto.subtle.digest("SHA-256", data);
        const queryHash = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");

        const { error } = await supabase.from("kb_cache").upsert({
          query_hash: queryHash,
          query_text: q.question,
          response_json: { type: "editorial", title: q.category, answer: q.expected_answer, category: q.category, confidence: 1.0 },
          language: "en",
          ttl_hours: 168,
        });
        if (!error) cached++;
      }

      return new Response(
        JSON.stringify({ message: `Warmed cache with ${cached} entries` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_answers") {
      const GEN_BATCH = 10;
      const { data: unanswered, error: fetchErr } = await supabase
        .from("kb_training_questions")
        .select("id, question, category, question_number")
        .is("expected_answer", null)
        .order("question_number", { ascending: true })
        .limit(GEN_BATCH);

      if (fetchErr) throw fetchErr;
      if (!unanswered || unanswered.length === 0) {
        return new Response(
          JSON.stringify({ message: "All questions already have answers", generated: 0, remaining: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const systemPrompt = `You are Catalyst, an enterprise portfolio management platform AI assistant. You answer questions about the platform's modules: Strategy Hub (OKRs, themes, goals, key results, initiatives), Product Hub (projects, epics, features, stories, tasks, bugs, releases, boards), Testing & QA (test cases, cycles, defects), Resource Management (capacity, budget, resource inventory), Knowledge Base, Demand Management (business requests), and Incident & Change management.

Answer each question with a concise, authoritative 2-4 sentence response. Focus on what the entity/concept is, how it works in the platform, and any key relationships. If the question is about a lookup or navigation action, describe how a user would find that information in the platform.

Return a JSON array where each element has "id" (the question UUID) and "answer" (your response string).`;

      const questionsBlock = unanswered.map((q: any) => `- ID: ${q.id} | Category: ${q.category} | Question: ${q.question}`).join("\n");
      
      const aiResponse = await callLovableAI({
        systemPrompt,
        userPrompt: `Generate answers for these ${unanswered.length} training questions:\n\n${questionsBlock}`,
        jsonMode: true,
        maxTokens: 4096,
        model: "google/gemini-2.5-flash",
      });

      let answers: { id: string; answer: string }[];
      try {
        const parsed = JSON.parse(aiResponse);
        answers = Array.isArray(parsed) ? parsed : parsed.answers || parsed.results || [];
      } catch {
        throw new Error("Failed to parse AI response as JSON");
      }

      let generated = 0;
      const errors: string[] = [];
      for (const a of answers) {
        if (!a.id || !a.answer) continue;
        const { error: upErr } = await supabase
          .from("kb_training_questions")
          .update({ expected_answer: a.answer })
          .eq("id", a.id);
        if (upErr) errors.push(`${a.id}: ${upErr.message}`);
        else generated++;
      }

      const { count: remainingCount } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true })
        .is("expected_answer", null);

      return new Response(
        JSON.stringify({
          message: `Generated ${generated} answers`,
          generated,
          remaining: remainingCount || 0,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: status, embed_batch, embed_all, warm_cache, generate_answers" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("KB Train Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
