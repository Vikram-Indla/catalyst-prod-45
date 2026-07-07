/**
 * docintel-ingest — entry point of the Arabic Document Intelligence pipeline.
 *
 * Contract (client uploads to the 'docintel-documents' bucket FIRST, then calls
 * this with the resulting storage paths):
 *
 *   POST { projectId, files: [{ storagePath, fileName, mimeType, fileSize, title? }] }
 *   → 200 { documents: [{ documentId, slug, pageCount }] }
 *
 * Per file: verify caller membership → insert ai_documents (ingesting) + version
 * + ingest job → download → derive page_count (PDF via unpdf; DOCX = 1 logical
 * page) → insert ai_document_pages (pending) → status → extracting, stamp ingest
 * latency → FAN OUT: invoke docintel-analyze once per BATCH (BATCH_SIZE pages)
 * in parallel via EdgeRuntime.waitUntil so the HTTP response returns immediately.
 * Batches run concurrently so wall-clock ≈ slowest batch regardless of page
 * count (HARD ≤60s end-to-end, D6).
 *
 * NFR D6: event-driven, no cron in the hot path. Every stage records duration
 * into ai_documents.latency_ms.
 */
import { getDocumentProxy } from "https://esm.sh/unpdf@0.11.0";
import {
  corsHeaders,
  getServiceClient,
  json,
  markDocumentFailed,
  requireMember,
  stampLatency,
} from "../_shared/docintel.ts";

interface IngestFile {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  title?: string;
}

const PDF_MIME = "application/pdf";
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

/** Cheap v1 content hash: storagePath + fileSize + fileName. SHA-256 hex. */
async function computeContentHash(f: IngestFile): Promise<string> {
  const input = `${f.storagePath}|${f.fileSize}|${f.fileName}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = getServiceClient();
    const body = await req.json().catch(() => null) as
      | { projectId?: string; files?: IngestFile[] }
      | null;

    const projectId = body?.projectId;
    const files = body?.files;
    if (!projectId || !Array.isArray(files) || files.length === 0) {
      return json({ error: "projectId and non-empty files[] are required" }, 400);
    }

    // Auth + membership.
    const userId = await requireMember(req, projectId, admin);
    if (!userId) return json({ error: "Not a member of project" }, 403);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Array<{ documentId: string; slug: string | null; pageCount: number | null }> = [];
    const fanOut: Promise<unknown>[] = [];

    for (const file of files) {
      const t0 = Date.now();

      if (!file.storagePath?.startsWith(`${projectId}/`)) {
        return json(
          { error: `storagePath must start with '${projectId}/'` },
          400,
        );
      }

      const contentHash = await computeContentHash(file);
      const sourceLanguage: string | null = null; // detected in a later stage

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
      const documentId = doc.id as string;

      // Version row (v1) + ingest job (running).
      await admin.from("ai_document_versions").insert({
        document_id: documentId,
        version_no: 1,
        storage_path: file.storagePath,
        content_hash: contentHash,
      });
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

      // Download the file (service client).
      const { data: blob, error: dlErr } = await admin.storage
        .from("docintel-documents")
        .download(file.storagePath);
      if (dlErr || !blob) {
        await markDocumentFailed(admin, documentId, `Download failed: ${dlErr?.message ?? "no file"}`);
        if (ingestJobId) {
          await admin.from("ai_document_jobs").update({
            status: "failed",
            error_message: dlErr?.message ?? "download failed",
            finished_at: new Date().toISOString(),
          }).eq("id", ingestJobId);
        }
        results.push({ documentId, slug: doc.slug ?? null, pageCount: null });
        continue;
      }

      // Derive page count.
      let pageCount: number | null = null;
      try {
        if (file.mimeType === PDF_MIME) {
          const buf = new Uint8Array(await blob.arrayBuffer());
          const pdf = await getDocumentProxy(buf);
          pageCount = pdf.numPages;
        } else {
          // DOCX (and any non-PDF): one logical page. page_count stays null.
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
        results.push({ documentId, slug: doc.slug ?? null, pageCount: null });
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

      results.push({ documentId, slug: doc.slug ?? null, pageCount });
    }

    // Non-blocking: let the fan-out settle in the background.
    // @ts-ignore EdgeRuntime is available in the Supabase Edge runtime.
    EdgeRuntime.waitUntil(Promise.allSettled(fanOut));

    return json({ documents: results });
  } catch (err) {
    console.error("docintel-ingest error:", err);
    return json(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});
