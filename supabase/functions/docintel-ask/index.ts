/**
 * docintel-ask — grounded Q&A ("Ask") over the Document Intelligence corpus
 * (USER-facing). Arabic + English.
 *
 * Answers a free-text question STRICTLY grounded in retrieved evidence.
 * Same hard rule as docintel-generate — no hallucinated content. Every
 * substantive claim MUST carry an inline [E<n>] evidence marker; the model is
 * instructed to write "Not found in source" rather than invent. Marker
 * coverage IS the confidence critic: confidence = substantive units with ≥1
 * valid marker / substantive units (deterministic, no second LLM call).
 *
 *   POST { projectId, documentId?, question, stream? }
 *     stream=false → json { answer_md, citations, confidence, evidence_count, freshness }
 *     stream=true  → text/event-stream: markdown deltas as `data: {"delta": "..."}`
 *                    then a terminal `data: {"done":true, citations, confidence,
 *                    evidence_count, freshness}`
 *
 * Language routing: an Arabic-majority question retrieves ar_text evidence and
 * answers in Arabic; otherwise en_text + table_summary + image_caption evidence
 * and an English answer. Zero evidence → truthful localized "Not found"
 * response with NO LLM spend. Freshness: cited ai_documents' updated_at is
 * returned as { latest_source_at, oldest_source_at } plus a per-citation
 * document_updated_at. Nothing is persisted beyond ai_agent_runs + usage log —
 * an answer is ephemeral, not an artifact.
 *
 * Any failure records ai_agent_runs status 'error' + logUsage, returns 500.
 */
import {
  corsHeaders,
  getServiceClient,
  json,
  requireMember,
} from "../_shared/docintel.ts";
import { loadActivePrompt } from "../_shared/prompts.ts";
import {
  embed,
  generateStream,
  generateText,
  logUsage,
  type LlmMessage,
  type LlmResult,
} from "../_shared/llm.ts";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─────────────────────────────────────────────────────────────────────
// Retrieval params — mirrors docintel-generate, with a tighter top-k for Q&A.
// ─────────────────────────────────────────────────────────────────────
const MATCH_COUNT = 12;
const CHUNK_CAP = 1200; // per-evidence content cap (chars) to bound tokens
const QUOTE_CAP = 400; // per-citation quoted_text cap (chars)
const SNIPPET_CAP = 160; // per-citation snippet cap (chars)
const QUESTION_CAP = 2000; // hard cap on accepted question length (chars)
const SUBSTANTIVE_MIN = 40; // a claim unit must exceed this length to count

const EVIDENCE_MARKER = /\[E(\d+)\]/g;
const ARABIC_CHAR = /[؀-ۿ]/g;

const NOT_FOUND_EN = "Not found in source documents.";
const NOT_FOUND_AR = "لم يتم العثور على إجابة في المستندات المصدرية.";

type EvidenceItem = {
  index: number; // 1-based En
  content: string;
  document_id: string;
  page_number: number | null;
  block_id: string | null;
  rrf_score: number | null;
};

type HybridRow = {
  id: string;
  document_id: string;
  content: string;
  lang: string | null;
  page_numbers: number[] | null;
  block_ids: string[] | null;
  rrf_score: number | null;
  vector_sim: number | null;
  keyword_rank: number | null;
};

type DocMeta = { title: string | null; updated_at: string | null };

type AskCitation = {
  marker: number; // the [E<n>] index this citation backs
  document_id: string;
  document_title: string | null;
  page_number: number | null;
  block_id: string | null;
  quoted_text: string | null;
  snippet: string | null;
  document_updated_at: string | null;
};

type AskFreshness = {
  latest_source_at: string | null;
  oldest_source_at: string | null;
};

// ─────────────────────────────────────────────────────────────────────
// Language heuristic: Arabic-majority characters → Arabic question.
// ─────────────────────────────────────────────────────────────────────
function isArabicQuestion(q: string): boolean {
  const arabic = (q.match(ARABIC_CHAR) ?? []).length;
  const latin = (q.match(/[A-Za-z]/g) ?? []).length;
  return arabic > 0 && arabic > latin;
}

