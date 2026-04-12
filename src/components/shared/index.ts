/**
 * Shared Components Index
 * 
 * Central exports for reusable components used across Catalyst
 */

// Layout & Container Components
export { PageContainer } from './PageContainer';
export { PageShell } from './PageShell';
export { PageHeader } from './PageHeader';
export { CommandCenterHeader } from './CommandCenterHeader';
export { DrawerPanel, DrawerSection } from './DrawerPanel';
export { SurfaceCard } from './SurfaceCard';

// Empty State Components
export { CatalystEmptyState } from './CatalystEmptyState';

// UI Components
export { StatusPill } from './StatusPill';
export { HealthBadge } from './HealthBadge';
export { TechnicalScoreBadge } from './TechnicalScoreBadge';
export { BulkSelectionBar } from './BulkSelectionBar';
export { PriorityIndicator, PriorityBars, normalisePriority, PRIORITY_MAP } from './PriorityIndicator';
export type { PriorityLevel } from './PriorityIndicator';

// Section Components  
export { CommentsSection } from './CommentsSection';
export { AttachmentsSection } from './AttachmentsSection';
export { UnifiedAuditHistoryTab } from './UnifiedAuditHistoryTab';
export { UnifiedLinksTab } from './UnifiedLinksTab';
