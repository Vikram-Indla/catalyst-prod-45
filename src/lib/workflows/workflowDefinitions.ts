/**
 * Default workflow definitions — derived from Jira transition API probes
 * across BAU (Project Hub) and MDT (Product Hub) projects.
 *
 * Source of truth when no /admin override exists in localStorage.
 */
import type { Workflow } from './types';

// ─── SDLC workflow (Story, Feature, Change Request) ─────────────────────────
// BAU verified: Story/Feature follow full SDLC pipeline.
// Change Request (BAU): probed BAU-5997 (Staging/QA) → int→In Integration,
//   beta→In BETA; shares same stage names as Story/Feature.
const SDLC_WORKFLOW: Workflow = {
  id: 'sdlc',
  name: 'SDLC',
  initialStateId: 'in_requirements',
  issueTypes: ['Story', 'Feature', 'Change Request'],
  states: [
    { id: 'in_requirements',       name: 'In Requirements',       category: 'default' },
    { id: 'ready_for_development', name: 'Ready for Development', category: 'moved' },
    { id: 'in_development',        name: 'In Development',        category: 'inprogress' },
    { id: 'in_integration',        name: 'In Integration',        category: 'inprogress' },
    { id: 'technical_validation',  name: 'Technical Validation',  category: 'moved' },
    { id: 'staging_qa',            name: 'Staging/QA',            category: 'moved' },
    { id: 'in_beta',               name: 'In Beta',               category: 'new' },
    { id: 'production_ready',      name: 'Production Ready',      category: 'success' },
    { id: 'in_production',         name: 'In Production',         category: 'success' },
  ],
  transitions: [
    { from: 'in_requirements',       to: 'ready_for_development', verb: 'Ready for Dev' },
    { from: 'ready_for_development', to: 'in_development',        verb: 'Start Dev' },
    { from: 'ready_for_development', to: 'technical_validation',  verb: 'Validate' },
    { from: 'ready_for_development', to: 'in_integration',        verb: 'Integrate' },
    { from: 'in_development',        to: 'ready_for_development', verb: 'Back to Ready' },
    { from: 'in_development',        to: 'in_integration',        verb: 'Integrate' },
    { from: 'in_integration',        to: 'in_development',        verb: 'Back to Dev' },
    { from: 'in_integration',        to: 'technical_validation',  verb: 'Validate' },
    { from: 'technical_validation',  to: 'in_requirements',       verb: 'Reject to Reqs' },
    { from: 'technical_validation',  to: 'staging_qa',            verb: 'Ship to QA' },
    { from: 'staging_qa',            to: 'in_beta',               verb: 'Go Beta' },
    { from: 'staging_qa',            to: 'in_integration',        verb: 'Back to Integration' },
    { from: 'in_beta',               to: 'production_ready',      verb: 'Prod Ready' },
    { from: 'in_beta',               to: 'staging_qa',            verb: 'Back to QA' },
    { from: 'production_ready',      to: 'in_production',         verb: 'Ship' },
    { from: 'in_production',         to: 'in_beta',               verb: 'Rollback' },
  ],
};

// ─── Simple workflow (Epic, Task, subtask family) ────────────────────────────
// BAU verified: Epic (BAU-6020) global any-to-any: Backlog/hold/In Progress/Done.
// Task (BAU-5996): In Progress → done→Done, backlog→Backlog. Same simple model.
// Sub-task / Backend / Frontend / Integration / API Requirement / UAT Finding / Figma
//   all share the same light-weight 4-state model.
const SIMPLE_WORKFLOW: Workflow = {
  id: 'simple',
  name: 'Simple',
  initialStateId: 'backlog',
  issueTypes: [
    'Epic',
    'Task',
    'Sub-task',
    'Integration',
    'Frontend',
    'Backend',
    'API Requirement',
    'UAT Finding',
    'Figma',
  ],
  states: [
    { id: 'backlog',     name: 'Backlog',     category: 'default',    anyToThis: true },
    { id: 'hold',        name: 'Hold',        category: 'moved',      anyToThis: true },
    { id: 'in_progress', name: 'In Progress', category: 'inprogress', anyToThis: true },
    { id: 'done',        name: 'Done',        category: 'success',    anyToThis: true },
  ],
  transitions: [],
};

