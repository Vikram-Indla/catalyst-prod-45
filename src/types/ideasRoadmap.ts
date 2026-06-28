export type MilestoneKey = 'req' | 'des' | 'dev' | 'uat' | 'beta' | 'prod';

export interface MilestoneConfig {
  key: MilestoneKey;
  label: string;
  fullLabel: string;
  color: string;
}

export const MILESTONE_CONFIGS: MilestoneConfig[] = [
  { key: 'req',  label: 'REQ',  fullLabel: 'Requirements', color: 'var(--ds-background-information-bold)' },
  { key: 'des',  label: 'DES',  fullLabel: 'Design',       color: 'var(--ds-background-discovery-bold)' },
  { key: 'dev',  label: 'DEV',  fullLabel: 'Development',  color: 'var(--ds-background-success-bold)' },
  { key: 'uat',  label: 'UAT',  fullLabel: 'User Acceptance Testing', color: 'var(--ds-background-warning-bold)' },
  { key: 'beta', label: 'β',    fullLabel: 'Beta',         color: 'var(--ds-background-accent-teal-bolder)' },
  { key: 'prod', label: 'PROD', fullLabel: 'Production',   color: 'var(--cp-success)' },
];

export type RoadmapQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;
export type RoadmapView = 'roadmap' | 'dates';

export interface RoadmapMilestones {
  req: string | null;
  des: string | null;
  dev: string | null;
  uat: string | null;
  beta: string | null;
  prod: string | null;
}

export interface RoadmapIdea {
  id: string;
  ideaKey: string;
  title: string;
  description: string | null;
  theme: string | null;
  priority: string | null;
  team: string | null;
  quarter: RoadmapQuarter;
  isCommitted: boolean;
  milestones: RoadmapMilestones;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMilestonesPayload {
  ideaId: string;
  milestones: Partial<RoadmapMilestones>;
}

export interface UpdateCommittedPayload {
  ideaId: string;
  isCommitted: boolean;
  quarter?: RoadmapQuarter;
}

export interface MoveToQuarterPayload {
  ideaId: string;
  quarter: RoadmapQuarter;
  isCommitted: boolean;
}
