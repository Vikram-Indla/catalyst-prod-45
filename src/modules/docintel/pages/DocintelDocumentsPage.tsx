/**
 * DocintelDocumentsPage — project-scoped list of AI documents.
 *
 * Project selector (member projects) + JiraTable of documents with status
 * lozenges, page count, language, upload date and end-to-end duration.
 * Zero-assumption rendering: unknown values render an em-dash, never a guess.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/ads/PageHeader";
import { Breadcrumbs } from "@/components/ads/Breadcrumbs";
import {
  Button,
  Lozenge,
  Select,
  Spinner,
  EmptyState,
  CatalystDrawer,
} from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useAuth } from "@/hooks/useAuth";
import { docintelRoutes } from "@/lib/routes";
import { useDocintelDocuments, useDocintelProjects } from "../hooks/useDocintel";
import { AskPanel } from "../components/AskPanel";
import type { DocintelDocument, DocintelStatus } from "../types";

const DASH = "—";

/** Map a document status to a canonical Lozenge appearance (Lozenge owns the colour). */
function statusAppearance(status: DocintelStatus): LozengeAppearance {
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
      // ingesting / extracting / describing / translating / chunking /
      // embedding / structuring — all in-flight
      return "inprogress";
  }
}

function statusLabel(status: DocintelStatus): string {
  return status.replace(/_/g, " ");
}

/** Format latency_ms.total_ms as e.g. "42s" / "1m 05s"; DASH when absent. */
function formatDuration(doc: DocintelDocument): string {
  const total = doc.latency_ms?.total_ms;
  if (typeof total !== "number" || total <= 0) return DASH;
  const secs = Math.round(total / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export default function DocintelDocumentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const [askOpen, setAskOpen] = useState(false);

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];

  // Resolve the active project: ?project=<key> or first available.
  const activeKey = params.get("project") ?? projects[0]?.key;
  const activeProject = projects.find((p) => p.key === activeKey) ?? projects[0] ?? null;

  const documentsQuery = useDocintelDocuments(activeProject?.id);
  const documents = documentsQuery.data ?? [];

  const columns = useMemo<Column<DocintelDocument>[]>(
    () => [
      {
        id: "title",
        label: "Title",
        flex: true,
        alwaysVisible: true,
        cell: ({ row }) => (
          <span
            style={{
              color: "var(--ds-text-brand)",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title}
          </span>
        ),
      },
      {
        id: "status",
        label: "Status",
        width: 16,
        cell: ({ row }) => (
          <Lozenge appearance={statusAppearance(row.status)}>
            {statusLabel(row.status)}
          </Lozenge>
        ),
      },
      {
        id: "pages",
        label: "Pages",
        width: 8,
        align: "end",
        cell: ({ row }) => <span>{row.page_count ?? DASH}</span>,
      },
      {
        id: "language",
        label: "Language",
        width: 12,
        cell: ({ row }) => <span>{row.source_language ?? DASH}</span>,
      },
      {
        id: "uploaded",
        label: "Uploaded",
        width: 14,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {row.created_at
              ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
              : DASH}
          </span>
        ),
      },
      {
        id: "duration",
        label: "Duration",
        width: 10,
        align: "end",
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>{formatDuration(row)}</span>
        ),
      },
    ],
    [],
  );

  const projectOptions = projects.map((p) => ({ value: p.key, label: p.name }));
  const selectValue = activeProject
    ? { value: activeProject.key, label: activeProject.name }
    : null;

  return (
    <div style={{ padding: 24, fontFamily: "var(--ds-font-family-body)" }}>
      <PageHeader
        title="Document Intelligence"
        breadcrumbs={
          <Breadcrumbs
            items={[{ key: "docs", text: "Document Intelligence", isCurrent: true }]}
          />
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              appearance="default"
              onClick={() => setAskOpen(true)}
              isDisabled={!activeProject}
            >
              Ask
            </Button>
            <Button
              appearance="default"
              onClick={() =>
                navigate(
                  activeProject
                    ? `${docintelRoutes.health()}?project=${activeProject.key}`
                    : docintelRoutes.health(),
                )
              }
              isDisabled={!activeProject}
            >
              Knowledge Health
            </Button>
            <Button
              appearance="primary"
              onClick={() =>
                navigate(
                  activeProject
                    ? `${docintelRoutes.upload()}?project=${activeProject.key}`
                    : docintelRoutes.upload(),
                )
              }
              isDisabled={!activeProject}
            >
              Upload documents
            </Button>
          </div>
        }
      />

      {projects.length > 1 && (
        <div style={{ margin: "12px 0 20px", maxWidth: 320 }}>
          <Select
            options={projectOptions}
            value={selectValue}
            onChange={(next) => {
              if (next) {
                params.set("project", String(next.value));
                setParams(params, { replace: true });
              }
            }}
            aria-label="Project"
            isSearchable
          />
        </div>
      )}

      {projectsQuery.isLoading || documentsQuery.isLoading ? (
        <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
          <Spinner size="large" />
        </div>
      ) : !activeProject ? (
        <EmptyState
          header="No projects"
          description="You are not a member of any project yet. Documents are scoped to a project."
        />
      ) : documents.length === 0 ? (
        <EmptyState
          header="No documents yet"
          description="Upload a PDF or Word document to start extracting facts and artifacts."
          primaryAction={
            <Button
              appearance="primary"
              onClick={() =>
                navigate(`${docintelRoutes.upload()}?project=${activeProject.key}`)
              }
            >
              Upload documents
            </Button>
          }
        />
      ) : (
        <JiraTable<DocintelDocument>
          columns={columns}
          data={documents}
          getRowId={(row) => row.id}
          onRowClick={(row) =>
            row.slug && navigate(docintelRoutes.workspace(row.slug))
          }
          ariaLabel="Documents"
        />
      )}

      {/* Project-scoped grounded Q&A over every document in the project. */}
      <CatalystDrawer
        isOpen={askOpen}
        onClose={() => setAskOpen(false)}
        label="Ask the documents"
        width="wide"
      >
        {activeProject && (
          <div style={{ padding: 24 }}>
            <span style={{ fontWeight: 600, fontSize: 16, color: "var(--ds-text)" }}>
              Ask — {activeProject.name}
            </span>
            <AskPanel projectId={activeProject.id} />
          </div>
        )}
      </CatalystDrawer>
    </div>
  );
}
