/**
 * docintel/domain — data layer for Arabic Document Intelligence.
 *
 * Uploads go to the private 'docintel-documents' bucket at
 * `${projectId}/${uuid}/${fileName}` (path MUST start with the project id per
 * the bucket's storage policy), then docintel-ingest is invoked with the
 * resulting storage paths.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  DocintelTheme,
  DocintelArtifact,
  DocintelArtifactCoverage,
  DocintelArtifactType,
  DocintelArtifactWithCitations,
  DocintelAskResult,
  DocintelBlock,
  DocintelCitation,
  DocintelDocument,
  DocintelDocumentLink,
  DocintelDocumentVersion,
  DocintelLinkEntityType,
  DocintelLinkOrigin,
  DocintelResolvedLink,
  DocintelElementKind,
  DocintelExtractFactsResult,
  DocintelExtractionIssue,
  DocintelFactReviewStatus,
  DocintelFormattedDocument,
  DocintelGenerateResult,
  DocintelImage,
  DocintelIngestResult,
  DocintelPage,
  DocintelRenderElement,
  DocintelRequirementFact,
  DocintelTable,
  DocintelTraceabilityMatrix,
} from "../types";

/**
 * Map a raw ai_document_blocks.kind onto the render-stable element kind.
 * Unknown kinds fall back to "paragraph" so text is never lost. header/footer/
 * footnote become "chrome" (kept, flagged). Returns the normalised kind plus
 * whether it is document chrome (noise to optionally de-emphasise).
 */
function normaliseKind(raw: string | null | undefined): {
  kind: DocintelElementKind;
  isChrome: boolean;
} {
  const k = (raw ?? "").toLowerCase().trim();
  switch (k) {
    case "heading":
    case "title":
    case "subheading":
      return { kind: "heading", isChrome: false };
    case "list_item":
    case "list":
    case "bullet":
      return { kind: "list_item", isChrome: false };
    case "table":
      return { kind: "table", isChrome: false };
    case "caption":
      return { kind: "caption", isChrome: false };
    case "header":
    case "footer":
    case "footnote":
      return { kind: "chrome", isChrome: true };
    case "paragraph":
    case "other":
    case "":
      return { kind: "paragraph", isChrome: false };
    default:
      return { kind: "paragraph", isChrome: false };
  }
}

const BUCKET = "docintel-documents";

// ai_document_links postdates the generated Supabase types in this repo; the
// link surfaces use the same untyped escape hatch as src/hooks/useWiki.ts.
const db = supabase as unknown as { from: (table: string) => any };

/** entity_type values resolved against ph_issues / ph_work_items. */
const WORK_ITEM_ENTITY_TYPES: DocintelLinkEntityType[] = [
  "epic",
  "feature",
  "story",
  "task",
  "defect",
  "incident",
];

/**
 * Resolve key/title for each link, per entity_type family, from the same
 * canonical tables the existing pickers read (AddParentPicker/
 * AttachWikiPageDialog → ph_issues + business_requests; PromoteArtifactModal
 * → ph_work_items; TestHub → tm_test_cases; Release Ops → rh_releases /
 * rh_changes; Folio → kb_documents). Lookups are best-effort — a failed or
 * empty lookup leaves the link unresolved (null key/title) so the UI can fall
 * back to the raw id. Zero-assumption: nothing is invented.
 */
