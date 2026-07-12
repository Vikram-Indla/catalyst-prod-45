/**
 * Doc Intel citation-marker parsing contract (S9 — first automated coverage).
 *
 * Locks the [E<n>] marker pipeline on the frontend:
 *  - CITATION_RE shape (must stay in lockstep with the edge functions'
 *    EVIDENCE_MARKER — cross-checked in src/test/edge/docintel-contracts.test.ts)
 *  - ArtifactView.renderWithCitations: POSITIONAL resolution — the Nth
 *    citation row (1-based) backs [E<n>]; out-of-range markers render an
 *    honest "E<n>" chip and never invoke the drawer.
 *  - AskPanel.renderWithCitations: MARKER-KEYED resolution — citations carry
 *    their own `marker` field; array order must not matter.
 *  - Both re-use a /g regex; lastIndex must be reset so repeated renders
 *    (React re-render) parse identically.
 *
 * Chips are identified structurally (elements carrying label+onClick props);
 * no DOM rendering — these are pure element-tree assertions.
 */
import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import {
  CITATION_RE as ARTIFACT_CITATION_RE,
  renderWithCitations as renderArtifactCitations,
} from "../ArtifactView";
import {
  CITATION_RE as ASK_CITATION_RE,
  renderWithCitations as renderAskCitations,
  isArabicText,
} from "../AskPanel";
import type { DocintelCitation, DocintelAskCitation } from "../../types";

// ── fixtures ────────────────────────────────────────────────────────────────

function artifactCitation(overrides: Partial<DocintelCitation>): DocintelCitation {
  return {
    id: "cit-1",
    artifact_id: "art-1",
    claim_text: null,
    document_id: "doc-1",
    page_number: null,
    block_id: null,
    quoted_text: null,
    confidence: null,
    ...overrides,
  };
}

function askCitation(overrides: Partial<DocintelAskCitation>): DocintelAskCitation {
  return {
    marker: 1,
    document_id: "doc-1",
    document_title: null,
    page_number: null,
    block_id: null,
    quoted_text: null,
    snippet: null,
    document_updated_at: null,
    ...overrides,
  };
}

/** Extract the citation chips (elements with label + onClick props) from the parts array. */
function chipsOf(parts: ReactNode[]): { label: string; onClick: () => void }[] {
  return parts
    .filter(
      (p): p is ReactElement<{ label: string; onClick: () => void }> =>
        isValidElement(p) &&
        typeof (p.props as Record<string, unknown>).label === "string" &&
        typeof (p.props as Record<string, unknown>).onClick === "function",
    )
    .map((p) => ({ label: p.props.label, onClick: p.props.onClick }));
}

// ── regex contract ──────────────────────────────────────────────────────────

describe("CITATION_RE — [E<n>] marker shape", () => {
  it("is byte-identical between ArtifactView and AskPanel", () => {
    expect(ARTIFACT_CITATION_RE.source).toBe(ASK_CITATION_RE.source);
    expect(ARTIFACT_CITATION_RE.flags).toBe(ASK_CITATION_RE.flags);
  });

  it("matches [E1] and multi-digit [E12], capturing the number", () => {
    expect("see [E1].".match(ARTIFACT_CITATION_RE)).toEqual(["[E1]"]);
    const m = /\[E(\d+)\]/.exec("claim [E12] end");
    expect(m?.[1]).toBe("12");
  });

  it("rejects near-misses: [e1], [E], [E1x], E1 without brackets", () => {
    for (const s of ["[e1]", "[E]", "[E1x]", "E1", "[E 1]"]) {
      ARTIFACT_CITATION_RE.lastIndex = 0;
      expect(ARTIFACT_CITATION_RE.test(s), s).toBe(false);
    }
  });

  it("is global — required by the exec() loop in renderWithCitations", () => {
    expect(ARTIFACT_CITATION_RE.global).toBe(true);
  });
});

// ── ArtifactView: positional (1-based) resolution ───────────────────────────

