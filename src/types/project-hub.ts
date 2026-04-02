/**
 * ProjectHub P2 Types — All Projects listing contracts
 */

export type ProjectStatus = 'Active' | 'Planning' | 'On Hold' | 'Completed';

export type SyncDirection = 'bi' | 'catalyst_to_jira' | 'jira_to_catalyst';

export type ViewMode = 'list' | 'grid';

export type SortField = 'key' | 'name' | 'status' | 'updated';

export type FilterTab = 'All' | 'Starred' | 'Active' | 'Planning' | 'On Hold' | 'Completed';

export interface StatusConfig {
  label: string;
  lozengeClass: 'grey' | 'blue' | 'green';
  bgColor: string;
  textColor: string;
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  Active:    { label: 'ACTIVE',    lozengeClass: 'blue',  bgColor: 'var(--loz-bl-bg)', textColor: 'var(--loz-bl-tx)' },
  Planning:  { label: 'PLANNING',  lozengeClass: 'grey',  bgColor: 'var(--loz-gr-bg)', textColor: 'var(--loz-gr-tx)' },
  'On Hold': { label: 'ON HOLD',   lozengeClass: 'grey',  bgColor: 'var(--loz-gr-bg)', textColor: 'var(--loz-gr-tx)' },
  Completed: { label: 'COMPLETED', lozengeClass: 'green', bgColor: 'var(--loz-gn-bg)', textColor: 'var(--loz-gn-tx)' },
};

export const SYNC_DIRECTION_LABELS: Record<SyncDirection, { icon: string; label: string }> = {
  bi:                 { icon: '↔', label: 'Bi-dir' },
  catalyst_to_jira:   { icon: '→', label: 'C→J' },
  jira_to_catalyst:   { icon: '←', label: 'J→C' },
};

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  lead_id: string;
  badge_color: string;
  badge_text: string;
  sync_direction: SyncDirection;
  jira_project_key?: string;
  last_jira_sync?: string;
  starred_by: string[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'lead' | 'member';
  added_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    initials: string;
    avatar_color: string;
  };
}

export interface BulkAction {
  type: 'change_status' | 'archive' | 'deselect';
  label: string;
  variant?: 'default' | 'danger';
}

export const BULK_ACTIONS: BulkAction[] = [
  { type: 'change_status', label: 'Change Status' },
  { type: 'archive', label: 'Archive', variant: 'danger' },
  { type: 'deselect', label: 'Deselect' },
];

export const FILTER_TABS: FilterTab[] = ['All', 'Starred', 'Active', 'Planning', 'On Hold', 'Completed'];

export const BADGE_COLORS = ['#3B82F6', '#6366F1', '#0891B2', '#475569', '#E11D48', '#0D9488', '#78716C'] as const;
