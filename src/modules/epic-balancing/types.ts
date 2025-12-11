// Epic Balancing Types - WSJF-style scoring renamed to "Technical Score"

export type StrategicDriver =
  | "EXPAND"
  | "SUSTAIN"
  | "INNOVATE"
  | "CONTAIN"
  | "EXIT"
  | "UNKNOWN"
  | "NOT_SET";

export type AbilityToExecute = "HIGH" | "MEDIUM" | "LOW";

export interface EpicBalancingEpic {
  id: string;
  key: string;
  name: string;
  programId: string;

  businessValue: number | null;
  timeCriticality: number | null;
  opportunityEnablement: number | null;
  jobSize: number | null;

  costOfDelay: number | null;
  technicalScore: number | null;

  strategicDriver: StrategicDriver;
  abilityToExecute: AbilityToExecute;
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

// Strategic Driver colors matching the reference image
export const STRATEGIC_DRIVER_COLORS: Record<StrategicDriver, string> = {
  EXPAND: "#dc2626",      // deep red
  SUSTAIN: "#ea580c",     // orange
  INNOVATE: "#eab308",    // yellow
  CONTAIN: "#fde047",     // light yellow
  EXIT: "#9ca3af",        // grey
  UNKNOWN: "#22c55e",     // green
  NOT_SET: "#d1d5db",     // light grey
};

export const STRATEGIC_DRIVER_LABELS: Record<StrategicDriver, string> = {
  EXPAND: "Expand",
  SUSTAIN: "Sustain",
  INNOVATE: "Innovate",
  CONTAIN: "Contain",
  EXIT: "Exit",
  UNKNOWN: "Unknown",
  NOT_SET: "Not Set",
};

export const ABILITY_TO_EXECUTE_STROKE: Record<AbilityToExecute, number> = {
  HIGH: 4,
  MEDIUM: 2,
  LOW: 1,
};
