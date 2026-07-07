/**
 * _shared/embed_stage.ts — layout-aware chunking + vectorization stage.
 *
 * Extracted from the former docintel-embed function so it can run IN-PROCESS
 * inside docintel-analyze's CAS winner (EdgeRuntime.waitUntil). This keeps the
 * project under the edge-function cap AND removes a function-to-function round
 * trip from the ≤60s critical path (D6).
 *
 * runEmbedStage(admin, documentId): reads all blocks/tables/images, builds
 * LAYOUT-AWARE chunks (heading_section AR+EN, table, image_caption, page),
 * embeds them in ONE Gemini batch, and drives the document chunking → embedding
 * → ready via CAS advances (so a retry / concurrent caller can't double-run).
 * Throws on failure; the caller marks the document failed.
 */
import { advanceStatus, stampLatency } from "./docintel.ts";
import { embed, logUsage } from "./llm.ts";
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

type BlockRow = {
  id: string;
  page_id: string;
  block_index: number | null;
  kind: string | null;
  text_ar: string | null;
  text_en: string | null;
};

type ChunkDraft = {
  scope: "heading_section" | "table" | "image_caption" | "page";
  lang: "ar" | "en";
  content: string;
  block_ids: string[];
  page_numbers: number[];
  section_path: string | null;
  content_kind: "ar_text" | "en_text" | "table_summary" | "image_caption";
};

