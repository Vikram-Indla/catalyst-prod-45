/**
 * Default workflow definitions — derived pixel-for-pixel from the three
 * transition diagrams supplied by the product team (images 1/2/3 in the
 * design critique), and verified against Jira BAU-5514 dropdown rows.
 *
 * These are the source of truth when no /admin override exists in
 * localStorage.
 */
import type { Workflow } from './types';

// ─── SDLC workflow (Story, Feature) ─────────────────────────────────────────
// Image 1: START → IN REQUIREMENTS → READY FOR DEVELOPMENT → IN DEVELOPMENT
//   → IN INTEGRATION → TECHNICAL VALIDATION → STAGING/QA → IN BETA
//   → PRODUCTION READY → IN PRODUCTION
const SDLC_WORKFLOW: Workflow = {
  id: 'sdlc',
  name: 'SDLC',
  initialStateId: 'in_requirements',
  issueTypes: ['Story', 'Feature'],
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

// ─── Simple workflow (Epic, Integration, Frontend, Backend, Design) ─────────
// Image 3: Create → BACKLOG → HOLD → IN PROGRESS → DONE with Any-to-Any
const SIMPLE_WORKFLOW: Workflow = {
  id: 'simple',
  name: 'Simple',
  initialStateId: 'backlog',
  issueTypes: ['Epic', 'Integration', 'Frontend', 'Backend', 'Design'],
  states: [
    { id: 'backlog',     name: 'Backlog',     category: 'default',    anyToThis: true },
    { id: 'hold',        name: 'Hold',        category: 'moved',      anyToThis: true },
    { id: 'in_progress', name: 'In Progress', category: 'inprogress', anyToThis: true },
    { id: 'done',        name: 'Done',        category: 'success',    anyToThis: true },
  ],
  // Any-to-Any is handled at render-time via anyToThis; no explicit transitions needed
  transitions: [],
};

// ─── Bug workflow (Defect, Production Incident) ─────────────────────────────
// Image 2: TODO → UNDER IMPLEMENTATION → READY FOR QA → REJECTED → RETEST
//   → RE-OPEN → BLOCKED → AWAITING INFO → DEFERRED FOR INT → MONITOR
//   → UAT READY → BETA READY → IN BETA → READY FOR PRODUCTION
//   → IN PRODUCTION → CLOSED
// Verbs from image 4: Block, defer, develop, Fixed, reject
const BUG_WORKFLOW: Workflow = {
  id: 'bug',
  name: 'Bug',
  initialStateId: 'todo',
  issueTypes: ['Defect', 'Production Incident'],
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
    // From TODO (verbs visible in image 4)
    { from: 'todo',                 to: 'blocked',              verb: 'Block' },
    { from: 'todo',                 to: 'deferred_for_int',     verb: 'defer' },
    { from: 'todo',                 to: 'under_implementation', verb: 'develop' },
    { from: 'todo',                 to: 'ready_for_qa',         verb: 'Fixed' },
    { from: 'todo',                 to: 'rejected',             verb: 'reject' },
    // UNDER IMPLEMENTATION
    { from: 'under_implementation', to: 'ready_for_qa',         verb: 'Fixed' },
    { from: 'under_implementation', to: 'blocked',              verb: 'Block' },
    { from: 'under_implementation', to: 'awaiting_info',        verb: 'info' },
    { from: 'under_implementation', to: 'rejected',             verb: 'reject' },
    // READY FOR QA
    { from: 'ready_for_qa',         to: 'retest',               verb: 'Verify' },
    { from: 'ready_for_qa',         to: 'rejected',             verb: 'reject' },
    { from: 'ready_for_qa',         to: 'uat_ready',            verb: 'Promote' },
    // REJECTED → reopen path
    { from: 'rejected',             to: 're_open',              verb: 'Re-open' },
    { from: 'rejected',             to: 'closed',               verb: 'Close' },
    // RE-OPEN
    { from: 're_open',              to: 'todo',                 verb: 'ToDo' },
    { from: 're_open',              to: 'under_implementation', verb: 'develop' },
    // RETEST
    { from: 'retest',               to: 'ready_for_qa',         verb: 'Back to QA' },
    { from: 'retest',               to: 'rejected',             verb: 'reject' },
    { from: 'retest',               to: 'closed',               verb: 'Close' },
    // BLOCKED
    { from: 'blocked',              to: 'todo',                 verb: 'Unblock' },
    { from: 'blocked',              to: 'awaiting_info',        verb: 'info' },
    // AWAITING INFO
    { from: 'awaiting_info',        to: 'todo',                 verb: 'ToDo' },
    { from: 'awaiting_info',        to: 'blocked',              verb: 'Block' },
    // DEFERRED
    { from: 'deferred_for_int',     to: 'todo',                 verb: 'Activate' },
    { from: 'deferred_for_int',     to: 'monitor',              verb: 'Monitor' },
    // MONITOR
    { from: 'monitor',              to: 'closed',               verb: 'Close' },
    { from: 'monitor',              to: 'todo',                 verb: 'ToDo' },
    // UAT READY → BETA READY → IN BETA → READY FOR PRODUCTION → IN PRODUCTION → CLOSED
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
    // CLOSED
    { from: 'closed',               to: 're_open',              verb: 'Re-open' },
  ],
};

export const DEFAULT_WORKFLOWS: Workflow[] = [
  SDLC_WORKFLOW,
  SIMPLE_WORKFLOW,
  BUG_WORKFLOW,
];

export { SDLC_WORKFLOW, SIMPLE_WORKFLOW, BUG_WORKFLOW };
