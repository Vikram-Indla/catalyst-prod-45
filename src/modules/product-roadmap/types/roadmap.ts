/**
 * Product Roadmap Module Types
 * Core TypeScript interfaces for the roadmap functionality
 */

// Status types
export type RequestStatus = 
  | 'draft' 
  | 'submitted' 
  | 'in_review' 
  | 'approved' 
  | 'rejected' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type MilestoneStatus = 'upcoming' | 'at_risk' | 'completed' | 'missed';

export type TimelineZoom = 'month' | 'quarter' | 'year';

export type GroupingField = 'product' | 'status' | 'priority' | 'assignee' | null;

// Core entities
export interface Product {
  id: string;
  name: string;
  code: string;
  description: string | null;
  color: string;
  owner_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoadmapMilestone {
  id: string;
  name: string;
  target_date: string;
  product_id: string | null;
  status: MilestoneStatus;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
}

// Business Request for roadmap (mapped from existing business_requests table)
export interface RoadmapDemand {
  id: string;
  request_key: string;
  title: string;
  description: string | null;
  assignee: string | null;
  product_id: string | null;
  product?: Product;
  platform: string | null;
  process_step: string | null;
  priority_tier: string | null;
  health: string | null;
  rank: number | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Filters and grouping
export interface RoadmapFilters {
  search: string;
  status: string[];
  priority: string[];
  product_ids: string[];
  assignee_ids: string[];
  platforms: string[];
  health: string[];
  date_range: {
    start: string | null;
    end: string | null;
  };
}

export interface RoadmapGrouping {
  field: GroupingField;
}

export interface TimelineConfig {
  startDate: Date;
  endDate: Date;
  zoom: TimelineZoom;
  showMilestones: boolean;
  showToday: boolean;
}

// Saved view
export interface RoadmapView {
  id: string;
  name: string;
  user_id: string;
  filters: RoadmapFilters;
  grouping: GroupingField;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

// Drag and drop
export interface DragItem {
  type: 'row' | 'bar';
  id: string;
  index: number;
}

// Timeline period for rendering
export interface TimelinePeriod {
  key: string;
  label: string;
  sublabel?: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
}

// Group for rendering
export interface RoadmapGroup {
  key: string;
  label: string;
  color?: string;
  items: RoadmapDemand[];
  isExpanded: boolean;
}

// Status config for display
export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  new_request: { label: 'New Request', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  draft: { label: 'Draft', color: '#737373', bgColor: 'rgba(115, 115, 115, 0.1)' },
  submitted: { label: 'Submitted', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  in_review: { label: 'In Review', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  approved: { label: 'Approved', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
  rejected: { label: 'Rejected', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  in_progress: { label: 'In Progress', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
  completed: { label: 'Completed', color: '#15803d', bgColor: 'rgba(21, 128, 61, 0.1)' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.1)' },
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  high: { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  medium: { label: 'Medium', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)' },
  low: { label: 'Low', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
};

// Default filter state
export const EMPTY_FILTERS: RoadmapFilters = {
  search: '',
  status: [],
  priority: [],
  product_ids: [],
  assignee_ids: [],
  platforms: [],
  health: [],
  date_range: {
    start: null,
    end: null,
  },
};

// Default timeline config
export const DEFAULT_TIMELINE_CONFIG: TimelineConfig = {
  startDate: new Date(new Date().getFullYear(), 0, 1),
  endDate: new Date(new Date().getFullYear(), 11, 31),
  zoom: 'quarter',
  showMilestones: true,
  showToday: true,
};
