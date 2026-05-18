// =====================================================
// WORKSTREAM COLORS — Enterprise Clean V2 REFINED
// SINGLE SOURCE OF TRUTH — Use across ALL screens
// BALANCED SATURATION: 20-30% (visible but professional)
// =====================================================

/**
 * QA Audit Spec Reference (REFINED):
 * - A1: Catalyst = Indigo #6366f1
 * - A2: Data & AI = Purple #8b5cf6
 * - A3: Delivery = Pink #ec4899
 * - A4: MIM = Gray #64748b
 * - A5: Senaei = Teal #14b8a6
 * - A6: Stand-Alone = Gray #64748b
 * - A7: Tahommona = Orange #f97316
 * - A8: Dot size = 8-10px
 * 
 * REFINED COLORS (20-30% saturation):
 * Bar fills use -200 shades (not -50 which was too light)
 * Text uses -700/-800 shades for readability
 */

export interface WorkstreamColorSet {
  primary: string;      // Workstream dot color (8-10px dots)
  light: string;        // Bar fill at 20-30% opacity (-200 shade)
  border: string;       // Bar border (-300 shade)
  hex: string;          // Same as primary for compatibility
  hexLight: string;     // Same as light for compatibility
  hexFill: string;      // Same as light for bar fills
  textPrimary: string;  // Task ID text color (-700 shade)
  textDark: string;     // Task title text color (-800 shade)
}

