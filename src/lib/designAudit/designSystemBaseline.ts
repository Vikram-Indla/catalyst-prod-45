/**
 * Design System Baseline Definition
 * Current locked design tokens that serve as the source of truth
 */

export interface DesignToken {
  name: string;
  cssVar: string;
  value: string;
  category: TokenCategory;
  description?: string;
}

export interface TokenCategory {
  id: string;
  name: string;
  icon: string;
}

export interface ComponentSpec {
  name: string;
  file: string;
  specs: ComponentSpecItem[];
}

export interface ComponentSpecItem {
  property: string;
  expected: string;
  description?: string;
}

export interface DesignGap {
  id: string;
  route: string;
  component: string;
  selector: string;
  property: string;
  current: string;
  expected: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  category: 'color' | 'spacing' | 'typography' | 'layout' | 'component' | 'responsive';
  file?: string;
  autoFixable: boolean;
  selected?: boolean;
}

// Token Categories
export const tokenCategories: TokenCategory[] = [
  { id: 'brand', name: 'Brand Colors', icon: 'Palette' },
  { id: 'text', name: 'Text Colors', icon: 'Type' },
  { id: 'surface', name: 'Surfaces', icon: 'Layers' },
  { id: 'spacing', name: 'Spacing', icon: 'Ruler' },
  { id: 'layout', name: 'Layout', icon: 'Layout' },
  { id: 'typography', name: 'Typography', icon: 'Type' },
  { id: 'status', name: 'Status Colors', icon: 'Tag' },
  { id: 'elevation', name: 'Elevation', icon: 'Square' },
  { id: 'palette', name: 'Chart Palette', icon: 'BarChart3' },
];

