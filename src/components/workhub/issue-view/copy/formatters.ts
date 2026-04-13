/**
 * Copy formatters — Deterministic plain text, markdown, and CSV formatters
 * ════════════════════════════════════════════════════════════════════════════
 * Respects: current activity filter, visibility permissions, stable ordering.
 * RFC4180-compatible CSV output.
 */
import type { AllWorkItem } from '@/types/allwork.types';

function safe(v: unknown): string {
  return String(v ?? '').trim();
}

function assigneeLabel(name?: string | null): string {
  return name?.trim() || 'Unassigned';
}

function priorityLabel(v?: string | null): string {
  return v?.trim() || '—';
}

function csvEscape(v: string): string {
  const s = safe(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

export function formatIssueKey(item: AllWorkItem): string {
  return item.issue_key;
}

export function formatIssueSummary(item: AllWorkItem): string {
  return item.summary;
}

export function formatAllWorkPlainText(
  item: AllWorkItem,
  opts: {
    parentItem?: AllWorkItem | null;
    children?: AllWorkItem[];
    links?: any[];
    comments?: any[];
    history?: any[];
  },
): string {
  const lines: string[] = [];

  lines.push(`${item.issue_key} — ${safe(item.summary)}`);
  lines.push(`Type: ${safe(item.issue_type)} | Status: ${safe(item.status)} | Priority: ${priorityLabel(item.priority)} | Assignee: ${assigneeLabel(item.assignee_display_name)}`);
  lines.push(`Created: ${safe(item.jira_created_at)} | Updated: ${safe(item.jira_updated_at)}`);
  lines.push('');

  // Work summary
  const hierarchyCount = (item.parent_key ? 1 : 0) + (opts.children?.length ?? item.child_count ?? 0);
  const linksCount = opts.links?.length ?? 0;
  const activityCount = (opts.comments?.length ?? 0) + (opts.history?.length ?? 0);

  lines.push('WORK SUMMARY');
  lines.push(`- Hierarchy: ${hierarchyCount}`);
  lines.push(`- Related issues: ${linksCount}`);
  lines.push(`- Activity: ${activityCount}`);
  lines.push('');

  // Hierarchy
  lines.push('HIERARCHY');
  lines.push('Parent:');
  if (opts.parentItem) {
    lines.push(`- ${opts.parentItem.issue_key} — ${safe(opts.parentItem.summary)} (${safe(opts.parentItem.status)}, ${assigneeLabel(opts.parentItem.assignee_display_name)})`);
  } else if (item.parent_key) {
    lines.push(`- ${item.parent_key} — ${safe(item.parent_summary)}`);
  } else {
    lines.push('- —');
  }
  lines.push('Children:');
  if (opts.children?.length) {
    for (const ch of opts.children) {
      lines.push(`- ${ch.issue_key} — ${safe(ch.summary)} (${safe(ch.status)}, ${assigneeLabel(ch.assignee_display_name)})`);
    }
  } else {
    lines.push('- —');
  }
  lines.push('');

  // Links
  lines.push('RELATED ISSUES');
  if (opts.links?.length) {
    for (const link of opts.links) {
      lines.push(`- ${safe(link.link_type_name ?? 'Link')}: ${safe(link.target_key ?? link.source_key ?? '')} — ${safe(link.target_summary ?? link.source_summary ?? '')}`);
    }
  } else {
    lines.push('- —');
  }
  lines.push('');

  // Activity
  lines.push('ACTIVITY');
  if (opts.comments?.length) {
    for (const c of opts.comments) {
      lines.push(`- ${safe(c.created_at)} | ${safe(c.author_name ?? 'Unknown')} | Comment | ${safe(c.body)}`);
    }
  }
  if (opts.history?.length) {
    for (const h of opts.history) {
      const changes = Array.isArray(h.changes) ? h.changes.map((ch: any) => `${safe(ch.field)}: ${safe(ch.from)} → ${safe(ch.to)}`).join(', ') : safe(h.description);
      lines.push(`- ${safe(h.created_at)} | ${safe(h.author_name ?? 'Unknown')} | Change | ${changes}`);
    }
  }
  if (!opts.comments?.length && !opts.history?.length) {
    lines.push('- —');
  }

  return lines.join('\n');
}

export function formatAllWorkMarkdown(
  item: AllWorkItem,
  opts: {
    parentItem?: AllWorkItem | null;
    children?: AllWorkItem[];
    links?: any[];
    comments?: any[];
    history?: any[];
  },
): string {
  const lines: string[] = [];

  lines.push(`# ${item.issue_key} — ${safe(item.summary)}`);
  lines.push('');
  lines.push(`- **Type:** ${safe(item.issue_type)}`);
  lines.push(`- **Status:** ${safe(item.status)}`);
  lines.push(`- **Priority:** ${priorityLabel(item.priority)}`);
  lines.push(`- **Assignee:** ${assigneeLabel(item.assignee_display_name)}`);
  lines.push(`- **Reporter:** ${assigneeLabel(item.reporter_name)}`);
  lines.push(`- **Created:** ${safe(item.jira_created_at)}`);
  lines.push(`- **Updated:** ${safe(item.jira_updated_at)}`);
  lines.push('');

  // Hierarchy
  lines.push('## Hierarchy');
  lines.push('### Parent');
  if (opts.parentItem) {
    lines.push(`- ${opts.parentItem.issue_key} — ${safe(opts.parentItem.summary)} (**${safe(opts.parentItem.status)}**, ${assigneeLabel(opts.parentItem.assignee_display_name)})`);
  } else if (item.parent_key) {
    lines.push(`- ${item.parent_key} — ${safe(item.parent_summary)}`);
  } else {
    lines.push('- _None_');
  }
  lines.push('');
  lines.push('### Children');
  if (opts.children?.length) {
    for (const ch of opts.children) {
      lines.push(`- ${ch.issue_key} — ${safe(ch.summary)} (**${safe(ch.status)}**, ${assigneeLabel(ch.assignee_display_name)})`);
    }
  } else {
    lines.push('- _None_');
  }
  lines.push('');

  // Links
  lines.push('## Related issues');
  if (opts.links?.length) {
    for (const link of opts.links) {
      lines.push(`- ${safe(link.link_type_name ?? 'Link')}: ${safe(link.target_key ?? link.source_key ?? '')} — ${safe(link.target_summary ?? link.source_summary ?? '')}`);
    }
  } else {
    lines.push('- _None_');
  }
  lines.push('');

  // Activity
  lines.push('## Activity');
  if (opts.comments?.length) {
    for (const c of opts.comments) {
      lines.push(`- **${safe(c.created_at)}** — ${safe(c.author_name ?? 'Unknown')}: ${safe(c.body)}`);
    }
  }
  if (!opts.comments?.length && !opts.history?.length) {
    lines.push('- _None_');
  }

  return lines.join('\n');
}

export function formatFieldsCsv(item: AllWorkItem): string {
  const rows: string[] = ['name,value'];
  rows.push(`${csvEscape('Issue Key')},${csvEscape(item.issue_key)}`);
  rows.push(`${csvEscape('Summary')},${csvEscape(item.summary)}`);
  rows.push(`${csvEscape('Issue Type')},${csvEscape(item.issue_type)}`);
  rows.push(`${csvEscape('Status')},${csvEscape(item.status)}`);
  rows.push(`${csvEscape('Priority')},${csvEscape(item.priority)}`);
  rows.push(`${csvEscape('Assignee')},${csvEscape(item.assignee_display_name ?? '')}`);
  rows.push(`${csvEscape('Reporter')},${csvEscape(item.reporter_name ?? '')}`);
  rows.push(`${csvEscape('Parent')},${csvEscape(item.parent_key ?? '')}`);
  rows.push(`${csvEscape('Labels')},${csvEscape(item.labels?.join(', ') ?? '')}`);
  rows.push(`${csvEscape('Story Points')},${csvEscape(item.story_points != null ? String(item.story_points) : '')}`);
  rows.push(`${csvEscape('Sprint')},${csvEscape(item.sprint_name ?? '')}`);
  rows.push(`${csvEscape('Fix Version')},${csvEscape(item.fix_version_name ?? '')}`);
  rows.push(`${csvEscape('Resolution')},${csvEscape(item.resolution ?? '')}`);
  rows.push(`${csvEscape('Created')},${csvEscape(item.jira_created_at ?? '')}`);
  rows.push(`${csvEscape('Updated')},${csvEscape(item.jira_updated_at ?? '')}`);
  return rows.join('\n');
}
