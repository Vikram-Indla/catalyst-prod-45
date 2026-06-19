import React from "react";
import { toStatusCategory } from "@/components/ads";
import { statusBg, statusFg, type StatusAppearance } from "@/components/catalyst-detail-views/shared/sections/statusPalette";

// Canonical palette (statusPalette.ts). Local pale done-green drifted from
// canonical #94C748 — unified 2026-06-17.
const CATEGORY_TO_APPEARANCE: Record<string, string> = {
  todo:       'default',
  inProgress: 'inprogress',
  done:       'success',
};

function getDisplayName(status: string): string {
  const snakeToJira: Record<string, string> = {
    pending_approval: "Pending approval",
    in_progress: "In Progress",
    in_requirements: "In Requirements",
    in_design: "In Design",
    ready_for_development: "Ready for Development",
    in_development: "In Development",
    in_qa: "In QA",
    in_uat: "In UAT",
    in_entity_integration: "In Entity Integration",
    technical_validation: "Technical Validation",
    in_beta: "In Beta",
    end_to_end_testing: "End to end testing",
    production_ready: "Production Ready",
    beta_ready: "Beta Ready",
    in_production: "In Production",
    ready_for_qa: "Ready for QA",
    on_hold: "On Hold",
    // Release Operations lifecycle (release 9-stage)
    draft: "Draft",
    planned: "Planned",
    in_readiness: "In Readiness",
    ready_for_signoff: "Ready for Sign-off",
    approved: "Approved",
    scheduled: "Scheduled",
    deploying: "Deploying",
    monitoring: "Monitoring",
    completed: "Completed",
    rolled_back: "Rolled Back",
    cancelled: "Cancelled",
    // Change 9-stage lifecycle
    assessing: "Assessing",
    ready_for_approval: "Ready for Approval",
    implementing: "Implementing",
    validating: "Validating",
    implemented: "Implemented",
    closed: "Closed",
    failed: "Failed",
  };
  if (snakeToJira[status]) return snakeToJira[status];
  // Humanize any remaining snake_case so we never show raw "IN_READINESS".
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * `status` resolves color + label from the workflow-status category (default
 * path). For non-status domains (environment, health, deploy outcome) pass an
 * explicit canonical `appearance` + `label` — same visual contract, no
 * forking, colors still drawn from the locked statusPalette.
 */
export function StatusLozenge({
  status,
  appearance,
  label,
}: {
  status?: string;
  appearance?: StatusAppearance;
  label?: string;
}) {
  const resolvedLabel = label ?? getDisplayName(status ?? '');
  const resolvedAppearance =
    appearance ?? CATEGORY_TO_APPEARANCE[toStatusCategory(status ?? '')] ?? 'default';
  const bg = statusBg(resolvedAppearance);
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: bg,
      borderRadius: '3px',
      padding: '0 7px',
      height: '20px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: '20px',
        color: statusFg(),
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {resolvedLabel}
      </span>
    </span>
  );
}

export default StatusLozenge;