// Design System Baseline Tokens
export const baselineTokens: DesignToken[] = [
  // Brand Colors
  { name: 'Brand Dark', cssVar: '--brand-dark', value: '#1A1A1A', category: tokenCategories[0] },
  { name: 'Brand Gold', cssVar: '--brand-gold', value: '#C69C6D', category: tokenCategories[0] },
  { name: 'Brand Gold Hover', cssVar: '--brand-gold-hover', value: '#B8905F', category: tokenCategories[0] },
  { name: 'Brand Gold Pale', cssVar: '--brand-gold-pale', value: 'rgba(198,156,109,0.08)', category: tokenCategories[0] },
  
  // Text Colors
  { name: 'Text Primary', cssVar: '--text-primary', value: '#111827', category: tokenCategories[1] },
  { name: 'Text Secondary', cssVar: '--text-secondary', value: '#4B5563', category: tokenCategories[1] },
  { name: 'Text Tertiary', cssVar: '--text-tertiary', value: '#6B7280', category: tokenCategories[1] },
  { name: 'Text Muted', cssVar: '--text-muted', value: '#9CA3AF', category: tokenCategories[1] },
  { name: 'Text Inverse', cssVar: '--text-inverse', value: '#FFFFFF', category: tokenCategories[1] },
  
  // Surfaces
  { name: 'Background', cssVar: '--background', value: '#FFFFFF', category: tokenCategories[2] },
  { name: 'Card', cssVar: '--card', value: '#FFFFFF', category: tokenCategories[2] },
  { name: 'Secondary', cssVar: '--secondary', value: '#F3F4F6', category: tokenCategories[2] },
  { name: 'Muted', cssVar: '--muted', value: '#FFFFFF', category: tokenCategories[2] },
  { name: 'Border', cssVar: '--border', value: '#E5E7EB', category: tokenCategories[2] },
  
  // Spacing
  { name: 'Spacing XS', cssVar: '--s1', value: '4px', category: tokenCategories[3] },
  { name: 'Spacing SM', cssVar: '--s2', value: '8px', category: tokenCategories[3] },
  { name: 'Spacing MD', cssVar: '--s3', value: '12px', category: tokenCategories[3] },
  { name: 'Spacing LG', cssVar: '--s4', value: '16px', category: tokenCategories[3] },
  { name: 'Spacing XL', cssVar: '--s6', value: '24px', category: tokenCategories[3] },
  { name: 'Spacing 2XL', cssVar: '--s7', value: '32px', category: tokenCategories[3] },
  
  // Layout
  { name: 'Header Height', cssVar: '--topnav-h', value: '56px', category: tokenCategories[4] },
  { name: 'Page Header', cssVar: '--pagehdr-h', value: '56px', category: tokenCategories[4] },
  { name: 'Sidebar Width', cssVar: '--sidebar-w', value: '280px', category: tokenCategories[4] },
  { name: 'Toolbar Height', cssVar: '--toolbar-h', value: '48px', category: tokenCategories[4] },
  { name: 'Grid Row', cssVar: '--grid-row', value: '32px', category: tokenCategories[4] },
  { name: 'Grid Header', cssVar: '--grid-hdr', value: '40px', category: tokenCategories[4] },
  
  // Typography
  { name: 'Font Size XS', cssVar: '--font-size-xs', value: '11px', category: tokenCategories[5] },
  { name: 'Font Size SM', cssVar: '--font-size-sm', value: '12px', category: tokenCategories[5] },
  { name: 'Font Size MD', cssVar: '--font-size-md', value: '14px', category: tokenCategories[5] },
  { name: 'Font Size LG', cssVar: '--font-size-lg', value: '16px', category: tokenCategories[5] },
  { name: 'Font Size XL', cssVar: '--font-size-xl', value: '18px', category: tokenCategories[5] },
  
  // Status Colors
  { name: 'Success', cssVar: '--success', value: '#36B37E', category: tokenCategories[6] },
  { name: 'Warning', cssVar: '--warning', value: '#FFAB00', category: tokenCategories[6] },
  { name: 'Destructive', cssVar: '--destructive', value: '#DE350B', category: tokenCategories[6] },
  { name: 'Info', cssVar: '--info', value: '#0065FF', category: tokenCategories[6] },
  
  // Elevation
  { name: 'Shadow SM', cssVar: '--shadow-sm', value: '0 1px 2px rgba(0,0,0,0.05)', category: tokenCategories[7] },
  { name: 'Shadow MD', cssVar: '--shadow-md', value: '0 4px 6px -1px rgba(0,0,0,0.1)', category: tokenCategories[7] },
  { name: 'Shadow LG', cssVar: '--shadow-lg', value: '0 10px 15px -3px rgba(0,0,0,0.1)', category: tokenCategories[7] },
  { name: 'Shadow Panel', cssVar: '--shadow-panel', value: '0 8px 24px rgba(0,0,0,0.12)', category: tokenCategories[7] },
  
  // Chart Palette (Golden Hour)
  { name: 'Expert (Olive)', cssVar: '--palette-expert', value: '#5c7c5c', category: tokenCategories[8] },
  { name: 'Advanced (Bronze)', cssVar: '--palette-advanced', value: '#8b7355', category: tokenCategories[8] },
  { name: 'Intermediate (Gold)', cssVar: '--palette-intermediate', value: '#c69c6d', category: tokenCategories[8] },
  { name: 'Beginner (Champagne)', cssVar: '--palette-beginner', value: '#d4b896', category: tokenCategories[8] },
  { name: 'None (Grey)', cssVar: '--palette-none', value: '#c8ccd0', category: tokenCategories[8] },
];

// Component Specifications
export const componentSpecs: ComponentSpec[] = [
  {
    name: 'Header',
    file: 'CatalystHeader.tsx',
    specs: [
      { property: 'height', expected: '56px' },
      { property: 'action-gap', expected: '12px' },
      { property: 'nav-item-gap', expected: '8px' },
    ],
  },
  {
    name: 'SideNav',
    file: 'AdminSidebarV2.tsx',
    specs: [
      { property: 'item-height', expected: '32px' },
      { property: 'section-gap', expected: '8px' },
      { property: 'collapsed-width', expected: '56px' },
      { property: 'expanded-width', expected: '280px' },
      { property: 'selected-indicator', expected: '3px left bar' },
    ],
  },
  {
    name: 'Button',
    file: 'button.tsx',
    specs: [
      { property: 'default-height', expected: '36px' },
      { property: 'sm-height', expected: '32px' },
      { property: 'lg-height', expected: '40px' },
      { property: 'icon-size', expected: '32px' },
      { property: 'focus-ring', expected: '2px brand-gold' },
    ],
  },
  {
    name: 'Modal',
    file: 'dialog.tsx',
    specs: [
      { property: 'sm-width', expected: '384px' },
      { property: 'md-width', expected: '512px' },
      { property: 'lg-width', expected: '640px' },
      { property: 'padding', expected: '20px' },
      { property: 'border-radius', expected: '12px' },
    ],
  },
  {
    name: 'Drawer',
    file: 'sheet.tsx',
    specs: [
      { property: 'narrow-width', expected: '360px' },
      { property: 'medium-width', expected: '480px' },
      { property: 'wide-width', expected: '640px' },
    ],
  },
  {
    name: 'Table',
    file: 'table.tsx',
    specs: [
      { property: 'row-height', expected: '40px' },
      { property: 'header-height', expected: '40px' },
      { property: 'cell-padding', expected: '12px 16px' },
    ],
  },
  {
    name: 'Toast',
    file: 'sonner.tsx',
    specs: [
      { property: 'width', expected: '360-420px' },
      { property: 'offset', expected: '16px' },
      { property: 'duration', expected: '5000ms' },
    ],
  },
];