async function resolveLinkTargets(
  links: DocintelDocumentLink[],
): Promise<DocintelResolvedLink[]> {
  const idsByType = new Map<string, string[]>();
  for (const l of links) {
    const arr = idsByType.get(l.entity_type) ?? [];
    arr.push(l.entity_id);
    idsByType.set(l.entity_type, arr);
  }

  const resolved = new Map<
    string,
    Pick<
      DocintelResolvedLink,
      "entity_key" | "entity_title" | "entity_icon_type" | "folio_space_slug" | "folio_page_slug"
    >
  >();
  const keyOf = (type: string, id: string) => `${type}:${id}`;

  const workItemIds = WORK_ITEM_ENTITY_TYPES.flatMap(
    (t) => idsByType.get(t) ?? [],
  );

  const tasks: Promise<void>[] = [];

  // Work items: manual links point at ph_issues; promotion links point at
  // ph_work_items. Query both, prefer the ph_issues hit.
  if (workItemIds.length > 0) {
    tasks.push(
      (async () => {
        try {
          const [issues, workItems] = await Promise.all([
            db
              .from("ph_issues")
              .select("id, issue_key, summary, issue_type")
              .in("id", workItemIds),
            db
              .from("ph_work_items")
              .select("id, item_key, title, item_type")
              .in("id", workItemIds),
          ]);
          const byId = new Map<
            string,
            { key: string | null; title: string | null; icon: string | null }
          >();
          for (const r of (workItems.data ?? []) as Array<{
            id: string;
            item_key: string | null;
            title: string | null;
            item_type: string | null;
          }>) {
            byId.set(r.id, {
              key: r.item_key ?? null,
              title: r.title ?? null,
              icon: r.item_type ?? null,
            });
          }
          for (const r of (issues.data ?? []) as Array<{
            id: string;
            issue_key: string | null;
            summary: string | null;
            issue_type: string | null;
          }>) {
            byId.set(r.id, {
              key: r.issue_key ?? null,
              title: r.summary ?? null,
              icon: r.issue_type ?? null,
            });
          }
          for (const t of WORK_ITEM_ENTITY_TYPES) {
            for (const id of idsByType.get(t) ?? []) {
              const hit = byId.get(id);
              if (!hit) continue;
              resolved.set(keyOf(t, id), {
                entity_key: hit.key,
                entity_title: hit.title,
                entity_icon_type: hit.icon,
                folio_space_slug: null,
                folio_page_slug: null,
              });
            }
          }
        } catch {
          /* best-effort — unresolved links render their id */
        }
      })(),
    );
  }

  const simpleLookup = (
    entityType: string,
    table: string,
    columns: string,
    map: (row: Record<string, unknown>) => {
      key: string | null;
      title: string | null;
      icon: string | null;
    },
  ) => {
    const ids = idsByType.get(entityType) ?? [];
    if (ids.length === 0) return;
    tasks.push(
      (async () => {
        try {
          const { data } = await db.from(table).select(columns).in("id", ids);
          for (const row of (data ?? []) as Array<Record<string, unknown>>) {
            const m = map(row);
            resolved.set(keyOf(entityType, String(row.id)), {
              entity_key: m.key,
              entity_title: m.title,
              entity_icon_type: m.icon,
              folio_space_slug: null,
              folio_page_slug: null,
            });
          }
        } catch {
          /* best-effort */
        }
      })(),
    );
  };

  simpleLookup(
    "business_request",
    "business_requests",
    "id, request_key, title",
    (r) => ({
      key: (r.request_key as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      icon: "Business Request",
    }),
  );
  simpleLookup("test_case", "tm_test_cases", "id, case_key, title", (r) => ({
    key: (r.case_key as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    icon: "Test Case",
  }));
  simpleLookup("release", "rh_releases", "id, key, name, version", (r) => ({
    key: (r.key as string | null) ?? (r.version as string | null) ?? null,
    title: (r.name as string | null) ?? null,
    icon: "Release",
  }));
  simpleLookup("change", "rh_changes", "id, chg_number, title", (r) => ({
    key: (r.chg_number as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    icon: "Change",
  }));

  // Folio documents — carry navigation slugs too.
  const docIds = idsByType.get("document") ?? [];
  if (docIds.length > 0) {
    tasks.push(
      (async () => {
        try {
          const { data } = await db
            .from("kb_documents")
            .select("id, doc_key, title, slug, space:kb_doc_spaces (slug)")
            .in("id", docIds);
          for (const row of (data ?? []) as Array<{
            id: string;
            doc_key: string | null;
            title: string | null;
            slug: string | null;
            space: { slug: string } | null;
          }>) {
            resolved.set(keyOf("document", row.id), {
              entity_key: row.doc_key ?? null,
              entity_title: row.title ?? null,
              entity_icon_type: null,
              folio_space_slug: row.space?.slug ?? null,
              folio_page_slug: row.slug ?? null,
            });
          }
        } catch {
          /* best-effort */
        }
      })(),
    );
  }

  await Promise.all(tasks);

  return links.map((l) => ({
    ...l,
    entity_key: null,
    entity_title: null,
    entity_icon_type: null,
    folio_space_slug: null,
    folio_page_slug: null,
    ...(resolved.get(keyOf(l.entity_type, l.entity_id)) ?? {}),
  }));
}

interface UploadAndIngestInput {
  projectId: string;
  files: File[];
  onProgress?: (fileName: string, progress: number) => void;
}

export const docintelApi = {
  /** List a project's documents, newest first. */
  listDocuments: async (projectId: string): Promise<DocintelDocument[]> => {
    const { data, error } = await supabase
      .from("ai_documents")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelDocument[];
  },

  /** Resolve one document by its slug (workspace route). */
  getDocumentBySlug: async (slug: string): Promise<DocintelDocument | null> => {
    const { data, error } = await supabase
      .from("ai_documents")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as DocintelDocument | null) ?? null;
  },

  /** Fetch a document's pages, ordered. */
  listPages: async (documentId: string): Promise<DocintelPage[]> => {
    const { data, error } = await supabase
      .from("ai_document_pages")
      .select("*")
      .eq("document_id", documentId)
      .order("page_number", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelPage[];
  },

  // ── Evidence ────────────────────────────────────────────────────────────

  /** Alias for listPages — evidence viewer reads pages for the left rail. */
  getDocumentPages: async (documentId: string): Promise<DocintelPage[]> => {
    return docintelApi.listPages(documentId);
  },

  /**
   * All blocks for a document, joined with their page_number so the viewer can
   * group by page in reading order (page_number asc, block_index asc).
   */
  getPageBlocks: async (documentId: string): Promise<DocintelBlock[]> => {
    const { data, error } = await supabase
      .from("ai_document_blocks")
      .select("*, ai_document_pages!inner(page_number)")
      .eq("document_id", documentId)
      .order("block_index", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<
      DocintelBlock & { ai_document_pages?: { page_number: number } | null }
    >;
    return rows
      .map((r) => ({
        ...r,
        page_number: r.ai_document_pages?.page_number ?? null,
      }))
      .sort((a, b) => {
        const pa = a.page_number ?? 0;
        const pb = b.page_number ?? 0;
        if (pa !== pb) return pa - pb;
        return a.block_index - b.block_index;
      });
  },

  /** Tables extracted for a document (joined to pages for page scoping). */
  getDocumentTables: async (documentId: string): Promise<DocintelTable[]> => {
    const { data, error } = await supabase
      .from("ai_document_tables")
      .select("*, ai_document_pages!inner(document_id)")
      .eq("ai_document_pages.document_id", documentId);
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelTable[];
  },

  /** Images/figures extracted for a document. */
  getDocumentImages: async (documentId: string): Promise<DocintelImage[]> => {
    const { data, error } = await supabase
      .from("ai_document_images")
      .select("*, ai_document_pages!inner(document_id)")
      .eq("ai_document_pages.document_id", documentId);
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelImage[];
  },

  /** Extraction issues (unresolved + resolved) for a document. */
  getExtractionIssues: async (
    documentId: string,
  ): Promise<DocintelExtractionIssue[]> => {
    const { data, error } = await supabase
      .from("ai_extraction_issues")
      .select("*")
      .eq("document_id", documentId);
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelExtractionIssue[];
  },

  // ── Formatted (translated) document ───────────────────────────────────────

  /**
   * The structure-faithful, translated document: the document row plus its
   * blocks assembled into an ordered array of render elements in reading order
   * (page_number asc, block_index asc). Table blocks are joined to their
   * ai_document_tables row so the renderer can lay out real tables. Nothing is
   * dropped — header/footer/footnote blocks are kept but flagged `isChrome` so
   * the UI can de-emphasise them.
   *
   * This is the "same feeler post-translation" surface: headings stay headings,
   * paragraphs stay paragraphs, lists stay lists, tables stay tables — rendered
   * in English with the Arabic available. NOT a summary.
   */
  getFormattedDocument: async (
    documentId: string,
  ): Promise<DocintelFormattedDocument | null> => {
    const [document, blocks, tables] = await Promise.all([
      docintelApi.getDocumentById(documentId),
      docintelApi.getPageBlocks(documentId), // already sorted page asc, block_index asc
      docintelApi.getDocumentTables(documentId),
    ]);
    if (!document) return null;

    const tableById = new Map<string, DocintelTable>();
    for (const t of tables) tableById.set(t.id, t);
    const consumedTableIds = new Set<string>();

    const elements: DocintelRenderElement[] = [];
    for (const b of blocks) {
      const { kind, isChrome } = normaliseKind(b.kind);
      const page = b.page_number ?? 0;

      if (kind === "table") {
        const table = b.table_id ? tableById.get(b.table_id) : undefined;
        if (table) consumedTableIds.add(table.id);
        // A table block with no resolvable table row still renders any caption
        // text it carries; skip only if there is truly nothing to show.
        if (!table && !b.text_en?.trim() && !b.text_ar?.trim()) continue;
        elements.push({
          id: b.id,
          page,
          kind: "table",
          rawKind: String(b.kind ?? ""),
          text_en: b.text_en,
          text_ar: b.text_ar,
          table,
          isChrome: false,
        });
        continue;
      }

      // Non-table element — needs at least one language of text to render.
      if (!b.text_en?.trim() && !b.text_ar?.trim()) continue;
      elements.push({
        id: b.id,
        page,
        kind,
        rawKind: String(b.kind ?? ""),
        text_en: b.text_en,
        text_ar: b.text_ar,
        isChrome,
      });
    }

    // Defensive: surface any table that no block referenced (orphan) so the
    // document is never missing a table that exists in the data.
    for (const t of tables) {
      if (consumedTableIds.has(t.id)) continue;
      const page =
        blocks.find((b) => b.page_id === t.page_id)?.page_number ?? 0;
      elements.push({
        id: `table-${t.id}`,
        page,
        kind: "table",
        rawKind: "table",
        text_en: t.summary_en,
        text_ar: t.summary_ar,
        table: t,
        isChrome: false,
      });
    }

    // Keep reading order stable after appending orphan tables.
    elements.sort((a, b) => (a.page !== b.page ? a.page - b.page : 0));

    return { document, elements };
  },

  // ── Generation ──────────────────────────────────────────────────────────

  /**
   * Artifacts for a document within a project. Filters by project_id (RLS) and
   * requires the document id to be present in the document_ids array.
   */
  listArtifacts: async (
    projectId: string,
    documentId: string,
  ): Promise<DocintelArtifact[]> => {
    const { data, error } = await supabase
      .from("ai_generated_artifacts")
      .select("*")
      .eq("project_id", projectId)
      .contains("document_ids", [documentId])
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelArtifact[];
  },

  /** One artifact + its citation rows. */
  getArtifactWithCitations: async (
    artifactId: string,
  ): Promise<DocintelArtifactWithCitations | null> => {
    const { data: artifact, error: aErr } = await supabase
      .from("ai_generated_artifacts")
      .select("*")
      .eq("id", artifactId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!artifact) return null;

    const { data: citations, error: cErr } = await supabase
      .from("ai_artifact_citations")
      .select("*")
      .eq("artifact_id", artifactId)
      .order("page_number", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    return {
      artifact: artifact as DocintelArtifact,
      citations: (citations ?? []) as DocintelCitation[],
    };
  },

  /**
   * Generate an artifact via the docintel-generate edge function. Non-streaming
   * for v1 (stream:false) — resolves once the artifact row is written.
   */
  generateArtifact: async ({
    projectId,
    documentIds,
    artifactType,
    title,
  }: {
    projectId: string;
    documentIds: string[];
    artifactType: DocintelArtifactType;
    title?: string;
  }): Promise<DocintelGenerateResult> => {
    const { data, error } = await supabase.functions.invoke("docintel-generate", {
      body: { projectId, documentIds, artifactType, title, stream: false },
    });
    if (error) throw new Error(error.message);
    const res = data as Partial<DocintelGenerateResult> | null;
    if (!res?.artifactId) {
      throw new Error("Generation did not return an artifact");
    }
    return {
      artifactId: res.artifactId,
      groundingScore: res.groundingScore ?? null,
      citationCount: res.citationCount ?? null,
      status: res.status ?? "ready",
      content_md: res.content_md ?? null,
    };
  },

  /**
   * Ask a grounded question over the corpus via the docintel-ask edge
   * function. Non-streaming for v1 (stream:false) — resolves with the full
   * answer, marker-keyed citations, deterministic confidence and source
   * freshness. Scoped to one document when documentId is given, else
   * project-wide.
   */
  askQuestion: async ({
    projectId,
    documentId,
    question,
    themeId,
  }: {
    projectId: string;
    documentId?: string;
    question: string;
    themeId?: string;
  }): Promise<DocintelAskResult> => {
    const { data, error } = await supabase.functions.invoke("docintel-ask", {
      body: { projectId, documentId, question, themeId, stream: false },
    });
    if (error) throw new Error(error.message);
    const res = data as Partial<DocintelAskResult> | null;
    return {
      answer_md: res?.answer_md ?? "",
      citations: res?.citations ?? [],
      confidence: typeof res?.confidence === "number" ? res.confidence : null,
      evidence_count: res?.evidence_count ?? 0,
      freshness: res?.freshness ?? null,
    };
  },

  /**
   * Upload each file to storage, then invoke docintel-ingest. Returns the
   * ingest results (documentId / slug / pageCount) per file.
   */
  uploadAndIngest: async (
    { projectId, files, onProgress }: UploadAndIngestInput,
  ): Promise<DocintelIngestResult[]> => {
    const staged = [] as Array<{
      storagePath: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
    }>;

    for (const file of files) {
      const storagePath = `${projectId}/${crypto.randomUUID()}/${file.name}`;
      onProgress?.(file.name, 10);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) throw new Error(`${file.name}: ${upErr.message}`);
      onProgress?.(file.name, 100);
      staged.push({
        storagePath,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
    }

    const { data, error } = await supabase.functions.invoke("docintel-ingest", {
      body: { projectId, files: staged },
    });
    if (error) throw new Error(error.message);
    // Per-file union: created documents and/or {duplicate,existing} verdicts.
    return ((data as { documents?: DocintelIngestResult[] })?.documents ?? []);
  },

  /**
   * Upload a NEW VERSION of an existing document: stage the file in storage,
   * then invoke docintel-ingest with documentId (re-upload flow). The pipeline
   * appends an ai_document_versions row (max+1) and re-runs extraction over
   * the new bytes. Returns {duplicate, existing} when the bytes are identical
   * to the document's current version (nothing changes then).
   */
  uploadNewVersion: async ({
    projectId,
    documentId,
    file,
  }: {
    projectId: string;
    documentId: string;
    file: File;
  }): Promise<DocintelIngestResult> => {
    const storagePath = `${projectId}/${crypto.randomUUID()}/${file.name}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw new Error(`${file.name}: ${upErr.message}`);

    const { data, error } = await supabase.functions.invoke("docintel-ingest", {
      body: {
        projectId,
        documentId,
        files: [{
          storagePath,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        }],
      },
    });
    if (error) throw new Error(error.message);
    const results =
      (data as { documents?: DocintelIngestResult[] })?.documents ?? [];
    if (results.length === 0) {
      throw new Error("Ingest did not return a result");
    }
    return results[0];
  },

  /** Version history for a document (ai_document_versions), newest first. */
  listDocumentVersions: async (
    documentId: string,
  ): Promise<DocintelDocumentVersion[]> => {
    const { data, error } = await supabase
      .from("ai_document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version_no", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelDocumentVersion[];
  },

  /**
   * Mark an artifact promoted after ≥1 work item was created from it. Stamps
   * status='promoted' and records the first created work item's id so the UI
   * can show the promoted state and (later) deep-link to it.
   */
  markArtifactPromoted: async (
    artifactId: string,
    workItemId: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from("ai_generated_artifacts")
      .update({ status: "promoted", promoted_work_item_id: workItemId })
      .eq("id", artifactId);
    if (error) throw new Error(error.message);
  },

  // ── Requirement facts ─────────────────────────────────────────────────────

  /** All requirement facts for a document, grouped-friendly (kind, then created). */
  getRequirementFacts: async (
    documentId: string,
  ): Promise<DocintelRequirementFact[]> => {
    const { data, error } = await supabase
      .from("ai_requirement_facts")
      .select("*")
      .eq("document_id", documentId)
      .order("kind", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelRequirementFact[];
  },

  /**
   * Extract requirement facts via the docintel-generate edge function
   * (artifactType 'requirement_facts'). Dedupe is handled server-side. Returns
   * the extraction summary { factCount, skipped, byKind }.
   */
  extractFacts: async ({
    projectId,
    documentIds,
  }: {
    projectId: string;
    documentIds: string[];
  }): Promise<DocintelExtractFactsResult> => {
    const { data, error } = await supabase.functions.invoke("docintel-generate", {
      body: { projectId, documentIds, artifactType: "requirement_facts" },
    });
    if (error) throw new Error(error.message);
    const res = data as Partial<DocintelExtractFactsResult> | null;
    return {
      artifactType: "requirement_facts",
      factCount: res?.factCount ?? 0,
      skipped: res?.skipped ?? 0,
      byKind: res?.byKind ?? {},
    };
  },

  /** Set a fact's review status, stamping reviewer id + reviewed_at. */
  updateFactReview: async (
    factId: string,
    reviewStatus: DocintelFactReviewStatus,
  ): Promise<DocintelRequirementFact> => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("ai_requirement_facts")
      .update({
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userData?.user?.id ?? null,
      })
      .eq("id", factId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as DocintelRequirementFact;
  },

  // ── Traceability ──────────────────────────────────────────────────────────

  /**
   * Assemble the traceability matrix for a document: requirement facts, the set
   * of source page numbers present in the document, and per-artifact citation
   * coverage keyed by page. Ties requirements → source pages → generated
   * artifacts. Reads facts + pages + artifacts + citations in parallel.
   */
  getTraceability: async (
    documentId: string,
    projectId: string,
  ): Promise<DocintelTraceabilityMatrix> => {
    const [facts, pages, artifacts] = await Promise.all([
      docintelApi.getRequirementFacts(documentId),
      docintelApi.listPages(documentId),
      docintelApi.listArtifacts(projectId, documentId),
    ]);

    // Column set: pages that actually exist, plus any page referenced by a fact
    // (defensive — facts should point at real pages, but never drop a reference).
    const pageSet = new Set<number>();
    for (const p of pages) {
      if (typeof p.page_number === "number") pageSet.add(p.page_number);
    }
    for (const f of facts) {
      for (const n of f.source_page_numbers ?? []) {
        if (typeof n === "number") pageSet.add(n);
      }
    }

    // Citation coverage per artifact, keyed by page number.
    const coverage: DocintelArtifactCoverage[] = [];
    if (artifacts.length > 0) {
      const artifactIds = artifacts.map((a) => a.id);
      const { data: citationRows, error: cErr } = await supabase
        .from("ai_artifact_citations")
        .select("artifact_id, page_number")
        .in("artifact_id", artifactIds);
      if (cErr) throw new Error(cErr.message);

      const byArtifact = new Map<string, Record<number, number>>();
      const totalByArtifact = new Map<string, number>();
      for (const row of (citationRows ?? []) as Array<{
        artifact_id: string;
        page_number: number | null;
      }>) {
        if (typeof row.page_number !== "number") continue;
        pageSet.add(row.page_number);
        const map = byArtifact.get(row.artifact_id) ?? {};
        map[row.page_number] = (map[row.page_number] ?? 0) + 1;
        byArtifact.set(row.artifact_id, map);
        totalByArtifact.set(
          row.artifact_id,
          (totalByArtifact.get(row.artifact_id) ?? 0) + 1,
        );
      }

      for (const a of artifacts) {
        coverage.push({
          artifactId: a.id,
          artifactType: String(a.artifact_type),
          title: a.title,
          citationsByPage: byArtifact.get(a.id) ?? {},
          totalCitations: totalByArtifact.get(a.id) ?? 0,
        });
      }
    }

    const pageNumbers = Array.from(pageSet).sort((a, b) => a - b);
    return { pageNumbers, facts, artifacts: coverage };
  },

  /** Resolve one document by its id (processing board, which works by id). */
  getDocumentById: async (
    documentId: string,
  ): Promise<DocintelDocument | null> => {
    const { data, error } = await supabase
      .from("ai_documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as DocintelDocument | null) ?? null;
  },

  /** One document + its pages, fetched together (processing board by id). */
  getDocumentWithPages: async (
    documentId: string,
  ): Promise<{ document: DocintelDocument | null; pages: DocintelPage[] }> => {
    const [document, pages] = await Promise.all([
      docintelApi.getDocumentById(documentId),
      docintelApi.listPages(documentId),
    ]);
    return { document, pages };
  },

  /**
   * Realtime channel for one document — fires `cb` on any change to the
   * document row or its pages. Returns an unsubscribe function.
   */
  subscribeToDocument: (documentId: string, cb: () => void): (() => void) => {
    const channel = supabase
      .channel(`docintel_doc_${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_documents",
          filter: `id=eq.${documentId}`,
        },
        () => cb(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_document_pages",
          filter: `document_id=eq.${documentId}`,
        },
        () => cb(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // ── Knowledge integration: document ↔ entity links (S3) ──────────────────

  /** All links for a document, resolved to key/title, newest first. */
  listDocumentLinks: async (
    documentId: string,
  ): Promise<DocintelResolvedLink[]> => {
    const { data, error } = await db
      .from("ai_document_links")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return resolveLinkTargets((data ?? []) as DocintelDocumentLink[]);
  },

  /**
   * Link a document to an entity. Upsert on the natural key so re-linking an
   * already-linked entity is a no-op (mirrors useLinkPageToWorkItem).
   */
  linkDocument: async (
    documentId: string,
    entityType: DocintelLinkEntityType,
    entityId: string,
    origin: DocintelLinkOrigin = "manual",
  ): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("ai_document_links").upsert(
      {
        document_id: documentId,
        entity_type: entityType,
        entity_id: entityId,
        link_origin: origin,
        created_by: auth?.user?.id ?? null,
      },
      { onConflict: "document_id,entity_type,entity_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  },

  /** Remove one link by its row id. */
  unlinkDocument: async (linkId: string): Promise<void> => {
    const { error } = await db
      .from("ai_document_links")
      .delete()
      .eq("id", linkId);
    if (error) throw new Error(error.message);
  },

  // ── Themes (CAT-DOCINTEL-V2 Slice 5) ──────────────────────────────────
  /** List a project's knowledge themes, alphabetical. */
  listThemes: async (projectId: string): Promise<DocintelTheme[]> => {
    const { data, error } = await db
      .from("docintel_themes")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DocintelTheme[];
  },

  /** Create a theme (slug auto-derived by DB trigger). */
  createTheme: async (
    projectId: string,
    name: string,
    description?: string,
  ): Promise<DocintelTheme> => {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await db
      .from("docintel_themes")
      .insert({
        project_id: projectId,
        name,
        description: description ?? null,
        created_by: auth?.user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as DocintelTheme;
  },

  /** Theme ids tagged on a document. */
  listDocumentThemeIds: async (documentId: string): Promise<string[]> => {
    const { data, error } = await db
      .from("ai_document_themes")
      .select("theme_id")
      .eq("document_id", documentId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ theme_id: string }>).map((r) => r.theme_id);
  },

  /** Document ids tagged with a theme (for filtering the document list). */
  listThemeDocumentIds: async (themeId: string): Promise<string[]> => {
    const { data, error } = await db
      .from("ai_document_themes")
      .select("document_id")
      .eq("theme_id", themeId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<{ document_id: string }>).map((r) => r.document_id);
  },

  /** Tag a document with a theme (idempotent). */
  tagDocumentTheme: async (documentId: string, themeId: string): Promise<void> => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await db.from("ai_document_themes").upsert(
      { document_id: documentId, theme_id: themeId, created_by: auth?.user?.id ?? null },
      { onConflict: "document_id,theme_id", ignoreDuplicates: true },
    );
    if (error) throw new Error(error.message);
  },

  /** Remove a document's theme tag. */
  untagDocumentTheme: async (documentId: string, themeId: string): Promise<void> => {
    const { error } = await db
      .from("ai_document_themes")
      .delete()
      .eq("document_id", documentId)
      .eq("theme_id", themeId);
    if (error) throw new Error(error.message);
  },

  /**
   * Manually trigger the background sync/re-index sweep (docintel-sync) — the
   * on-demand equivalent of the 15-min cron. Budget-bounded server-side.
   */
  triggerReindex: async (): Promise<void> => {
    const { error } = await supabase.functions.invoke("docintel-sync", { body: {} });
    if (error) throw new Error(error.message);
  },
};
