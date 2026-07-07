/**
 * useDocintelHealth — read-only project-level Knowledge Health rollup.
 *
 * Aggregates the docintel `ai_*` tables for ONE project into a single health
 * summary: coverage (ready vs total), freshness (last activity + avg pipeline
 * duration), failures (failed docs + open extraction issues), attention
 * (needs_review), and reservoir size (embeddings + artifacts + avg grounding).
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

  // Reservoir counts + open issues, in parallel. Counts use head+exact so no
  // rows are transferred. Guards for the empty-project case.
  const [embeddingCount, artifacts, openIssues] = await Promise.all([
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
      .select("grounding_score")
      .eq("project_id", projectId)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data ?? []) as Array<{ grounding_score: number | null }>;
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
  ]);

  const groundingScores = artifacts
    .map((a) => a.grounding_score)
    .filter((v): v is number => typeof v === "number");

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
