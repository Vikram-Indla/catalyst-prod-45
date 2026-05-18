import React, { lazy, Suspense, useEffect } from "react";
import { IntlProvider } from "react-intl-next";
import { ENABLE_FULL_APP } from './lib/featureFlags';


// ─── Core infrastructure (always loaded) ────────────────────────────
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AdsThemeProvider } from "@/theme/ads";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { CatalystToastProvider } from "./contexts/CatalystToastContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { WorkflowProvider } from "./lib/workflows";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PreviewRecoveryBanner } from "./components/PreviewRecoveryBanner";
import { useCommandK } from "@/hooks/useCommandK";
import { UWVProvider } from "@/components/universal-work-view/UWVContext";

const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
const HotToaster = lazy(() => import('react-hot-toast').then(m => ({ default: m.Toaster })));
// For You surface — Atlaskit/Jira-parity rebuild (Apr 2026).
// Legacy `./pages/ForYouPage` remains in the tree for reference but is no
// longer mounted on any route. Safe to delete once QA signs off on the new
// surface; leaving it in place gives us a one-line rollback if parity
// issues surface during the visual audit loop (P7).
const ForYouPage = lazy(() => import("./pages/ForYouPage.atlaskit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const FeatureFlagsPage = lazy(() => import("./pages/admin/FeatureFlagsPage").then(m => ({ default: m.default })));
const WorkflowsAdminPage = lazy(() => import("./pages/admin/workflows/WorkflowAdminPage").then(m => ({ default: m.default })));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage"));
const DeactivatedPage = lazy(() => import("./pages/DeactivatedPage"));
const SubmitDemandRequest = lazy(() => import("./pages/SubmitDemandRequest"));
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const CleanupPage = lazy(() => import("./pages/CleanupPage"));
const AuditTrailPage = lazy(() => import("./pages/AuditTrailPage"));
const CatalystFeaturesBoard = lazy(() => import("./pages/admin/CatalystFeaturesBoard"));
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
 * Route taxonomy (2026-05-18) — canonical URL prefixes match HubSwitcher labels.
 *
 *   /home, /strategy, /ideation, /product, /project, /release,
 *   /test, /incident, /task, /plan, /wiki, /admin
 *
 * Legacy prefixes (/for-you, /product-hub, /project-hub, /release-hub,
 * /incident-hub, /strategyhub, /testhub, /taskhub, /planhub, /producthub,
 * /projecthub, /releasehub) are 301-redirected via these helpers.
 * All preserve search + hash.
 */
function LegacyRedirect({ from, to }: { from: RegExp; to: string }) {
  const location = useLocation();
  const newPath = location.pathname.replace(from, to);
  return <Navigate to={newPath + location.search + location.hash} replace />;
}

function ForYouLegacyRedirect() {
  return <LegacyRedirect from={/^\/for-you/} to="/home" />;
}

function ProducthubLegacyRedirect() {
  return <LegacyRedirect from={/^\/producthub/} to="/product" />;
}

function ProductHubLegacyRedirect() {
  return <LegacyRedirect from={/^\/product-hub/} to="/product" />;
}

function ProjectHubLegacyRedirect() {
  return <LegacyRedirect from={/^\/project-hub/} to="/project" />;
}

function ReleaseHubLegacyRedirect() {
  return <LegacyRedirect from={/^\/release-hub/} to="/release" />;
}

function StrategyhubLegacyRedirect() {
  return <LegacyRedirect from={/^\/strategyhub/} to="/strategy" />;
}

function TesthubLegacyRedirect() {
  return <LegacyRedirect from={/^\/testhub/} to="/test" />;
}

function IncidentHubLegacyRedirect() {
  return <LegacyRedirect from={/^\/incident-hub/} to="/incident" />;
}

function TaskhubLegacyRedirect() {
  return <LegacyRedirect from={/^\/taskhub/} to="/task" />;
}

function PlanhubLegacyRedirect() {
  return <LegacyRedirect from={/^\/planhub/} to="/plan" />;
}

function IssueRedirectToBrowse() {
  const { issueKey } = useParams<{ issueKey: string }>();
  const location = useLocation();
  return <Navigate to={`/browse/${issueKey ?? ''}${location.search}${location.hash}`} replace />;
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
      <Toaster />
      <Suspense fallback={null}><HotToaster position="bottom-right" /></Suspense>
      <UWVProvider>
      <AuthProvider>
        
        <FeatureFlagProvider>
        <WorkflowProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
          <CatalystToastProvider position="top-right" maxToasts={5}>
              <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<S><CatalystLoginPageLazy /></S>} />
                <Route path="/auth/slack/callback" element={<S><SlackOAuthCallback /></S>} />
                <Route path="/submit-request" element={<S><SubmitDemandRequest /></S>} />
                <Route path="/reset-password" element={<S><ResetPassword /></S>} />
                <Route path="/invite/accept" element={<S><InviteAcceptPage /></S>} />
                <Route path="/deactivated" element={<S><DeactivatedPage /></S>} />

                {/* ── Legacy route redirects (mounted OUTSIDE protected shell) ──
                    CatalystShell's re-render loop prevents Navigate from
                    committing when redirects live inside the shell. All legacy
                    prefix redirects must live here. */}

                {/* Legacy /for-you → /home */}
                <Route path="/for-you" element={<ForYouLegacyRedirect />} />
                <Route path="/for-you/*" element={<ForYouLegacyRedirect />} />

                {/* Legacy /producthub → /product */}
                <Route path="/producthub" element={<ProducthubLegacyRedirect />} />
                <Route path="/producthub/*" element={<ProducthubLegacyRedirect />} />

                {/* Legacy /product-hub → /product */}
                <Route path="/product-hub" element={<ProductHubLegacyRedirect />} />
                <Route path="/product-hub/*" element={<ProductHubLegacyRedirect />} />

                {/* Legacy /project-hub → /project */}
                <Route path="/project-hub" element={<ProjectHubLegacyRedirect />} />
                <Route path="/project-hub/*" element={<ProjectHubLegacyRedirect />} />

                {/* Legacy /release-hub → /release */}
                <Route path="/release-hub" element={<ReleaseHubLegacyRedirect />} />
                <Route path="/release-hub/*" element={<ReleaseHubLegacyRedirect />} />

                {/* Legacy /strategyhub → /strategy */}
                <Route path="/strategyhub" element={<StrategyhubLegacyRedirect />} />
                <Route path="/strategyhub/*" element={<StrategyhubLegacyRedirect />} />

                {/* Legacy /testhub → /test */}
                <Route path="/testhub" element={<TesthubLegacyRedirect />} />
                <Route path="/testhub/*" element={<TesthubLegacyRedirect />} />

                {/* Legacy /incident-hub → /incident */}
                <Route path="/incident-hub" element={<IncidentHubLegacyRedirect />} />
                <Route path="/incident-hub/*" element={<IncidentHubLegacyRedirect />} />

                {/* Legacy /taskhub → /task */}
                <Route path="/taskhub" element={<TaskhubLegacyRedirect />} />
                <Route path="/taskhub/*" element={<TaskhubLegacyRedirect />} />

                {/* Legacy /planhub → /plan */}
                <Route path="/planhub" element={<PlanhubLegacyRedirect />} />
                <Route path="/planhub/*" element={<PlanhubLegacyRedirect />} />

                {/* Legacy /issue/:key → /browse/:key */}
                <Route path="/issue/:issueKey" element={<IssueRedirectToBrowse />} />
                <Route path="/project/:key/issue/:issueKey" element={<IssueRedirectToBrowse />} />

                {/* Canonical root redirects — /product and /project bare paths
                    land on their listing pages */}
                <Route path="/product" element={<Navigate to="/product/products" replace />} />
                <Route path="/project" element={<Navigate to="/project/projects" replace />} />

                {/* Protected shell with minimal routes */}
                <Route element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
                  <Route index element={<S><ForYouPage /></S>} />
                  <Route path="home" element={<S><ForYouPage /></S>} />
                  <Route path="home/:tab" element={<S><ForYouPage /></S>} />

                  {/* Admin routes — always available for incremental publishing control */}
                  <Route path="/admin" element={<S><AdminLayout /></S>}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<S><AdminOverview /></S>} />
                    <Route path="feature-flags" element={<S><FeatureFlagsPage /></S>} />
                    <Route path="catalyst-features" element={<S><CatalystFeaturesBoard /></S>} />
                    <Route path="workflows" element={<S><WorkflowsAdminPage /></S>} />
                  </Route>

                  {/* AI Cleanup route */}
                  <Route path="/cleanup" element={<S><CleanupPage /></S>} />
                  <Route path="/audit-trail" element={<S><AuditTrailPage /></S>} />

                  {/* Universal issue resolver — Jira-parity /browse/:key canonical */}
                  <Route path="/browse/:issueKey" element={<S><IssueFullPage /></S>} />

                  {/* Legacy /issue/:key — redirect moved OUTSIDE shell (see above) */}

                  {/* All other routes — only when ENABLE_FULL_APP=true */}
                  {FullAppRoutes && (
                    <Route path="/*" element={<S><FullAppRoutes /></S>} />
                  )}
                </Route>

                <Route path="*" element={<S><NotFound /></S>} />
              </Routes>
              </BrowserRouter>
          </CatalystToastProvider>
          </ProcessStepsProvider>
        </NavigationProvider>
        </WorkflowProvider>
        </FeatureFlagProvider>
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
