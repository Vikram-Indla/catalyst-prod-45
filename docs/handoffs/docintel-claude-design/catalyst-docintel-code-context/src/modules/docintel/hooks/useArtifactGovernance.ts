/**
 * useArtifactGovernance — React Query mutations for the artifact approval
 * workflow (S8): approve (draft|verified → approved) and reject
 * (draft|verified → rejected + reason).
 *
 * Invalidates the same keys useArtifact / useArtifacts (hooks/useDocintel.tsx)
 * read from: ["docintel", "artifact", artifactId] and the
 * ["docintel", "artifacts", ...] prefix.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveArtifact, rejectArtifact } from "../domain/governance";

function useInvalidateArtifact() {
  const qc = useQueryClient();
  return (artifactId: string) => {
    qc.invalidateQueries({ queryKey: ["docintel", "artifact", artifactId] });
    qc.invalidateQueries({ queryKey: ["docintel", "artifacts"] });
  };
}

/** Approve an artifact (draft|verified → approved). */
export function useApproveArtifact() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: ({ artifactId }: { artifactId: string }) =>
      approveArtifact(artifactId),
    onSuccess: (_data, variables) => invalidate(variables.artifactId),
  });
}

/** Reject an artifact (draft|verified → rejected) with a reviewer reason. */
export function useRejectArtifact() {
  const invalidate = useInvalidateArtifact();
  return useMutation({
    mutationFn: ({
      artifactId,
      reason,
    }: {
      artifactId: string;
      reason: string;
    }) => rejectArtifact(artifactId, reason),
    onSuccess: (_data, variables) => invalidate(variables.artifactId),
  });
}
