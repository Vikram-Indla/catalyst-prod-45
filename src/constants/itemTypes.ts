/**
 * Canonical item type labels and colors for R360 Intelligence Panel.
 * Maps raw Jira issue_type values to standardized display labels.
 */

export const ITEM_TYPE_LABEL: Record<string, string> = {
  'Bug': 'Bug', 'bug': 'Bug',
  'QA Bug': 'Bug', 'qa_bug': 'Bug',
  'Incident': 'Incident', 'incident': 'Incident',
  'Production Incident': 'Incident',
  'Story': 'Story', 'story': 'Story',
  'User Story': 'Story',
  'Frontend': 'Story',
  'Backend': 'Story',
  'Subtask': 'Subtask', 'subtask': 'Subtask',
  'Sub-task': 'Subtask', 'sub_task': 'Subtask',
  'Task': 'Task', 'task': 'Task',
  'BRD Task': 'Task',
  'Epic': 'Epic', 'epic': 'Epic',
  'Feature': 'Feature', 'New Feature': 'Feature',
};

export const ITEM_TYPE_COLOR: Record<string, string> = {
  'Bug':      '#C41D1D',
  'Incident': '#B91C1C',
  'Story':    '#166534',
  'Subtask':  '#374151',
  'Task':     '#374151',
  'Epic':     '#1D55D4',
  'Feature':  '#92400E',
};

export function getItemTypeLabel(raw: string): string {
  return ITEM_TYPE_LABEL[raw] ?? raw;
}

export function getItemTypeColor(raw: string): string {
  const label = getItemTypeLabel(raw);
  return ITEM_TYPE_COLOR[label] ?? '#374151';
}

export function getReleaseShortName(release: { name?: string; short_name?: string; code?: string } | string): string {
  if (typeof release === 'string') {
    const name = release;
    if (name === '—' || !name) return '—';
    const rMatch = name.match(/R(\d+)|Release\s*(\d+)/i);
    if (rMatch) return `R${rMatch[1] || rMatch[2]}`;
    const vMatch = name.match(/(\d+\.\d+)/);
    if (vMatch) return `v${vMatch[1]}`;
    return name.slice(0, 4);
  }
  if (release.short_name) return release.short_name;
  if (release.code) return release.code;
  return getReleaseShortName(release.name || '—');
}

export function isUnusualHour(timeStr: string): boolean {
  const [h, m] = timeStr.split(':').map(Number);
  const mins = h * 60 + (m || 0);
  return mins < 360 || mins > 1410; // before 06:00 OR after 23:30
}
