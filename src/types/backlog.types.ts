// Backlog Module Type Definitions - Phase 1-3

export type BacklogType = 'theme' | 'epic' | 'capability' | 'feature' | 'story' | 'defect';

export type EpicStatus = 'not_started' | 'in_progress' | 'accepted' | 'done' | 'blocked';

export type ProcessStep = 
  | 'Funnel'
  | 'Reviewing'
  | 'Analyzing'
  | 'Portfolio Backlog'
  | 'Implementing'
  | 'Persevering'
  | 'Done';

export type LabelColor = 'orange' | 'teal' | 'purple' | 'blue' | 'red' | 'gray' | 'green' | 'pink';

export interface Label {
  id: string;
  text: string;
  color: LabelColor;
}

export interface ProgramIncrement {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Program {
  id: string;
  name: string;
}

export interface Epic {
  id: string;
  numericId: number;
  title: string;
  status: EpicStatus;
  processStep: ProcessStep;
  points: number;
  mvp: boolean;
  labels: Label[];
  programId?: string;
  programIncrementId?: string;
  hasChildren: boolean;
  rank: number;
}

export interface BacklogSection {
  id: string;
  title: string;
  type: 'assigned' | 'unassigned';
  programIncrementId?: string;
  itemCount: number;
  progress?: number;
  isExpanded: boolean;
  items: Epic[];
}

export interface ViewingOption {
  id: BacklogType;
  label: string;
  enabled: boolean;
}

export interface BacklogPageProps {
  portfolioName: string;
  sections: BacklogSection[];
  programs: Program[];
  onAddEpic: (title: string, programId: string) => void;
  onEpicClick: (epicId: string) => void;
}

// Phase 3: Detail Panel Types

export interface EpicState {
  id: number;
  name: string;
  color: string;
}

export interface Owner {
  id: string;
  name: string;
  avatar?: string;
}

export interface ContainedIn {
  id: string;
  name: string;
  type: string;
}

export interface EpicDetail extends Epic {
  description: string;
  type: 'Business' | 'Enabler' | 'Compliance';
  containedIn?: ContainedIn;
  primaryProgram?: Program;
  additionalPrograms: Program[];
  owner?: Owner;
  state: EpicState;
  
  // Progress
  storyPointsTotal: number;
  storyPointsAccepted: number;
  featuresTotal: number;
  featuresAccepted: number;
  featuresInDelivery: number;
  featuresDelivered: number;
  
  // Discussions
  discussionCount: number;
  
  // Dates
  createdAt: string;
  updatedAt: string;
}
