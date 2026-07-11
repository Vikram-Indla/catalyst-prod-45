/**
 * Doc Intel edge-function contract tripwires (S9 — first automated coverage).
 *
 * docintel-ask / docintel-generate are Deno modules (Deno.serve, https: imports)
 * and cannot be imported into vitest. Instead of duplicating their logic into
 * tests, this file reads the SOURCE TEXT and asserts a small set of high-value
 * invariants that have bitten before. These are deliberately brittle-but-honest:
 * if one fails, either the regression is real or the contract moved on purpose —
 * in the second case update the assertion together with the reviewed change.
 *
 * Invariants locked:
 *  1. dedupeKey NUL separators (×3) in docintel-generate — citation dedupe uses
 *     literal \u0000 between claim/document/page/block so that "a|b" vs "a"+"|b"
 *     style field collisions cannot merge distinct citations.
 *  2. Honest zero-evidence strings — both functions return/instruct
 *     "Not found …" wording instead of fabricating content.
 *  3. [E<n>] EVIDENCE_MARKER regex — present in both functions and byte-identical
 *     to the frontend CITATION_RE (ArtifactView/AskPanel), so markers written by
 *     the generators always parse in the UI.
 *  4. Membership gate before LLM spend — inside each Deno.serve handler,
 *     requireMember(...) appears before the first embed(/generateText(/
 *     generateStream( call site (source order within the handler body).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FN_DIR = resolve(HERE, "../../../supabase/functions");

const generateSrc = readFileSync(resolve(FN_DIR, "docintel-generate/index.ts"), "utf8");
const askSrc = readFileSync(resolve(FN_DIR, "docintel-ask/index.ts"), "utf8");
const artifactViewSrc = readFileSync(
  resolve(HERE, "../../modules/docintel/components/ArtifactView.tsx"),
  "utf8",
);
const promoteModalSrc = readFileSync(
  resolve(HERE, "../../modules/docintel/components/PromoteArtifactModal.tsx"),
  "utf8",
);

// Frontend marker regex sources — must stay in lockstep with the edge contract.
import { CITATION_RE as ARTIFACT_RE } from "@/modules/docintel/components/ArtifactView";
import { CITATION_RE as ASK_RE } from "@/modules/docintel/components/AskPanel";

describe("docintel-generate — citation dedupeKey NUL separators", () => {
  it("builds dedupeKey with exactly 3 literal NUL (\\u0000) separators", () => {
    const line = generateSrc
      .split("\n")
      .find((l) => l.includes("dedupeKey = "));
    expect(line, "dedupeKey construction line must exist").toBeTruthy();
    // eslint-disable-next-line no-control-regex -- contract intentionally counts literal NUL separators.
    const nulCount = (line!.match(/\u0000/g) ?? []).length;
    expect(nulCount).toBe(3);
    // The key must join claim → document_id → page_number → block_id.
    expect(line).toContain("claim");
    expect(line).toContain("document_id");
    expect(line).toContain("page_number");
    expect(line).toContain("block_id");
  });
});

describe("zero-evidence honesty — 'Not found' contract strings", () => {
  it("docintel-ask defines the localized NOT_FOUND answers", () => {
    expect(askSrc).toContain('const NOT_FOUND_EN = "Not found in source documents."');
    expect(askSrc).toContain(
      'const NOT_FOUND_AR = "لم يتم العثور على إجابة في المستندات المصدرية."',
    );
    // and the prompt instructs the model to refuse rather than invent
    expect(askSrc).toContain("write 'Not found in source' rather than inventing");
  });

  it("docintel-generate emits truthful empty-artifact text and prompt refusals", () => {
    expect(generateSrc).toContain(
      '"No source evidence found in the selected documents."',
    );
    expect(generateSrc).toContain(
      '"لم يتم العثور على أي دليل مصدري في المستندات المحددة."',
    );
    expect(generateSrc).toContain("'Not found in source'");
  });
});

describe("[E<n>] evidence marker regex — edge ↔ frontend lockstep", () => {
  const EDGE_MARKER_LITERAL = "/\\[E(\\d+)\\]/g";

  it("both edge functions declare EVIDENCE_MARKER = /\\[E(\\d+)\\]/g", () => {
    expect(generateSrc).toContain(`const EVIDENCE_MARKER = ${EDGE_MARKER_LITERAL}`);
    expect(askSrc).toContain(`const EVIDENCE_MARKER = ${EDGE_MARKER_LITERAL}`);
  });

  it("frontend CITATION_RE parses exactly what the edge functions emit", () => {
    expect(`/${ARTIFACT_RE.source}/${ARTIFACT_RE.flags}`).toBe(EDGE_MARKER_LITERAL);
    expect(`/${ASK_RE.source}/${ASK_RE.flags}`).toBe(EDGE_MARKER_LITERAL);
  });
});

describe("membership gate before LLM spend (requireMember precedes Gemini calls in the handler)", () => {
  /**
   * Helper functions calling embed()/generateText() are DEFINED above the
   * handler, so the check is scoped to the Deno.serve handler body: from
   * `Deno.serve(` to EOF, requireMember( must appear before the first LLM
   * call site (embed( / generateText( / generateStream( ) — and before any
   * helper invocation, which the same ordering covers because helpers are
   * only invoked from the handler.
   */
  function assertGateOrder(src: string, name: string) {
    const handlerStart = src.indexOf("Deno.serve(");
    expect(handlerStart, `${name}: Deno.serve handler must exist`).toBeGreaterThan(-1);
    const handler = src.slice(handlerStart);

    const gate = handler.indexOf("requireMember(");
    expect(gate, `${name}: handler must call requireMember`).toBeGreaterThan(-1);

    const llmCalls = ["embed(", "generateText(", "generateStream("]
      .map((s) => handler.indexOf(s))
      .filter((i) => i !== -1);
    expect(llmCalls.length, `${name}: handler must reach LLM calls`).toBeGreaterThan(0);

    const firstLlm = Math.min(...llmCalls);
    expect(
      gate,
      `${name}: requireMember must precede the first LLM call site in the handler`,
    ).toBeLessThan(firstLlm);
  }

  it("docintel-generate gates membership before any embed/generate call", () => {
    assertGateOrder(generateSrc, "docintel-generate");
  });

  it("docintel-ask gates membership before any embed/generate call", () => {
    assertGateOrder(askSrc, "docintel-ask");
  });

  it("both handlers return 403 FORBIDDEN when membership fails", () => {
    for (const [name, src] of [
      ["docintel-generate", generateSrc],
      ["docintel-ask", askSrc],
    ] as const) {
      const handler = src.slice(src.indexOf("Deno.serve("));
      expect(handler, name).toContain("FORBIDDEN");
      expect(handler, name).toContain("403");
    }
  });
});

