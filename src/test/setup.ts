import "@testing-library/jest-dom";
import { vi } from "vitest";

// WorkItemTypeIcon uses useQuery (react-query) — stub globally to avoid QueryClientProvider requirement.
vi.mock("@/components/icons/WorkItemTypeIcon", () => ({
  WorkItemTypeIcon: ({ type, size = 16 }: { type: string; size?: number }) => {
    const React = require("react");
    return React.createElement("img", {
      src: `/icons/${(type || "task").toLowerCase()}.svg`,
      alt: type,
      width: size,
      height: size,
      "aria-label": type,
      "data-testid": `work-type-icon--${type}`,
    });
  },
  default: ({ type, size = 16 }: { type: string; size?: number }) => {
    const React = require("react");
    return React.createElement("img", {
      src: `/icons/${(type || "task").toLowerCase()}.svg`,
      alt: type,
      width: size,
      height: size,
    });
  },
}));

// Stub Atlaskit platform feature flags to prevent "Client must be initialized" errors.
// The CJS resolver checks for a global booleanResolver before calling FeatureGates.checkGate.
// Setting it to always return false short-circuits the uninitialized client throw.
(globalThis as any)['__PLATFORM_FEATURE_FLAGS__'] = { booleanResolver: () => false };

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(function() {
  this.observe = vi.fn();
  this.unobserve = vi.fn();
  this.disconnect = vi.fn();
});

// Mock Supabase client — chainable proxy so any .method() depth resolves cleanly.
// Terminal methods (single, then) resolve; all others return a new proxy.
function makeChainableQuery(resolvedData = { data: null, error: null }) {
  const proxy: any = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === 'then') {
        // Make the proxy thenable so `await query` works
        return (resolve: (v: any) => void) => resolve(resolvedData);
      }
      if (prop === 'single') {
        return vi.fn(() => Promise.resolve(resolvedData));
      }
      if (prop === 'in') {
        // .in() resolves with array data
        return vi.fn(() => makeChainableQuery({ data: [], error: null }));
      }
      // All other query builder methods (eq, is, or, order, limit, ilike, neq, not, gt, lt, gte, lte, filter)
      return vi.fn(() => makeChainableQuery({ data: [], error: null }));
    },
  });
  return proxy;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => makeChainableQuery({ data: [], error: null })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: "test-id" }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: "test-user" } }, error: null })),
    },
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
        subscribe: vi.fn(),
      })),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));
