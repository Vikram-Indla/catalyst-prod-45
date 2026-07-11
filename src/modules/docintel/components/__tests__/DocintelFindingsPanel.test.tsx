import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Column } from "@/components/shared/JiraTable/types";
import type { DocintelRequirementFact } from "../../types";
import { DocintelFindingsPanel } from "../DocintelFindingsPanel";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  useRequirementFacts: vi.fn(),
  useUpdateFactReview: vi.fn(),
}));

vi.mock("../../hooks/useDocintel", () => ({
  useRequirementFacts: mocks.useRequirementFacts,
  useUpdateFactReview: mocks.useUpdateFactReview,
}));

vi.mock("@/components/shared/JiraTable", () => ({
  JiraTable: ({
    columns,
    data,
    ariaLabel,
    emptyView,
  }: {
    columns: Column<DocintelRequirementFact>[];
    data: DocintelRequirementFact[];
    ariaLabel: string;
    emptyView: React.ReactNode;
  }) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>{emptyView}</td>
          </tr>
        ) : (
          data.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.id}>
                  {column.cell({ row, value: column.accessor?.(row), commit: vi.fn() })}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  ),
}));

function fact(overrides: Partial<DocintelRequirementFact> = {}): DocintelRequirementFact {
  return {
    id: "fact-1",
    document_id: "doc-1",
    project_id: "project-1",
    kind: "requirement",
    statement_en: "Suppliers must confirm available capacity.",
    statement_ar: "يجب على الموردين تأكيد السعة المتاحة.",
    confidence: 0.9,
    source_block_ids: ["hidden-block"],
    source_page_numbers: [2, 4],
    review_status: "unreviewed",
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-07-11T00:00:00Z",
    ...overrides,
  };
}

describe("DocintelFindingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useUpdateFactReview.mockReturnValue({ mutate: mocks.mutate, isPending: false });
    mocks.useRequirementFacts.mockReturnValue({
      data: [fact()],
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it("renders the canonical five-column findings contract without extraction controls", () => {
    render(<DocintelFindingsPanel documentId="doc-1" />);

    expect(screen.getByRole("table", { name: "Document findings" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Finding",
      "Kind",
      "Evidence",
      "Review state",
      "Action",
    ]);
    expect(screen.getByText("Suppliers must confirm available capacity.")).toBeInTheDocument();
    expect(screen.getByText("يجب على الموردين تأكيد السعة المتاحة.")).toHaveAttribute("dir", "auto");
    expect(screen.queryByRole("button", { name: /extract/i })).not.toBeInTheDocument();
  });

  it("preserves confirm, reject and reset mutation payloads", () => {
    mocks.useRequirementFacts.mockReturnValue({
      data: [fact({ id: "confirmed", review_status: "confirmed" }), fact({ id: "open" })],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DocintelFindingsPanel documentId="doc-1" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Reset" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Confirm" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "Reject" })[1]);

    expect(mocks.mutate).toHaveBeenNthCalledWith(1, {
      factId: "confirmed",
      reviewStatus: "unreviewed",
    });
    expect(mocks.mutate).toHaveBeenNthCalledWith(2, {
      factId: "open",
      reviewStatus: "confirmed",
    });
    expect(mocks.mutate).toHaveBeenNthCalledWith(3, {
      factId: "open",
      reviewStatus: "rejected",
    });
  });

  it("opens a proven page anchor without inventing quotation or technical fields", () => {
    const onOpenEvidence = vi.fn();
    render(
      <DocintelFindingsPanel documentId="doc-1" onOpenEvidence={onOpenEvidence} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

    expect(onOpenEvidence).toHaveBeenCalledWith({
      claimText: "Suppliers must confirm available capacity.",
      quotedText: null,
      pageNumber: 2,
    });
    expect(onOpenEvidence.mock.calls[0][0]).not.toHaveProperty("blockId");
    expect(onOpenEvidence.mock.calls[0][0]).not.toHaveProperty("confidence");
  });

  it("renders an honest empty state when no findings exist", () => {
    mocks.useRequirementFacts.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<DocintelFindingsPanel documentId="doc-1" />);

    expect(screen.getByText("No findings yet")).toBeInTheDocument();
  });
});
