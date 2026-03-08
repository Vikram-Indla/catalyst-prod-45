/**
 * StatusLozenge — Jira-native status display component.
 * 
 * CATALYST DESIGN SYSTEM GUARDRAIL:
 * This is the ONE AND ONLY component for rendering work item statuses
 * anywhere in the Catalyst application. Do NOT create alternatives.
 * Do NOT override colors. Do NOT add dots or icons.
 * 
 * 3-color system (Atlassian Design System):
 *   GREY  = Not started (To Do, Planned, Backlog, Blocked, etc.)
 *   BLUE  = In progress (In Dev, E2E Testing, Ready for Dev, etc.)
 *   GREEN = Done (Done, In Prod, Closed, Resolved, etc.)
 * 
 * @example
 *   <StatusLozenge status="Ready for Development" />
 *   <StatusLozenge status="Done" />
 *   <StatusLozenge status="Backlog" />
 */

import React from "react";

type StatusCategory = "done" | "inprogress" | "todo";

/**
 * Classify ANY status string into one of three categories.
 * DO NOT add new color categories.
 */
function getStatusCategory(status: string): StatusCategory {
  const normalized = status
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .trim();

  // ── GREEN: Done / Completed / Shipped ──
  const donePatterns = [
    "done", "closed", "resolved", "complete", "completed",
    "inproduction", "inprod", "released", "shipped", "deployed",
    "verified", "accepted", "approved", "productionready", "betaready",
  ];
  if (donePatterns.some((p) => normalized.includes(p))) return "done";

  // ── BLUE: In Progress / Active Work ──
  const progressPatterns = [
    "inprogress", "indevelopment", "indev", "inreview", "endtoendtesting",
    "e2etesting", "testing", "readyfordevelopment", "readyfordev",
    "readyforqa", "readyforreview", "readyfortest", "development",
    "review", "implementing", "active", "started", "reopened",
    "codereview", "uat", "staging", "regression", "qavalidation",
    "inbeta", "technicalvalidation", "ready", "triaging", "triage",
    "open", "inqa", "inuat", "inentityintegration", "fixed",
    "committee", "tocommittee", "converted", "onhold",
  ];
  if (progressPatterns.some((p) => normalized.includes(p))) return "inprogress";

  // ── GREY: Everything else ──
  return "todo";
}

/**
 * Jira Atlassian Design System lozenge colors.
 * DO NOT MODIFY THESE VALUES.
 */
const LOZENGE_COLORS: Record<StatusCategory, { bg: string; text: string }> = {
  todo:       { bg: "#DFE1E6", text: "#253858" },
  inprogress: { bg: "#DEEBFF", text: "#0747A6" },
  done:       { bg: "#E3FCEF", text: "#006644" },
};

/**
 * Shorten long status names for compact display.
 * Always returns UPPERCASE.
 */
function getDisplayName(status: string): string {
  const shortNames: Record<string, string> = {
    "Ready for Development": "READY FOR DEV",
    "Ready for development": "READY FOR DEV",
    "In Development": "IN DEV",
    "In development": "IN DEV",
    "In Progress": "IN PROGRESS",
    "In progress": "IN PROGRESS",
    "End to End Testing": "E2E TESTING",
    "End to end testing": "E2E TESTING",
    "In Production": "IN PROD",
    "In production": "IN PROD",
    "In Review": "IN REVIEW",
    "In review": "IN REVIEW",
    "Ready for QA": "READY FOR QA",
    "Ready for qa": "READY FOR QA",
    "ToDo": "TODO",
    "To Do": "TODO",
    "To do": "TODO",
    "pending_approval": "PENDING APPROVAL",
    "in_progress": "IN PROGRESS",
    "in_requirements": "REQUIREMENTS",
    "in_design": "DESIGN",
    "ready_for_development": "READY FOR DEV",
    "in_development": "IN DEV",
    "in_qa": "IN QA",
    "in_uat": "IN UAT",
    "in_entity_integration": "INTEGRATION",
    "technical_validation": "TECH VALIDATION",
    "in_beta": "IN BETA",
    "end_to_end_testing": "E2E TESTING",
    "production_ready": "PROD READY",
    "beta_ready": "BETA READY",
    "in_production": "IN PROD",
    "on_hold": "ON HOLD",
  };
  return shortNames[status] || status.toUpperCase();
}

/**
 * StatusLozenge — THE canonical status component for Catalyst.
 * Renders a Jira-native lozenge: solid colored background, ALL CAPS, bold, compact.
 */
export function StatusLozenge({ status }: { status: string }) {
  const category = getStatusCategory(status);
  const colors = LOZENGE_COLORS[category];
  const displayName = getDisplayName(status);

  return (
    <span
      style={{
        display:         "inline-block",
        padding:         "2px 8px",
        borderRadius:    "3px",
        backgroundColor: colors.bg,
        color:           colors.text,
        fontSize:        "11px",
        fontWeight:      700,
        textTransform:   "uppercase" as const,
        lineHeight:      "16px",
        whiteSpace:      "nowrap" as const,
        verticalAlign:   "middle",
        letterSpacing:   "0",
      }}
    >
      {displayName}
    </span>
  );
}

export default StatusLozenge;
