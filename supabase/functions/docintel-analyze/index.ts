/**
 * docintel-analyze — per-BATCH NATIVE-TEXT-FIRST extraction worker (real work).
 *
 * Multi-agent task breakdown per page, routed by whether the page has a native
 * PDF text layer:
 *
 *   NATIVE PATH — SEGMENT-AND-TRANSLATE (native PDF + DOCX). unpdf pulls each
 *   page's Arabic text layer (getDocumentProxy → extractText, no vision OCR). A
 *   DETERMINISTIC segment agent (no LLM) splits that text into ordered segments
 *   { page, index, text_ar } — this Arabic is the SOURCE OF TRUTH and is NEVER
 *   sent back from the model. The TRANSLATE+LABEL agent is then given the
 *   NUMBERED Arabic segments and returns strict JSON with ONLY { page, index,
 *   kind, text_en, confidence } — one item per input (page,index), no Arabic
 *   re-emitted. Because the model's OUTPUT is English + labels only (~half the
 *   tokens), dense native batches no longer overrun the output budget / time out.
 *   Blocks are built by JOINING my segments (text_ar) with the model items
 *   (text_en, kind) on (page,index). A segment with no matching item is still
 *   persisted with text_ar + text_en=null (Arabic is never dropped). Very dense
 *   batches split the translate call into ≤ TRANSLATE_MAX_SEGMENTS sub-calls run
 *   concurrently; missing items are retried once by (page,index).
 *
 *   OCR AGENT (scanned / sparse pages) — the existing multimodal image path.
 *   pdf-lib slices those pages into a sub-PDF → base64 inlineData → Gemini reads
 *   them visually. Used ONLY for pages that genuinely have no usable text layer.
 *
 * A page is "native" when its extracted text has ≥ NATIVE_TEXT_MIN_CHARS
 * non-whitespace chars; otherwise it takes the OCR path. A batch may be mixed:
 * native pages go through ONE text call, each sparse page through a single-page
 * image call — kept correct, not clever.
 *
 * DOCX: mammoth extractRawText → same text prompt (whole doc = page 1).
 * XLSX: deterministic SheetJS path (no LLM for cells) — one sheet = one page,
 *   rows persisted verbatim as tables; only summary_en uses the LLM (capped).
 * PNG/JPEG: one scanned page — the whole image as inlineData through the SAME
 *   Gemini vision ANALYZE prompt/schema (is_scanned=true).
 *
 *   POST { documentId, pageFrom, pageTo }   (service-role bearer only)
 *   → 200 { ok: true, pagesDone, advanced }
 *
 * NO DROPPED PAGES: dense bilingual pages can still overrun the model's output
 * budget and get omitted from a batch's JSON. Before a missing page is marked
 * missing_page it is RETRIED as a single-page analyze (native→text, sparse→
 * image), and a whole-batch parse failure falls back to per-page single calls.
 * Persistence of one page is factored into persistPage() so the main loop and
 * every retry path share it (and never double-insert). extraction_source is
 * 'native_pdf' for text-layer-derived blocks, 'llm_ocr' for image/scanned,
 * 'docx' for DOCX, 'xlsx' for spreadsheets.
 *
 * On the last batch to finish, the single CAS winner advances the document
 * (extracting → chunking) and fans out docintel-embed. Any LLM failure marks
 * the batch's pages failed and the document failed — never left in 'extracting'.
 */
import {
  advanceStatus,
  corsHeaders,
  getServiceClient,
  json,
  markDocumentFailed,
  requireServiceRole,
  stampLatency,
} from "../_shared/docintel.ts";
import { generateText, logUsage, type LlmMessage, type LlmResult } from "../_shared/llm.ts";
import { runEmbedStage } from "../_shared/embed_stage.ts";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";
import mammoth from "https://esm.sh/mammoth@1.6.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PDF_MIME = "application/pdf";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const IMAGE_MIMES = new Set(["image/png", "image/jpeg"]);
const LOW_CONFIDENCE = 0.6;

// ── XLSX native path tuning ─────────────────────────────────────────────────
// Cell extraction is deterministic (SheetJS — no LLM, confidence 1.0). The only
// LLM work per sheet is a compact summary_en: at most this many sheets per
// analyze invocation get an LLM summary (Arabic sheets → the existing
// TRANSLATE+LABEL agent over the flattened sample; others → one generateText).
// Sheets beyond the cap keep summary_en=null (zero-assumption, never invented).
const XLSX_SUMMARY_MAX_SHEETS = 5;
// Cap on the flattened header+rows sample sent to the summary/translate call.
const XLSX_SUMMARY_INPUT_CHARS = 1_500;
// Arabic-detection heuristic (same Unicode block used by ai-improve-story).
const ARABIC_RE = /[؀-ۿ]/;

// A PDF page counts as "native text" when its extracted text layer has at least
// this many non-whitespace chars — below it we treat the page as scanned/sparse
// and fall back to the multimodal image (OCR) path.
const NATIVE_TEXT_MIN_CHARS = 40;

// gemini-2.5-flash supports up to 65k output tokens. 24000 gives ample headroom.
// The IMAGE/OCR path re-emits Arabic + English so it keeps this large ceiling.
const MAX_OUTPUT_TOKENS = 24_000;
const ANALYZE_TIMEOUT_MS = 55_000;

// ── Segment-and-translate (NATIVE path) tuning ──────────────────────────────
// The native path NEVER asks the model to re-emit the Arabic — we already have
// it verbatim from unpdf. The model returns only { page, index, kind, text_en,
// confidence } per numbered segment, so its OUTPUT is ~half. That removes the
// output-token bottleneck that was timing out 6-page native batches.
//
// TRANSLATE_MAX_SEGMENTS: the most segments sent in ONE translate call. A batch
// with more segments than this is split into ≤ this many per sub-call, run
// through a bounded pool (see MAX_CONCURRENT_TRANSLATE) and merged. MEASURED
// (real 24-page dense Arabic BRD): a ~60-segment call takes ~53s and times out.
// Keeping this SMALL (≈2-3 pages of segments) is the key latency lever — it fans
// each 8-page batch into several fast ~12-15s calls, not one huge one.
const TRANSLATE_MAX_SEGMENTS = 16;
// Bound how many translate sub-calls are in flight at once. The old code did an
// unbounded Promise.all over every sub-batch, which fanned out dozens of small
// concurrent Gemini calls and TRIGGERED the 503 "high demand" / 429 rate limits.
// A pool of 5 keeps steady pressure below Gemini's per-key ceiling while still
// running sub-calls in parallel — the resilience-under-bulk lever.
const MAX_CONCURRENT_TRANSLATE = 5;
// Output is small (EN + labels only) so calls finish well under this. Small
// sub-calls (≤16 segments) generate little output and never approach the timeout.
const TRANSLATE_MAX_OUTPUT_TOKENS = 24_000;
const TRANSLATE_TIMEOUT_MS = 50_000;
// A single native page's text is capped at this many chars before segmentation
// so a pathological page cannot balloon one sub-call. Text beyond this is kept
// as a final overflow segment (never dropped).
const MAX_PAGE_TEXT_CHARS = 60_000;
// Cap one segment's length so a giant unbroken block stays inside a JSON item.
const MAX_SEGMENT_CHARS = 8_000;

