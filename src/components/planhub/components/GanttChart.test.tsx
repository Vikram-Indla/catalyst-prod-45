import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import GanttChart from "./GanttChart";
import type { TaskTreeNode } from "@/types/planhub.types";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const today = new Date();
const startDate = new Date(today);
startDate.setDate(startDate.getDate() - 5);
const endDate = new Date(today);
endDate.setDate(endDate.getDate() + 10);

const mockTasks: TaskTreeNode[] = [
  {
    id: "phase-1",
    plan_id: "plan-1",
    parent_id: null,
    wbs: "1",
    name: "Phase 1",
    type: "phase",
    days: 15,
    progress: 33,
    is_flagged: false,
    is_expanded: true,
    position: 0,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    assignee_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    depth: 0,
    children: [],
  },
  {
    id: "milestone-1",
    plan_id: "plan-1",
    parent_id: null,
    wbs: "2",
    name: "Milestone 1",
    type: "milestone",
    days: 0,
    progress: 0,
    is_flagged: false,
    is_expanded: true,
    position: 1,
    start_date: today.toISOString(),
    end_date: today.toISOString(),
    assignee_id: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    depth: 0,
    children: [],
  },
];

describe("GanttChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders gantt chart container", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    expect(container.querySelector(".ph-gantt-chart")).toBeInTheDocument();
  });

  it("renders month headers", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    expect(container.querySelector(".ph-gantt-month")).toBeInTheDocument();
  });

  it("renders task bars", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    const bars = container.querySelectorAll(".ph-gantt-bar");
    expect(bars.length).toBeGreaterThan(0);
  });

  it("renders milestone as diamond shape", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    const milestone = container.querySelector(".ph-gantt-milestone");
    expect(milestone).toBeInTheDocument();
  });

  it("renders today line", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    const todayLine = container.querySelector(".ph-gantt-today");
    expect(todayLine).toBeInTheDocument();
  });

  it("renders progress overlay on bars", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    const progressBars = container.querySelectorAll(".ph-gantt-progress");
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it("renders empty state when no tasks", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: [] }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent?.toLowerCase()).toContain("no tasks");
  });

  it("supports horizontal scrolling", () => {
    const { container } = render(
      React.createElement(GanttChart, { tasks: mockTasks }),
      { wrapper: createWrapper() }
    );

    const scrollContainer = container.querySelector(".ph-gantt-scroll");
    expect(scrollContainer).toBeInTheDocument();
  });
});
