import { useEffect, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- Plan Lock selects ADS Tabs; Catalyst has no Tabs wrapper.
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { CatalystDrawer, EmptyState, Heading, SectionMessage } from "@/components/ads";
import { TranslatedDocumentView } from "./TranslatedDocumentView";

export type DocintelSourceDrawerView = "source" | "evidence";

/** User-safe context for one selected claim. Technical retrieval fields are excluded. */
export interface DocintelExactEvidence {
  claimText?: string | null;
  quotedText?: string | null;
  pageNumber?: number | null;
  sectionLabel?: string | null;
  sourceTitle?: string | null;
  sourceType?: string | null;
  versionLabel?: string | null;
  freshnessLabel?: string | null;
}

export interface DocintelSourceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  exactEvidence?: DocintelExactEvidence | null;
  initialView?: DocintelSourceDrawerView;
}

const VIEW_INDEX: Record<DocintelSourceDrawerView, number> = {
  source: 0,
  evidence: 1,
};

interface EvidenceMetaItem {
  label: string;
  value: string;
}

function ExactEvidence({ evidence }: { evidence?: DocintelExactEvidence | null }) {
  if (!evidence) {
    return (
      <EmptyState
        size="compact"
        header="No evidence selected"
        description="Open a citation or finding to inspect the exact source evidence for that claim."
      />
    );
  }

  const metadata: EvidenceMetaItem[] = [];
  if (evidence.sourceTitle?.trim()) {
    metadata.push({ label: "Source", value: evidence.sourceTitle.trim() });
  }
  if (evidence.sourceType?.trim()) {
    metadata.push({ label: "Source type", value: evidence.sourceType.trim() });
  }
  if (evidence.versionLabel?.trim()) {
    metadata.push({ label: "Version", value: evidence.versionLabel.trim() });
  }
  if (typeof evidence.pageNumber === "number") {
    metadata.push({ label: "Page", value: String(evidence.pageNumber) });
  }
  if (evidence.sectionLabel?.trim()) {
    metadata.push({ label: "Section", value: evidence.sectionLabel.trim() });
  }
  if (evidence.freshnessLabel?.trim()) {
    metadata.push({ label: "Source updated", value: evidence.freshnessLabel.trim() });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--ds-space-250)",
      }}
    >
      <Heading as="h3" size="small">
        Exact evidence
      </Heading>

      {evidence.claimText?.trim() && (
        <section aria-labelledby="docintel-evidence-claim-heading">
          <div
            id="docintel-evidence-claim-heading"
            style={{
              color: "var(--ds-text-subtle)",
              font: "var(--ds-font-heading-xxsmall)",
              marginBottom: "var(--ds-space-075)",
            }}
          >
            Claim
          </div>
          <p
            dir="auto"
            style={{
              color: "var(--ds-text)",
              font: "var(--ds-font-body)",
              margin: 0,
              unicodeBidi: "plaintext",
              whiteSpace: "pre-wrap",
            }}
          >
            {evidence.claimText}
          </p>
        </section>
      )}

      <section aria-labelledby="docintel-evidence-quote-heading">
        <div
          id="docintel-evidence-quote-heading"
          style={{
            color: "var(--ds-text-subtle)",
            font: "var(--ds-font-heading-xxsmall)",
            marginBottom: "var(--ds-space-075)",
          }}
        >
          Quoted from source
        </div>
        {evidence.quotedText?.trim() ? (
          <blockquote
            dir="auto"
            style={{
              background: "var(--ds-surface-sunken)",
              borderInlineStart: "var(--ds-border-width-outline) solid var(--ds-border-focused)",
              borderRadius: "var(--ds-border-radius-100)",
              color: "var(--ds-text)",
              font: "var(--ds-font-body)",
              margin: 0,
              padding: "var(--ds-space-150) var(--ds-space-200)",
              unicodeBidi: "plaintext",
              whiteSpace: "pre-wrap",
            }}
          >
            {evidence.quotedText}
          </blockquote>
        ) : (
          <SectionMessage appearance="information" title="Exact quotation unavailable">
            This selected evidence does not include quoted source text.
          </SectionMessage>
        )}
      </section>

      {metadata.length > 0 && (
        <dl
          style={{
            display: "grid",
            gap: "var(--ds-space-100)",
            gridTemplateColumns: "max-content minmax(0, 1fr)",
            margin: 0,
          }}
        >
          {metadata.map(({ label, value }) => (
            <div key={label} style={{ display: "contents" }}>
              <dt
                style={{
                  color: "var(--ds-text-subtle)",
                  font: "var(--ds-font-body-small)",
                }}
              >
                {label}
              </dt>
              <dd
                dir="auto"
                style={{
                  color: "var(--ds-text)",
                  font: "var(--ds-font-body-small)",
                  margin: 0,
                  unicodeBidi: "plaintext",
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function DocintelSourceDrawer({
  isOpen,
  onClose,
  documentId,
  exactEvidence = null,
  initialView = "source",
}: DocintelSourceDrawerProps) {
  const [selectedTab, setSelectedTab] = useState(VIEW_INDEX[initialView]);

  useEffect(() => {
    if (isOpen) setSelectedTab(VIEW_INDEX[initialView]);
  }, [initialView, isOpen]);

  return (
    <CatalystDrawer
      isOpen={isOpen}
      onClose={onClose}
      label="Source and evidence"
      width="wide"
    >
      <div style={{ padding: "var(--ds-space-300)" }}>
        <Tabs
          id="docintel-source-drawer-tabs"
          selected={selectedTab}
          onChange={setSelectedTab}
        >
          <TabList>
            <Tab>Readable source</Tab>
            <Tab>Exact evidence</Tab>
          </TabList>
          <TabPanel>
            <TranslatedDocumentView documentId={documentId} />
          </TabPanel>
          <TabPanel>
            <div style={{ paddingTop: "var(--ds-space-250)" }}>
              <ExactEvidence evidence={exactEvidence} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </CatalystDrawer>
  );
}

export default DocintelSourceDrawer;
