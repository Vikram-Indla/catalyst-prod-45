/**
 * Confidence → canonical Lozenge appearance mapping. The Lozenge owns the
 * colour; we only choose the appearance tier. Thresholds differ by surface:
 *  - block/table/image extraction: success ≥0.85, inprogress 0.6–0.85, removed <0.6
 *  - grounding score:              success ≥0.80, default 0.6–0.80, removed <0.6
 * Unknown (null/undefined) → default, and callers render a dash for the label.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import type { LozengeAppearance } from "@/components/ads";

export function confidenceAppearance(
  value: number | null | undefined,
): LozengeAppearance {
  if (typeof value !== "number") return "default";
  if (value >= 0.85) return "success";
  if (value >= 0.6) return "inprogress";
  return "removed";
}

export function groundingAppearance(
  value: number | null | undefined,
): LozengeAppearance {
  if (typeof value !== "number") return "default";
  if (value >= 0.8) return "success";
  if (value >= 0.6) return "default";
  return "removed";
}

/** Format a 0–1 confidence as a percentage, or a dash when unknown. */
export function pctLabel(value: number | null | undefined): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}
