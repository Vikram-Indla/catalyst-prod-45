// =====================================================
// WORKSTREAM COLORS — Enterprise Clean V2
// SINGLE SOURCE OF TRUTH — Use across ALL screens
// Matches spec from TIMELINE-ENTERPRISE-CLEAN.md
// =====================================================

/**
 * QA Audit Spec Reference:
 * - A1: Catalyst = Indigo #6366f1
 * - A2: Data & AI = Purple #8b5cf6
 * - A3: Delivery = Pink #ec4899
 * - A4: MIM = Gray #64748b
 * - A5: Senaei = Teal #14b8a6
 * - A6: Stand-Alone = Gray #64748b
 * - A7: Tahommona = Orange #f97316
 * - A8: Dot size = 8-10px
 */

export interface WorkstreamColorSet {
  primary: string;      // Workstream dot color (8-10px dots)
  light: string;        // Bar fill at 15-20% opacity (-50 shade)
  border: string;       // Bar border (-300 shade)
  hex: string;          // Same as primary for compatibility
  hexLight: string;     // Same as light for compatibility
  hexFill: string;      // Slightly darker fill if needed
}

export const WORKSTREAM_COLORS: Record<string, WorkstreamColorSet> = {
  // Catalyst — Indigo palette (A1)
  'Catalyst Track': {
    primary: '#6366f1',      // Indigo
    light: '#eef2ff',        // Indigo-50 (B1)
    border: '#a5b4fc',       // Indigo-300 (B6)
    hex: '#6366f1',
    hexLight: '#eef2ff',
    hexFill: '#c7d2fe',
  },
  'Catalyst': {
    primary: '#6366f1',
    light: '#eef2ff',
    border: '#a5b4fc',
    hex: '#6366f1',
    hexLight: '#eef2ff',
    hexFill: '#c7d2fe',
  },

  // Data & AI — Purple palette (A2)
  'Data & AI Track': {
    primary: '#8b5cf6',      // Purple
    light: '#f5f3ff',        // Purple-50 (B2)
    border: '#c4b5fd',       // Purple-300 (B7)
    hex: '#8b5cf6',
    hexLight: '#f5f3ff',
    hexFill: '#ddd6fe',
  },
  'Data & AI': {
    primary: '#8b5cf6',
    light: '#f5f3ff',
    border: '#c4b5fd',
    hex: '#8b5cf6',
    hexLight: '#f5f3ff',
    hexFill: '#ddd6fe',
  },

  // Delivery — Pink palette (A3)
  'Delivery Track': {
    primary: '#ec4899',      // Pink
    light: '#fdf2f8',        // Pink-50 (B3)
    border: '#f9a8d4',       // Pink-300 (B8)
    hex: '#ec4899',
    hexLight: '#fdf2f8',
    hexFill: '#fbcfe8',
  },
  'Delivery': {
    primary: '#ec4899',
    light: '#fdf2f8',
    border: '#f9a8d4',
    hex: '#ec4899',
    hexLight: '#fdf2f8',
    hexFill: '#fbcfe8',
  },

  // MIM — Gray palette (A4)
  'MIM': {
    primary: '#64748b',      // Gray
    light: '#f1f5f9',        // Gray-100 (B4)
    border: '#cbd5e1',       // Gray-300 (B9)
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },
  'MIM Website': {
    primary: '#64748b',
    light: '#f1f5f9',
    border: '#cbd5e1',
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },
  'MIM Website Track': {
    primary: '#64748b',
    light: '#f1f5f9',
    border: '#cbd5e1',
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },

  // Senaei — Teal palette (A5)
  'Senaei': {
    primary: '#14b8a6',      // Teal
    light: '#f0fdfa',        // Teal-50 (B5)
    border: '#5eead4',       // Teal-300 (B10)
    hex: '#14b8a6',
    hexLight: '#f0fdfa',
    hexFill: '#99f6e4',
  },
  'Senaei Track': {
    primary: '#14b8a6',
    light: '#f0fdfa',
    border: '#5eead4',
    hex: '#14b8a6',
    hexLight: '#f0fdfa',
    hexFill: '#99f6e4',
  },
  'Senaie': {
    primary: '#14b8a6',
    light: '#f0fdfa',
    border: '#5eead4',
    hex: '#14b8a6',
    hexLight: '#f0fdfa',
    hexFill: '#99f6e4',
  },
  'Senaie Track': {
    primary: '#14b8a6',
    light: '#f0fdfa',
    border: '#5eead4',
    hex: '#14b8a6',
    hexLight: '#f0fdfa',
    hexFill: '#99f6e4',
  },

  // Stand-Alone — Gray palette (A6)
  'Stand-Alone': {
    primary: '#64748b',      // Gray
    light: '#f1f5f9',        // Gray-100
    border: '#cbd5e1',       // Gray-300
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },
  'Stand-Alone Projects': {
    primary: '#64748b',
    light: '#f1f5f9',
    border: '#cbd5e1',
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },
  'Stand-Alone Projects Track': {
    primary: '#64748b',
    light: '#f1f5f9',
    border: '#cbd5e1',
    hex: '#64748b',
    hexLight: '#f1f5f9',
    hexFill: '#e2e8f0',
  },

  // Tahommona — Orange palette (A7)
  'Tahommona': {
    primary: '#f97316',      // Orange
    light: '#fff7ed',        // Orange-50
    border: '#fdba74',       // Orange-300
    hex: '#f97316',
    hexLight: '#fff7ed',
    hexFill: '#fed7aa',
  },
  'Tahommona Track': {
    primary: '#f97316',
    light: '#fff7ed',
    border: '#fdba74',
    hex: '#f97316',
    hexLight: '#fff7ed',
    hexFill: '#fed7aa',
  },
};

