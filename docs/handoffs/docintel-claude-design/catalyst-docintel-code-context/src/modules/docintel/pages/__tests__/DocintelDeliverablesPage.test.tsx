import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Column } from "@/components/shared/JiraTable/types";
import type { DocintelProjectArtifact } from "../../domain";

const mocks = vi.hoisted(() => ({
  useDocintelProjects: vi.fn(),
  useProjectArtifacts: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "story-user" } }),
}));

vi.mock("../../hooks/useActiveDocintelProject", () => ({
  useActiveDocintelProject: (projects: Array<{ id: string; key: string; name: string }>) => ({
    activeProject: projects[0] ?? null,
    setActiveProjectKey: vi.fn(),
  }),
}));

vi.mock("../../hooks/useDocintel", () => ({
  useDocintelProjects: mocks.useDocintelProjects,
  useProjectArtifacts: mocks.useProjectArtifacts,
}));

vi.mock("../../components/DocintelNavigation", () => ({
  DocintelNavigation: () => <nav aria-label="Document Intelligence" />,
}));

vi.mock("../../components/ArtifactView", () => ({
  ArtifactView: ({ artifactId }: { artifactId: string }) => (
    <div>{`Artifact detail ${artifactId}`}</div>
  ),
}));

vi.mock("@/components/ads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ads")>();
  return {
    ...actual,
    CatalystDrawer: ({
      isOpen,
      onClose,
      label,
      children,
    }: {
      isOpen: boolean;
      onClose: () => void;
      label: string;
      children: ReactNode;
    }) => isOpen ? (
      <aside aria-label={label}>
        <button type="button" onClick={onClose}>Close drawer</button>
        {children}
      </aside>
    ) : null,
  };
});

vi.mock("@/components/shared/JiraTable", () => ({
  JiraTable: ({
    columns,
    data,
    ariaLabel,
    onRowClick,
  }: {
    columns: Column<DocintelProjectArtifact>[];
    data: DocintelProjectArtifact[];
    ariaLabel: string;
    onRowClick?: (row: DocintelProjectArtifact) => void;
  }) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((column) => <th key={column.id}>{column.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map((column) => (
              <td key={column.id}>
                {column.cell({ row, value: column.accessor?.(row), commit: vi.fn() })}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

import DocintelDeliverablesPage from "../DocintelDeliverablesPage";

const project = { id: "project-1", key: "BAU", name: "BAU transformation" };
const artifactId = "artifact-summary";
const artifact: DocintelProjectArtifact = {
  id: artifactId,
  project_id: project.id,
  document_ids: ["audio-test-revenue-target"],
  artifact_type: "summary_en",
  title: "Document Summary",
  content: null,
  content_md: null,
  grounding_score: null,
  status: "draft",
  promoted_work_item_id: null,
  rejection_reason: null,
  created_at: "2026-07-09T00:00:00.000Z",
  updated_at: null,
  source_documents: [
    {
      id: "audio-test-revenue-target",
      title: "Audio Test — Revenue Target",
      slug: "audio-test-revenue-target",
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/doc-intelligence/views/deliverables"]}>
      <DocintelDeliverablesPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("DocintelDeliverablesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDocintelProjects.mockReturnValue({
      data: [project],
      isLoading: false,
      isError: false,
      error: null,
    });
    mocks.useProjectArtifacts.mockReturnValue({
      data: [artifact],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("renders only persisted source, title, type, review, grounding and updated values", () => {
    const { container } = renderPage();

    expect(screen.getByRole("table", { name: "Project deliverables" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Source",
      "Title",
      "Type",
      "Review",
      "Grounding",
      "Updated",
    ]);
    expect(screen.getByText("Audio Test — Revenue Target")).toBeInTheDocument();
    expect(screen.getByText("Document Summary")).toBeInTheDocument();
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /edit|save/i })).not.toBeInTheDocument();
    expect(container.querySelector(`a[href*="${artifactId}"]`)).toBeNull();
  });

  it("opens details in a drawer and keeps the deliverables URL unchanged", () => {
    renderPage();

    fireEvent.click(screen.getByText("Document Summary"));

    expect(screen.getByRole("complementary", { name: "Deliverable details" })).toBeInTheDocument();
    expect(screen.getByText(`Artifact detail ${artifactId}`)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/doc-intelligence/views/deliverables",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    expect(screen.queryByText(`Artifact detail ${artifactId}`)).not.toBeInTheDocument();
  });

  it("renders an honest empty project state without an edit affordance", () => {
    mocks.useProjectArtifacts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    renderPage();

    expect(screen.getByText("No deliverables yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse sources" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /edit|save/i })).not.toBeInTheDocument();
  });
});
