import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import React from "react";
import PlanHubShell from "./PlanHubShell";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BrowserRouter, null, children)
    );
};

describe("PlanHubShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.from).mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                key: "features",
                value: {
                  version_control: true,
                  auto_save: true,
                  scenario_compare: true,
                  master_plan_view: true,
                  resource_management: true,
                  report_center: true,
                  presentation_mode: true,
                },
              },
              error: null,
            }),
          }),
          single: vi.fn().mockResolvedValue({
            data: { features_enabled: { assistant_enabled: true } },
            error: null,
          }),
        }),
      } as any;
    });
  });

  it("renders loading state initially", () => {
    const { container } = render(React.createElement(PlanHubShell), {
      wrapper: createWrapper(),
    });
    expect(container.querySelector(".ph-spinner")).toBeInTheDocument();
  });

  it("applies planhub-module CSS class for style isolation", () => {
    const { container } = render(React.createElement(PlanHubShell), {
      wrapper: createWrapper(),
    });
    expect(container.querySelector(".planhub-module")).toBeInTheDocument();
  });

  it("renders shell structure with sidebar", () => {
    const { container } = render(React.createElement(PlanHubShell), {
      wrapper: createWrapper(),
    });
    expect(container.querySelector(".ph-shell")).toBeInTheDocument();
  });
});