// ─────────────────────────────────────────────────────────────────────
// Grounded Q&A prompt — same [E<n>] + "Not found in source" contract as
// docintel-generate, specialised for direct question answering.
// ─────────────────────────────────────────────────────────────────────
// Tunable via the ai_agent_prompts registry (slug 'docintel.ask.answer'). This inline
// constant is the byte-faithful default self-seeded on first run; the two {{TOKENS}} are
// substituted per-language in systemPrompt() so the registry text stays language-agnostic
// while output remains identical to the pre-registry behaviour. See _shared/prompts.ts.
const ASK_PROMPT_TEMPLATE = [
  "You are a document Q&A assistant.",
  "Answer the user's QUESTION STRICTLY grounded in the numbered EVIDENCE supplied by the user.",
  "After EVERY factual sentence, cite the evidence item(s) that support it using inline markers like [E3] or [E1][E4].",
  "{{NOT_FOUND}}",
  "Do NOT use any knowledge beyond the evidence. Do not add facts, numbers, names, or requirements not present in the EVIDENCE.",
  "{{LANG}}",
  "Output GitHub-flavoured Markdown. Keep the answer concise and directly responsive to the question.",
].join("\n");

const ASK_PROMPT_SLUG = "docintel.ask.answer";

function systemPrompt(arabic: boolean, template: string): string {
  const notFound = arabic
    ? "If the evidence does not contain the answer, write 'غير موجود في المصدر' rather than inventing."
    : "If the evidence does not contain the answer, write 'Not found in source' rather than inventing.";
  const lang = arabic
    ? "أجب باللغة العربية، لكن أبقِ علامات الأدلة بالصيغة اللاتينية [E<n>]."
    : "Answer in English.";
  return template.replace("{{NOT_FOUND}}", notFound).replace("{{LANG}}", lang);
}

