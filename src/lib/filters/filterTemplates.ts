/**
 * Hub-aware filter template registry (O5)
 *
 * Templates are scoped by hub type. Each template provides a name,
 * description, and a JQL string (optionally with {projectKey} placeholder
 * that the caller substitutes at render time).
 *
 * CLAUDE.md 2026-05-21 rule: JQL field set differs per hub.
 * - Project Hub: uses ph_issues fields (project, issuetype, status, assignee, etc.)
 * - Product Hub: uses business_requests fields (request_type, product_code, etc.)
 */

export type HubTemplateScope = 'project' | 'product' | 'release' | 'testhub';

export interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  jql: string;
  /** Optional category for grouping in the gallery */
  category: 'my-work' | 'team' | 'priority' | 'dates' | 'quality';
}

// ─── Project Hub templates ────────────────────────────────────────────────────

const PROJECT_TEMPLATES: FilterTemplate[] = [
  {
    id: 'proj-my-open',
    name: 'My open work',
    description: 'All open work items assigned to me',
    jql: 'assignee = currentUser() AND status != Done ORDER BY updated DESC',
    category: 'my-work',
  },
  {
    id: 'proj-my-blocked',
    name: 'My blocked items',
    description: 'Work items I own that are currently blocked',
    jql: 'assignee = currentUser() AND status = Blocked',
    category: 'my-work',
  },
  {
    id: 'proj-my-recent',
    name: 'Recently updated by me',
    description: 'Items I touched in the last 7 days',
    jql: 'assignee = currentUser() AND updated >= -7d ORDER BY updated DESC',
    category: 'my-work',
  },
  {
    id: 'proj-high-priority',
    name: 'High priority items',
    description: 'Highest and High priority work not yet done',
    jql: 'priority in (Highest, High) AND status != Done ORDER BY priority DESC',
    category: 'priority',
  },
  {
    id: 'proj-unassigned',
    name: 'Unassigned open work',
    description: 'Open items with no assignee',
    jql: 'assignee is EMPTY AND status != Done ORDER BY created ASC',
    category: 'team',
  },
  {
    id: 'proj-stale',
    name: 'Stale open work',
    description: 'Items not updated in over 30 days',
    jql: 'status != Done AND updated <= -30d ORDER BY updated ASC',
    category: 'dates',
  },
  {
    id: 'proj-bugs-open',
    name: 'Open QA bugs',
    description: 'All open QA Bug issues',
    jql: 'issuetype = "QA Bug" AND status != Done ORDER BY priority DESC',
    category: 'quality',
  },
  {
    id: 'proj-incidents',
    name: 'Recent incidents',
    description: 'Production incidents created in the last 14 days',
    jql: 'issuetype = "Production Incident" AND created >= -14d ORDER BY created DESC',
    category: 'quality',
  },
  {
    id: 'proj-due-soon',
    name: 'Due within 7 days',
    description: 'Work items with due dates in the next week',
    jql: 'duedate <= 7d AND status != Done ORDER BY duedate ASC',
    category: 'dates',
  },
  {
    id: 'proj-no-labels',
    name: 'Missing labels',
    description: 'Stories and tasks with no labels assigned',
    jql: 'issuetype in (Story, Task) AND labels is EMPTY',
    category: 'quality',
  },
];

// ─── Product Hub templates ────────────────────────────────────────────────────

const PRODUCT_TEMPLATES: FilterTemplate[] = [
  {
    id: 'prod-my-requests',
    name: 'My feature requests',
    description: 'Business requests I submitted',
    jql: 'reporter = currentUser() ORDER BY created DESC',
    category: 'my-work',
  },
  {
    id: 'prod-unreviewed',
    name: 'Awaiting review',
    description: 'Requests not yet reviewed by the product team',
    jql: 'status = "Awaiting Review" ORDER BY created ASC',
    category: 'team',
  },
  {
    id: 'prod-high-priority',
    name: 'High priority requests',
    description: 'High-priority product requests in the backlog',
    jql: 'priority in (Highest, High) AND status != Done',
    category: 'priority',
  },
  {
    id: 'prod-recent',
    name: 'New this week',
    description: 'Requests raised in the last 7 days',
    jql: 'created >= -7d ORDER BY created DESC',
    category: 'dates',
  },
];

// ─── Release Hub templates ────────────────────────────────────────────────────

const RELEASE_TEMPLATES: FilterTemplate[] = [
  {
    id: 'rel-in-release',
    name: 'Items in current release',
    description: 'All issues with a fix version set',
    jql: 'fixVersion is not EMPTY AND status != Done ORDER BY priority DESC',
    category: 'dates',
  },
  {
    id: 'rel-incidents-this-release',
    name: 'Release incidents',
    description: 'Production incidents linked to a fix version',
    jql: 'issuetype = "Production Incident" AND fixVersion is not EMPTY ORDER BY created DESC',
    category: 'quality',
  },
  {
    id: 'rel-blocking',
    name: 'Blockers for release',
    description: 'High priority blocked items that may delay the release',
    jql: 'priority in (Highest, High) AND status = Blocked AND fixVersion is not EMPTY',
    category: 'priority',
  },
];

// ─── TestHub templates ────────────────────────────────────────────────────────

const TESTHUB_TEMPLATES: FilterTemplate[] = [
  {
    id: 'test-open-bugs',
    name: 'All open bugs',
    description: 'QA bugs not yet resolved',
    jql: 'issuetype = "QA Bug" AND resolution is EMPTY ORDER BY priority DESC',
    category: 'quality',
  },
  {
    id: 'test-my-bugs',
    name: 'Bugs assigned to me',
    description: 'QA bugs I am currently handling',
    jql: 'issuetype = "QA Bug" AND assignee = currentUser() AND status != Done',
    category: 'my-work',
  },
  {
    id: 'test-critical',
    name: 'Critical defects',
    description: 'Highest priority bugs with no fix version',
    jql: 'issuetype = "QA Bug" AND priority = Highest AND fixVersion is EMPTY',
    category: 'priority',
  },
];

// ─── Registry ────────────────────────────────────────────────────────────────

const REGISTRY: Record<HubTemplateScope, FilterTemplate[]> = {
  project:  PROJECT_TEMPLATES,
  product:  PRODUCT_TEMPLATES,
  release:  RELEASE_TEMPLATES,
  testhub:  TESTHUB_TEMPLATES,
};

/**
 * Return templates for a hub, optionally filtered by category.
 * The optional `projectKey` replaces `{projectKey}` placeholders in JQL.
 */
export function getFilterTemplates(
  scope: HubTemplateScope,
  projectKey?: string,
  category?: FilterTemplate['category']
): FilterTemplate[] {
  let templates = REGISTRY[scope] ?? [];
  if (category) templates = templates.filter(t => t.category === category);
  if (projectKey) {
    templates = templates.map(t => ({
      ...t,
      jql: t.jql.replace(/\{projectKey\}/g, projectKey),
    }));
  }
  return templates;
}

export const TEMPLATE_CATEGORIES: Array<{ id: FilterTemplate['category']; label: string }> = [
  { id: 'my-work',  label: 'My work'  },
  { id: 'team',     label: 'Team'     },
  { id: 'priority', label: 'Priority' },
  { id: 'dates',    label: 'Dates'    },
  { id: 'quality',  label: 'Quality'  },
];
