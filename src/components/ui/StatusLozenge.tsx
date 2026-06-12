import React from "react";
import { toStatusCategory } from "@/components/ads";

const PILL_BG: Record<string, string> = {
  todo:       'var(--ds-background-neutral, #DCDFE4)',
  inProgress: 'var(--ds-background-information, #E9F2FF)',
  done:       'var(--ds-background-success, #DCFFF1)',
};

const PILL_COLOR: Record<string, string> = {
  todo:       'var(--ds-text-subtle, #42526E)',
  inProgress: 'var(--ds-text-information, #0055CC)',
  done:       'var(--ds-text-success, #216E4E)',
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
  const bg = PILL_BG[category] ?? PILL_BG.todo;
  const color = PILL_COLOR[category] ?? PILL_COLOR.todo;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: bg,
      borderRadius: '4px',
      padding: '2px 4px',
      height: '20px',
    }}>
      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '20px',
        color,
        textTransform: 'none',
        letterSpacing: 'normal',
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
