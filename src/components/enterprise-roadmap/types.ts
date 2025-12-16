// Enterprise Roadmap Types

export type TimeScale = 'monthly' | 'quarterly' | 'yearly';

export type ItemType = 'theme' | 'objective' | 'epic';

export type ItemStatus = 'active' | 'proposed' | 'on-track' | 'at-risk' | 'off-track' | 'in-progress' | 'done';

export interface RoadmapItem {
  id: string;
  type: ItemType;
  name: string;
  strategy?: string;
  status: ItemStatus;
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
