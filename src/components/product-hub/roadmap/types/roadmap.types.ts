/**
 * Product Roadmap — Type definitions
 */

export type RequestType = 'business_request';

export type RequestStatus = 'Active' | 'Planned' | 'Completed' | 'Cancelled';

export type Priority = 'P0' | 'P1' | 'P2';

export type ZoomLevel = 'Week' | 'Month' | 'Quarter';

export type GroupBy = 'priority' | 'owner' | 'none';

export type ViewMode = 'Table' | 'Board' | 'Timeline' | 'Cards';

export type QuickFilter = 'all' | 'my' | 'quarter' | 'high' | 'unscored' | 'overdue' | 'starred';

export interface RoadmapMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
}

export interface RoadmapRequest {
  id: string;
  initiativeKey: string;
  title: string;
  titleAr: string;
  titleEn: string;
  type: RequestType;
  priority: Priority;
  status: RequestStatus;
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
  rawAssigneeId: string | null;
  rawBusinessOwnerId: string | null;
}

export interface RoadmapStats {
  totalOnRoadmap: number;
  totalInitiatives: number;
  activeCount: number;
  validationCount: number;
  currentQuarter: string;
}

export interface RoadmapGroup {
  key: string;
  label: string;
  color: string;
  items: RoadmapRequest[];
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
