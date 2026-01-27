// =====================================================
// WORKSTREAM COLORS (Enterprise Timeline Style)
// Maps workstream names to color palettes for Gantt bars
// =====================================================

export const WORKSTREAM_COLORS = {
  'Catalyst Track': {
    border: 'border-l-purple-600',
    bg: 'bg-purple-50',
    fill: 'bg-purple-400',
    text: 'text-purple-700',
    light: 'bg-purple-50',
    hex: '#9333ea',         // purple-600 (deep violet)
    hexLight: '#faf5ff',
    hexFill: '#c084fc',
  },
  'Catalyst': {
    border: 'border-l-purple-600',
    bg: 'bg-purple-50',
    fill: 'bg-purple-400',
    text: 'text-purple-700',
    light: 'bg-purple-50',
    hex: '#9333ea',         // purple-600 (deep violet)
    hexLight: '#faf5ff',
    hexFill: '#c084fc',
  },
  'Delivery Track': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    fill: 'bg-orange-400',
    text: 'text-orange-700',
    light: 'bg-orange-50',
    hex: '#f97316',         // orange-500 (vibrant orange)
    hexLight: '#fff7ed',
    hexFill: '#fb923c',
  },
  'Delivery': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-50',
    fill: 'bg-orange-400',
    text: 'text-orange-700',
    light: 'bg-orange-50',
    hex: '#f97316',         // orange-500 (vibrant orange)
    hexLight: '#fff7ed',
    hexFill: '#fb923c',
  },
  'MIM Website': {
    border: 'border-l-pink-500',
    bg: 'bg-pink-50',
    fill: 'bg-pink-400',
    text: 'text-pink-700',
    light: 'bg-pink-50',
    hex: '#ec4899',         // pink-500 (vibrant pink)
    hexLight: '#fdf2f8',
    hexFill: '#f472b6',
  },
  'MIM Website Track': {
    border: 'border-l-pink-500',
    bg: 'bg-pink-50',
    fill: 'bg-pink-400',
    text: 'text-pink-700',
    light: 'bg-pink-50',
    hex: '#ec4899',         // pink-500 (vibrant pink)
    hexLight: '#fdf2f8',
    hexFill: '#f472b6',
  },
  'Senaie Track': {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    fill: 'bg-cyan-400',
    text: 'text-cyan-700',
    light: 'bg-cyan-50',
    hex: '#06b6d4',         // cyan-500 (vibrant cyan)
    hexLight: '#ecfeff',
    hexFill: '#22d3ee',
  },
  'Senaie': {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    fill: 'bg-cyan-400',
    text: 'text-cyan-700',
    light: 'bg-cyan-50',
    hex: '#06b6d4',         // cyan-500 (vibrant cyan)
    hexLight: '#ecfeff',
    hexFill: '#22d3ee',
  },
  'Tahommona Track': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    fill: 'bg-blue-400',
    text: 'text-blue-700',
    light: 'bg-blue-50',
    hex: '#3b82f6',         // blue-500 (vibrant blue)
    hexLight: '#eff6ff',
    hexFill: '#60a5fa',
  },
  'Tahommona': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    fill: 'bg-blue-400',
    text: 'text-blue-700',
    light: 'bg-blue-50',
    hex: '#3b82f6',         // blue-500 (vibrant blue)
    hexLight: '#eff6ff',
    hexFill: '#60a5fa',
  },
  'Data & AI Track': {
    border: 'border-l-violet-600',
    bg: 'bg-violet-50',
    fill: 'bg-violet-400',
    text: 'text-violet-700',
    light: 'bg-violet-50',
    hex: '#7c3aed',         // violet-600 (deep violet)
    hexLight: '#f5f3ff',
    hexFill: '#a78bfa',
  },
  'Data & AI': {
    border: 'border-l-violet-600',
    bg: 'bg-violet-50',
    fill: 'bg-violet-400',
    text: 'text-violet-700',
    light: 'bg-violet-50',
    hex: '#7c3aed',         // violet-600 (deep violet)
    hexLight: '#f5f3ff',
    hexFill: '#a78bfa',
  },
  'Stand-Alone Projects Track': {
    border: 'border-l-slate-500',
    bg: 'bg-slate-50',
    fill: 'bg-slate-400',
    text: 'text-slate-700',
    light: 'bg-slate-50',
    hex: '#64748b',         // slate-500 (neutral gray)
    hexLight: '#f8fafc',
    hexFill: '#94a3b8',
  },
  'Stand-Alone Projects': {
    border: 'border-l-slate-500',
    bg: 'bg-slate-50',
    fill: 'bg-slate-400',
    text: 'text-slate-700',
    light: 'bg-slate-50',
    hex: '#64748b',         // slate-500 (neutral gray)
    hexLight: '#f8fafc',
    hexFill: '#94a3b8',
  },
} as const;

// Default for unknown workstreams
export const DEFAULT_WORKSTREAM_COLOR = {
  border: 'border-l-gray-400',
  bg: 'bg-gray-50',
  fill: 'bg-gray-300',
  text: 'text-gray-800',
  light: 'bg-gray-50',
  hex: '#9ca3af',
  hexLight: '#f9fafb',
  hexFill: '#d1d5db',
};

// Status colors (for completed tasks)
export const STATUS_COLORS = {
  completed: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50',
    fill: 'bg-emerald-300',
    text: 'text-emerald-800',
    light: 'bg-emerald-50',
    hex: '#10b981',
    hexLight: '#ecfdf5',
    hexFill: '#6ee7b7',
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
