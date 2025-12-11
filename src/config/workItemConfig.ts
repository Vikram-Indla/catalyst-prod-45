import { 
  Circle,
  Building2,
  Square,
  Gem,
  GitBranch,
  Target,
  AlertTriangle,
  Calendar,
  Package,
  Siren,
  Users,
  FolderKanban,
  FileText,
  type LucideIcon
} from 'lucide-react';

export type WorkItemType = 
  | 'theme'
  | 'business-request'
  | 'epic'
  | 'feature'
  | 'story'
  | 'program'
  | 'project'
  | 'objective'
  | 'dependency'
  | 'risk'
  | 'sprint'
  | 'program-increment'
  | 'incident';

export interface WorkItemConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  moduleCode: string | null;
  category: 'work-items' | 'planning' | 'other';
}

/**
 * Centralized work item configuration for consistent icons and colors across the app.
 * All components should import from here to ensure consistency.
 */
export const workItemConfig: Record<WorkItemType, WorkItemConfig> = {
  'theme': {
    key: 'theme',
    label: 'Themes',
    icon: Circle,
    color: 'text-workitem-theme',
    bgColor: 'bg-workitem-theme',
    moduleCode: 'PORTFOLIO',
    category: 'work-items',
  },
  'business-request': {
    key: 'business-request',
    label: 'Business Request',
    icon: Building2,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'PRODUCT',
    category: 'work-items',
  },
  'epic': {
    key: 'epic',
    label: 'Epics',
    icon: Square,
    color: 'text-workitem-epic',
    bgColor: 'bg-workitem-epic',
    moduleCode: 'PORTFOLIO',
    category: 'work-items',
  },
  'feature': {
    key: 'feature',
    label: 'Features',
    icon: Gem,
    color: 'text-workitem-feature',
    bgColor: 'bg-workitem-feature',
    moduleCode: 'PROGRAM',
    category: 'work-items',
  },
  'story': {
    key: 'story',
    label: 'Stories',
    icon: FileText,
    color: 'text-workitem-story',
    bgColor: 'bg-workitem-story',
    moduleCode: 'TEAMS',
    category: 'work-items',
  },
  'program': {
    key: 'program',
    label: 'Programs',
    icon: FolderKanban,
    color: 'text-workitem-feature',
    bgColor: 'bg-workitem-feature',
    moduleCode: 'PROGRAM',
    category: 'planning',
  },
  'project': {
    key: 'project',
    label: 'Projects',
    icon: FolderKanban,
    color: 'text-info',
    bgColor: 'bg-info',
    moduleCode: 'PROGRAM',
    category: 'planning',
  },
  'objective': {
    key: 'objective',
    label: 'Objectives',
    icon: Target,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'ENTERPRISE',
    category: 'other',
  },
  'dependency': {
    key: 'dependency',
    label: 'Dependencies',
    icon: GitBranch,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'PROGRAM',
    category: 'other',
  },
  'risk': {
    key: 'risk',
    label: 'Risks',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    moduleCode: 'ENTERPRISE',
    category: 'other',
  },
  'sprint': {
    key: 'sprint',
    label: 'Sprints',
    icon: Calendar,
    color: 'text-brand-gold',
    bgColor: 'bg-brand-gold',
    moduleCode: 'PROGRAM',
    category: 'other',
  },
  'program-increment': {
    key: 'program-increment',
    label: 'Program Increments',
    icon: Package,
    color: 'text-workitem-theme',
    bgColor: 'bg-workitem-theme',
    moduleCode: 'PROGRAM',
    category: 'other',
  },
  'incident': {
    key: 'incident',
    label: 'Incidents',
    icon: Siren,
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
