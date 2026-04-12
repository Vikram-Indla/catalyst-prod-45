/**
 * CANONICAL — Acceptance Criteria section for all CatalystView* components.
 * Change here → updates all work item types that use it.
 *
 * Renders nothing if acceptance_criteria is empty/null.
 * Pass a custom `label` to rename for type-specific context
 * (e.g. "Expected Behavior" for Defect, "Impact / Root Cause" for Incident).
 */
import React from 'react';
import type { PhIssue } from '../types';

interface CatalystAcceptanceCriteriaProps {
  issue: PhIssue | null;
  /** Override the section heading (default: "Acceptance Criteria") */
  label?: string;
}

export function CatalystAcceptanceCriteria({ issue, label = 'Acceptance Criteria' }: CatalystAcceptanceCriteriaProps) {
  if (!issue?.acceptance_criteria) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#172B4D', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {issue.acceptance_criteria}
      </div>
    </div>
  );
}
