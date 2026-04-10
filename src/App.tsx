import React, { lazy, Suspense, useEffect } from "react";
import { ENABLE_FULL_APP } from './lib/featureFlags';


// ─── Core infrastructure (always loaded) ────────────────────────────
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "./lib/auth";
import { NavigationProvider } from "./contexts/NavigationContext";
import { ProcessStepsProvider } from "./contexts/ProcessStepsContext";
import { CatalystToastProvider } from "./contexts/CatalystToastContext";
import { FeatureFlagProvider } from "./contexts/FeatureFlagContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

const CatalystLoginPageLazy = lazy(() => import("./components/auth/login").then(m => ({ default: m.CatalystLoginPage })));
const CatalystShell = lazy(() => import("./components/layout/CatalystShell").then(m => ({ default: m.CatalystShell })));
const HotToaster = lazy(() => import('react-hot-toast').then(m => ({ default: m.Toaster })));
const ForYouPage = lazy(() => import("./pages/ForYouPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const FeatureFlagsPage = lazy(() => import("./pages/admin/FeatureFlagsPage").then(m => ({ default: m.default })));
const DeploymentHealthPage = lazy(() => import("./pages/admin/DeploymentHealthPage").then(m => ({ default: m.default })));
const PublishDiagnosticsPage = lazy(() => import("./pages/admin/PublishDiagnosticsPage").then(m => ({ default: m.default })));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SubmitDemandRequest = lazy(() => import("./pages/SubmitDemandRequest"));
const SlackOAuthCallback = lazy(() => import("./pages/SlackOAuthCallback"));
const CleanupPage = lazy(() => import("./pages/CleanupPage"));

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


const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <Toaster />
      <Suspense fallback={null}><HotToaster position="bottom-right" /></Suspense>
      <AuthProvider>
        
        <FeatureFlagProvider>
        <NavigationProvider>
          <ProcessStepsProvider>
          <CatalystToastProvider position="top-right" maxToasts={5}>
            <TooltipProvider>
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/for-you" replace />} />
                <Route path="/auth" element={<S><CatalystLoginPageLazy /></S>} />
                <Route path="/auth/slack/callback" element={<S><SlackOAuthCallback /></S>} />
                <Route path="/submit-request" element={<S><SubmitDemandRequest /></S>} />
                <Route path="/reset-password" element={<S><ResetPassword /></S>} />

                {/* Protected shell with minimal routes */}
                <Route element={<ProtectedRoute><S><CatalystShell /></S></ProtectedRoute>}>
                  <Route path="/for-you" element={<S><ForYouPage /></S>} />
                  <Route path="/home" element={<Navigate to="/for-you" replace />} />

                  {/* Admin routes — always available for incremental publishing control */}
                  <Route path="/admin" element={<S><AdminLayout /></S>}>
                    <Route path="feature-flags" element={<S><FeatureFlagsPage /></S>} />
                    <Route path="deployment-health" element={<S><DeploymentHealthPage /></S>} />
                    <Route path="publish-diagnostics" element={<S><PublishDiagnosticsPage /></S>} />
                  </Route>

                  {/* All other routes — only when ENABLE_FULL_APP=true */}
                  {FullAppRoutes && (
                    <Route path="/*" element={<S><FullAppRoutes /></S>} />
                  )}
                </Route>

                <Route path="*" element={<S><NotFound /></S>} />
              </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CatalystToastProvider>
          </ProcessStepsProvider>
        </NavigationProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
