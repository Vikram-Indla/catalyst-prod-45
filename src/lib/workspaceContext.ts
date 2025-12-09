/**
 * Workspace Context Configuration
 * Single source of truth for context-aware navigation
 */

export type WorkspaceType = 'home' | 'enterprise' | 'product' | 'program' | 'project';

export interface WorkspaceContext {
  type: WorkspaceType;
  selectedProgramId: string | null;
  selectedProjectId: string | null;
  selectedProductId: string | null;
  programName?: string;
  projectName?: string;
  productName?: string;
}

/**
 * Derive workspace context from route and selections
 */
export function deriveWorkspaceContext(
  pathname: string,
  selectedProgramId: string | null,
  selectedProjectId: string | null,
  selectedProductId: string | null
): WorkspaceType {
  // Check route patterns first (explicit context)
  if (pathname === '/' || pathname === '/home') {
    return 'home';
  }
  
  if (pathname.startsWith('/enterprise') || pathname.startsWith('/strategy')) {
    return 'enterprise';
  }
  
  if (pathname.startsWith('/product') || pathname.startsWith('/industry') || pathname.startsWith('/mining')) {
    return 'product';
  }
  
  if (pathname.startsWith('/programs/') || pathname.startsWith('/program/')) {
    return 'program';
  }
  
  if (pathname.startsWith('/projects/') || pathname.startsWith('/project/')) {
    return 'project';
  }
  
  // Check selected context from navigation (implicit context)
  if (selectedProjectId) {
    return 'project';
  }
  
  if (selectedProgramId) {
    return 'program';
  }
  
  if (selectedProductId) {
    return 'product';
  }
  
  // Default to enterprise for generic routes
  return 'enterprise';
}

/**
 * Get the active nav item based on workspace context
 */
export function getActiveNavItem(workspaceType: WorkspaceType): string {
  switch (workspaceType) {
    case 'home':
      return 'Home';
    case 'enterprise':
      return 'Enterprise';
    case 'product':
      return 'Product';
    case 'program':
      return 'Program';
    case 'project':
      return 'Project';
    default:
      return '';
  }
}

/**
 * Navigation configuration by workspace type
 */
export interface SidebarMenuItem {
  id: string;
  label: string;
  path: string;
  icon: string; // Icon name from lucide
}

// Project context sidebar menu
export const projectSidebarItems: SidebarMenuItem[] = [
  { id: 'work-tree', label: 'Work tree', path: '/work-tree', icon: 'Share2' },
  { id: 'dependencies', label: 'Dependencies', path: '/dependencies', icon: 'GitBranch' },
  { id: 'forecast', label: 'Forecast', path: '/forecast', icon: 'TrendingUp' },
  { id: 'capacity', label: 'Capacity', path: '/capacity', icon: 'Users' },
  { id: 'quarters', label: 'Quarters', path: '/quarters', icon: 'Calendar' },
  { id: 'reports', label: 'Reports', path: '/reports-discovery', icon: 'FileText' },
];

// Program context sidebar menu
export const programSidebarItems: SidebarMenuItem[] = [
  { id: 'program-room', label: 'Program Room', path: '/program-room', icon: 'LayoutDashboard' },
  { id: 'work-tree', label: 'Work tree', path: '/work-tree', icon: 'Share2' },
  { id: 'dependencies', label: 'Dependencies', path: '/dependencies', icon: 'GitBranch' },
  { id: 'roadmaps', label: 'Roadmaps', path: '/roadmaps', icon: 'Map' },
  { id: 'objectives-tree', label: 'Objectives Tree', path: '/program/okr-hub', icon: 'Target' },
  { id: 'forecast', label: 'Forecast', path: '/forecast', icon: 'TrendingUp' },
  { id: 'capacity', label: 'Capacity', path: '/capacity', icon: 'Users' },
  { id: 'quarters', label: 'Quarters', path: '/quarters', icon: 'Calendar' },
  { id: 'reports', label: 'Reports', path: '/reports-discovery', icon: 'FileText' },
];

/**
 * Items dropdown configuration by workspace type
 */
export interface ItemConfig {
  label: string;
  icon: string;
  color: string;
  path: string;
}

// Project Items (no Epics, no Program Incidents)
export const projectItems: ItemConfig[] = [
  { label: 'Features', icon: 'Box', color: 'text-workitem-feature', path: '/features' },
  { label: 'Stories', icon: 'FileText', color: 'text-workitem-story', path: '/stories' },
  { label: 'Defects', icon: 'Bug', color: 'text-workitem-defect', path: '/items/defects' },
  { label: 'Incidents', icon: 'AlertOctagon', color: 'text-destructive', path: '/release/incidents' },
  { label: 'Risks', icon: 'AlertTriangle', color: 'text-destructive', path: '/enterprise/risks' },
  { label: 'Dependencies', icon: 'GitBranch', color: 'text-warning', path: '/dependencies' },
  { label: 'Quarters', icon: 'Calendar', color: 'text-info', path: '/quarters' },
];

// Program Items (Epics, Risks, Dependencies only)
export const programItems: ItemConfig[] = [
  { label: 'Epics', icon: 'Square', color: 'text-workitem-epic', path: '/items/epics' },
  { label: 'Risks', icon: 'AlertTriangle', color: 'text-destructive', path: '/enterprise/risks' },
  { label: 'Dependencies', icon: 'GitBranch', color: 'text-warning', path: '/dependencies' },
];
