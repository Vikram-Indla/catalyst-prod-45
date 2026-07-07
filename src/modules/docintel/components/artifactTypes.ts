/**
 * Artifact type registry — the generation menu + display labels.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import type { DocintelArtifactType } from "../types";

/**
 * Generated-artifact keys accepted by docintel-generate. Superset of
 * DocintelArtifactType (types.ts) with the S4 grounded types — MUST match the
 * edge function's ARTIFACT_TYPES + the ai_generated_artifacts.artifact_type
 * CHECK constraint.
 */
export type DocintelGeneratedArtifactType =
  | DocintelArtifactType
  | "business_process"
  | "acceptance_criteria"
  | "test_cases"
  | "release_notes"
  | "traceability";

export interface ArtifactTypeOption {
  value: DocintelGeneratedArtifactType;
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
  { value: "business_process", label: "Business Process" },
  { value: "acceptance_criteria", label: "Acceptance Criteria" },
  { value: "test_cases", label: "Test Cases" },
  { value: "release_notes", label: "Release Notes" },
  { value: "traceability", label: "Traceability Matrix" },
];

export const ARTIFACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ARTIFACT_TYPES.map((t) => [t.value, t.label]),
);

/** True when the artifact's rendered content is Arabic (right-to-left). */
export function isArabicArtifact(type: string): boolean {
  return type === "summary_ar";
}
