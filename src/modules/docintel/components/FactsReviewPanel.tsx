/**
 * FactsReviewPanel — the Facts tab body.
 *
 * Top: an "Extract facts" primary Button (invokes docintel-generate with
 * artifactType 'requirement_facts'). While running, an elapsed-seconds ticker
 * makes the wait visible. If facts already exist the button reads "Re-extract"
 * (dedupe is server-side).
 *
 * Body: requirement facts grouped by kind. Each fact shows its English
 * statement (primary), its Arabic statement (dir="rtl") when present, a kind
 * Lozenge, a confidence Lozenge, source page chips ("p.N"), and a review
 * control (Confirm / Reject → status Lozenge). Zero-assumption throughout:
 * unknown values render a dash or nothing — never a fabricated default.
 *
 * ADS tokens only. Canonical components only. RTL-correct Arabic statements.
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Lozenge,
  Spinner,
  EmptyState,
  SectionMessage,
} from "@/components/ads";
import {
  useExtractFacts,
  useRequirementFacts,
  useUpdateFactReview,
} from "../hooks/useDocintel";
import type {
  DocintelFactReviewStatus,
  DocintelRequirementFact,
} from "../types";
import { confidenceAppearance, pctLabel } from "./confidence";
import {
  FACT_KINDS,
  factKindAppearance,
  factKindLabel,
  reviewStatusAppearance,
} from "./factKinds";

const DASH = "—";

const ARABIC_FONT =
  '"Noto Naskh Arabic", "Geeza Pro", "Traditional Arabic", "Segoe UI", var(--ds-font-family-body), sans-serif';

/** Elapsed-seconds ticker while extraction is in flight. */
function ElapsedTicker() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "var(--ds-text-subtle)",
        fontSize: 13,
      }}
    >
      <Spinner size="small" />
      Extracting… {elapsed}s
    </span>
  );
}

/** Source page chips ("p.N") from source_page_numbers. */
function PageChips({ pages }: { pages: number[] | null }) {
  const list = (pages ?? []).filter((n) => typeof n === "number");
  if (list.length === 0) {
    return <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>;
  }
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {list.map((n, i) => (
        <Lozenge key={`${n}-${i}`} appearance="default">{`p.${n}`}</Lozenge>
      ))}
    </span>
  );
}

/** One fact row: bilingual statement, pills, review control. */
function FactRow({
  fact,
  onReview,
  isPending,
}: {
  fact: DocintelRequirementFact;
  onReview: (status: DocintelFactReviewStatus) => void;
  isPending: boolean;
}) {
  const en = fact.statement_en?.trim();
  const ar = fact.statement_ar?.trim();
  const reviewed = fact.review_status === "confirmed" || fact.review_status === "rejected";

  return (
    <div
      style={{
        border: "1px solid var(--ds-border)",
        borderRadius: 8,
        padding: 12,
        background: "var(--ds-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Pills row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Lozenge appearance={factKindAppearance(String(fact.kind))}>
          {factKindLabel(String(fact.kind))}
        </Lozenge>
        <Lozenge appearance={confidenceAppearance(fact.confidence)}>
          {`conf ${pctLabel(fact.confidence)}`}
        </Lozenge>
        <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: 6 }}>
          <PageChips pages={fact.source_page_numbers} />
        </span>
      </div>

      {/* English statement (primary) */}
      <div
        dir="ltr"
        style={{
          color: "var(--ds-text)",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
        }}
      >
        {en ?? <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>}
      </div>

      {/* Arabic statement (RTL) when present */}
      {ar && (
        <div
          dir="rtl"
          lang="ar"
          style={{
            textAlign: "right",
            unicodeBidi: "plaintext",
            fontFamily: ARABIC_FONT,
            fontSize: 15,
            lineHeight: 1.8,
            color: "var(--ds-text-subtle)",
            whiteSpace: "pre-wrap",
          }}
        >
          {ar}
        </div>
      )}

      {/* Review control */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          borderTop: "1px solid var(--ds-border)",
          paddingTop: 8,
        }}
      >
        <Lozenge appearance={reviewStatusAppearance(fact.review_status)}>
          {String(fact.review_status).replace(/_/g, " ")}
        </Lozenge>
        <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: 6 }}>
          <Button
            appearance={fact.review_status === "confirmed" ? "primary" : "default"}
            spacing="compact"
            isDisabled={isPending || fact.review_status === "confirmed"}
            onClick={() => onReview("confirmed")}
          >
            Confirm
          </Button>
          <Button
            appearance="subtle"
            spacing="compact"
            isDisabled={isPending || fact.review_status === "rejected"}
            onClick={() => onReview("rejected")}
          >
            Reject
          </Button>
          {reviewed && (
            <Button
              appearance="link"
              spacing="compact"
              isDisabled={isPending}
              onClick={() => onReview("unreviewed")}
            >
              Reset
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}

export interface FactsReviewPanelProps {
  documentId: string;
  projectId: string;
}

export function FactsReviewPanel({ documentId, projectId }: FactsReviewPanelProps) {
  const { data: facts, isLoading, isError, error } = useRequirementFacts(documentId);
  const extract = useExtractFacts();
  const review = useUpdateFactReview(documentId);

  const hasFacts = (facts?.length ?? 0) > 0;

  // Group facts by kind in the registry order.
  const grouped = useMemo(() => {
    const map = new Map<string, DocintelRequirementFact[]>();
    for (const f of facts ?? []) {
      const arr = map.get(String(f.kind)) ?? [];
      arr.push(f);
      map.set(String(f.kind), arr);
    }
    return map;
  }, [facts]);

  const onExtract = () => {
    extract.mutate({ projectId, documentIds: [documentId] });
  };

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <Button
          appearance="primary"
          isDisabled={extract.isPending}
          onClick={onExtract}
        >
          {hasFacts ? "Re-extract" : "Extract facts"}
        </Button>
        {extract.isPending && <ElapsedTicker />}
      </div>

      {extract.isError && (
        <div style={{ marginBottom: 16 }}>
          <SectionMessage appearance="error" title="Extraction failed">
            {extract.error instanceof Error ? extract.error.message : "Please try again."}
          </SectionMessage>
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
          <Spinner size="medium" />
        </div>
      ) : isError ? (
        <SectionMessage appearance="error" title="Could not load facts">
          {error instanceof Error ? error.message : "Please try again."}
        </SectionMessage>
      ) : !hasFacts ? (
        <EmptyState
          size="compact"
          header="No facts yet"
          description="Extract requirement facts — capabilities, actors, workflows, requirements, constraints, risks, assumptions and open questions — from this document, each traced back to its source pages."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {FACT_KINDS.map((k) => {
            const rows = grouped.get(k.value) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={k.value}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--ds-text)",
                    }}
                  >
                    {k.label}
                  </h3>
                  <Lozenge appearance="default">{String(rows.length)}</Lozenge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rows.map((fact) => (
                    <FactRow
                      key={fact.id}
                      fact={fact}
                      isPending={review.isPending}
                      onReview={(status) =>
                        review.mutate({ factId: fact.id, reviewStatus: status })
                      }
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FactsReviewPanel;
