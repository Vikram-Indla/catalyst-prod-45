/**
 * StatusLozenge — Theme-aware via CSS custom properties
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
    todo:       { bg: '#42526E', text: '#FFFFFF' },
    inprogress: { bg: '#0052CC', text: '#FFFFFF' },
    done:       { bg: '#14892C', text: '#FFFFFF' },
  };
  return map[category];
}

function getDisplayName(status: string): string {
  const shortNames: Record<string, string> = {
    "Ready for Development": "READY FOR DEV", "Ready for development": "READY FOR DEV",
    "In Development": "IN DEV", "In development": "IN DEV",
    "In Progress": "IN PROGRESS", "In progress": "IN PROGRESS",
    "End to End Testing": "E2E TESTING", "End to end testing": "E2E TESTING",
    "In Production": "IN PROD", "In production": "IN PROD",
    "In Review": "IN REVIEW", "In review": "IN REVIEW",
    "Ready for QA": "READY FOR QA", "Ready for qa": "READY FOR QA",
    "ToDo": "TODO", "To Do": "TODO", "To do": "TODO",
    "pending_approval": "PENDING APPROVAL", "in_progress": "IN PROGRESS",
    "in_requirements": "REQUIREMENTS", "in_design": "DESIGN",
    "ready_for_development": "READY FOR DEV", "in_development": "IN DEV",
    "in_qa": "IN QA", "in_uat": "IN UAT", "in_entity_integration": "INTEGRATION",
    "technical_validation": "TECH VALIDATION", "in_beta": "IN BETA",
    "end_to_end_testing": "E2E TESTING", "production_ready": "PROD READY",
    "beta_ready": "BETA READY", "in_production": "IN PROD", "on_hold": "ON HOLD",
  };
  return shortNames[status] || status.toUpperCase();
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
        fontWeight: 700,
        textTransform: "uppercase",
        lineHeight: "16px",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        letterSpacing: "0.03em",
      }}
    >
      {displayName}
    </span>
  );
}

export default StatusLozenge;
