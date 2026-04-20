/**
 * Workflow engine — Jira-parity types
 *
 * Mirrors Atlaskit Lozenge appearance categories so status pills render
 * with the same bg/color tokens Jira uses.
 */

/** Atlaskit Lozenge appearance values (bold variant) */
export type StatusCategory =
  | 'default'      // grey   — TODO, BACKLOG, HOLD, MONITOR, RE-OPEN, AWAITING INFO
  | 'inprogress'   // blue   — IN PROGRESS, IN DEV, IN INTEGRATION, UNDER IMPLEMENTATION
  | 'success'      // green  — DONE, IN PRODUCTION, CLOSED, READY FOR PRODUCTION, PRODUCTION READY, IN BETA
  | 'removed'      // red    — REJECTED, BLOCKED
  | 'new'          // purple — UAT READY, BETA READY, RETEST
  | 'moved';       // yellow — DEFERRED FOR INT, STAGING/QA, TECHNICAL VALIDATION, READY FOR DEVELOPMENT, READY FOR QA

/** Catalyst issue types this workflow engine supports */
export type IssueType =
  | 'Story'
  | 'Feature'
  | 'Epic'
  | 'Integration'
  | 'Frontend'
  | 'Backend'
  | 'Design'
  | 'Defect'
  | 'Production Incident';

/** A single status node in a workflow */
export interface WorkflowState {
  /** Internal stable ID (kebab or snake) — safe for equality, never shown */
  id: string;
  /** Display label, shown on the Lozenge */
  name: string;
  /** Atlaskit appearance → determines pill color */
  category: StatusCategory;
  /** Optional — true if every other state can transition TO this one */
  anyToThis?: boolean;
  /** Optional — true if this state can transition to every other state */
  anyFromThis?: boolean;
}

/** A transition action surfaced in the dropdown as "verb → target pill" */
export interface Transition {
  /** From state ID */
  from: string;
  /** Target state ID */
  to: string;
  /** Verb shown on the dropdown row (e.g., "Block", "defer", "Fixed") */
  verb: string;
}

/** A workflow definition — a set of states + transitions */
export interface Workflow {
  /** Stable ID — 'sdlc' | 'simple' | 'bug' */
  id: string;
  /** Display name shown in the admin page */
  name: string;
  /** Starting state ID for new issues */
  initialStateId: string;
  /** All states */
  states: WorkflowState[];
  /** Explicit transitions (Any-to-Any is expanded via anyToThis/anyFromThis flags) */
  transitions: Transition[];
  /** Issue types bound to this workflow */
  issueTypes: IssueType[];
}

/** Admin overrides persisted to localStorage — shallow merge on top of defaults */
export interface WorkflowOverrides {
  [workflowId: string]: Partial<Workflow>;
}
