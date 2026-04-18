/**
 * CANONICAL — Acceptance Criteria section for all CatalystView* components.
 * Change here → updates all work item types that use it.
 *
 * Renders nothing if acceptance_criteria is empty/null.
 * Pass a custom `label` to rename for type-specific context
 * (e.g. "Expected Behavior" for Defect, "Impact / Root Cause" for Incident).
 */
import React from 'react';
import Heading from '@atlaskit/heading';
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
      {/* Phase D.1 (2026-04-18): @atlaskit/heading owns typography via
          tokens. Semantic <h3> by default for size="small". */}
      <div style={{ marginBottom: 8 }}>
        <Heading size="small">{label}</Heading>
      </div>
      {/* Jira-measured: body 14/400, line-height 1.5, #292A2E, Atlassian Sans */}
      <div style={{
        fontSize: 14, fontWeight: 400, color: '#292A2E', lineHeight: 1.5, whiteSpace: 'pre-wrap',
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
      }}>
        {issue.acceptance_criteria}
      </div>
    </div>
  );
}
