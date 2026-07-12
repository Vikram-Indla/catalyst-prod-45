import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Column } from "@/components/shared/JiraTable/types";
import type { DocintelDocument } from "../../types";

const mocks = vi.hoisted(() => ({
  useDocintelDocuments: vi.fn(),
  useDocintelProjects: vi.fn(),
  useDocintelThemes: vi.fn(),
  useThemeDocumentIds: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "library-user" } }),
}));

vi.mock("../../hooks/useActiveDocintelProject", () => ({
  useActiveDocintelProject: (projects: Array<{ id: string; key: string; name: string }>) => ({
    activeProject: projects[0] ?? null,
    setActiveProjectKey: vi.fn(),
  }),
}));

vi.mock("../../hooks/useDocintel", () => ({
  useDocintelDocuments: mocks.useDocintelDocuments,
  useDocintelProjects: mocks.useDocintelProjects,
  useDocintelThemes: mocks.useDocintelThemes,
  useThemeDocumentIds: mocks.useThemeDocumentIds,
}));

vi.mock("../../components/DocintelNavigation", () => ({
  DocintelNavigation: () => <nav aria-label="Document Intelligence" />,
}));

vi.mock("../../components/AskPanel", () => ({
  AskPanel: () => <div>Ask panel</div>,
}));

vi.mock("@/components/ads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/ads")>();
  return {
    ...actual,
    CatalystDrawer: ({ children }: { children: ReactNode }) => <aside>{children}</aside>,
  };
});

vi.mock("@/components/shared/JiraTable", () => ({
  JiraTable: ({
    columns,
    data,
    ariaLabel,
    onRowClick,
  }: {
    columns: Column<DocintelDocument>[];
    data: DocintelDocument[];
    ariaLabel: string;
    onRowClick?: (row: DocintelDocument) => void;
  }) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>{columns.map((column) => <th key={column.id}>{column.label}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} onClick={() => onRowClick?.(row)}>
            {columns.map((column) => (
              <td key={column.id}>{column.cell({ row, value: column.accessor?.(row), commit: vi.fn() })}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

import DocintelLibraryPage from "../DocintelLibraryPage";

const project = { id: "project-1", key: "BAU", name: "BAU transformation" };

function source(overrides: Partial<DocintelDocument>): DocintelDocument {
  return {
    id: "source-1",
    project_id: project.id,
    slug: "source-one",
    title: "Industrial Scanning BRD",
    source_type: "document",
    original_file_name: "industrial-scanning-brd.pdf",
    mime_type: "application/pdf",
    storage_path: "project-1/industrial-scanning-brd.pdf",
    file_size: 428_000,
    page_count: 24,
    source_language: "en",
    status: "ready",
    status_detail: null,
    latency_ms: null,
    content_hash: null,
    error_message: null,
    created_by: null,
    created_at: "2026-07-10T08:00:00.000Z",
    updated_at: "2026-07-11T10:00:00.000Z",
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/doc-intelligence/views/library"]}>
      <DocintelLibraryPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("DocintelLibraryPage source identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useDocintelProjects.mockReturnValue({ data: [project], isLoading: false, isError: false });
    mocks.useDocintelThemes.mockReturnValue({ data: [], isLoading: false, isError: false });
    mocks.useThemeDocumentIds.mockReturnValue({ data: undefined, isLoading: false });
    mocks.useDocintelDocuments.mockReturnValue({
      data: [
        source({ id: "document", slug: "industrial-scanning-brd" }),
        source({
          id: "jira",
          slug: "bau-6122",
          title: "BAU-6122 — Spare part exemption",
          source_type: "jira",
          mime_type: "",
          storage_path: "",
          page_count: null,
          status: "needs_review",
        }),
        source({
          id: "git",
          slug: "readme-md",
          title: "README.md",
          source_type: "git",
          mime_type: "",
          storage_path: "",
          page_count: null,
          status: "queued",
        }),
        source({
          id: "unknown",
          slug: "external-source",
          title: "External source",
          source_type: "confluence",
          page_count: null,
          status: "failed",
        }),
      ],
      isLoading: false,
      isError: false,
    });
  });

  it("shows only persisted source identity and useful state for mixed source types", () => {
    renderPage();

    expect(screen.getByRole("table", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Title", "Source", "State", "Pages", "Updated",
    ]);
    expect(screen.getByText("Uploaded document")).toBeInTheDocument();
    expect(screen.getByText("Jira issue")).toBeInTheDocument();
    expect(screen.getByText("Git file")).toBeInTheDocument();
    expect(screen.getByText("confluence")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText(/deliverable|review count/i)).not.toBeInTheDocument();
  });

  it("keeps canonical row navigation on the document slug", () => {
    renderPage();
    fireEvent.click(screen.getByText("README.md"));
    expect(screen.getByTestId("location")).toHaveTextContent("/doc-intelligence/source/readme-md");
  });

  it("renders a load error instead of a misleading empty state", () => {
    mocks.useDocintelDocuments.mockReturnValue({
      data: [], isLoading: false, isError: true, error: new Error("Sources are unavailable."),
    });
    renderPage();
    expect(screen.getByText("Could not load sources")).toBeInTheDocument();
    expect(screen.getByText("Sources are unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("No documents yet")).not.toBeInTheDocument();
  });
});