// ─────────────────────────────────────────────────────────────────────
// Strict responseSchema (Gemini native responseSchema; schema-in-prompt for
// the other providers). Every page in the range must be returned.
// ─────────────────────────────────────────────────────────────────────
const ANALYZE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    pages: {
      type: "array",
      items: {
        type: "object",
        properties: {
          page_number: { type: "integer" },
          is_scanned: { type: "boolean" },
          detected_language: { type: "string", enum: ["ar", "en", "mixed"] },
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "heading", "paragraph", "list", "table",
                    "image", "caption", "footer", "header", "other",
                  ],
                },
                order: { type: "integer" },
                text_ar: { type: "string" },
                text_en: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["kind", "order", "text_ar", "text_en", "confidence"],
            },
          },
          tables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                caption_en: { type: "string" },
                header_row: { type: "array", items: { type: "string" } },
                rows: {
                  type: "array",
                  items: { type: "array", items: { type: "string" } },
                },
                summary_ar: { type: "string" },
                summary_en: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["header_row", "rows", "summary_en", "confidence"],
            },
          },
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["diagram", "chart", "screenshot", "photo", "logo", "other"],
                },
                caption_ar: { type: "string" },
                caption_en: { type: "string" },
                description_en: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["kind", "description_en", "confidence"],
            },
          },
        },
        required: ["page_number", "is_scanned", "detected_language", "blocks"],
      },
    },
  },
  required: ["pages"],
};

const SYSTEM_PROMPT = [
  "You are a document intelligence extractor for Arabic business documents.",
  "Extract EVERY page in the provided page range. Return strict JSON matching the schema.",
  "",
  "For each page return:",
  "- page_number: the ABSOLUTE page number (first supplied page = the given start number, increment by one per subsequent page).",
  "- is_scanned: true only if the page had no selectable text and you had to read it visually (OCR).",
  "- detected_language: 'ar', 'en', or 'mixed'.",
  "- blocks[]: ordered reading-order regions. Each block = { kind, order, text_ar, text_en, confidence }.",
  "    text_ar = the ORIGINAL Arabic verbatim (empty string if the block has no Arabic).",
  "    text_en = a faithful English translation preserving meaning; if the source is already English, copy it verbatim.",
  "- tables[]: { caption_en, header_row[], rows[][], summary_ar, summary_en, confidence }.",
  "- images[]: { kind, caption_ar, caption_en, description_en, confidence } for diagrams/charts/figures.",
  "",
  "RULES:",
  "- Preserve Arabic EXACTLY. Do NOT transliterate. Keep technical terms and product names in Latin script even inside Arabic text.",
  "- Set confidence < 0.6 when uncertain.",
  "- NEVER invent content. If a region is unreadable, emit a block/image with low confidence describing what you can see — do not fabricate text.",
  "- confidence is a 0..1 number.",
].join("\n");

// ── TRANSLATE+LABEL agent (NATIVE path) ─────────────────────────────────────
// The segments' Arabic is ALREADY known (from unpdf). This agent is given the
// numbered Arabic segments and returns ONLY the English translation + layout
// kind per (page,index). It must NOT return the Arabic — that halves the output
// and removes the timeout. Strict responseSchema below.
const TRANSLATE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          page: { type: "integer" },
          index: { type: "integer" },
          kind: {
            type: "string",
            enum: [
              "heading", "paragraph", "list", "table",
              "caption", "footer", "header", "other",
            ],
          },
          text_en: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["page", "index", "kind", "text_en", "confidence"],
      },
    },
  },
  required: ["items"],
};

const TRANSLATE_SYSTEM_PROMPT = [
  "You are a document intelligence translator for Arabic business documents.",
  "You are given numbered Arabic text SEGMENTS already extracted from a document,",
  "each labelled 'PAGE {p} SEGMENT {i}: {arabic}'. For EACH input segment return",
  "its layout kind and a faithful English translation (text_en).",
  "Return strict JSON matching the schema: { items: [ { page, index, kind, text_en, confidence } ] }.",
  "",
  "RULES:",
  "- Do NOT return the Arabic. Return English (text_en) only.",
  "- Return EXACTLY ONE item per input segment, carrying back the SAME (page, index) it was given.",
  "- Do NOT add, drop, merge, reorder, or split segments — the (page,index) identity is fixed.",
  "- text_en = a faithful English translation preserving meaning; if the source is already English, copy it.",
  "- Keep technical terms, product names, and acronyms in Latin script.",
  "- kind = the segment's layout role (heading/paragraph/list/table/caption/footer/header/other).",
  "  If a segment is part of a table, label kind='table'.",
  "- confidence is a 0..1 number; set it < 0.6 only when the translation is genuinely uncertain.",
  "- NEVER invent content. Translate only what the segment contains.",
].join("\n");

// ─────────────────────────────────────────────────────────────────────
// Narrow shapes for the parsed result (post-validation).
// ─────────────────────────────────────────────────────────────────────
type AnalyzedBlock = {
  kind: string;
  order: number;
  text_ar: string;
  text_en: string;
  confidence: number;
};
type AnalyzedTable = {
  caption_en?: string;
  header_row: string[];
  rows: string[][];
  summary_ar?: string;
  summary_en: string;
  confidence: number;
};
type AnalyzedImage = {
  kind: string;
  caption_ar?: string;
  caption_en?: string;
  description_en: string;
  confidence: number;
};
type AnalyzedPage = {
  page_number: number;
  is_scanned: boolean;
  detected_language: string;
  blocks: AnalyzedBlock[];
  tables?: AnalyzedTable[];
  images?: AnalyzedImage[];
};

// A deterministically-derived native segment: the SOURCE-OF-TRUTH Arabic for one
// reading-order region of a page. text_ar is NEVER sent back from the LLM.
type Segment = {
  page: number; // ABSOLUTE 1-based page number
  index: number; // 1-based order within the page
  text_ar: string;
};

// One TRANSLATE+LABEL agent result, matched to a Segment on (page,index).
type TranslateItem = {
  page: number;
  index: number;
  kind: string;
  text_en: string;
  confidence: number;
};

const SEGMENT_KINDS = new Set([
  "heading", "paragraph", "list", "table",
  "caption", "footer", "header", "other",
]);

