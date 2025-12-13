// Risks Module Constants
// Source: Implementation Spec Section 4, FieldValidation-Risks

import { RoamStatus, RiskStatus, SeverityLevel, RelationshipType } from "@/types/risks";

// ROAM Status options (Source: FieldValidation-Risks)
export const ROAM_STATUSES: RoamStatus[] = ['Resolved', 'Owned', 'Accepted', 'Mitigated'];

// Risk Status options (Source: FieldValidation-Risks)
export const RISK_STATUSES: RiskStatus[] = ['Open', 'Closed'];

// Severity levels for Occurrence (Source: FieldValidation-Risks)
export const SEVERITY_LEVELS: SeverityLevel[] = ['Low', 'Medium', 'High', 'Critical'];

// Impact levels (Critical, High, Medium, Low)
export const IMPACT_LEVELS: SeverityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

// Relationship types (Source: FieldValidation-Risks)
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  'Theme',
  'Epic',
  'Capability',
  'Feature',
  'Program Increment'
];

// ROAM badge color mapping using Catalyst L9 Gold theme
// Source: Screenshot-Risk1, Web-AtlassianDesign
// NOTE: Using gold instead of blue per Catalyst theme requirements
export const ROAM_BADGE_COLORS: Record<RoamStatus, { bg: string; text: string }> = {
  Resolved: { bg: 'bg-neutral-200', text: 'text-neutral-700' },        // Gray (default)
  Owned: { bg: 'bg-brand-gold-pale', text: 'text-brand-gold-hover' },  // Gold (Catalyst theme)
  Accepted: { bg: 'bg-success/10', text: 'text-success-600' },         // Green (success)
  Mitigated: { bg: 'bg-warning/10', text: 'text-warning-600' }         // Yellow (warning)
};

// Chart colors using Catalyst L9 Gold theme
// Source: Screenshot-RiskROAMReport
export const CHART_COLORS = {
  openVsClosed: {
    Open: '#C69C6D',      // Brand gold
    Closed: '#36B37E'     // Green
  },
  severity: {
    Critical: '#DE350B',  // Red
    High: '#FF8B00',      // Orange
    Medium: '#FFAB00',    // Yellow
    Low: '#C69C6D'        // Brand gold
  }
};

// Field validation limits (Source: FieldValidation-Risks)
export const FIELD_LIMITS = {
  title: 100,
  description: 400000,
  notify: 2000,
  emailSingle: 200,
  consequence: 2000,
  contingency: 2000,
  mitigation: 2000,
  resolutionStatus: 2000,
  tags: 2000
};

// Pagination defaults (Source: Screenshot-Risk1)
export const PAGINATION_DEFAULTS = {
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100]
};

// ROAM report limit (Source: Doc-Risk_ROAM_report)
export const ROAM_REPORT_LIMIT = 200;

// ROAM column order (Source: Screenshot-RiskROAMReport)
export const ROAM_COLUMN_ORDER: RoamStatus[] = ['Resolved', 'Owned', 'Accepted', 'Mitigated'];
