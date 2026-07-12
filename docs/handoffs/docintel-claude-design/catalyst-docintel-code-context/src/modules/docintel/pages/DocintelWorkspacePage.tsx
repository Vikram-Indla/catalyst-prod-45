/**
 * DocintelWorkspacePage — customer-facing source workbench.
 *
 * The five top-level destinations represent user jobs. Readable source and exact
 * evidence stay contextual in the source drawer; linked work and traceability
 * remain peer views within Work items. Zero-assumption rendering throughout.
 */
import { useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
// eslint-disable-next-line no-restricted-imports -- Plan Lock selects ADS Tabs; Catalyst has no Tabs wrapper.
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import {
  Breadcrumbs,
  Button,
  DropdownMenu,
  EmptyState,
  Lozenge,
  PageHeader,
  Spinner,
} from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { docintelRoutes } from "@/lib/routes";
import {
  useArtifacts,
  useDocintelDocument,
  useDocumentVersions,
  useRequirementFacts,
  useUploadNewVersion,
} from "../hooks/useDocintel";
import { DocintelWorkspaceOverview } from "../components/DocintelWorkspaceOverview";
import { DocintelSourceDrawer } from "../components/DocintelSourceDrawer";
import type {
  DocintelExactEvidence,
  DocintelSourceDrawerView,
} from "../components/DocintelSourceDrawer";
import { DocintelFindingsPanel } from "../components/DocintelFindingsPanel";
import { DocintelWorkItemsPanel } from "../components/DocintelWorkItemsPanel";
import { GenerationPanel } from "../components/GenerationPanel";
import { AskPanel } from "../components/AskPanel";
import { ThemeTags } from "../components/ThemeTags";
import type { DocintelStatus } from "../types";

const WORKSPACE_VIEWS = [
  "overview",
  "ask",
  "findings",
  "deliverables",
  "work-items",
] as const;

type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

function resolveWorkspaceView(requestedView: string | null): WorkspaceView {
  if (WORKSPACE_VIEWS.includes(requestedView as WorkspaceView)) {
    return requestedView as WorkspaceView;
  }

  // Preserve incoming links from the implementation-shaped workspace.
  if (requestedView === "artifacts") return "deliverables";
  if (requestedView === "links" || requestedView === "traceability") return "work-items";
  return "overview";
}

function docStatusAppearance(status: DocintelStatus): LozengeAppearance {
  switch (status) {
    case "ready":
      return "success";
    case "failed":
      return "removed";
    case "needs_review":
      return "moved";
    case "queued":
      return "default";
    default:
      return "inprogress";
  }
}

export default function DocintelWorkspacePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { document, isLoading, isError } = useDocintelDocument(slug);
  const versionsQuery = useDocumentVersions(document?.id);
  const factsQuery = useRequirementFacts(document?.id);
  const artifactsQuery = useArtifacts(document?.project_id, document?.id);
  const uploadVersion = useUploadNewVersion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewSourceRef = useRef<HTMLButtonElement>(null);
  const restoreViewSourceFocusRef = useRef(false);
  const [isSourceDrawerOpen, setIsSourceDrawerOpen] = useState(false);
  const [sourceDrawerView, setSourceDrawerView] = useState<DocintelSourceDrawerView>("source");
  const [exactEvidence, setExactEvidence] = useState<DocintelExactEvidence | null>(null);
  const requestedView = searchParams.get("view");
  const selectedTab = WORKSPACE_VIEWS.indexOf(resolveWorkspaceView(requestedView));

  const findingCounts = factsQuery.data === undefined
    ? undefined
    : {
        total: factsQuery.data.length,
        unreviewed: factsQuery.data.filter((fact) => fact.review_status === "unreviewed").length,
        confirmed: factsQuery.data.filter((fact) => fact.review_status === "confirmed").length,
        rejected: factsQuery.data.filter((fact) => fact.review_status === "rejected").length,
      };
  const deliverableCounts = artifactsQuery.data === undefined
    ? undefined
    : {
        total: artifactsQuery.data.length,
        approved: artifactsQuery.data.filter(
          (artifact) => artifact.status === "approved" || artifact.status === "promoted",
        ).length,
      };

  const selectView = (view: (typeof WORKSPACE_VIEWS)[number]) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    setSearchParams(next);
  };

  const handleTabChange = (index: number) => {
    const view = WORKSPACE_VIEWS[index];
    if (view) selectView(view);
  };

  const closeSourceDrawer = () => {
    setIsSourceDrawerOpen(false);
    if (restoreViewSourceFocusRef.current) viewSourceRef.current?.focus();
  };

  const openReadableSource = () => {
    restoreViewSourceFocusRef.current = true;
    setExactEvidence(null);
    setSourceDrawerView("source");
    setIsSourceDrawerOpen(true);
  };

  const openExactEvidence = (evidence: DocintelExactEvidence) => {
    restoreViewSourceFocusRef.current = false;
    setExactEvidence(evidence);
    setSourceDrawerView("evidence");
    setIsSourceDrawerOpen(true);
  };

  if (isLoading) {
    return (
      <div
        style={{
          padding: "var(--ds-space-600)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Spinner size="large" />
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div style={{ padding: "var(--ds-space-300)" }}>
        <EmptyState
          header="Document not found"
          description="This document does not exist or you do not have access."
        />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "var(--ds-space-300)",
        fontFamily: "var(--ds-font-family-body)",
      }}
    >
      <PageHeader
        title={
          <span
            style={{
              display: "flex",
              gap: "var(--ds-space-150)",
              alignItems: "center",
            }}
          >
            {document.title}
            <Lozenge appearance={docStatusAppearance(document.status)}>
              {document.status.replace(/_/g, " ")}
            </Lozenge>
          </span>
        }
        breadcrumbs={
          <Breadcrumbs
            items={[
              { key: "docs", text: "Document Intelligence", onClick: () => navigate(docintelRoutes.list()) },
              { key: "doc", text: document.title, isCurrent: true },
            ]}
          />
        }
        actions={
          <span
            style={{
              display: "flex",
              gap: "var(--ds-space-100)",
              alignItems: "center",
            }}
          >
            <Button
              ref={viewSourceRef}
              appearance="default"
              onClick={openReadableSource}
            >
              View source
            </Button>
            {(versionsQuery.data?.length ?? 0) > 0 ? (
              <DropdownMenu
                trigger={`Versions (${versionsQuery.data!.length})`}
                placement="bottom-end"
                aria-label="Version history"
                groups={[{
                  key: "versions",
                  title: "Version history",
                  items: versionsQuery.data!.map((v) => ({
                    key: v.id,
                    label: `v${v.version_no}`,
                    description: new Date(v.created_at).toLocaleString(),
                  })),
                }]}
              />
            ) : null}
            <Button
              appearance="default"
              isDisabled={uploadVersion.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadVersion.isPending ? "Uploading…" : "Upload new version"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !document || uploadVersion.isPending) return;
                uploadVersion.mutate({
                  projectId: document.project_id,
                  documentId: document.id,
                  slug: slug ?? document.slug ?? "",
                  file,
                });
              }}
            />
          </span>
        }
      />

      <div style={{ marginTop: "var(--ds-space-150)" }}>
        <ThemeTags projectId={document.project_id} documentId={document.id} />
      </div>

      <div style={{ marginTop: "var(--ds-space-200)" }}>
        <Tabs
          id="docintel-workspace-tabs"
          selected={selectedTab}
          onChange={handleTabChange}
        >
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Ask</Tab>
            <Tab>Findings</Tab>
            <Tab>Deliverables</Tab>
            <Tab>Work items</Tab>
          </TabList>

          <TabPanel>
            <div style={{ padding: "0 0 var(--ds-space-200)", width: "100%" }}>
              <DocintelWorkspaceOverview
                findingCounts={findingCounts}
                deliverableCounts={deliverableCounts}
                onAsk={() => selectView("ask")}
                onReviewFindings={() => selectView("findings")}
                onCreateDeliverable={() => selectView("deliverables")}
                isDisabled={document.status !== "ready" && document.status !== "needs_review"}
              />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: "0 0 var(--ds-space-200)", width: "100%" }}>
              <AskPanel projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: "0 0 var(--ds-space-200)", width: "100%" }}>
              <DocintelFindingsPanel
                documentId={document.id}
                onOpenEvidence={openExactEvidence}
              />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: "0 0 var(--ds-space-200)", width: "100%" }}>
              <GenerationPanel projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ padding: "0 0 var(--ds-space-200)", width: "100%" }}>
              <DocintelWorkItemsPanel
                documentId={document.id}
                projectId={document.project_id}
              />
            </div>
          </TabPanel>
        </Tabs>
      </div>

      <DocintelSourceDrawer
        isOpen={isSourceDrawerOpen}
        onClose={closeSourceDrawer}
        documentId={document.id}
        exactEvidence={exactEvidence}
        initialView={sourceDrawerView}
      />
    </div>
  );
}
