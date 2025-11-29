// Mock data for Strategy Room & OKR Module
// Based on FRD and Catalyst screenshots

export type ObjectiveLevel = "STRATEGIC" | "PORTFOLIO" | "PROGRAM" | "TEAM";

export type KeyResultType = "COUNT" | "PERCENT" | "CURRENCY";

export interface ProgramIncrement {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface StrategySnapshot {
  id: string;
  name: string;
  mission: string;
  vision: string;
  values: string[];
}

export interface KeyResult {
  id: number;
  title: string;
  type: KeyResultType;
  currentValue: number;
  goalValue: number;
  baselineValue?: number;
  owner: {
    name: string;
    initials: string;
    avatarColor: string;
  };
  dueDate?: string;
  progress: number; // 0-1
}

export interface Objective {
  id: number;
  level: ObjectiveLevel;
  title: string;
  description: string;
  snapshotId: string;
  programIncrementIds: string[];
  parentId?: number;
  owner: {
    name: string;
    initials: string;
    avatarColor: string;
  };
  status: "On Track" | "At Risk" | "Off Track";
  keyResults: KeyResult[];
  alignedWorkItems: {
    themeIds: number[];
    epicIds: number[];
    featureIds: number[];
    dependencyIds: number[];
    riskIds: number[];
  };
  keyResultsProgress: number; // 0-1
  alignedWorkProgress: number; // 0-1
  score: number; // 0-1
  confidenceScore: number;
  anchorSprint?: string;
  startDate?: string;
  dueDate?: string;
  blocked?: boolean;
}

export interface WorkItemProgress {
  label: string;
  acceptedPercent: number; // 0-1
  completed: number;
  total: number;
}

export interface StrategyPyramidLayer {
  label: string;
  subtitle?: string;
  count?: number;
  misalignedCount?: number;
}

// Seed Program Increments
export const mockProgramIncrements: ProgramIncrement[] = [
  { id: "PI-5", name: "PI-5", startDate: "2024-01-15", endDate: "2024-04-05" },
  { id: "PI-6", name: "PI-6", startDate: "2024-04-08", endDate: "2024-06-28" },
  { id: "PI-7", name: "PI-7", startDate: "2024-07-01", endDate: "2024-09-20" },
];

// Seed Strategy Snapshots
export const mockStrategySnapshots: StrategySnapshot[] = [
  {
    id: "corp-2019",
    name: "Corporate Strategy 2019",
    mission: "To deliver exceptional value to our stakeholders.",
    vision: "To be recognized as the industry leader in innovation.",
    values: ["Excellence", "Integrity", "Customer Focus"]
  },
  {
    id: "corp-2020",
    name: "Corporate Strategy 2020",
    mission: "To transform the industry through technology.",
    vision: "To be the preferred partner for digital transformation.",
    values: ["Innovation", "Collaboration", "Quality"]
  },
  {
    id: "acme-2023",
    name: "Acme Snapshot 2023",
    mission: "To accelerate business growth through strategic partnerships.",
    vision: "To achieve market leadership by 2025.",
    values: ["Partnership", "Growth", "Excellence", "Trust"]
  },
  {
    id: "corp-2024",
    name: "Corporate Strategy 2024",
    mission: "To positively impact the communities and customers we serve through the creation, growth and preservation of wealth, with a focus on families.",
    vision: "To be the world's preeminent financial services firm for compelling customer experience powered by leading technology advancements",
    values: [
      "Integrity - We do the right thing, all the time.",
      "Leadership - We are leaders in our communities and seek to support and foster leadership in our customers.",
      "Now - We operate with a sense of urgency and discipline.",
      "Teamwork - working together with our associates and customers to deliver with discipline and fervor."
    ]
  }
];

// Seed Objectives
export const mockObjectives: Objective[] = [
  // Strategic Goal 1
  {
    id: 139,
    level: "STRATEGIC",
    title: "Capitalize on Emerging Technology Trends",
    description: "Leverage emerging technologies to maintain competitive advantage",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-5", "PI-6", "PI-7"],
    owner: { name: "Sarah Johnson", initials: "SJ", avatarColor: "#3b82f6" },
    status: "At Risk",
    keyResults: [],
    alignedWorkItems: { themeIds: [1, 2], epicIds: [], featureIds: [], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.6,
    alignedWorkProgress: 0.65,
    score: 0.6,
    confidenceScore: 0.6,
    anchorSprint: "PI76 (4/25-5/8)"
  },
  
  // Portfolio Objective 1 under Strategic Goal 1
  {
    id: 3593,
    level: "PORTFOLIO",
    title: "Become market leader in mobile investment and banking space",
    description: "Use automation as driver for capital efficiency",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-5", "PI-6", "PI-7"],
    parentId: 139,
    owner: { name: "Chad Goodgion", initials: "CG", avatarColor: "#10b981" },
    status: "On Track",
    keyResults: [
      {
        id: 1,
        title: "Automation of 50 processes",
        type: "COUNT",
        currentValue: 39,
        goalValue: 50,
        baselineValue: 2,
        owner: { name: "Chad Goodgion", initials: "CG", avatarColor: "#10b981" },
        progress: 0.78
      }
    ],
    alignedWorkItems: { 
      themeIds: [1], 
      epicIds: [1184, 1168], 
      featureIds: [], 
      dependencyIds: [], 
      riskIds: [] 
    },
    keyResultsProgress: 0.78,
    alignedWorkProgress: 0.82,
    score: 0.8,
    confidenceScore: 0.8,
    anchorSprint: "PI76 (4/25-5/8)"
  },

  // Program Objective 1 under Portfolio Objective 1
  {
    id: 3595,
    level: "PROGRAM",
    title: "Become Leading Financial App in Android Marketplace",
    description: "Achieve top ranking in Android app store for financial services",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-5", "PI-6"],
    parentId: 3593,
    owner: { name: "Maria Rodriguez", initials: "MR", avatarColor: "#8b5cf6" },
    status: "On Track",
    keyResults: [
      {
        id: 2,
        title: "Achieve 4.5+ star rating",
        type: "PERCENT",
        currentValue: 4.2,
        goalValue: 4.5,
        baselineValue: 3.8,
        owner: { name: "Maria Rodriguez", initials: "MR", avatarColor: "#8b5cf6" },
        progress: 0.6
      }
    ],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [1, 2, 3], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.85,
    alignedWorkProgress: 0.88,
    score: 0.9,
    confidenceScore: 0.9
  },

  // Team Objectives under Program Objective 1
  {
    id: 3594,
    level: "TEAM",
    title: "Grow Android Daily Active Users",
    description: "Increase daily active user count by 25%",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-5"],
    parentId: 3595,
    owner: { name: "Bob Davis", initials: "BD", avatarColor: "#f59e0b" },
    status: "At Risk",
    keyResults: [],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [1], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.4,
    alignedWorkProgress: 0.45,
    score: 0.4,
    confidenceScore: 0.4
  },
  {
    id: 3598,
    level: "TEAM",
    title: "High Android Marketplace Rating",
    description: "Maintain high user satisfaction ratings",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-5", "PI-6"],
    parentId: 3595,
    owner: { name: "Emily Chen", initials: "EC", avatarColor: "#10b981" },
    status: "On Track",
    keyResults: [],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [2], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.65,
    alignedWorkProgress: 0.7,
    score: 0.6,
    confidenceScore: 0.6
  },
  {
    id: 3599,
    level: "TEAM",
    title: "Increase user retention and reduce churn",
    description: "Improve retention metrics across user segments",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-6"],
    parentId: 3595,
    owner: { name: "Alex Thompson", initials: "AT", avatarColor: "#f59e0b" },
    status: "At Risk",
    keyResults: [],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [3], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.6,
    alignedWorkProgress: 0.62,
    score: 0.6,
    confidenceScore: 0.6
  },

  // Program Objective 2 under Portfolio Objective 1
  {
    id: 3597,
    level: "PROGRAM",
    title: "Become Leading Financial App in iOS Marketplace",
    description: "Achieve top ranking in iOS app store for financial services",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-6", "PI-7"],
    parentId: 3593,
    owner: { name: "David Lee", initials: "DL", avatarColor: "#10b981" },
    status: "On Track",
    keyResults: [],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [4, 5], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.7,
    alignedWorkProgress: 0.75,
    score: 0.7,
    confidenceScore: 0.7
  },

  // Team Objective under Program Objective 2
  {
    id: 3600,
    level: "TEAM",
    title: "Grow iOS Daily Active Users",
    description: "Increase iOS daily active user count by 30%",
    snapshotId: "corp-2024",
    programIncrementIds: ["PI-6", "PI-7"],
    parentId: 3597,
    owner: { name: "Jessica Martinez", initials: "JM", avatarColor: "#10b981" },
    status: "On Track",
    keyResults: [],
    alignedWorkItems: { themeIds: [], epicIds: [], featureIds: [4], dependencyIds: [], riskIds: [] },
    keyResultsProgress: 0.8,
    alignedWorkProgress: 0.82,
    score: 0.8,
    confidenceScore: 0.8
  },
];

// Snapshot Progress Data (from screenshot)
export const mockSnapshotProgress: WorkItemProgress[] = [
  { label: "Themes", acceptedPercent: 0, completed: 0, total: 9 },
  { label: "Epics", acceptedPercent: 0.22, completed: 9, total: 41 },
  { label: "Features", acceptedPercent: 0.72, completed: 314, total: 439 },
  { label: "Stories", acceptedPercent: 0.82, completed: 1346, total: 1642 },
  { label: "Dependencies", acceptedPercent: 0.36, completed: 141, total: 391 },
];

// Strategy Pyramid Data (from screenshot)
export const mockStrategyPyramid: StrategyPyramidLayer[] = [
  { label: "Missions", subtitle: "Why do we exist?", count: 1 },
  { label: "Visions", subtitle: "What value do we provide?", count: 1 },
  { label: "Values", subtitle: "How do we behave?", count: 4 },
  { 
    label: "Strategic Goals", 
    subtitle: "How will we succeed this year?", 
    count: 4 
  },
  { 
    label: "Themes", 
    subtitle: "Misaligned Themes = 2", 
    count: 2,
    misalignedCount: 2
  },
  { label: "Portfolio Objectives", count: 9 },
  { label: "Epics", subtitle: "Misaligned Epics = 0", count: 5, misalignedCount: 0 },
  { label: "Program Objectives", count: 113 },
  { 
    label: "Features", 
    subtitle: "Misaligned Features = 7", 
    count: 69,
    misalignedCount: 7
  },
];

// Execution Against Outcomes Data (from screenshot)
export const mockExecutionAgainstOutcomes = [
  { level: "Strategic Goals", workItemType: "Themes", completionPercent: 25 },
  { level: "Portfolio Objectives", workItemType: "Epics", completionPercent: 40 },
  { level: "Program Objectives", workItemType: "Features", completionPercent: 57 },
  { level: "Team Objectives", workItemType: "Features", completionPercent: 63 },
];
