import type { PcEventType } from '../types/production-events.types';

export const EVENT_COLORS = {
  feature:     { border: '#2563EB', pillBg: '#DBEAFE', pillText: '#1E40AF', dot: '#2563EB', impactBg: '#F0F7FF', ticketColor: '#2563EB', impactLabel: '#1E40AF' },
  incident:    { border: '#DC2626', pillBg: '#FEE2E2', pillText: '#991B1B', dot: '#DC2626', impactBg: '#FFF5F5', ticketColor: '#DC2626', impactLabel: '#991B1B' },
  improvement: { border: '#0D9488', pillBg: '#F0FDFA', pillText: '#0F766E', dot: '#0D9488', impactBg: '#F0FDFA', ticketColor: '#0D9488', impactLabel: '#0F766E' },
  security:    { border: '#D97706', pillBg: '#FEF3C7', pillText: '#92400E', dot: '#D97706', impactBg: '#FFFBF0', ticketColor: '#D97706', impactLabel: '#92400E' },
  performance: { border: '#16A34A', pillBg: '#F0FDF4', pillText: '#166534', dot: '#16A34A', impactBg: '#F0FDF4', ticketColor: '#16A34A', impactLabel: '#166534' },
} as const;

export const PINNED_BORDER = '#B45309';

export function getEventColors(type: PcEventType, isPinned: boolean) {
  const colors = EVENT_COLORS[type];
  return {
    ...colors,
    border: isPinned ? PINNED_BORDER : colors.border,
  };
}

/** Classified event types */
export type ClassifiedEventType = 'feature' | 'incident' | 'improvement' | 'security';

/**
 * Fix 4: Enhanced type classification — uses Jira type, summary keywords, and labels
 */
export function classifyEventType(
  jiraIssueType: string,
  labels: string[] = [],
  summary: string = '',
): ClassifiedEventType {
  const type = jiraIssueType.toLowerCase().replace(/\s+/g, '');
  const sumLower = summary.toLowerCase();

  // Explicit Jira types
  if (type === 'bug' || type === 'qabug' || type === 'defect' || type === 'productionincident' || type === 'incident') return 'incident';
  if (type === 'changerequest' || type === 'technicaldebt' || type === 'technicaltask') return 'improvement';
  if (type === 'task' && !sumLower.includes('feature')) return 'improvement';

  // Label overrides
  if (labels.some(l => l.toLowerCase().includes('security'))) return 'security';

  // Summary keyword detection (for Story types that aren't really features)
  if (sumLower.match(/\bcr\b|caching|cache|performance|optim|sms change|notification change/)) return 'improvement';
  if (sumLower.match(/\bbug\b|fix|hotfix|patch|resolve|incident/)) return 'incident';
  if (sumLower.match(/security|auth|permission|vulnerability/)) return 'security';

  // Default: Story / Business Request → Feature
  if (type === 'story' || type === 'businessrequest' || type === 'businessgap') return 'feature';
  if (type === 'sub-task' || type === 'backend' || type === 'frontend') return 'improvement';

  return 'feature';
}

/** Get event type colors for classified type */
export function getClassifiedColors(type: ClassifiedEventType) {
  return EVENT_COLORS[type] || EVENT_COLORS.feature;
}

/** Legacy: Map Jira issue_type to a left-border color */
export function getIssueTypeColor(issueType: string): string {
  const classified = classifyEventType(issueType, []);
  return EVENT_COLORS[classified].border;
}
