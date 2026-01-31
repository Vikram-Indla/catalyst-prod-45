/**
 * Caty AI V7 — Enterprise Response Schema
 * Strict JSON schema for deterministic AI responses
 */

// ============ RESPONSE TYPES ============

export type ResponseType = 'resource_answer' | 'general_answer';
export type SiteStatusValue = 'on_site' | 'off_shore' | 'unknown';
export type UtilizationStatus = 'under' | 'on_target' | 'over' | 'unknown';
export type RiskSeverity = 'low' | 'medium' | 'high';
export type DataConfidence = 'low' | 'medium' | 'high';
export type DataFreshness = 'unknown' | 'realtime' | 'cached';

export type ActionKey = 
  | 'utilization_breakdown' 
  | 'show_allocations' 
  | 'show_assignments' 
  | 'show_expiring_contracts' 
  | 'show_similar_resources'
  | 'generate_report'
  | 'extend_contract'
  | 'assign_resource';

// ============ STRUCTURED RESPONSE INTERFACES ============

export interface TimeRange {
  label: string;
  start: string | null;
  end: string | null;
}

export interface Filters {
  department: string | null;
  location: string | null;
}

export interface Department {
  department_id: string | null;
  name: string | null;
}

export interface SiteStatus {
  value: SiteStatusValue;
  rule_used: string;
}

export interface Vendor {
  vendor_id: string | null;
  name: string | null;
}

export interface ResourceInfo {
  resource_id: string;
  display_name: string;
  department: Department;
  site_status: SiteStatus;
  vendor: Vendor;
}

export interface Utilization {
  current_percent: number | null;
  status: UtilizationStatus;
  target_percent: number;
  calc_notes: string;
}

export interface AllocationItem {
  project_id: string | null;
  project_name: string | null;
  allocation_percent: number | null;
  from: string | null;
  to: string | null;
}

export interface AllocationsSummary {
  total_allocation_percent: number | null;
  active_projects_count: number | null;
  top_allocations: AllocationItem[];
}

export interface Risk {
  severity: RiskSeverity;
  title: string;
  detail: string;
  action: string;
}

export interface NextAction {
  label: string;
  action_key: ActionKey;
  payload: Record<string, unknown>;
}

export interface DataQuality {
  missing_fields: string[];
  freshness: DataFreshness;
  confidence: DataConfidence;
}

// ============ MAIN RESPONSE SCHEMAS ============

export interface ResourceAnswerResponse {
  response_type: 'resource_answer';
  title: string;
  time_range: TimeRange;
  filters: Filters;
  resource: ResourceInfo;
  utilization: Utilization;
  allocations_summary: AllocationsSummary;
  risks: Risk[];
  next_best_actions: NextAction[];
  data_quality: DataQuality;
}

export interface GeneralAnswerResponse {
  response_type: 'general_answer';
  title: string;
  content_markdown: string;
  next_best_actions: NextAction[];
  data_quality: DataQuality;
}

export type CatyStructuredResponse = ResourceAnswerResponse | GeneralAnswerResponse;

// ============ VALIDATION ============

export function isResourceAnswer(response: unknown): response is ResourceAnswerResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  return (
    r.response_type === 'resource_answer' &&
    typeof r.title === 'string' &&
    r.resource !== undefined &&
    r.utilization !== undefined
  );
}

export function isGeneralAnswer(response: unknown): response is GeneralAnswerResponse {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  return (
    r.response_type === 'general_answer' &&
    typeof r.title === 'string' &&
    typeof r.content_markdown === 'string'
  );
}

export function isValidCatyResponse(response: unknown): response is CatyStructuredResponse {
  return isResourceAnswer(response) || isGeneralAnswer(response);
}

export function parseStructuredResponse(content: string): CatyStructuredResponse | null {
  try {
    // Try to extract JSON from markdown code block
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    // Clean the string
    const cleaned = jsonStr.trim();
    
    // Parse JSON
    const parsed = JSON.parse(cleaned);
    
    if (isValidCatyResponse(parsed)) {
      return parsed;
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============ DEFAULT VALUES ============

export const DEFAULT_DATA_QUALITY: DataQuality = {
  missing_fields: [],
  freshness: 'unknown',
  confidence: 'medium'
};

export const UTILIZATION_TARGET = 80;
