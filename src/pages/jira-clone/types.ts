export interface Release {
  id: string;
  name: string;
  status: ReleaseStatus;
  progress: ReleaseProgress;
  startDate?: string;
  releaseDate?: string;
  description?: string;
  workItemsCount: number;
  completedItems?: number;
}

export type ReleaseStatus = 'UNRELEASED' | 'RELEASED' | 'ARCHIVED';

export interface ReleaseProgress {
  completed: number;
  total: number;
  workItems?: WorkItem[];
}

export interface WorkItem {
  id: string;
  title: string;
  status: string;
}

export type ReleaseAction = 'release' | 'archive' | 'merge' | 'edit' | 'delete';