export const WORKSTREAM_COLORS: Record<string, WorkstreamColorSet> = {
  // Catalyst — Indigo palette (A1)
  'Catalyst Track': {
    primary: 'var(--cp-workstream-catalyst-primary)',      // Indigo
    light: 'var(--cp-workstream-catalyst-light)',        // Indigo-200 (REFINED - 25% saturation)
    border: 'var(--cp-workstream-catalyst-border)',       // Indigo-300
    hex: 'var(--cp-workstream-catalyst-primary)',
    hexLight: 'var(--cp-workstream-catalyst-light)',
    hexFill: 'var(--cp-workstream-catalyst-light)',
    textPrimary: 'var(--cp-workstream-catalyst-text-primary)',  // Indigo-700
    textDark: 'var(--cp-workstream-catalyst-text-dark)',     // Indigo-800
  },
  'Catalyst': {
    primary: 'var(--cp-workstream-catalyst-primary)',
    light: 'var(--cp-workstream-catalyst-light)',
    border: 'var(--cp-workstream-catalyst-border)',
    hex: 'var(--cp-workstream-catalyst-primary)',
    hexLight: 'var(--cp-workstream-catalyst-light)',
    hexFill: 'var(--cp-workstream-catalyst-light)',
    textPrimary: 'var(--cp-workstream-catalyst-text-primary)',
    textDark: 'var(--cp-workstream-catalyst-text-dark)',
  },

  // Data & AI — Purple palette (A2)
  'Data & AI Track': {
    primary: 'var(--cp-workstream-data-ai-primary)',      // Purple
    light: 'var(--cp-workstream-data-ai-light)',        // Violet-200 (REFINED - 25% saturation)
    border: 'var(--cp-workstream-data-ai-border)',       // Violet-300
    hex: 'var(--cp-workstream-data-ai-primary)',
    hexLight: 'var(--cp-workstream-data-ai-light)',
    hexFill: 'var(--cp-workstream-data-ai-light)',
    textPrimary: 'var(--cp-workstream-data-ai-text-primary)',  // Violet-700
    textDark: 'var(--cp-workstream-data-ai-text-dark)',     // Violet-800
  },
  'Data & AI': {
    primary: 'var(--cp-workstream-data-ai-primary)',
    light: 'var(--cp-workstream-data-ai-light)',
    border: 'var(--cp-workstream-data-ai-border)',
    hex: 'var(--cp-workstream-data-ai-primary)',
    hexLight: 'var(--cp-workstream-data-ai-light)',
    hexFill: 'var(--cp-workstream-data-ai-light)',
    textPrimary: 'var(--cp-workstream-data-ai-text-primary)',
    textDark: 'var(--cp-workstream-data-ai-text-dark)',
  },

  // Delivery — Pink palette (A3)
  'Delivery Track': {
    primary: 'var(--cp-workstream-delivery-primary)',      // Pink
    light: 'var(--cp-workstream-delivery-light)',        // Pink-200 (REFINED - 25% saturation)
    border: 'var(--cp-workstream-delivery-border)',       // Pink-300
    hex: 'var(--cp-workstream-delivery-primary)',
    hexLight: 'var(--cp-workstream-delivery-light)',
    hexFill: 'var(--cp-workstream-delivery-light)',
    textPrimary: 'var(--cp-workstream-delivery-text-primary)',  // Pink-700
    textDark: 'var(--cp-workstream-delivery-text-dark)',     // Pink-800
  },
  'Delivery': {
    primary: 'var(--cp-workstream-delivery-primary)',
    light: 'var(--cp-workstream-delivery-light)',
    border: 'var(--cp-workstream-delivery-border)',
    hex: 'var(--cp-workstream-delivery-primary)',
    hexLight: 'var(--cp-workstream-delivery-light)',
    hexFill: 'var(--cp-workstream-delivery-light)',
    textPrimary: 'var(--cp-workstream-delivery-text-primary)',
    textDark: 'var(--cp-workstream-delivery-text-dark)',
  },

  // MIM — Gray palette (A4)
  'MIM': {
    primary: 'var(--cp-color-slate-500)',      // Gray
    light: 'var(--cp-color-slate-200)',        // Slate-200 (REFINED - 25% saturation)
    border: 'var(--cp-color-slate-400)',       // Slate-400
    hex: 'var(--cp-color-slate-500)',
    hexLight: 'var(--cp-color-slate-200)',
    hexFill: 'var(--cp-color-slate-200)',
    textPrimary: 'var(--cp-color-slate-600)',  // Slate-600
    textDark: 'var(--cp-color-slate-700)',     // Slate-700
  },
  'MIM Website': {
    primary: 'var(--cp-color-slate-500)',
    light: 'var(--cp-color-slate-200)',
    border: 'var(--cp-color-slate-400)',
    hex: 'var(--cp-color-slate-500)',
    hexLight: 'var(--cp-color-slate-200)',
    hexFill: 'var(--cp-color-slate-200)',
    textPrimary: 'var(--cp-color-slate-600)',
    textDark: 'var(--cp-color-slate-700)',
  },
  'MIM Website Track': {
    primary: 'var(--cp-color-slate-500)',
    light: 'var(--cp-color-slate-200)',
    border: 'var(--cp-color-slate-400)',
    hex: 'var(--cp-color-slate-500)',
    hexLight: 'var(--cp-color-slate-200)',
    hexFill: 'var(--cp-color-slate-200)',
    textPrimary: 'var(--cp-color-slate-600)',
    textDark: 'var(--cp-color-slate-700)',
  },

  // Senaei — Teal palette (A5)
  'Senaei': {
    primary: 'var(--cp-workstream-senaei-primary)',      // Teal
    light: 'var(--cp-workstream-senaei-light)',        // Teal-200 (REFINED - 25% saturation)
    border: 'var(--cp-workstream-senaei-border)',       // Teal-300
    hex: 'var(--cp-workstream-senaei-primary)',
    hexLight: 'var(--cp-workstream-senaei-light)',
    hexFill: 'var(--cp-workstream-senaei-light)',
    textPrimary: 'var(--cp-workstream-senaei-text-primary)',  // Teal-700
    textDark: 'var(--cp-workstream-senaei-text-dark)',     // Teal-800
  },
  'Senaei Track': {
    primary: 'var(--cp-workstream-senaei-primary)',
    light: 'var(--cp-workstream-senaei-light)',
    border: 'var(--cp-workstream-senaei-border)',
    hex: 'var(--cp-workstream-senaei-primary)',
    hexLight: 'var(--cp-workstream-senaei-light)',
    hexFill: 'var(--cp-workstream-senaei-light)',
    textPrimary: 'var(--cp-workstream-senaei-text-primary)',
    textDark: 'var(--cp-workstream-senaei-text-dark)',
  },
  'Senaie': {
    primary: '#14b8a6',
    light: '#ccfbf1',
    border: '#5eead4',
    hex: '#14b8a6',
    hexLight: '#ccfbf1',
    hexFill: '#ccfbf1',
    textPrimary: '#0f766e',
    textDark: '#115e59',
  },
  'Senaie Track': {
    primary: '#14b8a6',
    light: '#ccfbf1',
    border: '#5eead4',
    hex: '#14b8a6',
    hexLight: '#ccfbf1',
    hexFill: '#ccfbf1',
    textPrimary: '#0f766e',
    textDark: '#115e59',
  },

  // Stand-Alone — Gray palette (A6)
  'Stand-Alone': {
    primary: '#64748b',      // Gray
    light: '#e2e8f0',        // Slate-200 (REFINED)
    border: '#94a3b8',       // Slate-400
    hex: '#64748b',
    hexLight: '#e2e8f0',
    hexFill: '#e2e8f0',
    textPrimary: '#475569',
    textDark: 'var(--cp-ink-2, var(--cp-ink-2, #334155))',
  },
  'Stand-Alone Projects': {
    primary: '#64748b',
    light: '#e2e8f0',
    border: '#94a3b8',
    hex: '#64748b',
    hexLight: '#e2e8f0',
    hexFill: '#e2e8f0',
    textPrimary: '#475569',
    textDark: 'var(--cp-ink-2, var(--cp-ink-2, #334155))',
  },
  'Stand-Alone Projects Track': {
    primary: '#64748b',
    light: '#e2e8f0',
    border: '#94a3b8',
    hex: '#64748b',
    hexLight: '#e2e8f0',
    hexFill: '#e2e8f0',
    textPrimary: '#475569',
    textDark: 'var(--cp-ink-2, var(--cp-ink-2, #334155))',
  },

  // Tahommona — Orange palette (A7)
  'Tahommona': {
    primary: '#f97316',      // Orange
    light: '#ffedd5',        // Orange-200 (REFINED - 25% saturation)
    border: '#fdba74',       // Orange-300
    hex: '#f97316',
    hexLight: '#ffedd5',
    hexFill: '#ffedd5',
    textPrimary: '#c2410c',  // Orange-700
    textDark: '#9a3412',     // Orange-800
  },
  'Tahommona Track': {
    primary: '#f97316',
    light: '#ffedd5',
    border: '#fdba74',
    hex: '#f97316',
    hexLight: '#ffedd5',
    hexFill: '#ffedd5',
    textPrimary: '#c2410c',
    textDark: '#9a3412',
  },
};

// Default for unknown workstreams — Gray (A6)
export const DEFAULT_WORKSTREAM_COLOR: WorkstreamColorSet = {
  primary: '#64748b',
  light: '#e2e8f0',
  border: '#94a3b8',
  hex: '#64748b',
  hexLight: '#e2e8f0',
  hexFill: '#e2e8f0',
  textPrimary: '#475569',
  textDark: 'var(--cp-ink-2, var(--cp-ink-2, #334155))',
};

/**
 * STATUS DOT COLORS — Section E
 * 8px dots inside task bars (increased for visibility)
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
    light: '#dcfce7',      // Green-200 (REFINED)
    border: '#86efac',     // Green-300
    hex: '#16a34a',
    hexLight: '#dcfce7',
    hexFill: '#dcfce7',
    textPrimary: '#15803d',
    textDark: '#166534',
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
 * Returns the hex color for the 8px status indicator dot
 */
export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status as keyof typeof STATUS_DOT_COLORS] || STATUS_DOT_COLORS.backlog;
}