/** Clamp/validate a confidence into [0,1]; defaults to 0 when absent/NaN. */
function conf(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Minimum confidence across a page's blocks/tables/images (the page ocr_confidence). */
function pageMinConfidence(p: AnalyzedPage): number | null {
  const vals: number[] = [];
  for (const b of p.blocks ?? []) vals.push(conf(b.confidence));
  for (const t of p.tables ?? []) vals.push(conf(t.confidence));
  for (const im of p.images ?? []) vals.push(conf(im.confidence));
  if (vals.length === 0) return null;
  return Math.min(...vals);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!requireServiceRole(req)) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  const admin = getServiceClient();
  const body = await req.json().catch(() => null) as
    | { documentId?: string; pageFrom?: number; pageTo?: number }
    | null;
  const documentId = body?.documentId;
  const pageFrom = body?.pageFrom;
  const pageTo = body?.pageTo;
  if (
    !documentId ||
    typeof pageFrom !== "number" ||
    typeof pageTo !== "number" ||
    pageFrom < 1 ||
    pageTo < pageFrom
  ) {
    return json({ error: "documentId, pageFrom, pageTo (1-based range) are required" }, 400);
  }

  const t0 = Date.now();
  let projectId: string | null = null;

  // The set of page numbers this batch owns.
  const rangeNumbers = Array.from(
    { length: pageTo - pageFrom + 1 },
    (_, i) => pageFrom + i,
  );

  try {
    // 1) Load the document row.
    const { data: doc, error: docErr } = await admin
      .from("ai_documents")
      .select("id, storage_path, mime_type, project_id, created_at")
      .eq("id", documentId)
      .maybeSingle();
    if (docErr || !doc) {
      return json({ error: `document not found: ${docErr?.message ?? "missing"}` }, 404);
    }
    projectId = (doc.project_id as string) ?? null;
    const mimeType = (doc.mime_type as string) ?? "";
    const storagePath = doc.storage_path as string;
    const isPdf = mimeType === PDF_MIME;
    const isDocx = !isPdf &&
      (mimeType.includes("word") || (storagePath?.toLowerCase().endsWith(".docx") ?? false));
    const isXlsx = !isPdf && !isDocx &&
      (mimeType === XLSX_MIME || (storagePath?.toLowerCase().endsWith(".xlsx") ?? false));
    const isImage = IMAGE_MIMES.has(mimeType);

    // 2) Load the page rows for this range (need their ids to persist against).
    const { data: pageRows, error: pgErr } = await admin
      .from("ai_document_pages")
      .select("id, page_number")
      .eq("document_id", documentId)
      .gte("page_number", pageFrom)
      .lte("page_number", pageTo);
    if (pgErr) throw new Error(`page load failed: ${pgErr.message}`);
    const pageIdByNumber = new Map<number, string>();
    for (const r of pageRows ?? []) {
      pageIdByNumber.set(r.page_number as number, r.id as string);
    }
    if (pageIdByNumber.size === 0) {
      return json({ error: "no page rows for the requested range" }, 404);
    }

    // 3) Mark this batch's pages 'extracting'.
    await admin
      .from("ai_document_pages")
      .update({ status: "extracting", error_message: null })
      .eq("document_id", documentId)
      .gte("page_number", pageFrom)
      .lte("page_number", pageTo);

    // 4) Download the source file.
    const { data: blob, error: dlErr } = await admin.storage
      .from("docintel-documents")
      .download(storagePath);
    if (dlErr || !blob) {
      throw new Error(`download failed: ${dlErr?.message ?? "no file"}`);
    }
    const fileBytes = new Uint8Array(await blob.arrayBuffer());

    // 5) NATIVE segment source: for a PDF, pull the per-page Arabic text layer
    //    ONCE with unpdf (no vision). For DOCX, mammoth gives the whole-doc text
    //    (= page 1). nativeText.get(n) is the Arabic for page n; a PDF page with
    //    ≥ NATIVE_TEXT_MIN_CHARS non-whitespace chars takes the segment-and-
    //    translate path, anything less falls back to the image (OCR) path.
    let nativeText: Map<number, string>;
    if (isDocx) {
      nativeText = await extractDocxPageText(fileBytes);
    } else if (isPdf) {
      nativeText = await extractNativePageText(fileBytes);
    } else {
      // XLSX takes its own deterministic SheetJS path; images take the OCR
      // (inlineData) path. Neither uses a native text layer map.
      nativeText = new Map<number, string>();
    }

    // Analyze context shared by the image OCR calls + retries. buildUserParts()
    // routes by mode: 'text' sends the supplied native text (legacy single-page
    // native retry), 'image' slices a sub-PDF → inlineData.
    const ctx: AnalyzeCtx = { admin, documentId, isPdf, isDocx, isXlsx, isImage, mimeType, fileBytes, nativeText };

    // Route each owned page: native (has usable text layer) vs sparse (needs
    // OCR). DOCX is handled entirely by the native segment-and-translate path
    // below (page 1), so it never enters the sparse (image) loop. XLSX is
    // handled entirely by the deterministic SheetJS path (6a-bis) — neither
    // loop. A standalone image (PNG/JPEG) is one sparse page (whole-image OCR).
    const nativePages = isXlsx ? [] : isDocx
      ? rangeNumbers.filter((n) => nativeText.has(n))
      : rangeNumbers.filter((n) => hasNativeText(nativeText, n));
    const sparsePages = (isDocx || isXlsx)
      ? []
      : rangeNumbers.filter((n) => !hasNativeText(nativeText, n));

    const provider0 = { provider: "" as string, model: "" as string };
    const pages: AnalyzedPage[] = [];
    let batchInputTokens: number | null = null;
    let batchOutputTokens: number | null = null;
    let batchDurationMs = 0;

    // 6a) NATIVE PATH — SEGMENT-AND-TRANSLATE. Deterministically segment each
    //     native page's Arabic (source of truth), then translate+label the
    //     segments with the LLM (English + kind only — Arabic never re-emitted),
    //     and JOIN on (page,index) into ready-to-persist AnalyzedPage blocks.
    if (nativePages.length > 0) {
      const nat = await analyzeNativePages(
        admin,
        projectId,
        documentId,
        nativeText,
        nativePages,
      );
      provider0.provider = nat.provider;
      provider0.model = nat.model;
      batchInputTokens = nat.inputTokens;
      batchOutputTokens = nat.outputTokens;
      batchDurationMs += nat.durationMs;
      for (const p of nat.pages) pages.push(p);
    }

    // 6a-bis) XLSX NATIVE PATH — deterministic SheetJS cell extraction (no LLM
    //     for cells, confidence 1.0). One AnalyzedPage per sheet: sheet-name
    //     heading block + compact dimensions summary block + the rows persisted
    //     verbatim as a structured table (header = first non-empty row).
    //     summary_en is the only LLM work (≤ XLSX_SUMMARY_MAX_SHEETS sheets).
    if (isXlsx && rangeNumbers.length > 0) {
      const x = await analyzeXlsxPages(fileBytes, rangeNumbers);
      if (x.provider) {
        provider0.provider = x.provider;
        provider0.model = x.model;
      }
      batchInputTokens = x.inputTokens;
      batchOutputTokens = x.outputTokens;
      batchDurationMs += x.durationMs;
      for (const p of x.pages) pages.push(p);
    }

    // 6b) OCR PATH — one single-page IMAGE call per sparse page. These pages have
    //     no usable text layer, so vision is required. Kept per-page (not
    //     batched) to bound each vision call's output and dodge truncation.
    for (const n of sparsePages) {
      try {
        const result = await analyzePages(ctx, [n], n, n, "image");
        if (!provider0.provider) {
          provider0.provider = result.provider;
          provider0.model = result.model;
        }
        batchDurationMs += result.durationMs;
        if (result.parsed !== undefined) {
          const rp = (result.parsed as { pages?: AnalyzedPage[] }).pages;
          if (Array.isArray(rp)) {
            const rec = rp.find((p) => p.page_number === n) ?? rp[0];
            if (rec) pages.push({ ...rec, page_number: n });
          }
        }
      } catch (_e) {
        // sparse page's image call failed → single-page retry loop handles it.
      }
    }

    // Fallback provider/model if NOTHING succeeded above (all calls failed).
    const provider = provider0.provider || "gemini";
    const model = provider0.model || "gemini-2.5-flash";

    // A page's mode is a fact of how it was routed (native text vs image OCR),
    // not the model's self-report — used to stamp extraction_source correctly.
    const modeFor = (n: number): AnalyzeMode =>
      isDocx || isXlsx || hasNativeText(nativeText, n) ? "text" : "image";

    // 7) Persist per returned page. Only persist pages we own (in this range).
    //    persistPage() owns ALL per-page DB work (page row + blocks + tables +
    //    images + issues); the single-page retry below reuses the same helper.
    const persistedNumbers = new Set<number>();
    let pagesDone = 0;
    for (const p of pages) {
      const absNumber = typeof p.page_number === "number" ? p.page_number : NaN;
      const pageId = pageIdByNumber.get(absNumber);
      if (!pageId) continue; // page not in this batch's range — skip defensively.
      if (persistedNumbers.has(absNumber)) continue; // dup page in the JSON — persist once.
      await persistPage(ctx, p, pageId, absNumber, provider, model, modeFor(absNumber));
      persistedNumbers.add(absNumber);
      pagesDone++;
    }

    // 7d) Any owned page not yet persisted → RETRY it as a single-page analyze
    //     before giving up. Cap: 1 retry/page. In practice only SPARSE (image)
    //     pages reach here: native PDF + DOCX pages are always covered by the
    //     segment-and-translate join above (every segment persisted, even
    //     untranslated), so they are already in persistedNumbers. Only if the
    //     single-page image retry ALSO fails is a page marked missing_page
    //     (zero-assumption: no fabricated content, never left stuck 'extracting').
    for (const n of rangeNumbers) {
      if (persistedNumbers.has(n)) continue;
      const pageId = pageIdByNumber.get(n);
      if (!pageId) continue;

      let recovered: AnalyzedPage | null = null;
      try {
        // Only sparse pages arrive here → image retry. modeFor() yields 'image'.
        const retry = await analyzePages(ctx, [n], n, n, modeFor(n));
        if (retry.parsed !== undefined) {
          const rp = (retry.parsed as { pages?: AnalyzedPage[] }).pages;
          if (Array.isArray(rp)) {
            recovered = rp.find((p) => p.page_number === n) ?? rp[0] ?? null;
            // Trust the single-page call's own page_number as absolute n.
            if (recovered) recovered = { ...recovered, page_number: n };
          }
        }
      } catch (_e) {
        recovered = null; // single-page retry failed outright → fall through to missing_page.
      }

      if (recovered) {
        await persistPage(ctx, recovered, pageId, n, provider, model, modeFor(n));
        persistedNumbers.add(n);
        pagesDone++;
      } else {
        await admin
          .from("ai_document_pages")
          .update({ status: "extracted", ocr_confidence: null, error_message: "page not returned by extractor" })
          .eq("id", pageId);
        await admin.from("ai_extraction_issues").insert({
          document_id: documentId,
          page_id: pageId,
          kind: "missing_page",
          severity: "warning",
          detail: `extractor did not return page ${n} (single-page retry also failed)`,
        });
      }
    }

    // 8) Record ONE agent run for the batch (ok). Tokens are from the native
    //    text call (the dominant call); duration is the sum of all calls made.
    await admin.from("ai_agent_runs").insert({
      project_id: projectId,
      document_id: documentId,
      agent: "analyze",
      provider,
      model,
      input_tokens: batchInputTokens,
      output_tokens: batchOutputTokens,
      duration_ms: batchDurationMs,
      status: "ok",
    });
    await logUsage(admin, {
      source: "docintel-analyze",
      action: "analyze",
      status: "ok",
      payload: { documentId, pageFrom, pageTo, provider, model, pagesDone },
    });

    // 9) Chain gate — mirror docintel-extract. Count pages not yet in a terminal
    //    state; when 0 remain, the single CAS winner advances the document and
    //    fans out docintel-embed.
    const advanced = await chainToEmbed(admin, documentId);

    return json({ ok: true, pagesDone, advanced });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Never leave this batch's pages stuck 'extracting'.
    await admin
      .from("ai_document_pages")
      .update({ status: "failed", error_message: msg })
      .eq("document_id", documentId)
      .gte("page_number", pageFrom)
      .lte("page_number", pageTo);
    await admin.from("ai_agent_runs").insert({
      project_id: projectId,
      document_id: documentId,
      agent: "analyze",
      provider: null,
      model: null,
      duration_ms: Date.now() - t0,
      status: "error",
      error_message: msg,
    }).then(() => {}, () => {});
    await markDocumentFailed(
      admin,
      documentId,
      `Analysis failed on pages ${pageFrom}-${pageTo}: ${msg}`,
    );
    await logUsage(admin, {
      source: "docintel-analyze",
      action: "analyze",
      status: "error",
      error: msg,
      payload: { documentId, pageFrom, pageTo },
    });
    return json({ error: msg }, 500);
  }
});

