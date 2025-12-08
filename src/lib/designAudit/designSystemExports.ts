/**
 * Design System Export Utilities
 * Generate downloadable documentation files
 */

import { 
  baselineTokens, 
  componentSpecs, 
  tokenCategories,
  getBaselineVersion,
  getBaselineDate,
  detectedGaps,
  responsivenessGaps
} from './designSystemBaseline';

// Page Layout Specifications
export const pageLayouts = [
  {
    name: 'Industry / Demand Intake',
    route: '/industry',
    description: 'Table-based view with filter bar, bulk actions, and inline editing',
    layout: {
      header: '72px page header with title + actions',
      sidebar: '280px collapsible left nav',
      main: 'Full-width table with resizable columns',
      toolbar: '48px filter/action bar above table',
    },
    components: ['PageHeader', 'FilterBar', 'DataTable', 'BusinessRequestDrawer', 'BulkActionsPanel'],
  },
  {
    name: 'Epic Backlog',
    route: '/items/epics',
    description: 'Kanban or list view of epics with drag-drop support',
    layout: {
      header: '72px page header',
      sidebar: '280px context panel',
      main: 'Kanban columns or table view',
      panel: 'Right drawer (480px) for epic details',
    },
    components: ['EpicBacklog', 'EpicCard', 'EpicDetailsPanel', 'WSJFDialog'],
  },
  {
    name: 'Strategy Room',
    route: '/strategy-room',
    description: 'OKR visualization with heatmap and tree views',
    layout: {
      header: '72px page header',
      sidebar: '280px context panel',
      main: 'OKR Heatmap or Tree visualization',
      panel: 'Objective details drawer',
    },
    components: ['OKRHeatmap', 'OKRTree', 'StrategyPyramid', 'ObjectiveDetailsPanel'],
  },
  {
    name: 'Roadmaps',
    route: '/roadmaps',
    description: 'Timeline-based roadmap visualization',
    layout: {
      header: '72px page header with view toggles',
      sidebar: '280px context panel',
      main: 'Horizontal timeline with swimlanes',
      controls: 'Zoom and date range controls',
    },
    components: ['RoadmapTimeline', 'RoadmapCard', 'TimelineZoom', 'ProgramSelector'],
  },
  {
    name: 'Admin Panel',
    route: '/admin',
    description: 'Administration hub with section navigation',
    layout: {
      header: '72px page header',
      sidebar: '264px admin nav with buckets',
      main: 'Section-specific content area',
    },
    components: ['AdminSidebarV2', 'AdminOverview', 'UsersTable', 'RolesManager'],
  },
  {
    name: 'Skills Inventory',
    route: '/enterprise/skills-inventory',
    description: 'Team skills matrix with gap analysis',
    layout: {
      header: '72px page header with view tabs',
      sidebar: '280px enterprise context panel',
      main: 'Skills matrix or table view',
      filters: 'Advanced filter dialog',
    },
    components: ['SkillsMatrix', 'SkillsTable', 'GapAnalysis', 'TeamMemberCard'],
  },
];

// Modal/Dialog Specifications
export const modalSpecs = [
  {
    name: 'Standard Dialog',
    file: 'dialog.tsx',
    sizes: { sm: '384px', md: '512px', lg: '640px', xl: '800px' },
    anatomy: {
      header: 'Title (18px font-semibold) + optional description + close button',
      body: 'Scrollable content area with 20px padding',
      footer: 'Action buttons aligned right (Cancel + Primary)',
    },
    accessibility: ['Focus trap', 'ESC to close', 'aria-modal="true"'],
  },
  {
    name: 'Alert Dialog',
    file: 'alert-dialog.tsx',
    sizes: { default: '400px' },
    anatomy: {
      header: 'Title + description (destructive styling for danger)',
      footer: 'Cancel + Confirm (destructive variant)',
    },
    accessibility: ['Focus trap', 'Blocks backdrop click'],
  },
  {
    name: 'Sheet/Drawer',
    file: 'sheet.tsx',
    sizes: { narrow: '360px', medium: '480px', wide: '640px', full: '100vw' },
    anatomy: {
      header: 'Title + status badge + close button',
      tabs: 'Tab navigation below header',
      body: 'Scrollable content with sections',
    },
    variants: ['side:right', 'side:left', 'side:bottom'],
  },
  {
    name: 'Create Epic Modal',
    file: 'CreateEpicDialog.tsx',
    sizes: { default: '640px' },
    fields: ['Name', 'Description', 'Estimation System', 'Owner', 'Program', 'Target Start/End'],
  },
  {
    name: 'WSJF Prioritization Dialog',
    file: 'WSJFPrioritizationDialog.tsx',
    sizes: { default: '600px' },
    fields: ['Business Value', 'Time Criticality', 'Risk Reduction', 'Job Size'],
  },
  {
    name: 'Filter Dialog',
    file: 'FilterDialog.tsx',
    sizes: { default: '480px' },
    anatomy: {
      body: 'Filter groups with Select/Checkbox inputs',
      footer: 'Clear All + Apply Filters',
    },
  },
  {
    name: 'Bulk Operations Modal',
    file: 'BulkOperationsModal.tsx',
    sizes: { default: '560px' },
    anatomy: {
      steps: 'Select operation → Configure → Confirm → Results',
      operations: ['Bulk Edit', 'Bulk Transition', 'Bulk Move', 'Bulk Delete'],
    },
  },
  {
    name: 'Import Data Wizard',
    file: 'ImportDataPage.tsx',
    sizes: { default: '800px' },
    steps: ['Upload', 'Settings', 'Field Mapping', 'Value Mapping', 'Validation', 'Confirm'],
  },
];

