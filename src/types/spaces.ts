// ════════════════════════════════════════════════════════════════════════════
// CATALYST SPACES MODULE - TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// ENUMS
// ────────────────────────────────────────────────────────────────────────────

export type SpaceType = 'kanban' | 'business' | 'service';
export type SpaceStatus = 'active' | 'archived' | 'trashed';
export type SpaceAccess = 'private' | 'team' | 'organization';
export type MemberRole = 'administrator' | 'member' | 'viewer';
export type VersionStatus = 'unreleased' | 'released' | 'archived';
export type DefaultAssignee = 'unassigned' | 'lead';

// ────────────────────────────────────────────────────────────────────────────
// CORE ENTITIES
// ────────────────────────────────────────────────────────────────────────────

export interface Space {
  id: string;
  name: string;
  key: string;
  description: string | null;
  type: SpaceType;
  status: SpaceStatus;
  access: SpaceAccess;
  color: string;
  avatar_url: string | null;
  lead_id: string | null;
  category_id: string | null;
  external_url: string | null;
  default_assignee: DefaultAssignee;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  trashed_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface SpaceWithStats extends Space {
  category_name: string | null;
  category_color: string | null;
  lead_email: string | null;
  lead_name: string | null;
  member_count: number;
  component_count: number;
  unreleased_version_count: number;
  is_starred: boolean;
}

export interface SpaceCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SpaceMember {
  id: string;
  space_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at: string;
  added_by: string | null;
  // Flattened user fields for easier access
  user_name?: string | null;
  user_email?: string | null;
  user_avatar_url?: string | null;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface SpaceComponent {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  lead_id: string | null;
  default_assignee_id: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    email: string;
    full_name: string | null;
  };
  issue_count?: number;
}

export interface SpaceVersion {
  id: string;
  space_id: string;
  name: string;
  description: string | null;
  status: VersionStatus;
  start_date: string | null;
  release_date: string | null;
  actual_release_date: string | null;
  progress_percentage: number;
  total_issues: number;
  completed_issues: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  released_at: string | null;
  archived_at: string | null;
}

export interface SpaceFeatures {
  id: string;
  space_id: string;
  board_enabled: boolean;
  backlog_enabled: boolean;
  timeline_enabled: boolean;
  releases_enabled: boolean;
  reports_enabled: boolean;
  automation_enabled: boolean;
  code_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpacePermission {
  id: string;
  space_id: string;
  permission_key: string;
  administrator: boolean;
  member: boolean;
  viewer: boolean;
  allowed_roles?: MemberRole[];
  created_at: string;
  updated_at: string;
}

export interface SpaceStarred {
  id: string;
  space_id: string;
  user_id: string;
  created_at: string;
}

export interface SpaceActivity {
  id: string;
  space_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// API REQUEST/RESPONSE TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface CreateSpaceInput {
  name: string;
  key: string;
  description?: string;
  type?: SpaceType;
  access?: SpaceAccess;
  color?: string;
  lead_id?: string;
  category_id?: string;
  external_url?: string;
}

export interface UpdateSpaceInput {
  name?: string;
  key?: string;
  description?: string;
  type?: SpaceType;
  access?: SpaceAccess;
  color?: string;
  lead_id?: string;
  category_id?: string;
  external_url?: string;
  default_assignee?: DefaultAssignee;
}

export interface CreateComponentInput {
  name: string;
  description?: string;
  lead_id?: string;
  default_assignee_id?: string;
}

export interface UpdateComponentInput {
  name?: string;
  description?: string;
  lead_id?: string;
  default_assignee_id?: string;
}

export interface CreateVersionInput {
  name: string;
  description?: string;
  start_date?: string;
  release_date?: string;
}

export interface UpdateVersionInput {
  name?: string;
  description?: string;
  status?: VersionStatus;
  start_date?: string;
  release_date?: string;
}

export interface AddMemberInput {
  user_id?: string;
  user_email?: string;
  role?: MemberRole;
}

export interface UpdateMemberInput {
  role: MemberRole;
}

export interface UpdateFeaturesInput {
  board_enabled?: boolean;
  backlog_enabled?: boolean;
  timeline_enabled?: boolean;
  releases_enabled?: boolean;
  reports_enabled?: boolean;
  automation_enabled?: boolean;
  code_enabled?: boolean;
}

export interface UpdatePermissionInput {
  administrator?: boolean;
  member?: boolean;
  viewer?: boolean;
  allowed_roles?: MemberRole[];
}

// ────────────────────────────────────────────────────────────────────────────
// FILTER & SORT TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface SpaceFilters {
  search?: string;
  type?: SpaceType;
  status?: SpaceStatus;
  category_id?: string;
  lead_id?: string;
  starred?: boolean;
}

export type SpaceSortField = 'name' | 'key' | 'created_at' | 'updated_at';
export type SortDirection = 'asc' | 'desc';

export interface SpaceSort {
  field: SpaceSortField;
  direction: SortDirection;
}

export interface SpaceListParams {
  filters?: SpaceFilters;
  sort?: SpaceSort;
  page?: number;
  limit?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// UI STATE TYPES
// ────────────────────────────────────────────────────────────────────────────

export type SpaceViewMode = 'grid' | 'list';
export type SettingsTab = 'details' | 'access' | 'features' | 'components' | 'versions' | 'permissions' | 'danger';

export interface SpaceUIState {
  viewMode: SpaceViewMode;
  selectedSpaceId: string | null;
  activeSettingsTab: SettingsTab;
  isCreateModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isArchiveModalOpen: boolean;
  sidebarCollapsed: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// PERMISSION KEYS
// ────────────────────────────────────────────────────────────────────────────

export const PERMISSION_KEYS = [
  'browse_space',
  'create_work_items',
  'edit_work_items',
  'delete_work_items',
  'transition_work_items',
  'assign_work_items',
  'schedule_work_items',
  'manage_versions',
  'manage_components',
  'administer_space',
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  browse_space: 'Browse Space',
  create_work_items: 'Create Work Items',
  edit_work_items: 'Edit Work Items',
  delete_work_items: 'Delete Work Items',
  transition_work_items: 'Transition Work Items',
  assign_work_items: 'Assign Work Items',
  schedule_work_items: 'Schedule Work Items',
  manage_versions: 'Manage Versions',
  manage_components: 'Manage Components',
  administer_space: 'Administer Space',
};

// ────────────────────────────────────────────────────────────────────────────
// WORK ITEM & BOARD TYPES (for Board view)
// ────────────────────────────────────────────────────────────────────────────

export type WorkItemType = 'story' | 'task' | 'bug' | 'subtask';
export type WorkItemPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  labels?: string[];
  dueDate?: string;
  storyPoints?: number;
}

export interface BoardColumn {
  id: string;
  title: string;
  status: string;
  color: string;
  wipLimit?: number;
  items: WorkItem[];
}
