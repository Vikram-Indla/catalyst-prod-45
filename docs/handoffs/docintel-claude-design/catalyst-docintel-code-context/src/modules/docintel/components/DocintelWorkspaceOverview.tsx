import { Button, Heading, Lozenge } from "@/components/ads";

export interface DocintelFindingCounts {
  total: number;
  unreviewed: number;
  confirmed: number;
  rejected: number;
}

export interface DocintelDeliverableCounts {
  total: number;
  approved: number;
}

export interface DocintelWorkspaceOverviewProps {
  findingCounts?: DocintelFindingCounts;
  deliverableCounts?: DocintelDeliverableCounts;
  onAsk: () => void;
  onReviewFindings: () => void;
  onCreateDeliverable: () => void;
  isDisabled?: boolean;
}

/** Job-led source overview. All counts are supplied facts; this component performs no reads. */
export function DocintelWorkspaceOverview({
  findingCounts,
  deliverableCounts,
  onAsk,
  onReviewFindings,
  onCreateDeliverable,
  isDisabled = false,
}: DocintelWorkspaceOverviewProps) {
  return (
    <section aria-labelledby="docintel-overview-heading" data-testid="docintel-workspace-overview">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-300)",
          paddingBlock: "var(--ds-space-200)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--ds-space-100)",
          }}
        >
          <Heading as="h2" size="large">
            <span id="docintel-overview-heading">Review this source</span>
          </Heading>
          <p style={{ margin: 0, color: "var(--ds-text-subtle)" }}>
            Ask grounded questions, review source-backed findings, or create a cited deliverable.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--ds-space-100)",
          }}
        >
          <Button onClick={onReviewFindings} appearance="primary" isDisabled={isDisabled}>
            Review findings
          </Button>
          <Button onClick={onAsk} isDisabled={isDisabled}>
            Ask this source
          </Button>
          <Button onClick={onCreateDeliverable} isDisabled={isDisabled}>
            Create cited deliverable
          </Button>
        </div>

        {findingCounts !== undefined ? (
          <section aria-labelledby="docintel-finding-counts-heading">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--ds-space-100)",
              }}
            >
              <Heading as="h3" size="small">
                <span id="docintel-finding-counts-heading">Findings</span>
              </Heading>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--ds-space-100)",
                }}
              >
                <Lozenge appearance="default">{findingCounts.total} total</Lozenge>
                <Lozenge appearance="inprogress">
                  {findingCounts.unreviewed} unreviewed
                </Lozenge>
                <Lozenge appearance="success">
                  {findingCounts.confirmed} confirmed
                </Lozenge>
                <Lozenge appearance="removed">{findingCounts.rejected} rejected</Lozenge>
              </div>
            </div>
          </section>
        ) : null}

        {deliverableCounts !== undefined ? (
          <section aria-labelledby="docintel-deliverable-counts-heading">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--ds-space-100)",
              }}
            >
              <Heading as="h3" size="small">
                <span id="docintel-deliverable-counts-heading">Deliverables</span>
              </Heading>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "var(--ds-space-100)",
                }}
              >
                <Lozenge appearance="default">{deliverableCounts.total} total</Lozenge>
                <Lozenge appearance="success">
                  {deliverableCounts.approved} approved
                </Lozenge>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

export default DocintelWorkspaceOverview;
