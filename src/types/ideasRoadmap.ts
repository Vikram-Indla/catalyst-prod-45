export type MilestoneKey = 'req' | 'des' | 'dev' | 'uat' | 'beta' | 'prod';

export interface MilestoneConfig {
  key: MilestoneKey;
  label: string;
  fullLabel: string;
  color: string;
}

export const MILESTONE_CONFIGS: MilestoneConfig[] = [
  { key: 'req',  label: 'REQ',  fullLabel: 'Requirements', color: '#3B82F6' },
  { key: 'des',  label: 'DES',  fullLabel: 'Design',       color: '#8B5CF6' },
  { key: 'dev',  label: 'DEV',  fullLabel: 'Development',  color: '#22C55E' },
  { key: 'uat',  label: 'UAT',  fullLabel: 'User Acceptance Testing', color: '#F97316' },
  { key: 'beta', label: 'β',    fullLabel: 'Beta',         color: '#14B8A6' },
  { key: 'prod', label: 'PROD', fullLabel: 'Production',   color: 'var(--cp-success, #16A34A)' },
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