// Generate Markdown for Design System
export function generateDesignSystemMarkdown(): string {
  const version = getBaselineVersion();
  const date = getBaselineDate();
  
  let md = `# Catalyst Design System Baseline

**Version:** ${version}
**Date:** ${date}

---

## 1. Design Tokens

`;

  // Group tokens by category
  const tokensByCategory = tokenCategories.map(cat => ({
    category: cat,
    tokens: baselineTokens.filter(t => t.category.id === cat.id)
  })).filter(g => g.tokens.length > 0);

  for (const group of tokensByCategory) {
    md += `### ${group.category.name}\n\n`;
    md += `| Token Name | CSS Variable | Value |\n`;
    md += `|------------|--------------|-------|\n`;
    for (const token of group.tokens) {
      md += `| ${token.name} | \`${token.cssVar}\` | \`${token.value}\` |\n`;
    }
    md += `\n`;
  }

  md += `---

## 2. Component Specifications

`;

  for (const comp of componentSpecs) {
    md += `### ${comp.name}\n`;
    md += `**File:** \`${comp.file}\`\n\n`;
    md += `| Property | Expected Value |\n`;
    md += `|----------|----------------|\n`;
    for (const spec of comp.specs) {
      md += `| ${spec.property} | \`${spec.expected}\` |\n`;
    }
    md += `\n`;
  }

  md += `---

## 3. Page Layouts

`;

  for (const page of pageLayouts) {
    md += `### ${page.name}\n`;
    md += `**Route:** \`${page.route}\`\n\n`;
    md += `${page.description}\n\n`;
    md += `**Layout:**\n`;
    for (const [key, value] of Object.entries(page.layout)) {
      md += `- **${key}:** ${value}\n`;
    }
    md += `\n**Components:** ${page.components.join(', ')}\n\n`;
  }

  md += `---

## 4. Modal & Dialog Specifications

`;

  for (const modal of modalSpecs) {
    md += `### ${modal.name}\n`;
    md += `**File:** \`${modal.file}\`\n\n`;
    md += `**Sizes:** `;
    md += Object.entries(modal.sizes).map(([k, v]) => `${k}: ${v}`).join(', ');
    md += `\n\n`;
    if ('anatomy' in modal && modal.anatomy) {
      md += `**Anatomy:**\n`;
      for (const [key, value] of Object.entries(modal.anatomy)) {
        md += `- **${key}:** ${value}\n`;
      }
    }
    if ('accessibility' in modal && modal.accessibility) {
      md += `\n**Accessibility:** ${modal.accessibility.join(', ')}\n`;
    }
    md += `\n`;
  }

  md += `---

## 5. Golden Hour Chart Palette

| Level | Name | Color | Hex |
|-------|------|-------|-----|
| 5 | Expert | Olive Green | #5c7c5c |
| 4 | Advanced | Bronze | #8b7355 |
| 3 | Intermediate | Gold | #c69c6d |
| 2 | Beginner | Champagne | #d4b896 |
| 1 | None | Cool Grey | #c8ccd0 |

**Usage:** Charts, graphs, reports, heatmaps, and all data visualizations.

---

## 6. Status Colors

| Status | CSS Variable | Hex | Usage |
|--------|--------------|-----|-------|
| Success | \`--success\` | #36B37E | Completed, passed, on-track |
| Warning | \`--warning\` | #FFAB00 | At-risk, needs attention |
| Error | \`--destructive\` | #DE350B | Failed, critical, off-track |
| Info | \`--info\` | #0065FF | Informational, neutral |

---

## 7. Typography Scale

| Size | CSS Variable | Value | Usage |
|------|--------------|-------|-------|
| XS | \`--font-size-xs\` | 11px | Metadata, hints |
| SM | \`--font-size-sm\` | 12px | Labels, captions |
| MD | \`--font-size-md\` | 14px | Body text (default) |
| LG | \`--font-size-lg\` | 16px | Subheadings |
| XL | \`--font-size-xl\` | 18px | Page titles |

---

*Generated by Catalyst Design Audit System*
`;

  return md;
}

// Generate Page Layouts JSON
export function generatePageLayoutsJSON(): string {
  return JSON.stringify({
    version: getBaselineVersion(),
    generatedAt: new Date().toISOString(),
    layouts: pageLayouts,
  }, null, 2);
}

// Generate Modal Specs JSON
export function generateModalSpecsJSON(): string {
  return JSON.stringify({
    version: getBaselineVersion(),
    generatedAt: new Date().toISOString(),
    modals: modalSpecs,
  }, null, 2);
}

// Generate Full Design System JSON
export function generateFullDesignSystemJSON(): string {
  return JSON.stringify({
    version: getBaselineVersion(),
    date: getBaselineDate(),
    generatedAt: new Date().toISOString(),
    tokens: baselineTokens,
    categories: tokenCategories,
    components: componentSpecs,
    pageLayouts,
    modalSpecs,
    detectedGaps,
    responsivenessGaps,
  }, null, 2);
}

// Download helper
export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
