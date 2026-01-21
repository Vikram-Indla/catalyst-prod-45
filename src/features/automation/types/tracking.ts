/**
 * Module 5A-3: Automation Status Tracking - Types
 */

export interface AutomationSyncStatus {
  total: number;
  automated: number;
  manual: number;
  candidate: number;
  mapped: number;
  with_recent_results: number;
  automation_rate: number;
}

export interface AutomationResultHistory {
  id: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration_ms: number | null;
  error_message: string | null;
  run_timestamp: string | null;
  imported_at: string;
  connector_name: string;
  connector_type: string;
}

export type AutomationStatusValue = 'automated' | 'manual' | 'candidate' | 'in_progress' | 'planned';

export const AUTOMATION_STATUS_CONFIG: Record<AutomationStatusValue, {
  label: string;
  color: string;
  description: string;
}> = {
  automated: { label: 'Automated', color: 'hsl(var(--primary))', description: 'Fully automated test' },
  manual: { label: 'Manual', color: 'hsl(var(--warning))', description: 'Manual execution required' },
  candidate: { label: 'Candidate', color: 'hsl(var(--muted-foreground))', description: 'Automation candidate' },
  in_progress: { label: 'In Progress', color: 'hsl(var(--info))', description: 'Automation in development' },
  planned: { label: 'Planned', color: 'hsl(var(--accent))', description: 'Planned for automation' }
};
