import { INITIATIVE_TYPE_COLORS, type InitiativeTypeKey } from '@/types/initiative-enhancements';

export function getTypeColor(key: InitiativeTypeKey | string | null | undefined) {
  if (!key) return INITIATIVE_TYPE_COLORS.project;
  return INITIATIVE_TYPE_COLORS[key as InitiativeTypeKey] || INITIATIVE_TYPE_COLORS.project;
}

export function getTypeIcon(key: string | null | undefined): string {
  switch (key) {
    case 'project': return '📁';
    case 'enhancement': return '⚡';
    case 'improvement': return '🔧';
    default: return '📁';
  }
}

export function getTypeLabel(key: string | null | undefined): string {
  switch (key) {
    case 'project': return 'Project';
    case 'enhancement': return 'Enhancement';
    case 'improvement': return 'Improvement';
    default: return 'Untyped';
  }
}
