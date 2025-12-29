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
  'Demand'
];

// ROAM badge color mapping using Catalyst L9 Gold theme
// Source: Screenshot-Risk1, Web-AtlassianDesign
// NOTE: Using gold instead of blue per Catalyst theme requirements
export const ROAM_BADGE_COLORS: Record<RoamStatus, { bg: string; text: string }> = {
  Resolved: { bg: 'bg-[rgba(163,163,163,0.1)]', text: 'text-[#737373]' },      // Gray (default)
  Owned: { bg: 'bg-[rgba(37,99,235,0.08)]', text: 'text-[#2563eb]' },          // Blue (primary)
  Accepted: { bg: 'bg-[rgba(13,148,136,0.08)]', text: 'text-[#0d9488]' },      // Teal (success)
  Mitigated: { bg: 'bg-[rgba(217,119,6,0.08)]', text: 'text-[#d97706]' }       // Orange (warning)
};

// Chart colors using Catalyst Risk Colors
// Source: Blue + Teal Professional Palette
export const CHART_COLORS = {
  openVsClosed: {
    Open: '#2563eb',      // Brand blue
    Closed: '#36B37E'     // Green
  },
  severity: {
    Critical: '#ef4444',  // Red - Critical
    High: '#ef4444',      // Red - High
    Medium: '#d97706',    // Orange - Medium
    Low: '#0d9488'        // Teal - Low
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
