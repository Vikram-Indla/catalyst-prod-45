import { INITIATIVE_TYPE_COLORS, type InitiativeTypeKey } from '@/types/initiative-enhancements';

export function getTypeColor(key: InitiativeTypeKey | string | null | undefined) {
  if (!key) return INITIATIVE_TYPE_COLORS.project;
  return INITIATIVE_TYPE_COLORS[key as InitiativeTypeKey] || INITIATIVE_TYPE_COLORS.project;
}

export function getTypeIconName(typeKey: string | null | undefined): string {
  switch (typeKey) {
    case 'project': return 'folder-kanban';
    case 'enhancement': return 'zap';
    case 'improvement': return 'wrench';
    
    case 'entity_integration': return 'link';
    default: return 'circle-dashed';
  }
}

export function getTypeLabel(key: string | null | undefined): string {
  switch (key) {
    case 'project': return 'Project';
    case 'enhancement': return 'Enhancement';
    case 'improvement': return 'Improvement';
    
    case 'entity_integration': return 'Entity Integration';
    default: return 'Untyped';
  }
}
