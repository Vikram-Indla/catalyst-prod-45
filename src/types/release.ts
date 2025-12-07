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

export interface Attachment {
  id: string;
  name: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  icon?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'status_change' | 'assignment' | 'comment' | 'attachment' | 'created' | 'major_incident';
  user: string;
  time: string;
  event: string;
  oldValue?: string;
  newValue?: string;
  dotColor: 'gold' | 'gray' | 'blue' | 'green' | 'red';
}

export interface Incident {
  id: string;
  summary: string;
  description: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3';
  impact: 'high' | 'medium' | 'low';
  urgency: 'high' | 'medium' | 'low';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed' | 'reopened' | 'cancelled';
  assignee: Assignee;
  reporter: Assignee;
  component: string;
  components?: string[];
  labels?: string[];
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  linkedItems: LinkedItem[];
  watchers: string[];
  watcherDetails?: Assignee[];
  comments: Comment[];
  attachments?: Attachment[];
  timeline?: TimelineEvent[];
  isMajorIncident?: boolean;
  incidentCommander?: Assignee;
  slackChannel?: string;
  releaseVersion?: string;
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