/**
 * When every page has reached a terminal state (extracted/described/failed),
 * the single CAS winner (extracting → chunking) stamps latency and fans out
 * docintel-embed. Non-winners return false and must not double-fire.
 */
async function chainToEmbed(
  admin: SupabaseClient,
  documentId: string,
): Promise<boolean> {
  const { count: remaining } = await admin
    .from("ai_document_pages")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .not("status", "in", "(extracted,described,failed)");

  if ((remaining ?? 0) > 0) return false;

  const won = await advanceStatus(admin, documentId, "extracting", "chunking", "Chunking & embedding");
  if (!won) return false;

  // Winner: stamp analyze latency = wall-clock since the document was created
  // (the meaningful end-to-end analyze duration, not this single batch's slice).
  const { data: doc } = await admin
    .from("ai_documents")
    .select("created_at")
    .eq("id", documentId)
    .maybeSingle();
  if (doc?.created_at) {
    const analyzeMs = Date.now() - new Date(doc.created_at as string).getTime();
    await stampLatency(admin, documentId, "analyze", analyzeMs);
  }

  // Run the embed stage IN-PROCESS in the background (no separate function call
  // — keeps under the edge-function cap and removes a round trip from the ≤60s
  // path). If it throws, mark the document failed rather than leaving it stuck.
  const embedTask = runEmbedStage(admin, documentId).catch(async (e) => {
    const msg = e instanceof Error ? e.message : String(e);
    await markDocumentFailed(admin, documentId, `Chunking/embedding failed: ${msg}`);
  });
  // @ts-ignore EdgeRuntime is available in the Supabase Edge runtime.
  EdgeRuntime.waitUntil(embedTask);
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Native-text extraction (unpdf) + routing helpers.
// ─────────────────────────────────────────────────────────────────────

/** How a subset of pages is analyzed: 'text' = supply native text, no image;
 *  'image' = multimodal sub-PDF (OCR). */
type AnalyzeMode = "text" | "image";

/** Non-whitespace char count of a string (native-text threshold check). */
function nonWsLen(s: string | undefined): number {
  return s ? s.replace(/\s+/g, "").length : 0;
}

/** True when page n's native text layer is dense enough to skip vision OCR. */
function hasNativeText(map: Map<number, string>, n: number): boolean {
  return nonWsLen(map.get(n)) >= NATIVE_TEXT_MIN_CHARS;
}

/**
 * NATIVE-TEXT AGENT extractor. Loads the PDF ONCE with unpdf and pulls the
 * per-page text layer (extractText(pdf, { mergePages: false }) → text[i] is
 * page i's text). Returns a Map of ABSOLUTE 1-based page number → text. On any
 * failure returns an empty map so every page falls back to the image path
 * (never blocks extraction).
 */
async function extractNativePageText(fileBytes: Uint8Array): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const pdf = await getDocumentProxy(fileBytes);
    const { text } = await extractText(pdf, { mergePages: false });
    // text is a per-page array; text[i] ⇔ physical page i+1 (absolute number).
    text.forEach((t, i) => map.set(i + 1, typeof t === "string" ? t : ""));
  } catch (_e) {
    // Corrupt/encrypted text layer → empty map → all pages take the OCR path.
    return new Map<number, string>();
  }
  return map;
}

