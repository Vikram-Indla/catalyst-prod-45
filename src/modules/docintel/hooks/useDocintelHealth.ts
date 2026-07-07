/**
 * useDocintelHealth — read-only project-level Knowledge Health rollup.
 *
 * Aggregates the docintel `ai_*` tables for ONE project into a single health
 * summary: coverage (ready vs total), freshness (last activity + avg pipeline
 * duration), failures (failed docs + open extraction issues), attention
 * (needs_review), reservoir size (embeddings + artifacts + avg grounding),
 * knowledge debt (pending-review facts, draft artifacts, fact conflicts,
 * stale docs) and background-sync status (last ai_sync_runs row + job queue
 * depth) — S6 delta of the Background Knowledge Sync Engine.
 *
 * Strictly read-only — no writes, no schema, no edge-function calls. Every
 * query is RLS-scoped (ph_project_members / project_id), so a caller only ever
 * rolls up projects they can see. Zero-assumption: any value that cannot be
 * computed is returned as null and rendered as an em-dash, never guessed.
 *
 * CAT-DOCINTEL-HEALTH-20260707-001
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { docintelApi } from "../domain";
import type { DocintelDocument } from "../types";

const STALE = 30_000;

/** A document counts as stale when it has not been touched for 30 days. */
const STALE_DOC_MS = 30 * 24 * 60 * 60 * 1000;

