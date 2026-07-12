import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  AtlaskitPageShell,
  Button,
  CatalystDrawer,
  EmptyState,
  Lozenge,
  PageHeader,
  SectionMessage,
  Select,
  Spinner,
  type LozengeAppearance,
} from "@/components/ads";
import { JiraTable } from "@/components/shared/JiraTable";
import type { Column } from "@/components/shared/JiraTable/types";
import { useAuth } from "@/hooks/useAuth";
import { Routes } from "@/lib/routes";
import { ArtifactView } from "../components/ArtifactView";
import { ARTIFACT_TYPE_LABELS } from "../components/artifactTypes";
import { groundingAppearance, pctLabel } from "../components/confidence";
import { DocintelNavigation } from "../components/DocintelNavigation";
import type { DocintelProjectArtifact } from "../domain";
import { useActiveDocintelProject } from "../hooks/useActiveDocintelProject";
import { useDocintelProjects, useProjectArtifacts } from "../hooks/useDocintel";

const DASH = "—";

function reviewAppearance(status: string): LozengeAppearance {
  switch (status) {
    case "approved":
    case "promoted":
      return "success";
    case "rejected":
    case "failed":
      return "removed";
    case "verified":
    case "needs_review":
      return "moved";
    default:
      return "default";
  }
}

function reviewLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function sourceLabel(artifact: DocintelProjectArtifact): string {
  const titles = artifact.source_documents
    .map((source) => source.title.trim())
    .filter(Boolean);
  return titles.length > 0 ? titles.join(", ") : DASH;
}

function updatedLabel(value: string | null): string {
  if (!value) return DASH;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return DASH;
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function DocintelDeliverablesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openArtifactId, setOpenArtifactId] = useState<string | null>(null);

  const projectsQuery = useDocintelProjects(user?.id);
  const projects = projectsQuery.data ?? [];
  const { activeProject, setActiveProjectKey } = useActiveDocintelProject(projects);
  const artifactsQuery = useProjectArtifacts(activeProject?.id);

  const columns = useMemo<Column<DocintelProjectArtifact>[]>(
    () => [
      {
        id: "source",
        label: "Source",
        width: 22,
        accessor: sourceLabel,
        cell: ({ row }) => (
          <span dir="auto" style={{ unicodeBidi: "plaintext" }}>
            {sourceLabel(row)}
          </span>
        ),
      },
      {
        id: "title",
        label: "Title",
        flex: true,
        alwaysVisible: true,
        accessor: (artifact) => artifact.title,
        cell: ({ row }) => (
          <span
            dir="auto"
            style={{
              color: "var(--ds-text-brand)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              unicodeBidi: "plaintext",
              whiteSpace: "nowrap",
            }}
          >
            {row.title?.trim() || DASH}
          </span>
        ),
      },
      {
        id: "type",
        label: "Type",
        width: 17,
        accessor: (artifact) => artifact.artifact_type,
        cell: ({ row }) => (
          <span>{ARTIFACT_TYPE_LABELS[row.artifact_type] ?? row.artifact_type}</span>
        ),
      },
      {
        id: "review",
        label: "Review",
        width: 13,
        accessor: (artifact) => artifact.status,
        cell: ({ row }) => (
          <Lozenge appearance={reviewAppearance(String(row.status))}>
            {reviewLabel(String(row.status))}
          </Lozenge>
        ),
      },
      {
        id: "grounding",
        label: "Grounding",
        width: 13,
        accessor: (artifact) => artifact.grounding_score,
        cell: ({ row }) => (
          <Lozenge appearance={groundingAppearance(row.grounding_score)}>
            {pctLabel(row.grounding_score)}
          </Lozenge>
        ),
      },
      {
        id: "updated",
        label: "Updated",
        width: 15,
        accessor: (artifact) => artifact.updated_at,
        cell: ({ row }) => (
          <span style={{ color: "var(--ds-text-subtle)" }}>
            {updatedLabel(row.updated_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const projectOptions = projects.map((project) => ({
    value: project.key,
    label: project.name,
  }));

  return (
    <AtlaskitPageShell>
      <PageHeader title="Deliverables" />
      <DocintelNavigation />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-250)",
          padding: "var(--ds-space-250) var(--ds-space-300) var(--ds-space-400)",
        }}
      >
        {projects.length > 1 ? (
          <div>
            <Select
              aria-label="Project"
              options={projectOptions}
              value={activeProject
                ? { value: activeProject.key, label: activeProject.name }
                : null}
              onChange={(option) => {
                if (option) setActiveProjectKey(String(option.value));
              }}
              isSearchable
            />
          </div>
        ) : null}

        {projectsQuery.isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "var(--ds-space-600)",
            }}
          >
            <Spinner size="large" />
          </div>
        ) : projectsQuery.isError ? (
          <SectionMessage appearance="error" title="Could not load projects">
            {projectsQuery.error instanceof Error
              ? projectsQuery.error.message
              : "Please try again."}
          </SectionMessage>
        ) : !activeProject ? (
          <EmptyState
            header="No projects"
            description="You are not a member of a project with Document Intelligence sources."
          />
        ) : artifactsQuery.isError ? (
          <SectionMessage appearance="error" title="Could not load deliverables">
            {artifactsQuery.error instanceof Error
              ? artifactsQuery.error.message
              : "Please try again."}
          </SectionMessage>
        ) : !artifactsQuery.isLoading && (artifactsQuery.data?.length ?? 0) === 0 ? (
          <EmptyState
            size="compact"
            header="No deliverables yet"
            description="Open a source to create a cited deliverable for this project."
            primaryAction={(
              <Button appearance="primary" onClick={() => navigate(Routes.docintel.library())}>
                Browse sources
              </Button>
            )}
          />
        ) : (
          <JiraTable<DocintelProjectArtifact>
            columns={columns}
            data={artifactsQuery.data ?? []}
            getRowId={(artifact) => artifact.id}
            onRowClick={(artifact) => setOpenArtifactId(artifact.id)}
            isLoading={artifactsQuery.isLoading}
            ariaLabel="Project deliverables"
          />
        )}
      </div>

      <CatalystDrawer
        isOpen={Boolean(openArtifactId)}
        onClose={() => setOpenArtifactId(null)}
        label="Deliverable details"
        width="wide"
      >
        {openArtifactId ? <ArtifactView artifactId={openArtifactId} /> : null}
      </CatalystDrawer>
    </AtlaskitPageShell>
  );
}
