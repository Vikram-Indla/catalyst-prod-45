/**
 * TraceabilityMatrix — the Traceability tab body.
 *
 * Makes provenance visible as a wide matrix. Columns are the document's source
 * pages (p.1, p.2, …). Two row groups:
 *
 *   1. Requirement facts — one row per fact (kind Lozenge + English statement).
 *      A filled marker Lozenge sits in a page column when the fact's
 *      source_page_numbers includes that page. This ties every requirement back
 *      to the source pages it was extracted from.
 *
 *   2. Generated artifacts — one row per artifact (type + title). Each page
 *      cell shows how many of the artifact's citations point at that page (from
 *      ai_artifact_citations). This ties generated artifacts back to source
 *      pages, closing the loop: requirement → source page → artifact.
 *
 * The table lives in an overflow-x:auto container (matrices are wide) with a
 * sticky first column and sticky header row. Zero-assumption: a page with no
 * fact/citation coverage renders an empty cell, never a fabricated marker.
 *
 * ADS tokens only. Pills are canonical Lozenge; the wide static grid is a
 * token-styled <table> (same pattern as EvidenceViewer's tables).
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { Lozenge, Spinner, EmptyState, SectionMessage } from "@/components/ads";
import { useTraceability } from "../hooks/useDocintel";
import type { DocintelRequirementFact } from "../types";
import { ARTIFACT_TYPE_LABELS } from "./artifactTypes";
import { factKindAppearance, factKindLabel } from "./factKinds";

const DASH = "—";

const STICKY_LABEL_WIDTH = 320;

const thBase: React.CSSProperties = {
  border: "1px solid var(--ds-border)",
  padding: "6px 8px",
  background: "var(--ds-surface-sunken)",
  color: "var(--ds-text)",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "center",
  whiteSpace: "nowrap",
};

const cellBase: React.CSSProperties = {
  border: "1px solid var(--ds-border)",
  padding: "6px 8px",
  textAlign: "center",
  fontSize: 13,
  color: "var(--ds-text)",
};

/** Sticky first column — the row label (fact statement or artifact title). */
function stickyLabelCell(extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...cellBase,
    position: "sticky",
    insetInlineStart: 0,
    zIndex: 1,
    textAlign: "start",
    minWidth: STICKY_LABEL_WIDTH,
    maxWidth: STICKY_LABEL_WIDTH,
    background: "var(--ds-surface-raised)",
    ...extra,
  };
}

/** Section header cell spanning the sticky label column. */
function SectionHeaderRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <td
        colSpan={span}
        style={{
          ...cellBase,
          textAlign: "start",
          background: "var(--ds-surface-sunken)",
          fontWeight: 600,
          position: "sticky",
          insetInlineStart: 0,
        }}
      >
        {label}
      </td>
    </tr>
  );
}

function FactLabelCell({ fact }: { fact: DocintelRequirementFact }) {
  const en = fact.statement_en?.trim();
  return (
    <td style={stickyLabelCell()}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span>
          <Lozenge appearance={factKindAppearance(String(fact.kind))}>
            {factKindLabel(String(fact.kind))}
          </Lozenge>
        </span>
        <span
          style={{
            color: en ? "var(--ds-text)" : "var(--ds-text-subtlest)",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          {en ?? DASH}
        </span>
      </div>
    </td>
  );
}

export interface TraceabilityMatrixProps {
  documentId: string;
  projectId: string;
}

export function TraceabilityMatrix({ documentId, projectId }: TraceabilityMatrixProps) {
  const { data, isLoading, isError, error } = useTraceability(documentId, projectId);

  if (isLoading) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Spinner size="medium" />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 16 }}>
        <SectionMessage appearance="error" title="Could not load traceability">
          {error instanceof Error ? error.message : "Please try again."}
        </SectionMessage>
      </div>
    );
  }

  const pageNumbers = data?.pageNumbers ?? [];
  const facts = data?.facts ?? [];
  const artifacts = data?.artifacts ?? [];

  if (facts.length === 0 && artifacts.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <EmptyState
          size="compact"
          header="Nothing to trace yet"
          description="Extract requirement facts on the Facts tab, or generate artifacts on the Artifacts tab. Each will appear here mapped to the source pages it draws from."
        />
      </div>
    );
  }

  const totalCols = pageNumbers.length + 1;

  return (
    <div style={{ paddingTop: 16 }}>
      <p style={{ margin: "0 0 12px", color: "var(--ds-text-subtle)", fontSize: 13 }}>
        Requirements and generated artifacts traced to the source pages they draw
        from. Marker = the requirement was extracted from that page; a number =
        how many of an artifact's citations quote that page.
      </p>

      {pageNumbers.length === 0 ? (
        <SectionMessage appearance="information" title="No source pages referenced">
          The requirement facts and artifacts here do not yet reference specific
          source pages.
        </SectionMessage>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--ds-border)", borderRadius: 8 }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: STICKY_LABEL_WIDTH + pageNumbers.length * 56,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...thBase,
                    textAlign: "start",
                    position: "sticky",
                    insetInlineStart: 0,
                    zIndex: 2,
                    minWidth: STICKY_LABEL_WIDTH,
                    maxWidth: STICKY_LABEL_WIDTH,
                  }}
                >
                  Requirement / Artifact
                </th>
                {pageNumbers.map((n) => (
                  <th key={n} style={thBase}>{`p.${n}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Requirement facts → source pages */}
              {facts.length > 0 && (
                <SectionHeaderRow label="Requirement facts" span={totalCols} />
              )}
              {facts.map((fact) => {
                const pageSet = new Set(
                  (fact.source_page_numbers ?? []).filter(
                    (x) => typeof x === "number",
                  ),
                );
                return (
                  <tr key={fact.id}>
                    <FactLabelCell fact={fact} />
                    {pageNumbers.map((n) => (
                      <td key={n} style={cellBase}>
                        {pageSet.has(n) ? (
                          <Lozenge appearance="new">●</Lozenge>
                        ) : (
                          <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Generated artifacts → source pages */}
              {artifacts.length > 0 && (
                <SectionHeaderRow label="Generated artifacts" span={totalCols} />
              )}
              {artifacts.map((a) => {
                const typeLabel =
                  ARTIFACT_TYPE_LABELS[a.artifactType] ?? a.artifactType;
                return (
                  <tr key={a.artifactId}>
                    <td style={stickyLabelCell()}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>
                          <Lozenge appearance="default">{typeLabel}</Lozenge>
                        </span>
                        <span style={{ color: "var(--ds-text)", fontSize: 13, lineHeight: 1.4 }}>
                          {a.title?.trim() || typeLabel}
                        </span>
                        <span style={{ color: "var(--ds-text-subtle)", fontSize: 12 }}>
                          {`${a.totalCitations} citation${a.totalCitations === 1 ? "" : "s"}`}
                        </span>
                      </div>
                    </td>
                    {pageNumbers.map((n) => {
                      const count = a.citationsByPage[n] ?? 0;
                      return (
                        <td key={n} style={cellBase}>
                          {count > 0 ? (
                            <Lozenge appearance="inprogress">{String(count)}</Lozenge>
                          ) : (
                            <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TraceabilityMatrix;