// ─── Bug workflow (QA Bug, Production Incident) ──────────────────────────────
// BAU verified: QA Bug (BAU-6067, status ToDo) + Production Incident (BAU-6062)
//   share same transition IDs — same workflow.
// Transition verbs from Jira: Block, defer, develop, Fixed, reject.
const BUG_WORKFLOW: Workflow = {
  id: 'bug',
  name: 'Bug',
  initialStateId: 'todo',
  issueTypes: ['QA Bug', 'Production Incident'],
  states: [
    { id: 'todo',                 name: 'ToDo',                 category: 'default' },
    { id: 'under_implementation', name: 'Under Implementation', category: 'inprogress' },
    { id: 'ready_for_qa',         name: 'Ready for QA',         category: 'success' },
    { id: 'rejected',             name: 'Rejected',             category: 'removed' },
    { id: 're_open',              name: 'Re-Open',              category: 'new' },
    { id: 'retest',               name: 'Retest',               category: 'new' },
    { id: 'blocked',              name: 'Blocked',              category: 'removed' },
    { id: 'awaiting_info',        name: 'Awaiting Info',        category: 'default' },
    { id: 'deferred_for_int',     name: 'Deferred for INT',     category: 'moved' },
    { id: 'monitor',              name: 'Monitor',              category: 'default' },
    { id: 'uat_ready',            name: 'UAT Ready',            category: 'new' },
    { id: 'beta_ready',           name: 'Beta Ready',           category: 'new' },
    { id: 'in_beta',              name: 'In Beta',              category: 'new' },
    { id: 'ready_for_production', name: 'Ready for Production', category: 'success' },
    { id: 'in_production',        name: 'In Production',        category: 'success' },
    { id: 'closed',               name: 'Closed',               category: 'success' },
  ],
  transitions: [
    { from: 'todo',                 to: 'blocked',              verb: 'Block' },
    { from: 'todo',                 to: 'deferred_for_int',     verb: 'defer' },
    { from: 'todo',                 to: 'under_implementation', verb: 'develop' },
    { from: 'todo',                 to: 'ready_for_qa',         verb: 'Fixed' },
    { from: 'todo',                 to: 'rejected',             verb: 'reject' },
    { from: 'under_implementation', to: 'ready_for_qa',         verb: 'Fixed' },
    { from: 'under_implementation', to: 'blocked',              verb: 'Block' },
    { from: 'under_implementation', to: 'awaiting_info',        verb: 'info' },
    { from: 'under_implementation', to: 'rejected',             verb: 'reject' },
    { from: 'ready_for_qa',         to: 'retest',               verb: 'Verify' },
    { from: 'ready_for_qa',         to: 'rejected',             verb: 'reject' },
    { from: 'ready_for_qa',         to: 'uat_ready',            verb: 'Promote' },
    { from: 'rejected',             to: 're_open',              verb: 'Re-open' },
    { from: 'rejected',             to: 'closed',               verb: 'Close' },
    { from: 're_open',              to: 'todo',                 verb: 'ToDo' },
    { from: 're_open',              to: 'under_implementation', verb: 'develop' },
    { from: 'retest',               to: 'ready_for_qa',         verb: 'Back to QA' },
    { from: 'retest',               to: 'rejected',             verb: 'reject' },
    { from: 'retest',               to: 'closed',               verb: 'Close' },
    { from: 'blocked',              to: 'todo',                 verb: 'Unblock' },
    { from: 'blocked',              to: 'awaiting_info',        verb: 'info' },
    { from: 'awaiting_info',        to: 'todo',                 verb: 'ToDo' },
    { from: 'awaiting_info',        to: 'blocked',              verb: 'Block' },
    { from: 'deferred_for_int',     to: 'todo',                 verb: 'Activate' },
    { from: 'deferred_for_int',     to: 'monitor',              verb: 'Monitor' },
    { from: 'monitor',              to: 'closed',               verb: 'Close' },
    { from: 'monitor',              to: 'todo',                 verb: 'ToDo' },
    { from: 'uat_ready',            to: 'beta_ready',           verb: 'Promote' },
    { from: 'uat_ready',            to: 'rejected',             verb: 'reject' },
    { from: 'beta_ready',           to: 'in_beta',              verb: 'Start Beta' },
    { from: 'beta_ready',           to: 'retest',               verb: 'Retest' },
    { from: 'in_beta',              to: 'ready_for_production', verb: 'Prod Ready' },
    { from: 'in_beta',              to: 'retest',               verb: 'Retest' },
    { from: 'ready_for_production', to: 'in_production',        verb: 'Ship' },
    { from: 'ready_for_production', to: 'in_beta',              verb: 'Back to Beta' },
    { from: 'in_production',        to: 'closed',               verb: 'Close' },
    { from: 'in_production',        to: 'ready_for_production', verb: 'Rollback' },
    { from: 'closed',               to: 're_open',              verb: 'Re-open' },
  ],
};