describe("artifact promotion governance and provenance recovery", () => {
  it("exposes promotion only for exactly approved epic/story artifacts", () => {
    expect(artifactViewSrc).toContain(
      'const canPromote = isPromotable && status === "approved";',
    );
    expect(artifactViewSrc).toContain("{canPromote && (");
    expect(artifactViewSrc).not.toContain(
      'status === "verified" && isPromotable',
    );
  });

  it("records artifact status and every source link before full-success close", () => {
    const create = promoteModalSrc.indexOf("await createWorkItem(");
    const mark = promoteModalSrc.indexOf("await docintelApi.markArtifactPromoted(");
    const link = promoteModalSrc.indexOf("await docintelApi.linkDocument(");
    const guardedClose = promoteModalSrc.indexOf("if (!needsFollowUp) onClose();");

    expect(create).toBeGreaterThan(-1);
    expect(mark).toBeGreaterThan(create);
    expect(link).toBeGreaterThan(mark);
    expect(guardedClose).toBeGreaterThan(link);
    expect(promoteModalSrc).toContain('c.id, "promotion"');
  });

  it("persists created-work partial state and offers provenance retry", () => {
    expect(promoteModalSrc).toContain("setPromotionResult({");
    expect(promoteModalSrc).toContain('"Work created; provenance incomplete"');
    expect(promoteModalSrc).toContain('"Retry provenance"');
    expect(promoteModalSrc).toContain(
      "The work items below were created and have not been deleted or recreated.",
    );
  });

  it("retry reuses created work and contains no create or delete path", () => {
    const retryStart = promoteModalSrc.indexOf("const handleRetryProvenance");
    const retryEnd = promoteModalSrc.indexOf("if (!isOpen) return null", retryStart);
    expect(retryStart).toBeGreaterThan(-1);
    expect(retryEnd).toBeGreaterThan(retryStart);

    const retryBody = promoteModalSrc.slice(retryStart, retryEnd);
    expect(retryBody).toContain("docintelApi.markArtifactPromoted(");
    expect(retryBody).toContain("docintelApi.linkDocument(");
    expect(retryBody).not.toContain("createWorkItem(");
    expect(retryBody).not.toContain("deleteWorkItem");
    expect(retryBody).not.toContain(".delete(");
    expect(promoteModalSrc).not.toContain("deleteWorkItem");
  });
});
