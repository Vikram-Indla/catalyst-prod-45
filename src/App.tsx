import React, { lazy, Suspense, useEffect } from "react";
import { IntlProvider } from "react-intl-next";
import { ENABLE_FULL_APP } from './lib/featureFlags';


// ─── Core infrastructure (always loaded) ────────────────────────────
import { FlagsHost } from '@/components/shared/JiraTable';
import { CatalystFlagHost } from '@/lib/catalystFlag';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AdsThemeProvider } from "@/theme/atlassian";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PreviewRecoveryBanner } from "./components/PreviewRecoveryBanner";
import { useCommandK } from "@/hooks/useCommandK";
import { UWVProvider } from "@/components/universal-work-view/UWVContext";
import { ProjectHubKeyRedirect } from "@/routes/ProjectHubKeyGuard";

const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
import { ProjectHubLanding, ProductHubLanding } from "./components/layout/HubLanding";
import { ModuleGuard } from "./components/guards/ModuleGuard";
// HotToaster removed — replaced by FlagsHost (@atlaskit/flag) below
// For You surface — Atlaskit/Jira-parity rebuild (Apr 2026).
// Legacy `./pages/ForYouPage` remains in the tree for reference but is no
// longer mounted on any route. Safe to delete once QA signs off on the new
// surface; leaving it in place gives us a one-line rollback if parity
// issues surface during the visual audit loop (P7).
const ForYouPage = lazy(() => import("./pages/ForYouPage.atlaskit"));
const ArchiveManagerPage = lazy(() => import("./pages/ArchiveManagerPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Admin routes are owned by FullAppRoutes (single source of truth) —
// no admin lazy imports here. See RCA 2026-05-19 in CLAUDE.md.
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));
const ShortLinkResolverPage = lazy(() => import("./pages/ShortLinkResolverPage"));
const DeactivatedPage = lazy(() => import("./pages/DeactivatedPage"));
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const CleanupPage = lazy(() => import("./pages/CleanupPage"));
const AuditTrailPage = lazy(() => import("./pages/AuditTrailPage"));
const ReleaseManagementPage = lazy(() => import("./pages/jira-clone/ReleaseManagementPage"));
const IssueFullPage = lazy(() => import("./pages/IssueFullPage"));
const ChatDockMountLazy = lazy(() => import("./components/chat/ChatDockMount"));
import { VoiceFlowProvider } from './features/voice-flow';
import { HierarchyConfigProvider } from './contexts/HierarchyConfigContext';

// Full app routes — only imported when ENABLE_FULL_APP=true
const FullAppRoutes = ENABLE_FULL_APP
  ? lazy(() => import("./routes/FullAppRoutes"))
  : null;

// Apr 25, 2026 — Persistent cache layer.
//   • staleTime 15min: data treated fresh for 15 min, no refetch
//   • gcTime 15min: must be >= staleTime — gcTime runs from the moment a query
//     has zero observers, so gcTime < staleTime evicted still-fresh cache on
//     back-navigation, forcing a refetch+spinner well inside the freshness
//     window (CAT-AUDIT-0702). localStorage bloat is controlled independently
//     by shouldDehydrateQuery below + the buster version bump, not by a short gcTime.
//   • Persist via SyncStorage → page reloads hydrate instantly from cache,
//     refetch only happens after staleTime elapses
//   • buster: bump CACHE_VERSION to invalidate ALL cached queries on deploy
//   • Config/flag queries that need longer retention override gcTime per-query
// 2026-06-21: bumped to invalidate stale localStorage entries that contain
// Map values serialized as plain {} (default JSON.stringify behavior). The
// new persister below uses a Map-aware serializer so future cache rounds
// rehydrate correctly. Existing cache from older versions is discarded.
const CACHE_VERSION = 'v3.2026-06-21';
const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: FIFTEEN_MIN_MS,
      gcTime: FIFTEEN_MIN_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/* 2026-06-21: Map/Set-aware serializer. Default `JSON.stringify` converts
   Map → {} which loses .get() on rehydrate (caused `epicLinkedInitiativeByKey?.get
   is not a function`, `parentTypeMap.get is not a function`, etc.). The custom
   serializer tags Map/Set values during persist and reconstructs them on load.
   Survives any query whose result is a Map/Set without per-hook code. */
const RQ_TAG_MAP = '__rq_map__';
const RQ_TAG_SET = '__rq_set__';

function rqReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return { [RQ_TAG_MAP]: Array.from(value.entries()) };
  if (value instanceof Set) return { [RQ_TAG_SET]: Array.from(value.values()) };
  return value;
}

function rqReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v[RQ_TAG_MAP])) return new Map(v[RQ_TAG_MAP] as Array<[unknown, unknown]>);
    if (Array.isArray(v[RQ_TAG_SET])) return new Set(v[RQ_TAG_SET] as unknown[]);
  }
  return value;
}

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'catalyst-rq-cache',
  // 5s, not 1s (CAT-AUDIT-0703): persistence is a reload-hydration optimization,
  // not a durability guarantee — 1s granularity bought nothing but repeated
  // full-cache JSON.stringify main-thread stalls during data-heavy navigation.
  throttleTime: 5000,
  serialize: (data) => JSON.stringify(data, rqReplacer),
  deserialize: (str) => JSON.parse(str, rqReviver),
});

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
);

/**
 * Block A rule 1 (2026-05-01) — canonical URL prefix is `/product-hub`.
 * Legacy `/producthub/*` redirects here so bookmarks/links keep working.
 * react-router v6 Navigate doesn't support splat substitution in `to`, so
 * we resolve the new path imperatively from useLocation().
 */
function ProducthubLegacyRedirect() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/producthub/, '/product-hub');
  return <Navigate to={newPath + location.search + location.hash} replace />;
}

/**
 * CAT-STRATA-20260705-001 (D-009/Q1) — StrategyHub is decommissioned; STRATA
 * owns the strategy surface at /strata. Legacy /strategyhub/* and
 * /strategy-room bookmarks land on the STRATA Command Center. Mounted OUTSIDE
 * CatalystShell because Navigate inside FullAppRoutes is swallowed.
 */
function StrategyhubLegacyRedirect() {
  const location = useLocation();
  return <Navigate to={'/strata' + location.search + location.hash} replace />;
}

function IssueRedirectToBrowse() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/issue\//, '/browse/');
  return <Navigate to={newPath + location.search + location.hash} replace />;
}

function ChatDockGuard() {
  const location = useLocation();
  if (location.pathname.startsWith('/chat') || location.pathname.startsWith('/auth')) return null;
  return <Suspense fallback={null}><ChatDockMountLazy /></Suspense>;
}


