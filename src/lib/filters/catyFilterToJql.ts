/**
 * catyFilterToJql — converts a CatyFilter structured spec to a JQL string
 * so that CATY-generated filters can be saved as named filters.
 */
import type { CatyFilter } from '@/components/caty/catySearchStore';

function qq(values: string[]): string {
  return values.map(v => `"${v.replace(/"/g, '\\"')}"`).join(', ');
}

export function catyFilterToJql(filter: CatyFilter | null): string {
  if (!filter) return '';
  const clauses: string[] = [];

  // Assignee
  if (filter.is_unassigned) {
    clauses.push('assignee is EMPTY');
  } else if (filter.assignee_ids?.length) {
    clauses.push(filter.assignee_ids.length === 1
      ? `assignee = ${qq(filter.assignee_ids)}`
      : `assignee in (${qq(filter.assignee_ids)})`);
  } else if (filter.assignee_names?.length) {
    clauses.push(filter.assignee_names.length === 1
      ? `assignee = ${qq(filter.assignee_names)}`
      : `assignee in (${qq(filter.assignee_names)})`);
  }

  // Reporter
  if (filter.reporter_ids?.length) {
    clauses.push(filter.reporter_ids.length === 1
      ? `reporter = ${qq(filter.reporter_ids)}`
      : `reporter in (${qq(filter.reporter_ids)})`);
  } else if (filter.reporter_names?.length) {
    clauses.push(filter.reporter_names.length === 1
      ? `reporter = ${qq(filter.reporter_names)}`
      : `reporter in (${qq(filter.reporter_names)})`);
  }

  // Status
  if (filter.status_names?.length) {
    clauses.push(filter.status_names.length === 1
      ? `status = ${qq(filter.status_names)}`
      : `status in (${qq(filter.status_names)})`);
  }

  // Priority
  if (filter.priorities?.length) {
    clauses.push(filter.priorities.length === 1
      ? `priority = ${qq(filter.priorities)}`
      : `priority in (${qq(filter.priorities)})`);
  }

  // Work type
  if (filter.types?.length) {
    clauses.push(filter.types.length === 1
      ? `issuetype = ${qq(filter.types)}`
      : `issuetype in (${qq(filter.types)})`);
  }

  // Labels
  if (filter.labels?.length) {
    clauses.push(filter.labels.length === 1
      ? `labels = ${qq(filter.labels)}`
      : `labels in (${qq(filter.labels)})`);
  }

  // Fix versions
  if (filter.fix_versions?.length) {
    clauses.push(filter.fix_versions.length === 1
      ? `fixVersion = ${qq(filter.fix_versions)}`
      : `fixVersion in (${qq(filter.fix_versions)})`);
  }

  // Sprint
  if (filter.sprint_names?.length) {
    clauses.push(filter.sprint_names.length === 1
      ? `sprint = ${qq(filter.sprint_names)}`
      : `sprint in (${qq(filter.sprint_names)})`);
  }

  // Parent
  if (filter.parent_keys?.length) {
    clauses.push(filter.parent_keys.length === 1
      ? `parent = "${filter.parent_keys[0]}"`
      : `parent in (${qq(filter.parent_keys)})`);
  }

  // Flagged
  if (filter.is_flagged) {
    clauses.push('flagged = "Impediment"');
  }

  // Resolution
  if (filter.resolution_set === true) {
    clauses.push('resolution is not EMPTY');
  } else if (filter.resolution_set === false) {
    clauses.push('resolution is EMPTY');
  }

  // Time windows — relative JQL notation
  if (filter.created_within_days) {
    clauses.push(`created >= -${filter.created_within_days}d`);
  }
  if (filter.updated_within_days) {
    clauses.push(`updated >= -${filter.updated_within_days}d`);
  }
  if (filter.stale_for_days) {
    clauses.push(`updated <= -${filter.stale_for_days}d`);
  }

  // Text search
  if (filter.text_contains?.trim()) {
    const t = filter.text_contains.trim().replace(/"/g, '\\"');
    clauses.push(`(summary ~ "${t}" OR description ~ "${t}")`);
  }

  return clauses.join(' AND ');
}
