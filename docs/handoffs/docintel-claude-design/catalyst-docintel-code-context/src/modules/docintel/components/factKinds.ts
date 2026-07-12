/**
 * Requirement-fact kind registry — display labels, order, and canonical Lozenge
 * appearance per kind (the Lozenge owns the colour; we only pick the tier).
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import type { LozengeAppearance } from "@/components/ads";
import type { DocintelFactKind, DocintelFactReviewStatus } from "../types";

export interface FactKindOption {
  value: DocintelFactKind;
  label: string;
}

/** Grouping order for the Facts panel. */
export const FACT_KINDS: FactKindOption[] = [
  { value: "capability", label: "Capabilities" },
  { value: "actor", label: "Actors" },
  { value: "workflow", label: "Workflows" },
  { value: "requirement", label: "Requirements" },
  { value: "constraint", label: "Constraints" },
  { value: "risk", label: "Risks" },
  { value: "assumption", label: "Assumptions" },
  { value: "open_question", label: "Open Questions" },
];

export const FACT_KIND_LABELS: Record<string, string> = Object.fromEntries(
  FACT_KINDS.map((k) => [k.value, k.label]),
);

/** Singular label for the kind Lozenge on an individual fact row. */
const FACT_KIND_SINGULAR: Record<string, string> = {
  capability: "capability",
  actor: "actor",
  workflow: "workflow",
  requirement: "requirement",
  constraint: "constraint",
  risk: "risk",
  assumption: "assumption",
  open_question: "open question",
};

export function factKindLabel(kind: string): string {
  return FACT_KIND_SINGULAR[kind] ?? kind.replace(/_/g, " ");
}

/** Kind → Lozenge appearance tier. Lozenge owns the colour. */
export function factKindAppearance(kind: string): LozengeAppearance {
  switch (kind) {
    case "requirement":
    case "capability":
      return "new";
    case "risk":
      return "removed";
    case "constraint":
      return "moved";
    case "open_question":
      return "inprogress";
    default:
      return "default";
  }
}

/** Review status → Lozenge appearance (unreviewed default, confirmed success, rejected removed). */
export function reviewStatusAppearance(
  status: DocintelFactReviewStatus | string,
): LozengeAppearance {
  switch (status) {
    case "confirmed":
      return "success";
    case "rejected":
      return "removed";
    default:
      return "default";
  }
}
