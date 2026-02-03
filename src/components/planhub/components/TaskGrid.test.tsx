import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import TaskGrid from "./TaskGrid";
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
    days: 10,
    progress: 50,
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
    children: [
      {
        id: "task-1",
        plan_id: "plan-1",
        parent_id: "phase-1",
        wbs: "1.1",
        name: "Task 1",
        type: "task",
        days: 5,
        progress: 100,
        is_flagged: false,
        is_expanded: true,
        position: 0,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        assignee_id: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        depth: 1,
        children: [],
      },
    ],
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
    is_flagged: true,
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

describe("TaskGrid", () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders task grid container", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: mockTasks, onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.querySelector(".ph-task-grid")).toBeInTheDocument();
  });

  it("renders task grid with headers", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: mockTasks, onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("WBS");
    expect(container.textContent).toContain("Task Name");
  });

  it("displays task names correctly", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: mockTasks, onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("Phase 1");
    expect(container.textContent).toContain("Task 1");
    expect(container.textContent).toContain("Milestone 1");
  });

  it("displays WBS numbers correctly", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: mockTasks, onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("1.1");
  });

  it("displays progress values", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: mockTasks, onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent).toContain("50%");
    expect(container.textContent).toContain("100%");
  });

  it("renders empty state when no tasks", () => {
    const { container } = render(
      React.createElement(TaskGrid, { tasks: [], onUpdate: mockOnUpdate }),
      { wrapper: createWrapper() }
    );

    expect(container.textContent?.toLowerCase()).toContain("no tasks");
  });
});
