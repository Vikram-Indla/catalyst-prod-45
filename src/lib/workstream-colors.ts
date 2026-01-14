// =====================================================
// WORKSTREAM COLORS (Enterprise Timeline Style)
// Maps workstream names to color palettes for Gantt bars
// =====================================================

export const WORKSTREAM_COLORS = {
  'Catalyst Track': {
    border: 'border-l-teal-500',
    bg: 'bg-teal-50',
    fill: 'bg-teal-300',
    text: 'text-teal-800',
    light: 'bg-teal-50',
    hex: '#0d9488',
    hexLight: '#f0fdfa',
    hexFill: '#5eead4',
  },
  'Delivery Track': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-50',
    fill: 'bg-blue-300',
    text: 'text-blue-800',
    light: 'bg-blue-50',
    hex: '#2563eb',
    hexLight: '#eff6ff',
    hexFill: '#93c5fd',
  },
  'MIM Website': {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    fill: 'bg-amber-300',
    text: 'text-amber-800',
    light: 'bg-amber-50',
    hex: '#d97706',
    hexLight: '#fffbeb',
    hexFill: '#fcd34d',
  },
  'MIM Website Track': {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50',
    fill: 'bg-amber-300',
    text: 'text-amber-800',
    light: 'bg-amber-50',
    hex: '#d97706',
    hexLight: '#fffbeb',
    hexFill: '#fcd34d',
  },
  'Senaie Track': {
    border: 'border-l-indigo-500',
    bg: 'bg-indigo-50',
    fill: 'bg-indigo-300',
    text: 'text-indigo-800',
    light: 'bg-indigo-50',
    hex: '#6366f1',
    hexLight: '#eef2ff',
    hexFill: '#a5b4fc',
  },
  'Tahommona Track': {
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-50',
    fill: 'bg-cyan-300',
    text: 'text-cyan-800',
    light: 'bg-cyan-50',
    hex: '#06b6d4',
    hexLight: '#ecfeff',
    hexFill: '#67e8f9',
  },
  'Data & AI Track': {
    border: 'border-l-violet-500',
    bg: 'bg-violet-50',
    fill: 'bg-violet-300',
    text: 'text-violet-800',
    light: 'bg-violet-50',
    hex: '#8b5cf6',
    hexLight: '#f5f3ff',
    hexFill: '#c4b5fd',
  },
  'Stand-Alone Projects Track': {
    border: 'border-l-slate-500',
    bg: 'bg-slate-50',
    fill: 'bg-slate-300',
    text: 'text-slate-800',
    light: 'bg-slate-50',
    hex: '#64748b',
    hexLight: '#f8fafc',
    hexFill: '#cbd5e1',
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