// ─── Business Request workflow (MDT project — verified via Jira screenshots) ──
// Full status set from Jira MDT workflow screenshot (2026-06-22):
//   New → Demand Intake → Demand Validation → Pending Approval → Prioritized Backlog
//   → Analysis & Design → Implementation → Review & QA → Pending UAT/Beta
//   → Ready for Production → Done
//   Global: On Hold (any-to), Canceled (any-to)
const BUSINESS_REQUEST_WORKFLOW: Workflow = {
  id: 'business_request',
  name: 'Business Request',
  initialStateId: 'new',
  issueTypes: ['Business Request'],
  states: [
    { id: 'new',                  name: 'New',                  category: 'default' },
    { id: 'demand_intake',        name: 'Demand Intake',        category: 'default' },
    { id: 'demand_validation',    name: 'Demand Validation',    category: 'default' },
    { id: 'pending_approval',     name: 'Pending Approval',     category: 'default' },
    { id: 'prioritized_backlog',  name: 'Prioritized Backlog',  category: 'default' },
    { id: 'analysis_design',      name: 'Analysis & Design',    category: 'inprogress' },
    { id: 'implementation',       name: 'Implementation',       category: 'inprogress' },
    { id: 'review_qa',            name: 'Review & QA',          category: 'inprogress' },
    { id: 'pending_uat_beta',     name: 'Pending UAT/Beta',     category: 'inprogress' },
    { id: 'ready_for_production', name: 'Ready for Production', category: 'success' },
    { id: 'on_hold',              name: 'On Hold',              category: 'default',  anyToThis: true },
    { id: 'done',                 name: 'Done',                 category: 'success',  anyToThis: true },
    { id: 'canceled',             name: 'Canceled',             category: 'success',  anyToThis: true },
  ],
  transitions: [
    { from: 'new',                  to: 'demand_intake',        verb: 'Review demand' },
    { from: 'demand_intake',        to: 'demand_validation',    verb: 'Validate demand' },
    { from: 'demand_intake',        to: 'analysis_design',      verb: 'Start analysis' },
    { from: 'demand_validation',    to: 'pending_approval',     verb: 'Send for approval' },
    { from: 'demand_validation',    to: 'prioritized_backlog',  verb: 'Prioritize' },
    { from: 'pending_approval',     to: 'prioritized_backlog',  verb: 'Approve' },
    { from: 'pending_approval',     to: 'analysis_design',      verb: 'Start analysis' },
    { from: 'prioritized_backlog',  to: 'analysis_design',      verb: 'Start analysis' },
    { from: 'analysis_design',      to: 'implementation',       verb: 'Start implementation' },
    { from: 'implementation',       to: 'demand_validation',    verb: 'Reject to validation' },
    { from: 'implementation',       to: 'prioritized_backlog',  verb: 'Back to backlog' },
    { from: 'implementation',       to: 'review_qa',            verb: 'Business validation' },
    { from: 'review_qa',            to: 'implementation',       verb: 'Rework' },
    { from: 'review_qa',            to: 'pending_uat_beta',     verb: 'Send to UAT' },
    { from: 'pending_uat_beta',     to: 'review_qa',            verb: 'Back to QA' },
    { from: 'pending_uat_beta',     to: 'ready_for_production', verb: 'UAT passed' },
    { from: 'ready_for_production', to: 'done',                 verb: 'Ship' },
  ],
};

