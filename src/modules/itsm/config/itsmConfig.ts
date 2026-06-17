// ============================================================
// ITSM CONFIG — status / severity / priority maps (ADS tokens only)
// Single source of truth for ordering, labels, categories, colors.
// ============================================================

import type {
  ItsmStatus,
  ItsmStatusCategory,
  ItsmSeverity,
  ItsmPriority,
} from '../types';

// Canonical status order (incident workflow).
export const ITSM_STATUS_ORDER: ItsmStatus[] = [
  'triage',
  'investigating',
  'identified',
  'monitoring',
  'resolved',
  'closed',
];

export const ITSM_STATUS_LABEL: Record<ItsmStatus, string> = {
  triage: 'Triage',
  investigating: 'Investigating',
  identified: 'Identified',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
  closed: 'Closed',
};

// Status -> category (drives StatusPill appearance + done detection).
export const ITSM_STATUS_CATEGORY: Record<ItsmStatus, ItsmStatusCategory> = {
  triage: 'todo',
  investigating: 'in_progress',
  identified: 'in_progress',
  monitoring: 'in_progress',
  resolved: 'done',
  closed: 'done',
};

export function itsmStatusCategory(status: ItsmStatus): ItsmStatusCategory {
  return ITSM_STATUS_CATEGORY[status] ?? 'todo';
}

// Severity ordering + labels + ADS color tokens (token-first, ADS fallback).
export const ITSM_SEVERITY_ORDER: ItsmSeverity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

export const ITSM_SEVERITY_LABEL: Record<ItsmSeverity, string> = {
  SEV1: 'SEV1 · Critical',
  SEV2: 'SEV2 · Major',
  SEV3: 'SEV3 · Minor',
  SEV4: 'SEV4 · Low',
};

export const ITSM_SEVERITY_COLOR: Record<ItsmSeverity, string> = {
  SEV1: 'var(--ds-text-danger, #AE2A19)',
  SEV2: 'var(--ds-text-warning, #A54800)',
  SEV3: 'var(--ds-text-information, #0055CC)',
  SEV4: 'var(--ds-text-subtlest, #6B778C)',
};

// Priority weight for sorting (Highest first). Reuses PriorityIcon range.
export const ITSM_PRIORITY_WEIGHT: Record<ItsmPriority, number> = {
  Highest: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Lowest: 4,
};

export const ITSM_PRIORITY_ORDER: ItsmPriority[] = [
  'Highest',
  'High',
  'Medium',
  'Low',
  'Lowest',
];

// At-risk threshold: SLA flips to 'at_risk' once this fraction of the window has elapsed.
export const ITSM_SLA_AT_RISK_FRACTION = 0.8;
