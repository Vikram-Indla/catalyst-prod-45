import "@testing-library/jest-dom";
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Default provider wrapper for every render/renderHook call.
//
// Most component tests exercise components that call useQuery / useAuth but
// were written with a bare render(). Rather than sweeping 100+ test files,
// wrap every render in a fresh QueryClientProvider and a stub AuthContext.
// A test-supplied `wrapper` still applies — it is composed INSIDE the
// defaults, so tests that provide their own providers keep working (nested
// QueryClientProvider/AuthContext.Provider are harmless; the innermost wins).
// ---------------------------------------------------------------------------
vi.mock("@testing-library/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@testing-library/react")>();
  const React = await import("react");
  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { AuthContext } = await import("@/lib/auth-context");

  const stubAuth = {
    user: { id: "test-user-id", email: "test@catalyst.test" } as any,
    session: null,
    signIn: vi.fn(async () => ({ error: null })),
    signUp: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
    sendOtp: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
    loading: false,
    isAuthenticated: true,
  };

  const makeDefaultWrapper = (Inner?: React.ComponentType<{ children: React.ReactNode }>) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
        mutations: { retry: false },
      },
    });
    return function DefaultTestWrapper({ children }: { children: React.ReactNode }) {
      const inner = Inner ? React.createElement(Inner, null, children) : children;
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(AuthContext.Provider, { value: stubAuth }, inner),
      );
    };
  };

  return {
    ...actual,
    render: (ui: React.ReactElement, options?: any) =>
      actual.render(ui, { ...options, wrapper: makeDefaultWrapper(options?.wrapper) }),
    renderHook: (hook: any, options?: any) =>
      actual.renderHook(hook, { ...options, wrapper: makeDefaultWrapper(options?.wrapper) }),
  };
});

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

// Mock getUserMedia / mediaDevices (jsdom has none) — used by huddle/WebRTC code.
Object.defineProperty(navigator, "mediaDevices", {
  writable: true,
  configurable: true,
  value: {
    getUserMedia: vi.fn(() =>
      Promise.resolve({
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
      }),
    ),
    enumerateDevices: vi.fn(() => Promise.resolve([])),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
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
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
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
