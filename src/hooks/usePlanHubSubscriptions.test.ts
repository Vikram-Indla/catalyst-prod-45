import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePlanSubscription, useSettingsSubscription } from "./usePlanHubSubscriptions";

// Track channel subscriptions
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe("usePlanSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a channel for the plan when planId is provided", () => {
    renderHook(() => usePlanSubscription("test-plan-id"), {
      wrapper: createWrapper(),
    });

    expect(supabase.channel).toHaveBeenCalledWith("plan:test-plan-id");
  });

  it("subscribes to task, resource, comment, and plan changes", () => {
    renderHook(() => usePlanSubscription("test-plan-id"), {
      wrapper: createWrapper(),
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("does not create channel when planId is null", () => {
    renderHook(() => usePlanSubscription(null), {
      wrapper: createWrapper(),
    });

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("removes channel on unmount", () => {
    const { unmount } = renderHook(() => usePlanSubscription("test-plan-id"), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

describe("useSettingsSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a settings channel", () => {
    renderHook(() => useSettingsSubscription(), {
      wrapper: createWrapper(),
    });

    expect(supabase.channel).toHaveBeenCalledWith("planhub-settings");
  });

  it("subscribes to settings and AI config changes", () => {
    renderHook(() => useSettingsSubscription(), {
      wrapper: createWrapper(),
    });

    expect(mockChannel.on).toHaveBeenCalled();
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("removes channel on unmount", () => {
    const { unmount } = renderHook(() => useSettingsSubscription(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
