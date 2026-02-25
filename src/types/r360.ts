export interface R360Resource {
  id: string;
  rid: string;
  profile_id: string | null;
  name: string;
  role_name: string;
  department: string;
  vendor: string | null;
  resource_type: string | null;
  is_active: boolean;
}

export interface R360WorkItem {
  id: string;
  item_key: string;
  title: string;
  item_type: string;
  priority: string;
  status: string;
  status_category: string;
  status_label: string;
  status_color: string;
  status_bg: string;
  status_dot: string;
  project_key: string;
  project_name: string;
  assignee_name: string;
  reporter_name: string;
  parent_key: string | null;
  parent_title: string | null;
  sprint_name: string | null;
  story_points: number | null;
  fix_version: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  labels: string[];
  age_days: number;
  age_class: 'green' | 'amber' | 'red';
  group_date: string;
  date_label: string;
}

export interface R360Filters {
  status_categories?: string[];
  project_keys?: string[];
  item_types?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  pending_only?: boolean;
}

export type R360ViewType = 'ring' | 'chronology' | 'board';
