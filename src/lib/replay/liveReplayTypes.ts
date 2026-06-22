export type ReplayStatusCategory = "todo" | "prog" | "done";

export type ReplayWorkItemType =
  | "Business Request"
  | "Epic"
  | "Story"
  | "QA Bug"
  | "Production Incident"
  | "Change Request";

/**
 * ev tuple: [iso_timestamp, status_label, category, actor_name, from_status?, assignee?]
 * Mirrors the event shape the HTML engine reads from LANES[].ev.
 */
export interface ReplayLane {
  key: string;
  type: ReplayWorkItemType;
  module?: string;
  parent: string | null;
  linked?: boolean;
  afterParent?: string;
  reporter?: string;
  sum: string;
  target?: string;
  release?: { iso: string; name: string };
  sprint?: { name: string; start?: string; end?: string };
  ev: Array<[string, string, ReplayStatusCategory, string, string?, string?]>;
}

export interface ReplayJourney {
  mode: "demo" | "live";
  rootKey: string;
  rootTitle?: string;
  projectKey?: string;
  generatedAt: string;
  lanes: ReplayLane[];
  dataQuality: {
    eligible: boolean;
    fidelity:
      | "full-history"
      | "partial-history"
      | "current-state-only"
      | "not-eligible";
    missingSprintHistory: boolean;
    missingReleaseData: boolean;
    missingStatusHistory: boolean;
    missingAssigneeHistory: boolean;
    warnings: string[];
    sourceTables: string[];
  };
}
