// =====================================================
// WORKSTREAM COLORS — Enterprise Clean V2
// SINGLE SOURCE OF TRUTH — Use across ALL screens
// Matches spec from TIMELINE-ENTERPRISE-CLEAN.md
// =====================================================

export const WORKSTREAM_COLORS = {
  // Catalyst — Indigo palette
  'Catalyst Track': {
    primary: '#6366f1',      // Indigo
    light: '#eef2ff',        // Indigo-50 (for bar fills)
    border: '#a5b4fc',       // Indigo-300
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

  // Data & AI — Purple palette
  'Data & AI Track': {
    primary: '#8b5cf6',      // Purple
    light: '#f5f3ff',        // Purple-50
    border: '#c4b5fd',       // Purple-300
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

  // Delivery — Pink palette
  'Delivery Track': {
    primary: '#ec4899',      // Pink
    light: '#fdf2f8',        // Pink-50
    border: '#f9a8d4',       // Pink-300
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

  // MIM — Gray palette
  'MIM': {
    primary: '#64748b',      // Gray
    light: '#f1f5f9',        // Gray-100
    border: '#cbd5e1',       // Gray-300
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

  // Senaei — Teal palette
  'Senaei': {
    primary: '#14b8a6',      // Teal
    light: '#f0fdfa',        // Teal-50
    border: '#5eead4',       // Teal-300
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

  // Stand-Alone — Gray palette
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

  // Tahommona — Orange palette
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
} as const;

// Default for unknown workstreams — Gray
export const DEFAULT_WORKSTREAM_COLOR = {
  primary: '#64748b',
  light: '#f1f5f9',
  border: '#cbd5e1',
  hex: '#64748b',
  hexLight: '#f1f5f9',
  hexFill: '#e2e8f0',
};

// Status colors (dot indicators — NOT bar fills)
export const STATUS_DOT_COLORS = {
  backlog: '#94a3b8',     // Gray
  planned: '#3b82f6',     // Blue
  progress: '#f59e0b',    // Amber
  review: '#8b5cf6',      // Purple
  done: '#16a34a',        // Green
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

// Helper to get workstream color
export function getWorkstreamColor(workstream: string | undefined) {
  if (!workstream) return DEFAULT_WORKSTREAM_COLOR;
  return WORKSTREAM_COLORS[workstream as keyof typeof WORKSTREAM_COLORS] || DEFAULT_WORKSTREAM_COLOR;
}

// Get color based on status or workstream
export function getTaskColor(status: string, workstream: string | undefined) {
  if (status === 'done') {
    return STATUS_COLORS.completed;
  }
  return getWorkstreamColor(workstream);
}

// Get status dot color
export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status as keyof typeof STATUS_DOT_COLORS] || STATUS_DOT_COLORS.backlog;
}
