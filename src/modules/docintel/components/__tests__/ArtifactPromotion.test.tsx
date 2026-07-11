import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DocintelArtifact, DocintelArtifactStatus } from "../../types";
import { ArtifactView } from "../ArtifactView";
import { PromoteArtifactModal } from "../PromoteArtifactModal";

const mocks = vi.hoisted(() => ({
  createWorkItem: vi.fn(),
  getUser: vi.fn(),
  linkDocument: vi.fn(),
  markArtifactPromoted: vi.fn(),
  useArtifact: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

vi.mock("@/services/workItemService", () => ({
  createWorkItem: mocks.createWorkItem,
}));

vi.mock("@/hooks/useApprovedProfiles", () => ({
  useApprovedProfiles: () => ({ data: [] }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
  },
}));

vi.mock("../../domain", () => ({
  docintelApi: {
    linkDocument: mocks.linkDocument,
    markArtifactPromoted: mocks.markArtifactPromoted,
  },
}));

vi.mock("../../hooks/useDocintel", () => ({
  useArtifact: mocks.useArtifact,
}));

vi.mock("../../hooks/useArtifactGovernance", () => ({
  useApproveArtifact: () => ({ mutate: mocks.approve, isPending: false }),
  useRejectArtifact: () => ({
    mutate: mocks.reject,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/components/catalyst-detail-views/shared/ProposalTable", () => ({
  ProposalTable: ({ rows }: { rows: Array<{ title: string }> }) => (
    <div aria-label="Promotion proposal">
      {rows.map((row) => <span key={row.title}>{row.title}</span>)}
    </div>
  ),
}));

function artifact(
  status: DocintelArtifactStatus,
  overrides: Partial<DocintelArtifact> = {},
): DocintelArtifact {
  return {
    id: "artifact-epic",
    project_id: "project-1",
    document_ids: ["audio-test-revenue-target"],
    artifact_type: "epic",
    title: "Revenue Target Epic",
    content: {
      items: [
        {
          title: "Revenue Target Epic",
          description_md: "Delivery scope grounded in the approved source.",
          kind: "epic",
        },
      ],
    },
    content_md: "Delivery scope grounded in the approved source.",
    grounding_score: null,
    status,
    promoted_work_item_id: null,
    rejection_reason: null,
    created_at: "2026-07-11T00:00:00.000Z",
    ...overrides,
  };
}

function createClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(["ph-work-types", "project-1"], [
    { id: "epic-type", name: "Epic", level: "epic" },
  ]);
  client.setQueryData(["ph-statuses-default", "project-1"], [
    { id: "todo", name: "To Do", is_default: true },
  ]);
  return client;
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createClient()}>
      {children}
    </QueryClientProvider>
  );
}

function renderArtifactView(status: DocintelArtifactStatus) {
  mocks.useArtifact.mockReturnValue({
    data: { artifact: artifact(status), citations: [] },
    isLoading: false,
    isError: false,
    error: null,
  });
  return render(<ArtifactView artifactId="artifact-epic" />, { wrapper: Providers });
}

describe("ArtifactView promotion governance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["draft", "verified", "rejected", "promoted"] as const)(
    "%s artifacts cannot start promotion",
    (status) => {
      renderArtifactView(status);
      expect(
        screen.queryByRole("button", { name: "Promote to work items" }),
      ).not.toBeInTheDocument();
    },
  );

  it("approved artifacts can open promotion", () => {
    renderArtifactView("approved");
    const promote = screen.getByRole("button", { name: "Promote to work items" });
    expect(promote).toBeEnabled();
    fireEvent.click(promote);
    expect(
      screen.getByRole("dialog", { name: "Promote to work items" }),
    ).toBeInTheDocument();
  });
});

describe("PromoteArtifactModal provenance recovery", () => {
  const onClose = vi.fn();
  const onPromoted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "reviewer-1" } } });
    mocks.createWorkItem.mockResolvedValue({
      id: "work-1",
      item_key: "BAU-7001",
      title: "Revenue Target Epic",
    });
    mocks.markArtifactPromoted.mockResolvedValue(undefined);
    mocks.linkDocument.mockResolvedValue(undefined);
  });

  function renderModal() {
    return render(
      <PromoteArtifactModal
        artifact={artifact("approved")}
        projectId="project-1"
        isOpen
        onClose={onClose}
        onPromoted={onPromoted}
      />,
      { wrapper: Providers },
    );
  }

  it("keeps created work visible and retries only failed provenance links", async () => {
    mocks.linkDocument
      .mockRejectedValueOnce(new Error("Link unavailable"))
      .mockResolvedValueOnce(undefined);
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Promote 1 item" }));

    expect(
      await screen.findByText("Work created; provenance incomplete"),
    ).toBeInTheDocument();
    expect(screen.getByText("BAU-7001")).toBeInTheDocument();
    expect(
      screen.getByText("The work items below were created and have not been deleted or recreated."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry provenance" })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.createWorkItem).toHaveBeenCalledTimes(1);
    expect(mocks.markArtifactPromoted).toHaveBeenCalledTimes(1);
    expect(mocks.linkDocument).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry provenance" }));

    expect(await screen.findByText("Promotion recovered")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry provenance" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
    expect(mocks.createWorkItem).toHaveBeenCalledTimes(1);
    expect(mocks.markArtifactPromoted).toHaveBeenCalledTimes(1);
    expect(mocks.linkDocument).toHaveBeenCalledTimes(2);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reports full success and closes only after status and source links persist", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Promote 1 item" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.createWorkItem).toHaveBeenCalledTimes(1);
    expect(mocks.markArtifactPromoted).toHaveBeenCalledWith("artifact-epic", "work-1");
    expect(mocks.linkDocument).toHaveBeenCalledWith(
      "audio-test-revenue-target",
      "epic",
      "work-1",
      "promotion",
    );
    expect(onPromoted).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText("Work created; provenance incomplete"),
    ).not.toBeInTheDocument();
  });
});
