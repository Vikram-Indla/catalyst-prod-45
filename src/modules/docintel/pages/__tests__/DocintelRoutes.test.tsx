import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { docintelRoutes } from "@/lib/routes";

vi.mock("../DocintelHomePage", () => ({
  __esModule: true,
  default: () => <div data-testid="docintel-home">For you</div>,
  DocintelReviewPendingPage: () => <div data-testid="docintel-review">Review</div>,
  DocintelThemesPendingPage: () => <div data-testid="docintel-themes">Themes</div>,
  DocintelDeliverablesPendingPage: () => (
    <div data-testid="docintel-deliverables">Deliverables</div>
  ),
}));

vi.mock("../DocintelLibraryPage", () => ({
  __esModule: true,
  default: () => <div data-testid="docintel-library">Library</div>,
}));

vi.mock("../DocintelUploadPage", () => ({
  __esModule: true,
  default: () => <div data-testid="docintel-upload">Upload</div>,
}));

vi.mock("../DocintelHealthPage", () => ({
  __esModule: true,
  default: () => <div data-testid="docintel-health">Health</div>,
}));

vi.mock("../DocintelWorkspacePage", () => ({
  __esModule: true,
  default: () => <div data-testid="docintel-workspace">Workspace</div>,
}));

import DocintelRoutes from "../../DocintelRoutes";

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/doc-intelligence/*" element={<DocintelRoutes />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("docintelRoutes builders", () => {
  it("keeps list as a compatibility alias for Home", () => {
    expect(docintelRoutes.home()).toBe("/doc-intelligence");
    expect(docintelRoutes.list()).toBe(docintelRoutes.home());
  });

  it("uses namespaced static destinations and slug-only canonical workspaces", () => {
    expect(docintelRoutes.library()).toBe("/doc-intelligence/views/library");
    expect(docintelRoutes.themes()).toBe("/doc-intelligence/views/themes");
    expect(docintelRoutes.deliverables()).toBe("/doc-intelligence/views/deliverables");
    expect(docintelRoutes.review()).toBe("/doc-intelligence/actions/review");
    expect(docintelRoutes.workspace("industrial-brd")).toBe(
      "/doc-intelligence/source/industrial-brd",
    );
  });
});

describe("DocintelRoutes", () => {
  it.each([
    ["/doc-intelligence", "docintel-home"],
    ["/doc-intelligence/views/library", "docintel-library"],
    ["/doc-intelligence/views/themes", "docintel-themes"],
    ["/doc-intelligence/views/deliverables", "docintel-deliverables"],
    ["/doc-intelligence/actions/review", "docintel-review"],
    ["/doc-intelligence/upload", "docintel-upload"],
    ["/doc-intelligence/health", "docintel-health"],
  ])("resolves the static route %s before a document slug", async (path, testId) => {
    renderRoute(path);
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByTestId("docintel-workspace")).not.toBeInTheDocument();
  });

  it("resolves the canonical source path", async () => {
    renderRoute(docintelRoutes.workspace("industrial-brd"));
    expect(await screen.findByTestId("docintel-workspace")).toBeInTheDocument();
  });

  it("retains legacy one-segment source URLs", async () => {
    renderRoute("/doc-intelligence/industrial-brd");
    expect(await screen.findByTestId("docintel-workspace")).toBeInTheDocument();
  });

  it("renders Not Found for unknown multi-segment paths", async () => {
    renderRoute("/doc-intelligence/unknown/deeper");
    expect(
      await screen.findByText("This Document Intelligence page doesn't exist"),
    ).toBeInTheDocument();
  });
});
