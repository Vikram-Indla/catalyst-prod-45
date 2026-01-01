/**
 * Resource 360° Drawer Types
 * Complete work context visualization for resources
 */

export interface Resource360Data {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar_url?: string;
  currentAllocation: number;
  availableCapacity: number;
}

export interface WorkItemAssignment {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed' | 'cancelled';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: { id: string; name: string };
  parent?: { id: string; item_id: string; title: string; type: string };
  story_points?: number;
  allocation_percentage?: number;
  release_version?: string;
  start_date?: string;
  end_date?: string;
}

export interface HierarchyNode {
  id: string;
  item_id: string;
  title: string;
  type: 'theme' | 'objective' | 'key_result' | 'epic' | 'feature' | 'story' | 'defect' | 'incident' | 'business_request';
  status: 'current' | 'future' | 'completed';
  level: 'enterprise' | 'program' | 'project' | 'product';
  project?: string;
  story_points?: number;
  release_version?: string;
  children?: HierarchyNode[];
}

export interface SunburstNode {
  name: string;
  id?: string;
  value?: number;
  color?: string;
  type?: string;
  children?: SunburstNode[];
}

export interface SunburstMetrics {
  totalItems: number;
  totalStoryPoints: number;
  itemsByType: Record<string, number>;
  itemsByStatus?: {
    completed: number;
    in_progress: number;
    upcoming: number;
  };
}

export type DrawerTab = 'hierarchy' | 'sunburst';

// Work item type icons and colors config
export const WorkItemConfig = {
  theme: { color: '#4d8b4d', bgColor: 'bg-[#4d8b4d]/10', label: 'Theme', level: 'enterprise' },
  objective: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'Objective', level: 'enterprise' },
  key_result: { color: '#d4b896', bgColor: 'bg-[#d4b896]/10', label: 'Key Result', level: 'enterprise' },
  epic: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'Epic', level: 'program' },
  feature: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'Feature', level: 'project' },
  story: { color: '#8b7355', bgColor: 'bg-[#8b7355]/10', label: 'Story', level: 'project' },
  defect: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'Defect', level: 'project' },
  incident: { color: '#d97706', bgColor: 'bg-[#d97706]/10', label: 'Incident', level: 'project' },
  business_request: { color: '#22c55e', bgColor: 'bg-[#22c55e]/10', label: 'Business Request', level: 'product' },
} as const;

export const StatusConfig = {
  current: { color: '#0d9488', bgColor: 'bg-[#0d9488]/10', label: 'CURRENT' },
  future: { color: '#2563eb', bgColor: 'bg-[#2563eb]/10', label: 'FUTURE' },
  completed: { color: '#6b7280', bgColor: 'bg-[#6b7280]/10', label: 'COMPLETED' },
  cancelled: { color: '#dc2626', bgColor: 'bg-[#dc2626]/10', label: 'CANCELLED' },
} as const;
