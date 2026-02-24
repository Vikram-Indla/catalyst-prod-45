import type { PcEventType } from '../types/production-events.types';

export const EVENT_COLORS = {
  feature:     { border: '#2563EB', pillBg: '#DBEAFE', pillText: '#1E40AF', dot: '#2563EB', impactBg: '#F0F7FF', ticketColor: '#2563EB' },
  incident:    { border: '#DC2626', pillBg: '#FEE2E2', pillText: '#B91C1C', dot: '#DC2626', impactBg: '#FFF5F5', ticketColor: '#DC2626' },
  improvement: { border: '#0D9488', pillBg: '#F0FDFA', pillText: '#0F766E', dot: '#0D9488', impactBg: '#F0FDFA', ticketColor: '#0D9488' },
  security:    { border: '#D97706', pillBg: '#FEF3C7', pillText: '#92400E', dot: '#D97706', impactBg: '#FFFBF0', ticketColor: '#D97706' },
  performance: { border: '#16A34A', pillBg: '#F0FDF4', pillText: '#166534', dot: '#16A34A', impactBg: '#F0FDF4', ticketColor: '#16A34A' },
} as const;

export const PINNED_BORDER = '#B45309';

export function getEventColors(type: PcEventType, isPinned: boolean) {
  const colors = EVENT_COLORS[type];
  return {
    ...colors,
    border: isPinned ? PINNED_BORDER : colors.border,
  };
}

/** Fix 3: Map Jira issue types to event types */
export type ClassifiedEventType = 'feature' | 'incident' | 'improvement' | 'security';

export function classifyEventType(jiraIssueType: string, labels: string[]): ClassifiedEventType {
  const type = jiraIssueType.toLowerCase();
  if (type === 'bug' || type === 'qa bug' || type === 'defect' || type === 'production incident') return 'incident';
  if (labels.includes('security')) return 'security';
  if (labels.includes('performance')) return 'improvement';
  if (type === 'story' || type === 'change request' || type === 'business request' || type === 'business gap') return 'feature';
  if (type === 'task' || type === 'technical task' || type === 'sub-task' || type === 'backend' || type === 'frontend') return 'improvement';
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
