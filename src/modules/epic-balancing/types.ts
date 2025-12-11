// Epic Balancing Types - WSJF-style scoring renamed to "Technical Score"

export type PriorityToExecute = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW";

export type AbilityToExecute = "HIGH" | "MEDIUM" | "LOW";

export interface EpicBalancingEpic {
  id: string;
  key: string;
  name: string;
  programId: string;

  businessAlignment: number | null;
  timeCriticality: number | null;
  investorEnablement: number | null;
  jobSize: number | null;

  costOfDelay: number | null;
  technicalScore: number | null;

  priorityToExecute: PriorityToExecute;
  abilityToExecute: AbilityToExecute;

  // Planned quarter (e.g., "Q4'25", "Q1'26", or "Unscheduled")
  plannedQuarter: string;

  // Linked items
  themeId?: string | null;
  themeName?: string | null;
  businessRequestId?: string | null;
  businessRequestTitle?: string | null;
}

export interface EpicBalancingStats {
  medianJobSize: number;
  medianCostOfDelay: number;
}

export interface EpicBalancingFilters {
  snapshotId?: string;
  productId?: string;
  status?: string[];
}

export interface EpicBalancingResponse {
  context: {
    programId: string;
    snapshotId?: string;
    productId?: string;
  };
  epics: EpicBalancingEpic[];
  stats: EpicBalancingStats;
}

// Priority to Execute labels
export const PRIORITY_TO_EXECUTE_LABELS: Record<PriorityToExecute, string> = {
  VERY_HIGH: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

// Priority to Execute colors
export const PRIORITY_TO_EXECUTE_COLORS: Record<PriorityToExecute, string> = {
  VERY_HIGH: "#dc2626",   // red
  HIGH: "#ea580c",        // orange
  MEDIUM: "#eab308",      // yellow
  LOW: "#22c55e",         // green
};

export const ABILITY_TO_EXECUTE_STROKE: Record<AbilityToExecute, number> = {
  HIGH: 4,
  MEDIUM: 2,
  LOW: 1,
};
