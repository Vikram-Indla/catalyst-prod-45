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
  /** Customer-facing explanation; does not change the generation contract. */
  description: string;
  /** Presentation-only customer outcome group. */
  outcome: ArtifactOutcomeGroupId;
  /** Right-to-left label (Arabic artifacts). */
  arabic?: boolean;
}

export type ArtifactOutcomeGroupId =
  | "understand"
  | "plan_delivery"
  | "validate_ship";

export interface ArtifactOutcomeGroup {
  id: ArtifactOutcomeGroupId;
  label: string;
  description: string;
}

export const ARTIFACT_OUTCOME_GROUPS: ArtifactOutcomeGroup[] = [
  {
    id: "understand",
    label: "Understand",
    description: "Summarize the source and surface gaps or unanswered questions.",
  },
  {
    id: "plan_delivery",
    label: "Plan delivery",
    description: "Shape the source into business and product delivery outputs.",
  },
  {
    id: "validate_ship",
    label: "Validate and ship",
    description: "Prepare validation, traceability and release outputs.",
  },
];

export const ARTIFACT_TYPES: ArtifactTypeOption[] = [
  {
    value: "summary_en",
    label: "Executive Summary",
    description: "A concise English overview of the source.",
    outcome: "understand",
  },
  {
    value: "summary_ar",
    label: "الملخص",
    description: "A concise Arabic overview of the source.",
    outcome: "understand",
    arabic: true,
  },
  {
    value: "gap_analysis",
    label: "Gap Analysis",
    description: "Gaps, inconsistencies and missing information.",
    outcome: "understand",
  },
  {
    value: "open_questions",
    label: "Open Questions",
    description: "Questions that still require human answers.",
    outcome: "understand",
  },
  {
    value: "brd",
    label: "Full BRD",
    description: "A structured business requirements document.",
    outcome: "plan_delivery",
  },
  {
    value: "epic",
    label: "Epic",
    description: "Epic-level delivery scope derived from the source.",
    outcome: "plan_delivery",
  },
  {
    value: "story",
    label: "User Stories",
    description: "User stories derived from the source.",
    outcome: "plan_delivery",
  },
  {
    value: "business_process",
    label: "Business Process",
    description: "Process steps and actors represented from the source.",
    outcome: "plan_delivery",
  },
  {
    value: "acceptance_criteria",
    label: "Acceptance Criteria",
    description: "Testable acceptance conditions.",
    outcome: "validate_ship",
  },
  {
    value: "test_cases",
    label: "Test Cases",
    description: "Test scenarios and expected outcomes.",
    outcome: "validate_ship",
  },
  {
    value: "traceability",
    label: "Traceability Matrix",
    description: "Requirements mapped to source evidence.",
    outcome: "validate_ship",
  },
  {
    value: "release_notes",
    label: "Release Notes",
    description: "A release-ready change summary.",
    outcome: "validate_ship",
  },
];

export const ARTIFACT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ARTIFACT_TYPES.map((t) => [t.value, t.label]),
);

/** True when the artifact's rendered content is Arabic (right-to-left). */
export function isArabicArtifact(type: string): boolean {
  return type === "summary_ar";
}
