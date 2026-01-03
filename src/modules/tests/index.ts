// =====================================================
// PROJECT TESTS MODULE
// Test management for project scope
// =====================================================

// Layout & Components
export { ProjectTestsLayout } from './components/ProjectTestsLayout';
export { GlobalTestsLayout } from './components/GlobalTestsLayout';
export { RunTestsModal } from './components/RunTestsModal';
export { CreateCycleModal } from './components/CreateCycleModal';
export { CycleDrawer } from './components/CycleDrawer';
export { ExecutionDrawer } from './components/ExecutionDrawer';
export { MissingWiringBanner, useMissingWiringCheck } from './components/MissingWiringBanner';
export { TestsEmptyState } from './components/TestsEmptyState';
export { TestFolderTree } from './components/TestFolderTree';
export { TestCaseDetailPanel } from './components/TestCaseDetailPanel';

// Project-scoped Pages
export { TestsOverviewPage } from './pages/TestsOverviewPage';
export { TestsCasesPage } from './pages/TestsCasesPage';
export { TestsSetsPage } from './pages/TestsSetsPage';
export { TestsCyclesPage } from './pages/TestsCyclesPage';
export { TestsExecutionsPage } from './pages/TestsExecutionsPage';
export { TestsReportsPage } from './pages/TestsReportsPage';
export { TestsTraceabilityPage } from './pages/TestsTraceabilityPage';
export { CTAValidationPage } from './pages/CTAValidationPage';
export { CycleExecutionPage } from './pages/CycleExecutionPage';

// Global-scoped Pages
export { GlobalTestsOverviewPage } from './pages/GlobalTestsOverviewPage';
export { GlobalTestsCasesPage } from './pages/GlobalTestsCasesPage';
export { GlobalTestsCyclesPage } from './pages/GlobalTestsCyclesPage';

// Traceability Components
export { TraceabilityMatrix, TraceabilityDetailPanel } from './components/traceability';

// Notifications Components
export { NotificationCenter, NotificationPreferencesPanel } from './components/notifications';

// AI Components
export { AITestGenerator, AIInsightsPanel } from './components/ai';

// Governance Components
export { ActivityTimeline, GovernanceDashboard } from './components/governance';

// Utils
export * from './utils/ctaRegistry';
export * from './utils/smokeTests';

// Hooks
export * from './hooks';

// API
export * from './api';
