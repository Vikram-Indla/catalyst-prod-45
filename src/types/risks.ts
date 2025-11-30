// Risks Module Type Definitions
// Source: Implementation Spec Section 3, FieldValidation-Risks

import { Database } from "@/integrations/supabase/types";

// ROAM Resolution Methods (Source: FieldValidation-Risks)
export type RoamStatus = 'Resolved' | 'Owned' | 'Accepted' | 'Mitigated';

// Risk Status (Source: FieldValidation-Risks)
export type RiskStatus = 'Open' | 'Closed';

// Severity Levels (Source: FieldValidation-Risks)
export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// Yes/No Type (Source: FieldValidation-Risks)
export type YesNo = 'Yes' | 'No';

// Relationship Types (Source: FieldValidation-Risks)
export type RelationshipType = 'Theme' | 'Epic' | 'Capability' | 'Feature' | 'Program Increment';

// Risk Entity (Source: FieldValidation-Risks, Screenshot-Risk1)
export interface Risk {
  id: string;
  risk_number: number;
  title: string;
  description: string;
  status: RiskStatus;
  occurrence: SeverityLevel | null;
  impact: SeverityLevel | null;
  critical_path: YesNo | null;
  program_id: string;
  program_increment_id: string;
  owner_id: string;
  relationship: RelationshipType;
  related_item_id: string | null;
  resolution_method: RoamStatus;
  target_resolution_date: string | null;
  notify: string | null;
  consequence: string | null;
  contingency: string | null;
  mitigation: string | null;
  resolution_status: string | null;
  tags: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Form data for creating/editing risks (Source: Doc-Create_risks)
export interface RiskFormData {
  title: string;
  description: string;
  status: RiskStatus;
  occurrence: SeverityLevel | null;
  impact: SeverityLevel | null;
  critical_path: YesNo | null;
  program_id: string | null;
  program_increment_id: string | null;
  owner_id: string | null;
  relationship: RelationshipType | null;
  related_item_id: string | null;
  resolution_method: RoamStatus;
  target_resolution_date: string | null;
  notify: string;
  consequence: string;
  contingency: string;
  mitigation: string;
  resolution_status: string;
  tags: string;
}

// Grid filter state (Source: Screenshot-Filter)
export interface RiskGridFilters {
  program_increment_id: string | null;
  owner_id: string | null;
  status: RiskStatus | null;
  resolution_method: RoamStatus | null;
  occurrence: SeverityLevel | null;
  impact: SeverityLevel | null;
  critical_path: YesNo | null;
}

// ROAM report filter state (Source: Screenshot-RiskROAMViewSettings)
export interface RoamFilters {
  relationship: RelationshipType | null;
  occurrence: SeverityLevel | 'all';
  impact: SeverityLevel | 'all';
}

// ROAM chart visibility (Source: Screenshot-RiskROAMViewSettings)
export interface ChartVisibility {
  openVsClosed: boolean;
  riskOfOccurrence: boolean;
  impactOfOccurrence: boolean;
}

// Chart data structure (Source: Screenshot-RiskROAMReport)
export interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

// Resolution modal state (Source: Screenshot-RiskROAMReasonModal)
export interface ResolutionModalState {
  isOpen: boolean;
  risk: Risk | null;
  newStatus: RoamStatus | null;
}
