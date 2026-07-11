import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mutate = vi.fn();
let factsData: Array<{ review_status: string }> | undefined = [];
let artifactsData: Array<{ status: string }> | undefined = [];

vi.mock("../../hooks/useDocintel", () => ({
  useDocintelDocument: () => ({
    document: {
      id: "document-1",
      project_id: "project-1",
      slug: "industrial-brd",
      title: "Industrial BRD",
      status: "ready",
    },
    isLoading: false,
    isError: false,
  }),
  useDocumentVersions: () => ({ data: [] }),
  useRequirementFacts: () => ({ data: factsData }),
  useArtifacts: () => ({ data: artifactsData }),
  useUploadNewVersion: () => ({ isPending: false, mutate }),
}));

vi.mock("@/components/ads", () => ({
  PageHeader: ({ title }: { title: React.ReactNode }) => <header>{title}</header>,
  Breadcrumbs: () => null,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  DropdownMenu: () => null,
  Lozenge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Spinner: () => <span>Loading</span>,
  EmptyState: ({ header }: { header: React.ReactNode }) => <div>{header}</div>,
}));

vi.mock("../../components/EvidenceViewer", () => ({
  EvidenceViewer: () => <div data-testid="evidence-panel">Evidence panel</div>,
}));
vi.mock("../../components/TranslatedDocumentView", () => ({
  TranslatedDocumentView: () => <div data-testid="document-panel">Document panel</div>,
}));
vi.mock("../../components/FactsReviewPanel", () => ({
  FactsReviewPanel: () => <div data-testid="findings-panel">Findings panel</div>,
}));
vi.mock("../../components/GenerationPanel", () => ({
  GenerationPanel: () => <div data-testid="artifacts-panel">Artifacts panel</div>,
}));
vi.mock("../../components/TraceabilityMatrix", () => ({
  TraceabilityMatrix: () => <div data-testid="traceability-panel">Traceability panel</div>,
}));
vi.mock("../../components/AskPanel", () => ({
  AskPanel: () => <div data-testid="ask-panel">Ask panel</div>,
}));
vi.mock("../../components/DocumentLinksPanel", () => ({
  DocumentLinksPanel: () => <div data-testid="links-panel">Links panel</div>,
}));
vi.mock("../../components/ThemeTags", () => ({ ThemeTags: () => null }));
vi.mock("../../components/DocintelWorkspaceOverview", () => ({
  DocintelWorkspaceOverview: ({
    findingCounts,
    deliverableCounts,
    onAsk,
    onReviewFindings,
    onCreateDeliverable,
  }: {
    findingCounts?: { total: number; unreviewed: number; confirmed: number; rejected: number };
    deliverableCounts?: { total: number; approved: number };
    onAsk: () => void;
    onReviewFindings: () => void;
    onCreateDeliverable: () => void;
  }) => (
    <div data-testid="overview-panel">
      <span>
        {findingCounts
          ? `findings ${findingCounts.total}/${findingCounts.unreviewed}/${findingCounts.confirmed}/${findingCounts.rejected}`
          : "findings unknown"}
      </span>
      <span>
        {deliverableCounts
          ? `deliverables ${deliverableCounts.total}/${deliverableCounts.approved}`
          : "deliverables unknown"}
      </span>
      <button onClick={onAsk}>Overview Ask</button>
      <button onClick={onReviewFindings}>Overview Review</button>
      <button onClick={onCreateDeliverable}>Overview Create</button>
    </div>
  ),
}));

import DocintelWorkspacePage from "../DocintelWorkspacePage";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderWorkspace(search = "") {
  return render(
    <MemoryRouter
      initialEntries={[`/doc-intelligence/source/industrial-brd${search}`]}
    >
      <Routes>
        <Route
          path="/doc-intelligence/source/:slug"
          element={
            <>
              <DocintelWorkspacePage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DocintelWorkspacePage query-addressable views", () => {
  beforeEach(() => {
    factsData = [];
    artifactsData = [];
  });

  it("selects Overview for a missing or unknown view", () => {
    const firstRender = renderWorkspace();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    firstRender.unmount();

    renderWorkspace("?view=not-a-workspace-view");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("selects the existing facts panel through ?view=findings", () => {
    renderWorkspace("?view=findings");
    expect(screen.getByRole("tab", { name: "Findings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("findings-panel")).toBeVisible();
  });

  it("writes a stable view key while preserving unrelated query parameters", () => {
    renderWorkspace("?project=BAU&view=findings");
    fireEvent.click(screen.getByRole("tab", { name: "Ask" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?project=BAU&view=ask",
    );
  });

  it("keeps every existing workspace destination reachable", () => {
    renderWorkspace();
    for (const label of [
      "Overview",
      "Evidence",
      "Document",
      "Findings",
      "Artifacts",
      "Traceability",
      "Ask",
      "Links",
    ]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
  });

  it("maps Overview actions through the same stable view keys", () => {
    renderWorkspace("?project=BAU");

    fireEvent.click(screen.getByRole("button", { name: "Overview Review" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?project=BAU&view=findings",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Overview Ask" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?project=BAU&view=ask",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Overview Create" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?project=BAU&view=artifacts",
    );
  });

  it("omits Overview counts while source reads are unavailable", () => {
    factsData = undefined;
    artifactsData = undefined;
    renderWorkspace();

    expect(screen.getByText("findings unknown")).toBeInTheDocument();
    expect(screen.getByText("deliverables unknown")).toBeInTheDocument();
  });

  it("derives Overview counts only from returned facts and artifacts", () => {
    factsData = [
      { review_status: "unreviewed" },
      { review_status: "confirmed" },
      { review_status: "rejected" },
      { review_status: "unknown" },
    ];
    artifactsData = [
      { status: "approved" },
      { status: "promoted" },
      { status: "draft" },
    ];
    renderWorkspace();

    expect(screen.getByText("findings 4/1/1/1")).toBeInTheDocument();
    expect(screen.getByText("deliverables 3/2")).toBeInTheDocument();
  });
});
