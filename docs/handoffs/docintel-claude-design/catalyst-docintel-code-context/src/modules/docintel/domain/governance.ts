/**
 * docintel/domain/governance — S8 security/governance data layer.
 *
 * Export audit + artifact approval workflow. Deliberately separate from
 * domain/index.ts (owned by another slice this wave):
 *
 *  - logDocumentExport: calls the docintel_log_export RPC
 *    (20260707140000_docintel_governance.sql). SECURITY DEFINER — verifies the
 *    caller is a member of the document's project, then appends an 'export'
 *    row to the immutable ai_docintel_audit_events ledger. Throws for
 *    non-members; callers MUST block the export when this throws.
 *
 *  - approveArtifact / rejectArtifact: status transitions on
 *    ai_generated_artifacts. Allowed: draft|verified → approved,
 *    draft|verified → rejected (+ rejection_reason). The transition guard is
 *    enforced in the UPDATE's WHERE clause so a stale client can never
 *    overwrite promoted/rejected/approved states. The audit trail comes free
 *    via the existing trg_ai_generated_artifacts_audit trigger (20260707031000,
 *    fires on UPDATE).
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { supabase } from "@/integrations/supabase/client";

// ai_generated_artifacts + docintel_log_export postdate the generated Supabase
// types in this repo; same untyped escape hatch as domain/index.ts.
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ error: { message: string } | null }>;
};

export type DocintelExportFormat = "pdf" | "html";

/** Statuses an artifact may transition FROM into approved/rejected. */
const REVIEWABLE_STATUSES = ["draft", "verified"] as const;

/**
 * Audit-log a document export (and gate it on project membership).
 * Throws when the caller is not a member of the document's project — the
 * export itself must not run in that case.
 */
export async function logDocumentExport(
  documentId: string,
  format: DocintelExportFormat,
): Promise<void> {
  const { error } = await db.rpc("docintel_log_export", {
    p_document_id: documentId,
    p_format: format,
  });
  if (error) throw new Error(error.message);
}

/**
 * Approve an artifact: draft|verified → approved.
 * Throws when the artifact is not in a reviewable state (already approved,
 * rejected, promoted, or missing/inaccessible).
 */
export async function approveArtifact(artifactId: string): Promise<void> {
  const { data, error } = await db
    .from("ai_generated_artifacts")
    .update({ status: "approved" })
    .eq("id", artifactId)
    .in("status", [...REVIEWABLE_STATUSES])
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Artifact could not be approved — it is not in a draft or verified state.",
    );
  }
}

/**
 * Reject an artifact: draft|verified → rejected, storing the reviewer's
 * reason in rejection_reason (20260707140000_docintel_governance.sql).
 * Throws when the artifact is not in a reviewable state.
 */
export async function rejectArtifact(
  artifactId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  const { data, error } = await db
    .from("ai_generated_artifacts")
    .update({ status: "rejected", rejection_reason: trimmed || null })
    .eq("id", artifactId)
    .in("status", [...REVIEWABLE_STATUSES])
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      "Artifact could not be rejected — it is not in a draft or verified state.",
    );
  }
}
