import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth } from "../_shared/auth-guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;

async function generateAnswers(questions: { id: string; question: string; category: string }[]): Promise<{ id: string; answer: string }[]> {
  const prompt = questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}`).join("\n");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        {
          role: "system",
          content: `You are the Knowledge Base for the Ministry of Industry & Mineral Resources (MIM), Saudi Arabia, and for the Catalyst project management platform used internally.

Generate concise, authoritative answers for each question. Format: return a JSON array with objects { "index": <1-based>, "answer": "<answer text>" }.

Guidelines:
- For ministry/licensing questions: provide factual information about Saudi industrial licensing, SIDF, Senaei platform, chemical permits, environmental compliance, Vision 2030 industrial policies.
- For Catalyst/platform questions: explain how the Catalyst PM tool works (work items, sprints, releases, Jira integration, analytics, etc.).
- For conversational questions: provide helpful, contextual responses.
- Keep answers between 2-5 sentences. Be specific and actionable.
- Use Bloomberg editorial style — clear, professional, data-driven.
- Return ONLY valid JSON array, no markdown wrapping.`,
        },
        {
          role: "user",
          content: `Generate answers for these ${questions.length} questions:\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Parse JSON from response (handle markdown wrapping)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  
  const parsed = JSON.parse(jsonStr) as { index: number; answer: string }[];
  return parsed.map((p) => ({
    id: questions[p.index - 1]?.id || "",
    answer: p.answer,
  })).filter(p => p.id);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth guard ── previously unauthenticated; with --no-verify-jwt this
  // was a public endpoint that triggers billed LLM calls and writes answers.
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { action = "generate_batch", batch_size = BATCH_SIZE, category } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (action === "status") {
      const { count: total } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true });
      const { count: withAnswers } = await supabase
        .from("kb_training_questions")
        .select("*", { count: "exact", head: true })
        .not("expected_answer", "is", null)
        .neq("expected_answer", "");

      return new Response(
        JSON.stringify({ total: total || 0, with_answers: withAnswers || 0, remaining: (total || 0) - (withAnswers || 0) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_batch") {
      let query = supabase
        .from("kb_training_questions")
        .select("id, question, category, question_number")
        .or("expected_answer.is.null,expected_answer.eq.")
        .order("question_number", { ascending: true })
        .limit(batch_size);

      if (category) {
        query = query.eq("category", category);
      }

      const { data: questions, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({ message: "All questions already have answers", generated: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalGenerated = 0;
      const errors: string[] = [];

      // Process in sub-batches of 10
      for (let i = 0; i < questions.length; i += 10) {
        const batch = questions.slice(i, i + 10);
        try {
          const answers = await generateAnswers(batch);
          for (const { id, answer } of answers) {
            const { error: updateError } = await supabase
              .from("kb_training_questions")
              .update({ expected_answer: answer })
              .eq("id", id);
            if (updateError) {
              errors.push(`${id}: ${updateError.message}`);
            } else {
              totalGenerated++;
            }
          }
          // Rate limit pause
          if (i + 10 < questions.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (batchErr: any) {
          errors.push(`Batch ${i}: ${batchErr.message}`);
        }
      }

      return new Response(
        JSON.stringify({
          message: `Generated ${totalGenerated} answers`,
          generated: totalGenerated,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: status, generate_batch" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("KB Generate Answers Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
