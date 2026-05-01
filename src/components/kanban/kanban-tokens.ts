/**
 * Kanban Board — Design tokens (ADS dark)
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
  cardShadowRest: string;
  cardHoverShadow: string;
  cardDragShadow: string;
  dropHighlight: string;
  dropIndicator: string;
  selectedAccent: string;
  chipBg: string;
  chipText: string;
  inputBg: string;
  inputBorder: string;
  overlay: string;
  /* Jira-parity epic lozenge */
  epicLozengeBg: string;
  epicLozengeText: string;
}

export const KANBAN_TOKENS: { light: KanbanThemeTokens; dark: KanbanThemeTokens } = {
  light: {
    /* Jira parity: page transparent, column surface #F8F8F8, card var(--ds-surface, #FFFFFF) */
    pageBg: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
    surfaceBg: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
    surfaceHover: '#F1F2F4',
    surfaceAlt: '#F8F8F8',     /* column surface (Jira: rgb(248,248,248)) */
    headerBg: '#F8F8F8',       /* column header — matches column body */
    border: '#DDDEE1',
    borderSubtle: '#EBECF0',
    textPrimary: '#292A2E',    /* Jira primary text */
    textSecondary: '#42526E',
    textMuted: '#505258',      /* Jira muted (column name, issue key) */
    textDisabled: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))',
    badgeBg: 'transparent',    /* Jira: count badge is plain text, no pill */
    cardBg: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
    cardBorder: 'transparent', /* Jira cards are shadow-only, no border */
    cardHoverBg: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
    /* Jira dual-stack shadow (rest): 1px offset drop + 1px blur outline */
    cardShadowRest: 'rgba(30,31,33,.25) 0 1px 1px 0, rgba(30,31,33,.31) 0 0 1px 0',
    cardHoverShadow: 'rgba(30,31,33,.35) 0 2px 4px 0, rgba(30,31,33,.31) 0 0 1px 0',
    cardDragShadow: 'rgba(30,31,33,.45) 0 8px 16px 0, rgba(30,31,33,.31) 0 0 1px 0',
    dropHighlight: '#DFE3E8',  /* Jira drop tint */
    dropIndicator: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',  /* 2px accent line on insertion */
    selectedAccent: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
    chipBg: 'var(--ds-border, var(--ds-border, #DFE1E6))',
    chipText: '#42526E',
    inputBg: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #FAFBFC))',
    inputBorder: '#DDDEE1',
    overlay: 'rgba(9,30,66,.08)',
    epicLozengeBg: '#DDDEE1',  /* Jira epic lozenge surface */
    epicLozengeText: '#292A2E',
  },
  dark: {
    pageBg: 'var(--ds-surface, var(--ds-surface, #0A0A0A))',
    surfaceBg: 'var(--ds-surface-raised, var(--ds-surface-raised, #1A1A1A))',
    surfaceHover: 'var(--ds-surface-overlay, var(--ds-surface-overlay, #1F1F1F))',
    surfaceAlt: '#111111',
    headerBg: '#111111',
    border: 'var(--ds-border, var(--ds-border, #2E2E2E))',
    borderSubtle: 'var(--ds-border, var(--ds-border, #292929))',
    textPrimary: 'var(--ds-text, var(--ds-text, #EDEDED))',
    textSecondary: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #A1A1A1))',
    textMuted: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #A1A1A1))',
    textDisabled: '#7D7D7D',
    badgeBg: 'transparent',
    cardBg: 'var(--ds-surface-raised, var(--ds-surface-raised, #1A1A1A))',
    cardBorder: 'transparent',
    cardHoverBg: 'var(--ds-surface-overlay, var(--ds-surface-overlay, #1F1F1F))',
    cardShadowRest: 'rgba(0,0,0,.45) 0 1px 1px 0, rgba(0,0,0,.55) 0 0 1px 0',
    cardHoverShadow: 'rgba(0,0,0,.55) 0 2px 4px 0, rgba(0,0,0,.55) 0 0 1px 0',
    cardDragShadow: 'rgba(0,0,0,.65) 0 8px 16px 0, rgba(0,0,0,.55) 0 0 1px 0',
    dropHighlight: 'var(--ds-border, var(--ds-border, #292929))',
    dropIndicator: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
    selectedAccent: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
    chipBg: 'var(--ds-border, var(--ds-border, #292929))',
    chipText: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #A1A1A1))',
    inputBg: '#111111',
    inputBorder: 'var(--ds-border, var(--ds-border, #2E2E2E))',
    overlay: 'rgba(255,255,255,.04)',
    epicLozengeBg: 'var(--ds-border, var(--ds-border, #2E2E2E))',
    epicLozengeText: 'var(--ds-text, var(--ds-text, #EDEDED))',
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

/**
 * Density presets.
 * comfortable = Jira parity (card pad 12px, title 14/20, gap 4px).
 */
export const DENSITY_CONFIG: Record<KanbanDensity, DensityConfig> = {
  compact:     { cardPad: '6px 8px',   titleSize: 12, titleClamp: 1, metaSize: 10, avatarSize: 20, cardGap: 4, footerHeight: 18, cardMinHeight: 0 },
  dense:       { cardPad: '8px 10px',  titleSize: 13, titleClamp: 2, metaSize: 11, avatarSize: 22, cardGap: 4, footerHeight: 20, cardMinHeight: 0 },
  comfortable: { cardPad: '12px',      titleSize: 14, titleClamp: 3, metaSize: 12, avatarSize: 24, cardGap: 4, footerHeight: 22, cardMinHeight: 0 },
};

/* ═══ COLUMN CONFIG ═══ */

export interface KanbanColumnDef {
  id: string;
  name: string;
  statuses: string[];
  category: 'todo' | 'in_progress' | 'done';
  /** WIP limit (max cards in column). When set, header renders `MAX: <n>`
   * to mirror Jira's column-limit badge (e.g., MDT board 597). */
  wipLimit?: number | null;
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
