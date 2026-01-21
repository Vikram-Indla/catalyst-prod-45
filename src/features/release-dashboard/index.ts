/**
 * Release Dashboard Feature - Public API
 * Module 5B-1: Release Quality Metrics
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

// Types
export * from './types';
export * from './types/quality-metrics';

// Hooks
export { 
  useReleaseQualityMetrics, 
  useReleaseHealth, 
  useExecutionTrend 
} from './hooks/useQualityMetrics';

// Utils
export * from './utils/mockData';