async function sha256Hex(s: string): Promise<string> {
  const bytes = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function runEmbedStage(
  admin: SupabaseClient,
  documentId: string,
): Promise<{ chunks: number; embeddings: number }> {
  const t0 = Date.now();

  const { data: doc, error: docErr } = await admin
    .from("ai_documents")
    .select("id, project_id, created_at")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr || !doc) throw new Error(`document not found: ${docErr?.message ?? "missing"}`);
  const projectId = doc.project_id as string;

  const { data: pageRows } = await admin
    .from("ai_document_pages")
    .select("id, page_number")
    .eq("document_id", documentId);
  const pageNumberById = new Map<string, number>();
  for (const r of pageRows ?? []) {
    pageNumberById.set(r.id as string, r.page_number as number);
  }

  const { data: blocks } = await admin
    .from("ai_document_blocks")
    .select("id, page_id, block_index, kind, text_ar, text_en")
    .eq("document_id", documentId);
  const orderedBlocks = (blocks ?? []).slice().sort((a, b) => {
    const pa = pageNumberById.get(a.page_id as string) ?? 0;
    const pb = pageNumberById.get(b.page_id as string) ?? 0;
    if (pa !== pb) return pa - pb;
    return (a.block_index ?? 0) - (b.block_index ?? 0);
  }) as BlockRow[];

  const { data: tables } = await admin
    .from("ai_document_tables")
    .select("id, page_id, block_id, header_rows, rows, summary_en, summary_ar")
    .eq("document_id", documentId);
  const { data: images } = await admin
    .from("ai_document_images")
    .select("id, page_id, block_id, caption_en, description_en")
    .eq("document_id", documentId);

  const drafts: ChunkDraft[] = [];

  // ── heading_section chunks: start a new section at each heading block.
  let sectionTitle: string | null = null;
  let arParts: string[] = [];
  let enParts: string[] = [];
  let sectionBlockIds: string[] = [];
  let sectionPages = new Set<number>();

  const flushSection = () => {
    const arContent = arParts.filter(Boolean).join("\n\n").trim();
    const enContent = enParts.filter(Boolean).join("\n\n").trim();
    const pagesArr = [...sectionPages].sort((a, b) => a - b);
    if (arContent) {
      drafts.push({
        scope: "heading_section", lang: "ar", content: arContent,
        block_ids: [...sectionBlockIds], page_numbers: pagesArr,
        section_path: sectionTitle, content_kind: "ar_text",
      });
    }
    if (enContent) {
      drafts.push({
        scope: "heading_section", lang: "en", content: enContent,
        block_ids: [...sectionBlockIds], page_numbers: pagesArr,
        section_path: sectionTitle, content_kind: "en_text",
      });
    }
    arParts = [];
    enParts = [];
    sectionBlockIds = [];
    sectionPages = new Set<number>();
  };

  for (const b of orderedBlocks) {
    const pageNo = pageNumberById.get(b.page_id) ?? 0;
    if (b.kind === "heading") {
      flushSection();
      sectionTitle = (b.text_en || b.text_ar || "").trim() || null;
    }
    sectionBlockIds.push(b.id);
    if (pageNo) sectionPages.add(pageNo);
    if (b.text_ar) arParts.push(b.text_ar);
    if (b.text_en) enParts.push(b.text_en);
  }
  flushSection();

  for (const t of tables ?? []) {
    const header = Array.isArray(t.header_rows) ? (t.header_rows as unknown[]) : [];
    const rows = Array.isArray(t.rows) ? (t.rows as unknown[]) : [];
    const flatHeader = header.map((h) => String(h)).join(" | ");
    const flatRows = rows
      .map((r) => (Array.isArray(r) ? (r as unknown[]).map((c) => String(c)).join(" | ") : String(r)))
      .join("\n");
    const content = [t.summary_en as string | null, flatHeader, flatRows].filter(Boolean).join("\n").trim();
    if (!content) continue;
    const pageNo = pageNumberById.get(t.page_id as string);
    drafts.push({
      scope: "table", lang: "en", content,
      block_ids: t.block_id ? [t.block_id as string] : [],
      page_numbers: pageNo ? [pageNo] : [], section_path: null, content_kind: "table_summary",
    });
  }

  for (const im of images ?? []) {
    const content = [im.caption_en as string | null, im.description_en as string | null]
      .filter(Boolean).join(" — ").trim();
    if (!content) continue;
    const pageNo = pageNumberById.get(im.page_id as string);
    drafts.push({
      scope: "image_caption", lang: "en", content,
      block_ids: im.block_id ? [im.block_id as string] : [],
      page_numbers: pageNo ? [pageNo] : [], section_path: null, content_kind: "image_caption",
    });
  }

  const enByPage = new Map<number, { parts: string[]; blockIds: string[] }>();
  for (const b of orderedBlocks) {
    if (!b.text_en) continue;
    const pageNo = pageNumberById.get(b.page_id) ?? 0;
    if (!pageNo) continue;
    const entry = enByPage.get(pageNo) ?? { parts: [], blockIds: [] };
    entry.parts.push(b.text_en);
    entry.blockIds.push(b.id);
    enByPage.set(pageNo, entry);
  }
  for (const [pageNo, entry] of [...enByPage.entries()].sort((a, b) => a[0] - b[0])) {
    const content = entry.parts.filter(Boolean).join("\n\n").trim();
    if (!content) continue;
    drafts.push({
      scope: "page", lang: "en", content,
      block_ids: entry.blockIds, page_numbers: [pageNo], section_path: null, content_kind: "en_text",
    });
  }

  // Nothing to embed (e.g. every page failed) — still drive to ready.
  if (drafts.length === 0) {
    const advChunk = await advanceStatus(admin, documentId, "chunking", "embedding", "Vectorizing");
    if (advChunk) {
      await advanceStatus(admin, documentId, "embedding", "ready", null);
      await stampLatency(admin, documentId, "embed", Date.now() - t0);
      if (doc.created_at) {
        await stampLatency(admin, documentId, "total_ms", Date.now() - new Date(doc.created_at as string).getTime());
      }
    }
    return { chunks: 0, embeddings: 0 };
  }

  const chunkRows = await Promise.all(
    drafts.map(async (d) => ({
      document_id: documentId, scope: d.scope, lang: d.lang, content: d.content,
      block_ids: d.block_ids, page_numbers: d.page_numbers, section_path: d.section_path,
      char_count: d.content.length, content_hash: await sha256Hex(d.content),
    })),
  );
  const { data: insertedChunks, error: chunkErr } = await admin
    .from("ai_document_chunks").insert(chunkRows).select("id");
  if (chunkErr || !insertedChunks) throw new Error(`chunk insert failed: ${chunkErr?.message ?? "no rows"}`);
  const chunkIds = insertedChunks.map((r) => r.id as string);

  // CAS: chunking → embedding. Lost race ⇒ another caller vectorizes.
  const advChunk = await advanceStatus(admin, documentId, "chunking", "embedding", "Vectorizing");
  if (!advChunk) return { chunks: chunkIds.length, embeddings: 0 };

  const embedRes = await embed(drafts.map((d) => d.content));
  if (embedRes.embeddings.length !== drafts.length) {
    throw new Error(`embedding count mismatch: ${embedRes.embeddings.length} vs ${drafts.length}`);
  }

  const embeddingRows = drafts.map((d, i) => ({
    chunk_id: chunkIds[i], document_id: documentId, project_id: projectId,
    content_kind: d.content_kind,
    embedding: embedRes.embeddings[i] as unknown as string,
    embedding_model: embedRes.model,
  }));
  const { error: embErr } = await admin.from("ai_document_embeddings").insert(embeddingRows);
  if (embErr) throw new Error(`embedding insert failed: ${embErr.message}`);

  await admin.from("ai_agent_runs").insert({
    project_id: projectId, document_id: documentId, agent: "embed",
    provider: "gemini", model: embedRes.model, duration_ms: embedRes.durationMs, status: "ok",
  });

  await advanceStatus(admin, documentId, "embedding", "ready", null);
  await stampLatency(admin, documentId, "embed", Date.now() - t0);
  if (doc.created_at) {
    await stampLatency(admin, documentId, "total_ms", Date.now() - new Date(doc.created_at as string).getTime());
  }

  await logUsage(admin, {
    source: "docintel-analyze", action: "embed", status: "ok",
    payload: { documentId, chunks: chunkIds.length, embeddings: embeddingRows.length },
  });

  return { chunks: chunkIds.length, embeddings: embeddingRows.length };
}
