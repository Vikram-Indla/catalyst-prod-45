export interface Subtask {
  key: string;
  summary: string;
  status: 'DONE' | 'IN PROGRESS' | 'TO DO';
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  created: string;
}

export interface Story {
  key: string;
  summary: string;
  status: 'DONE' | 'IN PROGRESS' | 'TO DO';
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  created: string;
  subtasks: Subtask[];
}

export interface Feature {
  key: string;
  summary: string;
  status: 'DONE' | 'IN PROGRESS' | 'TO DO';
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  created: string;
  stories: Story[];
}

export interface ProjectData {
  key: string;
  name: string;
  features: Feature[];
}

export interface ProjectMetrics {
  completed: number;
  updated: number;
  created: number;
  dueSoon: number;
}

export interface StatusCount {
  status: string;
  count: number;
  color: string;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface TypeCount {
  type: string;
  count: number;
  percentage: number;
}
