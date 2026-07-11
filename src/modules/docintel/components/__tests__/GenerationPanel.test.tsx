import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Column } from "@/components/shared/JiraTable/types";
import type { DocintelArtifact } from "../../types";
import { GenerationPanel } from "../GenerationPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useArtifacts: vi.fn(),
  useGenerateArtifact: vi.fn(),
}));

vi.mock("../../hooks/useDocintel", () => ({
  useArtifacts: mocks.useArtifacts,
  useGenerateArtifact: mocks.useGenerateArtifact,
}));

vi.mock("@/components/ads", () => ({
  Button: ({
    children,
    isDisabled,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isDisabled?: boolean }) => (
    <button disabled={isDisabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Heading: ({ children, id }: { children: React.ReactNode; id?: string }) => (
    <h3 id={id}>{children}</h3>
  ),
  Lozenge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Spinner: ({ size }: { size: string }) => <span data-testid={`spinner-${size}`}>Loading</span>,
  EmptyState: ({
    header,
    description,
  }: {
    header: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div>
      <span>{header}</span>
      <span>{description}</span>
    </div>
  ),
  SectionMessage: ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div role="alert">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/shared/JiraTable", () => ({
  JiraTable: ({
    columns,
    data,
    getRowId,
    onRowClick,
    ariaLabel,
  }: {
    columns: Column<DocintelArtifact>[];
    data: DocintelArtifact[];
    getRowId: (artifact: DocintelArtifact) => string;
    onRowClick?: (artifact: DocintelArtifact) => void;
    ariaLabel: string;
  }) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((column) => <th key={column.id}>{column.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={getRowId(row)} onClick={() => onRowClick?.(row)}>
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

vi.mock("../ArtifactView", () => ({
  ArtifactView: ({ artifactId }: { artifactId: string }) => (
    <div data-testid="artifact-view">Opened {artifactId}</div>
  ),
}));

const EXPECTED_TYPES = [
  { value: "summary_en", label: "Executive Summary" },
  { value: "summary_ar", label: "الملخص" },
  { value: "gap_analysis", label: "Gap Analysis" },
  { value: "open_questions", label: "Open Questions" },
  { value: "brd", label: "Full BRD" },
  { value: "epic", label: "Epic" },
  { value: "story", label: "User Stories" },
  { value: "business_process", label: "Business Process" },
  { value: "acceptance_criteria", label: "Acceptance Criteria" },
  { value: "test_cases", label: "Test Cases" },
  { value: "traceability", label: "Traceability Matrix" },
  { value: "release_notes", label: "Release Notes" },
] as const;

function artifact(overrides: Partial<DocintelArtifact> = {}): DocintelArtifact {
  return {
    id: "artifact-1",
    project_id: "project-1",
    document_id: "document-1",
    artifact_type: "brd",
    title: "Approved BRD",
    content_en: null,
    content_ar: null,
    grounding_score: 0.9,
    status: "approved",
    created_by: "user-1",
    created_at: "2026-07-11T00:00:00Z",
    updated_at: "2026-07-11T00:00:00Z",
    ...overrides,
  };
}

describe("GenerationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useArtifacts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });
    mocks.useGenerateArtifact.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  it("groups the twelve deliverable types by the three locked customer outcomes", () => {
    render(<GenerationPanel projectId="project-1" documentId="document-1" />);

    const understand = screen.getByRole("heading", { name: "Understand" }).parentElement!;
    const plan = screen.getByRole("heading", { name: "Plan delivery" }).parentElement!;
    const validate = screen.getByRole("heading", { name: "Validate and ship" }).parentElement!;

    for (const label of ["Executive Summary", "الملخص", "Gap Analysis", "Open Questions"]) {
      expect(within(understand).getByRole("button", { name: new RegExp(`^${label}:`) }))
        .toBeInTheDocument();
    }
    for (const label of ["Full BRD", "Epic", "User Stories", "Business Process"]) {
      expect(within(plan).getByRole("button", { name: new RegExp(`^${label}:`) }))
        .toBeInTheDocument();
    }
    for (const label of ["Acceptance Criteria", "Test Cases", "Traceability Matrix", "Release Notes"]) {
      expect(within(validate).getByRole("button", { name: new RegExp(`^${label}:`) }))
        .toBeInTheDocument();
    }
  });

  it("preserves every exact artifact value and the unchanged generation payload", () => {
    render(<GenerationPanel projectId="project-1" documentId="document-1" />);

    for (const expected of EXPECTED_TYPES) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${expected.label}:`) }));
      fireEvent.click(screen.getByRole("button", { name: `Generate ${expected.label}` }));

      const [payload, options] = mocks.mutate.mock.calls.at(-1)!;
      expect(payload).toEqual({
        projectId: "project-1",
        documentIds: ["document-1"],
        artifactType: expected.value,
      });
      expect(options).toEqual(expect.objectContaining({ onSuccess: expect.any(Function) }));
    }

    expect(mocks.mutate).toHaveBeenCalledTimes(12);
  });

  it("renders honest empty, loading and generation-in-flight states", () => {
    const empty = render(<GenerationPanel projectId="project-1" documentId="document-1" />);
    expect(screen.getByText("No artifacts yet")).toBeInTheDocument();
    empty.unmount();

    mocks.useArtifacts.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    const loading = render(<GenerationPanel projectId="project-1" documentId="document-1" />);
    expect(screen.getByTestId("spinner-medium")).toBeInTheDocument();
    loading.unmount();

    mocks.useGenerateArtifact.mockReturnValue({
      mutate: mocks.mutate,
      isPending: true,
      isError: false,
      error: null,
    });
    render(<GenerationPanel projectId="project-1" documentId="document-1" />);
    expect(screen.getByText("Generating… 0s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Executive Summary" })).toBeDisabled();
    for (const expected of EXPECTED_TYPES) {
      expect(screen.getByRole("button", { name: new RegExp(`^${expected.label}:`) })).toBeDisabled();
    }
  });

  it("surfaces both generation and history read failures honestly", () => {
    mocks.useGenerateArtifact.mockReturnValue({
      mutate: mocks.mutate,
      isPending: false,
      isError: true,
      error: new Error("Generation service unavailable"),
    });
    mocks.useArtifacts.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("History unavailable"),
    });

    render(<GenerationPanel projectId="project-1" documentId="document-1" />);

    expect(screen.getByText("Generation failed")).toBeInTheDocument();
    expect(screen.getByText("Generation service unavailable")).toBeInTheDocument();
    expect(screen.getByText("Could not load artifacts")).toBeInTheDocument();
    expect(screen.getByText("History unavailable")).toBeInTheDocument();
  });

  it("renders canonical history, review states and an opened artifact", () => {
    mocks.useArtifacts.mockReturnValue({
      data: [
        artifact(),
        artifact({
          id: "artifact-2",
          artifact_type: "gap_analysis",
          title: "Rejected gap analysis",
          grounding_score: null,
          status: "rejected",
        }),
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GenerationPanel projectId="project-1" documentId="document-1" />);

    expect(screen.getByRole("table", { name: "Generated deliverables" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Title",
      "Type",
      "Grounding",
      "Review state",
      "Created",
    ]);
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByText("rejected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("row", { name: /Approved BRD/ }));
    expect(screen.getByTestId("artifact-view")).toHaveTextContent("Opened artifact-1");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("artifact-view")).not.toBeInTheDocument();
  });

  it("opens the artifact returned by a successful generation", () => {
    mocks.mutate.mockImplementation((_payload, options) => {
      options.onSuccess({ artifactId: "generated-artifact" });
    });

    render(<GenerationPanel projectId="project-1" documentId="document-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Generate Executive Summary" }));

    expect(screen.getByTestId("artifact-view")).toHaveTextContent("Opened generated-artifact");
  });
});
