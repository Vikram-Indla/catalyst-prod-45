import { 
  Circle,
  Building2,
  Square,
  Gem,
  GitBranch,
  Target,
  AlertTriangle,
  FileText,
  Bug,
  Siren,
  type LucideIcon
} from 'lucide-react';

export type WorkItemType = 
  | 'theme'
  | 'objective'
  | 'business-request'
  | 'epic'
  | 'feature'
  | 'story'
  | 'defect'
  | 'incident'
  | 'dependency'
  | 'risk';

export interface WorkItemConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  moduleCode: string | null;
  category: 'enterprise' | 'product' | 'program' | 'project' | 'other';
}

/**
 * Centralized work item configuration for consistent icons and colors across the app.
 * 
 * Categories:
 * - enterprise: Themes, Objectives
 * - product: Business Request
 * - program: Epics
 * - project: Feature, Story, Defect, Incidents
 * - other: Dependencies, Risks
 */
export const workItemConfig: Record<WorkItemType, WorkItemConfig> = {
  // === ENTERPRISE ===
  'theme': {
    key: 'theme',
    label: 'Themes',
    icon: Circle,
    color: 'text-workitem-theme',
    bgColor: 'bg-workitem-theme',
    moduleCode: 'ENTERPRISE',
    category: 'enterprise',
  },
  'objective': {
    key: 'objective',
    label: 'Objectives',
    icon: Target,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'ENTERPRISE',
    category: 'enterprise',
  },
  
  // === PRODUCT ===
  'business-request': {
    key: 'business-request',
    label: 'Business Request',
    icon: Building2,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'PRODUCT',
    category: 'product',
  },
  
  // === PROGRAM ===
  'epic': {
    key: 'epic',
    label: 'Epics',
    icon: Square,
    color: 'text-workitem-epic',
    bgColor: 'bg-workitem-epic',
    moduleCode: 'PROGRAM',
    category: 'program',
  },
  
  // === PROJECT (TEAM module) ===
  'feature': {
    key: 'feature',
    label: 'Features',
    icon: Gem,
    color: 'text-workitem-feature',
    bgColor: 'bg-workitem-feature',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'story': {
    key: 'story',
    label: 'Stories',
    icon: FileText,
    color: 'text-workitem-story',
    bgColor: 'bg-workitem-story',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'defect': {
    key: 'defect',
    label: 'Defects',
    icon: Bug,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: 'TEAM',
    category: 'project',
  },
  'incident': {
    key: 'incident',
    label: 'Incidents',
    icon: Siren,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: 'TEAM',
    category: 'project',
  },
  
  // === OTHER ===
  'dependency': {
    key: 'dependency',
    label: 'Dependencies',
    icon: GitBranch,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: null,
    category: 'other',
  },
  'risk': {
    key: 'risk',
    label: 'Risks',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: null,
    category: 'other',
  },
};

/**
 * Get work items by category
 */
export function getWorkItemsByCategory(category: WorkItemConfig['category']): WorkItemConfig[] {
  return Object.values(workItemConfig).filter(item => item.category === category);
}

/**
 * Get icon for a work item type
 */
export function getWorkItemIcon(type: WorkItemType): LucideIcon {
  return workItemConfig[type]?.icon || Circle;
}

/**
 * Get color class for a work item type
 */
export function getWorkItemColor(type: WorkItemType): string {
  return workItemConfig[type]?.color || 'text-muted-foreground';
}

/**
 * Get background color class for a work item type
 */
export function getWorkItemBgColor(type: WorkItemType): string {
  return workItemConfig[type]?.bgColor || 'bg-muted';
}