// ─── BRD Task workflow (MDT project — verified via Jira screenshots) ─────────
// Full status set from Jira MDT BRD Task workflow screenshot (2026-06-22):
//   BRD Backlog → Figma Design → BRD Preparation → BRD Under Review
//   → Demand Validation → BRD Sign Off → Ready for Implementation → Done
//   Global: Blocked (any-to), Canceled (any-to)
const BRD_TASK_WORKFLOW: Workflow = {
  id: 'brd_task',
  name: 'BRD Task',
  initialStateId: 'brd_backlog',
  issueTypes: ['BRD Task'],
  states: [
    { id: 'brd_backlog',              name: 'BRD Backlog',              category: 'default' },
    { id: 'figma_design',             name: 'Figma Design',             category: 'default' },
    { id: 'brd_preparation',          name: 'BRD Preparation',          category: 'inprogress' },
    { id: 'brd_under_review',         name: 'BRD Under Review',         category: 'default' },
    { id: 'brd_demand_validation',    name: 'Demand Validation',        category: 'default' },
    { id: 'brd_sign_off',             name: 'BRD Sign Off',             category: 'inprogress' },
    { id: 'ready_for_implementation', name: 'Ready for implementation', category: 'inprogress' },
    { id: 'blocked',                  name: 'Blocked',                  category: 'removed', anyToThis: true },
    { id: 'canceled',                 name: 'Canceled',                 category: 'success', anyToThis: true },
    { id: 'brd_done',                 name: 'Done',                     category: 'success' },
  ],
  transitions: [
    { from: 'brd_backlog',             to: 'figma_design',             verb: 'UI design' },
    { from: 'brd_backlog',             to: 'ready_for_implementation', verb: 'Ready for dev' },
    { from: 'figma_design',            to: 'brd_preparation',          verb: 'Design complete' },
    { from: 'brd_preparation',         to: 'brd_under_review',         verb: 'Send for review' },
    { from: 'brd_under_review',        to: 'brd_demand_validation',    verb: 'Validate demand' },
    { from: 'brd_under_review',        to: 'figma_design',             verb: 'Revise design' },
    { from: 'brd_demand_validation',   to: 'brd_sign_off',             verb: 'Sign off' },
    { from: 'brd_demand_validation',   to: 'figma_design',             verb: 'Revise design' },
    { from: 'brd_sign_off',            to: 'ready_for_implementation', verb: 'Ready for dev' },
    { from: 'brd_sign_off',            to: 'figma_design',             verb: 'Revise design' },
    { from: 'brd_sign_off',            to: 'brd_done',                 verb: 'Done' },
    { from: 'ready_for_implementation',to: 'brd_done',                 verb: 'Done' },
  ],
};

// ─── Business Gap workflow (BAU project — derived from probe of BAU-4623) ────
// BAU-4623 (Resolved): transitions close→Closed (done), review→In Review (in_progress).
const BUSINESS_GAP_WORKFLOW: Workflow = {
  id: 'business_gap',
  name: 'Business Gap',
  initialStateId: 'open',
  issueTypes: ['Business Gap'],
  states: [
    { id: 'open',      name: 'Open',      category: 'default' },
    { id: 'in_review', name: 'In Review', category: 'inprogress' },
    { id: 'resolved',  name: 'Resolved',  category: 'success' },
    { id: 'closed',    name: 'Closed',    category: 'success' },
  ],
  transitions: [
    { from: 'open',      to: 'in_review', verb: 'Start review' },
    { from: 'in_review', to: 'resolved',  verb: 'Resolve' },
    { from: 'in_review', to: 'open',      verb: 'Reject' },
    { from: 'resolved',  to: 'in_review', verb: 'Review' },
    { from: 'resolved',  to: 'closed',    verb: 'Close' },
    { from: 'closed',    to: 'open',      verb: 'Re-open' },
  ],
};

export const DEFAULT_WORKFLOWS: Workflow[] = [
  SDLC_WORKFLOW,
  SIMPLE_WORKFLOW,
  BUG_WORKFLOW,
  BUSINESS_REQUEST_WORKFLOW,
  BRD_TASK_WORKFLOW,
  BUSINESS_GAP_WORKFLOW,
];

export {
  SDLC_WORKFLOW,
  SIMPLE_WORKFLOW,
  BUG_WORKFLOW,
  BUSINESS_REQUEST_WORKFLOW,
  BRD_TASK_WORKFLOW,
  BUSINESS_GAP_WORKFLOW,
};