/**
 * DOCX native text: mammoth extractRawText → whole doc = page 1. Returns a
 * single-entry Map { 1 → text }. On failure returns an empty map so the doc
 * fails cleanly upstream rather than getting stuck.
 */
async function extractDocxPageText(fileBytes: Uint8Array): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const { value: rawText } = await mammoth.extractRawText({
      arrayBuffer: fileBytes.buffer.slice(
        fileBytes.byteOffset,
        fileBytes.byteOffset + fileBytes.byteLength,
      ),
    });
    map.set(1, rawText ?? "");
  } catch (_e) {
    return new Map<number, string>();
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────
// SEGMENT AGENT (deterministic, no LLM). Splits a page's native Arabic into
// ordered SOURCE-OF-TRUTH segments. This Arabic is NEVER sent back by the LLM.
// ─────────────────────────────────────────────────────────────────────

/**
 * Split one page's native text into ordered segments.
 *
 * Rules:
 *  - Split on blank lines FIRST (paragraph boundaries), then on remaining
 *    single newlines, into candidate segments.
 *  - Trim each candidate; collapse runs of intra-line whitespace to a single
 *    space (Arabic characters are preserved — we only touch ASCII whitespace).
 *  - Drop empties.
 *  - Cap the whole page's text at MAX_PAGE_TEXT_CHARS (excess kept as a final
 *    overflow segment — never lost). Cap each segment at MAX_SEGMENT_CHARS.
 *  - index is 1-based within the page.
 */
function segmentPageText(page: number, raw: string): Segment[] {
  if (!raw) return [];
  // Normalise newlines; keep Arabic intact. Cap total length (overflow appended).
  const normalised = raw.replace(/\r\n?/g, "\n");
  const capped = normalised.length > MAX_PAGE_TEXT_CHARS
    ? normalised.slice(0, MAX_PAGE_TEXT_CHARS)
    : normalised;
  const overflow = normalised.length > MAX_PAGE_TEXT_CHARS
    ? normalised.slice(MAX_PAGE_TEXT_CHARS)
    : "";

  // Blank-line-delimited paragraphs, then remaining single newlines.
  const paras = capped.split(/\n{2,}/);
  const candidates: string[] = [];
  for (const para of paras) {
    for (const line of para.split(/\n/)) {
      candidates.push(line);
    }
  }
  if (overflow) candidates.push(overflow);

  const segments: Segment[] = [];
  let idx = 1;
  for (const c of candidates) {
    // Collapse only whitespace; do NOT alter Arabic letters/diacritics.
    const cleaned = c.replace(/[ \t\f\v]+/g, " ").trim();
    if (!cleaned) continue;
    // Hard cap a single segment (rare) — split into ≤MAX_SEGMENT_CHARS chunks.
    if (cleaned.length <= MAX_SEGMENT_CHARS) {
      segments.push({ page, index: idx++, text_ar: cleaned });
    } else {
      for (let i = 0; i < cleaned.length; i += MAX_SEGMENT_CHARS) {
        segments.push({ page, index: idx++, text_ar: cleaned.slice(i, i + MAX_SEGMENT_CHARS) });
      }
    }
  }
  return segments;
}

// ─────────────────────────────────────────────────────────────────────
// TRANSLATE+LABEL AGENT (LLM). Given numbered Arabic segments returns ONLY
// { page, index, kind, text_en, confidence } per segment. Never re-emits Arabic.
// ─────────────────────────────────────────────────────────────────────

/** Build the numbered-segment user text for a translate sub-call. */
function buildTranslateUserText(segments: Segment[]): string {
  const lines: string[] = [
    `Below are ${segments.length} Arabic text segments. Return exactly one item ` +
    `per segment, carrying back the SAME (page, index).`,
    "",
  ];
  for (const s of segments) {
    lines.push(`PAGE ${s.page} SEGMENT ${s.index}: ${s.text_ar}`);
  }
  return lines.join("\n");
}

/** One strict-JSON translate call over a segment sub-batch (≤ TRANSLATE_MAX_SEGMENTS). */
async function translateSegments(segments: Segment[]): Promise<LlmResult> {
  const messages: LlmMessage[] = [
    { role: "system", parts: [{ text: TRANSLATE_SYSTEM_PROMPT }] },
    { role: "user", parts: [{ text: buildTranslateUserText(segments) }] },
  ];
  return await generateText({
    messages,
    temperature: 0.2,
    maxOutputTokens: TRANSLATE_MAX_OUTPUT_TOKENS,
    timeoutMs: TRANSLATE_TIMEOUT_MS,
    jsonSchema: TRANSLATE_SCHEMA,
  });
}

/** Parse a translate LlmResult into (page,index)-keyed TranslateItems. */
function itemsFromResult(result: LlmResult): Map<string, TranslateItem> {
  const out = new Map<string, TranslateItem>();
  if (result.parsed === undefined) return out;
  const raw = (result.parsed as { items?: unknown[] }).items;
  if (!Array.isArray(raw)) return out;
  for (const it of raw) {
    const o = it as Record<string, unknown>;
    const page = typeof o.page === "number" ? o.page : Number(o.page);
    const index = typeof o.index === "number" ? o.index : Number(o.index);
    if (!Number.isInteger(page) || !Number.isInteger(index)) continue;
    const kind = typeof o.kind === "string" && SEGMENT_KINDS.has(o.kind) ? o.kind : "paragraph";
    const text_en = typeof o.text_en === "string" ? o.text_en : "";
    out.set(`${page}:${index}`, { page, index, kind, text_en, confidence: conf(o.confidence) });
  }
  return out;
}

const segKey = (page: number, index: number) => `${page}:${index}`;

/**
 * Run tasks[] through a bounded pool: at most `limit` invocations in flight at
 * once. Each entry is a thunk (deferred call) so nothing starts until a worker
 * picks it up. Results are returned in the SAME order as tasks[] (each worker
 * writes into its claimed slot), though completion order is irrelevant here —
 * the caller merges by (page,index). ~15 lines, no deps.
 */
async function runPool<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  };
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Translate ALL of a batch's segments. Splits into ≤ TRANSLATE_MAX_SEGMENTS
 * sub-calls run through a BOUNDED pool of MAX_CONCURRENT_TRANSLATE in-flight
 * calls (never unbounded — that triggered Gemini 503/429), then merges every
 * sub-call's items by (page,index). Any (page,index) still missing after the
 * first pass is RETRIED once (also pool-bounded). durationMs is the true
 * wall-clock of the whole translate phase (Date.now() around it), not a sum of
 * per-wave maxes — accurate regardless of how the pool interleaves calls.
 */
