// ============================================================================
// TASK DETAIL MODAL V10 — COLOR SYSTEM
// ============================================================================
// DO NOT MODIFY THESE VALUES — They are pixel-perfect specifications

export const COLORS = {
  // Text
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  
  // Surfaces
  surfacePage: '#f8fafc',
  surfaceCard: '#ffffff',
  surfaceHover: '#f1f5f9',
  
  // Borders
  borderLight: '#e2e8f0',
  borderDefault: '#cbd5e1',
  borderFocus: '#3b82f6',
  
  // Accent
  accent: '#2563eb',
  accentHover: '#1d4ed8',
  accentLight: '#dbeafe',
  
  // Warning
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#92400e',
  warningIcon: '#d97706',
  
  // File Types
  filePdfBg: '#fef2f2',
  filePdfIcon: '#dc2626',
  fileDocBg: '#eff6ff',
  fileDocIcon: '#2563eb',
  fileImgBg: '#f0fdf4',
  fileImgIcon: '#16a34a'
} as const;

// Status Colors — DO NOT MODIFY
export const STATUS_COLORS: Record<string, string> = {
  'Backlog': '#94a3b8',
  'Planned': '#3b82f6',
  'In Progress': '#f59e0b',
  'In Review': '#8b5cf6',
  'Done': '#16a34a'
};

// Priority Colors — MEDIUM IS YELLOW #eab308
export const PRIORITY_COLORS: Record<string, string> = {
  'Critical': '#dc2626',
  'High': '#f97316',
  'Medium': '#eab308',  // YELLOW — NOT BLUE
  'Low': '#94a3b8'
};

// Workstream Colors — MIM IS GRAY #64748b
export const WORKSTREAM_COLORS: Record<string, string> = {
  'Catalyst': '#6366f1',
  'Data & AI': '#8b5cf6',
  'Delivery': '#ec4899',
  'MIM': '#64748b',  // GRAY — NOT PINK
  'Senaei': '#14b8a6'
};

// Options Arrays
export const STATUSES = ['Backlog', 'Planned', 'In Progress', 'In Review', 'Done'] as const;
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export const WORKSTREAMS = ['Catalyst', 'Data & AI', 'Delivery', 'MIM', 'Senaei'] as const;

export const DEFAULT_ASSIGNEES = [
  { id: '1', name: 'Vikram Indla', initials: 'VI', color: '#8b5cf6' },
  { id: '2', name: 'Ahmed Khan', initials: 'AK', color: '#3b82f6' },
  { id: '3', name: 'Sarah Johnson', initials: 'SJ', color: '#ec4899' },
  { id: '4', name: 'Mohammed Ali', initials: 'MA', color: '#14b8a6' },
  { id: '0', name: 'Unassigned', initials: '?', color: '#94a3b8' }
];
