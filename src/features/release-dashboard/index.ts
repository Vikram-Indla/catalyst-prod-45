/**
 * Release Dashboard Feature - Public API
 * Module 5B-1: Release Quality Metrics
 * Module 5B-2: Go/No-Go Dashboard
 * Module 5B-3: Stakeholder Sign-off Workflow
 */

// Components
export { DashboardHeader } from './components/DashboardHeader';
export { MetricsGrid } from './components/MetricsGrid';
export { AISummaryCard } from './components/AISummaryCard';
export { DefectSummaryCard } from './components/DefectSummaryCard';
export { TestCyclesTable } from './components/TestCyclesTable';
export { ExecutionTrendChart } from './components/ExecutionTrendChart';
export { TeamContributionList } from './components/TeamContributionList';
export { ActivityFeed } from './components/ActivityFeed';
export { EditReleaseDialog } from './components/EditReleaseDialog';
export { ApproveReleaseDialog } from './components/ApproveReleaseDialog';
export { ExportDropdown } from './components/ExportDropdown';

// Module 5B-1: Quality Metrics
export { QualityMetricsPanel } from './components/QualityMetricsPanel';

// Module 5B-2: Go/No-Go Dashboard
export { GoNoGoDashboard } from './components/GoNoGoDashboard';

// Module 5B-3: Stakeholder Sign-off
export { SignoffPanel } from './components/SignoffPanel';

// Types
export * from './types';
export * from './types/quality-metrics';
export * from './types/go-no-go';
export * from './types/signoff';

// Hooks - Module 5B-1
export { 
  useReleaseQualityMetrics, 
  useReleaseHealth, 
  useExecutionTrend 
} from './hooks/useQualityMetrics';

// Hooks - Module 5B-2
export {
  useGoNoGoAssessment,
  useRecordDecision,
  useDecisionHistory,
} from './hooks/useGoNoGo';

// Hooks - Module 5B-3
export {
  useReleaseSignoffs,
  useRequestSignoff,
  useSubmitSignoff,
  useSignoffTemplates,
  useApplySignoffTemplate,
  useRemoveSignoff,
} from './hooks/useSignoff';

// Utils
export * from './utils/mockData';
