/**
 * STRATA routes shell — mounted at /strata/* inside CatalystShell
 * (gated by MG k="strategyhub" → feature_flags.strategy_hub + role 'enterprise').
 * All redirects OUT of /strata live in App.tsx, outside the shell.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StrataProvider } from './hooks/useStrata';

const CommandCenterPage = lazy(() => import('./pages/StrataCommandCenterPage'));
const StrategyRoomPage = lazy(() => import('./pages/StrataStrategyRoomPage'));
const StrategyMapPage = lazy(() => import('./pages/StrataStrategyMapPage'));
const ScorecardsPage = lazy(() => import('./pages/StrataScorecardsPage'));
const ScorecardDetailPage = lazy(() => import('./pages/StrataScorecardDetailPage'));
const KpiLibraryPage = lazy(() => import('./pages/StrataKpiLibraryPage'));
const KpiDetailPage = lazy(() => import('./pages/StrataKpiDetailPage'));
const ExecutionPage = lazy(() => import('./pages/StrataExecutionPage'));
const PortfolioVmoPage = lazy(() => import('./pages/StrataPortfolioVmoPage'));
const DataPipelinePage = lazy(() => import('./pages/StrataDataPipelinePage'));
const ReviewsPage = lazy(() => import('./pages/StrataReviewsPage'));
const AdminConfigPage = lazy(() => import('./pages/StrataAdminConfigPage'));

const S = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--ds-text-subtle)' }}>Loading STRATA…</div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

export function StrataRoutesShell() {
  return (
    <StrataProvider>
      <Routes>
        <Route path="" element={<S><CommandCenterPage /></S>} />
        <Route path="strategy" element={<S><StrategyRoomPage /></S>} />
        <Route path="strategy/map" element={<S><StrategyMapPage /></S>} />
        <Route path="scorecards" element={<S><ScorecardsPage /></S>} />
        <Route path="scorecards/:slug" element={<S><ScorecardDetailPage /></S>} />
        <Route path="kpis" element={<S><KpiLibraryPage /></S>} />
        <Route path="kpis/:slug" element={<S><KpiDetailPage /></S>} />
        <Route path="execution" element={<S><ExecutionPage /></S>} />
        <Route path="execution/:slug" element={<S><ExecutionPage /></S>} />
        <Route path="portfolio" element={<S><PortfolioVmoPage /></S>} />
        <Route path="portfolio/benefits/:slug" element={<S><PortfolioVmoPage /></S>} />
        <Route path="data" element={<S><DataPipelinePage /></S>} />
        <Route path="data/runs/:runKey" element={<S><DataPipelinePage /></S>} />
        <Route path="reviews" element={<S><ReviewsPage /></S>} />
        <Route path="reviews/:snapshotKey" element={<S><ReviewsPage /></S>} />
        <Route path="admin" element={<S><AdminConfigPage /></S>} />
        <Route path="admin/:section" element={<S><AdminConfigPage /></S>} />
        <Route path="*" element={<S><CommandCenterPage /></S>} />
      </Routes>
    </StrataProvider>
  );
}

export default StrataRoutesShell;
