/**
 * STRATA routes shell — mounted at /strata/* inside CatalystShell
 * (gated by MG k="strategyhub" → feature_flags.strategy_hub + role 'enterprise').
 * All redirects OUT of /strata live in App.tsx, outside the shell.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StrataProvider } from './hooks/useStrata';

const CommandCenterPage = lazy(() => import('./pages/StrataCommandCenterPage'));
const StrategyRoomPage = lazy(() => import('./pages/StrataStrategyRoomPage'));
const StrategyElementDetailPage = lazy(() => import('./pages/StrataStrategyElementDetailPage'));
const StrategyMapPage = lazy(() => import('./pages/StrataStrategyMapPage'));
const ScorecardsPage = lazy(() => import('./pages/StrataScorecardsPage'));
const ScorecardDetailPage = lazy(() => import('./pages/StrataScorecardDetailPage'));
const KpiLibraryPage = lazy(() => import('./pages/StrataKpiLibraryPage'));
const KpiDetailPage = lazy(() => import('./pages/StrataKpiDetailPage'));
const ExecutionPage = lazy(() => import('./pages/StrataExecutionPage'));
const ExecutionImportPage = lazy(() => import('./pages/StrataExecutionImportPage'));
const PortfolioVmoPage = lazy(() => import('./pages/StrataPortfolioVmoPage'));
const DataPipelinePage = lazy(() => import('./pages/StrataDataPipelinePage'));
const UploadWizardPage = lazy(() => import('./pages/StrataUploadWizardPage'));
const ReviewsPage = lazy(() => import('./pages/StrataReviewsPage'));
const AdminConfigPage = lazy(() => import('./pages/StrataAdminConfigPage'));
const EvidencePage = lazy(() => import('./pages/StrataEvidencePage'));

// CAT-0016: the wildcard route used to silently render CommandCenterPage for
// ANY unmatched /strata/* path, masking stale/broken deep links (e.g. a
// renamed scorecard slug looked identical to the real dashboard). Surface the
// mismatch instead of hiding it.
function StrataNotFound() {
  const location = useLocation();
  return (
    <div style={{ padding: 32, color: 'var(--ds-text-subtle)' }}>
      <p style={{ color: 'var(--ds-text)', fontWeight: 600, marginBottom: 8 }}>
        This Strategy Hub page doesn't exist
      </p>
      <p style={{ marginBottom: 16 }}>No route matches <code>{location.pathname}</code>.</p>
      <Link to="/strata" style={{ color: 'var(--ds-text-brand)' }}>Back to Strategy Hub</Link>
    </div>
  );
}

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
        <Route path="strategy/elements/:slug" element={<S><StrategyElementDetailPage /></S>} />
        <Route path="strategy/map" element={<S><StrategyMapPage /></S>} />
        <Route path="scorecards" element={<S><ScorecardsPage /></S>} />
        <Route path="scorecards/:slug" element={<S><ScorecardDetailPage /></S>} />
        <Route path="scorecards/:slug/evidence" element={<S><EvidencePage /></S>} />
        <Route path="kpis" element={<S><KpiLibraryPage /></S>} />
        <Route path="kpis/:slug" element={<S><KpiDetailPage /></S>} />
        <Route path="kpis/:slug/evidence" element={<S><EvidencePage /></S>} />
        <Route path="execution" element={<S><ExecutionPage /></S>} />
        <Route path="execution/import" element={<S><ExecutionImportPage /></S>} />
        <Route path="execution/:slug" element={<S><ExecutionPage /></S>} />
        <Route path="portfolio" element={<S><PortfolioVmoPage /></S>} />
        <Route path="portfolio/benefits/:slug" element={<S><PortfolioVmoPage /></S>} />
        <Route path="portfolio/:slug/evidence" element={<S><EvidencePage /></S>} />
        <Route path="data" element={<S><DataPipelinePage /></S>} />
        <Route path="data/upload" element={<S><UploadWizardPage /></S>} />
        <Route path="data/runs/:runKey" element={<S><DataPipelinePage /></S>} />
        <Route path="reviews" element={<S><ReviewsPage /></S>} />
        <Route path="reviews/:snapshotKey" element={<S><ReviewsPage /></S>} />
        <Route path="admin" element={<S><AdminConfigPage /></S>} />
        <Route path="admin/:section" element={<S><AdminConfigPage /></S>} />
        <Route path="*" element={<S><StrataNotFound /></S>} />
      </Routes>
    </StrataProvider>
  );
}

export default StrataRoutesShell;
