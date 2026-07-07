/**
 * DocintelWorkspacePage — document workspace shell (placeholder tabs for now).
 *
 * Resolves the document by slug, renders header (title + status pill) + breadcrumbs,
 * a placeholder tab bar (Evidence / Facts / Artifacts / Traceability) and the page
 * list with per-page status lozenges. Header actions: Versions dropdown
 * (ai_document_versions history) + "Upload new version" (re-ingest via
 * docintel-ingest documentId flow). Zero-assumption rendering throughout.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import { PageHeader } from "@/components/ads/PageHeader";
import { Breadcrumbs } from "@/components/ads/Breadcrumbs";
import { Button, DropdownMenu, Lozenge, Spinner, EmptyState } from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { docintelRoutes } from "@/lib/routes";
import {
  useDocintelDocument,
  useDocumentVersions,
  useUploadNewVersion,
} from "../hooks/useDocintel";
import { EvidenceViewer } from "../components/EvidenceViewer";
import { TranslatedDocumentView } from "../components/TranslatedDocumentView";
import { GenerationPanel } from "../components/GenerationPanel";
import { FactsReviewPanel } from "../components/FactsReviewPanel";
import { TraceabilityMatrix } from "../components/TraceabilityMatrix";
import { AskPanel } from "../components/AskPanel";
import { DocumentLinksPanel } from "../components/DocumentLinksPanel";
import type { DocintelStatus } from "../types";

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
  const { document, isLoading, isError } = useDocintelDocument(slug);
  const versionsQuery = useDocumentVersions(document?.id);
  const uploadVersion = useUploadNewVersion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return (
      <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div style={{ padding: 24 }}>
        <EmptyState
          header="Document not found"
          description="This document does not exist or you do not have access."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "var(--ds-font-family-body)" }}>
      <PageHeader
        title={
          <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
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
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
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
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
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

      <div style={{ marginTop: 16 }}>
        <Tabs id="docintel-workspace-tabs">
          <TabList>
            <Tab>Evidence</Tab>
            <Tab>Document</Tab>
            <Tab>Facts</Tab>
            <Tab>Artifacts</Tab>
            <Tab>Traceability</Tab>
            <Tab>Ask</Tab>
            <Tab>Links</Tab>
          </TabList>

          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <EvidenceViewer documentId={document.id} />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <TranslatedDocumentView documentId={document.id} />
            </div>
          </TabPanel>

          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <FactsReviewPanel projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <GenerationPanel projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <TraceabilityMatrix projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <AskPanel projectId={document.project_id} documentId={document.id} />
            </div>
          </TabPanel>
          <TabPanel>
            <div style={{ padding: "0 0 16px", width: "100%" }}>
              <DocumentLinksPanel documentId={document.id} />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
