/**
 * Design Audit Configuration
 * Defines routes, element selectors, and audit targets
 */

// Routes to audit - derived from app router
export const auditRoutes = [
  // Core pages
  { path: '/home', name: 'Home Dashboard', category: 'dashboard' },
  { path: '/admin/overview', name: 'Admin Overview', category: 'admin' },
  { path: '/admin/activity', name: 'Audit Activity', category: 'admin' },
  { path: '/admin/users', name: 'Users Management', category: 'admin' },
  { path: '/admin/design-audit', name: 'Design Audit', category: 'admin' },
  { path: '/industry', name: 'Industry/Demand Intake', category: 'table' },
  { path: '/epics', name: 'Epics Backlog', category: 'table' },
  { path: '/features', name: 'Features List', category: 'table' },
  { path: '/risks', name: 'Risks Grid', category: 'table' },
  { path: '/roadmaps', name: 'Roadmaps', category: 'visualization' },
  { path: '/enterprise/strategy-room', name: 'Strategy Room', category: 'dashboard' },
  { path: '/enterprise/okr-heatmap', name: 'OKR Heatmap', category: 'visualization' },
  { path: '/program-board', name: 'Program Board', category: 'board' },
  { path: '/dependencies', name: 'Dependencies', category: 'table' },
  // Capacity & Allocation
  { path: '/capacity-planning', name: 'Capacity Planning', category: 'dashboard' },
  { path: '/enterprise/skills-inventory', name: 'Skills Inventory', category: 'table' },
];

// Viewports for responsive audit
export const auditViewports = {
  desktop: { width: 1440, height: 900, label: 'Desktop' },
  tablet: { width: 1024, height: 768, label: 'Tablet' },
  mobile: { width: 390, height: 844, label: 'Mobile' },
};

// Element selectors for audit
export const auditSelectors = {
  // Navigation
  sideNav: '[data-ui="SideNav"], nav, aside, [class*="sidebar"]',
  navItem: '[data-ui="NavItem"], nav a, nav button, [class*="nav-item"]',
  header: '[data-ui="Header"], header, [class*="header"]',
  pageTitle: '[data-ui="PageTitle"], h1, [class*="page-title"]',
  
  // Interactive
  button: '[data-ui="Button"], button, [role="button"]',
  input: '[data-ui="TextField"], input, textarea, [role="textbox"]',
  select: '[data-ui="Select"], select, [role="listbox"], [role="combobox"]',
  
  // Content
  table: '[data-ui="Table"], table, [role="table"], [role="grid"]',
  card: '[data-ui="Card"], [class*="card"]',
  
  // Overlays
  modal: '[data-ui="Modal"], [role="dialog"], [aria-modal="true"], [class*="modal"]',
  drawer: '[data-ui="Drawer"], [class*="drawer"], [class*="sheet"]',
  popover: '[data-ui="Popover"], [data-ui="Tooltip"], [role="tooltip"]',
  
  // Feedback
  toast: '[data-ui="Toast"], [role="status"], [aria-live], [class*="toast"]',
  banner: '[data-ui="Banner"], [role="alert"], [class*="banner"]',
  
  // Status
  badge: '[data-ui="Badge"], [class*="badge"]',
  tag: '[data-ui="Tag"], [class*="tag"], [class*="chip"]',
  
  // Visualization
  chart: '[data-ui="Chart"], svg, canvas, [data-chart]',
};

// CSS properties to extract
export const cssPropertiesToAudit = {
  typography: [
    'font-family',
    'font-size',
    'line-height',
    'font-weight',
    'letter-spacing',
    'color',
  ],
  spacing: [
    'padding',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'margin',
    'gap',
  ],
  colors: [
    'background-color',
    'color',
    'border-color',
  ],
  borders: [
    'border-width',
    'border-style',
    'border-radius',
  ],
  elevation: [
    'box-shadow',
  ],
  layout: [
    'width',
    'height',
    'min-height',
    'max-width',
  ],
};

// Target values (Atlassian-aligned)
export const auditTargets = {
  // Layout measurements
  headerHeight: '56px',
  sidebarWidthExpanded: '240px',
  sidebarWidthCollapsed: '56px',
  navItemHeight: '32px',
  
  // Button sizes
  buttonHeightSm: '32px',
  buttonHeightDefault: '36px',
  buttonHeightLg: '40px',
  buttonHeightIcon: '32px',
  
  // Modal/Drawer widths
  modalWidthSm: '384px',
  modalWidthMd: '512px',
  modalWidthLg: '640px',
  drawerWidthNarrow: '360px',
  drawerWidthMedium: '480px',
  drawerWidthWide: '640px',
  
  // Typography
  fontSizeXs: '11px',
  fontSizeSm: '12px',
  fontSizeBase: '14px',
  fontSizeLg: '16px',
  
  // Spacing
  spacingXs: '4px',
  spacingSm: '8px',
  spacingMd: '12px',
  spacingLg: '16px',
  spacingXl: '24px',
  
  // Border radius
  radiusSm: '4px',
  radiusMd: '6px',
  radiusLg: '8px',
  
  // Toast
  toastWidth: '360px',
  toastMaxWidth: '420px',
  toastDuration: 5000,
};

// Severity definitions
export type AuditSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export const severityDefinitions: Record<AuditSeverity, { label: string; description: string }> = {
  P0: { label: 'Critical', description: 'Blocks usability or accessibility' },
  P1: { label: 'High', description: 'Major visual inconsistency or UX issue' },
  P2: { label: 'Medium', description: 'Notable deviation from design system' },
  P3: { label: 'Low', description: 'Minor polish or refinement needed' },
};

// Area categories for reporting
export const auditAreas = [
  'SideNav',
  'Header',
  'Modal',
  'Drawer',
  'Toast',
  'Button',
  'Input',
  'Table',
  'Card',
  'Badge',
  'Typography',
  'Spacing',
  'Color',
  'Elevation',
  'Chart',
] as const;

export type AuditArea = typeof auditAreas[number];
