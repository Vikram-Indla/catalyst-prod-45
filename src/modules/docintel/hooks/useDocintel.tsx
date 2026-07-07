/**
 * docintel/hooks — React Query hooks for Arabic Document Intelligence.
 *
 * useDocintelDocument subscribes to Realtime and invalidates the document +
 * pages cache on any change, so the upload wizard's Processing step and the
 * workspace stay live as the pipeline advances.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalystToast } from "@/lib/catalystToast";
import { docintelApi } from "../domain";
import type {
  DocintelArtifactType,
  DocintelEvidence,
  DocintelExtractFactsResult,
  DocintelFactReviewStatus,
  DocintelIngestResult,
} from "../types";

const STALE = 30_000;

export interface DocintelProjectOption {
  id: string;
  key: string;
  name: string;
}

/**
 * The projects the current user is a member of (ph_project_members → ph_projects).
 * Powers the project selector on the documents + upload pages, since ai_documents
 * are project-scoped and there is no ambient project context here.
 */
export function useDocintelProjects(userId: string | undefined) {
  return useQuery({
    queryKey: ["docintel", "projects", userId ?? ""],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DocintelProjectOption[]> => {
      const { data, error } = await supabase
        .from("ph_project_members")
        .select("project_id, ph_projects!inner(id, key, name)")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Array<{
        ph_projects: { id: string; key: string; name: string } | null;
      }>;
      return rows
        .map((r) => r.ph_projects)
        .filter((p): p is DocintelProjectOption => !!p)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

const keys = {
  list: (projectId: string) => ["docintel", "list", projectId] as const,
  doc: (slug: string) => ["docintel", "doc", slug] as const,
  pages: (documentId: string) => ["docintel", "pages", documentId] as const,
  evidence: (documentId: string) => ["docintel", "evidence", documentId] as const,
  formatted: (documentId: string) =>
    ["docintel", "formatted", documentId] as const,
  artifacts: (projectId: string, documentId: string) =>
    ["docintel", "artifacts", projectId, documentId] as const,
  artifact: (artifactId: string) => ["docintel", "artifact", artifactId] as const,
  facts: (documentId: string) => ["docintel", "facts", documentId] as const,
  traceability: (documentId: string, projectId: string) =>
    ["docintel", "traceability", documentId, projectId] as const,
};

/** All documents for a project. */
export function useDocintelDocuments(projectId: string | undefined) {
  return useQuery({
    queryKey: keys.list(projectId ?? ""),
    queryFn: () => docintelApi.listDocuments(projectId!),
    enabled: !!projectId,
    staleTime: STALE,
  });
}

/**
 * One document by slug + its pages, kept live via Realtime. Any change to the
 * document row or its pages invalidates both queries.
 */
export function useDocintelDocument(slug: string | undefined) {
  const qc = useQueryClient();

  const docQuery = useQuery({
    queryKey: keys.doc(slug ?? ""),
    queryFn: () => docintelApi.getDocumentBySlug(slug!),
    enabled: !!slug,
    staleTime: STALE,
  });

  const documentId = docQuery.data?.id;

  const pagesQuery = useQuery({
    queryKey: keys.pages(documentId ?? ""),
    queryFn: () => docintelApi.listPages(documentId!),
    enabled: !!documentId,
    staleTime: STALE,
  });

  useEffect(() => {
    if (!documentId || !slug) return;
    const unsubscribe = docintelApi.subscribeToDocument(documentId, () => {
      qc.invalidateQueries({ queryKey: keys.doc(slug) });
      qc.invalidateQueries({ queryKey: keys.pages(documentId) });
    });
    return unsubscribe;
  }, [documentId, slug, qc]);

  return {
    document: docQuery.data ?? null,
    pages: pagesQuery.data ?? [],
    isLoading: docQuery.isLoading,
    isError: docQuery.isError,
    error: docQuery.error,
  };
}

/**
 * Upload + ingest mutation with per-file progress. `progress` maps file name →
 * 0-100. Toasts on success / error.
 */
export function useDocintelUpload() {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<Record<string, number>>({});

  const mutation = useMutation({
    mutationFn: ({ projectId, files }: { projectId: string; files: File[] }) =>
      docintelApi.uploadAndIngest({
        projectId,
        files,
        onProgress: (fileName, pct) =>
          setProgress((prev) => ({ ...prev, [fileName]: pct })),
      }),
    onSuccess: (results: DocintelIngestResult[], variables) => {
      qc.invalidateQueries({ queryKey: keys.list(variables.projectId) });
      catalystToast.success(
        "Upload started",
        `${results.length} document${results.length === 1 ? "" : "s"} processing`,
      );
    },
    onError: (err: unknown) => {
      catalystToast.error(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload documents",
      );
    },
  });

  return { ...mutation, progress, setProgress };
}

/**
 * One document + its pages BY id, kept live via Realtime. Unlike
 * useDocintelDocument (which resolves by slug), this drives the processing
 * board straight off the ingest result's documentId — no slug round-trip, so
 * the board goes live the instant docintel-ingest returns.
 */
export function useDocumentRealtime(documentId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["docintel", "doc-live", documentId ?? ""],
    queryFn: () => docintelApi.getDocumentWithPages(documentId!),
    enabled: !!documentId,
    staleTime: STALE,
  });

  useEffect(() => {
    if (!documentId) return;
    const unsubscribe = docintelApi.subscribeToDocument(documentId, () => {
      qc.invalidateQueries({ queryKey: ["docintel", "doc-live", documentId] });
    });
    return unsubscribe;
  }, [documentId, qc]);

  return {
    document: query.data?.document ?? null,
    pages: query.data?.pages ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Evidence
// ───────────────────────────────────────────────────────────────────────────

/**
 * All evidence for one document (pages + blocks + tables + images + issues),
 * assembled in parallel. Used by the Evidence tab.
 */
export function useDocumentEvidence(documentId: string | undefined) {
  return useQuery({
    queryKey: keys.evidence(documentId ?? ""),
    enabled: !!documentId,
    staleTime: STALE,
    queryFn: async (): Promise<DocintelEvidence> => {
      const id = documentId!;
      const [pages, blocks, tables, images, issues] = await Promise.all([
        docintelApi.getDocumentPages(id),
        docintelApi.getPageBlocks(id),
        docintelApi.getDocumentTables(id),
        docintelApi.getDocumentImages(id),
        docintelApi.getExtractionIssues(id),
      ]);
      return { pages, blocks, tables, images, issues };
    },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Formatted (translated) document
// ───────────────────────────────────────────────────────────────────────────

/**
 * The structure-faithful, translated document for one document id — the
 * document row plus ordered render elements (headings/paragraphs/lists/tables
 * in reading order). Powers the "Document" tab / TranslatedDocumentView.
 */
export function useFormattedDocument(documentId: string | undefined) {
  return useQuery({
    queryKey: keys.formatted(documentId ?? ""),
    queryFn: () => docintelApi.getFormattedDocument(documentId!),
    enabled: !!documentId,
    staleTime: STALE,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Generation
// ───────────────────────────────────────────────────────────────────────────

/** Previously generated artifacts for a document within a project. */
export function useArtifacts(
  projectId: string | undefined,
  documentId: string | undefined,
) {
  return useQuery({
    queryKey: keys.artifacts(projectId ?? "", documentId ?? ""),
    queryFn: () => docintelApi.listArtifacts(projectId!, documentId!),
    enabled: !!projectId && !!documentId,
    staleTime: STALE,
  });
}

/** One artifact + its citations. */
export function useArtifact(artifactId: string | undefined) {
  return useQuery({
    queryKey: keys.artifact(artifactId ?? ""),
    queryFn: () => docintelApi.getArtifactWithCitations(artifactId!),
    enabled: !!artifactId,
    staleTime: STALE,
  });
}

/**
 * Generate an artifact. Invalidates the artifacts list for the document on
 * success. Toasts on success / error.
 */
export function useGenerateArtifact() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      projectId: string;
      documentIds: string[];
      artifactType: DocintelArtifactType;
      title?: string;
    }) => docintelApi.generateArtifact(input),
    onSuccess: (_result, variables) => {
      for (const documentId of variables.documentIds) {
        qc.invalidateQueries({
          queryKey: keys.artifacts(variables.projectId, documentId),
        });
      }
      catalystToast.success("Artifact generated", "Ready to review");
    },
    onError: (err: unknown) => {
      catalystToast.error(
        "Generation failed",
        err instanceof Error ? err.message : "Could not generate the artifact",
      );
    },
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Requirement facts + traceability
// ───────────────────────────────────────────────────────────────────────────

/** Requirement facts for a document (Facts tab), grouped by kind. */
export function useRequirementFacts(documentId: string | undefined) {
  return useQuery({
    queryKey: keys.facts(documentId ?? ""),
    queryFn: () => docintelApi.getRequirementFacts(documentId!),
    enabled: !!documentId,
    staleTime: STALE,
  });
}

/**
 * Extract requirement facts via docintel-generate. Invalidates the facts +
 * traceability queries on success. Toasts the extraction summary.
 */
export function useExtractFacts() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { projectId: string; documentIds: string[] }) =>
      docintelApi.extractFacts(input),
    onSuccess: (result: DocintelExtractFactsResult, variables) => {
      for (const documentId of variables.documentIds) {
        qc.invalidateQueries({ queryKey: keys.facts(documentId) });
        qc.invalidateQueries({
          queryKey: keys.traceability(documentId, variables.projectId),
        });
      }
      catalystToast.success(
        `${result.factCount} fact${result.factCount === 1 ? "" : "s"} extracted`,
        result.skipped > 0
          ? `${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped`
          : "Ready to review",
      );
    },
    onError: (err: unknown) => {
      catalystToast.error(
        "Extraction failed",
        err instanceof Error ? err.message : "Could not extract facts",
      );
    },
  });
}

/** Set a fact's review status. Invalidates the facts query. Toasts on error. */
export function useUpdateFactReview(documentId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      factId: string;
      reviewStatus: DocintelFactReviewStatus;
    }) => docintelApi.updateFactReview(input.factId, input.reviewStatus),
    onSuccess: () => {
      if (documentId) {
        qc.invalidateQueries({ queryKey: keys.facts(documentId) });
      }
    },
    onError: (err: unknown) => {
      catalystToast.error(
        "Could not update review",
        err instanceof Error ? err.message : "Please try again",
      );
    },
  });
}

/** Assembled traceability matrix for a document (Traceability tab). */
export function useTraceability(
  documentId: string | undefined,
  projectId: string | undefined,
) {
  return useQuery({
    queryKey: keys.traceability(documentId ?? "", projectId ?? ""),
    queryFn: () => docintelApi.getTraceability(documentId!, projectId!),
    enabled: !!documentId && !!projectId,
    staleTime: STALE,
  });
}
