/**
 * Product Roadmap — Type definitions
 */

export type InitiativeType = 'business_request';

export type InitiativeStatus = 'Active' | 'Planned' | 'Completed' | 'Cancelled';

export type Priority = 'P0' | 'P1' | 'P2';

export type ZoomLevel = 'Week' | 'Month' | 'Quarter';

export type GroupBy = 'type' | 'priority' | 'owner' | 'none';

export type ViewMode = 'Table' | 'Board' | 'Timeline' | 'Cards';

export type QuickFilter = 'all' | 'my' | 'quarter' | 'high' | 'unscored' | 'overdue' | 'starred';

export interface RoadmapMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
}

export interface RoadmapInitiative {
  id: string;
  initiativeKey: string;
  title: string;
  titleAr: string;
  titleEn: string;
  type: InitiativeType;
  priority: Priority;
  status: InitiativeStatus;
  progress: number;
  startDate: string;
  endDate: string;
  ownerName: string;
  ownerInitials: string;
  ownerColor: string;
  starred: boolean;
  milestones: RoadmapMilestone[];
  hasRealEndDate: boolean;
  rawDbId: string;
  rawStatus: string;
  rawTypeKey: string;
  rawAssigneeId: string | null;
  rawBusinessOwnerId: string | null;
  rawInitiativeTypeId: string | null;
}

export interface RoadmapStats {
  totalOnRoadmap: number;
  totalInitiatives: number;
  activeCount: number;
  validationCount: number;
  projectCount: number;
  enhancementCount: number;
  improvementCount: number;
  entityIntegrationCount: number;
  currentQuarter: string;
}

export interface RoadmapGroup {
  key: string;
  label: string;
  color: string;
  items: RoadmapInitiative[];
  isExpanded: boolean;
}

export interface TimelinePeriod {
  key: string;
  label: string;
  sublabel?: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isQuarterStart: boolean;
}
