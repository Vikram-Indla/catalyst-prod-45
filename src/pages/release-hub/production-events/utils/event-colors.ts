import type { PcEventType } from '../types/production-events.types';

export const EVENT_COLORS = {
  feature:     { border: '#2563EB', pillBg: '#DBEAFE', pillText: '#1E40AF', impactBg: '#F0F7FF', ticketColor: '#2563EB' },
  incident:    { border: '#DC2626', pillBg: '#FEE2E2', pillText: '#B91C1C', impactBg: '#FFF5F5', ticketColor: '#DC2626' },
  improvement: { border: '#0D9488', pillBg: '#F0FDFA', pillText: '#0F766E', impactBg: '#F0FDFA', ticketColor: '#0D9488' },
  security:    { border: '#D97706', pillBg: '#FEF3C7', pillText: '#92400E', impactBg: '#FFFBF0', ticketColor: '#D97706' },
  performance: { border: '#16A34A', pillBg: '#F0FDF4', pillText: '#166534', impactBg: '#F0FDF4', ticketColor: '#16A34A' },
} as const;

export const PINNED_BORDER = '#B45309';

export function getEventColors(type: PcEventType, isPinned: boolean) {
  const colors = EVENT_COLORS[type];
  return {
    ...colors,
    border: isPinned ? PINNED_BORDER : colors.border,
  };
}
