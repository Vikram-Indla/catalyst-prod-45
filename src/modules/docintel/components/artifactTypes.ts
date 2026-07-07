/**
 * Artifact type registry — the generation menu + display labels.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import type { DocintelArtifactType } from "../types";

export interface ArtifactTypeOption {
  value: DocintelArtifactType;
  /** Label shown in the generation button group. */
  label: string;
  /** Right-to-left label (Arabic artifacts). */
  arabic?: boolean;
}

export const ARTIFACT_TYPES: ArtifactTypeOption[] = [
  { value: "summary_en", label: "Executive Summary" },
  { value: "summary_ar", label: "الملخص", arabic: true },
  { value: "epic", label: "Epic" },
  { value: "story", label: "User Stories" },
  { value: "brd", label: "Full BRD" },
  { value: "gap_analysis", label: "Gap Analysis" },
  { value: "open_questions", label: "Open Questions" },
];

export const ARTIFACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ARTIFACT_TYPES.map((t) => [t.value, t.label]),
);

/** True when the artifact's rendered content is Arabic (right-to-left). */
export function isArabicArtifact(type: string): boolean {
  return type === "summary_ar";
}
