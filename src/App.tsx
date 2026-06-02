import React, { lazy, Suspense, useEffect } from "react";
import { IntlProvider } from "react-intl-next";
import { ENABLE_FULL_APP } from './lib/featureFlags';


// ─── Core infrastructure (always loaded) ────────────────────────────
import { FlagsHost } from '@/components/shared/JiraTable';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AdsThemeProvider } from "@/theme/ads";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { WorkflowProvider } from "./lib/workflows";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PreviewRecoveryBanner } from "./components/PreviewRecoveryBanner";
import { useCommandK } from "@/hooks/useCommandK";
import { UWVProvider } from "@/components/universal-work-view/UWVContext";
import { ProjectHubKeyRedirect } from "@/routes/ProjectHubKeyGuard";

const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
// HotToaster removed — replaced by FlagsHost (@atlaskit/flag) below
// For You surface — Atlaskit/Jira-parity rebuild (Apr 2026).
// Legacy `./pages/ForYouPage` remains in the tree for reference but is no
// longer mounted on any route. Safe to delete once QA signs off on the new
// surface; leaving it in place gives us a one-line rollback if parity
// issues surface during the visual audit loop (P7).
const ForYouPage = lazy(() => import("./pages/ForYouPage.atlaskit"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Admin routes are owned by FullAppRoutes (single source of truth) —
// no admin lazy imports here. See RCA 2026-05-19 in CLAUDE.md.
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));
const DeactivatedPage = lazy(() => import("./pages/DeactivatedPage"));
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const CleanupPage = lazy(() => import("./pages/CleanupPage"));
const AuditTrailPage = lazy(() => import("./pages/AuditTrailPage"));
const IssueFullPage = lazy(() => import("./pages/IssueFullPage"));

// Full app routes — only imported when ENABLE_FULL_APP=true
const FullAppRoutes = ENABLE_FULL_APP
  ? lazy(() => import("./routes/FullAppRoutes"))
  : null;

// Apr 25, 2026 — Persistent cache layer.
//   • staleTime 15min: data treated fresh for 15 min, no refetch
//   • gcTime 30 days: cached entries remain in localStorage for 30 days
//   • Persist via SyncStorage → page reloads hydrate instantly from cache,
//     refetch only happens after staleTime elapses
//   • buster: bump CACHE_VERSION to invalidate ALL cached queries on deploy
const CACHE_VERSION = 'v2.2026-05-16';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,
      gcTime: THIRTY_DAYS_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'catalyst-rq-cache',
  throttleTime: 1000,
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

function IssueRedirectToBrowse() {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/issue\//, '/browse/');
  return <Navigate to={newPath + location.search + location.hash} replace />;
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
        // Don't persist mutations or pending queries
        shouldDehydrateQuery: (q) => q.state.status === 'success',
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
      <UWVProvider>
      <AuthProvider>
        
        <LanguageProvider>
        <FeatureFlagProvider>
        <WorkflowProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/auth" element={<S><CatalystLoginPageLazy /></S>} />
                <Route path="/auth/slack/callback" element={<S><SlackOAuthCallback /></S>} />
                <Route path="/reset-password" element={<S><ResetPassword /></S>} />
                <Route path="/invite/accept" element={<S><InviteAcceptPage /></S>} />
                <Route path="/deactivated" element={<S><DeactivatedPage /></S>} />

                {/* Block A rule 1 (2026-05-01) — canonical URL prefix is
                    `/product-hub`. Legacy `/producthub/*` redirects via
                    ProducthubLegacyRedirect (preserves search + hash).
                    Mounted OUTSIDE the protected shell so we escape the
                    CatalystShell re-render loop that was causing Navigate to
                    fire repeatedly without ever committing the URL change. */}
                <Route path="/producthub" element={<ProducthubLegacyRedirect />} />
                <Route path="/producthub/*" element={<ProducthubLegacyRedirect />} />

                {/* Block D (2026-05-01) — canonical /product-hub root lands on
                    /product-hub/products (the workstream listing). Mounted
                    OUTSIDE the protected shell for the same reason as the
                    legacy redirects above: CatalystShell's re-render loop
                    fires Navigate without committing the URL change when
                    redirects live inside the shell. */}
                <Route path="/product-hub" element={<Navigate to="/product-hub/products" replace />} />

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
                <Route path="/project-hub" element={<Navigate to="/project-hub/projects" replace />} />

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
              </BrowserRouter>
          </ProcessStepsProvider>
        </NavigationProvider>
        </WorkflowProvider>
        </FeatureFlagProvider>
        </LanguageProvider>
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
