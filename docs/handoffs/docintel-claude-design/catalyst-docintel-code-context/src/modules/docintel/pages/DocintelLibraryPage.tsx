/**
 * DocintelLibraryPage — project-scoped library of AI documents.
 *
 * Project selector (member projects) + JiraTable of documents with status
 * lozenges, page count, language, upload date and end-to-end duration.
 * Zero-assumption rendering: unknown values render an em-dash, never a guess.
 *
 * CAT-DOCINTEL-ARABIC-RAG-20260706-001
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Breadcrumbs,
  Button,
  Lozenge,
  PageHeader,
  Select,
  Spinner,
  EmptyState,
  CatalystDrawer,
  SectionMessage,
} from "@/components/ads";
import type { LozengeAppearance } from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useAuth } from "@/hooks/useAuth";
import { docintelRoutes } from "@/lib/routes";
import {
  useDocintelDocuments,
  useDocintelProjects,
  useDocintelThemes,
  useThemeDocumentIds,
} from "../hooks/useDocintel";
import { useActiveDocintelProject } from "../hooks/useActiveDocintelProject";
import { AskPanel } from "../components/AskPanel";
import { DocintelNavigation } from "../components/DocintelNavigation";
import { Clipboard, FileText, GitBranch } from "@/lib/atlaskit-icons";
import type { DocintelDocument, DocintelSourceType, DocintelStatus } from "../types";

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
  switch (status) {
    case "ready":
      return "Ready";
    case "needs_review":
      return "Needs review";
    case "failed":
      return "Failed";
    default:
      return "Processing";
  }
}

type SourceTypePresentation = {
  label: string;
  Icon: typeof FileText;
};

function sourceTypePresentation(
  sourceType: DocintelSourceType | null | undefined,
): SourceTypePresentation | null {
  const value = sourceType?.trim();
  if (!value) return null;
  switch (value) {
    case "document":
      return { label: "Uploaded document", Icon: FileText };
    case "jira":
      return { label: "Jira issue", Icon: Clipboard };
    case "git":
      return { label: "Git file", Icon: GitBranch };
    case "markdown":
      return { label: "Markdown file", Icon: FileText };
    default:
      return { label: value, Icon: FileText };
  }
}

export default function DocintelLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [askOpen, setAskOpen] = useState(false);

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];

  // Resolve the active project: ?project=<key> → remembered → first.
  const { activeProject, setActiveProjectKey } = useActiveDocintelProject(projects);

  const documentsQuery = useDocintelDocuments(activeProject?.id);
  const documents = useMemo(() => documentsQuery.data ?? [], [documentsQuery.data]);

  // Theme filter (Slice 5): narrow the visible list to documents tagged with a theme.
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<string>("");
  const themesQuery = useDocintelThemes(activeProject?.id);
  const themes = themesQuery.data ?? [];
  const themeDocIdsQuery = useThemeDocumentIds(selectedThemeId ?? undefined);
  const themeDocIds = themeDocIdsQuery.data;
  const sourceTypeOptions = useMemo(() => {
    const values = new Set(
      documents
        .map((document) => document.source_type?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    return [
      { value: "", label: "All sources" },
      ...[...values].sort().map((value) => ({
        value,
        label: sourceTypePresentation(value)?.label ?? value,
      })),
    ];
  }, [documents]);
  const visibleDocuments = useMemo(() => {
    const themeIds = selectedThemeId && themeDocIds ? new Set(themeDocIds) : null;
    return documents.filter((document) =>
      (!themeIds || themeIds.has(document.id)) &&
      (!selectedSourceType || document.source_type === selectedSourceType),
    );
  }, [documents, selectedSourceType, selectedThemeId, themeDocIds]);

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
        id: "source",
        label: "Source",
        width: 16,
        cell: ({ row }) => {
          const source = sourceTypePresentation(row.source_type);
          if (!source) return <span>{DASH}</span>;
          const { Icon } = source;
          return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon size={16} />
              {source.label}
            </span>
          );
        },
      },
      {
        id: "status",
        label: "State",
        width: 14,
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
        id: "updated",
        label: "Updated",
        width: 14,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {row.created_at
              ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true })
              : DASH}
          </span>
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
      <DocintelNavigation />
      <PageHeader
        title="Library"
        breadcrumbs={
          <Breadcrumbs
            items={[
              { key: "docintel", text: "Document Intelligence" },
              { key: "library", text: "Library", isCurrent: true },
            ]}
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

      {(projects.length > 1 || themes.length > 0 || sourceTypeOptions.length > 1) && (
        <div
          style={{
            display: "flex",
            gap: "var(--ds-space-150)",
            margin: "var(--ds-space-150) 0 var(--ds-space-250)",
            flexWrap: "wrap",
          }}
        >
          {projects.length > 1 && (
            <div style={{ maxWidth: 320, minWidth: 220, flex: 1 }}>
              <Select
                options={projectOptions}
                value={selectValue}
                onChange={(next) => {
                  if (next) setActiveProjectKey(String(next.value));
                }}
                aria-label="Project"
                isSearchable
              />
            </div>
          )}
          {themes.length > 0 && (
            <div style={{ maxWidth: 280, minWidth: 200, flex: 1 }}>
              <Select
                options={[
                  { value: "", label: "All themes" },
                  ...themes.map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={
                  selectedThemeId
                    ? {
                        value: selectedThemeId,
                        label:
                          themes.find((t) => t.id === selectedThemeId)?.name ?? "Theme",
                      }
                    : { value: "", label: "All themes" }
                }
                onChange={(next) => {
                  const v = next ? String(next.value) : "";
                  setSelectedThemeId(v === "" ? null : v);
                }}
                aria-label="Theme"
                isSearchable
              />
            </div>
          )}
          {sourceTypeOptions.length > 1 && (
            <div style={{ maxWidth: 280, minWidth: 200, flex: 1 }}>
              <Select
                options={sourceTypeOptions}
                value={sourceTypeOptions.find((option) => option.value === selectedSourceType)}
                onChange={(next) => setSelectedSourceType(next ? String(next.value) : "")}
                aria-label="Source type"
                isSearchable
              />
            </div>
          )}
        </div>
      )}

      {projectsQuery.isLoading || documentsQuery.isLoading ? (
        <div style={{ padding: 48, display: "flex", justifyContent: "center" }}>
          <Spinner size="large" />
        </div>
      ) : projectsQuery.isError ? (
        <SectionMessage appearance="error" title="Could not load projects">
          {projectsQuery.error instanceof Error
            ? projectsQuery.error.message
            : "Reload and try again."}
        </SectionMessage>
      ) : !activeProject ? (
        <EmptyState
          header="No projects"
          description="You are not a member of any project yet. Documents are scoped to a project."
        />
      ) : documentsQuery.isError ? (
        <SectionMessage appearance="error" title="Could not load sources">
          {documentsQuery.error instanceof Error
            ? documentsQuery.error.message
            : "Reload and try again."}
        </SectionMessage>
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
          data={visibleDocuments}
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
              {selectedThemeId
                ? ` · ${themes.find((t) => t.id === selectedThemeId)?.name ?? "theme"}`
                : ""}
            </span>
            <AskPanel projectId={activeProject.id} themeId={selectedThemeId ?? undefined} />
          </div>
        )}
      </CatalystDrawer>
    </div>
  );
}
