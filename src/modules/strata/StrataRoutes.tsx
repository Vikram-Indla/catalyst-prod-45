/**
 * STRATA routes shell — mounted at /strata/* inside CatalystShell
 * (gated by MG k="strategyhub" → feature_flags.strategy_hub + role 'enterprise').
 * All redirects OUT of /strata live in App.tsx, outside the shell.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StrataProvider } from './hooks/useStrata';
import { StrataNotFound } from './components/StrataSystemStates';

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
const PortfolioDetailPage = lazy(() => import('./pages/StrataPortfolioDetailPage'));
const DataPipelinePage = lazy(() => import('./pages/StrataDataPipelinePage'));
const UploadWizardPage = lazy(() => import('./pages/StrataUploadWizardPage'));
const ReviewsPage = lazy(() => import('./pages/StrataReviewsPage'));
const BoardPackPage = lazy(() => import('./pages/StrataBoardPackPage'));
const AdminConfigPage = lazy(() => import('./pages/StrataAdminConfigPage'));
const MeasurementPage = lazy(() => import('./pages/StrataMeasurementPage'));
const DataIntegrationPage = lazy(() => import('./pages/StrataDataIntegrationPage'));
const AccessPage = lazy(() => import('./pages/StrataAccessPage'));
const EvidencePage = lazy(() => import('./pages/StrataEvidencePage'));

// CAT-0016: the wildcard route used to silently render CommandCenterPage for
// ANY unmatched /strata/* path, masking stale/broken deep links (e.g. a
// renamed scorecard slug looked identical to the real dashboard). Surface the
// mismatch instead of hiding it — now via the canonical StrataNotFound
// (anchor 28 / P5-D5), which also offers the owning-area exit.

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
        {/* Portfolio detail (anchor 08). Ranked below the two routes above by
            React Router specificity (static segment / longer path win) — no shadow. */}
        <Route path="portfolio/:slug" element={<S><PortfolioDetailPage /></S>} />
        <Route path="data" element={<S><DataPipelinePage /></S>} />
        <Route path="data/upload" element={<S><UploadWizardPage /></S>} />
        <Route path="data/runs/:runKey" element={<S><DataPipelinePage /></S>} />
        <Route path="reviews" element={<S><ReviewsPage /></S>} />
        <Route path="reviews/:snapshotKey/pack" element={<S><BoardPackPage /></S>} />
        <Route path="reviews/:snapshotKey" element={<S><ReviewsPage /></S>} />
        <Route path="admin" element={<S><AdminConfigPage /></S>} />
        {/* Consequence-domain pages (Phase 5). Static segments outrank
            admin/:section by React Router specificity — no shadow. */}
        <Route path="admin/measurement" element={<S><MeasurementPage /></S>} />
        <Route path="admin/data" element={<S><DataIntegrationPage /></S>} />
        <Route path="admin/access" element={<S><AccessPage /></S>} />
        <Route path="admin/:section" element={<S><AdminConfigPage /></S>} />
        <Route path="*" element={<S><StrataNotFound /></S>} />
      </Routes>
    </StrataProvider>
  );
}

export default StrataRoutesShell;
