import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

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
  PageHeader: ({
    title,
    actions,
  }: {
    title: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <header>
      {title}
      {actions}
    </header>
  ),
  Breadcrumbs: () => null,
  Button: React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(function MockButton({ children, ...props }, ref) {
    return <button ref={ref} {...props}>{children}</button>;
  }),
  DropdownMenu: () => null,
  Lozenge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Spinner: () => <span>Loading</span>,
  EmptyState: ({ header }: { header: React.ReactNode }) => <div>{header}</div>,
}));

vi.mock("../../components/DocintelFindingsPanel", () => ({
  DocintelFindingsPanel: ({
    onOpenEvidence,
  }: {
    onOpenEvidence?: (evidence: { claimText: string; quotedText: string; pageNumber: number }) => void;
  }) => (
    <div data-testid="findings-panel">
      Findings panel
      <button
        onClick={() => onOpenEvidence?.({
          claimText: "Revenue target",
          quotedText: "The quarterly target is $4 million.",
          pageNumber: 1,
        })}
      >
        Open finding evidence
      </button>
    </div>
  ),
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
vi.mock("../../components/DocintelSourceDrawer", () => ({
  DocintelSourceDrawer: ({
    isOpen,
    onClose,
    documentId,
    initialView,
    exactEvidence,
  }: {
    isOpen: boolean;
    onClose: () => void;
    documentId: string;
    initialView?: string;
    exactEvidence?: { claimText?: string } | null;
  }) => isOpen ? (
    <aside aria-label="Source and evidence">
      <span>{`source ${documentId} ${initialView} ${exactEvidence?.claimText ?? ""}`}</span>
      <button onClick={onClose}>Close source</button>
    </aside>
  ) : null,
}));

import DocintelWorkspacePage from "../DocintelWorkspacePage";

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div>
      <output data-testid="location-search">{location.search}</output>
      <button onClick={() => navigate(-1)}>History back</button>
      <button onClick={() => navigate(1)}>History forward</button>
    </div>
  );
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

  it("exposes only the five customer-facing workspace destinations", () => {
    renderWorkspace();
    for (const label of [
      "Overview",
      "Ask",
      "Findings",
      "Deliverables",
      "Work items",
    ]) {
      expect(screen.getByRole("tab", { name: label })).toBeInTheDocument();
    }
    for (const implementationLabel of ["Evidence", "Document", "Artifacts", "Links"]) {
      expect(screen.queryByRole("tab", { name: implementationLabel })).not.toBeInTheDocument();
    }
  });

  it("keeps the ADS tab list keyboard reachable", () => {
    renderWorkspace();
    const overview = screen.getByRole("tab", { name: "Overview" });
    const ask = screen.getByRole("tab", { name: "Ask" });

    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight", code: "ArrowRight" });

    expect(ask).toHaveFocus();
    expect(ask).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("location-search")).toHaveTextContent("?view=ask");
  });

  it("follows browser history when workspace views change", () => {
    renderWorkspace("?view=overview");
    fireEvent.click(screen.getByRole("tab", { name: "Ask" }));
    fireEvent.click(screen.getByRole("tab", { name: "Deliverables" }));

    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByRole("tab", { name: "Ask" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("location-search")).toHaveTextContent("?view=ask");

    fireEvent.click(screen.getByRole("button", { name: "History forward" }));
    expect(screen.getByRole("tab", { name: "Deliverables" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("location-search")).toHaveTextContent("?view=deliverables");
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
      "?project=BAU&view=deliverables",
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

  it("opens the readable source drawer and returns focus when it closes", () => {
    renderWorkspace();
    const trigger = screen.getByRole("button", { name: "View source" });

    fireEvent.click(trigger);
    expect(screen.getByRole("complementary", { name: "Source and evidence" }))
      .toHaveTextContent("source document-1 source");

    fireEvent.click(screen.getByRole("button", { name: "Close source" }));
    expect(screen.queryByRole("complementary", { name: "Source and evidence" }))
      .not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("opens exact evidence emitted by Findings without inventing workspace evidence", () => {
    renderWorkspace("?view=findings");

    fireEvent.click(screen.getByRole("button", { name: "Open finding evidence" }));
    expect(screen.getByRole("complementary", { name: "Source and evidence" }))
      .toHaveTextContent("source document-1 evidence Revenue target");
  });

  it("preserves the legacy artifact destination through Deliverables", () => {
    const legacyArtifacts = renderWorkspace("?view=artifacts");
    expect(screen.getByRole("tab", { name: "Deliverables" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("artifacts-panel")).toBeVisible();
    legacyArtifacts.unmount();
  });

  it.each(["links", "traceability"])(
    "maps legacy view=%s once into Work items with both peer views reachable",
    (legacyView) => {
      renderWorkspace(`?view=${legacyView}`);

      expect(screen.getByRole("tab", { name: "Work items" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getAllByRole("tab", { name: "Linked work" })).toHaveLength(1);
      expect(screen.getAllByRole("tab", { name: "Traceability" })).toHaveLength(1);
      expect(screen.getAllByTestId("links-panel")).toHaveLength(1);

      fireEvent.click(screen.getByRole("tab", { name: "Traceability" }));
      expect(screen.getAllByTestId("traceability-panel")).toHaveLength(1);
    },
  );
});
