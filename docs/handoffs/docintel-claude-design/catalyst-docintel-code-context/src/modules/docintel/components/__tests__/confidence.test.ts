/**
 * Doc Intel confidence mapping contract (S9 — first automated coverage).
 *
 * Locks the threshold tiers documented in confidence.ts:
 *  - extraction confidence: success ≥0.85, inprogress 0.6–0.85, removed <0.6
 *  - grounding score:       success ≥0.80, default   0.6–0.80, removed <0.6
 *  - unknown (null/undefined/non-number) → "default", pctLabel → dash
 *
 * These tiers drive Lozenge appearances across ArtifactView, AskPanel,
 * EvidenceViewer and FactsReviewPanel — a silent threshold change would
 * mislabel evidence quality everywhere at once.
 */
import { describe, it, expect } from "vitest";
import {
  confidenceAppearance,
  groundingAppearance,
  pctLabel,
} from "../confidence";

describe("confidenceAppearance — extraction thresholds 0.85 / 0.6", () => {
  it("returns success at and above 0.85", () => {
    expect(confidenceAppearance(0.85)).toBe("success");
    expect(confidenceAppearance(0.99)).toBe("success");
    expect(confidenceAppearance(1)).toBe("success");
  });

  it("returns inprogress in [0.6, 0.85)", () => {
    expect(confidenceAppearance(0.6)).toBe("inprogress");
    expect(confidenceAppearance(0.7)).toBe("inprogress");
    expect(confidenceAppearance(0.8499)).toBe("inprogress");
  });

  it("returns removed below 0.6", () => {
    expect(confidenceAppearance(0.5999)).toBe("removed");
    expect(confidenceAppearance(0.1)).toBe("removed");
    expect(confidenceAppearance(0)).toBe("removed");
  });

  it("returns default for unknown values (zero-assumption)", () => {
    expect(confidenceAppearance(null)).toBe("default");
    expect(confidenceAppearance(undefined)).toBe("default");
  });
});

describe("groundingAppearance — grounding thresholds 0.80 / 0.6", () => {
  it("returns success at and above 0.80", () => {
    expect(groundingAppearance(0.8)).toBe("success");
    expect(groundingAppearance(0.85)).toBe("success");
    expect(groundingAppearance(1)).toBe("success");
  });

  it("returns default in [0.6, 0.80) — NOT inprogress (differs from extraction tier)", () => {
    expect(groundingAppearance(0.6)).toBe("default");
    expect(groundingAppearance(0.75)).toBe("default");
    expect(groundingAppearance(0.7999)).toBe("default");
  });

  it("returns removed below 0.6", () => {
    expect(groundingAppearance(0.5999)).toBe("removed");
    expect(groundingAppearance(0)).toBe("removed");
  });

  it("returns default for unknown values (zero-assumption)", () => {
    expect(groundingAppearance(null)).toBe("default");
    expect(groundingAppearance(undefined)).toBe("default");
  });
});

describe("pctLabel — percentage formatting with honest dash", () => {
  it("rounds a 0–1 value to a whole percentage", () => {
    expect(pctLabel(0.85)).toBe("85%");
    expect(pctLabel(0.854)).toBe("85%");
    expect(pctLabel(0.855)).toBe("86%");
    expect(pctLabel(1)).toBe("100%");
    expect(pctLabel(0)).toBe("0%");
  });

  it("renders an em-dash for unknown values — never a fabricated number", () => {
    expect(pctLabel(null)).toBe("—");
    expect(pctLabel(undefined)).toBe("—");
  });
});
