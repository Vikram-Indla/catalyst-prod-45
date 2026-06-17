import React from "react";
import { toStatusCategory } from "@/components/ads";
import { statusBg, statusFg } from "@/components/catalyst-detail-views/shared/sections/statusPalette";

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
  };
  if (snakeToJira[status]) return snakeToJira[status];
  return status;
}

export function StatusLozenge({ status }: { status: string }) {
  const category = toStatusCategory(status);
  const label = getDisplayName(status);
  const bg = statusBg(CATEGORY_TO_APPEARANCE[category] ?? 'default');
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
        {label}
      </span>
    </span>
  );
}

export default StatusLozenge;
