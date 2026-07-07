/**
 * useDocintelDocumentBySlug — house slug-hook convention wrapper.
 *
 * Resolves an ai_documents row by its frozen slug. Thin re-query over
 * docintelApi.getDocumentBySlug so slug resolution stays consistent with the
 * other useXBySlug hooks.
 */
import { useQuery } from "@tanstack/react-query";
import { docintelApi } from "@/modules/docintel/domain";

export function useDocintelDocumentBySlug(slug: string | undefined | null) {
  return useQuery({
    queryKey: ["docintel-document-by-slug", slug],
    enabled: !!slug,
    queryFn: () => docintelApi.getDocumentBySlug(slug!),
  });
}
