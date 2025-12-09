/**
 * Responsive Audit Configuration
 * Defines viewports, routes, selectors, and thresholds for responsive testing
 */

// All viewports to test
export const responsiveViewports = [
  { id: 'mobile-s', width: 360, height: 640, label: 'Mobile S', type: 'mobile' },
  { id: 'mobile-m', width: 390, height: 844, label: 'Mobile M', type: 'mobile' },
  { id: 'mobile-l', width: 430, height: 932, label: 'Mobile L', type: 'mobile' },
  { id: 'tablet-portrait', width: 768, height: 1024, label: 'Tablet Portrait', type: 'tablet' },
  { id: 'tablet-landscape', width: 1024, height: 768, label: 'Tablet Landscape', type: 'tablet' },
  { id: 'laptop', width: 1280, height: 800, label: 'Laptop', type: 'desktop' },
  { id: 'desktop', width: 1440, height: 900, label: 'Desktop', type: 'desktop' },
  { id: 'wide-desktop', width: 1920, height: 1080, label: 'Wide Desktop', type: 'desktop' },
] as const;

export type ViewportId = typeof responsiveViewports[number]['id'];
export type ViewportType = typeof responsiveViewports[number]['type'];

// Routes to audit - comprehensive list from router
export const responsiveRoutes = [
  // Core pages
  { path: '/home', name: 'Home Dashboard', category: 'dashboard', priority: 'high' },
  { path: '/search', name: 'Search', category: 'utility', priority: 'high' },
  
  // Admin pages
  { path: '/admin/overview', name: 'Admin Overview', category: 'admin', priority: 'high' },
  { path: '/admin/activity', name: 'Audit Activity', category: 'admin', priority: 'medium' },
  { path: '/admin/users', name: 'Users Management', category: 'admin', priority: 'high' },
  { path: '/admin/roles-permissions', name: 'Roles & Permissions', category: 'admin', priority: 'medium' },
  { path: '/admin/configuration', name: 'Configuration', category: 'admin', priority: 'medium' },
  { path: '/admin/reference-data', name: 'Reference Data', category: 'admin', priority: 'medium' },
  { path: '/admin/import-data', name: 'Import Data', category: 'admin', priority: 'high' },
  
  // Industry/Demand
  { path: '/industry', name: 'Industry (Demand Intake)', category: 'table', priority: 'critical' },
  { path: '/industry/roadmaps', name: 'Executive Roadmaps', category: 'visualization', priority: 'high' },
  
  // Enterprise
  { path: '/enterprise/strategy-room', name: 'Strategy Room', category: 'dashboard', priority: 'critical' },
  { path: '/enterprise/okr-heatmap', name: 'OKR Heatmap', category: 'visualization', priority: 'high' },
  { path: '/enterprise/okr-tree', name: 'OKR Tree', category: 'visualization', priority: 'high' },
  { path: '/enterprise/work-tree', name: 'Work Tree', category: 'visualization', priority: 'high' },
  { path: '/enterprise/backlog', name: 'Strategic Backlog', category: 'table', priority: 'high' },
  { path: '/enterprise/roadmaps', name: 'Enterprise Roadmaps', category: 'visualization', priority: 'high' },
  { path: '/enterprise/kanban-boards', name: 'Kanban Boards', category: 'board', priority: 'high' },
  { path: '/enterprise/risks', name: 'Enterprise Risks', category: 'table', priority: 'medium' },
  { path: '/enterprise/dependencies', name: 'Dependencies', category: 'table', priority: 'medium' },
  
  // Work Items
  { path: '/epics', name: 'Epics Backlog', category: 'table', priority: 'critical' },
  { path: '/features', name: 'Features', category: 'table', priority: 'high' },
  { path: '/stories', name: 'Stories', category: 'table', priority: 'high' },
  { path: '/risks', name: 'Risks Grid', category: 'table', priority: 'medium' },
  { path: '/dependencies', name: 'Dependencies Board', category: 'board', priority: 'medium' },
  
  // Program
  { path: '/program-board', name: 'Program Board', category: 'board', priority: 'critical' },
  
  // Release
  { path: '/releases', name: 'Releases', category: 'table', priority: 'high' },
  { path: '/releases/incidents', name: 'Incidents', category: 'table', priority: 'high' },
  
  // Teams
  { path: '/skills-inventory', name: 'Skills Inventory', category: 'table', priority: 'medium' },
];

export type RoutePriority = 'critical' | 'high' | 'medium' | 'low';
export type RouteCategory = 'dashboard' | 'admin' | 'table' | 'board' | 'visualization' | 'form' | 'utility';