describe("ArtifactView.renderWithCitations — positional [E<n>] → citations[n-1]", () => {
  const citations = [
    artifactCitation({ id: "c1", page_number: 3 }),
    artifactCitation({ id: "c2", page_number: 7 }),
  ];

  it("labels a resolved marker with its citation page (p.<page>)", () => {
    const parts = renderArtifactCitations("Claim [E2].", citations, vi.fn(), false);
    expect(chipsOf(parts).map((c) => c.label)).toEqual(["p.7"]);
  });

  it("labels an unknown-page citation and an out-of-range marker as E<n> (no fabricated page)", () => {
    const noPage = [artifactCitation({ id: "c1", page_number: null })];
    const parts = renderArtifactCitations("A [E1] B [E5].", noPage, vi.fn(), false);
    expect(chipsOf(parts).map((c) => c.label)).toEqual(["E1", "E5"]);
  });

  it("opens the drawer with (citation, n) for resolved markers only", () => {
    const onOpen = vi.fn();
    const parts = renderArtifactCitations("A [E1] B [E9].", citations, onOpen, false);
    const chips = chipsOf(parts);
    expect(chips).toHaveLength(2);
    chips[0].onClick();
    expect(onOpen).toHaveBeenCalledWith(citations[0], 1);
    chips[1].onClick(); // [E9] has no backing citation → must NOT call onOpen
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders text without markers as a single markdown part with zero chips", () => {
    const parts = renderArtifactCitations("No markers here.", citations, vi.fn(), false);
    expect(chipsOf(parts)).toHaveLength(0);
    expect(parts.length).toBe(1);
  });

  it("is idempotent across calls (global-regex lastIndex is reset)", () => {
    const text = "One [E1] two [E2] three.";
    const a = renderArtifactCitations(text, citations, vi.fn(), false);
    const b = renderArtifactCitations(text, citations, vi.fn(), false);
    expect(chipsOf(a).map((c) => c.label)).toEqual(chipsOf(b).map((c) => c.label));
    expect(chipsOf(a)).toHaveLength(2);
  });
});

// ── AskPanel: marker-keyed resolution ───────────────────────────────────────

describe("AskPanel.renderWithCitations — marker-keyed [E<n>] → citation.marker === n", () => {
  it("resolves by marker field, independent of array order", () => {
    const citations = [
      askCitation({ marker: 7, page_number: 42 }),
      askCitation({ marker: 2, page_number: 5 }),
    ];
    const parts = renderAskCitations("A [E2] B [E7].", citations, vi.fn(), false);
    expect(chipsOf(parts).map((c) => c.label)).toEqual(["p.5", "p.42"]);
  });

  it("renders an unresolvable marker as a plain E<n> chip that never opens the drawer", () => {
    const onOpen = vi.fn();
    const citations = [askCitation({ marker: 1, page_number: 9 })];
    const parts = renderAskCitations("A [E1] B [E3].", citations, onOpen, false);
    const chips = chipsOf(parts);
    expect(chips.map((c) => c.label)).toEqual(["p.9", "E3"]);
    chips[1].onClick();
    expect(onOpen).not.toHaveBeenCalled();
    chips[0].onClick();
    expect(onOpen).toHaveBeenCalledWith(citations[0]);
  });

  it("is idempotent across calls (global-regex lastIndex is reset)", () => {
    const citations = [askCitation({ marker: 1 })];
    const a = renderAskCitations("x [E1] y", citations, vi.fn(), false);
    const b = renderAskCitations("x [E1] y", citations, vi.fn(), false);
    expect(chipsOf(a)).toHaveLength(1);
    expect(chipsOf(b)).toHaveLength(1);
  });
});

// ── language detection ──────────────────────────────────────────────────────

describe("AskPanel.isArabicText — Arabic-majority heuristic", () => {
  it("detects Arabic-majority text", () => {
    expect(isArabicText("ما هو نطاق المشروع؟")).toBe(true);
  });

  it("rejects Latin-majority and empty text", () => {
    expect(isArabicText("What is the project scope?")).toBe(false);
    expect(isArabicText("")).toBe(false);
    expect(isArabicText("123 !?")).toBe(false);
  });

  it("mixed text follows the majority script", () => {
    expect(isArabicText("ملخص المستند للمشروع الجديد (v2)")).toBe(true);
    expect(isArabicText("Summary of مستند")).toBe(false);
  });
});
