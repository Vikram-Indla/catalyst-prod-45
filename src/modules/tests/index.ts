// =====================================================
// PROJECT TESTS MODULE
// Test management for project scope
// =====================================================

// Layout & Components
export { ProjectTestsLayout } from './components/ProjectTestsLayout';
export { RunTestsModal } from './components/RunTestsModal';
export { CreateCycleModal } from './components/CreateCycleModal';
export { CycleDrawer } from './components/CycleDrawer';
export { ExecutionDrawer } from './components/ExecutionDrawer';
export { MissingWiringBanner, useMissingWiringCheck } from './components/MissingWiringBanner';
export { TestsEmptyState } from './components/TestsEmptyState';

// Pages
export { TestsOverviewPage } from './pages/TestsOverviewPage';
export { TestsCasesPage } from './pages/TestsCasesPage';
export { TestsSetsPage } from './pages/TestsSetsPage';
export { TestsCyclesPage } from './pages/TestsCyclesPage';
export { TestsExecutionsPage } from './pages/TestsExecutionsPage';
export { TestsReportsPage } from './pages/TestsReportsPage';
export { TestsTraceabilityPage } from './pages/TestsTraceabilityPage';
export { CTAValidationPage } from './pages/CTAValidationPage';
export { CycleExecutionPage } from './pages/CycleExecutionPage';

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
