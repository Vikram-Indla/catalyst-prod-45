/**
 * Caty AI V10 — Types
 * Comprehensive Capacity Assistant with QueryPlan and Fallback support
 */

export interface CatyMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isHtml?: boolean;
}

export interface CatySession {
  id: string;
  created: string;
  updated: string;
  context: CatyContext;
  messages: CatyMessage[];
}

export interface CatyContext {
  department: string;
  period: string;
  location?: string; // "On-Site" | "Off-Shore" | "All"
}

// V10 QueryPlan structure
export interface QueryPlan {
  intent: 'resource_lookup' | 'vendor_filter' | 'department_filter' | 'role_filter' | 
    'location_filter' | 'contract_window' | 'utilization' | 'assignment_staffing' | 'mixed';
  entities: {
    resource_name?: string;
    department_name?: string;
    vendor_name?: string;
    role_name?: string;
    location?: string;
    assignment_name?: string;
  };
  time_window: {
    type: 'none' | 'relative' | 'range';
    days?: number;
    start?: string | null;
    end?: string | null;
    label: string;
  };
  filters: {
    department_id?: string | null;
    vendor_id?: string | null;
    location?: string | null;
    job_role?: string | null;
    assignment_id?: string | null;
  };
  sort: Array<{ field: string; dir: 'asc' | 'desc' }>;
  limit: number;
  fallback_level: number;
}

// V10 Query Result structure
export interface QueryResult {
  row_count: number;
  rows: any[];
  applied_filters: Record<string, any>;
  window: { start: string | null; end: string | null; label: string };
  debug: {
    timezone: string;
    rls_blocked: boolean;
    datatype_warnings: string[];
    queries_executed: string[];
    fallbacks_executed: string[];
  };
}

// V10 Resource data structure (mandatory fields)
export interface CatyResource {
  resource_id: string;
  rid?: string;
  name: string;
  role: string;
  department: {
    id: string | null;
    name: string;
  };
  vendor: {
    id: string | null;
    name: string;
  };
  location: 'Onsite' | 'Offshore';
  site_status: {
    value: 'on_site' | 'off_shore' | 'unknown';
    rule_used: string;
  };
  country: string;
  country_code: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  allocation_percent: number;
  utilization_percent: number | null;
  utilization_status: 'under' | 'on_target' | 'over' | 'unknown';
  assignments: string[];
}
