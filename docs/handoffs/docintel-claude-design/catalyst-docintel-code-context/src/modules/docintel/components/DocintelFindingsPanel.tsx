import { useMemo } from "react";
import { Button, EmptyState, Lozenge, SectionMessage } from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useRequirementFacts, useUpdateFactReview } from "../hooks/useDocintel";
import type {
  DocintelFactReviewStatus,
  DocintelRequirementFact,
} from "../types";
import type { DocintelExactEvidence } from "./DocintelSourceDrawer";
import {
  factKindAppearance,
  factKindLabel,
  reviewStatusAppearance,
} from "./factKinds";

const DASH = "—";

export interface DocintelFindingsPanelProps {
  documentId: string;
  onOpenEvidence?: (evidence: DocintelExactEvidence) => void;
}

function statementForEvidence(fact: DocintelRequirementFact): string | null {
  return fact.statement_en?.trim() || fact.statement_ar?.trim() || null;
}

function sourcePages(fact: DocintelRequirementFact): number[] {
  return Array.from(
    new Set((fact.source_page_numbers ?? []).filter((page) => typeof page === "number")),
  );
}

function FindingCell({ fact }: { fact: DocintelRequirementFact }) {
  const english = fact.statement_en?.trim();
  const arabic = fact.statement_ar?.trim();

  if (!english && !arabic) {
    return <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--ds-space-075)",
      }}
    >
      {english && (
        <span
          dir="auto"
          style={{
            color: "var(--ds-text)",
            font: "var(--ds-font-body)",
            unicodeBidi: "plaintext",
            whiteSpace: "pre-wrap",
          }}
        >
          {english}
        </span>
      )}
      {arabic && (
        <span
          dir="auto"
          lang="ar"
          style={{
            color: english ? "var(--ds-text-subtle)" : "var(--ds-text)",
            font: "var(--ds-font-body)",
            unicodeBidi: "plaintext",
            whiteSpace: "pre-wrap",
          }}
        >
          {arabic}
        </span>
      )}
    </div>
  );
}

export function DocintelFindingsPanel({
  documentId,
  onOpenEvidence,
}: DocintelFindingsPanelProps) {
  const factsQuery = useRequirementFacts(documentId);
  const review = useUpdateFactReview(documentId);

  const columns = useMemo<Column<DocintelRequirementFact>[]>(
    () => [
      {
        id: "finding",
        label: "Finding",
        flex: true,
        alwaysVisible: true,
        accessor: (fact) => fact.statement_en ?? fact.statement_ar,
        cell: ({ row }) => <FindingCell fact={row} />,
      },
      {
        id: "kind",
        label: "Kind",
        width: 13,
        accessor: (fact) => fact.kind,
        cell: ({ row }) => (
          <Lozenge appearance={factKindAppearance(String(row.kind))}>
            {factKindLabel(String(row.kind))}
          </Lozenge>
        ),
      },
      {
        id: "evidence",
        label: "Evidence",
        width: 15,
        accessor: (fact) => fact.source_page_numbers,
        cell: ({ row }) => {
          const pages = sourcePages(row);
          if (pages.length === 0) {
            return <span style={{ color: "var(--ds-text-subtlest)" }}>{DASH}</span>;
          }

          return (
            <span
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                gap: "var(--ds-space-050)",
              }}
            >
              {pages.map((page) => (
                onOpenEvidence ? (
                  <Button
                    key={page}
                    appearance="link"
                    spacing="compact"
                    onClick={() =>
                      onOpenEvidence({
                        claimText: statementForEvidence(row),
                        quotedText: null,
                        pageNumber: page,
                      })
                    }
                  >
                    {`Page ${page}`}
                  </Button>
                ) : (
                  <Lozenge key={page} appearance="default">{`Page ${page}`}</Lozenge>
                )
              ))}
            </span>
          );
        },
      },
      {
        id: "review_state",
        label: "Review state",
        width: 13,
        accessor: (fact) => fact.review_status,
        cell: ({ row }) => (
          <Lozenge appearance={reviewStatusAppearance(row.review_status)}>
            {String(row.review_status).replace(/_/g, " ")}
          </Lozenge>
        ),
      },
      {
        id: "action",
        label: "Action",
        width: 25,
        cell: ({ row }) => {
          const reviewed =
            row.review_status === "confirmed" || row.review_status === "rejected";
          const updateReview = (reviewStatus: DocintelFactReviewStatus) =>
            review.mutate({ factId: row.id, reviewStatus });

          return (
            <span
              style={{
                display: "inline-flex",
                flexWrap: "wrap",
                gap: "var(--ds-space-050)",
              }}
            >
              <Button
                appearance={row.review_status === "confirmed" ? "primary" : "default"}
                spacing="compact"
                isDisabled={review.isPending || row.review_status === "confirmed"}
                onClick={() => updateReview("confirmed")}
              >
                Confirm
              </Button>
              <Button
                appearance="subtle"
                spacing="compact"
                isDisabled={review.isPending || row.review_status === "rejected"}
                onClick={() => updateReview("rejected")}
              >
                Reject
              </Button>
              {reviewed && (
                <Button
                  appearance="link"
                  spacing="compact"
                  isDisabled={review.isPending}
                  onClick={() => updateReview("unreviewed")}
                >
                  Reset
                </Button>
              )}
            </span>
          );
        },
      },
    ],
    [onOpenEvidence, review],
  );

  if (factsQuery.isError) {
    return (
      <SectionMessage appearance="error" title="Could not load findings">
        {factsQuery.error instanceof Error ? factsQuery.error.message : "Please try again."}
      </SectionMessage>
    );
  }

  return (
    <JiraTable<DocintelRequirementFact>
      columns={columns}
      data={factsQuery.data ?? []}
      getRowId={(fact) => fact.id}
      isLoading={factsQuery.isLoading}
      emptyView={
        <EmptyState
          size="compact"
          header="No findings yet"
          description="Findings appear here after this source has been analysed."
        />
      }
      ariaLabel="Document findings"
    />
  );
}

export default DocintelFindingsPanel;
