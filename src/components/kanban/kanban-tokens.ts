/**
 * Kanban Board — Design tokens (Nocturne Geist)
 * Single source of truth for all kanban theming.
 */

export interface KanbanThemeTokens {
  pageBg: string;
  surfaceBg: string;
  surfaceHover: string;
  surfaceAlt: string;
  headerBg: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  badgeBg: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBg: string;
  cardHoverShadow: string;
  cardDragShadow: string;
  dropHighlight: string;
  selectedAccent: string;
  chipBg: string;
  chipText: string;
  inputBg: string;
  inputBorder: string;
  overlay: string;
}

export const KANBAN_TOKENS: { light: KanbanThemeTokens; dark: KanbanThemeTokens } = {
  light: {
    pageBg: '#F4F5F7',
    surfaceBg: '#FFFFFF',
    surfaceHover: '#F4F5F7',
    surfaceAlt: '#FAFBFC',
    headerBg: '#F4F5F7',
    border: '#DDDEE1',
    borderSubtle: '#EBECF0',
    textPrimary: '#172B4D',
    textSecondary: '#42526E',
    textMuted: '#5E6C84',
    textDisabled: '#94A3B8',
    badgeBg: 'rgba(9,30,66,.08)',
    cardBg: '#FFFFFF',
    cardBorder: '#DDDEE1',
    cardHoverBg: '#F4F5F7',
    cardHoverShadow: '0 1px 4px rgba(9,30,66,.15)',
    cardDragShadow: '0 8px 16px rgba(9,30,66,.25)',
    dropHighlight: 'rgba(37,99,235,0.04)',
    selectedAccent: '#2563EB',
    chipBg: '#DFE1E6',
    chipText: '#42526E',
    inputBg: '#FAFBFC',
    inputBorder: '#DDDEE1',
    overlay: 'rgba(9,30,66,.08)',
  },
  dark: {
    pageBg: '#0A0A0A',
    surfaceBg: '#1A1A1A',
    surfaceHover: '#1F1F1F',
    surfaceAlt: '#111111',
    headerBg: '#111111',
    border: '#2E2E2E',
    borderSubtle: '#292929',
    textPrimary: '#EDEDED',
    textSecondary: '#A1A1A1',
    textMuted: '#878787',
    textDisabled: '#7D7D7D',
    badgeBg: 'rgba(255,255,255,.08)',
    cardBg: '#1A1A1A',
    cardBorder: '#2E2E2E',
    cardHoverBg: '#1F1F1F',
    cardHoverShadow: '0 1px 4px rgba(0,0,0,.4)',
    cardDragShadow: '0 8px 16px rgba(0,0,0,.6)',
    dropHighlight: 'rgba(37,99,235,0.06)',
    selectedAccent: '#2563EB',
    chipBg: '#292929',
    chipText: '#A1A1A1',
    inputBg: '#111111',
    inputBorder: '#2E2E2E',
    overlay: 'rgba(255,255,255,.04)',
  },
};

/* ═══ DENSITY SYSTEM ═══ */

export type KanbanDensity = 'compact' | 'dense' | 'comfortable';

export interface DensityConfig {
  cardPad: string;
  titleSize: number;
  titleClamp: number;
  metaSize: number;
  avatarSize: number;
  cardGap: number;
  footerHeight: number;
  cardMinHeight: number;
}

export const DENSITY_CONFIG: Record<KanbanDensity, DensityConfig> = {
  compact:     { cardPad: '4px 6px', titleSize: 11, titleClamp: 1, metaSize: 9, avatarSize: 20, cardGap: 2, footerHeight: 18, cardMinHeight: 80 },
  dense:       { cardPad: '6px 8px', titleSize: 12, titleClamp: 2, metaSize: 10, avatarSize: 22, cardGap: 4, footerHeight: 20, cardMinHeight: 110 },
  comfortable: { cardPad: '8px 10px', titleSize: 13, titleClamp: 3, metaSize: 10, avatarSize: 26, cardGap: 12, footerHeight: 22, cardMinHeight: 130 },
};

/* ═══ COLUMN CONFIG ═══ */

export interface KanbanColumnDef {
  id: string;
  name: string;
  statuses: string[];
  category: 'todo' | 'in_progress' | 'done';
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-requirements', name: 'IN REQUIREMENTS', category: 'todo', statuses: ['In Requirements', 'In Design', 'Awaiting Info'] },
  { id: 'col-ready-dev', name: 'READY FOR DEV', category: 'todo', statuses: ['Ready for Development', 'Backlog', 'ToDo', 'To Do'] },
  { id: 'col-dev', name: 'IN DEVELOPMENT', category: 'in_progress', statuses: ['In Development', 'In Progress', 'Under Implementation'] },
  { id: 'col-testing', name: 'IN TESTING', category: 'in_progress', statuses: ['In QA', 'Ready for QA', 'Retest', 'Internal QA', 'Staging/QA', 'In Testing'] },
  { id: 'col-uat', name: 'IN UAT', category: 'in_progress', statuses: ['In UAT', 'UAT Ready', 'BETA READY', 'In BETA', 'In Integration'] },
  { id: 'col-done', name: 'DONE', category: 'done', statuses: ['Done', 'Closed', 'Resolved', 'In Production', 'ready for production', 'Rejected', 'Re-Open', 'Blocked'] },
];

export const COL_PRIMARY_STATUS: Record<string, string> = {};
export const STATUS_TO_COL_ID = new Map<string, string>();
KANBAN_COLUMNS.forEach(col => {
  COL_PRIMARY_STATUS[col.id] = col.statuses[0];
  col.statuses.forEach(s => STATUS_TO_COL_ID.set(s.toLowerCase(), col.id));
});
export const COLUMN_ID_SET = new Set(KANBAN_COLUMNS.map(c => c.id));