// Mock detected gaps (in real scenario, these would be scanned from DOM)
export const detectedGaps: DesignGap[] = [
  {
    id: 'gap-1',
    route: '/industry',
    component: 'Table',
    selector: 'tr',
    property: 'height',
    current: '48px',
    expected: '40px',
    severity: 'P2',
    category: 'spacing',
    file: 'IndustryTable.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-2',
    route: '/admin/users',
    component: 'Button',
    selector: 'button.btn-default',
    property: 'height',
    current: '40px',
    expected: '36px',
    severity: 'P2',
    category: 'component',
    file: 'button.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-3',
    route: '/items/epics',
    component: 'Button',
    selector: 'button.btn-sm',
    property: 'height',
    current: '36px',
    expected: '32px',
    severity: 'P2',
    category: 'component',
    file: 'button.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-4',
    route: '/home',
    component: 'Toast',
    selector: '.toast',
    property: 'color (success)',
    current: 'text-emerald-500',
    expected: 'hsl(var(--success))',
    severity: 'P2',
    category: 'color',
    file: 'sonner.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-5',
    route: '/home',
    component: 'Toast',
    selector: '.toast',
    property: 'color (error)',
    current: 'text-red-500',
    expected: 'hsl(var(--destructive))',
    severity: 'P2',
    category: 'color',
    file: 'sonner.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-6',
    route: 'global',
    component: 'Button',
    selector: 'button:active',
    property: 'active state',
    current: 'Not defined',
    expected: 'scale-[0.98]',
    severity: 'P2',
    category: 'component',
    file: 'button.tsx',
    autoFixable: true,
  },
  {
    id: 'gap-7',
    route: '/industry',
    component: 'Table',
    selector: 'table',
    property: 'responsive',
    current: 'No scroll container',
    expected: 'Horizontal scroll on mobile',
    severity: 'P1',
    category: 'responsive',
    file: 'IndustryTable.tsx',
    autoFixable: false,
  },
  {
    id: 'gap-8',
    route: '/admin/design-audit',
    component: 'Card',
    selector: '.card',
    property: 'border-radius',
    current: '6px',
    expected: '12px',
    severity: 'P3',
    category: 'component',
    file: 'card.tsx',
    autoFixable: true,
  },
];

// Responsiveness gaps summary
export interface ResponsivenessGap {
  route: string;
  viewport: string;
  score: number;
  issues: number;
  p0: number;
  p1: number;
  topIssue: string;
}

export const responsivenessGaps: ResponsivenessGap[] = [
  { route: '/industry', viewport: 'Mobile S', score: 62, issues: 5, p0: 0, p1: 2, topIssue: 'Table horizontal overflow' },
  { route: '/items/epics', viewport: 'Mobile M', score: 68, issues: 4, p0: 0, p1: 1, topIssue: 'Drawer exceeds viewport' },
  { route: '/admin/users', viewport: 'Tablet Portrait', score: 75, issues: 3, p0: 0, p1: 1, topIssue: 'Header actions overflow' },
  { route: '/roadmaps', viewport: 'Mobile L', score: 58, issues: 6, p0: 1, p1: 2, topIssue: 'Timeline not scrollable' },
  { route: '/strategy-room', viewport: 'Mobile S', score: 55, issues: 7, p0: 1, p1: 3, topIssue: 'OKR cards clipped' },
];

// Get baseline version string
export function getBaselineVersion(): string {
  return '1.0.0 (Catalyst L9 Enterprise Gold)';
}

// Get baseline date
export function getBaselineDate(): string {
  return '2025-01-15';
}