async function translateAllSegments(segments: Segment[]): Promise<{
  items: Map<string, TranslateItem>;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}> {
  const started = Date.now();
  const items = new Map<string, TranslateItem>();
  let provider = "";
  let model = "";
  let inputTokens = 0;
  let outputTokens = 0;

  const mergeResults = (results: LlmResult[]): void => {
    for (const r of results) {
      if (!provider) { provider = r.provider; model = r.model; }
      inputTokens += r.inputTokens ?? 0;
      outputTokens += r.outputTokens ?? 0;
      for (const [k, v] of itemsFromResult(r)) if (!items.has(k)) items.set(k, v);
    }
  };

  // Split into fixed-size sub-batches, preserving (page,index) identity + order.
  const subBatches: Segment[][] = [];
  for (let i = 0; i < segments.length; i += TRANSLATE_MAX_SEGMENTS) {
    subBatches.push(segments.slice(i, i + TRANSLATE_MAX_SEGMENTS));
  }

  // First pass — ≤ MAX_CONCURRENT_TRANSLATE sub-calls in flight at a time.
  const results = await runPool(
    subBatches.map((sb) => () => translateSegments(sb)),
    MAX_CONCURRENT_TRANSLATE,
  );
  mergeResults(results);

  // Retry ONLY the (page,index) segments that got no item back (truncation /
  // dropped item). One follow-up pass over the missing set, split again and run
  // through the SAME bounded pool. Never re-translate what we already have.
  const missing = segments.filter((s) => !items.has(segKey(s.page, s.index)));
  if (missing.length > 0) {
    const retryBatches: Segment[][] = [];
    for (let i = 0; i < missing.length; i += TRANSLATE_MAX_SEGMENTS) {
      retryBatches.push(missing.slice(i, i + TRANSLATE_MAX_SEGMENTS));
    }
    const retryResults = await runPool(
      retryBatches.map((rb) => () => translateSegments(rb)),
      MAX_CONCURRENT_TRANSLATE,
    );
    mergeResults(retryResults);
  }

  return {
    items,
    provider: provider || "gemini",
    model: model || "gemini-2.5-flash",
    inputTokens: inputTokens || null,
    outputTokens: outputTokens || null,
    durationMs: Date.now() - started,
  };
}

/**
 * NATIVE PATH orchestrator. For the given native page numbers:
 *   1. Deterministically segment each page's Arabic (source of truth).
 *   2. Translate+label ALL segments (LLM, English + kind only — no Arabic back).
 *   3. JOIN segments (text_ar) with items (text_en, kind) on (page,index) into
 *      one AnalyzedPage per native page, ready for the shared persist loop.
 * A segment with NO matching item is kept with text_ar + text_en=null and a
 * low confidence (Arabic is NEVER dropped). Records ONE ai_agent_runs 'ok' row.
 */
async function analyzeNativePages(
  admin: SupabaseClient,
  projectId: string | null,
  documentId: string,
  nativeText: Map<number, string>,
  nativePages: number[],
): Promise<{
  pages: AnalyzedPage[];
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}> {
  // 1) Segment every native page (deterministic).
  const segsByPage = new Map<number, Segment[]>();
  const allSegments: Segment[] = [];
  for (const n of nativePages) {
    const segs = segmentPageText(n, nativeText.get(n) ?? "");
    segsByPage.set(n, segs);
    for (const s of segs) allSegments.push(s);
  }

  // 2) Translate+label (concurrent sub-calls + missing-item retry).
  const t = await translateAllSegments(allSegments);

  // 3) JOIN into AnalyzedPage per page. Every native page yields a page object
  //    so the caller's persist loop covers it (even a zero-segment page).
  const pages: AnalyzedPage[] = [];
  for (const n of nativePages) {
    const segs = segsByPage.get(n) ?? [];
    const blocks: AnalyzedBlock[] = segs.map((s) => {
      const item = t.items.get(segKey(s.page, s.index));
      if (item) {
        return {
          kind: item.kind,
          order: s.index,
          text_ar: s.text_ar,
          text_en: item.text_en,
          confidence: item.confidence,
        };
      }
      // No matching item → keep Arabic, no translation, low confidence.
      return {
        kind: "paragraph",
        order: s.index,
        text_ar: s.text_ar,
        text_en: "",
        confidence: 0,
      };
    });
    pages.push({
      page_number: n,
      is_scanned: false,
      detected_language: "ar",
      blocks,
    });
  }

  // ONE agent run row for the native translate work of this batch.
  await admin.from("ai_agent_runs").insert({
    project_id: projectId,
    document_id: documentId,
    agent: "analyze",
    intent: "translate_segments",
    provider: t.provider,
    model: t.model,
    input_tokens: t.inputTokens,
    output_tokens: t.outputTokens,
    duration_ms: t.durationMs,
    status: "ok",
  }).then(() => {}, () => {});

  return {
    pages,
    provider: t.provider,
    model: t.model,
    inputTokens: t.inputTokens,
    outputTokens: t.outputTokens,
    durationMs: t.durationMs,
  };
}

// ─────────────────────────────────────────────────────────────────────
// XLSX NATIVE PATH — deterministic SheetJS cell extraction (no LLM for cells).
// One sheet = one page. Persisted through the SAME persistPage/table shape as
// the OCR path (ai_document_tables header_rows/rows + a back-linked table
// block). Confidence 1.0 for native cell extraction.
// ─────────────────────────────────────────────────────────────────────

/** True when a string contains any Arabic-block character. */
function containsArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}