// Default for unknown workstreams — Gray (A6)
export const DEFAULT_WORKSTREAM_COLOR: WorkstreamColorSet = {
  primary: '#64748b',
  light: '#f1f5f9',
  border: '#cbd5e1',
  hex: '#64748b',
  hexLight: '#f1f5f9',
  hexFill: '#e2e8f0',
};

/**
 * STATUS DOT COLORS — Section E
 * 6px dots inside task bars
 * 
 * E2: Backlog = Gray #94a3b8
 * E3: Planned = Blue #3b82f6
 * E4: In Progress = Amber #f59e0b
 * E5: Review = Purple #8b5cf6
 * E6: Done = Green #16a34a
 */
export const STATUS_DOT_COLORS = {
  backlog: '#94a3b8',     // Gray (E2)
  planned: '#3b82f6',     // Blue (E3)
  progress: '#f59e0b',    // Amber (E4)
  review: '#8b5cf6',      // Purple (E5)
  done: '#16a34a',        // Green (E6)
} as const;

// Status colors for completed tasks (legacy - for bar stripe)
export const STATUS_COLORS = {
  completed: {
    primary: '#16a34a',
    light: '#f0fdf4',
    border: '#86efac',
    hex: '#16a34a',
    hexLight: '#f0fdf4',
    hexFill: '#bbf7d0',
  },
};

/**
 * Get workstream color set by name
 * Performs fuzzy matching for common variations
 */
export function getWorkstreamColor(workstream: string | undefined | null): WorkstreamColorSet {
  if (!workstream) return DEFAULT_WORKSTREAM_COLOR;
  
  // Direct match
  if (WORKSTREAM_COLORS[workstream]) {
    return WORKSTREAM_COLORS[workstream];
  }
  
  // Fuzzy match for common variations
  const normalized = workstream.toLowerCase().trim();
  
  if (normalized.includes('catalyst')) {
    return WORKSTREAM_COLORS['Catalyst'];
  }
  if (normalized.includes('data') && normalized.includes('ai')) {
    return WORKSTREAM_COLORS['Data & AI'];
  }
  if (normalized.includes('delivery')) {
    return WORKSTREAM_COLORS['Delivery'];
  }
  if (normalized.includes('mim')) {
    return WORKSTREAM_COLORS['MIM'];
  }
  if (normalized.includes('senaei') || normalized.includes('senaie')) {
    return WORKSTREAM_COLORS['Senaei'];
  }
  if (normalized.includes('stand') && normalized.includes('alone')) {
    return WORKSTREAM_COLORS['Stand-Alone'];
  }
  if (normalized.includes('tahommona')) {
    return WORKSTREAM_COLORS['Tahommona'];
  }
  
  return DEFAULT_WORKSTREAM_COLOR;
}

/**
 * Get color based on status or workstream
 * Done tasks get green overlay
 */
export function getTaskColor(status: string, workstream: string | undefined): WorkstreamColorSet {
  if (status === 'done') {
    return STATUS_COLORS.completed;
  }
  return getWorkstreamColor(workstream);
}

/**
 * Get status dot color
 * Returns the hex color for the 6px status indicator dot
 */
export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status as keyof typeof STATUS_DOT_COLORS] || STATUS_DOT_COLORS.backlog;
}
