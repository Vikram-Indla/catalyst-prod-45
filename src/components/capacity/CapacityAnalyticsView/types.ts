/**
 * Capacity Analytics V7 Types
 */

export interface AnalyticsResource {
  id: string;
  name: string;
  role_name: string;
  vendor: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  department: { id: string; name: string; color?: string; sort_order?: number } | null;
  contract_end_date: string | null;
  country: { id: string; name: string; code: string; flag_svg?: string } | null;
  avatar_url?: string | null;
}

export interface AnalyticsAllocation {
  id: string;
  resource_id: string;
  assignment_id: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
  status: 'committed' | 'forecast';
  assignment: {
    id: string;
    name: string;
    color: 'primary' | 'teal' | 'warning' | 'danger';
  } | null;
}

export interface MonthSegment {
  assignment: { id: string; name: string; color: string };
  percent: number;
  status: string;
}

export interface MonthCell {
  month: number;
  year: number;
  segments: MonthSegment[];
  isEnded: boolean;
  totalPercent: number;
}

export interface CapacityRow {
  resource: AnalyticsResource;
  months: MonthCell[];
  committedPercent: number; // Average committed % across current period
}

export type ViewScope = 'q1' | 'h1' | 'full';

export const VIEW_MONTHS: Record<ViewScope, number[]> = {
  q1: [1, 2, 3],
  h1: [1, 2, 3, 4, 5, 6],
  full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