/** Flatten sheet name + header + rows into a compact sample capped at `limit`. */
function flattenSheetSample(
  name: string,
  headerRow: string[],
  rows: string[][],
  limit: number,
): string {
  const lines: string[] = [`Sheet "${name}"`];
  if (headerRow.length > 0) lines.push(headerRow.join(" | "));
  let length = lines.join("\n").length;
  for (const r of rows) {
    const line = r.join(" | ");
    if (length + line.length + 1 > limit) break;
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join("\n").slice(0, limit);
}

/**
 * Analyze the given sheet numbers (1-based; sheet n = SheetNames[n-1]) of an
 * XLSX workbook into AnalyzedPages, ready for the shared persist loop:
 *   - heading block: the sheet name (text_ar when the name is Arabic).
 *   - paragraph block: compact deterministic summary (sheet name + dimensions).
 *   - ONE table: header_row = first non-empty row (heuristic), rows = the
 *     remaining non-empty rows VERBATIM. Confidence 1.0 (native extraction).
 * summary_en is the only LLM work, capped at XLSX_SUMMARY_MAX_SHEETS sheets per
 * invocation: an Arabic-containing sheet reuses the existing TRANSLATE+LABEL
 * agent over the flattened sample; otherwise one compact generateText call.
 * Beyond the cap (or on LLM failure) summary_en stays null — never invented.
 */
async function analyzeXlsxPages(
  fileBytes: Uint8Array,
  sheetNumbers: number[],
): Promise<{
  pages: AnalyzedPage[];
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}> {
  const started = Date.now();
  const wb = XLSX.read(fileBytes, { type: "array" });

  let provider = "";
  let model = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let llmSummaries = 0;

  const pages: AnalyzedPage[] = [];
  for (const n of sheetNumbers) {
    const name = wb.SheetNames[n - 1];
    if (name === undefined) continue; // outside the workbook — nothing to persist.
    const ws = wb.Sheets[name];
    // raw:false → formatted cell text (what the user sees); defval "" keeps the
    // grid rectangular enough to index. Cells are persisted VERBATIM; .trim()
    // is used only for emptiness checks.
    const grid = (XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      defval: "",
    }) as unknown[][]).map((r) =>
      Array.isArray(r) ? r.map((c) => String(c ?? "")) : []
    );
    const rowHasContent = (r: string[]) => r.some((c) => c.trim() !== "");
    // Header heuristic: the FIRST non-empty row is the header.
    const firstIdx = grid.findIndex(rowHasContent);
    const headerRow = firstIdx >= 0 ? grid[firstIdx] : [];
    const dataRows = firstIdx >= 0 ? grid.slice(firstIdx + 1).filter(rowHasContent) : [];
    // reduce, not Math.max(...spread) — a huge sheet must not blow the stack.
    const colCount = dataRows.reduce((m, r) => Math.max(m, r.length), headerRow.length);
    const sheetHasArabic = containsArabic(
      [name, ...headerRow, ...dataRows.flat()].join(" "),
    );

    const blocks: AnalyzedBlock[] = [
      {
        kind: "heading",
        order: 1,
        text_ar: containsArabic(name) ? name : "",
        text_en: containsArabic(name) ? "" : name,
        confidence: 1,
      },
      {
        kind: "paragraph",
        order: 2,
        text_ar: "",
        text_en: `Sheet "${name}": ${dataRows.length} data row${
          dataRows.length === 1 ? "" : "s"
        } × ${colCount} column${colCount === 1 ? "" : "s"}.`,
        confidence: 1,
      },
    ];

    const tables: AnalyzedTable[] = [];
    if (firstIdx >= 0) {
      let summaryEn: string | null = null;
      if (llmSummaries < XLSX_SUMMARY_MAX_SHEETS) {
        llmSummaries++;
        const sample = flattenSheetSample(name, headerRow, dataRows, XLSX_SUMMARY_INPUT_CHARS);
        try {
          if (sheetHasArabic) {
            // Reuse the existing TRANSLATE+LABEL agent on the flattened sample.
            const res = await translateSegments([{ page: n, index: 1, text_ar: sample }]);
            if (!provider) {
              provider = res.provider;
              model = res.model;
            }
            inputTokens += res.inputTokens ?? 0;
            outputTokens += res.outputTokens ?? 0;
            summaryEn = itemsFromResult(res).get(segKey(n, 1))?.text_en || null;
          } else {
            const res = await generateText({
              messages: [
                {
                  role: "system",
                  parts: [{
                    text: "You summarise spreadsheet tables. Reply with 1-2 plain " +
                      "English sentences describing what the table contains. " +
                      "No preamble, no markdown.",
                  }],
                },
                { role: "user", parts: [{ text: sample }] },
              ],
              temperature: 0.2,
              maxOutputTokens: 512,
              timeoutMs: TRANSLATE_TIMEOUT_MS,
            });
            if (!provider) {
              provider = res.provider;
              model = res.model;
            }
            inputTokens += res.inputTokens ?? 0;
            outputTokens += res.outputTokens ?? 0;
            summaryEn = res.text?.trim() || null;
          }
        } catch (_e) {
          summaryEn = null; // summary is optional — never fail the batch for it.
        }
      }
      tables.push({
        header_row: headerRow,
        rows: dataRows,
        summary_en: summaryEn ?? "",
        confidence: 1,
      });
    }

    pages.push({
      page_number: n,
      is_scanned: false,
      detected_language: sheetHasArabic ? "ar" : "en",
      blocks,
      tables,
    });
  }

  return {
    pages,
    provider,
    model,
    inputTokens: inputTokens || null,
    outputTokens: outputTokens || null,
    durationMs: Date.now() - started,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Analyze payload + LLM helpers — shared by the IMAGE (OCR) calls and the
// single-page truncation-retry so every path uses the SAME schema / limits.
// The mode selects the prompt + payload: TEXT (native retry) vs IMAGE (OCR).
// ─────────────────────────────────────────────────────────────────────
type AnalyzeCtx = {
  admin: SupabaseClient;
  documentId: string;
  isPdf: boolean;
  isDocx: boolean;
  isXlsx: boolean;
  isImage: boolean;
  mimeType: string;
  fileBytes: Uint8Array;
  nativeText: Map<number, string>;
};

/**
 * Build the user parts for an arbitrary subset of ABSOLUTE page numbers.
 *   mode 'image': copies exactly those pages into a fresh sub-PDF → inlineData
 *                 (multimodal OCR path). PDF only.
 *   mode 'text' : supplies each page's native Arabic text (from ctx.nativeText)
 *                 as a labelled text block — NO image. DOCX flows here (whole
 *                 doc = page 1 via mammoth).
 */
async function buildUserParts(
  ctx: AnalyzeCtx,
  pageNumbers: number[],
  pageFrom: number,
  pageTo: number,
  mode: AnalyzeMode,
): Promise<LlmMessage["parts"]> {
  const userParts: LlmMessage["parts"] = [];

  if (ctx.isDocx) {
    // Gemini does not accept DOCX — extract raw text, treat whole doc as page 1.
    const { value: rawText } = await mammoth.extractRawText({
      arrayBuffer: ctx.fileBytes.buffer.slice(
        ctx.fileBytes.byteOffset,
        ctx.fileBytes.byteOffset + ctx.fileBytes.byteLength,
      ),
    });
    userParts.push({
      text:
        "The following is the raw text of a Word document. Treat the ENTIRE document " +
        "as page_number 1. Segment it into layout blocks and reconstruct any tables.\n\n" +
        "----- PAGE 1 TEXT -----\n" +
        (rawText ?? ""),
    });
    return userParts;
  }

  if (ctx.isImage) {
    // Standalone image (PNG/JPEG) = one scanned page. The WHOLE image goes to
    // the model as inlineData (no pdf-lib slicing) through the SAME ANALYZE
    // prompt/schema the scanned-PDF OCR path uses.
    userParts.push({
      text:
        "The following is a single scanned document image. Treat the ENTIRE " +
        "image as page_number 1 with is_scanned=true. Extract every block, " +
        "table, and figure you can read.",
    });
    userParts.push({
      inlineData: { mimeType: ctx.mimeType, data: encodeBase64(ctx.fileBytes) },
    });
    return userParts;
  }

  if (!ctx.isPdf) {
    throw new Error(`unsupported mime_type for analyze: ${ctx.mimeType || "unknown"}`);
  }

  if (mode === "text") {
    // NATIVE PATH — supply each page's text layer verbatim, no image.
    userParts.push({
      text:
        `The Arabic text of ${pageNumbers.length} PDF page(s) is provided below, ` +
        `each under its ABSOLUTE page number. Structure every page and return one ` +
        `entry per page in pages[].`,
    });
    for (const n of pageNumbers) {
      const t = ctx.nativeText.get(n) ?? "";
      userParts.push({ text: `\n----- PAGE ${n} TEXT -----\n${t}` });
    }
    return userParts;
  }

  // IMAGE PATH — slice the requested pages into a sub-PDF → base64 inlineData.
  // pdf-lib page indices are 0-based.
  const src = await PDFDocument.load(ctx.fileBytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const wantIdx = pageNumbers
    .map((n) => n - 1)
    .filter((i) => i >= 0 && i < total);
  if (wantIdx.length === 0) {
    throw new Error(`page range ${pageFrom}-${pageTo} outside document (has ${total} pages)`);
  }
  const sub = await PDFDocument.create();
  const copied = await sub.copyPages(src, wantIdx);
  for (const p of copied) sub.addPage(p);
  const subBytes = await sub.save();
  const b64 = encodeBase64(subBytes);
  userParts.push({
    text:
      `Page range in this PDF: absolute page ${pageFrom} to ${pageTo}. ` +
      `The first page here is page ${pageFrom}. Extract every page.`,
  });
  userParts.push({ inlineData: { mimeType: PDF_MIME, data: b64 } });
  return userParts;
}

/**
 * One strict-JSON IMAGE (OCR) call over the given page subset. Used ONLY for
 * sparse/scanned pages (and their single-page retry) — native PDF + DOCX pages
 * go through the segment-and-translate path and never reach here.
 */
async function analyzePages(
  ctx: AnalyzeCtx,
  pageNumbers: number[],
  pageFrom: number,
  pageTo: number,
  mode: AnalyzeMode,
): Promise<LlmResult> {
  const userParts = await buildUserParts(ctx, pageNumbers, pageFrom, pageTo, mode);
  const messages: LlmMessage[] = [
    { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "user", parts: userParts },
  ];
  return await generateText({
    messages,
    temperature: 0.2,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    timeoutMs: ANALYZE_TIMEOUT_MS,
    jsonSchema: ANALYZE_SCHEMA,
  });
}

/**
 * Persist ONE analyzed page: page row (is_scanned/ocr_confidence/status) +
 * text blocks + tables + images + low-confidence issues. Called for every
 * batch-returned page AND for pages recovered by the single-page retry, so the
 * two paths are byte-for-byte identical. The caller guarantees this page hasn't
 * been persisted before (persistedNumbers gate) → no double-insert.
 */
async function persistPage(
  ctx: AnalyzeCtx,
  p: AnalyzedPage,
  pageId: string,
  absNumber: number,
  provider: string,
  model: string,
  mode: AnalyzeMode,
): Promise<void> {
  const { admin, documentId, isDocx, isXlsx } = ctx;
  // extraction_source + is_scanned are set by the ACTUAL path taken, not the
  // model's self-report: DOCX → docx; native text path → native_pdf (not
  // scanned); image path → llm_ocr (scanned, since it had no usable text layer).
  const isScanned = !isDocx && mode === "image";
  const blockSource = isXlsx ? "xlsx" : isDocx ? "docx" : mode === "text" ? "native_pdf" : "llm_ocr";

  // Page row: is_scanned + ocr_confidence + status.
  const minConf = pageMinConfidence(p);
  await admin
    .from("ai_document_pages")
    .update({
      is_scanned: isScanned,
      ocr_confidence: minConf,
      status: "extracted",
      error_message: null,
    })
    .eq("id", pageId);

  const issueRows: Array<Record<string, unknown>> = [];

  // Text blocks (kinds other than table/image handled inline here; table and
  // image blocks are inserted alongside their table/image rows below).
  const textBlocks = (p.blocks ?? []).filter(
    (b) => b.kind !== "table" && b.kind !== "image",
  );
  if (textBlocks.length > 0) {
    const rows = textBlocks.map((b) => ({
      document_id: documentId,
      page_id: pageId,
      block_index: typeof b.order === "number" ? b.order : null,
      kind: b.kind ?? "other",
      lang: p.detected_language ?? null,
      confidence: conf(b.confidence),
      extraction_source: blockSource,
      provider,
      model,
      text_ar: b.text_ar || null,
      text_en: b.text_en || null,
    }));
    await admin.from("ai_document_blocks").insert(rows);
    for (const b of textBlocks) {
      if (conf(b.confidence) < LOW_CONFIDENCE) {
        issueRows.push({
          document_id: documentId,
          page_id: pageId,
          kind: "low_ocr_confidence",
          severity: "warning",
          detail: `low-confidence ${b.kind} block (${conf(b.confidence).toFixed(2)}) on page ${absNumber}`,
        });
      }
    }
  }

  // Tables → ai_document_tables + a matching 'table' block. XLSX/DOCX table
  // blocks are native cell extraction, not LLM reconstruction.
  const tableBlockSource = isXlsx ? "xlsx" : isDocx ? "docx" : "llm_semantic";
  for (const t of p.tables ?? []) {
    const { data: tableRow } = await admin
      .from("ai_document_tables")
      .insert({
        document_id: documentId,
        page_id: pageId,
        header_rows: t.header_row ?? [],
        rows: t.rows ?? [],
        summary_ar: t.summary_ar || null,
        summary_en: t.summary_en || null,
        confidence: conf(t.confidence),
      })
      .select("id")
      .single();
    const tableId = tableRow?.id as string | undefined;
    const { data: blockRow } = await admin
      .from("ai_document_blocks")
      .insert({
        document_id: documentId,
        page_id: pageId,
        kind: "table",
        lang: p.detected_language ?? null,
        confidence: conf(t.confidence),
        extraction_source: tableBlockSource,
        provider,
        model,
        text_en: t.summary_en || t.caption_en || null,
        text_ar: t.summary_ar || null,
        table_id: tableId ?? null,
      })
      .select("id")
      .single();
    // Back-link the table to its block.
    if (tableId && blockRow?.id) {
      await admin
        .from("ai_document_tables")
        .update({ block_id: blockRow.id as string })
        .eq("id", tableId);
    }
    if (conf(t.confidence) < LOW_CONFIDENCE) {
      issueRows.push({
        document_id: documentId,
        page_id: pageId,
        block_id: blockRow?.id ?? null,
        kind: "broken_table",
        severity: "warning",
        detail: `low-confidence table (${conf(t.confidence).toFixed(2)}) on page ${absNumber}`,
      });
    }
  }

  // Images → ai_document_images + a matching 'image' block.
  for (const im of p.images ?? []) {
    const { data: imageRow } = await admin
      .from("ai_document_images")
      .insert({
        document_id: documentId,
        page_id: pageId,
        kind: im.kind ?? "other",
        caption_ar: im.caption_ar || null,
        caption_en: im.caption_en || null,
        description_en: im.description_en || null,
        confidence: conf(im.confidence),
      })
      .select("id")
      .single();
    const imageId = imageRow?.id as string | undefined;
    const { data: blockRow } = await admin
      .from("ai_document_blocks")
      .insert({
        document_id: documentId,
        page_id: pageId,
        kind: "image",
        lang: p.detected_language ?? null,
        confidence: conf(im.confidence),
        extraction_source: "llm_semantic",
        provider,
        model,
        text_en: [im.caption_en, im.description_en].filter(Boolean).join(" — ") || null,
        text_ar: im.caption_ar || null,
        image_id: imageId ?? null,
      })
      .select("id")
      .single();
    if (imageId && blockRow?.id) {
      await admin
        .from("ai_document_images")
        .update({ block_id: blockRow.id as string })
        .eq("id", imageId);
    }
    if (conf(im.confidence) < LOW_CONFIDENCE) {
      issueRows.push({
        document_id: documentId,
        page_id: pageId,
        block_id: blockRow?.id ?? null,
        kind: "unclear_image",
        severity: "warning",
        detail: `low-confidence image (${conf(im.confidence).toFixed(2)}) on page ${absNumber}`,
      });
    }
  }

  if (issueRows.length > 0) {
    await admin.from("ai_extraction_issues").insert(issueRows);
  }
}

/** Base64-encode bytes (chunked to avoid call-stack limits on large sub-PDFs). */
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
