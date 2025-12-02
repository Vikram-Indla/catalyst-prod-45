/**
 * Jira Panel Integration Types
 * Types for embedded test management panel in Catalyst work items
 */

export interface JiraPanelState {
  isOpen: boolean;
  activeTab: 'cases' | 'cycles' | 'executions';
  width: number;
  defaultProgramId: string | null;
  showArchived: boolean;
  autoRefresh: boolean;
}

export interface WorkItemLinkRequest {
  work_item_id: string;
  case_ids: string[];
  link_type?: string;
}

export interface LinkedCase {
  id: string;
  key: string;
  title: string;
  status: 'draft' | 'published' | 'deprecated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  last_executed_at: string | null;
  last_execution_status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
  version: number;
  folder_path: string;
}

export interface LinkedCycle {
  id: string;
  key: string;
  name: string;
  status: 'not_started' | 'active' | 'completed' | 'on_hold';
  start_date: string;
  end_date: string;
  progress: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    not_run: number;
  };
}

export interface ImpactedExecution {
  id: string;
  case_key: string;
  case_title: string;
  cycle_name: string;
  executed_at: string;
  assigned_to: string;
  evidence_count: number;
}

export const PANEL_WIDTH_PRESETS = {
  small: 320,
  medium: 480,
  large: 640,
};

export const AUTO_REFRESH_INTERVALS = {
  off: 0,
  short: 30000,
  long: 60000,
};