/** One ai_sync_runs summary row (docintel-sync background sweep). */
export interface DocintelSyncRun {
  id: string;
  project_id: string | null;
  /** {docs_total, docs_ready, docs_failed, stuck_repaired, retried,
   *  facts_backfilled, conflicts_found} — any key may be absent. */
  counts: Record<string, number> | null;
  status: "ok" | "error" | string;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface DocintelHealthSummary {
  /** Total documents in the project. */
  total: number;
  /** status === "ready". */
  ready: number;
  /** In-flight (queued + any *ing stage). */
  inFlight: number;
  /** status === "needs_review". */
  needsReview: number;
  /** status === "failed" OR a non-empty error_message. */
  failed: number;
  /** ready / total × 100, or null when total === 0. */
  coveragePct: number | null;
  /** Rows in ai_document_embeddings for this project. */
  embeddingCount: number;
  /** Rows in ai_generated_artifacts for this project. */
  artifactCount: number;
  /** Mean grounding_score (0–1) over artifacts that carry one, or null. */
  avgGrounding: number | null;
  /** Unresolved ai_extraction_issues across the project's documents. */
  openIssues: number;
  /** Mean latency_ms.total_ms over docs that recorded one (ms), or null. */
  avgDurationMs: number | null;
  /** Most recent ai_documents.updated_at, or null when no documents. */
  lastActivityAt: string | null;
  /** Documents needing attention — failed first, then needs_review. */
  attentionDocs: DocintelDocument[];
  // ── Knowledge debt (S6) ────────────────────────────────────────────────
  /** ai_requirement_facts with review_status = 'unreviewed'. */
  pendingFacts: number;
  /** ai_generated_artifacts still in status = 'draft' (unverified). */
  draftArtifacts: number;
  /** Unresolved ai_extraction_issues of kind = 'fact_conflict'. */
  factConflicts: number;
  /** Documents whose updated_at is older than 30 days. */
  staleDocs: number;
  // ── Background sync (S6) ──────────────────────────────────────────────
  /** Latest ai_sync_runs row for this project (or the global run), or null
   *  when no sync has ever recorded a run. */
  lastSyncRun: DocintelSyncRun | null;
  /** ai_document_jobs rows in status 'queued' for this project's documents. */
  queuedJobs: number;
  /** ai_document_jobs rows in status 'running' for this project's documents. */
  runningJobs: number;
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

async function loadHealth(projectId: string): Promise<DocintelHealthSummary> {
  // Documents (reuses the canonical list query — same shape as the list page).
  const documents = await docintelApi.listDocuments(projectId);
  const docIds = documents.map((d) => d.id);

  const isFailed = (d: DocintelDocument) =>
    d.status === "failed" || (d.error_message?.trim().length ?? 0) > 0;
  const isInFlight = (d: DocintelDocument) =>
    d.status !== "ready" &&
    d.status !== "failed" &&
    d.status !== "needs_review";

  const ready = documents.filter((d) => d.status === "ready").length;
  const needsReview = documents.filter((d) => d.status === "needs_review").length;
  const failed = documents.filter(isFailed).length;
  const inFlight = documents.filter(isInFlight).length;

  const durations = documents
    .map((d) => d.latency_ms?.total_ms)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const lastActivityAt =
    documents.length === 0
      ? null
      : documents
          .map((d) => d.updated_at)
          .sort()
          .at(-1) ?? null;

  const attentionDocs = [
    ...documents.filter(isFailed),
    ...documents.filter((d) => d.status === "needs_review" && !isFailed(d)),
  ];

  const staleCutoff = Date.now() - STALE_DOC_MS;
  const staleDocs = documents.filter(
    (d) => d.updated_at && new Date(d.updated_at).getTime() < staleCutoff,
  ).length;

  // Reservoir counts + open issues + knowledge debt + sync status, in
  // parallel. Counts use head+exact so no rows are transferred. Guards for
  // the empty-project case.
  const [
    embeddingCount,
    artifacts,
    openIssues,
    pendingFacts,
    factConflicts,
    queuedJobs,
    runningJobs,
    lastSyncRun,
  ] = await Promise.all([
    supabase
      .from("ai_document_embeddings")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .then(({ count, error }) => {
        if (error) throw new Error(error.message);
        return count ?? 0;
      }),
    supabase
      .from("ai_generated_artifacts")
      .select("grounding_score, status")
      .eq("project_id", projectId)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data ?? []) as Array<{
          grounding_score: number | null;
          status: string | null;
        }>;
      }),
    docIds.length === 0
      ? Promise.resolve(0)
      : supabase
          .from("ai_extraction_issues")
          .select("id", { count: "exact", head: true })
          .in("document_id", docIds)
          .or("resolved.is.null,resolved.eq.false")
          .then(({ count, error }) => {
            if (error) throw new Error(error.message);
            return count ?? 0;
          }),
    supabase
      .from("ai_requirement_facts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("review_status", "unreviewed")
      .then(({ count, error }) => {
        if (error) throw new Error(error.message);
        return count ?? 0;
      }),
    docIds.length === 0
      ? Promise.resolve(0)
      : supabase
          .from("ai_extraction_issues")
          .select("id", { count: "exact", head: true })
          .in("document_id", docIds)
          .eq("kind", "fact_conflict")
          .or("resolved.is.null,resolved.eq.false")
          .then(({ count, error }) => {
            if (error) throw new Error(error.message);
            return count ?? 0;
          }),
    docIds.length === 0
      ? Promise.resolve(0)
      : supabase
          .from("ai_document_jobs")
          .select("id", { count: "exact", head: true })
          .in("document_id", docIds)
          .eq("status", "queued")
          .then(({ count, error }) => {
            if (error) throw new Error(error.message);
            return count ?? 0;
          }),
    docIds.length === 0
      ? Promise.resolve(0)
      : supabase
          .from("ai_document_jobs")
          .select("id", { count: "exact", head: true })
          .in("document_id", docIds)
          .eq("status", "running")
          .then(({ count, error }) => {
            if (error) throw new Error(error.message);
            return count ?? 0;
          }),
    // Latest sync run: this project's row or the global (project_id NULL)
    // heartbeat row, whichever is newest. "No sync yet" is a legitimate state
    // (zero-assumption) — an error here also degrades to null rather than
    // sinking the whole health page, since ai_sync_runs ships with the sync
    // engine and may lag the rest of the schema on an environment.
    supabase
      .from("ai_sync_runs")
      .select("id, project_id, counts, status, error_message, started_at, finished_at")
      .or(`project_id.eq.${projectId},project_id.is.null`)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return null;
        return (data as DocintelSyncRun | null) ?? null;
      }),
  ]);

  const groundingScores = artifacts
    .map((a) => a.grounding_score)
    .filter((v): v is number => typeof v === "number");
  const draftArtifacts = artifacts.filter((a) => a.status === "draft").length;

  return {
    total: documents.length,
    ready,
    inFlight,
    needsReview,
    failed,
    coveragePct: documents.length === 0 ? null : (ready / documents.length) * 100,
    embeddingCount,
    artifactCount: artifacts.length,
    avgGrounding: mean(groundingScores),
    openIssues,
    avgDurationMs: mean(durations),
    lastActivityAt,
    attentionDocs,
    pendingFacts,
    draftArtifacts,
    factConflicts,
    staleDocs,
    lastSyncRun,
    queuedJobs,
    runningJobs,
  };
}

/** Project-level Knowledge Health rollup. Read-only; RLS-scoped. */
export function useDocintelHealth(projectId: string | undefined) {
  return useQuery({
    queryKey: ["docintel", "health", projectId ?? ""],
    queryFn: () => loadHealth(projectId!),
    enabled: !!projectId,
    staleTime: STALE,
  });
}