function App() {
  useCommandK();

  return (
  <ErrorBoundary>
  <PreviewRecoveryBanner />
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: THIRTY_DAYS_MS,
      buster: CACHE_VERSION,
      dehydrateOptions: {
        // Exclude chat queries — they are session-scoped and never need
        // 30-day persistence. Also prevents the localStorage serialization
        // spike when 10+ chat queries complete simultaneously on dock open.
        shouldDehydrateQuery: (q) => {
          const k0 = q.queryKey[0];
          // Exclude chat queries (session-scoped) and avatar-map queries (Map
          // instances serialize to {} via JSON.stringify, causing a runtime
          // TypeError on rehydration when code calls avatarsByName.get(...)).
          if (
            k0 === 'chat' || k0 === 'chat-v2' || k0 === 'caty-suggestions' ||
            k0 === 'profile-avatars-local' || k0 === 'profile-avatars-by-name-local'
          ) return false;
          return q.state.status === 'success';
        },
      },
    }}
  >
    <ThemeProvider>
      {/**
       * AdsThemeProvider bridges Catalyst's resolvedTheme to @atlaskit/tokens.
       * Must live inside ThemeProvider (needs useTheme) and above every
       * surface that renders Atlaskit (everything else).
       * See src/theme/ads/AdsThemeProvider.tsx.
       */}
      <AdsThemeProvider>
      {/**
       * IntlProvider — required by Atlaskit components that internally use
       * react-intl-next (e.g. @atlaskit/user-picker, @atlaskit/datetime-picker).
       * Without this, those components throw "Could not find required `intl`
       * object" on first render and crash the parent dialog.
       * Empty messages={{}} is intentional — Atlaskit ships its own English
       * defaults; the provider only supplies overrides.
       */}
      <IntlProvider locale="en" messages={{}}>
      <FlagsHost />
      <CatalystFlagHost />
      <UWVProvider>
      <AuthProvider>
        
        <HierarchyConfigProvider>
        <LanguageProvider>
        <FeatureFlagProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/auth" element={<S><CatalystLoginPageLazy /></S>} />
                <Route path="/auth/slack/callback" element={<S><SlackOAuthCallback /></S>} />
                <Route path="/reset-password" element={<S><ResetPassword /></S>} />
                <Route path="/invite/accept" element={<S><InviteAcceptPage /></S>} />
                <Route path="/s/:code" element={<S><ShortLinkResolverPage /></S>} />
                <Route path="/deactivated" element={<S><DeactivatedPage /></S>} />

                {/* Block A rule 1 (2026-05-01) — canonical URL prefix is
                    `/product-hub`. Legacy `/producthub/*` redirects via
                    ProducthubLegacyRedirect (preserves search + hash).
                    Mounted OUTSIDE the protected shell so we escape the
                    CatalystShell re-render loop that was causing Navigate to
                    fire repeatedly without ever committing the URL change. */}
                <Route path="/producthub" element={<ProducthubLegacyRedirect />} />
                <Route path="/producthub/*" element={<ProducthubLegacyRedirect />} />
                {/* CAT-STRATA-20260705-001: StrategyHub → STRATA */}
                <Route path="/strategyhub" element={<StrategyhubLegacyRedirect />} />
                <Route path="/strategyhub/*" element={<StrategyhubLegacyRedirect />} />
                <Route path="/strategy-room" element={<StrategyhubLegacyRedirect />} />
                <Route path="/strategy" element={<StrategyhubLegacyRedirect />} />
                <Route path="/strategy/*" element={<StrategyhubLegacyRedirect />} />

                {/* Block D (2026-05-01) — canonical /product-hub root lands on
                    /product-hub/products (the workstream listing). Mounted
                    OUTSIDE the protected shell for the same reason as the
                    legacy redirects above: CatalystShell's re-render loop
                    fires Navigate without committing the URL change when
                    redirects live inside the shell. */}
                <Route path="/product-hub" element={<ModuleGuard moduleCode="product"><ProductHubLanding /></ModuleGuard>} />

                {/* Legacy global backlog retired (2026-06-01) — RequestListingPage
                    queried the dead ph_backlog_requests_view (0 rows); live BR data
                    lives in business_requests, read only by the scoped
                    /product-hub/:key/backlog (ProductBacklogPage). Mounted OUTSIDE
                    the shell for the same reason as /product-hub above: the
                    CatalystShell re-render loop swallows in-shell Navigate calls. */}
                <Route path="/product-hub/backlog" element={<Navigate to="/product-hub/products" replace />} />

                {/* Same pattern for /project-hub — CatalystShell re-render loop
                    prevents Navigate from committing when the redirect lives
                    inside the shell. Mirror the /product-hub treatment above. */}
                <Route path="/project-hub" element={<ModuleGuard moduleCode="workhub"><ProjectHubLanding /></ModuleGuard>} />

                {/* Excluded keys (products / modules typed under /project-hub) redirect
                    to their canonical hub. Mounted OUTSIDE the protected shell — same
                    CatalystShell re-render loop reason as the redirects above. Each
                    excluded key needs its own literal-path route here AND a matching
                    entry in KEY_REDIRECT_MAP (src/routes/ProjectHubKeyGuard.tsx).
                    Keep in sync with `excludedProjectKeys` in useProjectHub.ts. */}
                <Route path="/project-hub/INV/*" element={<ProjectHubKeyRedirect />} />
                <Route path="/project-hub/MDT/*" element={<ProjectHubKeyRedirect />} />

                {/* Protected shell with minimal routes */}

                {/* Protected shell with minimal routes */}
                <Route element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
                  <Route index element={<S><ForYouPage /></S>} />
                  <Route path="for-you" element={<S><ForYouPage /></S>} />
                  <Route path="for-you/archives" element={<S><ArchiveManagerPage /></S>} />
                  <Route path="for-you/:tab" element={<S><ForYouPage /></S>} />
                  <Route path="home" element={<Navigate to="/" replace />} />

                  {/* Admin routes — ALL registered in FullAppRoutes' single
                      <Route path="/admin" element={<AdminLayout/>}> block.
                      Do NOT duplicate the AdminLayout wrapper here — two
                      nested AdminLayouts produce a double sidebar
                      (RCA 2026-05-19). FullAppRoutes is the single source
                      of truth for every /admin/* route. */}

                  {/* AI Cleanup route */}
                  <Route path="/cleanup" element={<S><CleanupPage /></S>} />
                  <Route path="/audit-trail" element={<S><AuditTrailPage /></S>} />
                  <Route path="/catalyst/testpage" element={<S><ReleaseManagementPage /></S>} />

                  {/* Universal issue resolver — Jira-parity /browse/:key canonical */}
                  <Route path="/browse/:issueKey" element={<S><IssueFullPage /></S>} />

                  {/* Legacy /issue/:key — 301 to /browse/:key */}
                  <Route path="/issue/:issueKey" element={<IssueRedirectToBrowse />} />

                  {/* All other routes — only when ENABLE_FULL_APP=true */}
                  {FullAppRoutes && (
                    <Route path="/*" element={<S><FullAppRoutes /></S>} />
                  )}
                </Route>

                <Route path="*" element={<S><NotFound /></S>} />
              </Routes>
              <ChatDockGuard />
              <VoiceFlowProvider />
              </BrowserRouter>
          </ProcessStepsProvider>
        </NavigationProvider>
        </FeatureFlagProvider>
        </LanguageProvider>
        </HierarchyConfigProvider>
      </AuthProvider>
      </UWVProvider>
      </IntlProvider>
      </AdsThemeProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
