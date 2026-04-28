/**
 * StatusLozenge — Theme-aware via CSS custom properties
 *
 * jira-compare Patch #1 (2026-04-28):
 *   - Drop `text-transform: uppercase` (Atlaskit lozenge spec is no transform).
 *   - Change font-weight 700 → 600 to match Atlaskit @atlaskit/lozenge.
 *   - Return Jira's status.name verbatim (sentence case "In QA", "Ready for QA",
 *     "Done"). Previously upper-cased everything via getDisplayName.
 */

import React from "react";

type StatusCategory = "done" | "inprogress" | "todo";

function getStatusCategory(status: string): StatusCategory {
  const normalized = status.toLowerCase().replace(/[\s_-]+/g, "").trim();
  const donePatterns = [
    "done", "closed", "resolved", "complete", "completed",
    "inproduction", "inprod", "released", "shipped", "deployed",
    "verified", "accepted", "approved", "productionready", "betaready",
  ];
  if (donePatterns.some((p) => normalized.includes(p))) return "done";
  const progressPatterns = [
    "inprogress", "indevelopment", "indev", "inreview", "endtoendtesting",
    "e2etesting", "testing", "readyfordevelopment", "readyfordev",
    "readyforqa", "readyforreview", "readyfortest", "development",
    "review", "implementing", "active", "started", "reopened",
    "codereview", "uat", "staging", "regression", "qavalidation",
    "inbeta", "technicalvalidation", "triaging", "triage",
    "inqa", "inuat", "inentityintegration", "fixed",
    "committee", "tocommittee", "converted", "onhold",
  ];
  if (progressPatterns.some((p) => normalized.includes(p))) return "inprogress";
  return "todo";
}

function getLozengeTokens(category: StatusCategory): { bg: string; text: string } {
  const map: Record<StatusCategory, { bg: string; text: string }> = {
    todo:       { bg: 'var(--status-todo-bg)', text: 'var(--status-todo-text)' },
    inprogress: { bg: 'var(--status-inprogress-bg)', text: 'var(--status-inprogress-text)' },
    done:       { bg: 'var(--status-done-bg)', text: 'var(--status-done-text)' },
  };
  return map[category];
}

/**
 * Display the status label as Jira renders it.
 *
 * Jira passes status.name straight through ("In QA", "Ready for QA",
 * "Done", "In Progress"). We do the same — no uppercasing, no
 * abbreviating ("READY FOR DEV"), no snake_case decoding tricks. If
 * the upstream string already has the canonical Jira name, we use it.
 *
 * The only normalisation: a few legacy snake_case variants from
 * Catalyst's own internal state get mapped to their Jira display name,
 * because that's what users actually see.
 */
function getDisplayName(status: string): string {
  const snakeToJira: Record<string, string> = {
    "pending_approval": "Pending approval",
    "in_progress": "In Progress",
    "in_requirements": "In Requirements",
    "in_design": "In Design",
    "ready_for_development": "Ready for Development",
    "in_development": "In Development",
    "in_qa": "In QA",
    "in_uat": "In UAT",
    "in_entity_integration": "In Entity Integration",
    "technical_validation": "Technical Validation",
    "in_beta": "In Beta",
    "end_to_end_testing": "End to end testing",
    "production_ready": "Production Ready",
    "beta_ready": "Beta Ready",
    "in_production": "In Production",
    "ready_for_qa": "Ready for QA",
    "on_hold": "On Hold",
  };
  if (snakeToJira[status]) return snakeToJira[status];
  return status;
}

export function StatusLozenge({ status }: { status: string }) {
  const category = getStatusCategory(status);
  const tokens = getLozengeTokens(category);
  const displayName = getDisplayName(status);

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "3px",
        backgroundColor: tokens.bg,
        color: tokens.text,
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: "16px",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        letterSpacing: "0",
      }}
    >
      {displayName}
    </span>
  );
}

export default StatusLozenge;
