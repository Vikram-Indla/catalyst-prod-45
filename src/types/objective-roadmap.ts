export interface Theme {
  id: string;
  name: string;
  color: string;
}

export interface Owner {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
}

export interface KeyResult {
  id: string;
  title: string;
  dueDate: Date;
  progress: number;
  status: 'not-started' | 'in-progress' | 'complete' | 'overdue';
}

export type ObjectiveStatus = 'on-track' | 'at-risk' | 'off-track' | 'in-progress' | 'pending';

export interface Objective {
  id: string;
  name: string;
  themeId: string;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: ObjectiveStatus;
  keyResults: KeyResult[];
}

export type Scale = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type GroupBy = 'theme' | 'quarter' | 'none';

export interface ObjectiveGroup {
  key: string;
  name: string;
  color: string;
  items: Objective[];
}

export interface TimeUnit {
  label: string;
  isCurrent: boolean;
}

export interface ActiveFilters {
  status: string[];
  theme: string[];
  progressMin: number;
  progressMax: number;
  owner: string[];
  kr: string[];
}

export interface DateFilterPreset {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}
