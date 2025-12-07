// Incident Types
export interface Assignee {
  id: string;
  name: string;
  initials: string;
  email?: string;
}

export interface LinkedItem {
  type: 'story' | 'defect' | 'task' | 'epic';
  id: string;
  summary: string;
  status?: string;
  assignee?: string;
}

export interface Comment {
  id: string;
  author: {
    id: string;
    name: string;
    initials: string;
  };
  text: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  summary: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed' | 'implementing' | 'analysis';
  assignee: Assignee;
  reporter: Assignee;
  component: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  linkedItems: LinkedItem[];
  watchers: string[];
  comments: Comment[];
}

// Release/Version Types
export interface ReleaseStats {
  done: number;
  inProgress: number;
  todo: number;
  total: number;
}

export interface ReleasePipeline {
  dev: 'complete' | 'current' | 'pending';
  qa: 'complete' | 'current' | 'pending';
  staging: 'complete' | 'current' | 'pending';
  uat: 'complete' | 'current' | 'pending';
  prod: 'complete' | 'current' | 'pending';
}

export interface Release {
  id: string;
  name: string;
  description: string;
  status: 'unreleased' | 'released' | 'overdue';
  project: string;
  startDate: string;
  releaseDate: string;
  progress: number;
  stats: ReleaseStats;
  owner: Assignee;
  pipeline: ReleasePipeline;
  linkedItems: LinkedItem[];
  releaseNotes: string;
}

export interface Project {
  id: string;
  name: string;
}
