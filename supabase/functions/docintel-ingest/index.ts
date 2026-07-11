/**
 * docintel-ingest — entry point of the Arabic Document Intelligence pipeline.
 *
 * Contract (client uploads to the 'docintel-documents' bucket FIRST, then calls
 * this with the resulting storage paths):
 *
 *   POST { projectId, files: [{ storagePath, fileName, mimeType, fileSize, title? }], documentId? }
 *   → 200 { documents: [{ documentId, slug, pageCount } | { duplicate, fileName, existing }] }
 *
 * Per file: verify caller membership → download → SHA-256 of the BYTES (true
 * content hash) → duplicate check (same project, same hash, status != failed:
 * report {duplicate, existing} and delete the redundant upload — no rows
 * created) → insert ai_documents (ingesting) + version + ingest job, OR — when
 * documentId is given (re-upload flow) — append a new ai_document_versions row
 * (max+1), rewind the document, and drop the old derived rows (pages/blocks/
 * tables/images/chunks/embeddings; citations & artifacts are preserved) →
 * derive page_count (PDF via unpdf; XLSX = sheet count via SheetJS; PNG/JPEG =
 * 1 scanned page; DOCX = 1 logical page) → insert
 * ai_document_pages (pending) → status → extracting, stamp ingest
 * latency → FAN OUT: invoke docintel-analyze once per BATCH (BATCH_SIZE pages)
 * in parallel via EdgeRuntime.waitUntil so the HTTP response returns immediately.
 * Batches run concurrently so wall-clock ≈ slowest batch regardless of page
 * count (HARD ≤60s end-to-end, D6).
 *
 * NFR D6: event-driven, no cron in the hot path. Every stage records duration
 * into ai_documents.latency_ms.
 */
import { getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import {
  corsHeaders,
  getServiceClient,
  json,
  markDocumentFailed,
  requireMember,
  stampLatency,
} from "../_shared/docintel.ts";
import { docxSections } from "../_shared/docx.ts";
import { pptxSlides } from "../_shared/pptx.ts";

interface IngestFile {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  title?: string;
}

const PDF_MIME = "application/pdf";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const IMAGE_MIMES = new Set(["image/png", "image/jpeg"]);
// pages per docintel-analyze call. 8 pages/batch: docintel-analyze now takes a
// SEGMENT-AND-TRANSLATE path — for native PDFs it pulls the Arabic text layer
// with unpdf (no vision OCR), deterministically segments it (Arabic = source of
// truth, never re-emitted), and asks the model for English + layout kind ONLY.
// The model's OUTPUT is roughly halved, which was the real bottleneck (6-page
// batches were timing out re-emitting Arabic), so each call is far faster and a
// batch can safely carry MORE pages: 24 pages → 3 batches, easily one
// concurrency wave. analyze internally splits a dense batch's translate call
// into ≤120-segment sub-calls (concurrent) so output never overruns, and keeps
// a per-(page,index) missing-item retry so no segment is ever dropped.
// Scanned/sparse pages still fall back to the multimodal image path per page.
const BATCH_SIZE = 8;

/**
 * True content hash (v2): SHA-256 hex of the actual file BYTES. Replaces the
 * weak v1 path-based hash (`storagePath|fileSize|fileName`) — storagePath
 * embeds a client-generated uuid, so identical files never collided under v1.
 */
async function computeContentHash(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Per-file ingest outcome: a created/re-ingested document, or a detected duplicate. */
type IngestResult =
  | { documentId: string; slug: string | null; pageCount: number | null }
  | {
    duplicate: true;
    fileName: string;
    existing: { id: string; slug: string | null; title: string | null };
  };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = getServiceClient();
    const body = await req.json().catch(() => null) as
      | { projectId?: string; files?: IngestFile[]; documentId?: string }
      | null;

    const projectId = body?.projectId;
    const files = body?.files;
    // Re-upload flow: when set, files[0] becomes a NEW VERSION of this document.
    const targetDocumentId = body?.documentId;
    if (!projectId || !Array.isArray(files) || files.length === 0) {
      return json({ error: "projectId and non-empty files[] are required" }, 400);
    }

    // Auth + membership.
    const userId = await requireMember(req, projectId, admin);
    if (!userId) return json({ error: "Not a member of project" }, 403);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: IngestResult[] = [];
    const fanOut: Promise<unknown>[] = [];

    for (const file of files) {
      const t0 = Date.now();

      if (!file.storagePath?.startsWith(`${projectId}/`)) {
        return json(
          { error: `storagePath must start with '${projectId}/'` },
          400,
        );
      }

      // Download FIRST — the bytes are the document's identity. True content
      // hash + duplicate detection happen before any row is created. (The
      // storage object was already uploaded by the client before this call.)
      const { data: blob, error: dlErr } = await admin.storage
        .from("docintel-documents")
        .download(file.storagePath);
      if (dlErr || !blob) {
        return json(
          { error: `Download failed for ${file.fileName}: ${dlErr?.message ?? "no file"}` },
          500,
        );
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const contentHash = await computeContentHash(bytes);
      const sourceLanguage: string | null = null; // detected in a later stage

      let documentId: string;
      let docSlug: string | null;

      if (targetDocumentId) {
        // ── Re-upload flow: NEW VERSION of an existing document ────────────
        const { data: existingDoc, error: exErr } = await admin
          .from("ai_documents")
          .select("id, slug, title, content_hash, status")
          .eq("id", targetDocumentId)
          .eq("project_id", projectId)
          .maybeSingle();
        if (exErr || !existingDoc) {
          return json({ error: "Target document not found in project" }, 404);
        }

        // Byte-identical to the current version → nothing to do.
        if (existingDoc.content_hash === contentHash && existingDoc.status !== "failed") {
          await admin.storage.from("docintel-documents").remove([file.storagePath]);
          results.push({
            duplicate: true,
            fileName: file.fileName,
            existing: {
              id: existingDoc.id as string,
              slug: (existingDoc.slug as string | null) ?? null,
              title: (existingDoc.title as string | null) ?? null,
            },
          });
          continue;
        }

        // Next version number (the current file is v1 even if its row is missing).
        const { data: lastVer } = await admin
          .from("ai_document_versions")
          .select("version_no")
          .eq("document_id", targetDocumentId)
          .order("version_no", { ascending: false })
          .limit(1)
          .maybeSingle();
        await admin.from("ai_document_versions").insert({
          document_id: targetDocumentId,
          version_no: ((lastVer?.version_no as number | undefined) ?? 1) + 1,
          storage_path: file.storagePath,
          content_hash: contentHash,
        });

        // Point the document at the new bytes and rewind it to re-extraction.
        const { error: updErr } = await admin
          .from("ai_documents")
          .update({
            title: file.title ?? file.fileName,
            original_file_name: file.fileName,
            mime_type: file.mimeType,
            storage_path: file.storagePath,
            file_size: file.fileSize,
            page_count: null,
            source_language: sourceLanguage,
            status: "ingesting",
            status_detail: "Re-ingesting new version",
            content_hash: contentHash,
            error_message: null,
          })
          .eq("id", targetDocumentId);
        if (updErr) {
          return json({ error: `Failed to update document: ${updErr.message}` }, 500);
        }

        // Fresh extraction: drop the derived rows of the old version.
        // FK audit (20260707030000): ai_artifact_citations.block_id and
        // ai_requirement_facts.source_block_ids carry NO FK constraints, so
        // artifacts/citations/facts survive untouched and keep their
        // historical block/page references. Cascades: pages → blocks/tables/
        // images/extraction_issues (page_id), chunks → embeddings (chunk_id).
        // tables/images/chunks are also deleted by document_id to catch rows
        // whose nullable page_id never got set.
        await admin.from("ai_document_pages").delete().eq("document_id", targetDocumentId);
        await admin.from("ai_document_tables").delete().eq("document_id", targetDocumentId);
        await admin.from("ai_document_images").delete().eq("document_id", targetDocumentId);
        await admin.from("ai_document_chunks").delete().eq("document_id", targetDocumentId);

        documentId = targetDocumentId;
        docSlug = (existingDoc.slug as string | null) ?? null;
      } else {
        // ── New upload: project-wide duplicate detection on the byte hash ──
        const { data: dup } = await admin
          .from("ai_documents")
          .select("id, slug, title")
          .eq("project_id", projectId)
          .eq("content_hash", contentHash)
          .neq("status", "failed")
          .limit(1)
          .maybeSingle();
        if (dup) {
          // The just-uploaded object is redundant — remove it (best-effort).
          await admin.storage.from("docintel-documents").remove([file.storagePath]);
          results.push({
            duplicate: true,
            fileName: file.fileName,
            existing: {
              id: dup.id as string,
              slug: (dup.slug as string | null) ?? null,
              title: (dup.title as string | null) ?? null,
            },
          });
          continue;
        }

        // Insert the document row (ingesting).
        const { data: doc, error: insErr } = await admin
          .from("ai_documents")
          .insert({
            project_id: projectId,
            title: file.title ?? file.fileName,
            original_file_name: file.fileName,
            mime_type: file.mimeType,
            storage_path: file.storagePath,
            file_size: file.fileSize,
            source_language: sourceLanguage,
            status: "ingesting",
            content_hash: contentHash,
            created_by: userId,
          })
          .select("id, slug")
          .single();

        if (insErr || !doc) {
          return json(
            { error: `Failed to create document: ${insErr?.message ?? "unknown"}` },
            500,
          );
        }
        documentId = doc.id as string;
        docSlug = (doc.slug as string | null) ?? null;

        // Version row (v1).
        await admin.from("ai_document_versions").insert({
          document_id: documentId,
          version_no: 1,
          storage_path: file.storagePath,
          content_hash: contentHash,
        });
      }

      // Ingest job (running).
      const { data: job } = await admin
        .from("ai_document_jobs")
        .insert({
          document_id: documentId,
          page_number: null,
          stage: "ingest",
          status: "running",
          attempts: 1,
          priority: 0,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      const ingestJobId = job?.id as string | undefined;

      // Derive page count (bytes already downloaded for the content hash).
      let pageCount: number | null = null;
      try {
        if (file.mimeType === PDF_MIME) {
          const pdf = await getDocumentProxy(bytes);
          pageCount = pdf.numPages;
        } else if (file.mimeType === XLSX_MIME) {
          // XLSX: one logical page per sheet (SheetJS parses the workbook here
          // only for the sheet count; cell extraction happens in analyze).
          const wb = XLSX.read(bytes, { type: "array", bookSheets: true });
          pageCount = wb.SheetNames.length > 0 ? wb.SheetNames.length : 1;
        } else if (IMAGE_MIMES.has(file.mimeType)) {
          // Standalone image: exactly one scanned page.
          pageCount = 1;
        } else if (
          file.mimeType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          (file.fileName ?? "").toLowerCase().endsWith(".docx")
        ) {
          // DOCX: one logical page per heading section (shared splitter, identical to the one
          // docintel-analyze uses so page rows line up with per-section content). Slice 3.
          const sections = await docxSections(bytes);
          pageCount = sections.length > 0 ? sections.length : 1;
        } else if (
          file.mimeType ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          (file.fileName ?? "").toLowerCase().endsWith(".pptx")
        ) {
          // PPTX: one logical page per slide (shared splitter, matches docintel-analyze). Slice 3.
          const slides = await pptxSlides(bytes);
          pageCount = slides.length > 0 ? slides.length : 1;
        } else if (
          file.mimeType.startsWith("audio/") ||
          /\.(m4a|mp3|wav|aiff|aif|ogg|flac|aac)$/i.test(file.fileName ?? "")
        ) {
          // AUDIO: one page — docintel-analyze transcribes it via Gemini. Slice 3.
          pageCount = 1;
        } else {
          // Any other non-PDF: one logical page. page_count stays null.
          pageCount = null;
        }
      } catch (e) {
        await markDocumentFailed(
          admin,
          documentId,
          `Page-count extraction failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        if (ingestJobId) {
          await admin.from("ai_document_jobs").update({
            status: "failed",
            error_message: e instanceof Error ? e.message : String(e),
            finished_at: new Date().toISOString(),
          }).eq("id", ingestJobId);
        }
        results.push({ documentId, slug: docSlug, pageCount: null });
        continue;
      }

      // Persist page_count. Number of physical pages to fan out over: PDF page
      // count, or 1 logical page for DOCX / unknown (page_number 1).
      const pageNumbers = pageCount && pageCount > 0
        ? Array.from({ length: pageCount }, (_, i) => i + 1)
        : [1];

      await admin
        .from("ai_documents")
        .update({ page_count: pageCount })
        .eq("id", documentId);

      // Insert page rows (pending).
      await admin.from("ai_document_pages").insert(
        pageNumbers.map((n) => ({
          document_id: documentId,
          page_number: n,
          status: "pending",
        })),
      );

      // Advance to extracting + stamp ingest latency + close ingest job.
      await admin
        .from("ai_documents")
        .update({ status: "extracting", status_detail: "Extracting page text" })
        .eq("id", documentId);
      await stampLatency(admin, documentId, "ingest", Date.now() - t0);
      if (ingestJobId) {
        await admin.from("ai_document_jobs").update({
          status: "done",
          finished_at: new Date().toISOString(),
        }).eq("id", ingestJobId);
      }

      // FAN OUT: invoke docintel-analyze once per BATCH of pages, in parallel.
      // Runs after the response is returned so the client gets { documentId }
      // fast. DOCX / unknown collapses to a single {pageFrom:1,pageTo:1} batch.
      const firstPage = pageNumbers[0];
      const lastPage = pageNumbers[pageNumbers.length - 1];
      for (let from = firstPage; from <= lastPage; from += BATCH_SIZE) {
        const to = Math.min(from + BATCH_SIZE - 1, lastPage);
        fanOut.push(
          fetch(`${supabaseUrl}/functions/v1/docintel-analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ documentId, pageFrom: from, pageTo: to }),
          }),
        );
      }

      results.push({ documentId, slug: docSlug, pageCount });
    }

    // Non-blocking: let the fan-out settle in the background.
    // @ts-ignore EdgeRuntime is available in the Supabase Edge runtime.
    EdgeRuntime.waitUntil(Promise.allSettled(fanOut));

    // Every file was an exact duplicate → nothing was created; surface the
    // duplicate verdict at the top level too (single-file callers read it).
    const dups = results.filter(
      (r): r is Extract<IngestResult, { duplicate: true }> => "duplicate" in r,
    );
    if (dups.length > 0 && dups.length === results.length) {
      return json({ duplicate: true, existing: dups[0].existing, documents: results });
    }
    return json({ documents: results });
  } catch (err) {
    console.error("docintel-ingest error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});
