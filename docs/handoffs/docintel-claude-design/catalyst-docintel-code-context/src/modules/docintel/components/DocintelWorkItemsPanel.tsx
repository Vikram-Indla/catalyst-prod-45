import { useState } from "react";
// eslint-disable-next-line no-restricted-imports -- Plan Lock selects ADS Tabs; Catalyst has no Tabs wrapper.
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { DocumentLinksPanel } from "./DocumentLinksPanel";
import { TraceabilityMatrix } from "./TraceabilityMatrix";

export interface DocintelWorkItemsPanelProps {
  documentId: string;
  projectId: string;
}

export function DocintelWorkItemsPanel({
  documentId,
  projectId,
}: DocintelWorkItemsPanelProps) {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <Tabs
      id="docintel-work-items-tabs"
      selected={selectedTab}
      onChange={setSelectedTab}
    >
      <TabList>
        <Tab>Linked work</Tab>
        <Tab>Traceability</Tab>
      </TabList>
      <TabPanel>
        <DocumentLinksPanel documentId={documentId} />
      </TabPanel>
      <TabPanel>
        <TraceabilityMatrix documentId={documentId} projectId={projectId} />
      </TabPanel>
    </Tabs>
  );
}

export default DocintelWorkItemsPanel;
