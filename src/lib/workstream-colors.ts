// =====================================================
// WORKSTREAM COLORS (Enterprise Timeline Style)
// Maps workstream names to color palettes for Gantt bars
// =====================================================

export const WORKSTREAM_COLORS = {
  'Catalyst Track': {
    border: 'border-l-teal-500',
    bg: 'bg-teal-500',
    text: 'text-teal-600',
    light: 'bg-teal-50',
    hex: '#0d9488',
    hexLight: '#f0fdfa',
  },
  'Delivery Track': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    light: 'bg-blue-50',
    hex: '#2563eb',
    hexLight: '#eff6ff',
  },
  'MIM Website': {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    light: 'bg-amber-50',
    hex: '#d97706',
    hexLight: '#fffbeb',
  },
  'MIM Website Track': {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500',
    text: 'text-amber-600',
    light: 'bg-amber-50',
    hex: '#d97706',
    hexLight: '#fffbeb',
  },
  'Senaie Track': {
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-500',
    text: 'text-indigo-600',
    light: 'bg-indigo-50',
    hex: '#6366f1',
    hexLight: '#eef2ff',
  },
  'Tahommona Track': {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-500',
    text: 'text-cyan-600',
    light: 'bg-cyan-50',
    hex: '#06b6d4',
    hexLight: '#ecfeff',
  },
  'Data & AI Track': {
    border: 'border-l-violet-500',
    bg: 'bg-violet-500',
    text: 'text-violet-600',
    light: 'bg-violet-50',
    hex: '#8b5cf6',
    hexLight: '#f5f3ff',
  },
  'Stand-Alone Projects Track': {
    border: 'border-l-slate-500',
    bg: 'bg-slate-500',
    text: 'text-slate-600',
    light: 'bg-slate-50',
    hex: '#64748b',
    hexLight: '#f8fafc',
  },
} as const;

// Default for unknown workstreams
export const DEFAULT_WORKSTREAM_COLOR = {
  border: 'border-l-gray-400',
  bg: 'bg-gray-400',
  text: 'text-gray-600',
  light: 'bg-gray-50',
  hex: '#9ca3af',
  hexLight: '#f9fafb',
};

// Status colors (for completed tasks)
export const STATUS_COLORS = {
  completed: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500',
    text: 'text-emerald-600',
    light: 'bg-emerald-50',
    hex: '#10b981',
    hexLight: '#ecfdf5',
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
