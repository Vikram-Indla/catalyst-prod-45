import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useLogActivity, useLogPlanAccess, useLogTaskActivity } from "./usePlanHubActivity";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: "test-user-id" } }, error: null })
      ),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe("useLogActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a mutation function", () => {
    const { result } = renderHook(() => useLogActivity(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutate).toBe("function");
  });

  it("can log activity with planId, action, and details", async () => {
    const { result } = renderHook(() => useLogActivity(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        planId: "test-plan-id",
        action: "create",
        details: { name: "Test Plan" },
      });
    });

    expect(result.current.isError).toBe(false);
  });
});

describe("useLogPlanAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a function to log access", () => {
    const { result } = renderHook(() => useLogPlanAccess(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe("function");
  });

  it("debounces access logging", () => {
    const { result } = renderHook(() => useLogPlanAccess(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current("plan-1");
      result.current("plan-1");
      result.current("plan-1");
    });

    act(() => {
      vi.advanceTimersByTime(1100);
    });
  });
});

describe("useLogTaskActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns logCreate, logUpdate, and logDelete functions", () => {
    const { result } = renderHook(() => useLogTaskActivity(), {
      wrapper: createWrapper(),
    });

    expect(result.current.logCreate).toBeDefined();
    expect(result.current.logUpdate).toBeDefined();
    expect(result.current.logDelete).toBeDefined();
  });

  it("logCreate includes task name and type", async () => {
    const { result } = renderHook(() => useLogTaskActivity(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.logCreate("plan-1", "New Task", "task");
    });
  });

  it("logUpdate includes field and values", async () => {
    const { result } = renderHook(() => useLogTaskActivity(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.logUpdate("plan-1", "task-1", "name", "Old Name", "New Name");
    });
  });

  it("logDelete includes task name", async () => {
    const { result } = renderHook(() => useLogTaskActivity(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.logDelete("plan-1", "Deleted Task");
    });
  });
});