// Element selectors for responsive checks
export const responsiveSelectors = {
  // Layout elements
  sideNav: '[data-ui="SideNav"], nav, aside, [class*="sidebar"]',
  header: '[data-ui="Header"], header, [class*="header"]',
  mainContent: 'main, [role="main"], [class*="main-content"]',
  pageContainer: '[class*="container"], [class*="page-"]',
  
  // Interactive elements (touch targets)
  buttons: 'button, [role="button"], .btn',
  links: 'a, [role="link"]',
  inputs: 'input, textarea, select, [role="textbox"], [role="combobox"]',
  
  // Content elements
  tables: 'table, [role="table"], [role="grid"], [class*="table"]',
  tableHeaders: 'th, [role="columnheader"]',
  tableRows: 'tr, [role="row"]',
  tableCells: 'td, [role="cell"], [role="gridcell"]',
  
  // Overlays
  modals: '[role="dialog"], [aria-modal="true"], [class*="modal"]',
  drawers: '[class*="drawer"], [class*="sheet"], [class*="panel"]',
  dropdowns: '[role="menu"], [role="listbox"], [class*="dropdown"]',
  
  // Text elements
  headings: 'h1, h2, h3, h4, h5, h6',
  paragraphs: 'p, [class*="text-"], [class*="description"]',
  labels: 'label, [class*="label"]',
  
  // Data visualization
  charts: 'svg, canvas, [data-ui="Chart"], [class*="chart"]',
  cards: '[class*="card"], [data-ui="Card"]',
  badges: '[class*="badge"], [data-ui="Badge"]',
  
  // Action elements
  toolbars: '[class*="toolbar"], [role="toolbar"]',
  actionGroups: '[class*="actions"], [class*="button-group"]',
};

// Thresholds for responsive checks
export const responsiveThresholds = {
  // Touch target minimum size (44px per WCAG)
  minTouchTarget: 44,
  
  // Minimum readable font sizes
  minFontSizeBody: 14,
  minFontSizeLabel: 11,
  
  // Maximum line lengths
  maxLineWidth: 80, // characters
  
  // Modal/drawer constraints
  modalMaxWidthMobile: 0.95, // 95% of viewport
  drawerMaxWidthMobile: 1.0, // 100% of viewport
  
  // Table constraints
  minColumnWidth: 60,
  
  // Spacing minimums
  minPadding: 8,
  minGap: 4,
  
  // Header/nav heights
  headerHeight: 56,
  navItemHeight: 32,
};

// Severity definitions for responsive issues
export type ResponsiveSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export const severityDefinitions: Record<ResponsiveSeverity, { 
  label: string; 
  description: string;
  color: string;
}> = {
  P0: { 
    label: 'Critical', 
    description: 'Unusable: actions offscreen, modal cut off, unreadable content, cannot navigate',
    color: 'destructive'
  },
  P1: { 
    label: 'Major', 
    description: 'Horizontal overflow, severe overlap, key text truncated, broken layout',
    color: 'warning'
  },
  P2: { 
    label: 'Medium', 
    description: 'Density/tap target issues, minor truncation, mild layout shift',
    color: 'muted'
  },
  P3: { 
    label: 'Minor', 
    description: 'Polish: suboptimal spacing, minor alignment, cosmetic issues',
    color: 'secondary'
  },
};

// Issue categories
export const issueCategories = [
  'overflow',
  'overlap',
  'touch-target',
  'text-overflow',
  'table-layout',
  'modal-drawer',
  'navigation',
  'header',
  'layout-shift',
  'contrast',
  'spacing',
] as const;

export type IssueCategory = typeof issueCategories[number];

// Fix patterns for recommendations
export const fixPatterns: Record<IssueCategory, string[]> = {
  'overflow': [
    'Add overflow-x: hidden to container',
    'Use flex-wrap: wrap with min-width constraints',
    'Apply max-width: 100% to child elements',
    'Use responsive breakpoints (sm:, md:, lg:)',
  ],
  'overlap': [
    'Add proper z-index layering',
    'Use position: sticky with correct offset',
    'Apply negative margins carefully',
    'Use container queries for complex layouts',
  ],
  'touch-target': [
    'Increase button/link padding to achieve 44px min',
    'Use min-h-11 min-w-11 for icon buttons',
    'Add touch-action: manipulation',
    'Increase tap area with ::before pseudo-element',
  ],
  'text-overflow': [
    'Apply text-ellipsis with overflow-hidden',
    'Use line-clamp for multi-line truncation',
    'Add tooltip for truncated content',
    'Use responsive font sizes with clamp()',
  ],
  'table-layout': [
    'Add horizontal scroll container',
    'Implement column hiding with priority',
    'Use card layout for mobile',
    'Apply sticky first column',
  ],
  'modal-drawer': [
    'Set max-height: 90vh with internal scroll',
    'Use full-width on mobile (w-full sm:max-w-md)',
    'Ensure footer actions are always visible',
    'Apply safe-area-inset for notched devices',
  ],
  'navigation': [
    'Collapse to hamburger menu on mobile',
    'Use bottom navigation for mobile apps',
    'Implement overlay panel for mobile nav',
    'Add backdrop-blur for overlay nav',
  ],
  'header': [
    'Move actions to overflow menu on mobile',
    'Truncate page title with tooltip',
    'Use compact header variant on mobile',
    'Stack title and actions vertically if needed',
  ],
  'layout-shift': [
    'Use aspect-ratio for media elements',
    'Set explicit dimensions for images',
    'Use skeleton loaders with correct dimensions',
    'Apply contain: layout for complex components',
  ],
  'contrast': [
    'Use semantic color tokens',
    'Ensure 4.5:1 ratio for body text',
    'Check contrast across all themes',
    'Avoid light text on light backgrounds',
  ],
  'spacing': [
    'Use responsive padding (p-3 sm:p-4 md:p-6)',
    'Apply consistent gap scale',
    'Reduce margins on mobile',
    'Use container width constraints',
  ],
};
