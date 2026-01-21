// ════════════════════════════════════════════════════════════════════════════
// CATALYST SPACES DESIGN CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// Avatar/Space color options (Catalyst V5 palette)
export const AVATAR_COLORS = [
  '#2563eb', // Primary Blue
  '#0d9488', // Teal
  '#d97706', // Warning Orange
  '#ef4444', // Danger Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Success Green
  '#6366f1', // Indigo
] as const;

// Alias for space colors
export const SPACE_COLORS = AVATAR_COLORS;

// Space type configurations
export const SPACE_TYPE_CONFIG = {
  kanban: {
    label: 'Kanban',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    icon: 'LayoutGrid',
    description: 'Visualize work on a board with columns',
  },
  business: {
    label: 'Business',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: 'FileText',
    description: 'Task management for business teams',
  },
  service: {
    label: 'Service',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: 'Headphones',
    description: 'Service desk and support requests',
  },
} as const;

// Member role configurations
export const MEMBER_ROLE_CONFIG = {
  administrator: {
    label: 'Administrator',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  member: {
    label: 'Member',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-muted text-muted-foreground',
  },
} as const;

// Version status configurations
export const VERSION_STATUS_CONFIG = {
  unreleased: {
    label: 'Unreleased',
    dotColor: 'bg-blue-500',
  },
  released: {
    label: 'Released',
    dotColor: 'bg-green-500',
  },
  archived: {
    label: 'Archived',
    dotColor: 'bg-muted-foreground',
  },
} as const;

// Space navigation items
export const SPACE_NAV_SECTIONS = [
  {
    title: 'Planning',
    items: [
      { key: 'summary', label: 'Summary', icon: 'LayoutDashboard', href: '' },
      { key: 'board', label: 'Board', icon: 'LayoutGrid', href: '/board' },
      { key: 'backlog', label: 'Backlog', icon: 'List', href: '/backlog' },
      { key: 'timeline', label: 'Timeline', icon: 'GanttChart', href: '/timeline' },
      { key: 'list', label: 'List', icon: 'FileText', href: '/list' },
    ],
  },
  {
    title: 'Development',
    items: [
      { key: 'code', label: 'Code', icon: 'Code', href: '/code' },
      { key: 'releases', label: 'Releases', icon: 'Package', href: '/releases' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'reports', label: 'Reports', icon: 'BarChart3', href: '/reports' },
      { key: 'automation', label: 'Automation', icon: 'Zap', href: '/automation' },
    ],
  },
] as const;

// Access level configurations
export const ACCESS_CONFIG = {
  private: {
    label: 'Private',
    description: 'Only members can access',
    icon: 'Lock',
  },
  team: {
    label: 'Team',
    description: 'Team members can access',
    icon: 'Users',
  },
  organization: {
    label: 'Organization',
    description: 'Everyone in the organization can access',
    icon: 'Building',
  },
} as const;

// Version statuses for dropdowns
export const VERSION_STATUSES = [
  { value: 'unreleased', label: 'Unreleased' },
  { value: 'released', label: 'Released' },
  { value: 'archived', label: 'Archived' },
] as const;

// Member roles for dropdowns
export const MEMBER_ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
] as const;
