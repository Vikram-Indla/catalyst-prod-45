// Enterprise Roadmap Types

export type TimeScale = 'monthly' | 'quarterly' | 'yearly';

export type ItemType = 'theme' | 'objective' | 'epic';

export type ItemStatus = 'active' | 'proposed' | 'on-track' | 'at-risk' | 'off-track' | 'delayed' | 'in-progress' | 'done';

// Health status for executive summary (On Track, At Risk, Delayed)
export type HealthStatus = 'on-track' | 'at-risk' | 'delayed';

export interface RoadmapItem {
  id: string;
  type: ItemType;
  name: string;
  strategy?: string;
  status: ItemStatus;
  health?: HealthStatus; // Executive health indicator
  startDate: string;
  endDate: string;
  progress: number;
  objectives?: number;
  epics?: number;
  risks?: number;
  children?: RoadmapItem[];
  parentId?: string;
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
}

export interface TimelinePeriod {
  key: string;
  label: string;
  year: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}
