/**
 * docintel/types.ts — TS types mirroring the ai_documents / ai_document_pages /
 * ai_document_jobs schema (Arabic Document Intelligence).
 */

export type DocintelStatus =
  | "queued"
  | "ingesting"
  | "extracting"
  | "describing"
  | "translating"
  | "chunking"
  | "embedding"
  | "structuring"
  | "ready"
  | "failed"
  | "needs_review";

export type DocintelPageStatus =
  | "pending"
  | "extracting"
  | "extracted"
  | "described"
  | "failed";

export type DocintelJobStage =
  | "ingest"
  | "extract"
  | "describe"
  | "translate"
  | "chunk"
  | "embed"
  | "structure";

export type DocintelJobStatus = "queued" | "running" | "done" | "failed" | "dead";

/** Per-stage durations in ms, keyed by stage name (+ total_ms). */
export type DocintelLatency = Record<string, number> & {
  total_ms?: number;
};

/**
 * Persisted source identity. Known adapters are listed for presentation, but
 * the database deliberately permits future source types; callers must render
 * an unknown returned value rather than silently calling it a document.
 */
export type DocintelSourceType =
  | "document"
  | "jira"
  | "git"
  | "markdown"
  | (string & {});

export interface DocintelDocument {
  id: string;
  project_id: string;
  slug: string | null;
  title: string;
  source_type?: DocintelSourceType | null;
  original_file_name: string;
  mime_type: string;
  storage_path: string;
  file_size: number | null;
  page_count: number | null;
  source_language: string | null;
  status: DocintelStatus;
  status_detail: string | null;
  latency_ms: DocintelLatency | null;
  content_hash: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocintelPage {
  id: string;
  document_id: string;
  page_number: number;
  is_scanned: boolean | null;
  render_path: string | null;
  ocr_confidence: number | null;
  status: DocintelPageStatus;
  error_message: string | null;
}

export interface DocintelJob {
  id: string;
  document_id: string;
  page_number: number | null;
  stage: DocintelJobStage;
  status: DocintelJobStatus;
  attempts: number;
  priority: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

/** One file staged for upload (client-side, pre-ingest). */
export interface DocintelUploadFile {
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  title?: string;
}

/** docintel-ingest response row — a created (or re-ingested) document. */
export interface DocintelIngestCreated {
  documentId: string;
  slug: string | null;
  pageCount: number | null;
  duplicate?: undefined;
}

/**
 * docintel-ingest response row — the file's byte hash matched an existing
 * non-failed document in the project, so nothing was created.
 */
export interface DocintelIngestDuplicate {
  duplicate: true;
  fileName: string | null;
  existing: { id: string; slug: string | null; title: string | null };
}

/** docintel-ingest response row (per-file union). */
export type DocintelIngestResult = DocintelIngestCreated | DocintelIngestDuplicate;

/** One row of ai_document_versions (immutable re-upload history). */
export interface DocintelDocumentVersion {
  id: string;
  document_id: string;
  version_no: number;
  storage_path: string | null;
  content_hash: string | null;
  created_by: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Evidence: blocks, tables, images, extraction issues
// ---------------------------------------------------------------------------

export type DocintelBlockKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "table"
  | "image"
  | "caption"
  | "footnote"
  | "other";

export interface DocintelBlock {
  id: string;
  page_id: string;
  document_id: string;
  block_index: number;
  kind: DocintelBlockKind | string;
  lang: string | null;
  confidence: number | null;
  extraction_source: string | null;
  text_ar: string | null;
  text_en: string | null;
  table_id: string | null;
  image_id: string | null;
  /** Joined from ai_document_pages for reading order across the document. */
  page_number?: number | null;
}

export interface DocintelTable {
  id: string;
  page_id: string;
  header_rows: string[][] | null;
  rows: string[][] | null;
  summary_ar: string | null;
  summary_en: string | null;
  confidence: number | null;
}

export interface DocintelImage {
  id: string;
  page_id: string;
  kind: string | null;
  caption_ar: string | null;
  caption_en: string | null;
  description_en: string | null;
  confidence: number | null;
}

export type DocintelIssueSeverity = "info" | "warning" | "error" | string;

export interface DocintelExtractionIssue {
  id: string;
  document_id: string;
  page_id: string | null;
  block_id: string | null;
  kind: string;
  severity: DocintelIssueSeverity;
  detail: string | null;
  resolved: boolean | null;
}

/** Everything the Evidence viewer needs for one document, assembled. */
export interface DocintelEvidence {
  pages: DocintelPage[];
  blocks: DocintelBlock[];
  tables: DocintelTable[];
  images: DocintelImage[];
  issues: DocintelExtractionIssue[];
}

// ---------------------------------------------------------------------------
// Generation: artifacts + citations
// ---------------------------------------------------------------------------

// Canonical keys — MUST match the docintel-generate edge function + the
// ai_generated_artifacts.artifact_type CHECK constraint (summary_en/summary_ar/
// story, not executive_summary/arabic_summary/user_stories).
export type DocintelArtifactType =
  | "summary_en"
  | "summary_ar"
  | "epic"
  | "story"
  | "brd"
  | "gap_analysis"
  | "open_questions";

// DB truth (ai_generated_artifacts.status CHECK, 20260707030000 +
// 20260707140000): draft | verified | approved | rejected | promoted.
// The generating/ready/failed/needs_review members are legacy UI states kept
// for older comparisons; the union stays open via `| string`.
export type DocintelArtifactStatus =
  | "draft"
  | "verified"
  | "approved"
  | "rejected"
  | "promoted"
  | "generating"
  | "ready"
  | "failed"
  | "needs_review"
  | string;

/**
 * One promotable work item inside an epic/story artifact's `content.items`
 * array (contract: docintel-generate writes this for epic/user_stories
 * artifacts). `kind` decides the target work-type (Epic vs Story).
 */
export interface DocintelArtifactItem {
  title: string;
  description_md: string;
  kind: "epic" | "story";
  acceptance_criteria?: string[];
}

/**
 * Shape of `ai_generated_artifacts.content` (jsonb) as far as the promotion
 * flow reads it. Older artifacts (or non-epic/story types) may not carry
 * `items` — the reader falls back to a single item then.
 */
export interface DocintelArtifactContent {
  items?: DocintelArtifactItem[];
  [key: string]: unknown;
}

export interface DocintelArtifact {
  id: string;
  project_id: string;
  document_ids: string[] | null;
  artifact_type: DocintelArtifactType | string;
  title: string | null;
  content: DocintelArtifactContent | null;
  content_md: string | null;
  grounding_score: number | null;
  status: DocintelArtifactStatus;
  /**
   * ph_work_items.id of the first work item created when this artifact was
   * promoted. Null until promotion. Set alongside status='promoted'.
   */
  promoted_work_item_id?: string | null;
  /**
   * Reviewer-entered reason captured when the artifact was rejected
   * (status='rejected'; 20260707140000_docintel_governance.sql). Null/absent
   * otherwise.
   */
  rejection_reason?: string | null;
  created_at: string;
}

export interface DocintelCitation {
  id: string;
  artifact_id: string;
  claim_text: string | null;
  document_id: string | null;
  page_number: number | null;
  block_id: string | null;
  quoted_text: string | null;
  confidence: number | null;
}

/** One artifact plus its citation rows. */
export interface DocintelArtifactWithCitations {
  artifact: DocintelArtifact;
  citations: DocintelCitation[];
}

// ---------------------------------------------------------------------------
// Promotion recovery: persisted only when existing work needs a follow-up
// ---------------------------------------------------------------------------

/** A work item already created during a promotion; recovery never recreates it. */
export interface DocintelPromotionCreatedWork {
  id: string;
  item_key: string;
  title: string;
  kind: "epic" | "story";
}

/** One remaining document → existing-work provenance link. */
export interface DocintelPromotionPendingLink {
  document_id: string;
  work_item_id: string;
  work_kind: "epic" | "story";
}

export type DocintelPromotionRecoveryState = "partial" | "complete";

/**
 * Project-scoped recovery row for a promotion that created work but did not
 * finish marking the artifact and/or linking all source evidence.
 */
export interface DocintelPromotionRecovery {
  id: string;
  project_id: string;
  artifact_id: string;
  created_work_items: DocintelPromotionCreatedWork[];
  create_failures: string[];
  pending_links: DocintelPromotionPendingLink[];
  artifact_status_pending: boolean;
  state: DocintelPromotionRecoveryState;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Input for the partial-state upsert; completion has its own explicit API. */
export interface DocintelPromotionRecoveryUpsert {
  projectId: string;
  artifactId: string;
  createdWorkItems: DocintelPromotionCreatedWork[];
  createFailures: string[];
  pendingLinks: DocintelPromotionPendingLink[];
  artifactStatusPending: boolean;
}

/** docintel-generate (non-streaming) response. */
export interface DocintelGenerateResult {
  artifactId: string;
  groundingScore: number | null;
  citationCount: number | null;
  status: DocintelArtifactStatus;
  content_md: string | null;
}

// ---------------------------------------------------------------------------
// Knowledge integration: document ↔ work item / Folio links (S3)
// ---------------------------------------------------------------------------

/**
 * Entity kinds a Doc Intel document can link to — mirrors the
 * ai_document_links.entity_type CHECK constraint. 'document' = a Folio
 * (kb_documents) page; the rest are Catalyst work-item families.
 */
export type DocintelLinkEntityType =
  | "business_request"
  | "epic"
  | "feature"
  | "story"
  | "task"
  | "defect"
  | "incident"
  | "test_case"
  | "release"
  | "change"
  | "document";

export type DocintelLinkOrigin = "manual" | "promotion" | "mention";

/** One row of ai_document_links. */
export interface DocintelDocumentLink {
  id: string;
  document_id: string;
  entity_type: DocintelLinkEntityType | string;
  entity_id: string;
  link_origin: DocintelLinkOrigin | string;
  created_by: string | null;
  created_at: string;
}

/** A knowledge theme — a user-created, browsable grouping of documents (Slice 5). */
export interface DocintelTheme {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A link joined with its resolved target — key/title looked up from the
 * canonical table for the entity_type (ph_issues / ph_work_items /
 * business_requests / tm_test_cases / rh_releases / rh_changes /
 * kb_documents). All resolution fields are null when the target row is
 * missing or unreadable — zero-assumption rendering falls back to the raw id.
 */
export interface DocintelResolvedLink extends DocintelDocumentLink {
  /** Display key, e.g. BAU-5389, BR key, DOC-12, CHG number, case key. */
  entity_key: string | null;
  /** Display title/summary of the target entity. */
  entity_title: string | null;
  /** Work-item type string for JiraIssueTypeIcon (work items only). */
  entity_icon_type: string | null;
  /** Folio navigation slugs (entity_type='document' only). */
  folio_space_slug: string | null;
  folio_page_slug: string | null;
}

// ---------------------------------------------------------------------------
// Ask: grounded Q&A over the corpus
// ---------------------------------------------------------------------------

/** One citation backing an [E<n>] marker in an Ask answer (docintel-ask). */
export interface DocintelAskCitation {
  /** The [E<n>] evidence index this citation backs. */
  marker: number;
  document_id: string;
  document_title: string | null;
  page_number: number | null;
  block_id: string | null;
  quoted_text: string | null;
  snippet: string | null;
  /** ai_documents.updated_at of the cited document (source freshness). */
  document_updated_at: string | null;
}

/** Freshness of the sources behind an Ask answer. */
export interface DocintelAskFreshness {
  latest_source_at: string | null;
  oldest_source_at: string | null;
}

/** docintel-ask (non-streaming) response. */
export interface DocintelAskResult {
  answer_md: string;
  citations: DocintelAskCitation[];
  confidence: number | null;
  evidence_count: number;
  freshness: DocintelAskFreshness | null;
}

// ---------------------------------------------------------------------------
// Requirement facts + traceability
// ---------------------------------------------------------------------------

export type DocintelFactKind =
  | "capability"
  | "actor"
  | "workflow"
  | "requirement"
  | "constraint"
  | "risk"
  | "assumption"
  | "open_question";

export type DocintelFactReviewStatus =
  | "unreviewed"
  | "confirmed"
  | "rejected";

/** One row of ai_requirement_facts. */
export interface DocintelRequirementFact {
  id: string;
  document_id: string;
  project_id: string;
  kind: DocintelFactKind | string;
  statement_ar: string | null;
  statement_en: string | null;
  confidence: number | null;
  source_block_ids: string[] | null;
  source_page_numbers: number[] | null;
  review_status: DocintelFactReviewStatus | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/** docintel-generate requirement_facts extraction response. */
export interface DocintelExtractFactsResult {
  artifactType: "requirement_facts";
  factCount: number;
  skipped: number;
  byKind: Record<string, number>;
}

/**
 * Per-artifact coverage over a page — how many of the artifact's citations
 * point at that page number.
 */
export interface DocintelArtifactCoverage {
  artifactId: string;
  artifactType: string;
  title: string | null;
  /** page_number → citation count. */
  citationsByPage: Record<number, number>;
  /** Total citation count across all pages. */
  totalCitations: number;
}

/**
 * Assembled traceability matrix: requirement facts (rows) mapped onto the
 * document's source pages (columns), plus per-artifact page coverage that ties
 * requirements → source pages → generated artifacts.
 */
export interface DocintelTraceabilityMatrix {
  /** Ordered page numbers present in the document. */
  pageNumbers: number[];
  facts: DocintelRequirementFact[];
  artifacts: DocintelArtifactCoverage[];
}

// ---------------------------------------------------------------------------
// Formatted (translated) document — structure-faithful reproduction
// ---------------------------------------------------------------------------

/**
 * Normalised element kind for the formatted document renderer. Maps the raw
 * ai_document_blocks.kind (which varies — heading|paragraph|list_item|table|
 * image|caption|footnote|footer|header|other) onto a small, render-stable set.
 */
export type DocintelElementKind =
  | "heading"
  | "paragraph"
  | "list_item"
  | "table"
  | "caption"
  | "chrome"; // header/footer/footnote noise — kept but flagged

/**
 * One element of the formatted document, in reading order (page asc, then
 * block_index asc). Carries both languages so the renderer can show EN, AR, or
 * both. `table` is populated only for kind === "table".
 */
export interface DocintelRenderElement {
  /** Stable key — the source block id (or a synthesised id for orphan tables). */
  id: string;
  /** 1-based page number this element belongs to. */
  page: number;
  /** Normalised kind driving the HTML mapping. */
  kind: DocintelElementKind;
  /** Original raw block kind, for diagnostics. */
  rawKind: string;
  /** English text (may be null/empty). */
  text_en: string | null;
  /** Arabic text (may be null/empty). */
  text_ar: string | null;
  /** Populated only when kind === "table". */
  table?: DocintelTable;
  /**
   * True for header/footer/footnote chrome — the renderer may de-emphasise or
   * hide these. Kept in the array so nothing is silently dropped.
   */
  isChrome: boolean;
}

/** The full formatted document: the document row + ordered render elements. */
export interface DocintelFormattedDocument {
  document: DocintelDocument;
  elements: DocintelRenderElement[];
}