/** Build the numbered EVIDENCE + QUESTION user message. Each chunk capped to CHUNK_CAP. */
function userMessage(question: string, evidence: EvidenceItem[]): string {
  const lines = evidence.map((e) => {
    const shortId = e.document_id.slice(0, 8);
    const page = e.page_number != null ? `page ${e.page_number}` : "page ?";
    const body = e.content.length > CHUNK_CAP ? e.content.slice(0, CHUNK_CAP) : e.content;
    return `E${e.index} (doc ${shortId}, ${page}): ${body}`;
  });
  return [
    "EVIDENCE (cite these with inline [E<n>] markers; do not use any other source):",
    "",
    lines.join("\n\n"),
    "",
    `QUESTION: ${question}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Deterministic confidence + citation parse (grounding-score approach).
// ─────────────────────────────────────────────────────────────────────

/** A markdown line that is a heading / list-bullet marker with no prose is not a claim. */
function isHeadingOnly(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return true;
  if (/^#{1,6}\s/.test(t)) return true;
  if (/^([-*_])\1{2,}$/.test(t)) return true; // --- *** ___
  if (/^[-*+]\s*$/.test(t)) return true; // empty bullet
  if (/^>\s*$/.test(t)) return true;
  return false;
}

/** Strip leading markdown scaffolding so a claim reads as prose. */
function claimText(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^>\s+/, "")
    .trim();
}

/**
 * confidence = grounded substantive lines / substantive lines. A short Q&A
 * answer can be a single line under SUBSTANTIVE_MIN chars — when NO line is
 * substantive, fall back to marker presence (any valid marker → 1, else 0)
 * so a correctly cited one-liner is not scored as ungrounded.
 */
function computeConfidence(markdown: string): {
  confidence: number;
  markerIndices: number[];
} {
  const lines = markdown.split(/\r?\n/);
  let substantive = 0;
  let grounded = 0;
  const indexSet = new Set<number>();

  for (const raw of lines) {
    if (isHeadingOnly(raw)) continue;

    const indices: number[] = [];
    EVIDENCE_MARKER.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EVIDENCE_MARKER.exec(raw)) !== null) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n > 0) {
        indices.push(n);
        indexSet.add(n);
      }
    }

    const text = claimText(raw);
    if (text.length <= SUBSTANTIVE_MIN) continue;
    substantive++;
    if (indices.length > 0) grounded++;
  }

  const markerIndices = [...indexSet].sort((a, b) => a - b);
  const confidence = substantive === 0
    ? (markerIndices.length > 0 ? 1 : 0)
    : Number((grounded / substantive).toFixed(2));
  return { confidence, markerIndices };
}

/**
 * One citation per DISTINCT [E<n>] marker used in the answer, resolved back to
 * (document, page, block, quoted evidence). Markers whose index exceeds the
 * evidence length are ignored safely.
 */
function buildCitations(
  markerIndices: number[],
  evidence: EvidenceItem[],
  docMeta: Map<string, DocMeta>,
): AskCitation[] {
  const byIndex = new Map<number, EvidenceItem>();
  for (const e of evidence) byIndex.set(e.index, e);

  const rows: AskCitation[] = [];
  for (const idx of markerIndices) {
    const e = byIndex.get(idx);
    if (!e) continue; // marker points past the evidence list — ignore safely.
    const meta = docMeta.get(e.document_id);
    rows.push({
      marker: idx,
      document_id: e.document_id,
      document_title: meta?.title ?? null,
      page_number: e.page_number,
      block_id: e.block_id,
      quoted_text: e.content.length > QUOTE_CAP ? e.content.slice(0, QUOTE_CAP) : e.content,
      snippet: e.content.length > SNIPPET_CAP ? `${e.content.slice(0, SNIPPET_CAP)}…` : e.content,
      document_updated_at: meta?.updated_at ?? null,
    });
  }
  return rows;
}

/**
 * Freshness over the cited documents' updated_at (fallback: every evidence
 * document when the answer cited nothing — those are still the sources
 * consulted). Unknown when no timestamps exist.
 */
function computeFreshness(
  citations: AskCitation[],
  evidence: EvidenceItem[],
  docMeta: Map<string, DocMeta>,
): AskFreshness {
  const docIds = citations.length > 0
    ? [...new Set(citations.map((c) => c.document_id))]
    : [...new Set(evidence.map((e) => e.document_id))];
  const stamps = docIds
    .map((id) => docMeta.get(id)?.updated_at)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .sort();
  return {
    latest_source_at: stamps.length > 0 ? stamps[stamps.length - 1] : null,
    oldest_source_at: stamps.length > 0 ? stamps[0] : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// ai_agent_runs recording (agent 'ask'). Best-effort on the ok paths that
// carry no artifact; the error path mirrors docintel-generate.
// ─────────────────────────────────────────────────────────────────────
async function recordRun(
  admin: SupabaseClient,
  params: {
    projectId: string;
    documentId: string | null;
    provider: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    durationMs: number;
    status: "ok" | "error";
    errorMessage?: string;
    promptId?: string | null;
    promptVersion?: number | null;
  },
): Promise<void> {
  await admin
    .from("ai_agent_runs")
    .insert({
      project_id: params.projectId,
      document_id: params.documentId,
      agent: "ask",
      intent: "ask",
      provider: params.provider,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      duration_ms: params.durationMs,
      status: params.status,
      error_message: params.errorMessage ?? null,
      prompt_id: params.promptId ?? null,
      prompt_version: params.promptVersion ?? null,
    })
    .then(() => {}, () => {});
}

// ─────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = getServiceClient();
  const body = (await req.json().catch(() => null)) as
    | {
        projectId?: string;
        documentId?: string;
        question?: string;
        stream?: boolean;
      }
    | null;

  const projectId = body?.projectId;
  const documentId = typeof body?.documentId === "string" && body.documentId.length > 0
    ? body.documentId
    : null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const wantStream = body?.stream === true;

  // 1) Basic shape validation (before any auth / spend).
  if (!projectId || typeof projectId !== "string") {
    return json({ error: "projectId is required" }, 400);
  }
  if (question.length === 0) {
    return json({ error: "question is required" }, 400);
  }
  if (question.length > QUESTION_CAP) {
    return json({ error: `question exceeds ${QUESTION_CAP} characters` }, 400);
  }

  // 2) Membership gate — no LLM spend before this passes.
  const userId = await requireMember(req, projectId, admin);
  if (!userId) {
    return json({ error: "FORBIDDEN" }, 403);
  }

  const t0 = Date.now();
  const arabic = isArabicQuestion(question);

  try {
    // 3) If scoped to a document, validate it belongs to the project.
    if (documentId) {
      const { data: doc, error: docErr } = await admin
        .from("ai_documents")
        .select("id")
        .eq("id", documentId)
        .eq("project_id", projectId)
        .maybeSingle();
      if (docErr) throw new Error(`document lookup failed: ${docErr.message}`);
      if (!doc) {
        return json({ error: `document ${documentId} not in project ${projectId}` }, 400);
      }
    }

    // 4) Retrieve evidence via hybrid RAG — Arabic questions read the Arabic
    //    extraction; English questions read en_text + table/image summaries.
    const { embeddings } = await embed([question]);
    const queryEmbedding = embeddings[0];

    const { data: rows, error: rpcErr } = await admin.rpc("docintel_hybrid_search", {
      query_text: question,
      query_embedding: queryEmbedding as unknown as string,
      p_project_id: projectId,
      p_document_ids: documentId ? [documentId] : null,
      p_content_kinds: arabic ? ["ar_text"] : ["en_text", "table_summary", "image_caption"],
      p_langs: arabic ? ["ar"] : null,
      match_count: MATCH_COUNT,
    });
    if (rpcErr) throw new Error(`hybrid_search failed: ${rpcErr.message}`);

    const evidence: EvidenceItem[] = ((rows ?? []) as HybridRow[]).map((r, i) => ({
      index: i + 1,
      content: r.content ?? "",
      document_id: r.document_id,
      page_number: Array.isArray(r.page_numbers) && r.page_numbers.length > 0 ? r.page_numbers[0] : null,
      block_id: Array.isArray(r.block_ids) && r.block_ids.length > 0 ? r.block_ids[0] : null,
      rrf_score: typeof r.rrf_score === "number" ? r.rrf_score : null,
    })).filter((e) => e.content.trim().length > 0);

    // 4b) Zero evidence → truthful localized "Not found". NO LLM spend.
    if (evidence.length === 0) {
      const answerMd = arabic ? NOT_FOUND_AR : NOT_FOUND_EN;
      await recordRun(admin, {
        projectId,
        documentId,
        provider: null,
        model: null,
        inputTokens: null,
        outputTokens: null,
        durationMs: Date.now() - t0,
        status: "ok",
      });
      await logUsage(admin, {
        source: "docintel-ask",
        action: "ask",
        status: "ok",
        payload: { projectId, documentId, arabic, evidence_count: 0, confidence: 0 },
      });

      const emptyResult = {
        answer_md: answerMd,
        citations: [] as AskCitation[],
        confidence: 0,
        evidence_count: 0,
        freshness: { latest_source_at: null, oldest_source_at: null } as AskFreshness,
      };
      if (wantStream) return streamEmptyResponse(answerMd, emptyResult);
      return json(emptyResult);
    }

    // 5) Resolve source-document metadata once (citation titles + freshness).
    const evidenceDocIds = [...new Set(evidence.map((e) => e.document_id))];
    const { data: docRows, error: metaErr } = await admin
      .from("ai_documents")
      .select("id, title, updated_at")
      .in("id", evidenceDocIds);
    if (metaErr) throw new Error(`document metadata lookup failed: ${metaErr.message}`);
    const docMeta = new Map<string, DocMeta>(
      ((docRows ?? []) as Array<{ id: string; title: string | null; updated_at: string | null }>)
        .map((d) => [d.id, { title: d.title, updated_at: d.updated_at }]),
    );

    // 6) Build the grounded prompt. Prompt text comes from the ai_agent_prompts
    //    registry (self-seeded byte-faithfully from ASK_PROMPT_TEMPLATE on first run);
    //    its id/version are stamped on the agent run for truthful provenance.
    const askPrompt = await loadActivePrompt(admin, ASK_PROMPT_SLUG, ASK_PROMPT_TEMPLATE);
    const messages: LlmMessage[] = [
      { role: "system", parts: [{ text: systemPrompt(arabic, askPrompt.prompt) }] },
      { role: "user", parts: [{ text: userMessage(question, evidence) }] },
    ];

    // 7) Generate — streamed or single-shot.
    if (wantStream) {
      return handleStream(admin, {
        messages,
        projectId,
        documentId,
        arabic,
        evidence,
        docMeta,
        t0,
        promptId: askPrompt.id,
        promptVersion: askPrompt.version,
      });
    }

    const result: LlmResult = await generateText({
      messages,
      temperature: 0.2,
      maxOutputTokens: 4096,
      timeoutMs: 50_000,
    });
    const answerMd = result.text ?? "";

    const { confidence, markerIndices } = computeConfidence(answerMd);
    const citations = buildCitations(markerIndices, evidence, docMeta);
    const freshness = computeFreshness(citations, evidence, docMeta);

    await recordRun(admin, {
      projectId,
      documentId,
      provider: result.provider,
      model: result.model,
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
      durationMs: result.durationMs,
      status: "ok",
      promptId: askPrompt.id,
      promptVersion: askPrompt.version,
    });
    await logUsage(admin, {
      source: "docintel-ask",
      action: "ask",
      status: "ok",
      payload: {
        projectId,
        documentId,
        arabic,
        provider: result.provider,
        model: result.model,
        evidence_count: evidence.length,
        confidence,
        citationCount: citations.length,
      },
    });

    return json({
      answer_md: answerMd,
      citations,
      confidence,
      evidence_count: evidence.length,
      freshness,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await recordRun(admin, {
      projectId,
      documentId,
      provider: null,
      model: null,
      inputTokens: null,
      outputTokens: null,
      durationMs: Date.now() - t0,
      status: "error",
      errorMessage: msg,
    });
    await logUsage(admin, {
      source: "docintel-ask",
      action: "ask",
      status: "error",
      error: msg,
      payload: { projectId, documentId, arabic },
    });
    return json({ error: msg }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Streaming path. Pipe LLM text deltas to the client as SSE `data:` frames,
// accumulate the full answer, then compute confidence + citations + freshness
// and emit a terminal `data: {"done":true, ...}` frame.
// ─────────────────────────────────────────────────────────────────────
function handleStream(
  admin: SupabaseClient,
  params: {
    messages: LlmMessage[];
    projectId: string;
    documentId: string | null;
    arabic: boolean;
    evidence: EvidenceItem[];
    docMeta: Map<string, DocMeta>;
    t0: number;
    promptId: string | null;
    promptVersion: number | null;
  },
): Response {
  const enc = new TextEncoder();
  const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const { stream, meta } = generateStream({
    messages: params.messages,
    temperature: 0.2,
    maxOutputTokens: 4096,
    timeoutMs: 50_000,
  });

  const outBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answerMd = "";
      try {
        const reader = stream.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            answerMd += value;
            controller.enqueue(sse({ delta: value }));
          }
        }

        // Stream finished — resolve meta (provider/model/tokens) and score.
        const m = await meta.catch(() => null);
        const { confidence, markerIndices } = computeConfidence(answerMd);
        const citations = buildCitations(markerIndices, params.evidence, params.docMeta);
        const freshness = computeFreshness(citations, params.evidence, params.docMeta);

        await recordRun(admin, {
          projectId: params.projectId,
          documentId: params.documentId,
          provider: m?.provider ?? null,
          model: m?.model ?? null,
          inputTokens: m?.inputTokens ?? null,
          outputTokens: m?.outputTokens ?? null,
          durationMs: m?.durationMs ?? Date.now() - params.t0,
          status: "ok",
          promptId: params.promptId,
          promptVersion: params.promptVersion,
        });
        await logUsage(admin, {
          source: "docintel-ask",
          action: "ask",
          status: "ok",
          payload: {
            projectId: params.projectId,
            documentId: params.documentId,
            arabic: params.arabic,
            provider: m?.provider ?? null,
            model: m?.model ?? null,
            evidence_count: params.evidence.length,
            confidence,
            citationCount: citations.length,
            streamed: true,
          },
        });

        controller.enqueue(
          sse({
            done: true,
            citations,
            confidence,
            evidence_count: params.evidence.length,
            freshness,
          }),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await recordRun(admin, {
          projectId: params.projectId,
          documentId: params.documentId,
          provider: null,
          model: null,
          inputTokens: null,
          outputTokens: null,
          durationMs: Date.now() - params.t0,
          status: "error",
          errorMessage: msg,
          promptId: params.promptId,
          promptVersion: params.promptVersion,
        });
        await logUsage(admin, {
          source: "docintel-ask",
          action: "ask",
          status: "error",
          error: msg,
          payload: {
            projectId: params.projectId,
            documentId: params.documentId,
            arabic: params.arabic,
            streamed: true,
          },
        });
        try {
          controller.enqueue(sse({ done: true, error: msg }));
          controller.close();
        } catch {
          controller.error(e);
        }
      }
    },
  });

  return new Response(outBody, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/** Stream path for the zero-evidence case: one delta frame + terminal done. */
function streamEmptyResponse(
  answerMd: string,
  done: {
    citations: AskCitation[];
    confidence: number;
    evidence_count: number;
    freshness: AskFreshness;
  },
): Response {
  const enc = new TextEncoder();
  const sse = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
  const outBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(sse({ delta: answerMd }));
      controller.enqueue(sse({ done: true, ...done }));
      controller.close();
    },
  });
  return new Response(outBody, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
