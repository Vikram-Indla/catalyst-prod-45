import React, { lazy, Suspense, useEffect } from "react";
import { IntlProvider } from "react-intl-next";
import { ENABLE_FULL_APP } from './lib/featureFlags';


// ─── Core infrastructure (always loaded) ────────────────────────────
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { useCommandK } from "@/hooks/useCommandK";

const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
const HotToaster = lazy(() => import('react-hot-toast').then(m => ({ default: m.Toaster })));
const ForYouPage = lazy(() => import("./pages/ForYouPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const FeatureFlagsPage = lazy(() => import("./pages/admin/FeatureFlagsPage").then(m => ({ default: m.default })));
const WorkflowsAdminPage = lazy(() => import("./pages/admin/WorkflowsAdminPage").then(m => ({ default: m.default })));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SubmitDemandRequest = lazy(() => import("./pages/SubmitDemandRequest"));
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const CleanupPage = lazy(() => import("./pages/CleanupPage"));
const AuditTrailPage = lazy(() => import("./pages/AuditTrailPage"));
const IssueFullPage = lazy(() => import("./pages/IssueFullPage"));

// Full app routes — only imported when ENABLE_FULL_APP=true
const FullAppRoutes = ENABLE_FULL_APP
  ? lazy(() => import("./routes/FullAppRoutes"))
  : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const S = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="p-8">Loading...</div>}>{children}</Suspense>
);


function App() {
  useCommandK();

  return (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
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

                {/* Protected shell with minimal routes */}

                {/* Protected shell with minimal routes */}
                <Route element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
                  <Route path="/" element={<S><ForYouPage /></S>} />
                  <Route path="/for-you" element={<Navigate to="/" replace />} />
                  <Route path="/home" element={<Navigate to="/" replace />} />

                  {/* Admin routes — always available for incremental publishing control */}
                  <Route path="/admin" element={<S><AdminLayout /></S>}>
                    <Route index element={<Navigate to="/admin/overview" replace />} />
                    <Route path="overview" element={<S><AdminOverview /></S>} />
                    <Route path="feature-flags" element={<S><FeatureFlagsPage /></S>} />
                    <Route path="workflows" element={<S><WorkflowsAdminPage /></S>} />
                  </Route>

                  {/* AI Cleanup route */}
                  <Route path="/cleanup" element={<S><CleanupPage /></S>} />
                  <Route path="/audit-trail" element={<S><AuditTrailPage /></S>} />

                  {/* Full-screen issue view — inside shell, sidebar auto-collapsed */}
                  <Route path="/issue/:issueKey" element={<S><IssueFullPage /></S>} />

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
      </IntlProvider>
      </AdsThemeProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
